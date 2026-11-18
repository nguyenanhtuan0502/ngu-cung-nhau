"""Bài kiểm tra: câu cá kiểu mới (cá cắn -> giật cần -> bấm liên tục để kéo cá lên).

Chạy:  python tests/test_fishing_fight.py
Quy ước (Antigravity viết code cho khớp):
- catalog.json: mỗi cá trong FISH có thêm "kg": [nhỏ nhất, lớn nhất] (số > 0, nhỏ <= lớn).
- "cast": giữ như cũ (ngồi ghế, trừ 1 mồi, trả {"wait": giây}).
- "pull" (giật cần khi cá cắn): sớm -> {"r":"early"}, trễ -> {"r":"late"} như cũ.
  Đúng lúc -> server chọn cá + cân nặng, CHƯA cho cá vào túi, trả về
  {"r":"hook", "fight": giây kéo (1.5..12), "taps": số lần bấm cần đạt (int >= 3),
   "power": độ mạnh rung 1..5 (int), "kg": cân nặng}. KHÔNG lộ tên/chỉ số cá (không có khóa "fish").
  Cá càng đắt / càng nặng thì fight, taps, power càng lớn (không nhỏ hơn).
  Đang kéo cá mà gọi "pull" nữa -> EcoError.
- "reel" {"taps": n} (kết thúc màn kéo cá): phải ở khu "fishing".
  - chưa có cá mắc câu -> EcoError
  - taps không phải số nguyên >= 0 (chuỗi, bool, số âm, số thực) -> EcoError, cá VẪN mắc câu
  - quá nhanh (chưa tới fight * 0.5 giây kể từ lúc "pull") -> {"r":"lost"}
  - quá lâu (hơn fight + 8 giây) -> {"r":"lost"}
  - taps < số cần -> {"r":"lost"}
  - thành công -> {"r":"ok", "fish": chỉ số cá trong FISH, "kg": cân nặng như lúc hook}, cá vào túi
  - sau khi xong (ok hay lost) cá không còn mắc câu: gọi "reel" lần nữa -> EcoError
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
os.chdir(ROOT)

import economy  # noqa: E402

FAILS = []
NOW = [1000000.0]                                   # đồng hồ giả để điều khiển thời gian
economy.time.time = lambda: NOW[0]
REAL_PICK = economy.pick


def check(name, cond, info=""):
    print(("  OK   " if cond else "  RỚT  ") + name + ("" if cond else f"  ->  {info}"))
    if not cond:
        FAILS.append(name)


def player(area="fishing", seat=0):
    data = economy.ensure({"coins": 1000, "bait": {"worm": 50}})
    return {"p": {"area": area, "id": "t1", "name": "Test", "bed": seat}, "data": data, "out": [], "uid": "u1"}


def eco(st, a, **params):
    return economy.handle(st, {"a": a, **params})


def fish_index(fid):
    return next(i for i, f in enumerate(economy.CAT["FISH"]) if f["id"] == fid)


def hook(st, force=None):
    """Thả câu rồi giật đúng lúc. force = id cá muốn ép server chọn."""
    economy.pick = (lambda items, w: fish_index(force)) if force else REAL_PICK
    ok, err, r = eco(st, "cast", bait="worm")
    if not ok:
        return ok, err, r
    NOW[0] += r["wait"] + 0.3
    res = eco(st, "pull")
    economy.pick = REAL_PICK
    return res


def count(st, fid):
    it = st["data"]["inv"].get("fish_" + fid)
    return it["n"] if it else 0


def run():
    print("1. Catalog có cân nặng cá")
    for f in economy.CAT["FISH"]:
        kg = f.get("kg")
        good = isinstance(kg, list) and len(kg) == 2 and all(isinstance(x, (int, float)) and x > 0 for x in kg) and kg[0] <= kg[1]
        check(f"cá {f['id']} có kg hợp lệ", good, kg)

    print("2. Giật cần đúng lúc -> cá mắc câu, chưa vào túi")
    st = player()
    ok, err, r = hook(st, "carp")
    check("pull thành công", ok and r.get("r") == "hook", (ok, err, r))
    if not (ok and r.get("r") == "hook"):
        return
    check("không lộ cá", "fish" not in r, r)
    check("fight 1.5..12 giây", isinstance(r.get("fight"), (int, float)) and 1.5 <= r["fight"] <= 12, r)
    check("taps là số nguyên >= 3", isinstance(r.get("taps"), int) and not isinstance(r["taps"], bool) and r["taps"] >= 3, r)
    check("power 1..5", isinstance(r.get("power"), int) and 1 <= r["power"] <= 5, r)
    kgr = economy.CAT["FISH"][fish_index("carp")]["kg"]
    check("kg nằm trong khoảng của cá chép", isinstance(r.get("kg"), (int, float)) and kgr[0] <= r["kg"] <= kgr[1], (r.get("kg"), kgr))
    check("cá chưa vào túi", count(st, "carp") == 0)
    ok2, _, _ = eco(st, "pull")
    check("đang kéo mà pull nữa -> lỗi", not ok2)

    print("3. Dữ liệu taps sai -> lỗi, cá vẫn mắc câu")
    NOW[0] += r["fight"]
    for bad in ["10", True, -1, 3.5, None]:
        okb, _, _ = eco(st, "reel", taps=bad)
        check(f"taps={bad!r} bị từ chối", not okb)
    ok, err, rr = eco(st, "reel", taps=r["taps"])
    check("sau dữ liệu sai vẫn kéo được cá", ok and rr.get("r") == "ok", (ok, err, rr))
    check("trả đúng cá chép", rr.get("fish") == fish_index("carp"), rr)
    check("kg giống lúc hook", rr.get("kg") == r["kg"], (rr.get("kg"), r["kg"]))
    check("cá vào túi", count(st, "carp") == 1)
    okx, _, _ = eco(st, "reel", taps=99)
    check("reel lần nữa -> lỗi", not okx)

    print("4. Chưa có cá mắc câu")
    st = player()
    ok, _, _ = eco(st, "reel", taps=10)
    check("reel khi chưa câu -> lỗi", not ok)

    print("5. Bấm không đủ")
    st = player()
    ok, _, r = hook(st, "carp")
    NOW[0] += r["fight"]
    ok, _, rr = eco(st, "reel", taps=r["taps"] - 1)
    check("thiếu 1 lần bấm -> lost", ok and rr.get("r") == "lost", rr)
    check("không có cá", count(st, "carp") == 0)
    okx, _, _ = eco(st, "reel", taps=r["taps"])
    check("cá đã chạy, reel lại -> lỗi", not okx)

    print("6. Quá nhanh (gian lận) / quá lâu")
    st = player()
    ok, _, r = hook(st, "carp")
    NOW[0] += r["fight"] * 0.3
    ok, _, rr = eco(st, "reel", taps=r["taps"])
    check("xong quá nhanh -> lost", ok and rr.get("r") == "lost", rr)
    check("không có cá", count(st, "carp") == 0)
    st = player()
    ok, _, r = hook(st, "carp")
    NOW[0] += r["fight"] + 9
    ok, _, rr = eco(st, "reel", taps=r["taps"])
    check("quá lâu -> lost", ok and rr.get("r") == "lost", rr)

    print("7. Sai khu")
    st = player()
    ok, _, r = hook(st, "carp")
    NOW[0] += r["fight"]
    st["p"]["area"] = "park"
    ok, _, _ = eco(st, "reel", taps=r["taps"])
    check("reel ngoài hồ câu -> lỗi", not ok)

    print("8. Cá quý / nặng thì khó hơn")
    st = player()
    _, _, small = hook(st, "carp")
    st = player()
    _, _, big = hook(st, "turtle")
    for k in ("fight", "taps", "power"):
        check(f"rùa vàng {k} >= cá chép", big.get(k, 0) >= small.get(k, 99), (big.get(k), small.get(k)))
    check("rùa vàng fight lâu hơn hẳn", big.get("fight", 0) > small.get("fight", 99), (big.get("fight"), small.get("fight")))
    NOW[0] += big["fight"]
    ok, _, rr = eco(st, "reel", taps=big["taps"])
    check("kéo được rùa vàng", ok and rr.get("fish") == fish_index("turtle"), rr)

    print("9. Giật sớm / trễ vẫn như cũ")
    st = player()
    ok, _, c = eco(st, "cast", bait="worm")
    ok, _, r = eco(st, "pull")
    check("giật sớm -> early", r.get("r") == "early", r)
    ok, _, c = eco(st, "cast", bait="worm")
    NOW[0] += c["wait"] + 5
    ok, _, r = eco(st, "pull")
    check("giật trễ -> late", r.get("r") == "late", r)


if __name__ == "__main__":
    try:
        run()
    except Exception as e:                          # lỗi code -> coi như rớt
        import traceback
        traceback.print_exc()
        FAILS.append("lỗi: " + repr(e))
    print()
    print("QUA HẾT ✅" if not FAILS else f"RỚT {len(FAILS)} bài ❌")
    sys.exit(1 if FAILS else 0)
