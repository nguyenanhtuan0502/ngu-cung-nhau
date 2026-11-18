"""💞 Khu hẹn hò (ver_2 mục 7.11) — AN TOÀN TRƯỚC:
- Người chơi tự xác nhận độ tuổi 1 lần; dưới 16 tuổi KHÔNG vào được khu này.
- Chỉ ghép đôi trong cùng nhóm tuổi (16–17 với nhau, 18+ với nhau).
- Che thông tin cá nhân (số điện thoại, email, link, tài khoản mạng xã hội) trong hồ sơ và chat của khu.
- Mọi thẻ có nút Chặn + Báo cáo (lưu vào bảng reports). Tắt chế độ hẹn hò / ẩn hồ sơ bất kỳ lúc nào.
- Không chuyển xu qua quan hệ: chỉ tặng hoa / thả đèn (có giới hạn mỗi ngày).
"""
import re
import time

import economy
import store
from economy import EcoError, add_item, pay, vn_today

CFG = economy.CAT["DATING"]
SESSIONS = {}                       # server.py gán = SESSIONS của server lúc khởi động
FILTER = lambda s: s                # server.py gán = filter_chat (lọc từ cấm)
AGES = ("u16", "16", "18")

PII = re.compile(
    r"(\+?\d[\d\s.\-]{6,}\d)"                                   # số điện thoại / số dài
    r"|([\w.+-]+@[\w-]+\.[\w.]+)"                               # email
    r"|(https?://\S+|www\.\S+|\b[\w-]+\.(?:com|vn|net|org|me|io)\b\S*)"   # link
    r"|(@\w{3,})"                                               # @tên tài khoản
    r"|\b(zalo|facebook|fb|insta(?:gram)?|tiktok|telegram|messenger|sdt|sđt)\b[\s:.]*\S*", re.I)


def mask(text):
    """Che thông tin cá nhân + lọc từ cấm."""
    return FILTER(PII.sub("***", str(text)))


def age_group(data):
    return data.get("age") if data.get("age") in AGES else None


def can_enter(data):
    """None = vào được; chuỗi = lý do không vào được (dùng ở server khi chuyển khu)."""
    a = age_group(data)
    if a is None:
        return "need_age"
    if a == "u16":
        return f"💞 Khu hẹn hò dành cho người từ {CFG['MIN_AGE']} tuổi trở lên"
    return None


def _prof(data):
    p = data.get("dprof") if isinstance(data.get("dprof"), dict) else {}
    p.setdefault("on", False); p.setdefault("bio", ""); p.setdefault("hob", []); p.setdefault("hide", False)
    data["dprof"] = p
    data.setdefault("likes", [])
    data.setdefault("blocked", [])
    return p


def _online(uid):
    for s in list(SESSIONS.values()):
        if s.get("uid") == uid and s.get("data") is not None:
            return s
    return None


def _data_of(uid):
    """Dữ liệu của người khác: đang online thì lấy bản trong bộ nhớ, không thì đọc database."""
    s = _online(uid)
    return (s["data"], s) if s else (store.load_data(uid), None)


def _save_other(uid, data, sess):
    if not sess:
        store.save_data(uid, data)


def _need_dating(st):
    if st["p"]["area"] != "dating":
        raise EcoError("Ở 💞 Khu hẹn hò mới làm được việc này")


def a_set_age(st, data, d):
    if age_group(data):
        raise EcoError("Bạn đã xác nhận độ tuổi rồi")
    a = d.get("age")
    if a not in AGES:
        raise EcoError("Chọn nhóm tuổi nhé")
    data["age"] = a
    return {"age": a}


def a_prof(st, data, d):
    p = _prof(data)
    if "on" in d:
        p["on"] = bool(d["on"])
    if "hide" in d:
        p["hide"] = bool(d["hide"])
    if "bio" in d:
        p["bio"] = mask(str(d["bio"] or "").replace("\n", " "))[:CFG["BIO_MAX"]]
    if isinstance(d.get("hob"), list):
        p["hob"] = [h for h in d["hob"] if h in CFG["HOBBIES"]][:5]
    st["out"].append(("pinfo",))
    return {"prof": p}


def card(uid, name, data, me_data, sess=None):
    p = _prof(data)
    m = data.get("match") or {}
    return {"uid": uid, "name": name, "bio": p["bio"], "hob": p["hob"], "outfit": data.get("outfit", {}),
            "color": sess["p"]["color"] if sess else "#9b8cff", "liked": uid in me_data.get("likes", []),
            "taken": bool(m) and not p["hide"]}


def a_browse(st, data, d):
    _need_dating(st)
    me = _prof(data)
    grp = age_group(data)
    out = []
    for s in list(SESSIONS.values()):
        od = s.get("data")
        if not od or s["uid"] == st["uid"] or s.get("room") is None:
            continue
        op = _prof(od)
        if not op["on"] or age_group(od) != grp:                          # chỉ cùng nhóm tuổi, đã bật chế độ hẹn hò
            continue
        if s["uid"] in data["blocked"] or st["uid"] in od["blocked"]:       # chặn 2 chiều
            continue
        out.append(card(s["uid"], s["p"]["name"], od, data, s))
    return {"cards": out[:30], "prof": me, "age": grp, "match": data.get("match"), "hobbies": CFG["HOBBIES"]}


def _check_target(st, data, uid):
    if not isinstance(uid, str) or uid == st["uid"]:
        raise EcoError("Người này không hợp lệ")
    od, sess = _data_of(uid)
    if not od or age_group(od) != age_group(data) or not _prof(od)["on"]:
        raise EcoError("Người này hiện không tham gia hẹn hò")
    if uid in data.get("blocked", []) or st["uid"] in od.get("blocked", []):
        raise EcoError("Không thể tương tác với người này")
    return od, sess


def a_like(st, data, d):
    _need_dating(st)
    _prof(data)
    uid = d.get("uid")
    od, osess = _check_target(st, data, uid)
    if uid not in data["likes"]:
        data["likes"] = (data["likes"] + [uid])[-50:]
    oname = osess["p"]["name"] if osess else store.player_name(uid)
    if st["uid"] in od.get("likes", []) and not data.get("match") and not od.get("match"):   # cả 2 cùng thả tim → kết đôi
        today = vn_today()
        data["match"] = {"uid": uid, "name": oname, "since": today}
        od["match"] = {"uid": st["uid"], "name": st["p"]["name"], "since": today}
        _save_other(uid, od, osess)
        st["out"] += [("uid", uid, {"t": "dt", "a": "match", "name": st["p"]["name"]}), ("pinfo",), ("pinfo_uid", uid)]
        return {"match": data["match"]}
    st["out"].append(("uid", uid, {"t": "dt", "a": "liked", "name": st["p"]["name"]}))
    return {"liked": True}


def a_wave(st, data, d):
    _need_dating(st)
    uid = d.get("uid")
    _check_target(st, data, uid)
    w = st.setdefault("waves", {})
    if time.time() - w.get(uid, 0) < 60:
        raise EcoError("Vừa chào rồi, chờ chút nhé")
    w[uid] = time.time()
    st["out"].append(("uid", uid, {"t": "dt", "a": "wave", "name": st["p"]["name"]}))
    return {}


def _unmatch(st, data):
    m = data.pop("match", None)
    if m:
        od, osess = _data_of(m["uid"])
        if od and (od.get("match") or {}).get("uid") == st["uid"]:
            od.pop("match", None)
            _save_other(m["uid"], od, osess)
            st["out"] += [("uid", m["uid"], {"t": "dt", "a": "unmatch", "name": st["p"]["name"]}), ("pinfo_uid", m["uid"])]
        st["out"].append(("pinfo",))


def a_unmatch(st, data, d):
    if not data.get("match"):
        raise EcoError("Bạn chưa kết đôi với ai")
    _unmatch(st, data)
    return {}


def a_block(st, data, d):
    _prof(data)
    uid = d.get("uid")
    if not isinstance(uid, str) or uid == st["uid"]:
        raise EcoError("Người này không hợp lệ")
    if uid not in data["blocked"]:
        data["blocked"].append(uid)
    data["likes"] = [u for u in data["likes"] if u != uid]
    if (data.get("match") or {}).get("uid") == uid:
        _unmatch(st, data)
    return {"blocked": True}


def a_report(st, data, d):
    uid = d.get("uid")
    reason = str(d.get("reason") or "")[:200]
    if not isinstance(uid, str) or not reason.strip():
        raise EcoError("Ghi lý do báo cáo nhé")
    store.add_report(st["uid"], uid, reason)
    a_block(st, data, {"uid": uid})                 # báo cáo thì chặn luôn
    return {"reported": True}


def _gift_ok(data):
    g = data.get("dgift") if isinstance(data.get("dgift"), dict) else {}
    if g.get("day") != vn_today():
        g = {"day": vn_today(), "n": 0}
    if g["n"] >= CFG["GIFT_PER_DAY"]:
        raise EcoError(f"Mỗi ngày tặng tối đa {CFG['GIFT_PER_DAY']} món thôi nha")
    g["n"] += 1
    data["dgift"] = g


def a_flower(st, data, d):
    _need_dating(st)
    m = data.get("match")
    if not m:
        raise EcoError("Kết đôi rồi mới tặng hoa được nha 🌹")
    od, osess = _data_of(m["uid"])
    if not od:
        raise EcoError("Không tìm thấy người ấy")
    _gift_ok(data)
    pay(data, CFG["FLOWER_PRICE"])
    economy.ensure(od)
    add_item(od, "rose", "🌹", f"Hoa hồng từ {st['p']['name']}", "misc")
    _save_other(m["uid"], od, osess)
    st["out"] += [("uid", m["uid"], {"t": "dt", "a": "flower", "name": st["p"]["name"]}), ("eco_uid", m["uid"])]
    return {}


def a_lantern(st, data, d):
    _need_dating(st)
    pay(data, CFG["LANTERN_PRICE"])
    st["out"].append(("room", {"t": "dt", "a": "lantern", "by": st["p"]["name"], "x": st["p"]["x"],
                               "pair": (data.get("match") or {}).get("name", "")}))
    return {}


def pair_name(data):
    m = data.get("match")
    return m["name"] if m and not _prof(data)["hide"] else ""


ACTIONS = {"setAge": a_set_age, "dProf": a_prof, "dBrowse": a_browse, "dLike": a_like, "dWave": a_wave,
           "dUnmatch": a_unmatch, "dBlock": a_block, "dReport": a_report, "dFlower": a_flower, "dLantern": a_lantern}
