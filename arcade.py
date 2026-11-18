"""🎪 Khu vui chơi (ver_2 mục 7.9): bầu cua tôm cá, gắp gấu bông hạng C → S+, xổ số ảo quay theo giờ Việt Nam.

Mọi kết quả may rủi do SERVER tung (economy.RNG). Chỉ dùng xu ảo kiếm trong game; có giới hạn cược mỗi phiên
và giới hạn tổng xu thua mỗi ngày (DAILY_LOSS_LIMIT trong catalog.json). Tỉ lệ được công khai trong game.
"""
import hashlib
import time
import uuid

import economy
import store
from economy import EcoError, RNG, add_item, pay, vn_today

CFG = economy.CAT["ARCADE"]
FACES = [f["id"] for f in CFG["BC_FACES"]]
FACE_NAME = {f["id"]: f["name"] for f in CFG["BC_FACES"]}
RANKS = {r["rank"]: r for r in CFG["CLAW_RANKS"]}
MACHINES = {m["id"]: m for m in CFG["CLAW_MACHINES"]}
plush_id = lambda rank: "f_plush_" + rank.replace("+", "P")


# ---------------- Giới hạn thua mỗi ngày ----------------
def _gamble(data):
    g = data.get("gamble") if isinstance(data.get("gamble"), dict) else {}
    if g.get("day") != vn_today():
        g = {"day": vn_today(), "loss": 0}
    data["gamble"] = g
    return g


def gamble_check(data, amount):
    g = _gamble(data)
    if g["loss"] + amount > CFG["DAILY_LOSS_LIMIT"]:
        raise EcoError(f"Hôm nay bạn đã thua gần {CFG['DAILY_LOSS_LIMIT']} xu rồi, nghỉ chút mai chơi tiếp nha 🍵")


def gamble_add(data, delta):                         # +: tiền bỏ ra, -: tiền thắng về
    g = _gamble(data)
    g["loss"] = max(0, g["loss"] + delta)


def _need_arcade(st, what):
    if st["p"]["area"] != "arcade":
        raise EcoError(f"{what} ở 🎪 Khu vui chơi, mở 🗺️ bản đồ để tới nhé")


# ---------------- Bầu cua tôm cá (bàn chung mỗi kênh) ----------------
def bc_new():
    return {"phase": "bet", "end": time.time() + CFG["BC_BET_SEC"], "bets": {}, "names": {}, "uids": {}, "dice": None,
            "hist": [], "round": 1, "wins": []}


def bc_public(bc, sid=None):
    totals = {f: 0 for f in FACES}
    for bets in bc["bets"].values():
        for f, a in bets.items():
            totals[f] += a
    return {"phase": bc["phase"], "end": bc["end"], "now": time.time(), "round": bc["round"], "totals": totals,
            "mine": bc["bets"].get(sid, {}) if sid else {}, "players": len(bc["bets"]),
            "dice": bc["dice"] if bc["phase"] == "result" else None, "hist": bc["hist"], "wins": bc["wins"]}


def a_bc_bet(st, data, d):
    _need_arcade(st, "Bàn bầu cua")
    bc = st["room"].get("bc")
    face, amt = d.get("face"), d.get("amt")
    if not bc or bc["phase"] != "bet":
        raise EcoError("Đang lắc bát, chờ phiên sau nhé")
    if face not in FACES or not isinstance(amt, int) or amt < CFG["BC_MIN"]:
        raise EcoError(f"Cược tối thiểu {CFG['BC_MIN']} xu")
    mine = bc["bets"].setdefault(st["p"]["id"], {})
    if sum(mine.values()) + amt > CFG["BC_MAX"]:
        raise EcoError(f"Mỗi phiên cược tối đa {CFG['BC_MAX']} xu")
    gamble_check(data, amt)
    pay(data, amt)
    gamble_add(data, amt)
    mine[face] = mine.get(face, 0) + amt
    bc["names"][st["p"]["id"]] = st["p"]["name"]
    bc["uids"][st["p"]["id"]] = st["uid"]                 # trả thưởng theo tài khoản (kể cả khi đã thoát)
    st["out"].append(("bc",))
    return {"mine": mine}


def bc_roll(bc):
    """Tung 3 xúc xắc. Trả về {sid: số xu nhận về} theo luật: ô ra k con → nhận lại cược + k lần cược."""
    dice = [RNG.choice(FACES) for _ in range(3)]
    bc["dice"] = dice
    pays = {}
    for sid, bets in bc["bets"].items():
        win = sum(a + a * dice.count(f) for f, a in bets.items() if f in dice)
        if win:
            pays[sid] = win
    bc["hist"] = ([dice] + bc["hist"])[:10]
    bc["wins"] = sorted(([bc["names"].get(sid, "?"), w] for sid, w in pays.items()), key=lambda x: -x[1])[:5]
    return pays


def bc_next(bc):
    bc.update(phase="bet", end=time.time() + CFG["BC_BET_SEC"], bets={}, names={}, uids={}, dice=None, wins=[], round=bc["round"] + 1)


# ---------------- Gắp gấu bông (mỗi kênh có lồng riêng) ----------------
def _new_plush():
    ranks = CFG["CLAW_RANKS"]
    r = ranks[economy.pick(ranks, lambda x: x["appear"])]
    return {"id": uuid.uuid4().hex[:6], "rank": r["rank"], "x": round(RNG.uniform(.1, .9), 3)}


def cage_new():
    return {m: [_new_plush() for _ in range(CFG["CLAW_CAGE"])] for m in MACHINES}


def a_claw_cage(st, data, d):
    _need_arcade(st, "Máy gắp gấu")
    m = d.get("m") if d.get("m") in MACHINES else "normal"
    return {"cage": st["room"]["cage"][m], "miss": data.get("clawMiss", 0)}


def a_claw_play(st, data, d):
    _need_arcade(st, "Máy gắp gấu")
    m = MACHINES.get(d.get("m"))
    x = d.get("x")
    if not m or not isinstance(x, (int, float)):
        raise EcoError("Máy gắp không hợp lệ")
    x = max(0.0, min(1.0, float(x)))
    gamble_check(data, m["price"])
    pay(data, m["price"])
    gamble_add(data, m["price"])
    cage = st["room"]["cage"][m["id"]]
    target = min(cage, key=lambda it: abs(it["x"] - x)) if cage else None
    miss = int(data.get("clawMiss", 0))
    res = {"x": x, "r": "miss"}
    if target:
        R = RANKS[target["rank"]]
        tol = .05 + R["size"] / 900                                        # gấu to thì dễ trúng vị trí hơn
        aim = max(0.0, 1 - abs(target["x"] - x) / tol)                     # độ canh trúng (kỹ năng người chơi)
        pity = (miss // CFG["PITY_EVERY"]) * CFG["PITY_BONUS"]             # thua liên tiếp: tăng nhẹ độ giữ chặt
        grip = min(.95, R["grip"] * m["grip"] + pity)
        res.update(id=target["id"], rank=target["rank"], tx=target["x"])
        if aim > 0 and RNG.random() < aim * grip:
            cage.remove(target)
            add_item(data, plush_id(target["rank"]), "🧸", f"Gấu bông hạng {target['rank']}", "deco")
            data["clawMiss"] = 0
            res["r"] = "win"
            if target["rank"] in ("S", "S+"):
                st["out"].append(("room", {"t": "announce", "text": f"🎉 {st['p']['name']} vừa gắp được gấu {target['rank']}!", "big": True}))
        else:
            data["clawMiss"] = miss + 1
            res["r"] = "drop" if aim > .3 and RNG.random() < .55 else "miss"   # nhấc lên rồi rớt giữa đường cho kịch tính
    if len(cage) < 4:                                                      # lồng nạp thêm khi gần hết
        cage.extend(_new_plush() for _ in range(CFG["CLAW_CAGE"] - len(cage)))
    res["cage"] = cage
    return res


def plush_price(rank):
    """Giá Bác Gấu mua lại: theo hạng, dao động nhẹ ±10% theo ngày."""
    h = int(hashlib.md5((vn_today() + rank).encode()).hexdigest()[:6], 16) / 0xFFFFFF
    return int(RANKS[rank]["sell"] * (0.9 + 0.2 * h))


def a_plush_prices(st, data, d):
    return {"prices": {r: plush_price(r) for r in RANKS}}


def a_sell_plush(st, data, d):
    _need_arcade(st, "Bác Gấu")
    rank = d.get("rank")
    if rank not in RANKS or not economy.take_item(data, plush_id(rank)):
        raise EcoError("Bạn không có gấu hạng này")
    price = plush_price(rank)
    data["coins"] += price
    return {"price": price}


# ---------------- Xổ số ảo cộng đồng (quay lúc 18:30 giờ VN mỗi ngày) ----------------
L = CFG["LOTTO"]


def _vn_minutes():
    t = time.gmtime(time.time() + economy.VN_OFFSET)
    return t.tm_hour * 60 + t.tm_min


def draw_of(day):
    """Kết quả xổ số của ngày `day` (YYYY-MM-DD); tới giờ quay mà chưa có thì server quay luôn."""
    key = "lotto:" + day
    res = store.kv_get(key)
    if res:
        return res
    h, m = map(int, L["draw_time"].split(":"))
    if day > vn_today() or (day == vn_today() and _vn_minutes() < h * 60 + m):
        return None
    res = f"{RNG.randrange(1000):03d}"
    store.kv_set(key, res)
    return res


def _match(n, w):
    return 3 if n == w else 2 if n[1:] == w[1:] else 1 if n[2] == w[2] else 0


def _tickets(data):
    keep = time.strftime("%Y-%m-%d", time.gmtime(time.time() + economy.VN_OFFSET - L["claim_days"] * 86400))
    t = [x for x in data.get("lotto2", []) if isinstance(x, dict) and x.get("d", "") >= keep]
    data["lotto2"] = t
    return t


def a_lotto_buy(st, data, d):
    _need_arcade(st, "Quầy xổ số")
    n = d.get("n")
    if not (isinstance(n, str) and len(n) == 3 and n.isdigit()):
        n = f"{RNG.randrange(1000):03d}"
    today = vn_today()
    t = _tickets(data)
    if sum(1 for x in t if x["d"] == today) >= L["max_per_day"]:
        raise EcoError(f"Mỗi ngày mua tối đa {L['max_per_day']} vé thôi nha")
    if draw_of(today):
        raise EcoError("Hôm nay đã quay số rồi, mai mua tiếp nhé")
    pay(data, L["price"])
    t.append({"d": today, "n": n})
    return {"n": n}


def a_lotto_status(st, data, d):
    out = []
    for x in _tickets(data):
        w = draw_of(x["d"])
        m = _match(x["n"], w) if w else None
        prize = next((p for p in L["prizes"] if p["match"] == m), None)
        out.append({**x, "w": w, "match": m, "prize": prize["coins"] if prize else 0, "pname": prize["name"] if prize else ""})
    today = vn_today()
    return {"tickets": out, "today": draw_of(today), "draw_time": L["draw_time"], "prizes": L["prizes"],
            "price": L["price"], "max": L["max_per_day"]}


def a_lotto_claim(st, data, d):
    _need_arcade(st, "Quầy xổ số")
    total = 0
    for x in _tickets(data):
        w = draw_of(x["d"])
        if w and not x.get("c"):
            prize = next((p for p in L["prizes"] if p["match"] == _match(x["n"], w)), None)
            x["c"] = 1
            if prize:
                total += prize["coins"]
    if not total:
        raise EcoError("Chưa có vé trúng để nhận")
    data["coins"] += total
    return {"total": total}


ACTIONS = {"bcBet": a_bc_bet, "clawCage": a_claw_cage, "clawPlay": a_claw_play, "plushPrices": a_plush_prices,
           "sellPlush": a_sell_plush, "lottoBuy": a_lotto_buy, "lottoStatus": a_lotto_status, "lottoClaim": a_lotto_claim}
