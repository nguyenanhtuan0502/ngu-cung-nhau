"""Lưu trữ lâu dài bằng SQLite (file game.db cạnh server.py).

- Tài khoản: mỗi người chơi có playerId (uid) cố định + mã bí mật. Trình duyệt chỉ giữ
  "token" = "<uid>.<mã bí mật>" trong localStorage; server chỉ lưu bản băm của mã bí mật.
- Dữ liệu nhân vật (xu, chỉ số, túi đồ, tủ đồ, nông trại…) lưu theo uid.
- Nhà riêng: danh sách nội thất lưu theo uid chủ nhà (không còn theo mã phòng).
"""
import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import time

ROOT = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.environ.get("GAME_DB", os.path.join(ROOT, "game.db"))
LEGACY_HOMES = os.path.join(ROOT, "homes.json")      # bản cũ: nhà lưu theo mã phòng

_db = sqlite3.connect(DB_FILE, check_same_thread=False)
_db.executescript("""
CREATE TABLE IF NOT EXISTS players (
    uid     TEXT PRIMARY KEY,
    secret  TEXT NOT NULL,          -- sha256 của mã bí mật
    name    TEXT NOT NULL DEFAULT '',
    data    TEXT,                   -- JSON dữ liệu nhân vật (NULL = chưa có)
    created REAL NOT NULL,
    seen    REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS homes (
    owner   TEXT PRIMARY KEY,       -- uid chủ nhà
    items   TEXT NOT NULL           -- JSON danh sách nội thất
);
CREATE TABLE IF NOT EXISTS kv (     -- dữ liệu chung: giá cổ phiếu, kết quả xổ số…
    key     TEXT PRIMARY KEY,
    val     TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS reports (  -- báo cáo người chơi (khu hẹn hò…)
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    at       REAL NOT NULL,
    reporter TEXT NOT NULL,
    target   TEXT NOT NULL,
    reason   TEXT NOT NULL
);
""")
_db.commit()

try:
    with open(LEGACY_HOMES, encoding="utf-8") as f:
        _legacy_homes = json.load(f)
except (OSError, ValueError):
    _legacy_homes = {}


def _hash(secret):
    return hashlib.sha256(secret.encode()).hexdigest()


# ---------------- Tài khoản ----------------
def create_account(name=""):
    """Tạo người chơi mới, trả về (uid, token)."""
    while True:
        uid = secrets.token_hex(5)
        if not _db.execute("SELECT 1 FROM players WHERE uid=?", (uid,)).fetchone():
            break
    secret = secrets.token_hex(16)
    now = time.time()
    _db.execute("INSERT INTO players (uid, secret, name, data, created, seen) VALUES (?,?,?,NULL,?,?)",
                (uid, _hash(secret), name, now, now))
    _db.commit()
    return uid, f"{uid}.{secret}"


def login(token):
    """Kiểm tra token, đúng thì trả về uid, sai thì None."""
    if not isinstance(token, str) or token.count(".") != 1 or len(token) > 80:
        return None
    uid, secret = token.split(".")
    row = _db.execute("SELECT secret FROM players WHERE uid=?", (uid,)).fetchone()
    if row and hmac.compare_digest(row[0], _hash(secret)):
        return uid
    return None


def touch(uid, name):
    """Cập nhật tên hiển thị và lần cuối online."""
    _db.execute("UPDATE players SET name=?, seen=? WHERE uid=?", (name, time.time(), uid))
    _db.commit()


# ---------------- Dữ liệu nhân vật ----------------
def load_data(uid):
    row = _db.execute("SELECT data FROM players WHERE uid=?", (uid,)).fetchone()
    if not row or row[0] is None:
        return None
    try:
        return json.loads(row[0])
    except ValueError:
        return None


def save_data(uid, data):
    _db.execute("UPDATE players SET data=? WHERE uid=?", (json.dumps(data, ensure_ascii=False), uid))
    _db.commit()


# ---------------- Nhà riêng ----------------
def load_home(owner, legacy_code=None):
    """Nội thất nhà của owner. Nhà chưa có mà mã phòng cũ có nhà (homes.json) thì chép sang."""
    row = _db.execute("SELECT items FROM homes WHERE owner=?", (owner,)).fetchone()
    if row:
        try:
            return json.loads(row[0])
        except ValueError:
            return []
    items = list(_legacy_homes.get(legacy_code or "", []))
    if items:
        save_home(owner, items)
    return items


def save_home(owner, items):
    _db.execute("INSERT INTO homes (owner, items) VALUES (?, ?) "
                "ON CONFLICT(owner) DO UPDATE SET items=excluded.items",
                (owner, json.dumps(items, ensure_ascii=False)))
    _db.commit()


# ---------------- Dữ liệu chung (key-value) ----------------
def kv_get(key, default=None):
    row = _db.execute("SELECT val FROM kv WHERE key=?", (key,)).fetchone()
    if not row:
        return default
    try:
        return json.loads(row[0])
    except ValueError:
        return default


def kv_set(key, val):
    _db.execute("INSERT INTO kv (key, val) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET val=excluded.val",
                (key, json.dumps(val, ensure_ascii=False)))
    _db.commit()


def all_data():
    """Duyệt dữ liệu mọi người chơi: (uid, tên, dữ liệu) — dùng cho bảng xếp hạng."""
    for uid, name, data in _db.execute("SELECT uid, name, data FROM players WHERE data IS NOT NULL"):
        try:
            yield uid, name, json.loads(data)
        except ValueError:
            continue


def player_name(uid):
    row = _db.execute("SELECT name FROM players WHERE uid=?", (uid,)).fetchone()
    return row[0] if row else ""


def add_report(reporter, target, reason):
    _db.execute("INSERT INTO reports (at, reporter, target, reason) VALUES (?,?,?,?)",
                (time.time(), reporter, target, reason[:200]))
    _db.commit()
