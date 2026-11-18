"""Tiệm Làm Tóc (V6): mua kiểu tóc (mở khoá vĩnh viễn) + nhuộm màu (trả phí mỗi lần đổi).

- Giá, kiểu tóc, màu nhuộm đọc từ salon/hair_catalog.json (KHÔNG viết cứng trong code).
- Thử tóc chạy hoàn toàn ở trình duyệt, chỉ gọi server khi bấm "Chốt kiểu này" (hành động eco "salonApply").
- Server kiểm tra: kiểu tóc + màu có trong catalog (không nhận màu tuỳ ý), đủ xu, đang ở tiệm, tiệm đang mở cửa.
  Cả giao dịch (trừ xu + mở khoá + đổi tóc) nằm trong 1 lần economy.handle: lỗi giữa chừng thì hoàn tác hết.
- Kiểu tóc đã mua lưu ở data["hairs"]; data["salonFree"] = còn lượt làm tóc lần đầu miễn phí
  (kiểu bậc C hoặc kiểu đã có + màu cơ bản).
"""
import json
import os
import time

import economy
from economy import EcoError

ROOT = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(ROOT, "salon", "hair_catalog.json"), encoding="utf-8") as _f:
    CFG = json.load(_f)
economy.CAT["SALON"] = CFG                       # trình duyệt nhận qua /static/catalog.js (CATALOG.SALON)

STYLES = {h["id"]: h for h in CFG["hairstyles"]}
DYES = {d["id"]: d for d in CFG["dyes"]}
DEFAULT = CFG["default"]                         # kiểu + màu ai cũng có sẵn
# Tóc của bản cũ (bán ở khu mua sắm) → kiểu/màu gần nhất trong hệ mới
OLD_HAIR = {"hair_short": "short", "hair_long": "long", "hair_bun": "twinbun", "hair_spiky": "spiky"}
OLD_COLOR = {"hc_brown": "naudam", "hc_black": "den", "hc_blonde": "vang", "hc_pink": "hong",
             "hc_blue": "xanh", "hc_silver": "bac"}


def closed():
    """Đóng cửa 00:00–00:05 giờ Việt Nam (lúc reset ngày)."""
    m = int((time.time() + economy.VN_OFFSET) % 86400 // 60)
    return m < 5


def migrate(data):
    """Chuyển tóc bản cũ sang hệ mới, chuẩn hoá data["hairs"] / data["salonFree"]. Gọi từ economy.ensure."""
    hairs = data.get("hairs") if isinstance(data.get("hairs"), list) else []
    owned = data.get("owned") if isinstance(data.get("owned"), dict) else {}
    for old, new in OLD_HAIR.items():                # tóc cũ đã mua vĩnh viễn → giữ quyền sở hữu
        if owned.get(old) == 0:
            hairs.append(new)
    data["hairs"] = sorted({h for h in hairs if h in STYLES})
    if not isinstance(data.get("salonFree"), bool):
        data["salonFree"] = True
    o = data.get("outfit")
    if isinstance(o, dict):
        if o.get("hair") in OLD_HAIR:
            o["hair"] = OLD_HAIR[o["hair"]]
            if o["hair"] not in data["hairs"] and o["hair"] != DEFAULT["hair"]:
                data["hairs"].append(o["hair"])      # đang để kiểu cũ (vd tóc thuê) thì vẫn giữ được kiểu đó
        if o.get("hairColor") in OLD_COLOR:
            o["hairColor"] = OLD_COLOR[o["hairColor"]]


def owns(data, hid):
    return hid == DEFAULT["hair"] or hid in data.get("hairs", [])


def valid_hair(data, want, cur):
    """Kiểu tóc người chơi chọn trong tủ đồ: chỉ nhận kiểu đã có. Màu tóc giữ nguyên màu đang nhuộm."""
    cur = cur if isinstance(cur, dict) else {}
    hair = want if want in STYLES and owns(data, want) else cur.get("hair")
    if hair not in STYLES or not owns(data, hair):
        hair = DEFAULT["hair"]
    color = cur.get("hairColor") if cur.get("hairColor") in DYES else DEFAULT["hairColor"]
    return hair, color


def price_of(data, hid, did):
    """(tổng giá, giá kiểu, giá nhuộm, có dùng lượt miễn phí không) — trình duyệt tính y hệt để hiện giá."""
    cur = data.get("outfit") or {}
    sp = 0 if owns(data, hid) else STYLES[hid]["price"]
    dp = 0 if did == cur.get("hairColor") else DYES[did]["price"]
    free = (data.get("salonFree") and (sp or dp)
            and (owns(data, hid) or STYLES[hid]["tier"] == "C")
            and (dp == 0 or DYES[did]["group"] == "co_ban"))
    return (0 if free else sp + dp), sp, dp, bool(free)


def a_salon_apply(st, data, d):
    if st["p"]["area"] != "salon":
        raise EcoError("Ghé 💇 Tiệm Làm Tóc (mở 🗺️ bản đồ) để làm tóc nhé")
    if closed():
        raise EcoError("Tiệm đang đóng cửa đổi ngày (00:00–00:05), quay lại sau ít phút nhé")
    hid, did = d.get("hair"), d.get("color")
    if hid not in STYLES:
        raise EcoError("Không có kiểu tóc này")
    if did not in DYES:                              # chỉ nhận màu trong bảng nhuộm của tiệm
        raise EcoError("Màu nhuộm không hợp lệ")
    cur = data.get("outfit") or {}
    if hid == cur.get("hair") and did == cur.get("hairColor"):
        raise EcoError("Đây đúng là kiểu tóc bạn đang để rồi")
    total, sp, dp, free = price_of(data, hid, did)
    economy.pay(data, total)                         # thiếu xu thì báo lỗi, chưa đổi gì cả
    if free:
        data["salonFree"] = False
    if sp or not owns(data, hid):
        data["hairs"] = sorted(set(data["hairs"]) | {hid})
    outfit = dict(cur, hair=hid, hairColor=did)
    data["outfit"] = outfit
    st["p"]["outfit"] = outfit                       # cả khu thấy tóc mới ngay
    st["out"].append(("room", {"t": "outfit", "id": st["p"]["id"], "outfit": outfit}))
    return {"outfit": outfit, "paid": total, "free": free, "unlocked": bool(sp)}


ACTIONS = {"salonApply": a_salon_apply}
economy.ENSURE_HOOKS.append(migrate)
economy.HAIR = valid_hair
