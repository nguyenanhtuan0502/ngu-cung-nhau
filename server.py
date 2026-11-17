"""Ngủ Cùng Nhau - server multiplayer (aiohttp + WebSocket).

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

BEDS = 6
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


def new_room(kind="sleep"):
    return {
        "kind": kind,  # sleep = phòng ngủ, study = phòng học
        "players": {},
        "sockets": {},
        "beds": [None] * BEDS,
        "tv": {"on": False, "ch": 0},
        "music": {"on": False, "track": 0},
        "light": True,
        # Video YouTube đang phát: {"id", "pos", "at", "paused"} hoặc None
        "media": {"tv": None, "music": None},
        "tv_timer": None,   # thời điểm (time.time()) TV sẽ tự tắt
        "_task": None,
        # Mèo Mun của phòng: mode = walk | sit | sleep
        "pet": {"x": 300.0, "y": 200.0, "mode": "sit", "bed": None},
        "_pet_task": None,
        # Pomodoro chung của phòng học
        "pomo": {"phase": "focus", "running": False, "end": None, "left": 25 * 60,
                 "focus": 25, "brk": 5, "round": 1},
        "_pomo_task": None,
    }


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


async def room_pet_loop(room):
    """Mèo Mun tự đi dạo, ngồi cạnh mọi người, và ngủ cùng khi cả phòng đã ngủ."""
    try:
        while True:
            await asyncio.sleep(random.uniform(4, 9))
            players = list(room["players"].values())
            if not players:
                continue
            pet = room["pet"]
            sleepers = [p for p in players if p["bed"] is not None]
            if len(sleepers) == len(players):
                beds = [p["bed"] for p in sleepers]
                if pet["mode"] == "sleep" and pet["bed"] in beds:
                    continue
                pet.update(mode="sleep", bed=random.choice(beds))
            else:
                r = random.random()
                if r < 0.5:
                    p = random.choice([p for p in players if p["bed"] is None])
                    x = p["x"] + random.choice([-1, 1]) * random.uniform(18, 30)
                    y = p["y"] + random.uniform(-4, 10)
                elif r < 0.85:
                    x = random.uniform(FLOOR[0] + 10, FLOOR[2] - 10)
                    y = random.uniform(FLOOR[1] + 10, FLOOR[3] - 10)
                else:
                    continue  # ngồi yên liếm lông
                pet.update(x=round(clamp(x, FLOOR[0], FLOOR[2]), 1),
                           y=round(clamp(y, FLOOR[1], FLOOR[3]), 1), mode="walk", bed=None)
            await broadcast(room, {"t": "roompet", "pet": pet})
    except asyncio.CancelledError:
        pass


def cancel_tv_timer(room):
    if room["_task"]:
        room["_task"].cancel()
    room["_task"] = None
    room["tv_timer"] = None


async def tv_timer_task(room, delay):
    try:
        await asyncio.sleep(delay)
    except asyncio.CancelledError:
        return
    room["_task"] = None
    room["tv_timer"] = None
    room["tv"]["on"] = False
    room["media"]["tv"] = None
    await broadcast(room, {"t": "tv", "tv": room["tv"], "by": "⏰ Hẹn giờ"})
    await broadcast(room, {"t": "tvtimer", "end": None, "by": "⏰ Hẹn giờ"})


def public_state(room):
    return {
        "kind": room["kind"],
        "pomo": room["pomo"],
        "players": list(room["players"].values()),
        "beds": room["beds"],
        "tv": room["tv"],
        "music": room["music"],
        "light": room["light"],
        "media": room["media"],
        "tvTimer": room["tv_timer"],
        "pet": room["pet"],
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


def free_bed(room, pid):
    beds = room["beds"]
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
                    kind = d.get("kind") if d.get("kind") in ("sleep", "study") else "sleep"
                    rooms[code] = new_room(kind)
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
                player = {
                    "id": pid,
                    "name": clean_text(d.get("name"), 14) or "Bạn",
                    "color": color,
                    "x": random.randint(140, 220),
                    "y": random.randint(535, 565),
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

            if t == "move":
                try:
                    x = clamp(float(d.get("x")), FLOOR[0], FLOOR[2])
                    y = clamp(float(d.get("y")), FLOOR[1], FLOOR[3])
                except (TypeError, ValueError):
                    continue
                free_bed(room, pid)
                me["x"], me["y"] = round(x, 1), round(y, 1)
                await broadcast(room, {"t": "move", "id": pid, "x": me["x"], "y": me["y"]})

            elif t == "sleep":
                b = d.get("bed")
                if not isinstance(b, int) or not 0 <= b < BEDS:
                    continue
                if room["beds"][b] not in (None, pid):
                    await ws.send_json({"t": "error", "msg": "Chỗ này có người rồi!"})
                    continue
                free_bed(room, pid)
                room["beds"][b] = pid
                me["bed"] = b
                now = time.time()
                if room["kind"] == "study":
                    me["sat_at"] = now
                await broadcast(room, {"t": "sleep", "id": pid, "bed": b, "at": now})

            elif t == "tv":
                on = bool(d.get("on"))
                ch = d.get("ch", room["tv"]["ch"])
                if isinstance(ch, int) and 0 <= ch < TV_CHANNELS:
                    room["tv"] = {"on": on, "ch": ch}
                    room["media"]["tv"] = None
                    await broadcast(room, {"t": "tv", "tv": room["tv"], "by": me["name"]})
                    if not on and room["tv_timer"]:
                        cancel_tv_timer(room)
                        await broadcast(room, {"t": "tvtimer", "end": None, "by": me["name"], "silent": True})

            elif t == "tvtimer":
                mins = d.get("min")
                if not isinstance(mins, (int, float)) or not 0 <= mins <= 600:
                    continue
                cancel_tv_timer(room)
                if mins > 0 and room["tv"]["on"]:
                    room["tv_timer"] = time.time() + mins * 60
                    room["_task"] = asyncio.create_task(tv_timer_task(room, mins * 60))
                await broadcast(room, {"t": "tvtimer", "end": room["tv_timer"],
                                       "now": time.time(), "by": me["name"]})

            elif t == "music":
                on = bool(d.get("on"))
                tr = d.get("track", room["music"]["track"])
                if isinstance(tr, int) and 0 <= tr < MUSIC_TRACKS:
                    room["music"] = {"on": on, "track": tr}
                    if on:
                        room["media"]["music"] = None
                    await broadcast(room, {"t": "music", "music": room["music"], "by": me["name"]})

            elif t == "media":
                slot = d.get("slot")
                if slot not in ("tv", "music"):
                    continue
                act = d.get("a")
                now = time.time()
                cur = room["media"][slot]
                if act == "load":
                    vid = d.get("id")
                    if not isinstance(vid, str) or not YT_ID.match(vid):
                        await ws.send_json({"t": "error", "msg": "Link YouTube không hợp lệ"})
                        continue
                    room["media"][slot] = {"id": vid, "pos": 0.0, "at": now, "paused": False}
                    if slot == "tv":
                        room["tv"] = {"on": True, "ch": -1}
                    else:
                        room["music"]["on"] = False
                elif act in ("pause", "play") and cur:
                    try:
                        pos = max(0.0, float(d.get("pos", 0)))
                    except (TypeError, ValueError):
                        continue
                    cur.update(pos=pos, at=now, paused=(act == "pause"))
                elif act == "stop":
                    room["media"][slot] = None
                    if slot == "tv":
                        room["tv"]["on"] = False
                        cancel_tv_timer(room)
                else:
                    continue
                await broadcast(room, {"t": "media", "slot": slot, "a": act,
                                       "media": room["media"][slot], "now": now,
                                       "by": me["name"]})

            elif t == "light":
                room["light"] = bool(d.get("on"))
                await broadcast(room, {"t": "light", "on": room["light"], "by": me["name"]})

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
                cancel_tv_timer(room)
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
