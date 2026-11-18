"""Bài kiểm tra: mua thêm đất nông trại (mở rộng ruộng, ô sau đắt hơn ô trước).

Chạy:  python tests/test_farm_land.py
Quy ước (Antigravity viết code cho khớp):
- catalog.json có "FARM_LAND": {"start": <bằng FARM_PLOTS>, "prices": [giá ô thứ start+1, start+2, ...]} (tăng dần)
- data["land"] = số ô ruộng đang có (int, từ start tới start + len(prices)); nằm trong economy.ECO_KEYS
- economy.ensure() sửa "land" sai kiểu/ngoài khoảng, và làm cho len(data["farm"]) == data["land"]
- hành động eco "buyLand": phải đứng ở khu "farm", trả tiền theo prices[land - start], land += 1,
  thêm 1 ô trống vào cuối data["farm"], trả về {"land": <số ô mới>, "price": <giá đã trả>}
"""
import copy
import os
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
os.chdir(ROOT)

import economy  # noqa: E402

FAILS = []


def check(name, cond, info=""):
    print(("  OK   " if cond else "  RỚT  ") + name + ("" if cond else f"  ->  {info}"))
    if not cond:
        FAILS.append(name)


def player(area="farm", coins=100000, **extra):
    data = economy.ensure({"coins": coins, **extra})
    return {"p": {"area": area, "id": "t1", "name": "Test"}, "data": data, "out": [], "uid": "u1"}


def eco(st, a, **params):
    return economy.handle(st, {"a": a, **params})


def run():
    cat = economy.CAT.get("FARM_LAND")
    print("1. Cấu hình catalog")
    check("catalog có FARM_LAND", isinstance(cat, dict), cat)
    if not isinstance(cat, dict):
        return
    START, PRICES = cat.get("start"), cat.get("prices")
    check("start bằng FARM_PLOTS", START == economy.CAT["FARM_PLOTS"], START)
    check("prices là danh sách số nguyên > 0", isinstance(PRICES, list) and PRICES and
          all(isinstance(p, int) and p > 0 for p in PRICES), PRICES)
    check("giá tăng dần (ô sau đắt hơn ô trước)", all(a < b for a, b in zip(PRICES, PRICES[1:])), PRICES)
    MAX = START + len(PRICES)
    check("land nằm trong ECO_KEYS (để hoàn tác khi lỗi + gửi về máy)", "land" in economy.ECO_KEYS)

    print("2. Tài khoản mới / dữ liệu cũ")
    d = economy.ensure({})
    check("tài khoản mới có land = start", d.get("land") == START, d.get("land"))
    check("tài khoản mới có đúng start ô ruộng", len(d["farm"]) == START, len(d["farm"]))
    old = economy.ensure({"coins": 50, "farm": [{"c": "carrot", "p": time.time(), "w": 0}] + [None] * 7})
    check("dữ liệu cũ (không có land) giữ nguyên cây đã trồng", old["farm"][0] and old["farm"][0]["c"] == "carrot")
    check("dữ liệu cũ có land = start", old.get("land") == START, old.get("land"))

    print("3. Dữ liệu sai bị sửa lại")
    for bad, want in [("abc", START), (-5, START), (None, START), (True, START), (8.5, START),
                      (MAX + 50, MAX), (START - 3, START)]:
        dd = economy.ensure({"land": bad})
        check(f"land={bad!r} -> {want}", dd.get("land") == want and len(dd["farm"]) == want,
              (dd.get("land"), len(dd["farm"])))
    dd = economy.ensure({"land": START + 2, "farm": [None] * START})
    check("land lớn hơn số ô -> thêm ô trống cho đủ", len(dd["farm"]) == START + 2, len(dd["farm"]))
    dd = economy.ensure({"land": START + 1, "farm": [None] * (START + 5)})
    check("ruộng dài hơn land -> cắt bớt cho bằng land", len(dd["farm"]) == START + 1, len(dd["farm"]))

    print("4. Mua đất thành công, giá tăng dần")
    st = player(coins=100000)
    st["data"]["farm"][0] = {"c": "carrot", "p": time.time(), "w": 0}
    ok, msg, res = eco(st, "buyLand")
    check("mua ô đầu tiên được", ok, msg)
    check("trừ đúng giá ô đầu", st["data"]["coins"] == 100000 - PRICES[0], st["data"]["coins"])
    check("land tăng 1", st["data"]["land"] == START + 1, st["data"]["land"])
    check("ruộng có thêm 1 ô trống", len(st["data"]["farm"]) == START + 1 and st["data"]["farm"][-1] is None,
          st["data"]["farm"])
    check("trả về land và price", res == {"land": START + 1, "price": PRICES[0]}, res)
    check("cây cũ vẫn còn", st["data"]["farm"][0] and st["data"]["farm"][0]["c"] == "carrot")
    ok, msg, res = eco(st, "buyLand")
    check("ô thứ hai đắt hơn ô đầu", ok and res.get("price") == PRICES[1], (ok, msg, res))
    check("tổng tiền đã trừ đúng", st["data"]["coins"] == 100000 - PRICES[0] - PRICES[1], st["data"]["coins"])

    print("5. Trồng cây trên ô mới mua")
    st2 = player(coins=100000)
    ok, msg, _ = eco(st2, "plant", i=START, c="carrot")
    check("chưa mua thì không trồng được ô mới", not ok, msg)
    eco(st2, "buyLand")
    ok, msg, _ = eco(st2, "plant", i=START, c="carrot")
    check("mua rồi thì trồng được ô mới", ok, msg)

    print("6. Thiếu xu")
    st = player(coins=PRICES[0] - 1)
    before = copy.deepcopy(st["data"])
    ok, msg, _ = eco(st, "buyLand")
    check("thiếu xu thì bị từ chối", not ok and msg, (ok, msg))
    check("thiếu xu: không mất xu, không thêm đất", st["data"]["coins"] == before["coins"] and
          st["data"]["land"] == START and len(st["data"]["farm"]) == START, st["data"])
    st = player(coins=PRICES[0])
    ok, msg, _ = eco(st, "buyLand")
    check("vừa đủ xu thì mua được, còn 0 xu", ok and st["data"]["coins"] == 0, (ok, msg, st["data"]["coins"]))

    print("7. Sai khu")
    for area in ("park", "home", "fishing"):
        st = player(area=area)
        ok, msg, _ = eco(st, "buyLand")
        check(f"đứng ở {area} thì không mua được", not ok and st["data"]["land"] == START, (ok, msg))

    print("8. Đã mở hết đất")
    st = player(coins=10 ** 9)
    for _ in range(len(PRICES)):
        eco(st, "buyLand")
    check("mua hết được tới tối đa", st["data"]["land"] == MAX and len(st["data"]["farm"]) == MAX, st["data"]["land"])
    coins = st["data"]["coins"]
    ok, msg, _ = eco(st, "buyLand")
    check("hết đất thì bị từ chối, không trừ xu", not ok and st["data"]["coins"] == coins and st["data"]["land"] == MAX,
          (ok, msg))
    check("tổng giá mở hết = tổng prices", 10 ** 9 - coins == sum(PRICES), 10 ** 9 - coins)

    print("9. Máy khách không tự đặt được số đất / giá")
    st = player(coins=100000)
    ok, msg, res = eco(st, "buyLand", land=MAX, price=1, i=99)
    check("tham số lạ bị bỏ qua: vẫn chỉ +1 ô, trả đúng giá", ok and st["data"]["land"] == START + 1 and
          st["data"]["coins"] == 100000 - PRICES[0], (ok, msg, st["data"]["land"], st["data"]["coins"]))
    snap = economy.snapshot(st["data"])
    check("snapshot gửi về máy có land", snap.get("land") == START + 1, snap.get("land"))


if __name__ == "__main__":
    run()
    print()
    print("TẤT CẢ ĐỀU QUA ✅" if not FAILS else f"RỚT {len(FAILS)} BÀI ❌")
    sys.exit(1 if FAILS else 0)
