// ================== CUỘC SỐNG ẢO: chỉ số, xu, giờ trong game, lưu game, hoạt động từng khu ==================
// File này dùng các hàm/biến chung của index.html (me, myArea, room, send, toast, openSheet…).
// Chúng chỉ được gọi khi game đã chạy nên nạp file này trước script chính vẫn an toàn.
// Giá cả/phần thưởng ở catalog.json. Xu, rương đồ, tủ đồ, mồi, ruộng do SERVER quản lý: mọi giao dịch gọi Life.eco(...).
"use strict";

const Life = (() => {
  // ---------- SaveSystem: dữ liệu nhân vật lưu ở SERVER theo playerId ----------
  // Lúc vào game server gửi dữ liệu về (setData). Xu/đồ: server tự lưu sau mỗi giao dịch.
  // Máy người chơi chỉ gửi {t:"save"} các chỉ số năng lượng, vui vẻ, kiến thức, kinh nghiệm.
  // localStorage chỉ còn giữ token đăng nhập + cài đặt. Khóa cũ "ncn_life" chỉ đọc 1 lần để chuyển lên server.
  const LEGACY_KEY = "ncn_life";
  const fresh = () => ({v: 1, coins: STAT_CFG.START_COINS, energy: 100, fun: 80, know: 0, xp: 0,
                        inv: {}, daily: "", wheelDay: "", wheelUsed: 0,
                        outfit: {...DEFAULT_OUTFIT}, owned: {},          // tủ đồ: id -> 0 (vĩnh viễn) hoặc hạn dùng (ms)
                        farm: Array(FARM_PLOTS).fill(null),              // ô ruộng: {crop, planted, watered} hoặc null
                        bait: {worm: START_BAIT}});
  let S = fresh(), dirty = false, loaded = false;
  const STATS = ["energy", "fun", "know", "xp"];
  function save() {
    if (!loaded) return;                        // chưa nhận dữ liệu từ server thì không ghi đè
    const d = {v: 1}; for (const k of STATS) d[k] = S[k];
    send({t: "save", data: d});
    dirty = false;
  }
  // Nhận dữ liệu từ server. Xu/đồ luôn lấy theo server; chỉ số thì nếu đang chơi mà mất mạng vào lại, giữ số trên máy.
  function setData(d) {
    d = d || {};
    if (loaded) { applyEco(d); save(); return; }
    S = {...fresh(), ...d};
    if (!Array.isArray(S.farm) || S.farm.length !== FARM_PLOTS) S.farm = Array(FARM_PLOTS).fill(null);
    loaded = true; lastLevel = levelOf(S.xp);
    bagSeen = bagCounts();                      // đồ có sẵn lúc vào game không tính là "mới"
  }
  // ---------- Kinh tế: mọi giao dịch xu/đồ do SERVER xử lý ----------
  const ECO = ["coins", "inv", "owned", "bait", "farm", "daily", "wheelDay", "wheelUsed", "hairs", "salonFree"];
  const waiting = new Map(); let rid = 0;
  function applyEco(e) { if (e) for (const k of ECO) if (k in e) S[k] = e[k]; bagBadge(); }
  // Chấm đỏ 🎒: số món mới nhận kể từ lần mở túi đồ gần nhất
  let bagSeen = null;
  const bagCounts = () => {
    const c = {};
    for (const [id, x] of Object.entries(S.inv || {})) c[id] = x.n;
    for (const [id, n] of Object.entries(S.bait || {})) c["bait_" + id] = n;
    for (const [id, v] of Object.entries(S.owned || {})) c["wear_" + id] = 1;
    return c;
  };
  function bagBadge() {
    if (!loaded) return;
    const cur = bagCounts();
    if (!bagSeen) bagSeen = cur;
    let n = 0;
    for (const [id, v] of Object.entries(cur)) n += Math.max(0, v - (bagSeen[id] || 0));
    if (typeof Quick !== "undefined") Quick.badge("bag", n);
  }
  // Gửi 1 yêu cầu (vd: eco("buy", {shop, id})), đợi server trả lời. Thành công: trả về kết quả; thất bại: báo lỗi, trả về null
  function eco(a, params = {}) {
    return new Promise(resolve => {
      if (!ws || ws.readyState !== 1) { toast("Đang kết nối lại server… thử lại sau chút nhé"); resolve(null); return; }
      const id = ++rid;
      const timer = setTimeout(() => { if (waiting.delete(id)) { toast("Server chưa trả lời, thử lại nhé"); resolve(null); } }, 8000);
      waiting.set(id, r => { clearTimeout(timer); resolve(r); });
      // server chỉ nhận 1 yêu cầu mỗi 0,12 giây → gửi liền nhau thì tự giãn ra 0,15 giây
      const at = Math.max(performance.now(), lastEcoAt + 150); lastEcoAt = at;
      setTimeout(() => send({...params, t: "eco", a, rid: id}), at - performance.now());
    });
  }
  let lastEcoAt = 0;
  function onEco(m) {                           // server trả lời (hoặc tự báo số dư mới, vd: xu ngồi học)
    applyEco(m.eco);
    const cb = m.rid != null && waiting.get(m.rid);
    if (cb) { waiting.delete(m.rid); if (!m.ok) toast(m.msg); cb(m.ok ? m.res : null); }
    else if (m.msg) { toast(m.msg); log(m.msg); }
    if (joined) render();
  }
  function legacy() {                           // dữ liệu bản cũ còn trong localStorage (nếu có)
    try { const d = JSON.parse(localStorage.getItem(LEGACY_KEY)); return d && d.v === 1 ? d : null; } catch (e) { return null; }
  }
  function dropLegacy() { try { localStorage.removeItem(LEGACY_KEY); } catch (e) {} }
  const today = () => new Date(serverNow() * 1000 + 7 * 3600000).toISOString().slice(0, 10);   // ngày Việt Nam (giống server)
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------- Cấp độ ----------
  const levelOf = xp => 1 + Math.floor(Math.sqrt(xp / LEVEL_K));
  const xpFor = lv => (lv - 1) * (lv - 1) * LEVEL_K;     // xp cần để đạt cấp lv
  let lastLevel = levelOf(S.xp);

  // ---------- Thay đổi chỉ số ----------
  function apply(d, k = 1) {
    if (!d) return;
    if (d.energy) S.energy = clamp(S.energy + d.energy * k, 0, 100);
    if (d.fun) S.fun = clamp(S.fun + d.fun * k, 0, 100);
    if (d.know) S.know += d.know * k;
    if (d.xp) S.xp += d.xp * k;
    dirty = true;
    const lv = levelOf(S.xp);
    if (lv !== lastLevel) {
      if (lv > lastLevel) { toast(`🎉 Lên cấp ${lv}!`); log(`🎉 <b>Bạn</b> đã lên <b>cấp ${lv}</b>`); }
      lastLevel = lv;
      send({t: "lv", lv});
    }
  }

  // ---------- TimeSystem: giờ THẬT Việt Nam (UTC+7) theo đồng hồ server ----------
  const TEST_OFFSET = (() => {                  // &gio=HH:MM trên link: xem thử giờ khác (chỉ máy mình)
    const m = /^(\d{1,2}):(\d{2})$/.exec(new URLSearchParams(location.search).get("gio") || "");
    if (!m) return 0;
    return (+m[1] * 60 + +m[2]) * 60 - ((Date.now() / 1000 + TIME_CFG.UTC_OFFSET_HOURS * 3600) % 86400);
  })();
  const vnSec = () => serverNow() * TIME_CFG.TIME_SCALE + TIME_CFG.UTC_OFFSET_HOURS * 3600 + TEST_OFFSET;   // giây theo giờ VN
  function minutes() { return Math.floor((((vnSec() % 86400) + 86400) % 86400) / 60); }
  const WD_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const WD_LONG = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  const vnDate = () => new Date(vnSec() * 1000);                     // đọc bằng getUTC*() là ra ngày giờ VN
  const hhmm = h => `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;
  function phase() {
    const h = minutes() / 60, P = TIME_CFG.PHASES;
    let cur = P[P.length - 1];
    for (const p of P) if (h >= p.from) cur = p;
    return cur;
  }
  const clockText = () => { const m = minutes(); return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };
  const clockFull = () => `${clockText()} ${WD_SHORT[vnDate().getUTCDay()]}`;                       // "11:17 T4"
  // Độ tối ngoài trời 0..1: tối dần quanh 18:30, sáng dần quanh 5:00, mỗi lần chuyển ~30 phút (không nhảy đột ngột)
  function darkness() {
    const h = minutes() / 60, tr = TIME_CFG.TRANSITION_MIN / 120, D = TIME_CFG.DUSK, A = TIME_CFG.DAWN;
    if (h >= D + tr || h < A - tr) return 1;
    if (h >= D - tr) return (h - (D - tr)) / (2 * tr);
    if (h < A + tr) return 1 - (h - (A - tr)) / (2 * tr);
    return 0;
  }
  const isDay = () => darkness() < .5;
  // Màu phủ theo buổi (chỉ ngoài trời)
  function drawTint(c) {
    const k = phase().key, h = minutes() / 60;
    let col = null;
    if (k === "morning") col = `rgba(255,236,170,${.12 * (1 - Math.max(0, h - 8) / 3)})`;
    else if (k === "afternoon") col = `rgba(255,128,80,${.08 + .1 * Math.min(1, (h - 16) / 2)})`;
    if (!col) return;
    c.fillStyle = col; c.fillRect(VIEW.x0 - 10, VIEW.y0 - 10, VIEW.x1 - VIEW.x0 + 20, VIEW.y1 - VIEW.y0 + 20);   // phủ cả phần đang thấy
  }
  function skyColors() {
    const k = phase().key;
    if (k === "morning") return ["#8ecae6", "#fdf0c2"];
    if (k === "afternoon") return ["#f28482", "#f6bd60"];
    return ["#4aa3df", "#bfe6f7"];
  }

  // ---------- Vòng lặp mỗi giây ----------
  let ticket = false, lowWarned = false, lastPhase = null, timer = null, saveAcc = 0;
  function mode() {
    const m = me();
    if (!m || !m.lying || m.bed == null) return "awake";
    if (myArea === "sleep") return "sleep";
    if (myArea === "study") return "study";
    if (myArea === "park") return "park";
    if (myArea === "cinema") return room.tv.on && ticket ? "movie" : "seat";
    if (myArea === "fishing") return "fish";
    if (myArea === "home") return "sleep";
    return "park";                              // ghế ở nông trại, khu mua sắm…
  }
  const MODE_TEXT = {awake: "🚶 Đi dạo", sleep: "😴 Đang ngủ (hồi năng lượng)", study: "📚 Đang học (tăng kiến thức, tốn năng lượng)",
                     park: "🪑 Ngồi thư giãn (tăng vui vẻ)", fish: "🎣 Ngồi câu cá (tăng vui vẻ)", movie: "🍿 Đang xem phim (tăng vui vẻ)", seat: "💺 Ngồi chờ phim"};
  function tick() {
    if (!joined) return;
    const md = mode();
    if (md === "study" && S.energy < 1) {
      if (!lowWarned) { toast("😵 Hết năng lượng, học không vào nữa! Về 🛏️ ký túc xá ngủ đã"); lowWarned = true; }
    } else apply(STAT_CFG[md]);
    if (S.energy < STAT_CFG.LOW_ENERGY && md !== "sleep" && !lowWarned) {
      lowWarned = true; toast("🥱 Mệt rồi, về 🛏️ ký túc xá ngủ để hồi năng lượng nhé");
    }
    if (S.energy > STAT_CFG.LOW_ENERGY + 10) lowWarned = false;
    const ph = phase().key;
    if (ph !== lastPhase) {
      if (lastPhase) { const p = phase(); log(`${p.icon} Trời đã sang buổi <b>${p.name}</b> (${clockText()})`); }
      lastPhase = ph;
      if (outdoor()) { updateAmbience(); updateUI(); }
    }
    if ((saveAcc += 1) >= 5 && dirty) { saveAcc = 0; save(); }
    render();
  }

  // ---------- HUD ----------
  const bar = (v, col) => `<span class="mbar"><i style="width:${Math.round(v)}%;background:${col}"></i></span>`;
  function render() {
    const lv = levelOf(S.xp);
    $("#lifeStats").innerHTML = `⭐${lv} · 💰${S.coins} · ⚡${bar(S.energy, "#ffd166")} 😊${bar(S.fun, "#ff8fab")} 📖${Math.floor(S.know)}`;
    const p = phase();
    $("#clockPill").textContent = `${p.icon} ${clockFull()}`;
    if (outdoor()) $("#lightBtn").innerHTML = `${p.icon}<span>${clockText()}</span>`;
    const act = {park: "🍦 Quầy kem", study: "📝 Kiểm tra", cinema: ticket ? "🍿 Bắp nước" : "🎟️ Mua vé",
                 farm: "🧑‍🌾 Bác Năm", fishing: "🎣 Câu cá", mall: "🛍️ Cửa hàng", home: "🛋️ Bày đồ"}[myArea] || Zones.actLabel(myArea);
    const ap = $("#actPill");
    ap.classList.toggle("hidden", !act);
    if (act) ap.textContent = act;
  }
  const lightBtnHtml = () => { const p = phase(); return `${p.icon}<span>${clockText()}</span>`; };

  // ---------- Bảng mua đồ chung ----------
  function shopGrid(items) {
    return `<div class="grid">${items.map(it => `<button class="opt shopit ${S.coins < it.price ? "poor" : ""}" data-id="${it.id}">
      ${it.e} ${it.name}<small>${it.price} 💰${it.fun ? ` · 😊+${it.fun}` : ""}${it.energy ? ` · ⚡+${it.energy}` : ""}${it.keep ? " · cất vào túi" : ""}</small></button>`).join("")}</div>`;
  }
  function bindShop(el, items, shop, after) {
    el.querySelectorAll(".shopit").forEach(b => b.onclick = async () => {
      const it = items.find(x => x.id === b.dataset.id);
      if (!it || !(await eco("buy", {shop, id: it.id}))) return;
      apply({fun: it.fun, energy: it.energy, xp: 1});
      save(); render(); closeSheet();
      toast(`${it.e} Bạn mua ${it.name} (−${it.price} 💰)`);
      after && after(it);
    });
  }
  const coinLine = () => `<div class="vol" style="margin:0 0 10px">Bạn đang có <b style="color:var(--accent)">💰 ${S.coins} xu</b></div>`;

  // ---------- Công viên: xe kem + vòng quay ----------
  function wheelFree() { return S.wheelDay !== today() || S.wheelUsed < WHEEL.FREE_PER_DAY; }
  function openParkShop() {
    openSheet("🍦 Quầy kem công viên",
      `${coinLine()}${shopGrid(SHOP.park)}
       <div class="sec">🎡 Vòng quay may mắn</div>
       <button class="opt" id="wheelGo" style="width:100%;text-align:center">${wheelFree() ? "🎁 Quay miễn phí hôm nay" : `🎡 Quay thêm (${WHEEL.PRICE} 💰)`}</button>
       <div class="sec">🎵 Xe kem còn phát nhạc cho cả công viên</div>
       <button class="opt" id="cartMusic" style="width:100%;text-align:center">🎶 Chọn nhạc</button>`,
      el => {
        bindShop(el, SHOP.park, "park", () => send({t: "emote", e: "❤️"}));
        el.querySelector("#wheelGo").onclick = spinWheel;
        el.querySelector("#cartMusic").onclick = () => { closeSheet(); openMusic(); };
      });
  }
  async function spinWheel() {
    if (myArea !== "park" && myArea !== "arcade") { toast("🎡 Vòng quay ở 🌳 công viên hoặc 🎪 khu vui chơi"); return; }
    const res = await eco("wheel"); if (!res) return;              // server quay + cộng xu thưởng
    const prize = WHEEL.PRIZES[res.i];
    openSheet("🎡 Vòng quay may mắn", `<div class="wheelBig" id="wv">🎡</div><div class="pomoSub" id="wt">Đang quay…</div>`, el => {
      let k = 0;
      const iv = setInterval(() => { el.querySelector("#wv").textContent = WHEEL.PRIZES[k++ % WHEEL.PRIZES.length].e; }, 90);
      setTimeout(() => {
        clearInterval(iv);
        apply({energy: prize.energy, fun: prize.fun, xp: 2}); save(); render();
        el.querySelector("#wv").textContent = prize.e;
        el.querySelector("#wt").innerHTML = prize.coins || prize.energy || prize.fun ? `Trúng <b style="color:var(--accent)">${prize.text}</b>! 🎉` : prize.text + " 🍀";
        if (prize.coins >= 80) send({t: "emote", e: "😂"});
      }, 1700);
    });
  }

  // ---------- Phòng học: bài kiểm tra trắc nghiệm ----------
  async function openQuiz() {
    if (myArea !== "study") { toast("📝 Bài kiểm tra ở 📚 phòng học"); return; }
    if (S.energy < QUIZ_CFG.ENERGY) { toast(`😵 Cần ${QUIZ_CFG.ENERGY} ⚡ năng lượng để làm bài. Đi ngủ đã nhé!`); return; }
    const start = await eco("quizStart"); if (!start) return;
    apply({energy: -QUIZ_CFG.ENERGY});
    const pool = start.qs.map(k => QUIZ[k]);
    let i = 0, score = 0, won = 0, busy = false;
    const show = () => {
      if (i >= pool.length) return finish();
      const q = pool[i];
      openSheet(`📝 Câu ${i + 1}/${pool.length}`,
        `<div class="quizText">${esc(q.q)}</div><div class="grid">${q.a.map((a, j) => `<button class="opt qa" data-j="${j}">${esc(a)}</button>`).join("")}</div>
         <div class="pomoSub" style="margin-top:10px">Đúng ${score} câu · mỗi câu đúng +${QUIZ_CFG.COINS} 💰 +${QUIZ_CFG.KNOW} 📖</div>`,
        el => el.querySelectorAll(".qa").forEach(b => b.onclick = async () => {
          if (busy) return; busy = true;
          const j = +b.dataset.j, res = await eco("quizAns", {ans: j});
          busy = false;
          if (!res) { closeSheet(); return; }
          const ok = res.ok;
          if (ok) score++;
          if (res.done) won = res.won;
          el.querySelectorAll(".qa").forEach(x => { x.onclick = null; x.classList.toggle("right", +x.dataset.j === res.c); });
          if (!ok) b.classList.add("wrong");
          i++; setTimeout(show, ok ? 650 : 1200);
        }));
    };
    const finish = () => {
      const bonus = score === pool.length ? 10 : 0;                 // xu do server cộng (won)
      apply({know: score * QUIZ_CFG.KNOW, xp: score * QUIZ_CFG.XP}); save(); render();
      openSheet("📝 Kết quả",
        `<div class="pomoBig">${score}/${pool.length}</div>
         <div class="pomoSub">+${won} 💰 · +${score * QUIZ_CFG.KNOW} 📖 kiến thức${bonus ? " · 🏆 thưởng điểm tuyệt đối +10 💰" : ""}</div>
         <div class="grid"><button class="opt" id="qAgain">🔁 Làm lượt mới (−${QUIZ_CFG.ENERGY} ⚡)</button><button class="opt" id="qClose">✓ Xong</button></div>`,
        el => { el.querySelector("#qAgain").onclick = openQuiz; el.querySelector("#qClose").onclick = closeSheet; });
      if (score === pool.length) send({t: "emote", e: "😂"});
    };
    show();
  }

  // ---------- Rạp phim: vé, bắp nước, đồ lưu niệm, máy gắp thú ----------
  function openTicket(seat) {
    if (ticket) { toast("🎟️ Bạn đã có vé rồi, chọn ghế ngồi đi!"); return; }
    const film = room.tv.on ? (room.tv.ch >= 0 ? TV_CH[room.tv.ch].name : "▶ YouTube") : "Suất chiếu tự do";
    openSheet("🎟️ Máy bán vé",
      `${coinLine()}<div class="opt" style="text-align:center;margin-bottom:10px">Đang chiếu: <b>${esc(film)}</b><br><small style="color:var(--muted)">Vé dùng tới khi bạn rời rạp · ngồi xem phim tăng 😊 vui vẻ</small></div>
       <button class="primary" id="buyTk" style="margin-top:0">Mua vé (${TICKET_PRICE} 💰)</button>`,
      el => el.querySelector("#buyTk").onclick = async () => {
        if (!(await eco("ticket"))) return;
        ticket = true; apply({xp: 2}); save(); render(); closeSheet();
        toast(`🎟️ Đã mua vé! (−${TICKET_PRICE} 💰)`);
        if (seat != null && !bedOwner(seat)) send({t: "sleep", bed: seat});
      });
  }
  function canSit(seat) {                       // rạp phim cần vé mới được ngồi
    if (myArea === "cinema" && !ticket) { openTicket(seat); return false; }
    return true;
  }
  function openPopcorn() {
    openSheet("🍿 Quầy bắp nước", `${coinLine()}${shopGrid(SHOP.popcorn)}`, el => bindShop(el, SHOP.popcorn, "popcorn", () => send({t: "emote", e: "😂"})));
  }
  function openDrinks() { openSheet("🥤 Máy bán nước", `${coinLine()}${shopGrid(SHOP.drinks)}`, el => bindShop(el, SHOP.drinks, "drinks")); }
  function openSouvenir() { openSheet("🛍️ Kệ đồ lưu niệm", `${coinLine()}${shopGrid(SHOP.souvenir)}`, el => bindShop(el, SHOP.souvenir, "souvenir")); }
  async function claw() {
    const res = await eco("claw"); if (!res) return;              // server quyết định trúng/trượt
    apply({fun: 3});
    if (res.prize != null) {
      const p = CLAW_PRIZES[res.prize];
      toast(`🎉 Gắp trúng ${p.e} ${p.name}! (đã cất vào túi)`);
    } else toast(`😢 Gắp trượt rồi (−${CLAW_PRICE} 💰), thử lại nhé`);
    save(); render();
  }
  function openAct() {
    if (myArea === "park") openParkShop();
    else if (myArea === "study") openQuiz();
    else if (myArea === "cinema") ticket ? openPopcorn() : openTicket(null);
    else if (Zones.has(myArea)) Zones.act();
    else Areas.act();
  }

  // ---------- Đồng hồ ----------
  function openClock() {
    const p = phase(), d = vnDate(), now = minutes();
    const date = `${WD_LONG[d.getUTCDay()]}, ${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
    const shows = TIME_CFG.SHOWTIMES.map(s => { const [h, m] = s.split(":"); return +h * 60 + +m; });
    const next = shows.find(m => m > now) ?? shows[0] + 1440, left = next - now;
    const nextTxt = `${hhmm((next % 1440) / 60)} · còn ${left >= 60 ? Math.floor(left / 60) + " giờ " : ""}${left % 60} phút`;
    const toMid = 1440 - now;
    openSheet("🕐 Giờ Việt Nam",
      `<div class="pomoBig">${p.icon} ${clockText()}</div>
       <div class="pomoSub">${date} · buổi ${p.name}<br>Giờ Việt Nam (UTC+7) theo server: ai ở đâu cũng thấy cùng một giờ</div>
       <div class="board">
         <div><span>🎬 Suất chiếu phim kế tiếp</span><b>${nextTxt}</b></div>
         <div><span>🎁 Quà mỗi ngày · vòng quay miễn phí</span><b>đổi lúc 00:00 (còn ${Math.floor(toMid / 60)}g${String(toMid % 60).padStart(2, "0")})</b></div>
       </div>
       <div class="sec">Các buổi trong ngày</div>
       <div class="board">${TIME_CFG.PHASES.map(x => `<div><span>${x.icon} ${x.name}</span><b>từ ${hhmm(x.from)}</b></div>`).join("")}</div>
       <div class="vol" style="font-size:12px">Ngoài trời tự sáng/tối theo giờ thật: tối thì đèn đường bật, đom đóm bay.</div>`);
  }

  // ---------- Bảng nhân vật (chỉ số, túi đồ, đặt lại dữ liệu) ----------
  function openMe() {
    const lv = levelOf(S.xp), a = xpFor(lv), b = xpFor(lv + 1), pct = Math.round((S.xp - a) / (b - a) * 100);
    openSheet(`⭐ ${myName} · Cấp ${lv}`,
      `<div class="statRow"><span>✨ Kinh nghiệm</span>${bar(pct, "#9b8cff")}<b>${Math.floor(S.xp - a)}/${b - a}</b></div>
       <div class="statRow"><span>⚡ Năng lượng</span>${bar(S.energy, "#ffd166")}<b>${Math.round(S.energy)}</b></div>
       <div class="statRow"><span>😊 Vui vẻ</span>${bar(S.fun, "#ff8fab")}<b>${Math.round(S.fun)}</b></div>
       <div class="statRow"><span>📖 Kiến thức</span><span></span><b>${Math.floor(S.know)}</b></div>
       <div class="statRow"><span>💰 Xu</span><span></span><b>${S.coins}</b></div>
       <div class="pomoSub" style="margin-top:8px">${MODE_TEXT[mode()]}</div>
       <div class="grid" style="margin-top:10px"><button class="opt" id="meWard" style="text-align:center">👗 Tủ đồ</button><button class="opt" id="meBag" style="text-align:center">🎒 Túi đồ</button></div>
       <div class="sec">💡 Cách kiếm xu</div>
       <div class="vol" style="margin:0;font-size:12px;line-height:1.5">🎁 Mỗi ngày (theo giờ Việt Nam) vào game +${STAT_CFG.DAILY_BONUS} xu · 📝 làm bài kiểm tra ở phòng học · 📚 ngồi học · 🎡 vòng quay ở công viên<br>
       😴 Ngủ ở ký túc xá hồi ⚡ · 🍿 xem phim, 🍦 ăn kem tăng 😊</div>
       <div class="sec">⚠️ Đặt lại dữ liệu (xóa xu, cấp, túi đồ)</div>
       <div class="ytrow"><input id="resetIn" placeholder="Gõ YES để xác nhận" autocomplete="off"><button id="resetGo">Xóa</button></div>`,
      el => {
        el.querySelector("#meWard").onclick = () => Areas.openWardrobe();
        el.querySelector("#meBag").onclick = () => openBag();
        el.querySelector("#resetGo").onclick = () => {
        if (el.querySelector("#resetIn").value.trim() !== "YES") { toast("Gõ đúng chữ YES để xóa nhé"); return; }
        eco("reset").then(r => {
          if (!r) return;
          const f = fresh(); for (const k of STATS) S[k] = f[k];
          S.outfit = {...DEFAULT_OUTFIT}; lastLevel = 1; save(); render(); closeSheet();
          send({t: "lv", lv: 1}); send({t: "outfit", outfit: S.outfit}); toast("🧹 Đã đặt lại dữ liệu");
        });
      };
      });
  }

  // ---------- 🎒 Túi đồ (phím I): tab đồ mặc, trang trí, mồi câu, hạt giống, nông sản & cá, khác ----------
  const BAG_TABS = [["wear", "👗", "Đồ mặc"], ["deco", "🛋️", "Trang trí"], ["bait", "🐛", "Mồi câu"],
                    ["seed", "🌱", "Hạt giống"], ["food", "🧺", "Nông sản & cá"], ["misc", "🎁", "Khác"]];
  let bagTab = "wear";
  function openBag(tab) {
    if (tab) bagTab = tab;
    bagSeen = bagCounts(); bagBadge();               // đã xem → tắt chấm đỏ
    const inv = Object.entries(S.inv).filter(([, x]) => x.n > 0);
    const of = cats => inv.filter(([, x]) => cats.includes(x.cat || "misc"));
    const count = {wear: CLOTHES.filter(c => c.price > 0 && Areas.owns(c.id)).length, deco: of(["deco"]).length,
                   bait: BAITS.filter(b => S.bait[b.id] > 0).length, seed: of(["seed"]).length, food: of(["crop", "fish"]).length, misc: of(["misc"]).length};
    const row = (left, right) => `<div><span>${left}</span><span>${right}</span></div>`;
    const del = id => ` <button class="del" data-del="${id}" title="Xóa vĩnh viễn">🗑️</button>`;
    let list = [];
    if (bagTab === "wear") list = CLOTHES.filter(c => c.price > 0 && Areas.owns(c.id)).map(c => row(`${c.e} ${c.name}`, `<small>${Areas.ownLabel(c.id)}</small>`));
    else if (bagTab === "bait") list = BAITS.filter(b => S.bait[b.id] > 0).map(b => row(`${b.e} ${b.name}`, `<b>×${S.bait[b.id]}</b>`));
    else list = of({deco: ["deco"], seed: ["seed"], food: ["crop", "fish"], misc: ["misc"]}[bagTab]).map(([id, x]) => row(`${x.e} ${esc(x.name)}`, `<b>×${x.n}</b>${del(id)}`));
    const empty = {wear: "Chưa có đồ mặc nào. Ghé 🛍️ khu mua sắm nhé!", deco: "Chưa có đồ trang trí. Mua ở gian 🛋️ Nội thất (khu mua sắm).",
                   bait: "Hết mồi rồi. Mua ở quầy cô Lan (🎣 hồ câu cá).", seed: "Chưa có hạt giống. Mua ở chỗ bác Năm (🌾 nông trại).",
                   food: "Chưa có nông sản hay cá. Trồng rau, câu cá rồi mang bán nhé!", misc: "Chưa có món nào. Thử gắp thú ở 🎬 rạp phim!"}[bagTab];
    openSheet(`🎒 Túi đồ · 💰 ${S.coins} xu`,
      `<div class="tabs">${BAG_TABS.map(([k, e, n]) => `<button class="${k === bagTab ? "cur" : ""}" data-tab="${k}">${e}<span>${n} · ${count[k]}</span></button>`).join("")}</div>
       ${list.length ? `<div class="board">${list.join("")}</div>` : `<div class="vol" style="margin:0">${empty}</div>`}
       <div class="vol" style="font-size:12px">Xóa vĩnh viễn một món phải gõ <b>YES</b> để xác nhận.</div>`,
      el => {
        el.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => openBag(b.dataset.tab));
        el.querySelectorAll("[data-del]").forEach(b => b.onclick = () => {          // xóa vĩnh viễn: phải gõ YES
          const id = b.dataset.del, it = S.inv[id];
          if (!it) return;
          const ans = prompt(`Xóa vĩnh viễn ${it.name} (×${it.n})? Gõ YES để xác nhận`);
          if (ans !== "YES") { toast("Đã hủy, không xóa gì"); return; }
          eco("drop", {id}).then(r => { if (r) { openBag(); toast("🗑️ Đã xóa"); } });
        });
      });
  }

  // ---------- Kết nối với game chính ----------
  function onJoin(daily) {
    if (daily) setTimeout(() => { toast(`🎁 Quà mỗi ngày: +${daily} xu!`); log(`🎁 Quà đăng nhập hôm nay: <b>+${daily} 💰</b>`); }, 1200);
    $("#lifeBar").classList.remove("hidden");
    lastPhase = phase().key;
    if (!timer) timer = setInterval(tick, 1000);
    render();
  }
  function onArea(a) {
    if (a !== "cinema") ticket = false;
    if (joined) render();
  }
  window.addEventListener("pagehide", () => dirty && save());
  document.addEventListener("visibilitychange", () => { if (document.hidden && dirty) save(); });

  // file này nạp trước script chính nên dùng document.getElementById thay cho $
  document.getElementById("lifeStats").onclick = () => { if (joined) openMe(); };
  document.getElementById("clockPill").onclick = () => { if (joined) openClock(); };
  document.getElementById("wardPill").onclick = () => { if (joined) Areas.openWardrobe(); };
  document.getElementById("actPill").onclick = () => { if (joined) { Sound.ensure(); openAct(); } };

  return {
    // cho areas.js dùng chung
    S: () => S, apply, commit() { save(); render(); }, shopGrid, bindShop, coinLine, today, bar,
    setData, legacy, dropLegacy, eco, onEco, openBag, openMe,
    level: () => levelOf(S.xp), clockFull, minutes, onJoin, onArea, canSit, darkness, isDay, drawTint, skyColors, lightBtnHtml,
    openClock, openParkShop, openTicket, openPopcorn, openDrinks, openSouvenir, claw, openQuiz, spinWheel,
  };
})();
