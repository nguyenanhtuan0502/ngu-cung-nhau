"""Kinh tế chạy ở SERVER (giai đoạn 6): xu, rương đồ, tủ đồ, mồi câu, nông trại.

Trình duyệt chỉ gửi yêu cầu {t:"eco", a:<hành động>, ...}; server kiểm tra (đủ xu, món có thật, đang ở đúng khu…),
tự tung kết quả ngẫu nhiên (vòng quay, gắp thú, vé số, câu cá, thu hoạch) rồi trả về số dư mới.
Giá cả, tỉ lệ, phần thưởng lấy từ catalog.json (trình duyệt cũng đọc file này qua /static/catalog.js).
"""
import json
import math
import os
import random
import time

ROOT = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(ROOT, "catalog.json"), encoding="utf-8") as _f:
    CAT = json.load(_f)

RNG = random.SystemRandom()                     # bộ sinh số ngẫu nhiên an toàn (không đoán trước được)
VN_OFFSET = 7 * 3600                            # giờ Việt Nam = UTC+7

SHOP_AREA = {"park": "park", "popcorn": "cinema", "drinks": "cinema", "souvenir": "cinema"}
SHOP_ITEMS = {(shop, it["id"]): it for shop, items in CAT["SHOP"].items() for it in items}
CROPS = {c["id"]: c for c in CAT["CROPS"]}
FISH = {f["id"]: f for f in CAT["FISH"]}
BAITS = {b["id"]: b for b in CAT["BAITS"]}
CLOTHES = {c["id"]: c for c in CAT["CLOTHES"]}
FURN = {f["id"]: f for f in CAT["FURNITURE"]}
PETS = {p["id"]: p for p in CAT["PET_SHOP"]}
DEFAULT_OUTFIT = {"gender": "g_f", "hair": "hair_short", "hairColor": "hc_brown", "shirt": "", "hat": "hat_nightcap",
                  "glasses": "gl_none", "neck": "neck_none", "back": "back_none"}
ECO_KEYS = ("coins", "inv", "owned", "bait", "farm", "daily", "wheelDay", "wheelUsed")
LEGACY_COIN_CAP = 2000                          # dữ liệu cũ từ trình duyệt: chỉ nhận tối đa chừng này xu


class EcoError(Exception):
    """Giao dịch không hợp lệ: thông báo gửi lại cho người chơi."""


def vn_today():
    return time.strftime("%Y-%m-%d", time.gmtime(time.time() + VN_OFFSET))


def now_ms():
    return int(time.time() * 1000)


# ---------------- Dữ liệu người chơi ----------------
def ensure(data):
    """Bổ sung/sửa các trường kinh tế cho đúng kiểu (tài khoản mới, dữ liệu cũ, dữ liệu hỏng)."""
    c = data.get("coins")
    data["coins"] = int(c) if isinstance(c, (int, float)) and not isinstance(c, bool) and c >= 0 else CAT["START_COINS"]
    inv = data.get("inv") if isinstance(data.get("inv"), dict) else {}
    data["inv"] = {k: v for k, v in inv.items()
                   if isinstance(k, str) and isinstance(v, dict) and isinstance(v.get("n"), int) and v["n"] > 0}
    owned = data.get("owned") if isinstance(data.get("owned"), dict) else {}
    data["owned"] = {k: v for k, v in owned.items() if k in CLOTHES and isinstance(v, (int, float))}
    bait = data.get("bait") if isinstance(data.get("bait"), dict) else {"worm": CAT["START_BAIT"]}
    data["bait"] = {k: int(v) for k, v in bait.items() if k in BAITS and isinstance(v, (int, float)) and v > 0}
    farm = data.get("farm") if isinstance(data.get("farm"), list) else []
    farm = [p if isinstance(p, dict) and p.get("c") in CROPS else None for p in farm][:CAT["FARM_PLOTS"]]
    data["farm"] = farm + [None] * (CAT["FARM_PLOTS"] - len(farm))
    for k in ("daily", "wheelDay"):
        data[k] = data.get(k) if isinstance(data.get(k), str) else ""
    data["wheelUsed"] = data.get("wheelUsed") if isinstance(data.get("wheelUsed"), int) else 0
    data["v"] = 1
    return data


def snapshot(data):
    return {k: data[k] for k in ECO_KEYS}


def daily_bonus(data):
    """+xu mỗi ngày, tính theo ngày Việt Nam. Trả về số xu được thưởng (0 nếu đã nhận hôm nay)."""
    today = vn_today()
    if data.get("daily") == today:
        return 0
    data["daily"] = today
    data["coins"] += CAT["DAILY_BONUS"]
    return CAT["DAILY_BONUS"]


def clean_stats(old, new, elapsed):
    """Chỉ số năng lượng/vui vẻ/kiến thức/kinh nghiệm vẫn do máy người chơi tính (không đổi ra xu được),
    server chỉ kẹp giới hạn và không cho kiến thức/kinh nghiệm tăng vọt."""
    out = {}
    if not isinstance(new, dict):
        return out
    for k in ("energy", "fun"):
        v = new.get(k)
        if isinstance(v, (int, float)) and not isinstance(v, bool):
            out[k] = max(0.0, min(100.0, float(v)))
    cap = max(40.0, elapsed * 0.5)
    for k in ("know", "xp"):
        v = new.get(k)
        if isinstance(v, (int, float)) and not isinstance(v, bool):
            prev = old.get(k, 0) if isinstance(old.get(k), (int, float)) else 0
            out[k] = max(0.0, min(float(v), prev + cap))
    return out


# ---------------- Tiện ích ----------------
def pay(data, price):
    if data["coins"] < price:
        raise EcoError(f"Không đủ xu 😢 (cần {price} 💰)")
    data["coins"] -= price


def add_item(data, iid, e, name, cat, n=1):
    cur = data["inv"].get(iid) or {"e": e, "name": name, "n": 0}
    cur.update(e=e, name=name, cat=cat)
    cur["n"] += n
    data["inv"][iid] = cur


def take_item(data, iid, n=1):
    cur = data["inv"].get(iid)
    if not cur or cur["n"] < n:
        return False
    cur["n"] -= n
    if cur["n"] <= 0:
        del data["inv"][iid]
    return True


def pick(items, weight):
    """Chọn ngẫu nhiên theo trọng số, trả về chỉ số."""
    total = sum(weight(x) for x in items)
    r = RNG.random() * total
    for i, x in enumerate(items):
        r -= weight(x)
        if r < 0:
            return i
    return len(items) - 1


def owns(data, cid):
    c = CLOTHES.get(cid)
    if not c:
        return False
    if not c["price"]:
        return True
    v = data["owned"].get(cid)
    return v == 0 or (isinstance(v, (int, float)) and v > now_ms())


def valid_outfit(data, outfit):
    """Chỉ mặc được đồ miễn phí, đồ đã mua hoặc đồ thuê còn hạn."""
    outfit = outfit if isinstance(outfit, dict) else {}
    out = {}
    for slot, default in DEFAULT_OUTFIT.items():
        v = outfit.get(slot)
        if slot == "shirt" and v == "":
            out[slot] = ""
        elif isinstance(v, str) and v in CLOTHES and CLOTHES[v]["slot"] == slot and owns(data, v):
            out[slot] = v
        else:
            out[slot] = default
    return out


def study_coins(sess, minutes):
    """Xu khi ngồi học: cộng dồn phần lẻ, trả về số xu chẵn vừa cộng."""
    acc = sess.get("study_acc", 0.0) + minutes * CAT["STUDY_COINS_PER_MIN"]
    whole = int(acc)
    sess["study_acc"] = acc - whole
    if whole:
        sess["data"]["coins"] += whole
    return whole


# ---------------- Các hành động ----------------
def _need_area(st, area, what):
    if st["p"]["area"] != area:
        raise EcoError(f"{what} chỉ có ở khu khác, mở 🗺️ bản đồ để tới nhé")


def _plot(data, d):
    i = d.get("i")
    if not isinstance(i, int) or not 0 <= i < len(data["farm"]):
        raise EcoError("Ô ruộng không tồn tại")
    return i


def a_buy(st, data, d):
    shop = d.get("shop")
    it = SHOP_ITEMS.get((shop, d.get("id")))
    if not it:
        raise EcoError("Món này không có bán")
    _need_area(st, SHOP_AREA[shop], "Quầy này")
    pay(data, it["price"])
    if it.get("keep"):
        add_item(data, it["id"], it["e"], it["name"], it.get("cat", "misc"))
    return {"id": it["id"]}


def a_ticket(st, data, d):
    _need_area(st, "cinema", "Máy bán vé")
    if st.get("ticket"):
        raise EcoError("🎟️ Bạn đã có vé rồi, chọn ghế ngồi đi!")
    pay(data, CAT["TICKET_PRICE"])
    st["ticket"] = True
    return {}


def a_claw(st, data, d):
    _need_area(st, "cinema", "Máy gắp thú")
    pay(data, CAT["CLAW_PRICE"])
    if RNG.random() < CAT["CLAW_CHANCE"]:
        i = RNG.randrange(len(CAT["CLAW_PRIZES"]))
        p = CAT["CLAW_PRIZES"][i]
        add_item(data, p["id"], p["e"], p["name"], "misc")
        return {"prize": i}
    return {"prize": None}


def a_wheel(st, data, d):
    if st["p"]["area"] not in ("park", "arcade"):                    # công viên (xe kem) hoặc khu vui chơi (chị Hoa)
        raise EcoError("Vòng quay ở 🌳 công viên hoặc 🎪 khu vui chơi")
    W = CAT["WHEEL"]
    if data["wheelDay"] != vn_today():
        data["wheelDay"], data["wheelUsed"] = vn_today(), 0
    free = data["wheelUsed"] < W["FREE_PER_DAY"]
    if not free:
        pay(data, W["PRICE"])
    data["wheelUsed"] += 1
    i = pick(W["PRIZES"], lambda p: p["w"])
    data["coins"] += W["PRIZES"][i].get("coins", 0)
    return {"i": i, "free": free}


def a_quiz_start(st, data, d):
    _need_area(st, "study", "Bài kiểm tra")
    Q = CAT["QUIZ_CFG"]
    qs = RNG.sample(range(len(CAT["QUIZ"])), Q["PER_ROUND"])
    st["quiz"] = {"qs": qs, "k": 0, "score": 0}
    return {"qs": qs}


def a_quiz_ans(st, data, d):
    q = st.get("quiz")
    a = d.get("ans")                               # đáp án (khóa "a" đã dùng cho tên hành động)
    if not q or not isinstance(a, int):
        raise EcoError("Chưa bắt đầu bài kiểm tra")
    qi = q["qs"][q["k"]]
    c = CAT["QUIZ"][qi]["c"]
    ok = a == c
    q["score"] += ok
    q["k"] += 1
    res = {"ok": ok, "c": c}
    if q["k"] >= len(q["qs"]):                    # hết bài: chấm điểm, trả xu
        Q, n = CAT["QUIZ_CFG"], len(q["qs"])
        won = q["score"] * Q["COINS"] + (10 if q["score"] == n else 0)
        data["coins"] += won
        res.update(done=True, score=q["score"], won=won)
        st["quiz"] = None
    return res


def a_buy_seed(st, data, d):
    _need_area(st, "farm", "Hạt giống")
    c = CROPS.get(d.get("c"))
    if not c:
        raise EcoError("Không có hạt giống này")
    pay(data, c["seed"])
    add_item(data, "seed_" + c["id"], "🌱", "Hạt " + c["name"], "seed")
    return {}


def a_plant(st, data, d):
    _need_area(st, "farm", "Ruộng")
    i, c = _plot(data, d), CROPS.get(d.get("c"))
    if not c:
        raise EcoError("Không có hạt giống này")
    if data["farm"][i]:
        raise EcoError("Ô này đã trồng rồi")
    if not take_item(data, "seed_" + c["id"]):
        pay(data, c["seed"])
    data["farm"][i] = {"c": c["id"], "p": time.time(), "w": 0}
    return {}


def a_water(st, data, d):
    _need_area(st, "farm", "Ruộng")
    i = _plot(data, d)
    pl = data["farm"][i]
    if not pl or pl.get("w"):
        raise EcoError("Ô này không cần tưới")
    pl["w"] = time.time()
    return {}


def a_harvest(st, data, d):
    _need_area(st, "farm", "Ruộng")
    i = _plot(data, d)
    pl = data["farm"][i]
    c = CROPS.get(pl["c"]) if pl else None
    if not c or not pl.get("w") or time.time() - pl["w"] < c["time"] - 1:
        raise EcoError("Cây chưa chín đâu, chờ thêm chút nhé")
    n = 2 + (1 if RNG.random() < .3 else 0)        # thu hoạch 2-3 quả
    add_item(data, "crop_" + c["id"], c["e"], c["name"], "crop", n)
    data["farm"][i] = None
    return {"n": n, "c": c["id"]}


def _sell(data, prefix, table, price_key):
    total = 0
    for iid in [k for k in data["inv"] if k.startswith(prefix)]:
        it = table.get(iid[len(prefix):])
        if it:
            total += data["inv"][iid]["n"] * it[price_key]
            del data["inv"][iid]
    if not total:
        raise EcoError("Chưa có gì để bán")
    data["coins"] += total
    return {"total": total}


def a_sell_crops(st, data, d):
    _need_area(st, "farm", "Bác Năm")
    return _sell(data, "crop_", CROPS, "sell")


def a_sell_fish(st, data, d):
    _need_area(st, "fishing", "Quầy cô Lan")
    return _sell(data, "fish_", FISH, "price")


def a_buy_bait(st, data, d):
    _need_area(st, "fishing", "Quầy mồi")
    b = BAITS.get(d.get("id"))
    if not b:
        raise EcoError("Không có loại mồi này")
    pay(data, b["price"])
    data["bait"][b["id"]] = data["bait"].get(b["id"], 0) + b["pack"]
    return {}


def a_cast(st, data, d):
    _need_area(st, "fishing", "Câu cá")
    if st["p"]["bed"] is None:
        raise EcoError("🎣 Ngồi vào ghế đẩu bên bờ hồ trước nhé")
    b = BAITS.get(d.get("bait"))
    if not b or data["bait"].get(b["id"], 0) <= 0:
        raise EcoError("🐛 Hết mồi rồi! Mua mồi ở quầy của cô Lan")
    data["bait"][b["id"]] -= 1
    if data["bait"][b["id"]] <= 0:
        del data["bait"][b["id"]]
    wait = RNG.uniform(2, 6)                       # server quyết định lúc cá cắn
    st["fish"] = {"bait": b["id"], "bite": time.time() + wait}
    return {"wait": round(wait, 2)}


def a_pull(st, data, d):
    f = st.get("fish")
    if not f:
        raise EcoError("Chưa thả câu")
    st["fish"] = None
    dt = time.time() - f["bite"]
    if dt < -0.25:
        return {"r": "early"}
    if dt > 2.0:                                   # 1.4 giây + bù độ trễ mạng
        return {"r": "late"}
    rare = BAITS[f["bait"]]["rare"]
    i = pick(CAT["FISH"], lambda x: x["w"] * (rare if x.get("rare") else 1))
    fish = CAT["FISH"][i]
    add_item(data, "fish_" + fish["id"], fish["e"], fish["name"], "fish")
    return {"r": "ok", "fish": i}


def a_buy_cloth(st, data, d):
    _need_area(st, "mall", "Cửa hàng quần áo")
    c = CLOTHES.get(d.get("id"))
    if not c or not c["price"]:
        raise EcoError("Món này không bán")
    cur = data["owned"].get(c["id"])
    if cur == 0:
        raise EcoError("Bạn đã có món này rồi")
    if d.get("rent"):                              # thuê 1 ngày, gia hạn cộng dồn
        pay(data, math.ceil(c["price"] / CAT["RENT_FACTOR"]))
        data["owned"][c["id"]] = max(now_ms(), cur or 0) + 86400000
    else:
        pay(data, c["price"])
        data["owned"][c["id"]] = 0
    return {"id": c["id"]}


def a_adopt(st, data, d):
    _need_area(st, "mall", "Tiệm thú cưng")
    p = PETS.get(d.get("id"))
    if not p:
        raise EcoError("Không có bé này")
    pay(data, p["price"])
    return {"id": p["id"]}


def a_treat(st, data, d):
    _need_area(st, "mall", "Tiệm thú cưng")
    pay(data, CAT["PET_TREAT"]["price"])
    return {}


def a_buy_furn(st, data, d):
    _need_area(st, "mall", "Cửa hàng nội thất")
    f = FURN.get(d.get("id"))
    if not f or f.get("noshop"):
        raise EcoError("Món này không bán")
    pay(data, f["price"])
    add_item(data, f["id"], f["e"], f["name"], "deco")
    return {}


def a_lotto(st, data, d):
    _need_area(st, "mall", "Quầy vé số")
    L = CAT["LOTTERY"]
    pay(data, L["price"])
    i = pick(L["PRIZES"], lambda p: p["w"])
    data["coins"] += L["PRIZES"][i].get("coins", 0)
    return {"i": i}


def a_drop(st, data, d):
    if not take_item(data, d.get("id"), data["inv"].get(d.get("id"), {}).get("n", 0) or 1):
        raise EcoError("Không có món này trong rương")
    return {}


def a_reset(st, data, d):
    """Đặt lại dữ liệu (gõ YES): xu/đồ về mặc định. Giữ ngày nhận quà để không nhận thưởng 2 lần."""
    daily = data.get("daily", "")
    for k in ECO_KEYS + ("outfit",):
        data.pop(k, None)
    ensure(data)
    data["daily"] = daily
    return {}


ACTIONS = {
    "buy": a_buy, "ticket": a_ticket, "claw": a_claw, "wheel": a_wheel,
    "quizStart": a_quiz_start, "quizAns": a_quiz_ans,
    "buySeed": a_buy_seed, "plant": a_plant, "water": a_water, "harvest": a_harvest, "sellCrops": a_sell_crops,
    "buyBait": a_buy_bait, "cast": a_cast, "pull": a_pull, "sellFish": a_sell_fish,
    "buyCloth": a_buy_cloth, "adopt": a_adopt, "treat": a_treat, "buyFurn": a_buy_furn, "lotto": a_lotto,
    "drop": a_drop, "reset": a_reset,
}


def handle(st, d):
    """Xử lý 1 yêu cầu kinh tế. Trả về (ok, thông báo lỗi, kết quả)."""
    fn = ACTIONS.get(d.get("a"))
    if not fn:
        return False, "Hành động không hợp lệ", {}
    data = st["data"]
    st["out"] = []                                 # sự kiện cần server gửi đi sau giao dịch (thông báo, cập nhật bàn chơi…)
    backup = json.dumps(snapshot(data))
    try:
        return True, "", fn(st, data, d)
    except EcoError as e:
        data.update(json.loads(backup))            # lỗi giữa chừng thì hoàn tác
        return False, str(e), {}
