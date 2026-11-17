// ================== CÁC KHU MỚI + AVATAR NHIỀU LỚP + NPC + SỰ KIỆN MÙA ==================
// Nạp SAU script chính: bổ sung bố cục / cửa / tên khu vào các bảng của game, rồi cung cấp hàm vẽ + tương tác.
// Khu mới: 🌾 nông trại (Tây Nam) · 🎣 hồ câu cá (Nam) · 🛍️ khu mua sắm (Đông Nam) → 🏠 nhà riêng
// Dữ liệu (cây trồng, cá, quần áo, nội thất, NPC, mùa lễ) nằm ở data.js.
"use strict";

const Areas = (() => {
  const OFF = {x: -500, y: -500, w: 1, h: 1};          // không có công tắc/vật đó trong khu
  const CL = Object.fromEntries(CLOTHES.map(c => [c.id, c]));
  const FU = Object.fromEntries(FURNITURE.map(f => [f.id, f]));
  const CR = Object.fromEntries(CROPS.map(c => [c.id, c]));
  const NEW = new Set(["farm", "fishing", "mall", "home"]);
  const nowS = () => Date.now() / 1000;
  const pick = a => a[Math.random() * a.length | 0];
  const roll = (list, wf) => {                          // chọn ngẫu nhiên theo trọng số
    const tot = list.reduce((s, x) => s + wf(x), 0);
    let r = Math.random() * tot;
    for (const x of list) if ((r -= wf(x)) < 0) return x;
    return list[0];
  };

  // ---------- 1. Đăng ký khu mới vào bảng của game ----------
  Object.assign(LAYOUTS, {
    farm:    {beds: [{x: 104, y: 462}, {x: 200, y: 462}], bw: 56, bh: 36, sitY: 26,                       // 2 kiện rơm để ngồi
              tvr: null, scr: null, radio: {x: 236, y: 398, w: 44, h: 26}, sw: OFF, moon: {x: 300, y: 36}},
    fishing: {beds: [{x: 8, y: 290}, {x: 84, y: 290}, {x: 206, y: 290}, {x: 282, y: 290}], bw: 70, bh: 56, sitY: 44, minY: 352,
              tvr: null, scr: null, radio: {x: 22, y: 412, w: 44, h: 26}, sw: OFF, moon: {x: 60, y: 30}},
    mall:    {beds: [{x: 16, y: 440}, {x: 135, y: 440}, {x: 254, y: 440}], bw: 90, bh: 40, sitY: 30,
              tvr: null, scr: null, radio: {x: 158, y: 372, w: 44, h: 26}, sw: OFF, moon: null},
    home:    {beds: [{x: 16, y: 180}, {x: 92, y: 180}], bw: 68, bh: 96, sitY: 52,                         // 2 nệm futon có sẵn
              tvr: null, scr: null, radio: {x: 232, y: 112, w: 48, h: 28}, sw: {x: 322, y: 96, w: 13, h: 19}, moon: {x: 180, y: 70}},
  });
  const bottomDoor = to => ({x: 156, y: 538, w: 48, h: 37, side: "bottom", spot: {x: 180, y: 556}, to});
  AREA_DOORS.park.push(
    {x: 0, y: 404, w: 24, h: 52, side: "left", spot: {x: 22, y: 430}, to: "farm"},
    {x: 92, y: 538, w: 46, h: 37, side: "bottom", spot: {x: 115, y: 556}, to: "fishing"},
    {x: 292, y: 538, w: 48, h: 37, side: "bottom", spot: {x: 316, y: 556}, to: "mall"});
  Object.assign(AREA_DOORS, {
    farm: [bottomDoor("park")], fishing: [bottomDoor("park")],
    mall: [bottomDoor("park"), {...DOOR_L, to: "home"}],
    home: [{...DOOR_R, to: "mall"}],
  });
  Object.assign(AREA_NAME, {farm: "🌾 Nông trại", fishing: "🎣 Hồ câu cá", mall: "🛍️ Khu mua sắm", home: "🏠 Nhà riêng"});
  Object.assign(AREA_DIR, {farm: "Tây Nam", fishing: "Nam", mall: "Đông Nam", home: "Trong khu mua sắm"});
  Object.assign(DOOR_LOOK, {farm: ["#6b4f2a", "#e9c46a", "🌾"], fishing: ["#1d4e89", "#7ec8e3", "🎣"],
                            mall: ["#7b2cbf", "#ffc8dd", "🛍️"], home: ["#8a5a3c", "#ffe8d6", "🏠"]});
  // Chữ hiển thị riêng cho từng khu (nút ngồi, thông báo…)
  const TXT = {
    farm:    {icon: "🌾", sit: "🪑<span>Ngồi</span>", full: "Hết chỗ ngồi rồi! 😅", taken: "Kiện rơm của", hello: "Nông trại 🌾: chạm ô đất để gieo hạt, tưới nước, thu hoạch. Bác Năm mua nông sản đó!", share: "Ra nông trại trồng rau với mình nè 🌾"},
    fishing: {icon: "🎣", sit: "🎣<span>Ngồi câu</span>", full: "Hết chỗ câu rồi! 😅", taken: "Chỗ câu của", hello: "Hồ câu cá 🎣: chạm ghế đẩu bên bờ để ngồi, rồi bấm 🎣 Câu cá. Mua mồi ở chỗ cô Lan.", share: "Ra hồ câu cá với mình nè 🎣"},
    mall:    {icon: "🛍️", sit: "🪑<span>Ngồi</span>", full: "Hết ghế rồi! 😅", taken: "Ghế của", hello: "Khu mua sắm 🛍️: chạm vào từng cửa hàng để mua đồ. Cửa trái dẫn về 🏠 nhà riêng.", share: "Đi mua sắm với mình nè 🛍️"},
    home:    {icon: "🏠", sit: "😴<span>Nằm nghỉ</span>", full: "Hết nệm rồi! 😅", taken: "Nệm của", hello: "Nhà riêng 🏠 của nhóm: bấm 🛋️ Bày đồ để đặt nội thất mua ở khu mua sắm.", share: "Ghé nhà mình chơi nè 🏠"},
  };

  // ---------- 2. Avatar ghép lớp: cánh/lưng → chân → áo → cổ → đầu → tóc → kính → mũ ----------
  const outfitOf = p => ({...DEFAULT_OUTFIT, ...(p.outfit || {})});
  function drawBack(b, x, by, t, front) {
    const c = b.color;
    if (b.id === "back_bag") {
      if (front) { ctx.strokeStyle = darken(c, .25); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 6, by + 1); ctx.lineTo(x - 6, by + 14); ctx.moveTo(x + 6, by + 1); ctx.lineTo(x + 6, by + 14); ctx.stroke(); return; }
      ctx.fillStyle = c; rr(ctx, x - 12, by - 1, 24, 18, 5); ctx.fill();
      return;
    }
    if (front) return;
    if (b.id === "back_cape") {
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x - 9, by + 1); ctx.lineTo(x + 9, by + 1);
      ctx.lineTo(x + 14 + Math.sin(t * 3) * 1.5, by + 22); ctx.lineTo(x - 14 + Math.sin(t * 3 + 1) * 1.5, by + 22); ctx.fill();
      return;
    }
    const a = Math.sin(t * (b.id === "back_bat" ? 5 : 3)) * .22;
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(x + s * 8, by + 5); ctx.rotate(s * (-.5 + a)); ctx.scale(s, 1);
      if (b.id === "back_bat") {
        ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(16, -8); ctx.lineTo(13, -1); ctx.lineTo(17, 3); ctx.lineTo(10, 3); ctx.lineTo(9, 8); ctx.closePath(); ctx.fill();
      } else {
        ctx.globalAlpha = b.id === "back_fairy" ? .75 : 1;
        ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(10, -4, 11, 6, -.3, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.ellipse(8, 4, 7, 4, .4, 0, 7); ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,.12)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(10, -4, 11, 6, -.3, 0, 7); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }
  }
  function drawHat(id, x, hy, body, up) {
    const h = CL[id]; if (!h || id === "hat_none") return;
    const c = h.color;
    if (id === "hat_nightcap" || id === "hat_santa") {
      ctx.fillStyle = id === "hat_santa" ? c : lighten(body, .15);
      ctx.beginPath(); ctx.moveTo(x - 9, hy - 6); ctx.quadraticCurveTo(x, hy - 20, x + 13, hy - 14); ctx.lineTo(x + 9, hy - 6); ctx.fill();
      if (id === "hat_santa") { ctx.fillStyle = "#fff"; rr(ctx, x - 11, hy - 8, 22, 4, 2); ctx.fill(); }
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x + 13, hy - 14, 2.6, 0, 7); ctx.fill();
    } else if (id === "hat_beanie") {
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, hy - 3, 11, Math.PI, 0); ctx.fill();
      ctx.fillStyle = darken(c, .2); rr(ctx, x - 11.5, hy - 5, 23, 4.5, 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, hy - 14, 3, 0, 7); ctx.fill();
    } else if (id === "hat_cap") {
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, hy - 3, 10.8, Math.PI, 0); ctx.fill();
      ctx.fillStyle = darken(c, .25); ctx.beginPath(); ctx.ellipse(up ? x - 4 : x + 6, hy - 3, 8, 2.4, 0, 0, 7); ctx.fill();
    } else if (id === "hat_bow") {
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x + 6, hy - 9); ctx.lineTo(x, hy - 15); ctx.lineTo(x, hy - 4); ctx.closePath();
      ctx.moveTo(x + 6, hy - 9); ctx.lineTo(x + 12, hy - 15); ctx.lineTo(x + 12, hy - 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = darken(c, .2); ctx.beginPath(); ctx.arc(x + 6, hy - 9, 2, 0, 7); ctx.fill();
    } else if (id === "hat_flower") {
      ctx.fillStyle = c; for (let k = 0; k < 5; k++) { const a = k / 5 * 6.28; ctx.beginPath(); ctx.arc(x + 8 + Math.cos(a) * 3, hy - 7 + Math.sin(a) * 3, 2.4, 0, 7); ctx.fill(); }
      ctx.fillStyle = "#ffd166"; ctx.beginPath(); ctx.arc(x + 8, hy - 7, 1.8, 0, 7); ctx.fill();
    } else if (id === "hat_crown") {
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x - 7, hy - 8); ctx.lineTo(x - 8, hy - 17); ctx.lineTo(x - 3.5, hy - 12); ctx.lineTo(x, hy - 19);
      ctx.lineTo(x + 3.5, hy - 12); ctx.lineTo(x + 8, hy - 17); ctx.lineTo(x + 7, hy - 8); ctx.fill();
      ctx.fillStyle = "#e63946"; ctx.beginPath(); ctx.arc(x, hy - 11, 1.6, 0, 7); ctx.fill();
    } else if (id === "hat_witch") {
      ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, hy - 7, 15, 3.5, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - 8, hy - 8); ctx.lineTo(x + 4, hy - 30); ctx.lineTo(x + 8, hy - 8); ctx.fill();
      ctx.fillStyle = "#ffd166"; ctx.fillRect(x - 7.5, hy - 11, 15.5, 2.5);
    }
  }
  function drawAvatar(p, t) {
    const o = outfitOf(p), up = p.up;
    const bob = p.walking ? Math.abs(Math.sin(t * 12)) * 2 : Math.sin(t * 2) * .4;
    const x = p.x, y = p.y, by = y - 21 - bob, hy = y - 30 - bob;
    const shirt = CL[o.shirt], body = shirt ? shirt.color : p.color;
    const hairC = (CL[o.hairColor] || CL.hc_brown).color, back = CL[o.back];
    ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.beginPath(); ctx.ellipse(x, y, 10, 4, 0, 0, 7); ctx.fill();
    const hasBack = back && back.id !== "back_none";
    if (hasBack && !up) drawBack(back, x, by, t, false);
    if (p.walking) {                                                     // chân
      const s = Math.sin(t * 12) * 2.5; ctx.fillStyle = "#3b2f4a";
      ctx.fillRect(x - 6, y - 5 + s * .3, 4, 5); ctx.fillRect(x + 2, y - 5 - s * .3, 4, 5);
    }
    ctx.fillStyle = body; rr(ctx, x - 10, by, 20, 18, 7); ctx.fill();   // áo
    if (shirt && shirt.stripe) {
      ctx.save(); rr(ctx, x - 10, by, 20, 18, 7); ctx.clip();
      ctx.fillStyle = shirt.stripe; for (let k = 3; k < 18; k += 5) ctx.fillRect(x - 10, by + k, 20, 2); ctx.restore();
    } else {
      ctx.fillStyle = lighten(body, .35); ctx.beginPath(); ctx.arc(x - 4, by + 9, 1.5, 0, 7); ctx.arc(x + 4, by + 6, 1.5, 0, 7); ctx.fill();
    }
    if (shirt && shirt.tie && !up) { ctx.fillStyle = shirt.tie; ctx.beginPath(); ctx.moveTo(x - 2, by + 1); ctx.lineTo(x + 2, by + 1); ctx.lineTo(x + 1.5, by + 11); ctx.lineTo(x, by + 13); ctx.lineTo(x - 1.5, by + 11); ctx.fill(); }
    if (hasBack) drawBack(back, x, by, t, true);
    if (hasBack && up) drawBack(back, x, by, t, false);                 // nhìn từ sau: cánh nằm trước lưng
    const nk = CL[o.neck];                                               // phụ kiện cổ
    if (nk && nk.id === "neck_scarf") { ctx.fillStyle = nk.color; rr(ctx, x - 10, by - 1, 20, 5, 2); ctx.fill(); if (!up) ctx.fillRect(x + 3, by + 3, 4, 8); }
    else if (nk && nk.id === "neck_bowtie" && !up) { ctx.fillStyle = nk.color; ctx.beginPath(); ctx.moveTo(x, by + 2); ctx.lineTo(x - 5, by - 1); ctx.lineTo(x - 5, by + 5); ctx.closePath(); ctx.moveTo(x, by + 2); ctx.lineTo(x + 5, by - 1); ctx.lineTo(x + 5, by + 5); ctx.fill(); }
    else if (nk && nk.id === "neck_pearl" && !up) { ctx.fillStyle = nk.color; for (let k = 0; k < 7; k++) { ctx.beginPath(); ctx.arc(x - 6 + k * 2, by + 1 + Math.sin(k / 6 * Math.PI) * 3, 1.2, 0, 7); ctx.fill(); } }
    ctx.fillStyle = "#f5d0a9"; ctx.beginPath(); ctx.arc(x, hy, 10, 0, 7); ctx.fill();   // đầu
    ctx.fillStyle = hairC;                                               // tóc
    const style = o.hair;
    if (up) {
      ctx.beginPath(); ctx.arc(x, hy, 10.5, 0, 7); ctx.fill();
      if (style === "hair_long") rr(ctx, x - 10, hy, 20, 13, 4), ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(x, hy - 2, 10.5, Math.PI, 0); ctx.fill();
      ctx.fillRect(x - 10.5, hy - 2, 3, 6); ctx.fillRect(x + 7.5, hy - 2, 3, 6);
      if (style === "hair_long") { ctx.fillRect(x - 11.5, hy - 2, 4, 15); ctx.fillRect(x + 7.5, hy - 2, 4, 15); }
      ctx.fillStyle = "#2a1d16"; ctx.fillRect(x - 4.5, hy + 1, 2, 2.5); ctx.fillRect(x + 2.5, hy + 1, 2, 2.5);   // mắt
      ctx.fillStyle = "rgba(255,120,140,.35)"; ctx.beginPath(); ctx.arc(x - 6.5, hy + 5, 2, 0, 7); ctx.arc(x + 6.5, hy + 5, 2, 0, 7); ctx.fill();
    }
    ctx.fillStyle = hairC;
    if (style === "hair_bun") { ctx.beginPath(); ctx.arc(x, hy - 12, 5, 0, 7); ctx.fill(); }
    if (style === "hair_spiky") { ctx.beginPath(); for (const dx of [-7, -2, 3]) { ctx.moveTo(x + dx - 3, hy - 8); ctx.lineTo(x + dx, hy - 17); ctx.lineTo(x + dx + 4, hy - 9); } ctx.fill(); }
    if (!up) {                                                           // kính
      const g = o.glasses;
      if (g === "gl_round") { ctx.strokeStyle = "#222"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x - 3.5, hy + 2, 3.2, 0, 7); ctx.moveTo(x + 6.7, hy + 2); ctx.arc(x + 3.5, hy + 2, 3.2, 0, 7); ctx.moveTo(x - .3, hy + 2); ctx.lineTo(x + .3, hy + 2); ctx.stroke(); }
      else if (g === "gl_sun") { ctx.fillStyle = "#111"; rr(ctx, x - 8, hy, 7, 4.5, 2); ctx.fill(); rr(ctx, x + 1, hy, 7, 4.5, 2); ctx.fill(); ctx.fillRect(x - 1, hy + 1, 2, 1); }
      else if (g === "gl_heart") { ctx.fillStyle = "#ff4d8d"; ctx.font = "8px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("♥", x - 3.5, hy + 2.5); ctx.fillText("♥", x + 3.5, hy + 2.5); }
    }
    drawHat(o.hat, x, hy, body, up);
  }

  // ---------- 3. NPC: đi theo đường cố định, vị trí theo giờ server nên ai cũng thấy giống nhau ----------
  const npcTalk = {};
  const SEG = {};
  function npcPos(n) {
    const P = n.path;
    if (P.length === 1) return {x: P[0][0], y: P[0][1], walking: false};
    if (!SEG[n.id]) { let L = 0; const s = P.map((a, i) => { const b = P[(i + 1) % P.length], d = Math.hypot(b[0] - a[0], b[1] - a[1]); L += d; return [a, b, d]; }); SEG[n.id] = {s, L}; }
    const {s, L} = SEG[n.id];
    let d = (serverNow() * (n.speed || 15) + n.id.charCodeAt(0) * 37) % L;
    for (const [a, b, len] of s) {
      if (d <= len) { const k = d / len; return {x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, walking: true}; }
      d -= len;
    }
    return {x: P[0][0], y: P[0][1], walking: false};
  }
  const npcsHere = () => (NPCS[myArea] || []).map(n => ({n, p: npcPos(n)}));
  const NPC_ACT = {
    quiz: () => Life.openQuiz(), popcorn: () => Life.openPopcorn(), farmer: () => openFarmer(),
    bait: () => openBait(), cashier: () => openCashier(),
  };
  function talkNpc(n) {
    npcTalk[n.id] = {text: pick(n.lines), until: performance.now() / 1000 + 4};
    if (n.act) setTimeout(() => NPC_ACT[n.act](), 450);
  }

  // ---------- 4. Sự kiện theo mùa ----------
  const SEASON = (() => {
    const q = new URLSearchParams(location.search).get("season");
    if (q) return SEASONS.find(s => s.key === q) || null;
    const d = new Date(), md = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return SEASONS.find(s => md >= s.from && md <= s.to) || null;
  })();
  function drawSeason(t) {
    if (!SEASON || !["park", "cinema"].includes(myArea)) return;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    if (myArea === "park") {
      ctx.strokeStyle = "rgba(60,40,30,.6)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 168);       // dây treo đồ trang trí
      for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 168 + Math.sin(x / 40 * Math.PI) * 6); ctx.stroke();
      ctx.font = "12px system-ui";
      for (let k = 0, x = 20; x < W; x += 40, k++) ctx.fillText(SEASON.deco[k % SEASON.deco.length], x, 178 + Math.sin(x / 40 * Math.PI) * 6 + Math.sin(t * 2 + k) * 1.5);
      ctx.font = "18px system-ui";
      [[40, 186], [322, 196], [124, 512], [248, 470], [300, 400], [60, 300]].forEach(([x, y], k) => ctx.fillText(SEASON.deco[k % SEASON.deco.length], x, y));
    } else {
      ctx.font = "18px system-ui";
      [[22, 410], [338, 410], [180, 418]].forEach(([x, y], k) => ctx.fillText(SEASON.deco[k % SEASON.deco.length], x, y));
    }
    if (SEASON.fall) {                                                   // lá/hoa/tuyết rơi (24 hạt)
      ctx.font = "10px system-ui";
      for (let k = 0; k < 24; k++) {
        const ph = ((t * (14 + k % 5 * 3) + k * 97) % 520), x = (k * 53 + Math.sin(t * .8 + k) * 18 + 360) % 360;
        ctx.globalAlpha = .85; ctx.fillText(SEASON.fall, x, 150 + ph - 60);
      }
      ctx.globalAlpha = 1;
    }
  }

  // ---------- 5. Nông trại ----------
  const PLOTS = Array.from({length: FARM_PLOTS}, (_, i) => ({x: 14 + (i % 4) * 86, y: 196 + (i / 4 | 0) * 84, w: 74, h: 70}));
  const S = () => Life.S();
  function plotInfo(pl) {
    if (!pl) return {st: "empty"};
    const c = CR[pl.c]; if (!c) return {st: "empty"};
    if (!pl.w) return {st: "dry", c};
    const k = Math.min(1, (nowS() - pl.w) / c.time);
    return {st: k >= 1 ? "ripe" : "grow", c, k, left: c.time * (1 - k)};
  }
  function drawFarm(t) {
    const night = Life.darkness() > .5, [s0, s1] = night ? ["#060a22", "#27316b"] : Life.skyColors();
    const g = ctx.createLinearGradient(0, -400, 0, 160); g.addColorStop(0, s0); g.addColorStop(1, s1);
    ctx.fillStyle = g; ctx.fillRect(-50, -400, W + 100, 570);
    const M = LAYOUT.moon;
    ctx.fillStyle = night ? "#fff6c8" : "#ffe066"; ctx.beginPath(); ctx.arc(M.x, M.y, night ? 12 : 16, 0, 7); ctx.fill();
    ctx.fillStyle = night ? "#22402a" : "#9bc53d";                       // đồi xa
    ctx.beginPath(); ctx.moveTo(-50, 160); for (let x = -50; x <= W + 50; x += 20) ctx.lineTo(x, 104 + Math.sin(x * .03) * 14 + Math.sin(x * .011) * 10); ctx.lineTo(W + 50, 160); ctx.fill();
    // nhà kho đỏ + silo
    ctx.fillStyle = "#b23a48"; ctx.fillRect(16, 74, 96, 86);
    ctx.fillStyle = "#7d1d2b"; ctx.beginPath(); ctx.moveTo(8, 78); ctx.lineTo(64, 40); ctx.lineTo(120, 78); ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.strokeRect(44, 108, 40, 50); ctx.beginPath(); ctx.moveTo(44, 108); ctx.lineTo(84, 158); ctx.moveTo(84, 108); ctx.lineTo(44, 158); ctx.stroke();
    ctx.fillStyle = "#ffd166"; ctx.fillRect(58, 84, 12, 10);
    ctx.fillStyle = "#adb5bd"; rr(ctx, 122, 70, 26, 90, 6); ctx.fill(); ctx.fillStyle = "#6c757d"; ctx.beginPath(); ctx.arc(135, 72, 13, Math.PI, 0); ctx.fill();
    // cối xay gió quay chậm
    ctx.fillStyle = "#e9ecef"; ctx.beginPath(); ctx.moveTo(278, 160); ctx.lineTo(286, 70); ctx.lineTo(298, 70); ctx.lineTo(306, 160); ctx.fill();
    ctx.save(); ctx.translate(292, 70); ctx.rotate(t * .6); ctx.fillStyle = "#f8f9fa"; ctx.strokeStyle = "#868e96"; ctx.lineWidth = 1;
    for (let k = 0; k < 4; k++) { ctx.rotate(Math.PI / 2); ctx.fillRect(2, -4, 34, 8); ctx.strokeRect(2, -4, 34, 8); }
    ctx.restore(); ctx.fillStyle = "#495057"; ctx.beginPath(); ctx.arc(292, 70, 4, 0, 7); ctx.fill();
    // nền cỏ + đất ruộng
    ctx.fillStyle = "#7cb76b"; ctx.fillRect(-50, 160, W + 100, 1400);
    ctx.fillStyle = "#6aa55a"; for (let k = 0; k < 120; k++) ctx.fillRect((k * 71) % 360, 160 + (k * 137) % 440, 2, 5);
    ctx.fillStyle = "#8d6346"; rr(ctx, 6, 188, 348, 172, 8); ctx.fill();
    const now = nowS();
    PLOTS.forEach((r, i) => {
      const inf = plotInfo(S().farm[i]);
      ctx.fillStyle = inf.st === "grow" || inf.st === "ripe" ? "#5c3d2a" : "#7a5236"; rr(ctx, r.x, r.y, r.w, r.h, 6); ctx.fill();   // đất ướt sẫm màu
      ctx.strokeStyle = "rgba(0,0,0,.18)"; ctx.lineWidth = 1.5;
      for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(r.x + 6, r.y + k * r.h / 4); ctx.lineTo(r.x + r.w - 6, r.y + k * r.h / 4); ctx.stroke(); }
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      if (inf.st === "empty") { ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.font = "700 18px system-ui"; ctx.fillText("+", cx, cy); }
      else if (inf.st === "dry") {
        ctx.fillStyle = "#e9c46a"; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(r.x + 14 + (k % 3) * 22, r.y + 22 + (k / 3 | 0) * 24, 2, 0, 7); ctx.fill(); }
        ctx.font = "14px system-ui"; ctx.fillText("💧", cx, r.y + 10 + Math.sin(t * 4) * 2);
      } else {
        const k = inf.k, sway = Math.sin(t * 2 + i) * 1.5;
        for (let j = 0; j < 3; j++) {
          const px = r.x + 16 + j * 21, py = r.y + r.h - 12;
          if (k < .25) { ctx.font = "13px system-ui"; ctx.fillText("🌱", px, py - 4); continue; }
          const hgt = 10 + Math.min(1, k) * 26;
          ctx.strokeStyle = inf.c.leaf; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + sway, py - hgt); ctx.stroke();
          ctx.fillStyle = inf.c.leaf; ctx.beginPath(); ctx.ellipse(px - 4 + sway, py - hgt * .55, 5, 2.5, -.6, 0, 7); ctx.ellipse(px + 4 + sway, py - hgt * .75, 5, 2.5, .6, 0, 7); ctx.fill();
          if (k >= .6) { ctx.font = `${inf.st === "ripe" ? 18 : 10}px system-ui`; ctx.fillText(inf.c.e, px + sway, py - hgt - 4); }
        }
        if (inf.st === "ripe") { ctx.font = "10px system-ui"; ctx.fillStyle = `rgba(255,255,200,${.5 + Math.sin(t * 5 + i) * .5})`; ctx.fillText("✨", r.x + r.w - 8, r.y + 8); }
        else { ctx.fillStyle = "rgba(0,0,0,.35)"; rr(ctx, r.x + 8, r.y + r.h - 6, r.w - 16, 4, 2); ctx.fill(); ctx.fillStyle = "#80ed99"; rr(ctx, r.x + 8, r.y + r.h - 6, (r.w - 16) * k, 4, 2); ctx.fill(); }
      }
    });
    // hàng rào trắng
    ctx.fillStyle = "#f8f9fa"; ctx.fillRect(0, 368, W, 4); ctx.fillRect(0, 380, W, 4);
    for (let x = 4; x < W; x += 18) { if (x > 150 && x < 210) continue; rr(ctx, x, 360, 6, 30, 2); ctx.fill(); }
    // bù nhìn rơm
    ctx.fillStyle = "#6b4a35"; ctx.fillRect(178, 330, 4, 34); ctx.fillRect(166, 340, 28, 3);
    ctx.fillStyle = "#e9c46a"; ctx.beginPath(); ctx.arc(180, 328, 7, 0, 7); ctx.fill(); ctx.fillStyle = "#9c6644"; ctx.fillRect(172, 318, 16, 4); ctx.fillRect(175, 312, 10, 6);
    // giếng nước
    ctx.fillStyle = "#868e96"; ctx.beginPath(); ctx.ellipse(318, 410, 18, 8, 0, 0, 7); ctx.fill(); ctx.fillRect(300, 410, 36, 14);
    ctx.fillStyle = "#1d3557"; ctx.beginPath(); ctx.ellipse(318, 410, 13, 5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#6b4a35"; ctx.fillRect(301, 386, 3, 24); ctx.fillRect(332, 386, 3, 24); ctx.fillStyle = "#9c2c2c"; ctx.beginPath(); ctx.moveTo(296, 388); ctx.lineTo(318, 376); ctx.lineTo(340, 388); ctx.fill();
    // thùng gỗ dưới radio + xe cút kít
    ctx.fillStyle = "#9c6644"; ctx.fillRect(238, 422, 40, 18); ctx.strokeStyle = "#6b4a35"; ctx.strokeRect(238, 422, 40, 18);
    ctx.fillStyle = "#6c757d"; ctx.beginPath(); ctx.moveTo(110, 520); ctx.lineTo(146, 520); ctx.lineTo(140, 532); ctx.lineTo(114, 532); ctx.fill();
    ctx.fillStyle = "#333"; ctx.beginPath(); ctx.arc(116, 536, 4, 0, 7); ctx.fill();
    drawRadio(t);
    // chuồng gà (trái dưới) + chuồng bò (phải dưới)
    ctx.fillStyle = "#c9a36b"; rr(ctx, 8, 474, 84, 50, 4); ctx.fill(); ctx.fillStyle = "#9c6644"; ctx.beginPath(); ctx.moveTo(4, 478); ctx.lineTo(50, 456); ctx.lineTo(96, 478); ctx.fill();
    ctx.fillStyle = "#5c3d2a"; rr(ctx, 40, 498, 20, 26, 3); ctx.fill();
    ctx.strokeStyle = "#f8f9fa"; ctx.lineWidth = 2; ctx.strokeRect(262, 438, 92, 76);
    for (let k = 0; k < 2; k++) {                                        // bò
      const cx = 286 + k * 42 + Math.sin(t * .3 + k * 3) * 6, cy = 470 + k * 22;
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(cx, cy, 13, 8, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#222"; ctx.beginPath(); ctx.arc(cx - 4, cy - 2, 3, 0, 7); ctx.arc(cx + 5, cy + 2, 2.5, 0, 7); ctx.fill();
      ctx.fillStyle = "#f4d0c1"; ctx.beginPath(); ctx.ellipse(cx + 13, cy - 3 + Math.sin(t * 1.5 + k) * 1, 5, 4, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#222"; ctx.fillRect(cx - 9, cy + 6, 2, 5); ctx.fillRect(cx + 7, cy + 6, 2, 5);
    }
    for (let k = 0; k < 5; k++) {                                        // gà + gà con đi lại
      const chick = k > 2, cx = 30 + ((t * (chick ? 9 : 6) + k * 47) % 110), cy = 540 + Math.sin(t + k * 2) * 10 - (k % 2) * 8;
      const sz = chick ? .6 : 1, flip = Math.sin(t * .5 + k) > 0 ? 1 : -1;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(sz * flip, sz);
      ctx.fillStyle = chick ? "#ffd60a" : "#fff"; ctx.beginPath(); ctx.ellipse(0, 0, 6, 5, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(5, -5, 3.5, 0, 7); ctx.fill();
      if (!chick) { ctx.fillStyle = "#e63946"; ctx.fillRect(4, -10, 3, 3); }
      ctx.fillStyle = "#f4a261"; ctx.fillRect(8, -5, 3, 1.6); ctx.restore();
    }
    for (let k = 0; k < 3; k++) {                                        // bướm
      const bx = (t * 18 + k * 120) % 380 - 10, byy = 230 + k * 50 + Math.sin(t * 2 + k) * 20, f = Math.abs(Math.sin(t * 10 + k)) * 3 + 1;
      ctx.fillStyle = ["#ff8fab", "#ffd166", "#a0c4ff"][k]; ctx.beginPath(); ctx.ellipse(bx - 2, byy, f, 3, 0, 0, 7); ctx.ellipse(bx + 2, byy, f, 3, 0, 0, 7); ctx.fill();
    }
  }
  function haySeat(i, t) {
    const b = BEDS[i], o = bedOwner(i), sit = o && o.lying;
    if (sit) drawPlayer({...o, x: b.x + 28, y: b.y + 26, walking: false, up: false}, t);
    ctx.fillStyle = "#e9c46a"; rr(ctx, b.x, b.y + 14, b.w || BED_W, 22, 5); ctx.fill();
    ctx.strokeStyle = "#c9a227"; ctx.lineWidth = 1; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(b.x + 4, b.y + 18 + k * 5); ctx.lineTo(b.x + BED_W - 4, b.y + 18 + k * 5); ctx.stroke(); }
    ctx.fillStyle = "#9c6644"; ctx.fillRect(b.x + 14, b.y + 14, 3, 22); ctx.fillRect(b.x + BED_W - 17, b.y + 14, 3, 22);
  }
  function tapPlot(i) {
    const st = S(), pl = st.farm[i], inf = plotInfo(pl);
    if (inf.st === "empty") return openSeeds(i);
    if (inf.st === "dry") { pl.w = nowS(); Life.apply({xp: 1}); Life.commit(); toast(`💧 Đã tưới ${inf.c.name}! Chín sau ${fmtTime(inf.c.time)}`); return; }
    if (inf.st === "grow") { toast(`${inf.c.e} ${inf.c.name} đang lớn… còn ${fmtTime(inf.left)}`); return; }
    const n = 2 + (Math.random() < .3 ? 1 : 0);                          // thu hoạch 2-3 quả
    Life.addItem({id: "crop_" + inf.c.id, e: inf.c.e, name: inf.c.name, sell: inf.c.sell}, n, "crop");
    st.farm[i] = null; Life.apply({xp: inf.c.xp, fun: 4}); Life.commit();
    toast(`🧺 Thu hoạch ${n} ${inf.c.e} ${inf.c.name}! Mang ra bác Năm bán nhé`);
  }
  function openSeeds(i) {
    const st = S();
    openSheet("🌱 Gieo hạt",
      `${Life.coinLine()}<div class="grid">${CROPS.map(c => {
        const have = (st.inv["seed_" + c.id] || {}).n || 0;
        return `<button class="opt" data-c="${c.id}">${c.e} ${c.name}<small>${have ? `có ${have} hạt` : `mua ${c.seed} 💰`} · chín sau ${fmtTime(c.time)} · bán ${c.sell} 💰</small></button>`;
      }).join("")}</div><div class="vol" style="font-size:12px">Gieo xong nhớ chạm lần nữa để 💧 tưới thì cây mới lớn.</div>`,
      el => el.querySelectorAll("[data-c]").forEach(b => b.onclick = () => {
        const c = CR[b.dataset.c];
        if (!Life.takeItem("seed_" + c.id) && !Life.pay(c.seed)) return;
        st.farm[i] = {c: c.id, p: nowS(), w: 0}; Life.apply({xp: 1}); Life.commit(); closeSheet();
        toast(`🌱 Đã gieo ${c.name}. Chạm ô đất để 💧 tưới nước!`);
      }));
  }
  function openFarmer() {
    const st = S(), crops = Object.entries(st.inv).filter(([, x]) => x.cat === "crop" && x.n > 0);
    const total = crops.reduce((s, [, x]) => s + x.n * (x.sell || 0), 0);
    openSheet("🧑‍🌾 Bác Năm",
      `${Life.coinLine()}<div class="sec">🧺 Bán nông sản</div>
       ${crops.length ? `<div class="board">${crops.map(([, x]) => `<div><span>${x.e} ${esc(x.name)} ×${x.n}</span><b>${x.n * x.sell} 💰</b></div>`).join("")}</div>
       <button class="primary" id="sellAll" style="margin-top:8px">Bán hết (+${total} 💰)</button>` : `<div class="vol" style="margin:0">Chưa có nông sản. Trồng rau rồi thu hoạch nhé!</div>`}
       <div class="sec">🌱 Mua hạt giống (cất vào rương)</div>
       <div class="grid">${CROPS.map(c => `<button class="opt" data-c="${c.id}">${c.e} Hạt ${c.name}<small>${c.seed} 💰 · có ${(st.inv["seed_" + c.id] || {}).n || 0}</small></button>`).join("")}</div>`,
      el => {
        const sa = el.querySelector("#sellAll");
        if (sa) sa.onclick = () => { crops.forEach(([id]) => delete st.inv[id]); Life.apply({coins: total, xp: Math.ceil(total / 20)}); Life.commit(); closeSheet(); toast(`💰 Bán được ${total} xu!`); };
        el.querySelectorAll("[data-c]").forEach(b => b.onclick = () => {
          const c = CR[b.dataset.c]; if (!Life.pay(c.seed)) return;
          Life.addItem({id: "seed_" + c.id, e: "🌱", name: "Hạt " + c.name}, 1, "seed"); Life.commit(); openFarmer();
        });
      });
  }

  // ---------- 6. Hồ câu cá ----------
  let fishState = null;                                                  // {seat, phase: wait|bite, at}
  const SWIM = FISH.filter(f => f.id !== "boot").slice(0, 7);
  function drawFishing(t) {
    const night = Life.darkness() > .5;
    const g = ctx.createLinearGradient(0, -400, 0, 80);                  // trời hoàng hôn / đêm
    if (night) { g.addColorStop(0, "#060a22"); g.addColorStop(1, "#2b2d6b"); } else { g.addColorStop(0, "#f28482"); g.addColorStop(1, "#ffd6a5"); }
    ctx.fillStyle = g; ctx.fillRect(-50, -400, W + 100, 480);
    const M = LAYOUT.moon;
    ctx.fillStyle = night ? "#fff6c8" : "#ffb703"; ctx.beginPath(); ctx.arc(M.x, M.y + 20, night ? 11 : 18, 0, 7); ctx.fill();
    ctx.fillStyle = night ? "#1b2a3a" : "#c08497"; ctx.beginPath(); ctx.moveTo(-50, 84);
    for (let x = -50; x <= W + 50; x += 20) ctx.lineTo(x, 60 + Math.sin(x * .025) * 12); ctx.lineTo(W + 50, 84); ctx.fill();
    // mặt hồ phản chiếu trời
    const wg = ctx.createLinearGradient(0, 80, 0, 334);
    if (night) { wg.addColorStop(0, "#1b2a5a"); wg.addColorStop(1, "#0d1b3a"); } else { wg.addColorStop(0, "#f7b2a0"); wg.addColorStop(.35, "#7ec8e3"); wg.addColorStop(1, "#3a86c8"); }
    ctx.fillStyle = wg; ctx.fillRect(-50, 80, W + 100, 254);
    ctx.fillStyle = night ? "rgba(255,246,200,.25)" : "rgba(255,183,3,.35)";
    for (let k2 = 0; k2 < 7; k2++) ctx.fillRect(M.x - 16 + Math.sin(t * 2 + k2) * 4, 96 + k2 * 10, 32 - k2 * 3, 2);
    ctx.strokeStyle = "rgba(255,255,255,.25)"; ctx.lineWidth = 1;
    for (let k2 = 0; k2 < 14; k2++) { const wx = (k2 * 67 + t * 6) % 380 - 10, wy = 110 + (k2 * 41) % 210; ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + 14, wy); ctx.stroke(); }
    // cá bơi dưới nước
    SWIM.forEach((f, i) => {
      const dir = i % 2 ? 1 : -1, fx = (((t * (10 + i * 2) * dir + i * 90) % 400) + 400) % 400 - 20, fy = 140 + i * 24 + Math.sin(t + i) * 6;
      ctx.save(); ctx.translate(fx, fy); ctx.scale(dir, 1); ctx.globalAlpha = .55;
      ctx.fillStyle = f.color; ctx.beginPath(); ctx.ellipse(0, 0, 8, 3.5, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-12, -3.5 + Math.sin(t * 8 + i) * 1.5); ctx.lineTo(-12, 3.5 + Math.sin(t * 8 + i) * 1.5); ctx.fill();
      ctx.restore(); ctx.globalAlpha = 1;
    });
    // lá sen + hoa sen, lau sậy
    [[40, 140], [300, 170], [250, 120], [70, 230], [330, 250]].forEach(([x, y], i) => {
      ctx.fillStyle = "#52b788"; ctx.beginPath(); ctx.arc(x, y, 9, .3, 6); ctx.lineTo(x, y); ctx.fill();
      if (i % 2 === 0) { ctx.fillStyle = "#ffafcc"; ctx.beginPath(); ctx.ellipse(x + 2, y - 3, 3, 5, 0, 0, 7); ctx.ellipse(x - 2, y - 2, 3, 5, -.5, 0, 7); ctx.ellipse(x + 5, y - 2, 3, 5, .5, 0, 7); ctx.fill(); }
    });
    for (const rx of [6, 14, 22, 340, 348]) { ctx.strokeStyle = "#6a994e"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(rx, 336); ctx.quadraticCurveTo(rx + Math.sin(t + rx) * 4, 300, rx + Math.sin(t + rx) * 6, 270); ctx.stroke(); ctx.fillStyle = "#7f4f24"; ctx.fillRect(rx + Math.sin(t + rx) * 6 - 2, 266, 4, 10); }
    // cầu gỗ dài ra giữa hồ
    ctx.fillStyle = "#6b4a35"; for (const px of [162, 196]) for (let py = 150; py < 330; py += 44) ctx.fillRect(px, py, 4, 14);
    ctx.fillStyle = "#a47148"; ctx.fillRect(160, 138, 42, 196);
    ctx.fillStyle = "rgba(0,0,0,.15)"; for (let py = 142; py < 334; py += 9) ctx.fillRect(160, py, 42, 1.5);
    // chuồn chuồn
    for (let k2 = 0; k2 < 2; k2++) { const dx = 60 + k2 * 200 + Math.sin(t * .7 + k2 * 3) * 50, dy = 200 + Math.sin(t * 1.3 + k2) * 30; ctx.fillStyle = "#4361ee"; ctx.fillRect(dx - 5, dy, 10, 1.6); ctx.fillStyle = "rgba(200,230,255,.7)"; ctx.fillRect(dx - 2, dy - 3, 4, 2); ctx.fillRect(dx - 2, dy + 2, 4, 2); }
    // bờ cát + cỏ
    ctx.fillStyle = "#e9d8a6"; ctx.fillRect(-50, 330, W + 100, 26);
    ctx.fillStyle = "rgba(255,255,255,.4)"; ctx.fillRect(-50, 330, W + 100, 2 + Math.sin(t * 2));
    ctx.fillStyle = "#74b566"; ctx.fillRect(-50, 356, W + 100, 1400);
    ctx.fillStyle = "#64a456"; for (let k2 = 0; k2 < 90; k2++) ctx.fillRect((k2 * 71) % 360, 360 + (k2 * 137) % 220, 2, 5);
    // quầy bán mồi
    ctx.fillStyle = "#9c6644"; ctx.fillRect(256, 404, 4, 46); ctx.fillRect(342, 404, 4, 46);
    ctx.fillStyle = "#e76f51"; ctx.beginPath(); ctx.moveTo(250, 412); ctx.lineTo(260, 394); ctx.lineTo(342, 394); ctx.lineTo(352, 412); ctx.fill();
    ctx.fillStyle = "#fff"; for (let x = 262; x < 342; x += 16) ctx.fillRect(x, 396, 8, 15);
    ctx.fillStyle = "#c9a36b"; rr(ctx, 258, 444, 86, 14, 3); ctx.fill();
    ctx.fillStyle = "#264653"; ctx.font = "800 8px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("🐛 MỒI CÂU · MUA CÁ", 300, 386);
    // ghế xếp + xô cá + bàn để radio
    ctx.fillStyle = "#4361ee"; rr(ctx, 98, 410, 30, 6, 2); ctx.fill(); ctx.strokeStyle = "#adb5bd"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(100, 432); ctx.lineTo(126, 412); ctx.moveTo(126, 432); ctx.lineTo(100, 412); ctx.stroke();
    ctx.fillStyle = "#adb5bd"; ctx.beginPath(); ctx.moveTo(140, 416); ctx.lineTo(160, 416); ctx.lineTo(157, 434); ctx.lineTo(143, 434); ctx.fill(); ctx.fillStyle = "#4895ef"; ctx.fillRect(142, 417, 16, 3);
    ctx.fillStyle = "#6b4a35"; ctx.fillRect(18, 438, 52, 5); ctx.fillRect(22, 443, 3, 16); ctx.fillRect(63, 443, 3, 16);
    drawRadio(t);
  }
  function fishSeat(i, t) {
    const b = BEDS[i], o = bedOwner(i), sit = o && o.lying, sx = b.x + 35, sy = b.y + 44;
    ctx.fillStyle = "#8d6346"; rr(ctx, sx - 10, sy - 6, 20, 6, 2); ctx.fill(); ctx.fillRect(sx - 8, sy, 3, 8); ctx.fillRect(sx + 5, sy, 3, 8);
    if (!sit) { ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.font = "11px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("🎣", sx, sy - 16); return; }
    const mine = o.id === myId && fishState && fishState.seat === i, bite = mine && fishState.phase === "bite";
    const bx = sx + 16, by = b.y - 30 + (bite ? 3 + Math.sin(t * 30) * 2 : Math.sin(t * 2 + i) * 1.2);
    ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(bx, by + 3, 6 + (t * 6 % 5), 2, 0, 0, 7); ctx.stroke();
    drawPlayer({...o, x: sx, y: sy, walking: false, up: true}, t);
    ctx.strokeStyle = "#5c3d2a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx + 6, sy - 18); ctx.lineTo(sx + 22, sy - 66); ctx.stroke();   // cần câu
    ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(sx + 22, sy - 66); ctx.quadraticCurveTo(bx + 4, by - 20, bx, by); ctx.stroke();
    ctx.fillStyle = "#e63946"; ctx.beginPath(); ctx.arc(bx, by, 2.6, Math.PI, 0); ctx.fill(); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(bx, by, 2.6, 0, Math.PI); ctx.fill();
    if (bite) { ctx.font = "700 14px system-ui"; ctx.fillStyle = "#ffd166"; ctx.fillText("❗", bx, by - 14); }
  }
  function openFishing() {
    const m = me();
    if (!m || m.bed == null || !m.lying) { toast("🎣 Chạm vào một ghế đẩu bên bờ hồ để ngồi câu trước nhé"); return; }
    const st = S(), baits = BAITS.filter(b => (st.bait[b.id] || 0) > 0);
    if (!baits.length) { toast("🐛 Hết mồi rồi! Mua mồi ở quầy của cô Lan"); openBait(); return; }
    openSheet("🎣 Câu cá",
      `<div class="vol" style="margin:0 0 10px">Chọn mồi rồi chờ phao chìm. Thấy <b>❗ CÁ CẮN</b> thì bấm <b>KÉO</b> thật nhanh!</div>
       <div class="grid">${baits.map(b => `<button class="opt" data-b="${b.id}">${b.e} ${b.name}<small>còn ${st.bait[b.id]} · ${b.rare > 1 ? "dễ ra cá hiếm" : "mồi thường"}</small></button>`).join("")}</div>`,
      el => el.querySelectorAll("[data-b]").forEach(btn => btn.onclick = () => castLine(BAITS.find(b => b.id === btn.dataset.b))));
  }
  function castLine(bait) {
    const st = S(), m = me();
    if (!m || m.bed == null) return;
    st.bait[bait.id]--; Life.commit();
    const seat = m.bed;
    fishState = {seat, phase: "wait"};
    let timers = [];
    const clear = () => { timers.forEach(clearTimeout); timers = []; };
    const end = (html) => {
      clear(); fishState = null;
      openSheet("🎣 Câu cá", `${html}<div class="grid" style="margin-top:12px"><button class="opt" id="again" style="text-align:center">🎣 Câu tiếp</button><button class="opt" id="stop" style="text-align:center">✓ Nghỉ</button></div>`,
        el => { el.querySelector("#again").onclick = openFishing; el.querySelector("#stop").onclick = closeSheet; });
    };
    openSheet("🎣 Đang câu…", `<div class="wheelBig" id="fz">🎣</div><div class="pomoSub" id="ft">Đang chờ cá cắn… kiên nhẫn nhé</div>
      <button class="primary" id="pull">KÉO!</button>`, el => {
      const pull = el.querySelector("#pull");
      pull.onclick = () => {
        if (!fishState) return;
        if (fishState.phase === "wait") return end(`<div class="wheelBig">💨</div><div class="pomoSub">Giật sớm quá, cá chạy mất rồi 😅</div>`);
        const fish = roll(FISH, f => f.w * (f.rare ? bait.rare : 1));
        Life.addItem({id: "fish_" + fish.id, e: fish.e, name: fish.name, sell: fish.price}, 1, "fish");
        Life.apply({fun: 6, xp: fish.rare ? 8 : 3}); Life.commit();
        if (fish.rare) send({t: "emote", e: "😂"});
        end(`<div class="wheelBig">${fish.e}</div><div class="pomoSub">Câu được <b style="color:var(--accent)">${fish.name}</b>${fish.rare ? " ✨ hiếm!" : ""} · bán được ${fish.price} 💰</div>`);
      };
      timers.push(setTimeout(() => {
        if (!fishState) return;
        fishState.phase = "bite"; Sound.ensure(); if (Sound.ctx) Sound.tone(Sound.master, 880, Sound.ctx.currentTime, .15, "square", .05);
        if (pull.isConnected) { el.querySelector("#fz").textContent = "❗"; el.querySelector("#ft").innerHTML = "<b style='color:var(--accent)'>CÁ CẮN! BẤM KÉO NGAY!</b>"; pull.style.background = "#ff4d6d"; pull.style.color = "#fff"; }
        timers.push(setTimeout(() => { if (fishState && fishState.phase === "bite") end(`<div class="wheelBig">🌊</div><div class="pomoSub">Chậm quá, cá ăn mồi rồi bơi mất…</div>`); }, 1400));
      }, 2000 + Math.random() * 4000));
    });
  }
  function openBait() {
    const st = S(), fish = Object.entries(st.inv).filter(([, x]) => x.cat === "fish" && x.n > 0);
    const total = fish.reduce((s, [, x]) => s + x.n * (x.sell || 0), 0);
    openSheet("🐛 Quầy cô Lan",
      `${Life.coinLine()}<div class="sec">Mua mồi câu</div>
       <div class="grid">${BAITS.map(b => `<button class="opt" data-b="${b.id}">${b.e} ${b.name} ×${b.pack}<small>${b.price} 💰 · đang có ${st.bait[b.id] || 0}</small></button>`).join("")}</div>
       <div class="sec">🐟 Bán cá</div>
       ${fish.length ? `<div class="board">${fish.map(([, x]) => `<div><span>${x.e} ${esc(x.name)} ×${x.n}</span><b>${x.n * x.sell} 💰</b></div>`).join("")}</div>
       <button class="primary" id="sellFish" style="margin-top:8px">Bán hết (+${total} 💰)</button>` : `<div class="vol" style="margin:0">Chưa có cá nào để bán.</div>`}`,
      el => {
        el.querySelectorAll("[data-b]").forEach(btn => btn.onclick = () => {
          const b = BAITS.find(x => x.id === btn.dataset.b); if (!Life.pay(b.price)) return;
          st.bait[b.id] = (st.bait[b.id] || 0) + b.pack; Life.commit(); openBait();
        });
        const sf = el.querySelector("#sellFish");
        if (sf) sf.onclick = () => { fish.forEach(([id]) => delete st.inv[id]); Life.apply({coins: total, xp: Math.ceil(total / 20)}); Life.commit(); closeSheet(); toast(`💰 Bán cá được ${total} xu!`); };
      });
  }

  // ---------- 7. Khu mua sắm ----------
  const STORE_R = MALL_STORES.map((s, k) => ({...s, x: k * 72, y: 18, w: 72, h: 142}));
  function drawMall(t) {
    ctx.fillStyle = "#fde2e4"; ctx.fillRect(-50, -400, W + 100, 565);
    ctx.fillStyle = "#fff"; for (let x = 0; x < W; x += 30) ctx.fillRect(x, -10, 2, 28);
    STORE_R.forEach(s => {                                               // mặt tiền từng cửa hàng
      ctx.fillStyle = "#fff"; ctx.fillRect(s.x + 2, s.y, s.w - 4, s.h);
      ctx.fillStyle = s.c1; ctx.fillRect(s.x + 2, s.y, s.w - 4, 22);
      ctx.fillStyle = "#fff"; ctx.font = "800 8px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(`${s.e} ${s.name.toUpperCase()}`, s.x + s.w / 2, s.y + 11);
      const g = ctx.createLinearGradient(0, s.y + 26, 0, s.y + s.h); g.addColorStop(0, s.c2); g.addColorStop(1, "#ffffff");
      ctx.fillStyle = g; ctx.fillRect(s.x + 6, s.y + 26, s.w - 12, s.h - 30);
      ctx.fillStyle = `rgba(255,255,255,${.35 + Math.sin(t * 1.5 + s.x) * .1})`; ctx.beginPath(); ctx.moveTo(s.x + 10, s.y + 30); ctx.lineTo(s.x + 24, s.y + 30); ctx.lineTo(s.x + 14, s.y + 130); ctx.lineTo(s.x + 8, s.y + 130); ctx.fill();
      ctx.font = "22px system-ui";
      const show = {fashion: "👗", acc: "👒", pet: "🐹", hair: "💈", deco: "🛋️"}[s.id];
      ctx.fillText(show, s.x + s.w / 2, s.y + 72 + Math.sin(t * 2 + s.x) * 2);
      ctx.font = "13px system-ui"; ctx.fillText({fashion: "👕👚", acc: "🕶️🎀", pet: "🐱🐶", hair: "✂️💇", deco: "🖼️🛏️"}[s.id], s.x + s.w / 2, s.y + 108);
      ctx.fillStyle = "rgba(0,0,0,.08)"; ctx.fillRect(s.x + 6, s.y + s.h - 6, s.w - 12, 4);
    });
    // sàn gạch bóng
    for (let y = 160, r = 0; y < 640; y += 30, r++) for (let x = 0, c = r % 2; x < W; x += 30, c ^= 1) { ctx.fillStyle = c ? "#f8f0e3" : "#ece0cc"; ctx.fillRect(x, y, 30, 30); }
    ctx.fillStyle = "rgba(255,255,255,.35)"; for (let k = 0; k < 4; k++) ctx.fillRect(40 + k * 90, 170, 18, 380);
    // quầy thu ngân (phía sau chị Thu)
    ctx.fillStyle = "#cdb4db"; rr(ctx, 120, 198, 120, 36, 6); ctx.fill();
    ctx.fillStyle = "#9d4edd"; rr(ctx, 120, 192, 120, 10, 4); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "800 8px system-ui"; ctx.fillText("THU NGÂN · VÉ SỐ 🎫", 180, 197);
    ctx.font = "14px system-ui"; ctx.fillText("🧾", 140, 216); ctx.fillText("💳", 222, 216);
    // ma-nơ-canh mặc đồ
    [[40, 250, {shirt: "shirt_navy", hat: "hat_beanie", neck: "neck_scarf"}], [320, 250, {shirt: "shirt_suit", hat: "hat_crown", back: "back_angel"}]].forEach(([x, y, o]) => {
      ctx.fillStyle = "#adb5bd"; ctx.fillRect(x - 1, y, 2, 14); ctx.fillRect(x - 10, y + 12, 20, 3);
      drawAvatar({x, y: y + 2, color: "#e9ecef", outfit: {...o, hair: "hair_short", hairColor: "hc_silver", glasses: "gl_none"}, walking: false, up: false}, 0);
    });
    // đảo trưng bày + chậu cây
    [[70, 340], [290, 340]].forEach(([x, y], k) => {
      ctx.fillStyle = "#fff"; rr(ctx, x - 34, y - 10, 68, 26, 6); ctx.fill(); ctx.strokeStyle = "#e0c3fc"; ctx.lineWidth = 2; ctx.stroke();
      ctx.font = "14px system-ui"; ctx.fillText(k ? "👠👜💍" : "🧸🎁🕶️", x, y + 2);
      ctx.fillStyle = `rgba(255,240,180,${.25 + Math.sin(t * 3 + k) * .15})`; ctx.beginPath(); ctx.ellipse(x, y - 14, 30, 6, 0, 0, 7); ctx.fill();
    });
    for (const px of [16, 344]) { ctx.fillStyle = "#e5e5e5"; rr(ctx, px - 10, 390, 20, 18, 3); ctx.fill(); ctx.fillStyle = "#52b788"; ctx.beginPath(); ctx.arc(px, 380, 12, 0, 7); ctx.arc(px - 7, 372, 7, 0, 7); ctx.arc(px + 7, 372, 7, 0, 7); ctx.fill(); }
    ctx.fillStyle = "#ffafcc"; rr(ctx, 152, 392, 56, 20, 5); ctx.fill();          // quầy nhạc nhỏ dưới radio
    drawRadio(t);
  }
  function mallBench(i, t) {
    const b = BEDS[i], o = bedOwner(i), sit = o && o.lying;
    ctx.fillStyle = "#9d4edd"; rr(ctx, b.x + 4, b.y + 8, BED_W - 8, 10, 4); ctx.fill();
    if (sit) drawPlayer({...o, x: b.x + BED_W / 2, y: b.y + 30, walking: false, up: false}, t);
    ctx.fillStyle = "#c77dff"; rr(ctx, b.x, b.y + 22, BED_W, 12, 5); ctx.fill();
    ctx.fillStyle = "#adb5bd"; ctx.fillRect(b.x + 8, b.y + 34, 4, 8); ctx.fillRect(b.x + BED_W - 12, b.y + 34, 4, 8);
  }

  // ---------- 8. Tủ đồ thời trang + cửa hàng ----------
  function owns(id) {
    const c = CL[id]; if (!c) return false;
    if (!c.price) return true;
    const v = S().owned[id];
    return v === 0 || (v && v > Date.now());
  }
  function ownLabel(id) {
    const v = S().owned[id];
    if (v === 0) return "vĩnh viễn";
    if (v > Date.now()) return `còn ${Math.ceil((v - Date.now()) / 3600000)} giờ`;
    return "hết hạn";
  }
  function cleanOutfit() {                                               // bỏ đồ thuê đã hết hạn
    const o = S().outfit; let changed = false;
    for (const k of Object.keys(DEFAULT_OUTFIT)) {
      if (o[k] === undefined || (o[k] && !owns(o[k]))) { o[k] = DEFAULT_OUTFIT[k]; changed = true; }
    }
    if (changed) Life.commit();
    return o;
  }
  function equip(slot, id) {
    S().outfit[slot] = id; Life.commit();
    send({t: "outfit", outfit: S().outfit});
    const m = me(); if (m) m.outfit = {...S().outfit};
  }
  function preview(el) {
    const cv = el.querySelector("#pv"); if (!cv) return;
    const pc = cv.getContext("2d"), saved = ctx;
    pc.setTransform(1, 0, 0, 1, 0, 0); pc.clearRect(0, 0, cv.width, cv.height);
    pc.setTransform(2.4, 0, 0, 2.4, 0, 0);
    ctx = pc;                                                            // vẽ avatar lên canvas xem trước
    try { drawAvatar({x: 30, y: 52, color: myColor, outfit: S().outfit, walking: false, up: false}, performance.now() / 1000); }
    finally { ctx = saved; }
  }
  let wardTab = "hat";
  function openWardrobe(tab) {
    if (tab) wardTab = tab;
    cleanOutfit();
    const o = S().outfit;
    const items = wardTab === "shirt" ? [{id: "", e: "🩱", name: "Bộ pyjama", price: 0}, ...CLOTHES.filter(c => c.slot === "shirt")] : CLOTHES.filter(c => c.slot === wardTab);
    openSheet("👗 Tủ đồ",
      `<div style="display:flex;justify-content:center"><canvas id="pv" width="144" height="150" style="background:radial-gradient(#3a3470,#1d1a38);border-radius:16px"></canvas></div>
       <div class="tabs">${WARDROBE_TABS.map(tb => `<button class="${tb.slot === wardTab ? "cur" : ""}" data-tab="${tb.slot}">${tb.e}<span>${tb.name}</span></button>`).join("")}</div>
       <div class="grid">${items.map(c => {
         const has = c.id === "" || owns(c.id), on = o[wardTab] === c.id;
         return `<button class="opt ${on ? "active" : ""} ${has ? "" : "poor"}" data-id="${c.id}">${c.e} ${c.name}<small>${on ? "✓ đang mặc" : has ? (c.price ? ownLabel(c.id) : "miễn phí") : `mua ở khu mua sắm · ${c.price} 💰`}</small></button>`;
       }).join("")}</div>
       <div class="vol" style="font-size:12px">Mua thêm đồ ở 🛍️ Khu mua sắm (Đông Nam công viên). Đồ thuê theo ngày tự cởi khi hết hạn.</div>`,
      el => {
        preview(el);
        el.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => openWardrobe(b.dataset.tab));
        el.querySelectorAll("[data-id]").forEach(b => b.onclick = () => {
          const id = b.dataset.id;
          if (id && !owns(id)) { toast(`Chưa có món này. Ghé 🛍️ khu mua sắm nhé!`); return; }
          equip(wardTab, id); openWardrobe();
        });
      });
  }
  function openStore(store) {
    if (store.id === "pet") return openPetShop();
    if (store.id === "deco") return openDecoShop();
    const items = CLOTHES.filter(c => store.slots.includes(c.slot) && c.price > 0);
    openSheet(`${store.e} ${store.name}`,
      `${Life.coinLine()}<div class="grid">${items.map(c => {
        const perm = S().owned[c.id] === 0, rent = Math.ceil(c.price / RENT_FACTOR);
        return `<div class="opt" style="display:flex;flex-direction:column;gap:6px">${c.e} ${c.name}
          ${perm ? `<button class="mini" data-wear="${c.id}">✓ Đã có · Mặc</button>`
                 : `<button class="mini" data-buy="${c.id}">Mua ${c.price} 💰</button><button class="mini ghostb" data-rent="${c.id}">Thuê 1 ngày ${rent} 💰${owns(c.id) ? " (gia hạn)" : ""}</button>`}</div>`;
      }).join("")}</div>`,
      el => {
        const done = (c, msg) => { equip(c.slot, c.id); Life.apply({xp: 2, fun: 5}); Life.commit(); toast(msg); openStore(store); };
        el.querySelectorAll("[data-buy]").forEach(b => b.onclick = () => { const c = CL[b.dataset.buy]; if (!Life.pay(c.price)) return; S().owned[c.id] = 0; done(c, `${c.e} Đã mua ${c.name} (vĩnh viễn) và mặc luôn!`); });
        el.querySelectorAll("[data-rent]").forEach(b => b.onclick = () => {
          const c = CL[b.dataset.rent]; if (!Life.pay(Math.ceil(c.price / RENT_FACTOR))) return;
          const base = Math.max(Date.now(), S().owned[c.id] || 0); S().owned[c.id] = base + 86400000;
          done(c, `${c.e} Đã thuê ${c.name} 1 ngày!`);
        });
        el.querySelectorAll("[data-wear]").forEach(b => b.onclick = () => { const c = CL[b.dataset.wear]; equip(c.slot, c.id); toast(`${c.e} Đã mặc ${c.name}`); });
      });
  }
  function openPetShop() {
    openSheet("🐾 Tiệm thú cưng",
      `${Life.coinLine()}<div class="grid">${PET_SHOP.map(p => `<button class="opt ${myPet.type === p.id ? "active" : ""}" data-p="${p.id}">${p.e} ${p.name}<small>${myPet.type === p.id ? "đang nuôi" : p.price + " 💰"}</small></button>`).join("")}
       <button class="opt" id="treat">${PET_TREAT.e} ${PET_TREAT.name}<small>${PET_TREAT.price} 💰 · 😊+${PET_TREAT.fun}</small></button></div>
       <div class="vol" style="font-size:12px">Nhận nuôi bé mới thì bé cũ về nhà nghỉ nhé 🏡</div>`,
      el => {
        el.querySelectorAll("[data-p]").forEach(b => b.onclick = () => {
          const p = PET_SHOP.find(x => x.id === b.dataset.p);
          if (myPet.type === p.id) return;
          if (!Life.pay(p.price)) return;
          myPet.type = p.id; myPet.name = PETS[p.id].def;
          localStorage.setItem("nc_pet", p.id); localStorage.setItem("nc_petname", "");
          send({t: "pet", pet: {type: p.id, name: ""}}); Life.apply({fun: 15, xp: 3}); Life.commit(); closeSheet();
          toast(`${p.e} Chào mừng bé ${PETS[p.id].def} về với bạn!`);
        });
        el.querySelector("#treat").onclick = () => {
          if (myPet.type === "none") { toast("Bạn chưa nuôi thú cưng nào"); return; }
          if (!Life.pay(PET_TREAT.price)) return;
          Life.apply({fun: PET_TREAT.fun}); Life.commit(); send({t: "pat", target: myId}); closeSheet(); toast("🦴 Bé ăn ngon lành, vẫy đuôi rối rít!");
        };
      });
  }
  function openDecoShop() {
    openSheet("🛋️ Cửa hàng nội thất",
      `${Life.coinLine()}${Life.shopGrid(FURNITURE.map(f => ({...f, keep: true})))}
       <div class="vol" style="font-size:12px">Đồ mua xong cất vào rương. Về 🏠 nhà riêng (cửa trái khu mua sắm) bấm 🛋️ Bày đồ để đặt.</div>`,
      el => el.querySelectorAll(".shopit").forEach(b => b.onclick = () => {
        const f = FU[b.dataset.id]; if (!Life.pay(f.price)) return;
        Life.addItem({id: f.id, e: f.e, name: f.name}, 1, "deco"); Life.apply({xp: 2}); Life.commit(); openDecoShop();
        toast(`${f.e} Đã mua ${f.name}, cất trong rương`);
      }));
  }
  function openCashier() {
    openSheet("🛍️ Khu mua sắm",
      `${Life.coinLine()}<div class="grid">${MALL_STORES.map(s => `<button class="opt" data-s="${s.id}">${s.e} ${s.name}</button>`).join("")}
       <button class="opt" id="lotto">🎫 Vé số<small>${LOTTERY.price} 💰 · cào trúng ngay</small></button></div>`,
      el => {
        el.querySelectorAll("[data-s]").forEach(b => b.onclick = () => openStore(STORE_R.find(s => s.id === b.dataset.s)));
        el.querySelector("#lotto").onclick = () => {
          if (!Life.pay(LOTTERY.price)) return;
          const p = roll(LOTTERY.PRIZES, x => x.w);
          Life.apply({coins: p.coins || 0, fun: 3}); Life.commit();
          openSheet("🎫 Vé số", `<div class="wheelBig">${p.coins ? (p.coins >= 200 ? "🤑" : "🎉") : "🍀"}</div><div class="pomoSub">${p.text}</div>
            <div class="grid"><button class="opt" id="more" style="text-align:center">🎫 Mua tờ nữa</button><button class="opt" id="ok" style="text-align:center">✓ Xong</button></div>`,
            e2 => { e2.querySelector("#more").onclick = openCashier; e2.querySelector("#ok").onclick = closeSheet; });
          if (p.coins >= 200) send({t: "emote", e: "😂"});
        };
      });
  }

  // ---------- 9. Nhà riêng: nội thất do cả nhóm bày, server lưu lại ----------
  let homeItems = [], placing = null;
  function drawHome(t) {
    drawWall("#f3e9dc");
    ctx.fillStyle = "rgba(200,160,120,.12)"; for (let x = 0; x < W; x += 24) ctx.fillRect(x, -10, 10, 170);
    drawWoodFloor("#c08552", "#b87c4a", "#c88d5a");
    ctx.fillStyle = "#8a5a3c"; ctx.fillRect(-50, 156, W + 100, 8);
    const night = Life.darkness() > .5;                                  // cửa sổ nhìn ra trời theo giờ game
    ctx.fillStyle = "#6b4a35"; rr(ctx, 130, 26, 100, 88, 6); ctx.fill();
    const g = ctx.createLinearGradient(0, 32, 0, 108); if (night) { g.addColorStop(0, "#0b1033"); g.addColorStop(1, "#2b2d6b"); } else { const [a, b] = Life.skyColors(); g.addColorStop(0, a); g.addColorStop(1, b); }
    ctx.fillStyle = g; ctx.fillRect(136, 32, 88, 76);
    ctx.fillStyle = night ? "#fff6c8" : "#ffe066"; ctx.beginPath(); ctx.arc(200, 54, 8, 0, 7); ctx.fill();
    ctx.fillStyle = "#6b4a35"; ctx.fillRect(178, 32, 4, 76); ctx.fillRect(136, 68, 88, 4);
    ctx.fillStyle = "#ffafcc"; ctx.fillRect(124, 22, 14, 96); ctx.fillRect(222, 22, 14, 96);
    ctx.fillStyle = "#6b4a35"; ctx.fillRect(226, 140, 60, 6);                    // kệ để radio
    drawRadio(t); drawSwitch();
    for (const it of homeItems) { const f = FU[it.k]; if (f && f.rug) { ctx.fillStyle = f.rug; ctx.globalAlpha = .85; ctx.beginPath(); ctx.ellipse(it.x, it.y, f.size / 2 + 10, f.size / 4 + 4, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1; } }
    if (placing) { ctx.fillStyle = "rgba(255,210,122,.15)"; ctx.fillRect(0, 165, W, 410); label("👆 Chạm sàn để đặt " + FU[placing].name, 180, 182, "#ffd27a"); }
    if (!homeItems.length) { ctx.fillStyle = "rgba(90,60,40,.35)"; ctx.font = "700 11px system-ui"; ctx.textAlign = "center"; ctx.fillText("Nhà còn trống · bấm 🛋️ Bày đồ để trang trí", 210, 400); }
  }
  function futon(i, t) {
    const b = BEDS[i], o = bedOwner(i), lying = o && o.lying, cols = ["#a0c4ff", "#ffc6ff"];
    ctx.fillStyle = "rgba(0,0,0,.18)"; rr(ctx, b.x + 3, b.y + 5, BED_W, BED_H, 8); ctx.fill();
    ctx.fillStyle = "#fffaf0"; rr(ctx, b.x, b.y, BED_W, BED_H, 8); ctx.fill();
    ctx.fillStyle = "#fff"; rr(ctx, b.x + 12, b.y + 6, BED_W - 24, 18, 7); ctx.fill();
    if (lying) {
      const hx = b.x + BED_W / 2, hy = b.y + 18;
      ctx.fillStyle = "#f5d0a9"; ctx.beginPath(); ctx.arc(hx, hy, 9, 0, 7); ctx.fill();
      ctx.fillStyle = (CL[outfitOf(o).hairColor] || CL.hc_brown).color; ctx.beginPath(); ctx.arc(hx, hy - 3, 9.5, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = "#2a1d16"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hx - 5, hy + 1); ctx.lineTo(hx - 2, hy + 1); ctx.moveTo(hx + 2, hy + 1); ctx.lineTo(hx + 5, hy + 1); ctx.stroke();
    }
    const br = lying ? Math.sin(t * 1.6 + i) * 1.2 : 0;
    ctx.fillStyle = cols[i % 2]; rr(ctx, b.x + 2, b.y + 30 - br, BED_W - 4, BED_H - 32 + br, 8); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.35)"; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(b.x + 14 + (k % 2) * 36, b.y + 46 + (k / 2 | 0) * 24 - br, 3, 0, 7); ctx.fill(); }
    if (lying) for (let k = 0; k < 2; k++) { const ph = (t * .45 + k / 2 + i * .3) % 1; ctx.font = `700 ${9 + ph * 7}px system-ui`; ctx.fillStyle = `rgba(120,130,200,${Math.sin(ph * Math.PI)})`; ctx.fillText("z", b.x + BED_W * .75 + ph * 8, b.y + 10 - ph * 26); }
  }
  function furnHit(x, y) {
    for (let k = homeItems.length - 1; k >= 0; k--) {
      const it = homeItems[k], f = FU[it.k]; if (!f) continue;
      const r = f.rug ? f.size / 2 : f.size / 2 + 4;
      if (Math.abs(x - it.x) < r && y > it.y - (f.rug ? r / 2 : f.size) && y < it.y + (f.rug ? r / 2 : 6)) return it;
    }
    return null;
  }
  function openDecor() {
    const deco = Object.entries(S().inv).filter(([id, x]) => x.cat === "deco" && x.n > 0 && FU[id]);
    openSheet("🛋️ Bày đồ trong nhà",
      `${deco.length ? `<div class="grid">${deco.map(([id, x]) => `<button class="opt" data-f="${id}">${x.e} ${esc(x.name)}<small>còn ${x.n} trong rương</small></button>`).join("")}</div>`
        : `<div class="vol" style="margin:0">Rương chưa có đồ trang trí. Mua ở 🛋️ Nội thất trong khu mua sắm nhé!</div>`}
       <div class="vol" style="font-size:12px">Chọn món rồi chạm sàn để đặt. Chạm vào món đã đặt để lật hoặc cất lại vào rương. Ai có mã phòng cũng ghé thăm được.</div>`,
      el => el.querySelectorAll("[data-f]").forEach(b => b.onclick = () => { placing = b.dataset.f; closeSheet(); toast(`👆 Chạm sàn để đặt ${FU[placing].name}`); }));
  }
  function furnMenu(it) {
    const f = FU[it.k];
    openSheet(`${f.e} ${f.name}`, `<div class="vol" style="margin:0 0 10px">Do <b>${esc(it.by || "ai đó")}</b> đặt</div>
      <div class="grid"><button class="opt" id="fFlip" style="text-align:center">↔️ Lật</button><button class="opt" id="fStore" style="text-align:center">🎒 Cất vào rương</button></div>`,
      el => {
        el.querySelector("#fFlip").onclick = () => { send({t: "furn", a: "flip", i: it.i}); closeSheet(); };
        el.querySelector("#fStore").onclick = () => { send({t: "furn", a: "del", i: it.i}); Life.addItem({id: f.id, e: f.e, name: f.name}, 1, "deco"); Life.commit(); closeSheet(); toast(`🎒 Đã cất ${f.name}`); };
      });
  }

  // ---------- 10. Móc vào game chính ----------
  function draw(t) { ({farm: drawFarm, fishing: drawFishing, mall: drawMall, home: drawHome})[myArea](t); }
  function seat(i, t) { ({farm: haySeat, fishing: fishSeat, mall: mallBench, home: futon})[myArea](i, t); }
  function ents(t, list) {
    for (const {n, p} of npcsHere()) list.push({y: p.y, f: () => {
      drawAvatar({x: p.x, y: p.y, color: n.color, outfit: n.outfit, walking: p.walking, up: false}, t);
      label(n.name, p.x, p.y - 51, "#b9fbc0");
      const tk = npcTalk[n.id]; if (tk && t < tk.until) bubble(tk.text, p.x, p.y - 58);
    }});
    if (myArea === "home") for (const it of homeItems) {
      const f = FU[it.k]; if (!f || f.rug) continue;
      list.push({y: it.y, f: () => {
        ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.beginPath(); ctx.ellipse(it.x, it.y, f.size * .4, f.size * .12, 0, 0, 7); ctx.fill();
        ctx.save(); ctx.translate(it.x, it.y - f.size / 2); if (it.f) ctx.scale(-1, 1);
        ctx.fillStyle = "#6b4a35";                                 // màu đặc phòng khi máy vẽ emoji dạng chữ trơn
        ctx.font = `${f.size}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",system-ui`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(f.e, 0, 0); ctx.restore();
      }});
    }
  }
  function tap(x, y) {
    for (const {n, p} of npcsHere()) if (Math.abs(x - p.x) < 15 && y > p.y - 46 && y < p.y + 6) { talkNpc(n); return true; }
    if (myArea === "farm") { const i = PLOTS.findIndex(r => inRect(x, y, r)); if (i >= 0) { tapPlot(i); return true; } }
    if (myArea === "fishing" && inRect(x, y, {x: 250, y: 380, w: 104, h: 80})) { openBait(); return true; }
    if (myArea === "mall") { const s = STORE_R.find(r => inRect(x, y, r)); if (s) { openStore(s); return true; } if (inRect(x, y, {x: 120, y: 190, w: 120, h: 46})) { openCashier(); return true; } }
    if (myArea === "home") {
      if (placing && y >= 175 && y <= 575) {
        const k = placing; placing = null;
        if (!Life.takeItem(k)) { toast("Hết món này trong rương rồi"); return true; }
        Life.commit(); send({t: "furn", a: "add", k, x: Math.round(x), y: Math.round(y)}); toast(`${FU[k].e} Đã đặt ${FU[k].name}`);
        return true;
      }
      const it = furnHit(x, y); if (it) { furnMenu(it); return true; }
    }
    return false;
  }
  function holes(hole, t) {
    if (myArea === "fishing") hole(300, 410, 90, .8);
    if (myArea === "farm") { hole(64, 90, 80, .7); hole(318, 400, 60, .5); }
    if (myArea === "home") for (const it of homeItems) if (it.k === "f_lamp" || it.k === "f_tv" || it.k === "f_tree") hole(it.x, it.y - 20, 80, .8);
  }
  function act() {
    if (myArea === "farm") openFarmer();
    else if (myArea === "fishing") openFishing();
    else if (myArea === "mall") openCashier();
    else if (myArea === "home") openDecor();
  }
  function onJoin() {
    cleanOutfit();
    if (SEASON) setTimeout(() => log(SEASON.banner), 2200);
  }
  function onArea(a) { placing = null; if (fishState) fishState = null; }
  function setHome(items) { homeItems = Array.isArray(items) ? items : []; }

  return {has: a => NEW.has(a), TXT, draw, seat, ents, tap, holes, act, over: drawSeason, drawAvatar, onJoin, onArea, setHome,
          openWardrobe, owns, ownLabel, cleanOutfit, outfit: () => cleanOutfit()};
})();
