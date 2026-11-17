// ================== CUỘC SỐNG ẢO: chỉ số, xu, giờ trong game, lưu game, hoạt động từng khu ==================
// File này dùng các hàm/biến chung của index.html (me, myArea, room, send, toast, openSheet…).
// Chúng chỉ được gọi khi game đã chạy nên nạp file này trước script chính vẫn an toàn.
// Dữ liệu (giá, câu hỏi, phần thưởng) nằm ở data.js.
"use strict";

const Life = (() => {
  // ---------- SaveSystem: lưu vào localStorage của máy này ----------
  const KEY = "ncn_life";
  const fresh = () => ({v: 1, coins: STAT_CFG.START_COINS, energy: 100, fun: 80, know: 0, xp: 0,
                        inv: {}, daily: "", wheelDay: "", wheelUsed: 0,
                        outfit: {...DEFAULT_OUTFIT}, owned: {},          // tủ đồ: id -> 0 (vĩnh viễn) hoặc hạn dùng (ms)
                        farm: Array(FARM_PLOTS).fill(null),              // ô ruộng: {crop, planted, watered} hoặc null
                        bait: {worm: START_BAIT}});
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY));
      if (d && d.v === 1) return {...fresh(), ...d};
    } catch (e) {}
    return fresh();
  }
  let S = load(), dirty = false, coinAcc = 0;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
    dirty = false;
  }
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
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
    if (d.coins) {
      coinAcc += d.coins * k;
      const whole = Math.floor(coinAcc);
      if (whole) { S.coins += whole; coinAcc -= whole; }
    }
    dirty = true;
    const lv = levelOf(S.xp);
    if (lv !== lastLevel) {
      if (lv > lastLevel) { toast(`🎉 Lên cấp ${lv}!`); log(`🎉 <b>Bạn</b> đã lên <b>cấp ${lv}</b>`); }
      lastLevel = lv;
      send({t: "lv", lv});
    }
  }
  function pay(price) {
    if (S.coins < price) { toast(`Không đủ xu 😢 (cần ${price} 💰)`); return false; }
    S.coins -= price; dirty = true; return true;
  }
  // Rương đồ: mỗi món có nhóm (cat) để chia tab: deco | seed | crop | fish | misc
  function addItem(it, n = 1, cat) {
    const cur = S.inv[it.id] || {e: it.e, name: it.name, n: 0};
    cur.cat = cat || it.cat || cur.cat || "misc";
    if (it.sell != null) cur.sell = it.sell;
    cur.n += n; S.inv[it.id] = cur; dirty = true;
  }
  function takeItem(id, n = 1) {
    const cur = S.inv[id];
    if (!cur || cur.n < n) return false;
    cur.n -= n; if (cur.n <= 0) delete S.inv[id];
    dirty = true; return true;
  }

  // ---------- TimeSystem: giờ trong game, dùng giờ server nên cả phòng thấy giống nhau ----------
  const secPerGameMin = () => TIME_CFG.DAY_REAL_MINUTES * 60 / 1440;
  function minutes() { return Math.floor(serverNow() / secPerGameMin() + 7 * 60) % 1440; }
  function phase() {
    const h = minutes() / 60, P = TIME_CFG.PHASES;
    let cur = P[P.length - 1];
    for (const p of P) if (h >= p.from) cur = p;
    return cur;
  }
  const clockText = () => { const m = minutes(); return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };
  // Độ tối ngoài trời 0..1: chạng vạng 18h→20h tối dần, bình minh 4h30→6h sáng dần
  function darkness() {
    const h = minutes() / 60;
    if (h >= 20 || h < 4.5) return 1;
    if (h >= 18) return (h - 18) / 2;
    if (h < 6) return 1 - (h - 4.5) / 1.5;
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
    c.fillStyle = col; c.fillRect(-50, -400, 460, 1400);
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
    $("#clockPill").textContent = `${p.icon} ${clockText()}`;
    if (outdoor()) $("#lightBtn").innerHTML = `${p.icon}<span>${clockText()}</span>`;
    const act = {park: "🍦 Quầy kem", study: "📝 Kiểm tra", cinema: ticket ? "🍿 Bắp nước" : "🎟️ Mua vé",
                 farm: "🧑‍🌾 Bác Năm", fishing: "🎣 Câu cá", mall: "🛍️ Cửa hàng", home: "🛋️ Bày đồ"}[myArea];
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
  function bindShop(el, items, after) {
    el.querySelectorAll(".shopit").forEach(b => b.onclick = () => {
      const it = items.find(x => x.id === b.dataset.id);
      if (!it || !pay(it.price)) return;
      apply({fun: it.fun, energy: it.energy, xp: 1});
      if (it.keep) addItem(it);
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
        bindShop(el, SHOP.park, () => send({t: "emote", e: "❤️"}));
        el.querySelector("#wheelGo").onclick = spinWheel;
        el.querySelector("#cartMusic").onclick = () => { closeSheet(); openMusic(); };
      });
  }
  function spinWheel() {
    if (myArea !== "park") { toast("🎡 Vòng quay ở 🌳 công viên"); return; }
    if (S.wheelDay !== today()) { S.wheelDay = today(); S.wheelUsed = 0; }
    const free = S.wheelUsed < WHEEL.FREE_PER_DAY;
    if (!free && !pay(WHEEL.PRICE)) return;
    S.wheelUsed++; save();
    const total = WHEEL.PRIZES.reduce((s, p) => s + p.w, 0);
    let r = Math.random() * total, prize = WHEEL.PRIZES[0];
    for (const p of WHEEL.PRIZES) { if ((r -= p.w) < 0) { prize = p; break; } }
    openSheet("🎡 Vòng quay may mắn", `<div class="wheelBig" id="wv">🎡</div><div class="pomoSub" id="wt">Đang quay…</div>`, el => {
      let k = 0;
      const iv = setInterval(() => { el.querySelector("#wv").textContent = WHEEL.PRIZES[k++ % WHEEL.PRIZES.length].e; }, 90);
      setTimeout(() => {
        clearInterval(iv);
        apply({coins: prize.coins, energy: prize.energy, fun: prize.fun, xp: 2}); save(); render();
        el.querySelector("#wv").textContent = prize.e;
        el.querySelector("#wt").innerHTML = prize.coins || prize.energy || prize.fun ? `Trúng <b style="color:var(--accent)">${prize.text}</b>! 🎉` : prize.text + " 🍀";
        if (prize.coins >= 80) send({t: "emote", e: "😂"});
      }, 1700);
    });
  }

  // ---------- Phòng học: bài kiểm tra trắc nghiệm ----------
  function openQuiz() {
    if (myArea !== "study") { toast("📝 Bài kiểm tra ở 📚 phòng học"); return; }
    if (S.energy < QUIZ_CFG.ENERGY) { toast(`😵 Cần ${QUIZ_CFG.ENERGY} ⚡ năng lượng để làm bài. Đi ngủ đã nhé!`); return; }
    apply({energy: -QUIZ_CFG.ENERGY});
    const pool = [...QUIZ].sort(() => Math.random() - .5).slice(0, QUIZ_CFG.PER_ROUND);
    let i = 0, score = 0;
    const show = () => {
      if (i >= pool.length) return finish();
      const q = pool[i];
      openSheet(`📝 Câu ${i + 1}/${pool.length}`,
        `<div class="quizText">${esc(q.q)}</div><div class="grid">${q.a.map((a, j) => `<button class="opt qa" data-j="${j}">${esc(a)}</button>`).join("")}</div>
         <div class="pomoSub" style="margin-top:10px">Đúng ${score} câu · mỗi câu đúng +${QUIZ_CFG.COINS} 💰 +${QUIZ_CFG.KNOW} 📖</div>`,
        el => el.querySelectorAll(".qa").forEach(b => b.onclick = () => {
          const j = +b.dataset.j, ok = j === q.c;
          if (ok) score++;
          el.querySelectorAll(".qa").forEach(x => { x.onclick = null; x.classList.toggle("right", +x.dataset.j === q.c); });
          if (!ok) b.classList.add("wrong");
          i++; setTimeout(show, ok ? 650 : 1200);
        }));
    };
    const finish = () => {
      const bonus = score === pool.length ? 10 : 0;
      apply({coins: score * QUIZ_CFG.COINS + bonus, know: score * QUIZ_CFG.KNOW, xp: score * QUIZ_CFG.XP}); save(); render();
      openSheet("📝 Kết quả",
        `<div class="pomoBig">${score}/${pool.length}</div>
         <div class="pomoSub">+${score * QUIZ_CFG.COINS + bonus} 💰 · +${score * QUIZ_CFG.KNOW} 📖 kiến thức${bonus ? " · 🏆 thưởng điểm tuyệt đối +10 💰" : ""}</div>
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
      el => el.querySelector("#buyTk").onclick = () => {
        if (!pay(TICKET_PRICE)) return;
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
    openSheet("🍿 Quầy bắp nước", `${coinLine()}${shopGrid(SHOP.popcorn)}`, el => bindShop(el, SHOP.popcorn, () => send({t: "emote", e: "😂"})));
  }
  function openDrinks() { openSheet("🥤 Máy bán nước", `${coinLine()}${shopGrid(SHOP.drinks)}`, el => bindShop(el, SHOP.drinks)); }
  function openSouvenir() { openSheet("🛍️ Kệ đồ lưu niệm", `${coinLine()}${shopGrid(SHOP.souvenir)}`, el => bindShop(el, SHOP.souvenir)); }
  function claw() {
    if (!pay(CLAW_PRICE)) return;
    apply({fun: 3});
    if (Math.random() < .3) {
      const p = CLAW_PRIZES[Math.random() * CLAW_PRIZES.length | 0];
      addItem(p); toast(`🎉 Gắp trúng ${p.e} ${p.name}! (đã cất vào túi)`);
    } else toast(`😢 Gắp trượt rồi (−${CLAW_PRICE} 💰), thử lại nhé`);
    save(); render();
  }
  function openAct() {
    if (myArea === "park") openParkShop();
    else if (myArea === "study") openQuiz();
    else if (myArea === "cinema") ticket ? openPopcorn() : openTicket(null);
    else Areas.act();
  }

  // ---------- Đồng hồ ----------
  function openClock() {
    const p = phase();
    openSheet("🕐 Giờ trong game",
      `<div class="pomoBig">${p.icon} ${clockText()}</div>
       <div class="pomoSub">Buổi ${p.name} · 1 ngày trong game = ${TIME_CFG.DAY_REAL_MINUTES} phút thật · cả phòng chung một giờ</div>
       <div class="board">${TIME_CFG.PHASES.map(x => `<div><span>${x.icon} ${x.name}</span><b>từ ${x.from}:00</b></div>`).join("")}</div>
       <div class="vol" style="font-size:12px">Công viên tự sáng/tối theo giờ: tối thì đèn đường bật, đom đóm bay.</div>`);
  }

  // ---------- Bảng nhân vật (chỉ số, túi đồ, đặt lại dữ liệu) ----------
  function openMe() {
    const lv = levelOf(S.xp), a = xpFor(lv), b = xpFor(lv + 1), pct = Math.round((S.xp - a) / (b - a) * 100);
    const inv = Object.entries(S.inv).filter(([, x]) => x.n > 0);
    const baits = BAITS.filter(b => S.bait[b.id] > 0);
    const wear = CLOTHES.filter(c => c.price > 0 && Areas.owns(c.id));
    const CATS = [["deco", "🛋️ Đồ trang trí"], ["seed", "🌱 Hạt giống"], ["crop", "🧺 Nông sản"], ["fish", "🐟 Cá"], ["misc", "🎁 Khác"]];
    const rows = list => `<div class="board">${list.join("")}</div>`;
    const invHtml = CATS.map(([c, title]) => {
      const its = inv.filter(([, x]) => (x.cat || "misc") === c);
      return its.length ? `<div class="sec">${title}</div>` + rows(its.map(([id, x]) => `<div><span>${x.e} ${esc(x.name)}</span><span><b>×${x.n}</b> <button class="del" data-del="${id}">🗑️</button></span></div>`)) : "";
    }).join("")
      + (baits.length ? `<div class="sec">🐛 Mồi câu</div>` + rows(baits.map(b => `<div><span>${b.e} ${b.name}</span><b>×${S.bait[b.id]}</b></div>`)) : "")
      + (wear.length ? `<div class="sec">👗 Đồ mặc</div>` + rows(wear.map(c => `<div><span>${c.e} ${c.name}</span><small>${Areas.ownLabel(c.id)}</small></div>`)) : "");
    openSheet(`⭐ ${myName} · Cấp ${lv}`,
      `<div class="statRow"><span>✨ Kinh nghiệm</span>${bar(pct, "#9b8cff")}<b>${Math.floor(S.xp - a)}/${b - a}</b></div>
       <div class="statRow"><span>⚡ Năng lượng</span>${bar(S.energy, "#ffd166")}<b>${Math.round(S.energy)}</b></div>
       <div class="statRow"><span>😊 Vui vẻ</span>${bar(S.fun, "#ff8fab")}<b>${Math.round(S.fun)}</b></div>
       <div class="statRow"><span>📖 Kiến thức</span><span></span><b>${Math.floor(S.know)}</b></div>
       <div class="statRow"><span>💰 Xu</span><span></span><b>${S.coins}</b></div>
       <div class="pomoSub" style="margin-top:8px">${MODE_TEXT[mode()]}</div>
       <div class="grid" style="margin-top:10px"><button class="opt" id="meWard" style="text-align:center">👗 Tủ đồ</button><button class="opt" id="meMap" style="text-align:center">🗺️ Bản đồ</button></div>
       <div class="sec" style="font-size:14px;color:var(--text)">🎒 Rương đồ</div>
       ${invHtml || `<div class="vol" style="margin:0">Rương trống. Trồng rau, câu cá, mua đồ ở khu mua sắm nhé!</div>`}
       <div class="sec">💡 Cách kiếm xu</div>
       <div class="vol" style="margin:0;font-size:12px;line-height:1.5">🎁 Mỗi ngày vào game +${STAT_CFG.DAILY_BONUS} xu · 📝 làm bài kiểm tra ở phòng học · 📚 ngồi học · 🎡 vòng quay ở công viên<br>
       😴 Ngủ ở ký túc xá hồi ⚡ · 🍿 xem phim, 🍦 ăn kem tăng 😊</div>
       <div class="sec">⚠️ Đặt lại dữ liệu (xóa xu, cấp, túi đồ)</div>
       <div class="ytrow"><input id="resetIn" placeholder="Gõ YES để xác nhận" autocomplete="off"><button id="resetGo">Xóa</button></div>`,
      el => {
        el.querySelector("#meWard").onclick = () => Areas.openWardrobe();
        el.querySelector("#meMap").onclick = () => { closeSheet(); openMap(); };
        el.querySelectorAll("[data-del]").forEach(b => b.onclick = () => {          // xóa vĩnh viễn: phải gõ YES
          const id = b.dataset.del, it = S.inv[id];
          if (!it) return;
          const ans = prompt(`Xóa vĩnh viễn ${it.name} (×${it.n})? Gõ YES để xác nhận`);
          if (ans !== "YES") { toast("Đã hủy, không xóa gì"); return; }
          delete S.inv[id]; save(); openMe(); toast("🗑️ Đã xóa");
        });
        el.querySelector("#resetGo").onclick = () => {
        if (el.querySelector("#resetIn").value.trim() !== "YES") { toast("Gõ đúng chữ YES để xóa nhé"); return; }
        S = fresh(); S.daily = today(); lastLevel = 1; save(); render(); closeSheet();
        send({t: "lv", lv: 1}); send({t: "outfit", outfit: S.outfit}); toast("🧹 Đã đặt lại dữ liệu");
      };
      });
  }

  // ---------- Kết nối với game chính ----------
  function onJoin() {
    if (S.daily !== today()) {
      S.daily = today(); S.coins += STAT_CFG.DAILY_BONUS; save();
      setTimeout(() => { toast(`🎁 Quà mỗi ngày: +${STAT_CFG.DAILY_BONUS} xu!`); log(`🎁 Quà đăng nhập hôm nay: <b>+${STAT_CFG.DAILY_BONUS} 💰</b>`); }, 1200);
    }
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
    S: () => S, pay, apply, addItem, takeItem, commit() { save(); render(); }, shopGrid, bindShop, coinLine, today, bar,
    level: () => levelOf(S.xp), onJoin, onArea, canSit, darkness, isDay, drawTint, skyColors, lightBtnHtml,
    openClock, openParkShop, openTicket, openPopcorn, openDrinks, openSouvenir, claw, openQuiz,
  };
})();
