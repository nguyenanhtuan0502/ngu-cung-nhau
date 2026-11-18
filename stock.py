"""📈 Khu chứng khoán ảo (ver_2 mục 7.10): mô phỏng để HỌC đầu tư, không phải lời khuyên đầu tư thật.

- Mã cổ phiếu hư cấu (catalog.json → STOCK.TICKERS). Giá do server mô phỏng mỗi TICK_SEC giây:
  dao động ngẫu nhiên + xu hướng theo tin tức (gắn với thế giới game: trúng mùa, phim mới…) + kéo nhẹ về giá gốc.
- Phiên giao dịch theo giờ Việt Nam (SESSIONS, thứ Hai–thứ Sáu); ALWAYS_OPEN = true thì mở cả ngày cho dễ thử.
- Lệnh thị trường / lệnh giới hạn, phí giao dịch nhỏ, giới hạn số lệnh mỗi phút, vốn tối đa theo cấp độ.
  Không có đòn bẩy, vay ký quỹ hay bán khống.
"""
import math
import time
import uuid

import economy
import store
from economy import EcoError, RNG, vn_today

CFG = economy.CAT["STOCK"]
TICK = {t["sym"]: t for t in CFG["TICKERS"]}
SECTORS = sorted({t["sector"] for t in CFG["TICKERS"]})
_state = store.kv_get("stock") or {}
STATE = {"t": _state.get("t", {}), "news": _state.get("news", []), "trend": _state.get("trend", {}), "ticks": 0}
for _s, _t in TICK.items():                          # mã mới / lần chạy đầu
    STATE["t"].setdefault(_s, {"p": float(_t["p"]), "open": float(_t["p"]), "prev": float(_t["p"]), "hist": [], "day": vn_today()})
LEADER = {"at": 0, "rows": []}


def _vn():
    return time.gmtime(time.time() + economy.VN_OFFSET)


def is_open():
    if CFG["ALWAYS_OPEN"]:
        return True
    t = _vn()
    if t.tm_wday >= 5:
        return False
    m = t.tm_hour * 60 + t.tm_min
    return any(int(a[:2]) * 60 + int(a[3:]) <= m < int(b[:2]) * 60 + int(b[3:]) for a, b in CFG["SESSIONS"])


def tick():
    """Cập nhật giá 1 nhịp. Trả về tin tức mới (nếu có) hoặc None. Ngoài giờ giao dịch: giá đứng yên."""
    today = vn_today()
    for s in STATE["t"].values():                      # sang ngày mới: giá tham chiếu = giá đóng cửa hôm trước
        if s["day"] != today:
            s.update(prev=s["p"], open=s["p"], day=today)
    if not is_open():
        return None
    STATE["ticks"] += 1
    news = None
    for sec, tr in list(STATE["trend"].items()):     # xu hướng do tin tức nhạt dần
        tr["left"] -= 1
        if tr["left"] <= 0:
            del STATE["trend"][sec]
    if RNG.random() < 1 / 30:                          # trung bình ~2,5 phút có 1 tin
        n = RNG.choice(CFG["NEWS"])
        up = RNG.random() < .55
        STATE["trend"][n["sector"]] = {"d": (0.004 if up else -0.004), "left": 36}
        news = {"at": time.time(), "sector": n["sector"], "up": up, "text": n["up"] if up else n["down"]}
        STATE["news"] = ([news] + STATE["news"])[:12]
    for sym, s in STATE["t"].items():
        base = TICK[sym]["p"]
        drift = STATE["trend"].get(TICK[sym]["sector"], {}).get("d", 0) + (base - s["p"]) / base * 0.002
        s["p"] = round(max(1.0, s["p"] * (1 + RNG.gauss(drift, 0.007))), 2)
        s["hist"] = (s["hist"] + [s["p"]])[-120:]
    if STATE["ticks"] % 12 == 0:
        store.kv_set("stock", {k: STATE[k] for k in ("t", "news", "trend")})
    return news


def board():
    return {"open": is_open(), "news": STATE["news"][:6],      # "tk" (không dùng "t": trùng khóa loại tin nhắn)
            "tk": {sym: {"p": s["p"], "prev": s["prev"], "name": TICK[sym]["name"], "sector": TICK[sym]["sector"]}
                  for sym, s in STATE["t"].items()}}


def _port(data):
    p = data.get("stocks") if isinstance(data.get("stocks"), dict) else {}
    data["stocks"] = {k: v for k, v in p.items() if k in TICK and isinstance(v, dict) and v.get("q", 0) > 0}
    st = data.get("stkStat") if isinstance(data.get("stkStat"), dict) else {"buy": 0, "sell": 0}
    data["stkStat"] = st
    data.setdefault("orders", [])
    data.setdefault("trades", [])
    return data["stocks"], st


def holdings_value(data):
    p, _ = _port(data)
    return sum(v["q"] * STATE["t"][k]["p"] for k, v in p.items())


def _level(data):
    xp = data.get("xp", 0) if isinstance(data.get("xp"), (int, float)) else 0
    return 1 + int(math.sqrt(max(0, xp) / 25))


def cap_of(data):
    return CFG["CAP_BASE"] + CFG["CAP_PER_LV"] * _level(data)


def _fee(amount):
    return max(1, math.ceil(amount * CFG["FEE"]))


def _log(data, side, sym, q, price):
    data["trades"] = ([{"at": time.time(), "side": side, "sym": sym, "q": q, "p": price}] + data["trades"])[:30]


def buy(data, sym, q, price):
    port, st = _port(data)
    cost = math.ceil(price * q)
    invested = sum(v["cost"] for v in port.values())
    if invested + cost > cap_of(data):
        raise EcoError(f"Vốn đầu tư tối đa ở cấp hiện tại là {cap_of(data)} xu (lên cấp để mở thêm)")
    economy.pay(data, cost + _fee(cost))
    h = port.setdefault(sym, {"q": 0, "cost": 0})
    h["q"] += q
    h["cost"] += cost
    st["buy"] += cost
    _log(data, "buy", sym, q, price)


def sell(data, sym, q, price):
    port, st = _port(data)
    h = port.get(sym)
    if not h or h["q"] < q:
        raise EcoError("Bạn không có đủ cổ phiếu để bán")
    gross = math.floor(price * q)
    got = max(0, gross - _fee(gross))
    h["cost"] = round(h["cost"] * (h["q"] - q) / h["q"], 2)
    h["q"] -= q
    if h["q"] <= 0:
        del port[sym]
    data["coins"] += got
    st["sell"] += got
    _log(data, "sell", sym, q, price)
    return got


def _rate(st):
    now = time.time()
    st["stkRate"] = [x for x in st.get("stkRate", []) if now - x < 60]
    if len(st["stkRate"]) >= CFG["ORDERS_PER_MIN"]:
        raise EcoError(f"Tối đa {CFG['ORDERS_PER_MIN']} lệnh mỗi phút, chậm lại chút nhé")
    st["stkRate"].append(now)


def mine(data):
    port, st = _port(data)
    rows = [{"sym": k, "q": v["q"], "cost": v["cost"], "value": round(v["q"] * STATE["t"][k]["p"], 2)} for k, v in port.items()]
    val = sum(r["value"] for r in rows)
    pl = st["sell"] + val - st["buy"]
    return {"port": rows, "orders": data["orders"], "trades": data["trades"][:10], "cap": cap_of(data),
            "invested": round(sum(v["cost"] for v in port.values()), 2), "pl": round(pl, 1),
            "plPct": round(pl / st["buy"] * 100, 2) if st["buy"] else 0}


def a_stk_state(st, data, d):
    return {**board(), **mine(data), "leader": leaderboard(), "hist": {k: s["hist"][-60:] for k, s in STATE["t"].items()},
            "sessions": CFG["SESSIONS"], "always": CFG["ALWAYS_OPEN"], "fee": CFG["FEE"]}


def a_stk_order(st, data, d):
    if st["p"]["area"] != "stock":
        raise EcoError("Đặt lệnh ở bàn giao dịch trong 📈 Khu chứng khoán nhé")
    sym, side, q, kind = d.get("sym"), d.get("side"), d.get("q"), d.get("kind", "market")
    if sym not in TICK or side not in ("buy", "sell") or not isinstance(q, int) or not 1 <= q <= 1000:
        raise EcoError("Lệnh không hợp lệ")
    if not is_open():
        raise EcoError("Ngoài giờ giao dịch (thứ Hai–thứ Sáu 9:00–11:30, 13:00–14:45)")
    _rate(st)
    price = STATE["t"][sym]["p"]
    if kind == "limit":                                 # lệnh giới hạn: chờ giá chạm mới khớp
        lim = d.get("lim")
        if not isinstance(lim, (int, float)) or lim <= 0:
            raise EcoError("Giá giới hạn không hợp lệ")
        _port(data)
        if len(data["orders"]) >= 10:
            raise EcoError("Tối đa 10 lệnh chờ")
        data["orders"].append({"id": uuid.uuid4().hex[:6], "sym": sym, "side": side, "q": q, "lim": round(float(lim), 2)})
        return {"msg": f"Đã đặt lệnh chờ {('mua' if side == 'buy' else 'bán')} {q} {sym} giá {lim}", **mine(data)}
    if side == "buy":
        buy(data, sym, q, price)
        return {"msg": f"✅ Đã mua {q} {sym} giá {price}", **mine(data)}
    got = sell(data, sym, q, price)
    return {"msg": f"✅ Đã bán {q} {sym} giá {price}, nhận {got} xu", **mine(data)}


def a_stk_cancel(st, data, d):
    _port(data)
    data["orders"] = [o for o in data["orders"] if o["id"] != d.get("id")]
    return mine(data)


def fill_orders(data):
    """Khớp lệnh giới hạn của 1 người chơi (gọi mỗi nhịp giá). Trả về danh sách thông báo."""
    if not data.get("orders") or not is_open():
        return []
    msgs, keep = [], []
    for o in data["orders"]:
        p = STATE["t"][o["sym"]]["p"]
        hit = (o["side"] == "buy" and p <= o["lim"]) or (o["side"] == "sell" and p >= o["lim"])
        if not hit:
            keep.append(o)
            continue
        try:
            if o["side"] == "buy":
                buy(data, o["sym"], o["q"], p)
            else:
                sell(data, o["sym"], o["q"], p)
            msgs.append(f"🔔 Khớp lệnh {('mua' if o['side'] == 'buy' else 'bán')} {o['q']} {o['sym']} giá {p}")
        except EcoError as e:
            msgs.append(f"❌ Hủy lệnh {o['sym']}: {e}")
    data["orders"] = keep
    return msgs


def leaderboard():
    """Xếp hạng theo % lãi/lỗ (công bằng hơn số tiền). Tính lại mỗi phút từ dữ liệu mọi người chơi."""
    if time.time() - LEADER["at"] > 60:
        rows = []
        for uid, name, data in store.all_data():
            st = data.get("stkStat") or {}
            if st.get("buy", 0) < 50:
                continue
            val = sum(v.get("q", 0) * STATE["t"][k]["p"] for k, v in (data.get("stocks") or {}).items() if k in STATE["t"])
            pl = st.get("sell", 0) + val - st["buy"]
            rows.append({"name": name, "pct": round(pl / st["buy"] * 100, 2)})
        LEADER.update(at=time.time(), rows=sorted(rows, key=lambda r: -r["pct"])[:10])
    return LEADER["rows"]


ACTIONS = {"stkState": a_stk_state, "stkOrder": a_stk_order, "stkCancel": a_stk_cancel}
