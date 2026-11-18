"""Công cụ thử nghiệm: bơm xu (và mở hết đất) cho 1 tài khoản trong game.db TRÊN MÁY.

Chỉ dùng khi chơi thử ở máy mình (python dev.py). Không chạy trên server thật.

Cách dùng (ĐÓNG tab game trước, chạy xong mở lại):
    python tools/admin.py                 -> liệt kê tài khoản
    python tools/admin.py "Tên"           -> tài khoản tên đó (mới nhất) được 999999 xu + mở hết đất
    python tools/admin.py "Tên" 50000     -> đặt số xu = 50000
"""
import json
import os
import sqlite3
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB = os.environ.get("GAME_DB", os.path.join(ROOT, "game.db"))

if os.environ.get("RENDER"):                       # Render tự đặt biến này: không cho chạy trên server thật
    sys.exit("Không chạy công cụ này trên server thật.")
if not os.path.exists(DB):
    sys.exit(f"Không thấy {DB}. Chạy game (run.bat) và vào game 1 lần trước đã.")

db = sqlite3.connect(DB)
rows = db.execute("SELECT uid, name, data, seen FROM players ORDER BY seen DESC").fetchall()

if len(sys.argv) < 2:                              # không có tên: liệt kê tài khoản
    print("Tài khoản (mới chơi gần nhất ở trên):")
    for uid, name, data, _ in rows[:30]:
        coins = (json.loads(data) if data else {}).get("coins", "?")
        print(f"  {name or '(chưa đặt tên)':<16} uid={uid}  xu={coins}")
    sys.exit(0)

name = sys.argv[1]
coins = int(sys.argv[2]) if len(sys.argv) > 2 else 999999
match = [r for r in rows if r[1] == name or r[0] == name]
if not match:
    sys.exit(f"Không có tài khoản tên '{name}'. Chạy 'python tools/admin.py' để xem danh sách.")
uid, name, data, _ = match[0]                      # trùng tên thì lấy tài khoản chơi gần nhất

d = json.loads(data) if data else {}
d["coins"] = coins
with open(os.path.join(ROOT, "catalog.json"), encoding="utf-8") as f:
    land = json.load(f).get("FARM_LAND")
if land:                                           # mở hết đất nông trại
    full = land["start"] + len(land["prices"])
    farm = d.get("farm") if isinstance(d.get("farm"), list) else []
    d["land"], d["farm"] = full, (farm + [None] * full)[:full]
db.execute("UPDATE players SET data=? WHERE uid=?", (json.dumps(d, ensure_ascii=False), uid))
db.commit()
print(f"Xong: {name} (uid={uid}) có {coins} xu" + (f", {d['land']} ô đất" if land else "") + ". Mở lại game là thấy.")
