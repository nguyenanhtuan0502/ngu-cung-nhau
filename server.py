"""Ngủ Cùng Nhau - server multiplayer (aiohttp + WebSocket).

Mỗi mã phòng là một "thế giới" nhỏ, công viên ở trung tâm:
                 [Bắc] phòng học
  [Tây] phòng ngủ ── CÔNG VIÊN ── rạp phim [Đông]
                 [Nam] cổng vào (người mới xuất hiện ở đây)
Các khu không nối thẳng với nhau, muốn đi đâu cũng phải qua công viên.
Mỗi khu có nhạc, đèn (công viên: ngày/đêm) riêng; TV chỉ dùng ở rạp phim.

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

ROOT = os.path.dirname(os.path.abspath(__file__))
STATIC = os.path.join(ROOT, "static")

AREAS = ("sleep", "study", "park", "cinema")
SEATS = {"sleep": 8, "study": 6, "park": 4, "cinema": 6}
# SPAWN[(khu đến, khu vừa rời)] = chỗ xuất hiện (ngay trong cánh cửa nối 2 khu)
SPAWN = {
    ("park", "sleep"): (40.0, 356.0),    # lối Tây
    ("park", "study"): (180.0, 188.0),   # lối Bắc
    ("park", "cinema"): (320.0, 356.0),  # lối Đông
    ("sleep", "park"): (180.0, 540.0),   # cửa đầu phòng ngủ
    ("study", "park"): (180.0, 540.0),   # cửa cuối lớp
    ("cinema", "park"): (44.0, 545.0),   # cửa sảnh rạp
}
GATE = (180.0, 528.0)                    # cổng Nam của công viên
MAX_PLAYERS = 12
TV_CHANNELS = 4
MUSIC_TRACKS = 4
EMOTES = {"❤️", "😂", "🥱", "👋", "🌙", "😴"}
PET_TYPES = {"cat": "Mướp", "dog": "Cún", "bunny": "Bông", "none": ""}
COLORS = {"#e76f51", "#f4a261", "#e9c46a", "#2a9d8f", "#4cc9f0",
          "#7b2cbf", "#f72585", "#90be6d"}

YT_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")

# World bounds (phải khớp với client)
FLOOR = (16, 175, 344, 575)  # x1, y1, x2, y2

rooms = {}


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


def new_room():
    return {
        "players": {},
        "sockets": {},
        "areas": {a: new_area(SEATS[a]) for a in AREAS},
        # Mèo Mun của nhà: mode = walk | sit | sleep
        "pet": {"x": 230.0, "y": 360.0, "mode": "sit", "bed": None, "area": "park"},
        "_pet_task": None,
        # Pomodoro chung (hiện ở phòng học)
        "pomo": {"phase": "focus", "running": False, "end": None, "left": 25 * 60,
                 "focus": 25, "brk": 5, "round": 1},
        "_pomo_task": None,
    }


def public_area(a):
    return {"beds": a["beds"], "tv": a["tv"], "music": a["music"], "light": a["light"],
            "media": a["media"], "tvTimer": a["tv_timer"]}


def public_state(room):
    return {
        "players": list(room["players"].values()),
        "areas": {k: public_area(v) for k, v in room["areas"].items()},
        "pet": room["pet"],
        "pomo": room["pomo"],
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
    """Mèo Mun đi dạo giữa 2 phòng, ngồi cạnh mọi người, ngủ cùng khi cả nhà đã ngủ/ngồi học."""
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
                    x = random.uniform(FLOOR[0] + 10, FLOOR[2] - 10)
                    y = random.uniform(FLOOR[1] + 10, FLOOR[3] - 10)
                    area = pet["area"]
                else:
                    continue  # ngồi yên liếm lông
                pet.update(x=round(clamp(x, FLOOR[0], FLOOR[2]), 1),
                           y=round(clamp(y, FLOOR[1], FLOOR[3]), 1),
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
            player["studied"] += time.time() - player["sat_at"]
            player["sat_at"] = None


async def ws_handler(request):
    ws = web.WebSocketResponse(heartbeat=25)
    await ws.prepare(request)

    room = None
    code = None
    pid = None
    last_chat = 0.0
    last_pat = 0.0

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

            if t == "join" and pid is None:
                code = clean_code(d.get("room")) or "PHONG"
                if code not in rooms:
                    rooms[code] = new_room()
                    rooms[code]["_pet_task"] = asyncio.create_task(room_pet_loop(rooms[code]))
                room = rooms[code]
                if len(room["players"]) >= MAX_PLAYERS:
                    await ws.send_json({"t": "error", "msg": "Phòng đã đầy rồi 😢"})
                    room = None
                    continue
                pid = uuid.uuid4().hex[:8]
                color = d.get("color") if d.get("color") in COLORS else random.choice(list(COLORS))
                pd = d.get("pet") if isinstance(d.get("pet"), dict) else {}
                ptype = pd.get("type") if pd.get("type") in PET_TYPES else "none"
                pet = {"type": ptype, "name": clean_text(pd.get("name"), 10) or PET_TYPES[ptype]}
                start = d.get("area") or d.get("kind")
                start = start if start in AREAS else "park"
                if start == "park":
                    sx, sy = GATE[0] + random.uniform(-14, 14), GATE[1]
                else:
                    sx, sy = random.randint(140, 220), random.randint(520, 545)
                player = {
                    "id": pid,
                    "name": clean_text(d.get("name"), 14) or "Bạn",
                    "color": color,
                    "area": start,
                    "x": round(sx, 1),
                    "y": sy,
                    "bed": None,
                    "pet": pet,
                    "status": "",
                    "studied": 0.0,
                    "sat_at": None,
                }
                room["players"][pid] = player
                room["sockets"][pid] = ws
                await ws.send_json({"t": "welcome", "id": pid, "room": code,
                                    "state": public_state(room)})
                await broadcast(room, {"t": "join", "p": player}, exclude=pid)
                continue

            if room is None or pid is None:
                continue
            me = room["players"].get(pid)
            if me is None:
                continue
            an = me["area"]
            A = room["areas"][an]

            if t == "move":
                try:
                    x = clamp(float(d.get("x")), FLOOR[0], FLOOR[2])
                    y = clamp(float(d.get("y")), FLOOR[1], FLOOR[3])
                except (TypeError, ValueError):
                    continue
                free_bed(room, pid)
                me["x"], me["y"] = round(x, 1), round(y, 1)
                await broadcast(room, {"t": "move", "id": pid, "x": me["x"], "y": me["y"]})

            elif t == "area":                      # đi qua cửa sang phòng kia
                to = d.get("area")
                if (to, an) not in SPAWN:
                    continue
                free_bed(room, pid)
                me["area"] = to
                me["x"], me["y"] = SPAWN[(to, an)]
                await broadcast(room, {"t": "area", "id": pid, "area": to, "x": me["x"], "y": me["y"]})

            elif t == "sleep":
                b = d.get("bed")
                if not isinstance(b, int) or not 0 <= b < len(A["beds"]):
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
                text = clean_text(d.get("text"), 80)
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
    finally:
        if room is not None and pid is not None:
            free_bed(room, pid)
            room["players"].pop(pid, None)
            room["sockets"].pop(pid, None)
            if room["players"]:
                await broadcast(room, {"t": "leave", "id": pid})
            elif rooms.get(code) is room:
                for a in room["areas"].values():
                    cancel_tv_timer(a)
                if room["_pet_task"]:
                    room["_pet_task"].cancel()
                cancel_pomo(room)
                del rooms[code]
    return ws


async def index(request):
    return web.FileResponse(os.path.join(STATIC, "index.html"))


async def ping(request):
    # Client gọi định kỳ để host miễn phí (Render…) không tắt server khi cả phòng đang ngủ
    return web.Response(text="ok")


def make_app():
    app = web.Application()
    app.router.add_get("/", index)
    app.router.add_get("/ping", ping)
    app.router.add_get("/ws", ws_handler)
    app.router.add_static("/static/", STATIC)
    return app


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    print(f"Ngủ Cùng Nhau đang chạy: http://localhost:{port}")
    web.run_app(make_app(), host="0.0.0.0", port=port, print=None)
