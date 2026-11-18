"""Ngủ Cùng Nhau - server multiplayer (aiohttp + WebSocket).

Bản 2 (giai đoạn 2): tài khoản + khu chia loại.
- Mỗi người chơi có playerId (uid) cố định, đăng nhập bằng token lưu ở trình duyệt (xem store.py).
  Dữ liệu nhân vật và nhà riêng lưu ở server (SQLite game.db).
- Thế giới gồm nhiều "phiên bản khu" (instance), mỗi người chỉ ở trong 1 phiên bản tại một lúc:
    * Khu CHUNG (công viên, phòng học, rạp phim, khu mua sắm, hồ câu cá): chia KÊNH, mỗi kênh tối đa
      CHANNEL_CAP người, đầy thì tự mở kênh mới.            khóa: "park#1", "cinema#2"…
    * Ký túc xá: khu chung theo NHÓM, vào bằng mã phòng.   khóa: "sleep@MEOW"
    * Khu RIÊNG (nhà riêng, nông trại): mỗi người một bản. khóa: "home~<uid>", "farm~<uid>"
- Không đi bộ xuyên cửa giữa các khu nữa: mỗi khu có 1 lối ra, chạm vào thì mở bản đồ,
  chọn khu nào thì client gửi {"t": "go", "area": ...}.

Chạy:  python server.py      rồi mở http://localhost:8080
"""
import asyncio
import json
import os
import random
import re
import time
import uuid

from aiohttp import WSMsgType, web

import arcade
import dating
import economy
import salon
import stock
import store

for _m in (arcade, stock, dating, salon):           # các khu mới đăng ký hành động vào hệ thống kinh tế
    economy.ACTIONS.update(_m.ACTIONS)

ROOT = os.path.dirname(os.path.abspath(__file__))
STATIC = os.path.join(ROOT, "static")
# Chế độ phát triển (chạy bằng dev.py / run.bat): sửa file trong static/ thì trình duyệt tự tải lại.
# Lên mạng (Render) không đặt DEV nên không bật.
DEV = os.environ.get("DEV") == "1"
BOOT_ID = uuid.uuid4().hex[:8]          # mã lần chạy server: đổi khác nghĩa là server vừa khởi động lại

AREAS = ("sleep", "study", "park", "cinema", "farm", "fishing", "mall", "home", "arcade", "stock", "dating", "salon")
SHARED = ("park", "study", "cinema", "mall", "fishing", "arcade", "stock", "dating", "salon")   # khu chung chia kênh
PRIVATE = ("home", "farm")                                 # khu riêng theo playerId
SEATS = {"sleep": 8, "study": 12, "park": 4, "cinema": 12, "farm": 2, "fishing": 4, "mall": 3, "home": 2,
         "arcade": 4, "stock": 8, "dating": 6, "salon": 3}
CHANNEL_CAP = 25          # số người tối đa mỗi kênh khu chung
MAX_CHANNELS = 50
DORM_CAP = 12             # số người tối đa mỗi phòng ký túc xá (8 giường + ngồi sofa)
MAX_FURNITURE = 80        # số đồ nội thất tối đa mỗi nhà
# Điểm xuất hiện khi vào khu (ngay cạnh lối ra của khu đó)
ENTRY = {
    "park": (85.0, 350.0),       # cổng vào bên trái công viên (khu ngang 1120x600)
    "sleep": (500.0, 540.0),     # các khu đã vẽ lại ngang: cửa ra ở giữa cạnh dưới
    "study": (500.0, 540.0),
    "cinema": (44.0, 545.0),     # cửa trái sảnh rạp
    "farm": (560.0, 540.0),
    "fishing": (560.0, 540.0),
    "mall": (500.0, 540.0),
    "home": (796.0, 545.0),      # cửa phải nhà riêng
    "arcade": (560.0, 540.0), "stock": (500.0, 540.0), "dating": (560.0, 540.0), "salon": (500.0, 540.0),
}
TV_CHANNELS = 4
MUSIC_TRACKS = 4
EMOTES = {"❤️", "😂", "🥱", "👋", "🌙", "😴"}
PET_TYPES = {"cat": "Mướp", "dog": "Cún", "bunny": "Bông", "none": ""}
COLORS = {"#e76f51", "#f4a261", "#e9c46a", "#2a9d8f", "#4cc9f0",
          "#7b2cbf", "#f72585", "#90be6d"}

YT_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")

# Lọc từ cấm cơ bản trong chat (chỉ khớp nguyên từ, không ăn vào giữa từ khác)
BAD_WORDS = ["đm", "dm", "đmm", "vcl", "vkl", "vl", "đéo", "địt", "đụ", "lồn", "cặc", "buồi",
             "fuck", "shit", "bitch"]
BAD_RE = re.compile(r"(?<!\w)(" + "|".join(map(re.escape, BAD_WORDS)) + r")(?!\w)", re.IGNORECASE)


def filter_chat(s):
    return BAD_RE.sub(lambda m: "*" * len(m.group(0)), s)


def clean_level(v):
    return v if isinstance(v, int) and 1 <= v <= 999 else 1


# Trang phục: mỗi ô là mã món đồ (client tự vẽ theo data.js)
OUTFIT_SLOTS = ("gender", "hair", "hairColor", "shirt", "hat", "glasses", "neck", "back")
ITEM_ID = re.compile(r"^[a-z0-9_]{0,20}$")


def clean_outfit(o):
    if not isinstance(o, dict):
        return {}
    return {k: o[k] for k in OUTFIT_SLOTS if isinstance(o.get(k), str) and ITEM_ID.match(o[k])}


def clean_pet(pd):
    pd = pd if isinstance(pd, dict) else {}
    ptype = pd.get("type") if pd.get("type") in PET_TYPES else "none"
    return {"type": ptype, "name": clean_text(pd.get("name"), 10) or PET_TYPES[ptype]}


# Dữ liệu nhân vật client gửi lên để lưu. Giai đoạn 2 mới chuyển chỗ lưu từ localStorage lên server;
# kiểm tra từng giao dịch (mua/bán/thưởng) sẽ chuyển hẳn về server ở giai đoạn 6.
LIFE_KEYS = {"v": int, "coins": (int, float), "energy": (int, float), "fun": (int, float),
             "know": (int, float), "xp": (int, float), "inv": dict, "daily": str, "wheelDay": str,
             "wheelUsed": int, "outfit": dict, "owned": dict, "farm": list, "bait": dict}
MAX_LIFE_BYTES = 48_000


def clean_life(d):
    if not isinstance(d, dict):
        return None
    try:
        if len(json.dumps(d)) > MAX_LIFE_BYTES:
            return None
    except (TypeError, ValueError):
        return None
    out = {k: d[k] for k, typ in LIFE_KEYS.items()
           if k in d and isinstance(d[k], typ) and not isinstance(d[k], bool)}
    for k, lo, hi in (("coins", 0, 10**9), ("energy", 0, 100), ("fun", 0, 100),
                      ("know", 0, 10**9), ("xp", 0, 10**9), ("wheelUsed", 0, 999)):
        if k in out:
            out[k] = max(lo, min(hi, out[k]))
    if "coins" in out:
        out["coins"] = int(out["coins"])
    return out


# Vùng đi lại của từng khu (phải khớp LAYOUTS[...].floor ở client). Khu chưa vẽ lại ngang dùng FLOOR cũ.
FLOOR = (16, 175, 344, 575)  # x1, y1, x2, y2 (khu dọc cũ 360x640)
FLOORS = {
    "park": (20, 188, 1100, 585),
    "sleep": (20, 175, 980, 585), "study": (20, 175, 980, 585), "cinema": (20, 175, 980, 585),
    "mall": (20, 175, 980, 585), "farm": (20, 175, 1100, 585), "fishing": (20, 352, 1100, 585),
    "home": (20, 175, 820, 585),
    "arcade": (20, 175, 1100, 585), "stock": (20, 175, 980, 585), "dating": (20, 262, 1100, 585),
    "salon": (20, 175, 980, 585),
}
HOME_W = 840                 # bề ngang nhà riêng (khung cũ 360)


def migrate_home(items):
    """Nội thất lưu theo khung dọc cũ (rộng 360) → giãn ra theo bề ngang nhà mới. Đánh dấu v=2 để chỉ làm 1 lần."""
    changed = False
    for it in items:
        if it.get("v") != 2:
            it["x"] = round(it.get("x", 0) * HOME_W / 360)
            it["v"] = 2
            changed = True
    return changed


def floor_of(area):
    return FLOORS.get(area, FLOOR)

rooms = {}       # khóa phiên bản khu -> room
SESSIONS = {}    # sid -> phiên kết nối
BY_UID = {}      # uid -> phiên đang online (mỗi tài khoản chỉ 1 kết nối)


def new_area(n):
    return {
        "beds": [None] * n,
        "tv": {"on": False, "ch": 0},
        "music": {"on": False, "track": 0},
        "light": True,
        # Video YouTube đang phát: {"id", "pos", "at", "paused"} hoặc None
        "media": {"tv": None, "music": None},
        "tv_timer": None,   # thời điểm (time.time()) TV sẽ tự tắt
        "_task": None,
    }


def load_home(owner, legacy_code):
    items = store.load_home(owner, legacy_code)
    if migrate_home(items):
        store.save_home(owner, items)
    return items


def new_room(key, info, legacy_code=None):
    area = info["area"]
    return {
        "key": key,
        "info": info,
        "home": load_home(info["owner"], legacy_code) if area == "home" else [],
        "players": {},
        "sockets": {},
        "areas": {area: new_area(SEATS[area])},
        # Mèo Mun của khu: mode = walk | sit | sleep
        "pet": {"x": 700.0 if area == "park" else 230.0, "y": 300.0 if area == "park" else 360.0,
                "mode": "sit", "bed": None, "area": area},
        "_pet_task": None,
        # Pomodoro chung (hiện ở phòng học)
        "pomo": {"phase": "focus", "running": False, "end": None, "left": 25 * 60,
                 "focus": 25, "brk": 5, "round": 1},
        "_pomo_task": None,
    }


# ================== LỊCH CHIẾU RẠP PHIM ==================
FILMS = [f for f in economy.CAT.get("CINEMA", {}).get("films", []) if YT_ID.match(f.get("id", "")) and f.get("len", 0) > 0]


def cinema_sched(now):
    """Phim đang chiếu theo lịch (lặp vòng theo giờ thật) -> media {"id","pos","at","paused","sched"}."""
    total = sum(f["len"] for f in FILMS)
    if not total:
        return None
    off = now % total
    for i, f in enumerate(FILMS):
        if off < f["len"]:
            pos = off
            if pos > f["len"] - 5:                   # sắp hết phim: chuyển luôn sang phim sau
                f, pos = FILMS[(i + 1) % len(FILMS)], 0.0
            return {"id": f["id"], "pos": round(pos, 1), "at": now, "paused": False, "sched": True}
        off -= f["len"]
    return None


def cinema_fill(room, now):
    """Rạp đang trống (không ai mở phim/kênh) hoặc đang theo lịch thì cập nhật phim theo lịch. Trả True nếu đổi."""
    A = room["areas"].get("cinema")
    if not A or not FILMS:
        return False
    m = A["media"]["tv"]
    if (m is None and not A["tv"]["on"]) or (m and m.get("sched") and not m.get("paused")):
        new = cinema_sched(now)
        if m and new and m["id"] == new["id"]:
            return False                           # vẫn đúng phim, không cần đổi
        A["media"]["tv"], A["tv"] = new, {"on": True, "ch": -1}
        return True
    return False


def public_area(a):
    return {"beds": a["beds"], "tv": a["tv"], "music": a["music"], "light": a["light"],
            "media": a["media"], "tvTimer": a["tv_timer"]}


def public_state(room):
    return {
        "players": list(room["players"].values()),
        "areas": {k: public_area(v) for k, v in room["areas"].items()},
        "pet": room["pet"],
        "pomo": room["pomo"],
        "home": room["home"],
        "now": time.time(),
    }


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def clean_text(s, n):
    s = str(s or "").replace("\n", " ").replace("\r", " ").strip()
    return s[:n]


def clean_code(s):
    s = "".join(ch for ch in str(s or "").upper() if ch.isalnum())
    return s[:8]


async def broadcast(room, msg, exclude=None):
    data = json.dumps(msg, ensure_ascii=False)
    for pid, ws in list(room["sockets"].items()):
        if pid == exclude or ws.closed:
            continue
        try:
            await ws.send_str(data)
        except Exception:
            pass


# ---------------- Chọn phiên bản khu (kênh / mã phòng / chủ nhà) ----------------
def pick_instance(area, uid, code=None, ch=None):
    """Trả về (khóa, thông tin) của phiên bản khu sẽ vào, hoặc (None, lý do) nếu không vào được."""
    if area in SHARED:
        def has_room(n):
            r = rooms.get(f"{area}#{n}")
            return r is None or len(r["players"]) < CHANNEL_CAP
        if isinstance(ch, int) and 1 <= ch <= MAX_CHANNELS and has_room(ch):
            n = ch                                   # vào đúng kênh được chọn (vd: link mời của bạn)
        else:
            n = next((i for i in range(1, MAX_CHANNELS + 1) if has_room(i)), None)
            if n is None:
                return None, "Khu này đang quá đông, thử lại sau nhé 😢"
        return f"{area}#{n}", {"area": area, "ch": n, "code": "", "owner": ""}
    if area == "sleep":
        code = clean_code(code) or "PHONG"
        r = rooms.get(f"sleep@{code}")
        if r is not None and len(r["players"]) >= DORM_CAP:
            return None, "Phòng ngủ này đã đầy rồi 😢"
        return f"sleep@{code}", {"area": area, "ch": 0, "code": code, "owner": ""}
    if area in PRIVATE:                              # chỉ chủ vào (thăm nhà bạn: giai đoạn 8)
        return f"{area}~{uid}", {"area": area, "ch": 0, "code": "", "owner": uid}
    return None, "Khu không tồn tại"


def online_counts():
    """Số người đang online ở từng khu + từng kênh (để hiện trên ghim bản đồ)."""
    counts = {a: 0 for a in AREAS}
    chans = {a: [] for a in SHARED}
    for room in rooms.values():
        info, n = room["info"], len(room["players"])
        counts[info["area"]] += n
        if info["area"] in SHARED and n:
            chans[info["area"]].append([info["ch"], n])
    for a in chans:
        chans[a].sort()
    return {"counts": {a: counts[a] for a in AREAS if a not in PRIVATE}, "chans": chans}


async def online_loop():
    """Mỗi 3 giây gửi số người online nếu có thay đổi; ít nhất mỗi 60 giây gửi lại kèm giờ server để đồng bộ đồng hồ."""
    last, sent = None, 0.0
    while True:
        await asyncio.sleep(3)
        cur = online_counts()
        if cur == last and time.time() - sent < 60:
            continue
        last, sent = cur, time.time()
        data = json.dumps({"t": "online", **cur, "now": time.time()})
        for s in list(SESSIONS.values()):
            ws = s["ws"]
            if s["room"] is not None and not ws.closed:
                try:
                    await ws.send_str(data)
                except Exception:
                    pass


# ---------------- Pomodoro ----------------
def cancel_pomo(room):
    if room["_pomo_task"]:
        room["_pomo_task"].cancel()
    room["_pomo_task"] = None


async def pomo_loop(room):
    """Tự chuyển giữa giờ học và giờ nghỉ khi hết giờ."""
    try:
        while room["pomo"]["running"]:
            await asyncio.sleep(max(0, room["pomo"]["end"] - time.time()))
            p = room["pomo"]
            if not p["running"]:
                return
            if p["phase"] == "focus":
                p["phase"], dur = "break", p["brk"]
            else:
                p["phase"], dur = "focus", p["focus"]
                p["round"] += 1
            p["left"] = dur * 60
            p["end"] = time.time() + p["left"]
            await broadcast(room, {"t": "pomo", "pomo": p, "now": time.time(),
                                   "by": "⏰", "a": "switch"})
    except asyncio.CancelledError:
        pass


# ---------------- Mèo Mun ----------------
async def room_pet_loop(room):
    """Mèo Mun đi dạo trong khu, ngồi cạnh mọi người, ngủ cùng khi cả khu đã ngủ/ngồi."""
    try:
        while True:
            await asyncio.sleep(random.uniform(4, 9))
            players = list(room["players"].values())
            if not players:
                continue
            pet = room["pet"]
            seated = [p for p in players if p["bed"] is not None]
            if len(seated) == len(players):
                spots = [(p["area"], p["bed"]) for p in seated]
                if pet["mode"] == "sleep" and (pet["area"], pet["bed"]) in spots:
                    continue
                area, bed = random.choice(spots)
                pet.update(mode="sleep", bed=bed, area=area)
            else:
                r = random.random()
                if r < 0.5:
                    p = random.choice([p for p in players if p["bed"] is None])
                    x = p["x"] + random.choice([-1, 1]) * random.uniform(18, 30)
                    y = p["y"] + random.uniform(-4, 10)
                    area = p["area"]
                elif r < 0.85:
                    fl = floor_of(pet["area"])
                    x = random.uniform(fl[0] + 10, fl[2] - 10)
                    y = random.uniform(fl[1] + 10, fl[3] - 10)
                    area = pet["area"]
                else:
                    continue  # ngồi yên liếm lông
                fl = floor_of(area)
                pet.update(x=round(clamp(x, fl[0], fl[2]), 1),
                           y=round(clamp(y, fl[1], fl[3]), 1),
                           mode="walk", bed=None, area=area)
            await broadcast(room, {"t": "roompet", "pet": pet})
    except asyncio.CancelledError:
        pass


# ---------------- Hẹn giờ tắt TV ----------------
def cancel_tv_timer(area):
    if area["_task"]:
        area["_task"].cancel()
    area["_task"] = None
    area["tv_timer"] = None


async def tv_timer_task(room, area_name, delay):
    try:
        await asyncio.sleep(delay)
    except asyncio.CancelledError:
        return
    a = room["areas"][area_name]
    a["_task"] = None
    a["tv_timer"] = None
    a["tv"]["on"] = False
    a["media"]["tv"] = None
    await broadcast(room, {"t": "tv", "area": area_name, "tv": a["tv"], "by": "⏰ Hẹn giờ"})
    await broadcast(room, {"t": "tvtimer", "area": area_name, "end": None, "by": "⏰ Hẹn giờ"})


def free_bed(room, pid):
    for a in room["areas"].values():
        beds = a["beds"]
        for i, owner in enumerate(beds):
            if owner == pid:
                beds[i] = None
    player = room["players"].get(pid)
    if player:
        player["bed"] = None
        if player.get("sat_at"):           # cộng dồn thời gian ngồi học
            secs = time.time() - player["sat_at"]
            player["studied"] += secs
            player["sat_at"] = None
            sess = SESSIONS.get(pid)
            if sess and sess.get("data") is not None and player.get("area") == "study":
                won = economy.study_coins(sess, secs / 60)
                if won:                        # báo cho người chơi sau khi xử lý xong tin nhắn hiện tại
                    sess["eco_push"] = f"📚 Ngồi học được +{won} 💰"


# ---------------- Vào / rời một phiên bản khu ----------------
async def enter(sess, key, info):
    """Đưa người chơi vào phiên bản khu `key` và gửi toàn bộ trạng thái khu cho họ."""
    room = rooms.get(key)
    if room is None:
        room = rooms[key] = new_room(key, info, legacy_code=sess["dorm"])
        room["_pet_task"] = asyncio.create_task(room_pet_loop(room))
        if info["area"] == "arcade":                   # bàn bầu cua + lồng gấu bông của kênh này
            room["bc"], room["cage"] = arcade.bc_new(), arcade.cage_new()
            room["_bc_task"] = asyncio.create_task(bc_loop(room))
    area = info["area"]
    sx, sy = ENTRY[area]
    if area == "park":
        sy += random.uniform(-12, 12)          # cổng bên trái: xếp người mới theo chiều dọc cho đỡ chồng tên
    else:
        sx += random.uniform(-10, 10)
    fl = floor_of(area)
    p = sess["p"]
    sess.update(ticket=False, fish=None, quiz=None)
    p.update(area=area, x=round(clamp(sx, fl[0], fl[2]), 1), y=round(clamp(sy, fl[1], fl[3]), 1), bed=None,
             sat_at=None, studied=0.0)
    sid = p["id"]
    if area == "cinema" and cinema_fill(room, time.time()):   # rạp trống / phim lịch đã hết: chiếu phim theo lịch
        await broadcast(room, {"t": "media", "area": "cinema", "slot": "tv", "a": "sched",
                               "media": room["areas"]["cinema"]["media"]["tv"], "now": time.time(), "by": "🎬 Lịch chiếu"})
    room["players"][sid] = p
    room["sockets"][sid] = sess["ws"]
    sess["room"] = room
    await sess["ws"].send_json({"t": "welcome", "id": sid, "uid": sess["uid"], "inst": info,
                                "state": public_state(room), "boot": BOOT_ID if DEV else None, **online_counts()})
    await broadcast(room, {"t": "join", "p": p}, exclude=sid)
    if room.get("bc"):                                     # khu vui chơi: gửi ngay trạng thái bàn bầu cua
        await sess["ws"].send_json({"t": "bc", "state": arcade.bc_public(room["bc"], sid)})
    if info["area"] == "stock":                            # chứng khoán: gửi bảng giá hiện tại
        await sess["ws"].send_json({"t": "stk", "a": "tick", **stock.board(), "fresh": None})


async def leave(sess):
    """Rời phiên bản khu hiện tại; khu trống thì dọn luôn."""
    room = sess["room"]
    if room is None:
        return
    sess["room"] = None
    sid = sess["p"]["id"]
    free_bed(room, sid)
    room["players"].pop(sid, None)
    room["sockets"].pop(sid, None)
    if room["players"]:
        await broadcast(room, {"t": "leave", "id": sid})
    elif rooms.get(room["key"]) is room:
        for a in room["areas"].values():
            cancel_tv_timer(a)
        if room["_pet_task"]:
            room["_pet_task"].cancel()
        if room.get("_bc_task"):
            room["_bc_task"].cancel()
        cancel_pomo(room)
        del rooms[room["key"]]


# ---------------- Khu mới: gửi sự kiện, bầu cua, chứng khoán ----------------
async def push_eco(s, msg=""):
    if s and s.get("data") is not None and not s["ws"].closed:
        try:
            await s["ws"].send_json({"t": "eco", "rid": None, "ok": True, "msg": msg, "res": {}, "eco": economy.snapshot(s["data"])})
        except Exception:
            pass


async def send_to(s, msg):
    if s and not s["ws"].closed:
        try:
            await s["ws"].send_json(msg)
        except Exception:
            pass


async def send_pinfo(s):
    if not s or s.get("data") is None:
        return
    s["p"]["pair"] = dating.pair_name(s["data"])
    if s["room"]:
        await broadcast(s["room"], {"t": "pinfo", "id": s["p"]["id"], "pair": s["p"]["pair"]})


async def flush_out(sess):
    """Gửi các sự kiện mà hành động kinh tế yêu cầu (bàn bầu cua, thông báo, kết đôi…)."""
    for ev in sess.pop("out", None) or []:
        kind = ev[0]
        if kind == "room" and sess["room"]:
            await broadcast(sess["room"], ev[1])
        elif kind == "bc" and sess["room"] and sess["room"].get("bc"):
            await bc_broadcast(sess["room"])
        elif kind == "uid":
            await send_to(BY_UID.get(ev[1]), ev[2])
        elif kind == "eco_uid":
            await push_eco(BY_UID.get(ev[1]))
        elif kind == "pinfo":
            await send_pinfo(sess)
        elif kind == "pinfo_uid":
            await send_pinfo(BY_UID.get(ev[1]))


async def bc_broadcast(room):
    bc = room["bc"]
    for sid, ws in list(room["sockets"].items()):         # mỗi người thấy cược của chính mình
        if not ws.closed:
            try:
                await ws.send_json({"t": "bc", "state": arcade.bc_public(bc, sid)})
            except Exception:
                pass


async def bc_loop(room):
    """Bàn bầu cua: đặt cược 20 giây → lắc bát → mở bát, trả thưởng → phiên mới."""
    bc, C = room["bc"], arcade.CFG
    try:
        while True:
            await asyncio.sleep(max(.2, bc["end"] - time.time()))
            now = time.time()
            if bc["phase"] == "bet":
                if not bc["bets"]:                          # chưa ai cược: chờ tiếp
                    bc["end"] = now + C["BC_BET_SEC"]
                    continue
                room["_bc_pays"] = arcade.bc_roll(bc)
                bc.update(phase="roll", end=now + C["BC_ROLL_SEC"])
            elif bc["phase"] == "roll":
                bc.update(phase="result", end=now + C["BC_RESULT_SEC"])
                for sid, win in room.pop("_bc_pays", {}).items():
                    uid = bc["uids"].get(sid)
                    s = BY_UID.get(uid)
                    data = s["data"] if s else store.load_data(uid)
                    if not data:
                        continue
                    data["coins"] = data.get("coins", 0) + win
                    arcade.gamble_add(data, -win)
                    store.save_data(uid, data)
                    await push_eco(s, f"🎲 Bầu cua: bạn nhận {win} xu!")
            else:
                arcade.bc_next(bc)
            await bc_broadcast(room)
    except asyncio.CancelledError:
        pass


async def stock_loop():
    """Nhịp giá cổ phiếu: cập nhật giá, khớp lệnh chờ, gửi bảng giá cho người đang ở khu chứng khoán."""
    while True:
        await asyncio.sleep(stock.CFG["TICK_SEC"])
        try:
            news = stock.tick()
            data = json.dumps({"t": "stk", "a": "tick", **stock.board(), "fresh": news}, ensure_ascii=False)
            for s in list(SESSIONS.values()):
                if s.get("data") is None:
                    continue
                for msg in stock.fill_orders(s["data"]):
                    store.save_data(s["uid"], s["data"])
                    await push_eco(s, msg)
                if s["room"] is not None and s["p"]["area"] == "stock" and not s["ws"].closed:
                    try:
                        await s["ws"].send_str(data)
                    except Exception:
                        pass
        except Exception as e:                               # không để vòng lặp chết vì 1 lỗi
            print("stock_loop:", e)


async def ws_handler(request):
    ws = web.WebSocketResponse(heartbeat=25)
    await ws.prepare(request)

    sid = uuid.uuid4().hex[:8]         # mã phiên kết nối (khác uid cố định của tài khoản)
    sess = {"ws": ws, "uid": None, "room": None, "dorm": "", "p": None}
    last_chat = last_pat = last_go = last_save = last_eco = 0.0

    try:
        async for msg in ws:
            if msg.type != WSMsgType.TEXT:
                continue
            try:
                d = json.loads(msg.data)
            except ValueError:
                continue
            if not isinstance(d, dict):
                continue
            t = d.get("t")

            if t == "join" and sess["uid"] is None:
                name = clean_text(d.get("name"), 14) or "Bạn"
                # 1) Đăng nhập bằng token, không có/sai thì tạo tài khoản mới
                uid, new_token = store.login(d.get("token")), None
                if uid is None:
                    uid, new_token = store.create_account(name)
                store.touch(uid, name)
                data, migrated = store.load_data(uid), False
                if data is None:                      # tài khoản mới: nhận dữ liệu cũ từ localStorage (nếu có)
                    data = clean_life(d.get("legacy")) or {}
                    migrated = bool(data)
                    if "coins" in data:               # dữ liệu cũ do trình duyệt tự tính: giới hạn số xu nhận vào
                        data["coins"] = min(data["coins"], economy.LEGACY_COIN_CAP)
                economy.ensure(data)
                bonus = economy.daily_bonus(data)
                data["outfit"] = economy.valid_outfit(data, data.get("outfit"))
                store.save_data(uid, data)
                # 2) Mỗi tài khoản chỉ 1 kết nối: đá kết nối cũ ra
                old = BY_UID.get(uid)
                if old and not old["ws"].closed:
                    try:
                        await old["ws"].send_json({"t": "kicked", "msg": "Tài khoản của bạn vừa vào game ở nơi khác"})
                        await old["ws"].close()
                    except Exception:
                        pass
                sess["uid"] = uid
                sess["data"] = data
                sess["saved_at"] = time.time()
                BY_UID[uid] = sess
                SESSIONS[sid] = sess
                sess["dorm"] = clean_code(d.get("room"))
                color = d.get("color") if d.get("color") in COLORS else random.choice(list(COLORS))
                sess["p"] = {
                    "id": sid, "uid": uid, "name": name, "color": color, "area": "park",
                    "x": 180.0, "y": 528.0, "bed": None, "pet": clean_pet(d.get("pet")),
                    "status": "", "studied": 0.0, "sat_at": None,
                    "lv": clean_level(d.get("lv")),
                    "outfit": data["outfit"],
                    "pair": dating.pair_name(data),
                }
                await ws.send_json({"t": "auth", "uid": uid, "token": new_token, "data": data, "migrated": migrated,
                                    "daily": bonus})
                # 3) Vào khu muốn vào (mặc định công viên), không vào được thì về công viên
                area = d.get("area") if d.get("area") in AREAS else "park"
                if area == "dating" and dating.can_enter(data):
                    area = "park"
                key, info = pick_instance(area, uid, code=sess["dorm"], ch=d.get("ch"))
                if key is None:
                    await ws.send_json({"t": "error", "msg": info})
                    key, info = pick_instance("park", uid)
                if info["area"] == "sleep":
                    sess["dorm"] = info["code"]
                await enter(sess, key, info)
                continue

            room = sess["room"]
            if room is None or sess["uid"] is None:
                continue
            pid = sid
            me = room["players"].get(pid)
            if me is None:
                continue
            an = me["area"]
            A = room["areas"][an]

            if t == "move":
                fl = floor_of(an)
                try:
                    x = clamp(float(d.get("x")), fl[0], fl[2])
                    y = clamp(float(d.get("y")), fl[1], fl[3])
                except (TypeError, ValueError):
                    continue
                free_bed(room, pid)
                me["x"], me["y"] = round(x, 1), round(y, 1)
                await broadcast(room, {"t": "move", "id": pid, "x": me["x"], "y": me["y"]})

            elif t == "go":                        # chọn khu trên bản đồ
                now = time.monotonic()
                to = d.get("area")
                if to not in AREAS:
                    continue
                if to == "salon" and salon.closed():   # tiệm tóc đóng cửa lúc đổi ngày
                    await ws.send_json({"t": "error", "msg": "💇 Tiệm Làm Tóc đóng cửa 00:00–00:05 để đổi ngày, quay lại sau chút nhé", "go": True})
                    continue
                if to == "dating":                     # khu hẹn hò: phải xác nhận tuổi, từ 16 tuổi
                    why = dating.can_enter(sess["data"])
                    if why == "need_age":
                        await ws.send_json({"t": "dt", "a": "needAge"})
                        await ws.send_json({"t": "error", "msg": "Xác nhận độ tuổi trước khi vào khu hẹn hò nhé", "go": True})
                        continue
                    if why:
                        await ws.send_json({"t": "error", "msg": why, "go": True})
                        continue
                if now - last_go < 0.5:            # chống spam; vẫn trả lời để client bỏ màn mờ
                    await ws.send_json({"t": "error", "msg": "Từ từ thôi, đi chậm lại chút nha 😅", "go": True})
                    continue
                last_go = now
                key, info = pick_instance(to, sess["uid"], code=d.get("room") or sess["dorm"], ch=d.get("ch"))
                if key is None:
                    await ws.send_json({"t": "error", "msg": info, "go": True})
                    continue
                if key == room["key"]:
                    await ws.send_json({"t": "error", "msg": "Bạn đang ở đây rồi", "go": True})
                    continue
                if to == "sleep":
                    sess["dorm"] = info["code"]
                await leave(sess)
                await enter(sess, key, info)

            elif t == "save":                      # lưu chỉ số nhân vật (xu/đồ do server tự quản lý)
                now = time.monotonic()
                if now - last_save < 0.8:
                    continue
                last_save = now
                data = sess["data"]
                data.update(economy.clean_stats(data, d.get("data"), time.time() - sess["saved_at"]))
                sess["saved_at"] = time.time()
                store.save_data(sess["uid"], data)

            elif t == "eco":                       # giao dịch kinh tế: server kiểm tra + tự tung kết quả
                now = time.monotonic()
                if now - last_eco < 0.12:
                    await ws.send_json({"t": "eco", "rid": d.get("rid"), "ok": False, "msg": "Từ từ thôi 😅",
                                        "res": {}, "eco": economy.snapshot(sess["data"])})
                    continue
                last_eco = now
                ok, err, res = economy.handle(sess, d)
                if ok:
                    store.save_data(sess["uid"], sess["data"])
                await ws.send_json({"t": "eco", "rid": d.get("rid"), "ok": ok, "msg": err, "res": res,
                                    "eco": economy.snapshot(sess["data"])})
                if ok:
                    await flush_out(sess)

            elif t == "sleep":
                b = d.get("bed")
                if not isinstance(b, int) or not 0 <= b < len(A["beds"]):
                    continue
                if an == "cinema" and not sess.get("ticket"):
                    await ws.send_json({"t": "error", "msg": "🎟️ Mua vé ở máy bán vé trước nhé"})
                    continue
                if A["beds"][b] not in (None, pid):
                    await ws.send_json({"t": "error", "msg": "Chỗ này có người rồi!"})
                    continue
                free_bed(room, pid)
                A["beds"][b] = pid
                me["bed"] = b
                now = time.time()
                if an == "study":
                    me["sat_at"] = now
                await broadcast(room, {"t": "sleep", "id": pid, "bed": b, "at": now})

            elif t == "tv":
                on = bool(d.get("on"))
                ch = d.get("ch", A["tv"]["ch"])
                if isinstance(ch, int) and 0 <= ch < TV_CHANNELS:
                    A["tv"] = {"on": on, "ch": ch}
                    A["media"]["tv"] = None
                    await broadcast(room, {"t": "tv", "area": an, "tv": A["tv"], "by": me["name"]})
                    if not on and A["tv_timer"]:
                        cancel_tv_timer(A)
                        await broadcast(room, {"t": "tvtimer", "area": an, "end": None,
                                               "by": me["name"], "silent": True})

            elif t == "tvtimer":
                mins = d.get("min")
                if not isinstance(mins, (int, float)) or not 0 <= mins <= 600:
                    continue
                cancel_tv_timer(A)
                if mins > 0 and A["tv"]["on"]:
                    A["tv_timer"] = time.time() + mins * 60
                    A["_task"] = asyncio.create_task(tv_timer_task(room, an, mins * 60))
                await broadcast(room, {"t": "tvtimer", "area": an, "end": A["tv_timer"],
                                       "now": time.time(), "by": me["name"]})

            elif t == "music":
                on = bool(d.get("on"))
                tr = d.get("track", A["music"]["track"])
                if isinstance(tr, int) and 0 <= tr < MUSIC_TRACKS:
                    A["music"] = {"on": on, "track": tr}
                    if on:
                        A["media"]["music"] = None
                    await broadcast(room, {"t": "music", "area": an, "music": A["music"], "by": me["name"]})

            elif t == "media":
                slot = d.get("slot")
                if slot not in ("tv", "music"):
                    continue
                act = d.get("a")
                now = time.time()
                cur = A["media"][slot]
                if act == "load":
                    vid = d.get("id")
                    if not isinstance(vid, str) or not YT_ID.match(vid):
                        await ws.send_json({"t": "error", "msg": "Link YouTube không hợp lệ"})
                        continue
                    A["media"][slot] = {"id": vid, "pos": 0.0, "at": now, "paused": False}
                    if slot == "tv":
                        A["tv"] = {"on": True, "ch": -1}
                    else:
                        A["music"]["on"] = False
                elif act in ("pause", "play") and cur:
                    try:
                        pos = max(0.0, float(d.get("pos", 0)))
                    except (TypeError, ValueError):
                        continue
                    cur.update(pos=pos, at=now, paused=(act == "pause"))
                    cur.pop("sched", None)              # ai đó tự dừng/chạy: không còn theo lịch nữa
                elif act == "sched" and slot == "tv" and an == "cinema" and FILMS:
                    # về lịch chiếu (bấm nút) hoặc phim lịch vừa hết (client tự gửi): chiếu phim theo giờ
                    if cur and cur.get("sched") and not cur.get("paused"):
                        new = cinema_sched(now)
                        if new and new["id"] == cur["id"]:
                            continue                    # nhiều máy cùng báo hết phim: chỉ đổi 1 lần
                    A["media"]["tv"], A["tv"] = cinema_sched(now), {"on": True, "ch": -1}
                    cancel_tv_timer(A)
                elif act == "stop":
                    A["media"][slot] = None
                    if slot == "tv":
                        A["tv"]["on"] = False
                        cancel_tv_timer(A)
                else:
                    continue
                await broadcast(room, {"t": "media", "area": an, "slot": slot, "a": act,
                                       "media": A["media"][slot], "now": now, "by": me["name"]})

            elif t == "light":
                A["light"] = bool(d.get("on"))
                await broadcast(room, {"t": "light", "area": an, "on": A["light"], "by": me["name"]})

            elif t == "chat":
                now = time.monotonic()
                text = filter_chat(clean_text(d.get("text"), 60))
                if an == "dating":                     # khu hẹn hò: che số điện thoại, link, mạng xã hội
                    text = dating.mask(text)
                if text and now - last_chat > 0.7:
                    last_chat = now
                    await broadcast(room, {"t": "chat", "id": pid, "text": text})

            elif t == "pomo":
                a = d.get("a")
                p = room["pomo"]
                now = time.time()
                if a == "start" and not p["running"]:
                    cancel_pomo(room)
                    p["running"], p["end"] = True, now + p["left"]
                    room["_pomo_task"] = asyncio.create_task(pomo_loop(room))
                elif a == "pause" and p["running"]:
                    cancel_pomo(room)
                    p.update(left=max(0.0, p["end"] - now), running=False, end=None)
                elif a == "reset":
                    cancel_pomo(room)
                    p.update(phase="focus", running=False, end=None, left=p["focus"] * 60, round=1)
                elif a == "set":
                    f, b = d.get("focus"), d.get("brk")
                    if f not in (15, 25, 45, 50) or b not in (5, 10, 15):
                        continue
                    cancel_pomo(room)
                    p.update(focus=f, brk=b, phase="focus", running=False, end=None, left=f * 60, round=1)
                else:
                    continue
                await broadcast(room, {"t": "pomo", "pomo": p, "now": now, "by": me["name"], "a": a})

            elif t == "status":
                me["status"] = clean_text(d.get("text"), 20)
                await broadcast(room, {"t": "status", "id": pid, "text": me["status"]})

            elif t == "lv":                        # cấp độ (client tự tính từ xp)
                me["lv"] = clean_level(d.get("lv"))
                await broadcast(room, {"t": "lv", "id": pid, "lv": me["lv"]})

            elif t == "outfit":                    # thay đồ (tủ đồ)
                me["outfit"] = economy.valid_outfit(sess["data"], clean_outfit(d.get("outfit")))
                sess["data"]["outfit"] = me["outfit"]
                store.save_data(sess["uid"], sess["data"])
                await broadcast(room, {"t": "outfit", "id": pid, "outfit": me["outfit"]})

            elif t == "pet":                       # nhận nuôi thú cưng mới (tiệm thú cưng)
                me["pet"] = clean_pet(d.get("pet"))
                await broadcast(room, {"t": "pet", "id": pid, "pet": me["pet"]})

            elif t == "furn" and an == "home" and room["info"]["owner"] == sess["uid"]:
                a = d.get("a")                     # bày / lật / cất nội thất (chỉ chủ nhà)
                items = room["home"]
                if a == "add":
                    k = d.get("k")
                    try:
                        x = clamp(int(d.get("x")), 0, HOME_W)
                        y = clamp(int(d.get("y")), 170, 580)
                    except (TypeError, ValueError):
                        continue
                    if k not in economy.FURN or len(items) >= MAX_FURNITURE:
                        continue
                    if not economy.take_item(sess["data"], k):
                        await ws.send_json({"t": "error", "msg": "Hết món này trong rương rồi"})
                        continue
                    sess["eco_push"] = sess.get("eco_push") or True
                    items.append({"i": uuid.uuid4().hex[:8], "k": k, "x": x, "y": y, "f": False, "by": me["name"], "v": 2})
                elif a in ("del", "flip"):
                    it = next((it for it in items if it["i"] == d.get("i")), None)
                    if not it:
                        continue
                    if a == "del":
                        items.remove(it)
                        f = economy.FURN.get(it["k"])
                        if f:                          # cất vào rương của chủ nhà
                            economy.add_item(sess["data"], f["id"], f["e"], f["name"], "deco")
                            sess["eco_push"] = sess.get("eco_push") or True
                    else:
                        it["f"] = not it["f"]
                else:
                    continue
                items.sort(key=lambda it: it["y"])
                store.save_home(room["info"]["owner"], items)
                await broadcast(room, {"t": "home", "items": items})

            elif t == "pat":
                target = d.get("target")
                now = time.monotonic()
                if now - last_pat < 0.4:
                    continue
                owner = room["players"].get(target)
                if target == "room" or (owner and owner["pet"]["type"] != "none"):
                    last_pat = now
                    await broadcast(room, {"t": "pat", "target": target, "by": me["name"]})

            elif t == "emote":
                e = d.get("e")
                if e in EMOTES:
                    await broadcast(room, {"t": "emote", "id": pid, "e": e})

            push = sess.pop("eco_push", None)
            if push and not ws.closed:
                store.save_data(sess["uid"], sess["data"])
                await ws.send_json({"t": "eco", "rid": None, "ok": True, "msg": push if isinstance(push, str) else "",
                                    "res": {}, "eco": economy.snapshot(sess["data"])})
    finally:
        await leave(sess)
        if sess.get("data") is not None:       # lưu lần cuối (vd: xu ngồi học khi thoát game)
            store.save_data(sess["uid"], sess["data"])
        SESSIONS.pop(sid, None)
        if sess["uid"] and BY_UID.get(sess["uid"]) is sess:
            del BY_UID[sess["uid"]]
    return ws


async def index(request):
    return web.FileResponse(os.path.join(STATIC, "index.html"))


def _catalog_js():
    pub = dict(economy.CAT)
    pub["QUIZ"] = [{k: v for k, v in q.items() if k != "c"} for q in pub["QUIZ"]]   # không lộ đáp án
    return "// Tạo tự động từ catalog.json\nconst CATALOG = " + json.dumps(pub, ensure_ascii=False) + ";\n"


CATALOG_JS = _catalog_js()


async def catalog_js(request):
    return web.Response(text=CATALOG_JS, content_type="application/javascript", charset="utf-8")


async def ping(request):
    # Client gọi định kỳ để host miễn phí (Render…) không tắt server khi cả phòng đang ngủ
    return web.Response(text="ok")


def _static_stamp():
    """Thời điểm sửa gần nhất của các file trong static/ (để biết có file vừa đổi)."""
    newest = 0.0
    for folder, _, files in os.walk(STATIC):
        for f in files:
            try:
                newest = max(newest, os.path.getmtime(os.path.join(folder, f)))
            except OSError:
                pass
    return newest


async def dev_watch():
    """Chế độ phát triển: thấy file trong static/ thay đổi thì bảo mọi trình duyệt đang mở tải lại trang."""
    last = _static_stamp()
    while True:
        await asyncio.sleep(0.4)
        now = _static_stamp()
        if now != last:
            last = now
            print("🔄 static/ vừa thay đổi → tải lại trình duyệt")
            for s in list(SESSIONS.values()):
                await send_to(s, {"t": "reload"})


@web.middleware
async def no_cache(request, handler):
    # Chế độ phát triển: không cho trình duyệt giữ bản cũ của file js/html
    resp = await handler(request)
    resp.headers["Cache-Control"] = "no-store"
    return resp


async def start_background(app):
    app["online_task"] = asyncio.create_task(online_loop())
    app["stock_task"] = asyncio.create_task(stock_loop())
    if DEV:
        app["dev_task"] = asyncio.create_task(dev_watch())
    dating.SESSIONS, dating.FILTER = SESSIONS, filter_chat


def make_app():
    app = web.Application(middlewares=[no_cache] if DEV else [])
    app.router.add_get("/", index)
    app.router.add_get("/ping", ping)
    app.router.add_get("/static/catalog.js", catalog_js)
    app.router.add_get("/ws", ws_handler)
    app.router.add_static("/static/", STATIC)
    app.on_startup.append(start_background)
    return app


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    print(f"Ngủ Cùng Nhau đang chạy: http://localhost:{port}" + ("  (chế độ phát triển: tự tải lại)" if DEV else ""))
    web.run_app(make_app(), host="0.0.0.0", port=port, print=None)
