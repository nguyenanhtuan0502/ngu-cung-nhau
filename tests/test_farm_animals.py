"""Bài kiểm tra: nuôi gà / bò ở nông trại (cho ăn -> chờ -> thu trứng/sữa -> bán), mua thêm con.

Chạy:  python tests/test_farm_animals.py
Quy ước (Antigravity viết code cho khớp):
- catalog.json có "ANIMALS": {
    "chicken": {"name","e","start":2,"max":8,"prices":[...6 giá tăng dần],"feed":<xu/lần>,"time":<giây>,
                "product":{"id":"egg","e":"🥚","name":"Trứng gà","sell":<xu>}},
    "cow":     {... "start":1,"max":4,"prices":[...3 giá tăng dần], product id "milk" ...}}
  (len(prices) == max - start)
- data["animals"] = {"chicken": [{"f": <lúc cho ăn, 0 = đói>}, ...], "cow": [...]}; nằm trong economy.ECO_KEYS.
  economy.ensure() sửa dữ liệu sai: số con kẹp trong [start, max], mỗi con là {"f": số >= 0} (sai -> 0).
- Hành động eco (đều phải đứng ở khu "farm"):
  feedAnimal {k, i}   : con đang đói -> trả xu "feed", f = bây giờ; con đang no -> lỗi. -> {"k","i"}
  collectAnimal {k, i}: đã cho ăn và đủ "time" giây -> +1 sản phẩm vào túi id "prod_<product id>",
                        cat "prod"; con đó đói lại (f = 0). Chưa đủ giờ / chưa cho ăn -> lỗi. -> {"k","i","item","n":1}
  feedAll {}          : cho ăn MỌI con đang đói (mọi loài), trả tổng tiền 1 lần; thiếu xu thì không cho con nào ăn;
                        không con nào đói -> lỗi. -> {"n": số con, "price": tổng xu}
  collectAll {}       : thu mọi con đã sẵn sàng; không con nào sẵn sàng -> lỗi. -> {"n": tổng số sản phẩm}
  buyAnimal {k}       : giá = prices[số con hiện có - start], thêm 1 con đói; đủ max -> lỗi. -> {"k","count","price"}
- sellCrops bán CẢ nông sản (crop_) lẫn trứng/sữa (prod_) theo giá catalog, trả {"total"}.
"""
import copy
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
os.chdir(ROOT)

import economy  # noqa: E402

FAILS = []
NOW = [1_800_000_000.0]
economy.time.time = lambda: NOW[0]               # đồng hồ giả để thử "chờ đủ giờ"


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
    A = economy.CAT.get("ANIMALS")
    print("1. Cấu hình catalog")
    check("catalog có ANIMALS gồm chicken và cow", isinstance(A, dict) and "chicken" in A and "cow" in A, A)
    if not (isinstance(A, dict) and "chicken" in A and "cow" in A):
        return
    for k, a in A.items():
        ok = all(isinstance(a.get(f), int) and a.get(f) > 0 for f in ("start", "max", "feed", "time")) and \
            isinstance(a.get("prices"), list) and len(a["prices"]) == a["max"] - a["start"] and \
            all(x < y for x, y in zip(a["prices"], a["prices"][1:])) and \
            isinstance(a.get("product"), dict) and a["product"].get("sell", 0) > 0 and a["product"].get("id")
        check(f"{k}: start/max/feed/time/prices tăng dần/product hợp lệ", ok, a)
    C, W = A["chicken"], A["cow"]
    egg, milk = "prod_" + C["product"]["id"], "prod_" + W["product"]["id"]
    check("animals nằm trong ECO_KEYS", "animals" in economy.ECO_KEYS)

    print("2. Tài khoản mới / dữ liệu sai")
    d = economy.ensure({})
    check("tài khoản mới có đúng start con, con nào cũng đói",
          len(d["animals"]["chicken"]) == C["start"] and len(d["animals"]["cow"]) == W["start"] and
          all(x == {"f": 0} for x in d["animals"]["chicken"] + d["animals"]["cow"]), d.get("animals"))
    for bad in ("abc", None, [], {"chicken": "x"}, {"chicken": [1, None, {"f": "a"}, {"f": -5}]}):
        dd = economy.ensure({"animals": bad})
        ok = len(dd["animals"]["chicken"]) >= C["start"] and len(dd["animals"]["cow"]) == W["start"] and \
            all(isinstance(x, dict) and isinstance(x.get("f"), (int, float)) and x["f"] >= 0
                for x in dd["animals"]["chicken"] + dd["animals"]["cow"])
        check(f"animals={bad!r} được sửa lại", ok, dd.get("animals"))
    dd = economy.ensure({"animals": {"chicken": [{"f": 0}] * 50, "cow": []}})
    check("quá max bị cắt, thiếu start được bù",
          len(dd["animals"]["chicken"]) == C["max"] and len(dd["animals"]["cow"]) == W["start"], dd["animals"])
    dd = economy.ensure({"animals": {"chicken": [{"f": 123.0}, {"f": 0}, {"f": 0}], "cow": [{"f": 0}]}})
    check("giữ nguyên con đã cho ăn và số con hợp lệ",
          dd["animals"]["chicken"][0]["f"] == 123.0 and len(dd["animals"]["chicken"]) == 3, dd["animals"])

    print("3. Cho ăn")
    st = player(coins=1000)
    ok, msg, res = eco(st, "feedAnimal", k="chicken", i=0)
    check("cho gà ăn được", ok and res.get("k") == "chicken" and res.get("i") == 0, (ok, msg, res))
    check("trừ đúng tiền thức ăn", st["data"]["coins"] == 1000 - C["feed"], st["data"]["coins"])
    check("ghi lúc cho ăn", st["data"]["animals"]["chicken"][0]["f"] == NOW[0], st["data"]["animals"])
    ok, msg, _ = eco(st, "feedAnimal", k="chicken", i=0)
    check("con đang no thì không cho ăn nữa (không trừ xu)", not ok and st["data"]["coins"] == 1000 - C["feed"], msg)
    for k, i in (("pig", 0), ("chicken", 99), ("chicken", -1), ("chicken", "0"), (None, 0)):
        ok, msg, _ = eco(st, "feedAnimal", k=k, i=i)
        check(f"dữ liệu sai k={k!r} i={i!r} bị từ chối", not ok, msg)
    st2 = player(coins=C["feed"] - 1)
    ok, msg, _ = eco(st2, "feedAnimal", k="chicken", i=0)
    check("thiếu xu thì không cho ăn được, con vẫn đói",
          not ok and st2["data"]["animals"]["chicken"][0]["f"] == 0 and st2["data"]["coins"] == C["feed"] - 1, msg)

    print("4. Thu trứng / sữa")
    ok, msg, _ = eco(st, "collectAnimal", k="chicken", i=1)
    check("con chưa cho ăn thì không thu được", not ok, msg)
    NOW[0] += C["time"] - 10
    ok, msg, _ = eco(st, "collectAnimal", k="chicken", i=0)
    check("chưa đủ giờ thì không thu được", not ok and egg not in st["data"]["inv"], msg)
    NOW[0] += 10
    ok, msg, res = eco(st, "collectAnimal", k="chicken", i=0)
    check("đủ giờ thì thu được 1 trứng", ok and st["data"]["inv"].get(egg, {}).get("n") == 1, (ok, msg, res))
    check("trứng có cat prod", st["data"]["inv"].get(egg, {}).get("cat") == "prod", st["data"]["inv"].get(egg))
    check("trả về item và n", res.get("item") == egg and res.get("n") == 1, res)
    check("thu xong con đó đói lại", st["data"]["animals"]["chicken"][0]["f"] == 0, st["data"]["animals"])
    ok, msg, _ = eco(st, "collectAnimal", k="chicken", i=0)
    check("không thu 2 lần", not ok and st["data"]["inv"][egg]["n"] == 1, msg)
    eco(st, "feedAnimal", k="cow", i=0)
    NOW[0] += W["time"]
    ok, msg, _ = eco(st, "collectAnimal", k="cow", i=0)
    check("bò cho sữa", ok and st["data"]["inv"].get(milk, {}).get("n") == 1, (ok, msg))

    print("5. Cho ăn tất cả / thu tất cả")
    st = player(coins=100000)
    n_all = C["start"] + W["start"]
    ok, msg, res = eco(st, "feedAll")
    want = C["start"] * C["feed"] + W["start"] * W["feed"]
    check("cho ăn tất cả: đúng số con và tổng tiền", ok and res == {"n": n_all, "price": want} and
          st["data"]["coins"] == 100000 - want, (ok, msg, res))
    ok, msg, _ = eco(st, "feedAll")
    check("không con nào đói thì báo lỗi", not ok, msg)
    ok, msg, _ = eco(st, "collectAll")
    check("chưa con nào sẵn sàng thì báo lỗi", not ok, msg)
    NOW[0] += max(C["time"], W["time"])
    ok, msg, res = eco(st, "collectAll")
    check("thu tất cả: đúng số sản phẩm", ok and res.get("n") == n_all and
          st["data"]["inv"][egg]["n"] == C["start"] and st["data"]["inv"][milk]["n"] == W["start"], (ok, msg, res))
    st = player(coins=want - 1)
    before = copy.deepcopy(st["data"]["animals"])
    ok, msg, _ = eco(st, "feedAll")
    check("cho ăn tất cả mà thiếu xu: không con nào được ăn, không mất xu",
          not ok and st["data"]["animals"] == before and st["data"]["coins"] == want - 1, msg)

    print("6. Mua thêm gà / bò")
    st = player(coins=10 ** 7)
    ok, msg, res = eco(st, "buyAnimal", k="chicken")
    check("mua gà đầu tiên đúng giá", ok and res == {"k": "chicken", "count": C["start"] + 1, "price": C["prices"][0]} and
          st["data"]["coins"] == 10 ** 7 - C["prices"][0], (ok, msg, res))
    check("con mới đang đói", st["data"]["animals"]["chicken"][-1] == {"f": 0}, st["data"]["animals"])
    ok, msg, res = eco(st, "buyAnimal", k="chicken")
    check("con thứ hai đắt hơn", ok and res.get("price") == C["prices"][1], res)
    for _ in range(20):
        eco(st, "buyAnimal", k="chicken")
    check("mua tới max là dừng", len(st["data"]["animals"]["chicken"]) == C["max"], len(st["data"]["animals"]["chicken"]))
    coins = st["data"]["coins"]
    ok, msg, _ = eco(st, "buyAnimal", k="chicken")
    check("đủ max thì báo lỗi, không trừ xu", not ok and st["data"]["coins"] == coins, msg)
    check("tổng tiền mua hết gà = tổng prices", 10 ** 7 - coins == sum(C["prices"]), 10 ** 7 - coins)
    ok, msg, res = eco(st, "buyAnimal", k="cow", price=1, count=99)
    check("mua bò: bỏ qua tham số lạ, đúng giá", ok and res.get("price") == W["prices"][0], (ok, msg, res))
    ok, msg, _ = eco(st, "buyAnimal", k="pig")
    check("loài không có thì bị từ chối", not ok, msg)
    st = player(coins=C["prices"][0] - 1)
    ok, msg, _ = eco(st, "buyAnimal", k="chicken")
    check("thiếu xu thì không mua được", not ok and len(st["data"]["animals"]["chicken"]) == C["start"], msg)

    print("7. Sai khu")
    for a, p in (("feedAnimal", {"k": "chicken", "i": 0}), ("collectAnimal", {"k": "chicken", "i": 0}),
                 ("feedAll", {}), ("collectAll", {}), ("buyAnimal", {"k": "chicken"})):
        st = player(area="park")
        ok, msg, _ = eco(st, a, **p)
        check(f"{a} ở công viên bị từ chối", not ok and st["data"]["coins"] == 100000, msg)

    print("8. Bán trứng / sữa ở kho")
    st = player(coins=0)
    economy.add_item(st["data"], egg, "🥚", "Trứng", "prod", 3)
    ok, msg, res = eco(st, "sellCrops")
    check("chỉ có trứng cũng bán được", ok and res.get("total") == 3 * C["product"]["sell"] and egg not in st["data"]["inv"],
          (ok, msg, res))
    crop = economy.CAT["CROPS"][0]
    economy.add_item(st["data"], milk, "🥛", "Sữa", "prod", 2)
    economy.add_item(st["data"], "crop_" + crop["id"], crop["e"], crop["name"], "crop", 1)
    ok, msg, res = eco(st, "sellCrops")
    check("bán chung nông sản + sữa đúng tổng", ok and res.get("total") == 2 * W["product"]["sell"] + crop["sell"],
          (ok, msg, res))
    ok, msg, _ = eco(st, "sellCrops")
    check("kho trống thì báo lỗi", not ok, msg)
    snap = economy.snapshot(player()["data"])
    check("snapshot gửi về máy có animals", isinstance(snap.get("animals"), dict), snap.get("animals"))


if __name__ == "__main__":
    run()
    print()
    print("TẤT CẢ ĐỀU QUA ✅" if not FAILS else f"RỚT {len(FAILS)} BÀI ❌")
    sys.exit(1 if FAILS else 0)
