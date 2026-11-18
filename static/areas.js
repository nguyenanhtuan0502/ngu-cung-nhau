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
  const nowS = () => serverNow();                         // giờ server (ruộng tính giờ theo server)
  const pick = a => a[Math.random() * a.length | 0];
  const roll = (list, wf) => {                          // chọn ngẫu nhiên theo trọng số
    const tot = list.reduce((s, x) => s + wf(x), 0);
    let r = Math.random() * tot;
    for (const x of list) if ((r -= wf(x)) < 0) return x;
    return list[0];
  };

  // ---------- 1. Đăng ký khu mới vào bảng của game ----------
  Object.assign(LAYOUTS, {
    // Tất cả đã vẽ lại NGANG: ww/wh = kích thước thế giới, floor = vùng đi lại (khớp FLOORS ở server.py)
    farm:    {ww: 1120, wh: 600, floor: {x1: 20, y1: 175, x2: 1100, y2: 585},
              beds: [{x: 450, y: 470}, {x: 610, y: 470}], bw: 56, bh: 36, sitY: 26,                       // 2 kiện rơm để ngồi
              tvr: null, scr: null, radio: {x: 796, y: 398, w: 44, h: 26}, sw: OFF, moon: {x: 700, y: 40}},
    fishing: {ww: 1120, wh: 600, floor: {x1: 20, y1: 386, x2: 1100, y2: 585},
              beds: [{x: 170, y: 346}, {x: 330, y: 346}, {x: 730, y: 346}, {x: 890, y: 346}], bw: 70, bh: 56, sitY: 44, minY: 386,
              tvr: null, scr: null, radio: {x: 122, y: 442, w: 44, h: 26}, sw: OFF, moon: {x: 200, y: 30}},
    mall:    {ww: 1000, wh: 600, floor: {x1: 20, y1: 175, x2: 980, y2: 585},
              beds: [{x: 200, y: 450}, {x: 455, y: 450}, {x: 710, y: 450}], bw: 90, bh: 40, sitY: 30,
              tvr: null, scr: null, radio: {x: 478, y: 372, w: 44, h: 26}, sw: OFF, moon: null},
    home:    {ww: 840, wh: 600, floor: {x1: 20, y1: 175, x2: 820, y2: 585},
              beds: [{x: 30, y: 186}, {x: 110, y: 186}], bw: 68, bh: 96, sitY: 52,                         // 2 nệm futon có sẵn
              tvr: null, scr: null, radio: {x: 612, y: 112, w: 48, h: 28}, sw: {x: 790, y: 96, w: 13, h: 19}, moon: {x: 448, y: 50}},
  });
  // Mỗi khu chỉ có 1 lối ra, chạm vào thì mở bản đồ (to: "map")
  const bottomExit = cx => ({x: cx - 24, y: 538, w: 48, h: 37, side: "bottom", spot: {x: cx, y: 556}, to: "map"});
  Object.assign(AREA_DOORS, {
    farm: [bottomExit(560)], fishing: [bottomExit(560)], mall: [bottomExit(500)],
    home: [{x: 812, y: 513, w: 28, h: 62, side: "right", spot: {x: 420, y: 380}, to: "map"}],
  });
  Object.assign(AREA_NAME, {farm: "🌾 Nông trại", fishing: "🎣 Hồ câu cá", mall: "🛍️ Khu mua sắm", home: "🏠 Nhà riêng"});
  // Chữ hiển thị riêng cho từng khu (nút ngồi, thông báo…)
  const TXT = {
    farm:    {icon: "🌾", sit: "🪑<span>Ngồi</span>", full: "Hết chỗ ngồi rồi! 😅", taken: "Kiện rơm của", hello: "Nông trại riêng của bạn 🌾: chạm ô đất để gieo hạt, tưới nước, thu hoạch. Bác Năm mua nông sản đó!", share: "Chơi game cuộc sống ảo với mình nè 🌾"},
    fishing: {icon: "🎣", sit: "🎣<span>Ngồi câu</span>", full: "Hết chỗ câu rồi! 😅", taken: "Chỗ câu của", hello: "Hồ câu cá 🎣: chạm ghế đẩu bên bờ để ngồi, rồi bấm 🎣 Câu cá. Mua mồi ở chỗ cô Lan.", share: "Ra hồ câu cá với mình nè 🎣"},
    mall:    {icon: "🛍️", sit: "🪑<span>Ngồi</span>", full: "Hết ghế rồi! 😅", taken: "Ghế của", hello: "Khu mua sắm 🛍️: chạm vào từng cửa hàng để mua đồ. Muốn về 🏠 nhà riêng thì mở 🗺️ bản đồ.", share: "Đi mua sắm với mình nè 🛍️"},
    home:    {icon: "🏠", sit: "😴<span>Nằm nghỉ</span>", full: "Hết nệm rồi! 😅", taken: "Nệm của", hello: "Nhà riêng 🏠 của bạn: bấm 🛋️ Bày đồ để đặt nội thất mua ở khu mua sắm.", share: "Chơi game cuộc sống ảo với mình nè 🏠"},
  };

  // ---------- 2. Avatar CHIBI: đầu to (~1/2 chiều cao), mắt to long lanh, thân nhỏ gọn, viền mềm ----------
  // Thứ tự lớp: cánh/lưng → tóc sau → chân + giày → áo → tay → phụ kiện cổ → đầu → mặt → tóc trước → kính → mũ
  // Hình vẽ bằng code (hình tạm). Khi có ảnh thật: thay từng lớp bằng PNG cùng tên lớp, giữ nguyên toạ độ neo (vai, hông, tâm đầu).
  const outfitOf = p => ({...DEFAULT_OUTFIT, ...(p.outfit || {})});
  const SKIN = "#ffe2cc", SKIN_SH = "#f4c3a3", INK = "#3a2219";
  const LONG_SLEEVE = new Set(["shirt_hoodie", "shirt_suit", "shirt_yellow"]);
  // Pha màu luôn trả về dạng #rrggbb (amt > 0: sáng hơn, < 0: tối hơn) để tô bóng nhiều lớp không bị hỏng màu
  function tone(hex, amt) {
    const n = parseInt(String(hex).slice(1), 16); if (isNaN(n)) return hex;
    const f = v => Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt));
    return "#" + [n >> 16, (n >> 8) & 255, n & 255].map(v => f(v).toString(16).padStart(2, "0")).join("");
  }
  function drawBack(b, x, by, t, front) {
    const c = b.color;
    if (b.id === "back_bag") {
      if (front) { ctx.strokeStyle = darken(c, .25); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 6, by + 1); ctx.lineTo(x - 6, by + 14); ctx.moveTo(x + 6, by + 1); ctx.lineTo(x + 6, by + 14); ctx.stroke(); return; }
      ctx.fillStyle = c; rr(ctx, x - 12, by - 1, 24, 18, 5); ctx.fill();
      ctx.fillStyle = darken(c, .18); rr(ctx, x - 9, by + 8, 18, 7, 3); ctx.fill();
      return;
    }
    if (front) return;
    if (b.id === "back_cape") {
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x - 9, by + 1); ctx.lineTo(x + 9, by + 1);
      ctx.lineTo(x + 14 + Math.sin(t * 3) * 1.5, by + 30); ctx.lineTo(x - 14 + Math.sin(t * 3 + 1) * 1.5, by + 30); ctx.fill();
      ctx.fillStyle = darken(c, .2); ctx.beginPath(); ctx.moveTo(x + 2, by + 1); ctx.lineTo(x + 9, by + 1); ctx.lineTo(x + 14 + Math.sin(t * 3) * 1.5, by + 30); ctx.lineTo(x + 5, by + 30); ctx.fill();
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
  function drawHat(id, x, hy, body, up) {                // toạ độ theo đầu bán kính 10 (được thu nhỏ khi vẽ)
    const h = CL[id]; if (!h || id === "hat_none") return;
    const c = h.color;
    if (id === "hat_nightcap" || id === "hat_santa") {
      ctx.fillStyle = id === "hat_santa" ? c : lighten(body, .15);
      ctx.beginPath(); ctx.moveTo(x - 10, hy - 5); ctx.quadraticCurveTo(x, hy - 20, x + 13, hy - 14); ctx.lineTo(x + 10, hy - 5); ctx.fill();
      ctx.fillStyle = id === "hat_santa" ? "#fff" : lighten(body, .35); rr(ctx, x - 11, hy - 8, 22, 4, 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x + 13, hy - 14, 2.6, 0, 7); ctx.fill();
    } else if (id === "hat_beanie") {
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, hy - 3, 11, Math.PI, 0); ctx.fill();
      ctx.fillStyle = darken(c, .2); rr(ctx, x - 11.5, hy - 5, 23, 4.5, 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, hy - 14, 3, 0, 7); ctx.fill();
    } else if (id === "hat_cap") {
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, hy - 3, 10.8, Math.PI, 0); ctx.fill();
      ctx.fillStyle = lighten(c, .25); ctx.beginPath(); ctx.arc(x - 3, hy - 9, 3, 0, 7); ctx.fill();
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
  function drawGlasses(g, x, hy) {                         // toạ độ theo đầu bán kính 10
    if (g === "gl_round") { ctx.strokeStyle = "#222"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x - 3.5, hy + 2, 3.2, 0, 7); ctx.moveTo(x + 6.7, hy + 2); ctx.arc(x + 3.5, hy + 2, 3.2, 0, 7); ctx.moveTo(x - .3, hy + 2); ctx.lineTo(x + .3, hy + 2); ctx.stroke(); }
    else if (g === "gl_sun") { ctx.fillStyle = "#111"; rr(ctx, x - 8, hy, 7, 4.5, 2); ctx.fill(); rr(ctx, x + 1, hy, 7, 4.5, 2); ctx.fill(); ctx.fillRect(x - 1, hy + 1, 2, 1); ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fillRect(x - 6.5, hy + .8, 2, 1); ctx.fillRect(x + 2.5, hy + .8, 2, 1); }
    else if (g === "gl_heart") { ctx.fillStyle = "#ff4d8d"; ctx.font = "8px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("♥", x - 3.5, hy + 2.5); ctx.fillText("♥", x + 3.5, hy + 2.5); }
  }
  function drawNeck(nk, x, by, up) {                       // phụ kiện cổ, toạ độ theo thân rộng 20
    if (!nk) return;
    if (nk.id === "neck_scarf") { ctx.fillStyle = nk.color; rr(ctx, x - 10, by - 1, 20, 5, 2); ctx.fill(); if (!up) { ctx.fillRect(x + 3, by + 3, 4, 9); ctx.fillStyle = darken(nk.color, .2); ctx.fillRect(x + 3, by + 10, 4, 2); } }
    else if (nk.id === "neck_bowtie" && !up) { ctx.fillStyle = nk.color; ctx.beginPath(); ctx.moveTo(x, by + 2); ctx.lineTo(x - 5, by - 1); ctx.lineTo(x - 5, by + 5); ctx.closePath(); ctx.moveTo(x, by + 2); ctx.lineTo(x + 5, by - 1); ctx.lineTo(x + 5, by + 5); ctx.fill(); }
    else if (nk.id === "neck_pearl" && !up) { ctx.fillStyle = nk.color; for (let k = 0; k < 7; k++) { ctx.beginPath(); ctx.arc(x - 6 + k * 2, by + 1 + Math.sin(k / 6 * Math.PI) * 3, 1.2, 0, 7); ctx.fill(); } }
  }
  // Kính theo mắt chibi (mắt to ở ±4.7, hy+2.6)
  function glassesChibi(g, x, hy) {
    const ey = hy + 2.6;
    if (g === "gl_round") {
      ctx.strokeStyle = "#3a2a2a"; ctx.lineWidth = .8;
      ctx.beginPath(); ctx.arc(x - 4.7, ey, 3.5, 0, 7); ctx.moveTo(x + 8.2, ey); ctx.arc(x + 4.7, ey, 3.5, 0, 7);
      ctx.moveTo(x - 1.2, ey - .6); ctx.quadraticCurveTo(x, ey - 1.6, x + 1.2, ey - .6); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.25)"; ctx.beginPath(); ctx.arc(x - 5.8, ey - 1.4, .9, 0, 7); ctx.arc(x + 3.6, ey - 1.4, .9, 0, 7); ctx.fill();
    } else if (g === "gl_sun") {
      ctx.fillStyle = "rgba(20,20,28,.92)"; rr(ctx, x - 8.4, ey - 2.6, 7.2, 5, 2.2); ctx.fill(); rr(ctx, x + 1.2, ey - 2.6, 7.2, 5, 2.2); ctx.fill();
      ctx.fillRect(x - 1.3, ey - 1.6, 2.6, .9);
      ctx.fillStyle = "rgba(255,255,255,.45)"; ctx.fillRect(x - 7.4, ey - 1.8, 2.2, .9); ctx.fillRect(x + 2.2, ey - 1.8, 2.2, .9);
    } else if (g === "gl_heart") {
      for (const s of [-1, 1]) {
        const cx = x + s * 4.7; ctx.fillStyle = "rgba(255,77,141,.88)";
        ctx.beginPath(); ctx.moveTo(cx, ey + 2.8); ctx.bezierCurveTo(cx - 4.6, ey - .4, cx - 2.4, ey - 4, cx, ey - 1.6);
        ctx.bezierCurveTo(cx + 2.4, ey - 4, cx + 4.6, ey - .4, cx, ey + 2.8); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.beginPath(); ctx.arc(cx - 1.4, ey - 1.2, .7, 0, 7); ctx.fill();
      }
      ctx.strokeStyle = "rgba(255,77,141,.88)"; ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(x - 1, ey - 1); ctx.lineTo(x + 1, ey - 1); ctx.stroke();
    }
  }
  // Tóc (kiểu + màu nhuộm) vẽ trong hair.js: Hair.back / Hair.front / Hair.view
  // Mặt chibi: mắt to long lanh, miệng ω, má hồng; chớp mắt (cong như cười), thỉnh thoảng liếc
  function drawFace(x, hy, t, seed, happy, male) {
    const blink = happy || (t + seed) % 4.3 < .13;
    const lk = Math.sin(t * .6 + seed), look = lk > .93 ? .5 : lk < -.93 ? -.5 : 0;
    for (const s of [-1, 1]) {
      const ex = x + s * 4.7 + look, ey = hy + 2.6;
      if (blink) {
        ctx.strokeStyle = INK; ctx.lineWidth = 1.05; ctx.lineCap = "round";
        ctx.beginPath(); ctx.arc(ex, ey + 1.2, 2.2, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
        continue;
      }
      const g = ctx.createLinearGradient(0, ey - 3, 0, ey + 3);
      g.addColorStop(0, "#2e1b14"); g.addColorStop(.55, "#6b4128"); g.addColorStop(1, "#c08a55");
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(ex, ey + (male ? .25 : 0), male ? 2.2 : 2.4, male ? 2.7 : 3.05, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#1c100b"; ctx.beginPath(); ctx.ellipse(ex, ey + .2, 1.15, 1.6, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ex - .85, ey - 1.3, 1, 0, 7); ctx.fill();   // đốm sáng lớn (góc trên trái)
      ctx.globalAlpha = .85; ctx.beginPath(); ctx.arc(ex + .9, ey + 1.4, .45, 0, 7); ctx.fill(); ctx.globalAlpha = 1;     // đốm sáng nhỏ
      ctx.strokeStyle = INK; ctx.lineWidth = male ? .95 : 1.15; ctx.lineCap = "round";                                  // mi trên
      ctx.beginPath(); ctx.ellipse(ex, ey + .4, male ? 2.45 : 2.65, male ? 3 : 3.3, 0, Math.PI * (male ? 1.18 : 1.1), Math.PI * (male ? 1.82 : 1.9)); ctx.stroke();
      if (!male) { ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(ex + s * 2.4, ey - 1.7); ctx.lineTo(ex + s * 3.4, ey - 2.6); ctx.stroke(); }   // đuôi mi cong (nữ)
    }
    if (male) {                                                                                                        // lông mày nam: đậm, thẳng
      ctx.strokeStyle = "rgba(70,42,30,.8)"; ctx.lineWidth = 1;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + s * 2.8, hy - 1.6); ctx.lineTo(x + s * 6.3, hy - 2.3); ctx.stroke(); }
    } else {
      ctx.strokeStyle = "rgba(90,55,40,.55)"; ctx.lineWidth = .6;                                                        // lông mày nữ: mảnh, cong
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + s * 3.4, hy - 2.1); ctx.quadraticCurveTo(x + s * 4.8, hy - 2.9, x + s * 6.2, hy - 2.3); ctx.stroke(); }
    }
    ctx.fillStyle = "rgba(225,140,120,.65)"; ctx.beginPath(); ctx.arc(x, hy + 5, .45, 0, 7); ctx.fill();                  // mũi
    ctx.strokeStyle = "#9c4a44"; ctx.lineWidth = .7; ctx.beginPath();
    if (male) { ctx.moveTo(x - 1.5, hy + 6); ctx.quadraticCurveTo(x, hy + 7.1, x + 1.6, hy + 5.8); }                      // nam: cười mỉm
    else { ctx.arc(x - .85, hy + 6.2, .85, .15, Math.PI - .15); ctx.moveTo(x + 1.7, hy + 6.2); ctx.arc(x + .85, hy + 6.2, .85, .15, Math.PI - .15); }   // nữ: miệng ω
    ctx.stroke();
    ctx.fillStyle = male ? "rgba(255,120,145,.16)" : "rgba(255,120,145,.35)";                                            // má hồng
    ctx.beginPath(); ctx.ellipse(x - 7.6, hy + 5.4, 2.1, 1.15, 0, 0, 7); ctx.ellipse(x + 7.6, hy + 5.4, 2.1, 1.15, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = .4;
    if (!male) for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x + s * 7.6 - 1.2 + k * .9, hy + 6); ctx.lineTo(x + s * 7.6 - .7 + k * .9, hy + 4.9); ctx.stroke(); }
  }
  // p: {x, y (chân), color, outfit, walking, up (quay lưng), sit (ngồi), id/name}
  function drawAvatar(p, t) {
    const o = outfitOf(p), up = !!p.up, sit = !!p.sit, walk = !!p.walking && !sit;
    const seed = ((p.id || p.name || "a").charCodeAt(0) % 17) * .7;
    const ph = t * 10 + seed, sw = walk ? Math.sin(ph) : 0;
    const bob = walk ? Math.abs(Math.sin(ph)) * 1.3 : Math.sin(t * 2 + seed) * .35;  // nhún nhảy khi đi / thở khi đứng
    const x = p.x, y = p.y;
    const hipY = y - (sit ? 3.5 : 8.5) - bob, shY = hipY - 11.5, hy = shY - 9.2;
    const shirt = CL[o.shirt], pj = !shirt, top = shirt ? shirt.color : p.color;
    const pants = pj ? tone(p.color, .15) : shirt.id === "shirt_suit" ? "#2b2d42" : "#4a6fa5";
    const shoe = pj ? tone(p.color, .5) : shirt.id === "shirt_suit" ? "#2a2a2a" : "#ffffff";
    const back = CL[o.back], hasBack = back && back.id !== "back_none";
    const male = o.gender === "g_m";
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    // bóng đổ
    ctx.fillStyle = "rgba(0,0,0,.22)"; ctx.beginPath(); ctx.ellipse(x, y, 8.5 - Math.abs(sw) * .6, 2.8, 0, 0, 7); ctx.fill();
    // cánh / áo choàng / ba lô sau lưng
    if (hasBack && !up) { ctx.save(); ctx.translate(x, shY + 1); ctx.scale(.7, .72); drawBack(back, 0, 0, t, false); ctx.restore(); }
    if (!up) Hair.back(ctx, o.hair, o.hairColor, x, hy, hipY, male);
    // chân ngắn + giày tròn
    for (const s of [-1, 1]) {
      const lx = x + s * 2.7;
      let fx, fy;
      if (sit) { fx = x + s * 3.3; fy = hipY + 4.4; }
      else { fx = lx + sw * s * 1.2; fy = y - 1.7 - (walk ? Math.max(0, sw * s) * 1.6 : 0); }
      ctx.strokeStyle = tone(pants, -.35); ctx.lineWidth = 5.4; ctx.beginPath(); ctx.moveTo(lx, hipY - 1); ctx.lineTo(fx, fy); ctx.stroke();
      ctx.strokeStyle = pants; ctx.lineWidth = 3.9; ctx.beginPath(); ctx.moveTo(lx, hipY - 1); ctx.lineTo(fx, fy); ctx.stroke();
      ctx.fillStyle = shoe; ctx.strokeStyle = tone(shoe, -.4); ctx.lineWidth = .75;
      ctx.beginPath(); ctx.ellipse(fx + s * .4, fy + .3, 3.1, 2, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.beginPath(); ctx.ellipse(fx + s * .4 - .9, fy - .4, 1, .5, 0, 0, 7); ctx.fill();
    }
    // tay (sau thân khi nhìn từ sau thì vẫn vẽ trước thân cho dễ thấy)
    const longS = pj || LONG_SLEEVE.has(o.shirt);
    const arm = s => {
      const sx = x + s * 5.6, sy = shY + 1.8, len = 7.4;
      const a = s * (.32 + (walk ? sw * s * .3 : sit ? .05 : Math.sin(t * 2 + seed) * .03));
      const hx2 = sx + Math.sin(a) * len, hy2 = sy + Math.cos(a) * len, mx = (sx + hx2) / 2, my = (sy + hy2) / 2;
      ctx.strokeStyle = tone(top, -.35); ctx.lineWidth = 4.6; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(longS ? hx2 : mx, longS ? hy2 : my); ctx.stroke();
      ctx.strokeStyle = top; ctx.lineWidth = 3.3; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(longS ? hx2 : mx, longS ? hy2 : my); ctx.stroke();
      if (!longS) { ctx.strokeStyle = tone(SKIN, -.25); ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(hx2, hy2); ctx.stroke(); ctx.strokeStyle = SKIN; ctx.lineWidth = 2.3; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(hx2, hy2); ctx.stroke(); }
      ctx.fillStyle = SKIN; ctx.strokeStyle = tone(SKIN, -.3); ctx.lineWidth = .7; ctx.beginPath(); ctx.arc(hx2, hy2 + .4, 2, 0, 7); ctx.fill(); ctx.stroke();   // bàn tay tròn
    };
    // thân áo dáng chữ A
    const W1 = male ? 5.8 : 5.2, W2 = male ? 6.9 : 6.5, W3 = male ? 6.5 : 7.2;      // vai / ngực / gấu áo
    const torso = () => {
      ctx.beginPath(); ctx.moveTo(x - W1, shY); ctx.quadraticCurveTo(x - W2 - .1, shY + .2, x - W2, shY + 2.4);
      ctx.lineTo(x - W3, hipY); ctx.quadraticCurveTo(x, hipY + 2.2, x + W3, hipY); ctx.lineTo(x + W2, shY + 2.4);
      ctx.quadraticCurveTo(x + W2 + .1, shY + .2, x + W1, shY); ctx.closePath();
    };
    ctx.fillStyle = top; torso(); ctx.fill();
    ctx.save(); torso(); ctx.clip();
    if (shirt && shirt.stripe) { ctx.fillStyle = shirt.stripe; for (let k = 2.5; k < 14; k += 3.4) ctx.fillRect(x - 8, shY + k, 16, 1.4); }
    if (pj) { ctx.fillStyle = tone(top, .45); for (const [dx, dy] of [[-3.6, 4], [3.4, 6], [-2.2, 9.5], [4, 10.5]]) { ctx.beginPath(); ctx.arc(x + dx, shY + dy, .75, 0, 7); ctx.fill(); } }
    ctx.fillStyle = "rgba(0,0,0,.12)"; ctx.fillRect(x + 2.8, shY - 1, 6, 16);              // bóng mềm bên phải
    ctx.fillStyle = "rgba(255,255,255,.25)"; ctx.fillRect(x - 7.4, shY + 1, 1.4, 13);       // viền sáng bên trái
    ctx.restore();
    ctx.strokeStyle = tone(top, -.38); ctx.lineWidth = .8; torso(); ctx.stroke();
    if (!up) {                                                                               // chi tiết mặt trước áo
      if (pj) {
        ctx.fillStyle = tone(top, .35); ctx.beginPath(); ctx.moveTo(x - 4.2, shY - .3); ctx.lineTo(x, shY + 3.2); ctx.lineTo(x + 4.2, shY - .3); ctx.fill();
        ctx.fillStyle = "#fff"; for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.arc(x, shY + 5.5 + k * 3.6, .6, 0, 7); ctx.fill(); }
      } else if (shirt.id === "shirt_hoodie") {
        ctx.fillStyle = tone(top, -.12); rr(ctx, x - 3.6, hipY - 4.6, 7.2, 3.4, 1.6); ctx.fill();
        ctx.strokeStyle = "#f5f5f5"; ctx.lineWidth = .55; ctx.beginPath(); ctx.moveTo(x - 1.2, shY + .4); ctx.lineTo(x - 1.4, shY + 4); ctx.moveTo(x + 1.2, shY + .4); ctx.lineTo(x + 1.4, shY + 4); ctx.stroke();
      } else if (shirt.id === "shirt_suit") {
        ctx.fillStyle = "#f8f9fa"; ctx.beginPath(); ctx.moveTo(x - 2.6, shY - .2); ctx.lineTo(x, shY + 5.6); ctx.lineTo(x + 2.6, shY - .2); ctx.fill();
        ctx.fillStyle = shirt.tie; ctx.beginPath(); ctx.moveTo(x - .8, shY + .4); ctx.lineTo(x + .8, shY + .4); ctx.lineTo(x + 1.1, shY + 4.8); ctx.lineTo(x, shY + 6); ctx.lineTo(x - 1.1, shY + 4.8); ctx.fill();
      } else {
        ctx.fillStyle = SKIN; ctx.beginPath(); ctx.moveTo(x - 2.4, shY - .2); ctx.quadraticCurveTo(x, shY + 2, x + 2.4, shY - .2); ctx.fill();
        if (!shirt.stripe) { ctx.fillStyle = tone(top, .5); ctx.font = "5px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("★", x - 2.2, shY + 6); }
      }
    }
    if (shirt && shirt.id === "shirt_hoodie") { ctx.fillStyle = tone(top, -.18); ctx.beginPath(); ctx.ellipse(x, shY - .2, 5.4, 1.9, 0, Math.PI, 0); ctx.fill(); }
    arm(-1); arm(1);
    if (hasBack) { ctx.save(); ctx.translate(x, shY + 1); ctx.scale(.7, .72); drawBack(back, 0, 0, t, true); if (up) drawBack(back, 0, 0, t, false); ctx.restore(); }
    ctx.save(); ctx.translate(x, shY + .1); ctx.scale(.64, .7); drawNeck(CL[o.neck], 0, 0, up); ctx.restore();
    // đầu to tròn, da sáng mịn
    const hg = ctx.createRadialGradient(x - 3, hy - 3.5, 1, x, hy, 12);
    hg.addColorStop(0, "#fff1e4"); hg.addColorStop(1, SKIN);
    ctx.fillStyle = hg; ctx.strokeStyle = tone(SKIN, -.32); ctx.lineWidth = .9;
    ctx.beginPath(); ctx.ellipse(x, hy, 11.2, 10.3, 0, 0, 7); ctx.fill(); ctx.stroke();
    if (up) Hair.view(ctx, o.hair, o.hairColor, x, hy, hipY, male);
    else { drawFace(x, hy, t, seed, p.happy, male); Hair.front(ctx, o.hair, o.hairColor, x, hy, hipY, male); glassesChibi(o.glasses, x, hy); }
    ctx.save(); ctx.translate(x, hy - 2.4); ctx.scale(1.04, 1.04); drawHat(o.hat, 0, 0, top, up); ctx.restore();   // mũ: đồ cũ vẽ theo đầu bán kính 10
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
    if (n.act) setTimeout(() => NPC_ACT[n.act] ? NPC_ACT[n.act]() : Zones.npcAct(n.act), 450);
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
    if (myArea === "park") {                                             // công viên ngang 1120x600 (ngoài trời)
      const gy = 160;
      ctx.strokeStyle = "rgba(60,40,30,.6)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, gy);       // dây treo đồ trang trí
      for (let x = 0; x <= W; x += 20) ctx.lineTo(x, gy + Math.sin(x / 40 * Math.PI) * 6); ctx.stroke();
      ctx.font = "12px system-ui";
      for (let k = 0, x = 20; x < W; x += 40, k++) ctx.fillText(SEASON.deco[k % SEASON.deco.length], x, gy + 10 + Math.sin(x / 40 * Math.PI) * 6 + Math.sin(t * 2 + k) * 1.5);
      ctx.font = "18px system-ui";
      [[60, 230], [300, 300], [820, 300], [1080, 300], [470, 560], [660, 560], [980, 400], [140, 420]].forEach(([x, y], k) => ctx.fillText(SEASON.deco[k % SEASON.deco.length], x, y));
    } else {
      ctx.font = "18px system-ui";
      [[22, 410], [W - 22, 410], [W / 2, 418], [340, 470], [660, 470]].forEach(([x, y], k) => ctx.fillText(SEASON.deco[k % SEASON.deco.length], x, y));
    }
    if (SEASON.fall && myArea === "park") {                              // lá/hoa/tuyết rơi chỉ ở công viên (ngoài trời)
      ctx.font = "10px system-ui";
      for (let k = 0; k < 24; k++) {
        const ph = ((t * (14 + k % 5 * 3) + k * 97) % (H - 120)), x = (k * 53 * W / 360 + Math.sin(t * .8 + k) * 18 + W) % W;
        ctx.globalAlpha = .85; ctx.fillText(SEASON.fall, x, 150 + ph - 60);
      }
      ctx.globalAlpha = 1;
    }
  }

  // ---------- 5. Nông trại (NGANG 1120x600: ruộng giữa màn hình, cảnh vật nền sau) ----------
  const PLOTS = Array.from({length: FARM_PLOTS}, (_, i) => ({x: 320 + (i % 4) * 94, y: 260 + (i / 4 | 0) * 88, w: 76, h: 72}));
  const S = () => Life.S();
  function plotInfo(pl) {
    if (!pl) return {st: "empty"};
    const c = CR[pl.c]; if (!c) return {st: "empty"};
    if (!pl.w) return {st: "dry", c};
    const k = Math.min(1, (nowS() - pl.w) / c.time);
    return {st: k >= 1 ? "ripe" : "grow", c, k, left: c.time * (1 - k)};
  }

  // Chú bò sữa chibi: bóng đổ mờ, thân trắng tròn đốm đen, đầu mõm hồng, sừng, tai, mắt long lanh, 4 chân guốc bước, đuôi vẫy, bầu sữa, cúi đầu gặm cỏ
  function drawCow(x, y, s, t, flip, k = 0) {
    ctx.save();
    ctx.translate(x, y);
    const dir = flip < 0 ? -1 : 1;
    ctx.scale(dir * s, s);

    // 1. Bóng đổ dưới chân
    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
    ctx.beginPath();
    ctx.ellipse(0, 12, 17, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Chu kỳ bước chân
    const walkPhase = t * 4 + k * 1.7;
    const legSwing1 = Math.sin(walkPhase) * 2;
    const legSwing2 = -legSwing1;

    // 2. Chân phía xa (vẽ trước thân để tạo chiều sâu)
    ctx.fillStyle = "#dde2e6";
    ctx.fillRect(-10 + legSwing2, 4, 3, 7.5);
    ctx.fillRect(7 + legSwing1, 4, 3, 7.5);
    // Móng guốc tối màu phía xa
    ctx.fillStyle = "#343a40";
    ctx.fillRect(-10 + legSwing2, 10.5, 3, 1.8);
    ctx.fillRect(7 + legSwing1, 10.5, 3, 1.8);

    // 3. Đuôi vẫy phe phẩy với chỏm lông đen
    const tailSwish = Math.sin(t * 3.2 + k * 2) * 0.35;
    ctx.save();
    ctx.translate(-14, 0);
    ctx.rotate(tailSwish);
    ctx.strokeStyle = "#f8f9fa";
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-4, 5, -2, 10);
    ctx.stroke();
    // Chỏm lông đuôi
    ctx.fillStyle = "#212529";
    ctx.beginPath();
    ctx.ellipse(-2, 10.5, 2.5, 3.8, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 4. Bầu sữa hồng hào phía dưới bụng
    ctx.fillStyle = "#ffb4c2";
    ctx.beginPath();
    ctx.ellipse(-5, 9, 4.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Núm sữa
    ctx.fillStyle = "#ff94a8";
    ctx.beginPath();
    ctx.arc(-6.5, 12, 1, 0, Math.PI * 2);
    ctx.arc(-3.5, 12, 1, 0, Math.PI * 2);
    ctx.fill();

    // 5. Thân tròn trắng với đổ bóng nhẹ & đốm đen cắt theo thân (clipped)
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 1.5, 15, 9.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    // Bóng đổ nhẹ dưới bụng
    ctx.fillStyle = "rgba(195, 205, 218, 0.32)";
    ctx.beginPath();
    ctx.ellipse(0, 6.5, 14, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Cắt (clip) để các đốm đen nằm trọn trong thân bò
    ctx.clip();
    ctx.fillStyle = "#212529";
    // Đốm lưng
    ctx.beginPath();
    ctx.arc(-5, -4, 6.5, 0, Math.PI * 2);
    ctx.arc(-1, -7, 5, 0, Math.PI * 2);
    ctx.fill();
    // Đốm sườn và mông
    ctx.beginPath();
    ctx.arc(6, 4, 5.5, 0, Math.PI * 2);
    ctx.arc(4, 7, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-13, 2, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 6. Chân phía gần
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-6 + legSwing1, 4, 3.2, 7.5);
    ctx.fillRect(10 + legSwing2, 4, 3.2, 7.5);
    // Móng guốc chân gần
    ctx.fillStyle = "#212529";
    ctx.fillRect(-6 + legSwing1, 10.5, 3.2, 1.8);
    ctx.fillRect(10 + legSwing2, 10.5, 3.2, 1.8);

    // 7. Cử động cúi đầu gặm cỏ định kỳ
    const grazeCycle = (t * 0.75 + k * 1.9) % 6;
    let graze = 0;
    if (grazeCycle >= 2.0 && grazeCycle < 2.5) {
      graze = (grazeCycle - 2.0) / 0.5;
      graze = 0.5 - 0.5 * Math.cos(graze * Math.PI);
    } else if (grazeCycle >= 2.5 && grazeCycle < 4.8) {
      graze = 1;
    } else if (grazeCycle >= 4.8 && grazeCycle < 5.3) {
      graze = (5.3 - grazeCycle) / 0.5;
      graze = 0.5 - 0.5 * Math.cos(graze * Math.PI);
    }
    const chew = graze > 0.5 ? Math.sin(t * 8 + k) * 0.7 : 0;
    const headAngle = graze * 0.48 + Math.sin(t * 2 + k) * 0.03;
    const hx = 13 + graze * 1.5;
    const hy = -5 + graze * 9;

    // Cổ nối thân với đầu
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(8, -2);
    ctx.lineTo(hx - 2, hy);
    ctx.lineTo(hx + 1, hy + 6);
    ctx.lineTo(10, 6);
    ctx.closePath();
    ctx.fill();

    // 8. Đầu bò và các chi tiết khuôn mặt
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(headAngle);

    // Sừng nhỏ xinh xắn
    ctx.fillStyle = "#f3dfbe";
    ctx.beginPath();
    ctx.moveTo(-3, -5.5); ctx.quadraticCurveTo(-4, -9.5, -2, -10.5); ctx.quadraticCurveTo(-1, -8.5, 0, -5.5);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(2, -5.5); ctx.quadraticCurveTo(4, -9.5, 5, -10.5); ctx.quadraticCurveTo(4, -8.5, 4, -5.5);
    ctx.fill();

    // Tai bò
    ctx.fillStyle = "#212529";
    ctx.beginPath();
    ctx.ellipse(-5.5, -3.5, 4, 2, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(5.5, -3.5, 4, 2, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffb4c2";
    ctx.beginPath();
    ctx.ellipse(5.2, -3.5, 2.5, 1.2, 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Khối đầu tròn
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, 7.5, 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    // Đốm đen trên đầu
    ctx.clip();
    ctx.fillStyle = "#212529";
    ctx.beginPath();
    ctx.arc(-2, -3, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Mắt long lanh có đốm sáng
    const blink = graze < 0.2 && (Math.sin(t * 1.8 + k) > 0.94);
    if (blink) {
      ctx.strokeStyle = "#212529";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(2.5, -1, 2, 0.2, Math.PI - 0.2);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#1b1d20";
      ctx.beginPath();
      ctx.arc(2.5, -1, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(3.2, -1.8, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mõm hồng tròn bầu bĩnh + 2 lỗ mũi
    ctx.fillStyle = "#ffb4c2";
    ctx.beginPath();
    ctx.ellipse(4.5 + chew, 2.6, 4.6, 3.2, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#7a3e4a";
    ctx.beginPath();
    ctx.arc(3.6 + chew, 2.8, 0.75, 0, Math.PI * 2);
    ctx.arc(6.0 + chew, 2.8, 0.75, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore(); // Kết thúc đầu bò
    ctx.restore(); // Kết thúc chú bò
  }

  // Gà mái chibi: bóng đổ, thân tròn đẫy đà, cánh xếp lớp, đuôi xòe, mào và yếm đỏ, mỏ cam, mắt long lanh, chân bước, đầu gật gù và thỉnh thoảng mổ thóc
  function drawHen(x, y, s, t, flip, k = 0) {
    ctx.save();
    ctx.translate(x, y);
    const dir = flip < 0 ? -1 : 1;
    ctx.scale(dir * s, s);

    // 1. Bóng đổ dưới chân gà
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.beginPath();
    ctx.ellipse(0, 12, 10, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Chân cam bước đi lon ton
    const step = Math.sin(t * 8 + k * 2.2);
    ctx.strokeStyle = "#f48c06";
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    // Chân xa
    ctx.beginPath();
    ctx.moveTo(-2, 6);
    ctx.lineTo(-2 - step * 2.5, 11);
    ctx.lineTo(-0.5 - step * 2.5, 12);
    ctx.stroke();
    // Chân gần
    ctx.strokeStyle = "#e85d04";
    ctx.beginPath();
    ctx.moveTo(2.5, 6);
    ctx.lineTo(2.5 + step * 2.5, 11);
    ctx.lineTo(4.5 + step * 2.5, 12);
    ctx.stroke();

    // 3. Lông đuôi xòe dựng đứng phía sau
    ctx.fillStyle = "#edf2f7";
    ctx.beginPath();
    ctx.moveTo(-7, 3);
    ctx.quadraticCurveTo(-14, 0, -13, -7);
    ctx.quadraticCurveTo(-9, -4, -6, -1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(-6, 4);
    ctx.quadraticCurveTo(-13, 2, -11, -4);
    ctx.quadraticCurveTo(-7, -1, -4, 1);
    ctx.closePath();
    ctx.fill();

    // 4. Thân gà đẫy đà tròn trịa
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(-1, 3, 9, 7.5, 0.1, 0, Math.PI * 2);
    ctx.fill();
    // Đổ bóng mềm dưới bụng
    ctx.fillStyle = "rgba(203, 213, 225, 0.35)";
    ctx.beginPath();
    ctx.ellipse(-1, 7, 7.8, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 5. Cánh xếp lớp xinh xắn
    ctx.fillStyle = "#f1f5f9";
    ctx.beginPath();
    ctx.ellipse(-1, 3.5, 6.2, 4.5, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(160, 174, 192, 0.55)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(-1, 3.2, 4.2, 0.3, Math.PI - 0.3);
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(-0.5, 2.5, 4.2, 2.8, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // 6. Cử động đầu gật gù khi đi & thỉnh thoảng cúi mổ thóc
    const peckCycle = (t * 0.9 + k * 1.6) % 4.5;
    let peck = 0;
    if (peckCycle >= 1.8 && peckCycle < 2.6) {
      peck = Math.max(0, Math.sin((peckCycle - 1.8) / 0.8 * Math.PI * 2)) * 6.5;
    }
    const bobX = peck > 0 ? peck * 0.55 : Math.sin(t * 8 + k * 2.2) * 1.3;
    const bobY = peck > 0 ? peck : Math.abs(Math.cos(t * 8 + k * 2.2)) * 0.8;
    const hx = 5.5 + bobX;
    const hy = -4.5 + bobY;

    // Cổ gà
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(1, 0);
    ctx.lineTo(hx - 2, hy + 2);
    ctx.lineTo(hx + 2, hy + 4);
    ctx.lineTo(5, 5);
    ctx.closePath();
    ctx.fill();

    // 7. Đầu, mắt, mào và yếm
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(hx, hy, 5.2, 0, Math.PI * 2);
    ctx.fill();

    // Mào đỏ 3 múi nhấp nhô trên đỉnh đầu
    ctx.fillStyle = "#e63946";
    ctx.beginPath();
    ctx.arc(hx - 2.2, hy - 5.5, 2, 0, Math.PI * 2);
    ctx.arc(hx + 0.4, hy - 6.6, 2.4, 0, Math.PI * 2);
    ctx.arc(hx + 3.0, hy - 5.5, 1.9, 0, Math.PI * 2);
    ctx.fill();

    // Yếm đỏ dưới mỏ
    ctx.fillStyle = "#e63946";
    ctx.beginPath();
    ctx.ellipse(hx + 3.2, hy + 3.4, 1.6, 2.3, 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Mỏ cam nhọn
    ctx.fillStyle = "#f77f00";
    ctx.beginPath();
    ctx.moveTo(hx + 3.8, hy - 1.2);
    ctx.lineTo(hx + 8, hy + 0.4);
    ctx.lineTo(hx + 3.8, hy + 2);
    ctx.closePath();
    ctx.fill();

    // Mắt long lanh có đốm sáng
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(hx + 1.8, hy - 1.2, 1.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(hx + 2.3, hy - 1.7, 0.65, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Gà con chibi: bóng đổ, thân tròn vàng bông xù, cánh nhỏ, mỏ cam, mắt to tròn, má hồng, chân bé xíu, cử động nhảy nhót lon ton
  function drawChick(x, y, s, t, flip, k = 0) {
    ctx.save();
    ctx.translate(x, y);
    const dir = flip < 0 ? -1 : 1;
    ctx.scale(dir * s, s);

    // Cử động nhún nhảy tung tăng của gà con
    const hop = Math.abs(Math.sin(t * 10 + k * 2)) * 3.5;
    const rock = Math.sin(t * 10 + k * 2) * 0.08;

    // 1. Bóng đổ dưới chân (co giãn nhẹ theo nhịp nhảy)
    const shadowShrink = Math.max(0.65, 1 - hop * 0.09);
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.beginPath();
    ctx.ellipse(0, 12, 6.5 * shadowShrink, 2.2 * shadowShrink, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Đôi chân nhỏ màu cam bước nhảy
    const cy = 2 - hop;
    ctx.strokeStyle = "#f77f00";
    ctx.lineWidth = 1.4;
    ctx.lineCap = "round";
    // Chân xa
    ctx.beginPath();
    ctx.moveTo(-1.6, cy + 4.5);
    ctx.lineTo(-1.6, 11 - hop * 0.3);
    ctx.lineTo(-0.2, 12 - hop * 0.3);
    ctx.stroke();
    // Chân gần
    ctx.beginPath();
    ctx.moveTo(1.6, cy + 4.5);
    ctx.lineTo(1.6, 11 - hop * 0.15);
    ctx.lineTo(3.2, 12 - hop * 0.15);
    ctx.stroke();

    // 3. Thân tròn lông vàng mềm mại
    ctx.save();
    ctx.translate(0, cy);
    ctx.rotate(rock);

    // Lông tơ nhỏ trên đỉnh đầu
    ctx.fillStyle = "#ffe042";
    ctx.beginPath();
    ctx.arc(0.4, -6.2, 1.8, 0, Math.PI * 2);
    ctx.arc(-1.2, -5.7, 1.4, 0, Math.PI * 2);
    ctx.fill();

    // Khối thân tròn xoe
    ctx.fillStyle = "#ffd60a";
    ctx.beginPath();
    ctx.ellipse(0, 0, 6.8, 6.2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Đổ bóng vàng ấm dưới bụng
    ctx.fillStyle = "rgba(247, 127, 0, 0.22)";
    ctx.beginPath();
    ctx.ellipse(0, 3.2, 5.2, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4. Cánh nhỏ bé xíu vỗ nhẹ
    const wingFlap = Math.sin(t * 14 + k * 2) * 0.25;
    ctx.save();
    ctx.translate(-1.8, 0.5);
    ctx.rotate(wingFlap);
    ctx.fillStyle = "#ffc300";
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.5, 2.2, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 5. Mỏ cam nhỏ xinh
    ctx.fillStyle = "#fb8500";
    ctx.beginPath();
    ctx.moveTo(4.8, -1.2);
    ctx.lineTo(7.5, 0.2);
    ctx.lineTo(4.8, 1.2);
    ctx.closePath();
    ctx.fill();

    // 6. Mắt to tròn đen láy có highlight
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(3.0, -1.6, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(3.4, -2.0, 0.55, 0, Math.PI * 2);
    ctx.fill();

    // 7. Má hồng chúm chím dễ thương
    ctx.fillStyle = "rgba(255, 112, 166, 0.55)";
    ctx.beginPath();
    ctx.ellipse(2.2, 0.9, 1.7, 1.1, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore(); // Kết thúc xoay/dịch theo thân
    ctx.restore(); // Kết thúc gà con
  }

  // ---------- 6 cột đèn trang trí khu nông trại & dây đèn fairy lights ----------
  // Các vị trí đặt cột đèn bố trí hài hòa, không cản trở ruộng rau, lối đi, chuồng gà, chuồng bò, giếng, radio, biển exit
  const FARM_LAMPS = [
    {x: 40, y: 435},   // Bên trái chuồng gà, sát hàng rào trước
    {x: 170, y: 435},  // Bên phải chuồng gà, dọc hàng rào trước
    {x: 290, y: 235},  // Góc trên bên trái ruộng rau, cạnh hàng rào sau
    {x: 725, y: 235},  // Góc trên bên phải ruộng rau, cạnh hàng rào sau & bù nhìn
    {x: 735, y: 440},  // Góc dưới bên phải ruộng rau, cạnh lối đi & máy radio
    {x: 940, y: 465},  // Bên cạnh chuồng bò, gần giếng nước
  ];

  // Chuỗi bóng đèn tròn nhỏ (fairy lights) treo võng cong giữa 2 đèn ở chuồng gà
  const FAIRY_BULBS = (() => {
    const p0 = FARM_LAMPS[0], p1 = FARM_LAMPS[1];
    const ctrlX = (p0.x + p1.x) / 2, ctrlY = p0.y + 14;
    const bulbs = [], count = 8;
    for (let k = 0; k < count; k++) {
      const u = (k + 1) / (count + 1);
      const bx = (1 - u) * (1 - u) * p0.x + 2 * (1 - u) * u * ctrlX + u * u * p1.x;
      const by = (1 - u) * (1 - u) * (p0.y - 10) + 2 * (1 - u) * u * ctrlY + u * u * (p1.y - 10);
      bulbs.push({x: Math.round(bx * 10) / 10, y: Math.round((by + 3.5) * 10) / 10, k});
    }
    return bulbs;
  })();

  // Bảng màu ấm xen kẽ cho dây đèn trang trí ban đêm
  const FAIRY_WARM_COLORS = ["#ffd166", "#ff9ebb", "#fff3b0", "#f4a261", "#ff758f", "#ffe66d"];
  // Màu nhạt cho dây đèn ban ngày khi chưa bật
  const FAIRY_DAY_COLORS = ["#fae1dd", "#fde2e4", "#fdf0d5", "#f0efeb"];

  // Vẽ các cột đèn mộc mạc và dây đèn trang trí khu nông trại
  function drawFarmLamps(t, night) {
    // 1. Dây đèn trang trí (fairy lights) uốn cong võng giữa 2 cột đèn ở chuồng gà
    const p0 = FARM_LAMPS[0], p1 = FARM_LAMPS[1];
    const ctrlX = (p0.x + p1.x) / 2, ctrlY = p0.y + 14;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y - 10);
    ctx.quadraticCurveTo(ctrlX, ctrlY, p1.x, p1.y - 10);
    ctx.strokeStyle = night ? "rgba(40, 30, 20, 0.65)" : "rgba(60, 45, 30, 0.75)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Vẽ từng bóng đèn tròn nhỏ trên dây đèn
    FAIRY_BULBS.forEach(b => {
      // Đui đèn đen nhỏ gắn vào dây
      ctx.fillStyle = "#2d3142";
      ctx.fillRect(b.x - 1, b.y - 4.5, 2, 2.5);

      if (night) {
        // Ban đêm: tỏa vầng sáng nhẹ và nhấp nháy êm dịu
        const tw = Math.sin(t * 4 + b.k * 1.5) * 0.08;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const fg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 14);
        fg.addColorStop(0, `rgba(255, 220, 140, ${0.45 + tw})`);
        fg.addColorStop(0.5, `rgba(255, 170, 70, ${(0.25 + tw) * 0.6})`);
        fg.addColorStop(1, "rgba(255, 150, 50, 0)");
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Bóng đèn tròn màu ấm xen kẽ
        ctx.fillStyle = FAIRY_WARM_COLORS[b.k % FAIRY_WARM_COLORS.length];
        ctx.beginPath();
        ctx.arc(b.x, b.y, 2.4, 0, Math.PI * 2);
        ctx.fill();
        // Đốm sáng trắng phản chiếu
        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        ctx.beginPath();
        ctx.arc(b.x - 0.6, b.y - 0.7, 0.8, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Ban ngày: bóng đèn tắt, màu nhạt
        ctx.fillStyle = FAIRY_DAY_COLORS[b.k % FAIRY_DAY_COLORS.length];
        ctx.beginPath();
        ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
    });

    // 2. Vẽ 6 cột đèn nông trại mộc mạc
    FARM_LAMPS.forEach((l, i) => {
      const x = l.x, y = l.y;

      // Bóng đổ mờ chân cột trên nền cỏ
      ctx.fillStyle = "rgba(0, 0, 0, 0.14)";
      ctx.beginPath();
      ctx.ellipse(x - 7, y + 16, 5, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cột gỗ mộc mạc (rustic wooden post) màu nâu với vân gỗ
      ctx.fillStyle = "#6d4a2d";
      ctx.fillRect(x - 9, y - 18, 4, 34);
      // Viền sáng cạnh gỗ
      ctx.fillStyle = "#8d6346";
      ctx.fillRect(x - 9, y - 18, 1, 34);
      // Vân gỗ sẫm màu
      ctx.fillStyle = "#4f321d";
      ctx.fillRect(x - 7, y - 11, 1, 11);
      ctx.fillRect(x - 8, y + 5, 1, 7);
      // Chóp đầu cột gỗ
      ctx.fillStyle = "#523720";
      ctx.fillRect(x - 10, y - 20, 6, 2);

      // Nhánh tay đỡ ngắn bằng gỗ & thanh chéo gia cố
      ctx.fillStyle = "#523720";
      ctx.fillRect(x - 8, y - 16, 10, 3);
      ctx.strokeStyle = "#523720";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x - 7, y - 8);
      ctx.lineTo(x - 1, y - 14);
      ctx.stroke();
      // Chốt sắt gắn tay đỡ
      ctx.fillStyle = "#2b2d42";
      ctx.fillRect(x - 1, y - 17, 3, 4);

      // Dây móc sắt treo đèn
      ctx.strokeStyle = "#2b2d42";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y - 13);
      ctx.lineTo(x, y - 6);
      ctx.stroke();

      // Chao đèn kim loại nhỏ kiểu nông trại (metal shade)
      ctx.fillStyle = "#374151";
      ctx.beginPath();
      ctx.moveTo(x - 7, y - 3);
      ctx.lineTo(x - 2, y - 7);
      ctx.lineTo(x + 2, y - 7);
      ctx.lineTo(x + 7, y - 3);
      ctx.closePath();
      ctx.fill();
      // Vành kim loại của chao đèn
      ctx.fillStyle = "#1f2937";
      ctx.fillRect(x - 8, y - 3, 16, 1.4);
      // Núm kim loại trên chao đèn
      ctx.fillStyle = "#111827";
      ctx.beginPath();
      ctx.arc(x, y - 7.5, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Bóng đèn (bulb)
      if (night) {
        // Ban đêm: vầng sáng vàng ấm tỏa tròn với độ nhấp nháy nhẹ dùng t
        const flicker = Math.sin(t * 7 + i * 2.1) * 0.05 + Math.sin(t * 13 + i * 1.7) * 0.03;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const haloR = 48;
        const gGlow = ctx.createRadialGradient(x, y, 0, x, y, haloR);
        const alpha = Math.max(0.1, 0.42 + flicker);
        gGlow.addColorStop(0, `rgba(255, 230, 130, ${alpha})`);
        gGlow.addColorStop(0.28, `rgba(255, 185, 60, ${alpha * 0.65})`);
        gGlow.addColorStop(0.65, `rgba(255, 130, 25, ${alpha * 0.22})`);
        gGlow.addColorStop(1, "rgba(255, 100, 0, 0)");
        ctx.fillStyle = gGlow;
        ctx.beginPath();
        ctx.arc(x, y, haloR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Thân bóng đèn sáng rực màu vàng ấm
        ctx.fillStyle = "#ffe066";
        ctx.beginPath();
        ctx.arc(x, y, 3.8, 0, Math.PI * 2);
        ctx.fill();
        // Tim bóng đèn rực sáng trắng ở giữa
        ctx.fillStyle = "#fffbeb";
        ctx.beginPath();
        ctx.arc(x, y - 0.5, 2, 0, Math.PI * 2);
        ctx.fill();

        // Đom đóm / bướm đêm lượn quanh bóng đèn lúc đêm về
        for (let m = 0; m < 3; m++) {
          const spd = 2.0 + m * 0.8;
          const ang = t * spd + i * 2.4 + m * 2.1;
          const dist = 9 + m * 5 + Math.sin(t * 3.5 + m + i) * 3;
          const mx = x + Math.cos(ang) * dist;
          const my = y + Math.sin(ang * 1.2) * (dist * 0.55) - 2;
          // Cánh bướm đêm vỗ nhẹ
          const flap = Math.sin(t * 24 + m * 4 + i) * 1.3;
          ctx.fillStyle = "rgba(255, 248, 220, 0.75)";
          ctx.beginPath();
          ctx.ellipse(mx - 1, my, Math.abs(flap) + 0.4, 0.9, -0.3, 0, Math.PI * 2);
          ctx.ellipse(mx + 1, my, Math.abs(flap) + 0.4, 0.9, 0.3, 0, Math.PI * 2);
          ctx.fill();
          // Thân phát sáng nhỏ
          ctx.fillStyle = "#fff8b0";
          ctx.beginPath();
          ctx.arc(mx, my, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Ban ngày: bóng đèn tắt, màu nhạt mờ
        ctx.fillStyle = "#e9ecef";
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fill();
        // Sợi đốt mờ bên trong
        ctx.strokeStyle = "#adb5bd";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(x, y - 0.5, 1.4, 0, Math.PI);
        ctx.stroke();
        // Viền bóng thủy tinh
        ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
  }

  function drawFarm(t) {
    const {L, R, T, B} = bleed(), wv = R - L;
    const night = Life.darkness() > .5, [s0, s1] = night ? ["#060a22", "#27316b"] : Life.skyColors();
    const g = ctx.createLinearGradient(0, -100, 0, 160); g.addColorStop(0, s0); g.addColorStop(1, s1);
    ctx.fillStyle = g; ctx.fillRect(L, T, wv, 170 - T);
    const M = LAYOUT.moon;
    ctx.fillStyle = night ? "#fff6c8" : "#ffe066"; ctx.beginPath(); ctx.arc(M.x, M.y, night ? 12 : 16, 0, 7); ctx.fill();
    if (!night) { ctx.fillStyle = "rgba(255,255,255,.9)"; for (let k = 0; k < 4; k++) { const cx = ((t * (4 + k) + k * 330) % (W + 300)) - 150, cy = 22 + (k % 2) * 24; ctx.beginPath(); ctx.arc(cx, cy, 11, 0, 7); ctx.arc(cx + 14, cy - 5, 14, 0, 7); ctx.arc(cx + 28, cy, 10, 0, 7); ctx.fill(); } }
    ctx.save(); ctx.translate(cam.x * .3, 0);                                // đồi xa trôi chậm (parallax)
    ctx.fillStyle = night ? "#22402a" : "#9bc53d";
    ctx.beginPath(); ctx.moveTo(L - 400, 160); for (let x = L - 400; x <= R + 400; x += 20) ctx.lineTo(x, 104 + Math.sin(x * .03) * 14 + Math.sin(x * .011) * 10); ctx.lineTo(R + 400, 160); ctx.fill();
    ctx.restore();
    // nhà kho đỏ + silo (bên trái)
    ctx.save(); ctx.translate(20, 0);
    ctx.fillStyle = "#b23a48"; ctx.fillRect(16, 74, 96, 86);
    ctx.fillStyle = "#7d1d2b"; ctx.beginPath(); ctx.moveTo(8, 78); ctx.lineTo(64, 40); ctx.lineTo(120, 78); ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.strokeRect(44, 108, 40, 50); ctx.beginPath(); ctx.moveTo(44, 108); ctx.lineTo(84, 158); ctx.moveTo(84, 108); ctx.lineTo(44, 158); ctx.stroke();
    ctx.fillStyle = "#ffd166"; ctx.fillRect(58, 84, 12, 10);
    ctx.fillStyle = "#adb5bd"; rr(ctx, 122, 70, 26, 90, 6); ctx.fill(); ctx.fillStyle = "#6c757d"; ctx.beginPath(); ctx.arc(135, 72, 13, Math.PI, 0); ctx.fill();
    ctx.restore();
    // cối xay gió quay chậm (bên phải)
    ctx.save(); ctx.translate(700, 0);
    ctx.fillStyle = "#e9ecef"; ctx.beginPath(); ctx.moveTo(278, 160); ctx.lineTo(286, 70); ctx.lineTo(298, 70); ctx.lineTo(306, 160); ctx.fill();
    ctx.save(); ctx.translate(292, 70); ctx.rotate(t * .6); ctx.fillStyle = "#f8f9fa"; ctx.strokeStyle = "#868e96"; ctx.lineWidth = 1;
    for (let k = 0; k < 4; k++) { ctx.rotate(Math.PI / 2); ctx.fillRect(2, -4, 34, 8); ctx.strokeRect(2, -4, 34, 8); }
    ctx.restore(); ctx.fillStyle = "#495057"; ctx.beginPath(); ctx.arc(292, 70, 4, 0, 7); ctx.fill();
    ctx.restore();
    // hàng rào trắng đường làng phía sau
    ctx.fillStyle = "#c9b38a"; ctx.fillRect(L, 156, wv, 10);
    // nền cỏ
    ctx.fillStyle = "#7cb76b"; ctx.fillRect(L, 160, wv, B - 160);
    ctx.fillStyle = "#6aa55a"; for (let k = 0; k < 360; k++) ctx.fillRect(((k * 71) % (W + 200)) - 100, 160 + (k * 137) % 460, 2, 5);

    // GÀ VÀ BÒ ĐI LẠI Ở NỀN SAU (ven đường làng / sườn cỏ y: 170-210)
    // 1. Chú bò sữa gặm cỏ ở nền sau (gần cối xay gió)
    const cowX = 850 + Math.sin(t * .4) * 12, cowY = 186;
    // Hướng nhìn (flip) tính theo đạo hàm vận tốc d(cowX)/dt = 12 * 0.4 * cos(0.4*t)
    const cowFlip = Math.cos(t * .4) >= 0 ? 1 : -1;
    drawCow(cowX, cowY, 0.85, t, cowFlip, 0);

    // 2. Đàn gà mẹ con đi lon ton ở nền sau (phía sau ruộng)
    for (let k = 0; k < 4; k++) {
      const isChick = k > 0, gcx = 250 + ((t * (isChick ? 8 : 5) + k * 35) % 200), gcy = 184 + (k % 2) * 6;
      // Đạo hàm dx/dt > 0 do t tăng tuyến tính trong hàm modulo, hướng nhìn luôn quay sang phải (1)
      const flip = 1;
      if (isChick) drawChick(gcx, gcy, 0.65, t, flip, k);
      else drawHen(gcx, gcy, 0.8, t, flip, k);
    }

    // hàng rào trắng ngăn cách nền sau và khu ruộng
    ctx.fillStyle = "#f8f9fa"; ctx.fillRect(L, 215, 460 - L, 3); ctx.fillRect(L, 225, 460 - L, 3); ctx.fillRect(660, 215, R - 660, 3); ctx.fillRect(660, 225, R - 660, 3);
    for (let x = Math.floor(L / 18) * 18 + 4; x < R; x += 18) { if (x > 454 && x < 660) continue; rr(ctx, x, 210, 5, 22, 2); ctx.fill(); }

    // ruộng 8 ô Ở CHÍNH GIỮA MÀN HÌNH (y: 250..430)
    ctx.fillStyle = "#8d6346"; rr(ctx, 308, 250, 394, 182, 8); ctx.fill();
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
    // ruộng hướng dương trang trí bên phải (rạp theo gió)
    for (let r = 0; r < 4; r++) for (let k = 0; k < 7; k++) {
      const x = 770 + k * 44 + (r % 2) * 18, y = 214 + r * 40, sw = Math.sin(t * 1.4 + k * .5 + r) * 2.5;
      ctx.strokeStyle = "#4f7942"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y + 20); ctx.lineTo(x + sw, y); ctx.stroke();
      ctx.fillStyle = "#ffc300"; ctx.beginPath(); ctx.arc(x + sw, y, 6, 0, 7); ctx.fill(); ctx.fillStyle = "#7f4f24"; ctx.beginPath(); ctx.arc(x + sw, y, 2.6, 0, 7); ctx.fill();
    }
    // hàng rào trắng phía trước ruộng (có lối vào ở giữa)
    ctx.fillStyle = "#f8f9fa"; ctx.fillRect(L, 442, 520 - L, 4); ctx.fillRect(L, 454, 520 - L, 4); ctx.fillRect(600, 442, R - 600, 4); ctx.fillRect(600, 454, R - 600, 4);
    for (let x = Math.floor(L / 18) * 18 + 4; x < R; x += 18) { if (x > 514 && x < 600) continue; rr(ctx, x, 436, 6, 28, 2); ctx.fill(); }
    // bù nhìn rơm đứng cạnh ruộng (bên phải)
    ctx.save(); ctx.translate(720, -50);
    ctx.fillStyle = "#6b4a35"; ctx.fillRect(0, 330, 4, 34); ctx.fillRect(-12, 340 + Math.sin(t * 2) * 1, 28, 3);
    ctx.fillStyle = "#e9c46a"; ctx.beginPath(); ctx.arc(2, 328, 7, 0, 7); ctx.fill(); ctx.fillStyle = "#9c6644"; ctx.fillRect(-6, 318, 16, 4); ctx.fillRect(-3, 312, 10, 6);
    ctx.restore();
    // tổ ong cạnh nhà kho + ong bay
    ctx.fillStyle = "#f4a261"; rr(ctx, 190, 128, 22, 26, 6); ctx.fill(); ctx.fillStyle = "#6b4a35"; ctx.fillRect(199, 154, 4, 12);
    ctx.fillStyle = "rgba(0,0,0,.25)"; for (let k = 0; k < 3; k++) ctx.fillRect(192, 134 + k * 7, 18, 1.5);
    for (let k = 0; k < 3; k++) { ctx.fillStyle = "#ffd60a"; ctx.beginPath(); ctx.arc(201 + Math.sin(t * 3 + k * 2) * 20, 136 + Math.cos(t * 4 + k) * 12, 1.8, 0, 7); ctx.fill(); }
    // giếng nước
    ctx.save(); ctx.translate(560, 20);
    ctx.fillStyle = "#868e96"; ctx.beginPath(); ctx.ellipse(318, 410, 18, 8, 0, 0, 7); ctx.fill(); ctx.fillRect(300, 410, 36, 14);
    ctx.fillStyle = "#1d3557"; ctx.beginPath(); ctx.ellipse(318, 410, 13, 5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#6b4a35"; ctx.fillRect(301, 386, 3, 24); ctx.fillRect(332, 386, 3, 24); ctx.fillStyle = "#9c2c2c"; ctx.beginPath(); ctx.moveTo(296, 388); ctx.lineTo(318, 376); ctx.lineTo(340, 388); ctx.fill();
    ctx.restore();
    // thùng gỗ dưới radio + xe cút kít
    ctx.save(); ctx.translate(560, 0); ctx.fillStyle = "#9c6644"; ctx.fillRect(238, 422, 40, 18); ctx.strokeStyle = "#6b4a35"; ctx.strokeRect(238, 422, 40, 18); ctx.restore();
    ctx.save(); ctx.translate(220, 0);
    ctx.fillStyle = "#6c757d"; ctx.beginPath(); ctx.moveTo(110, 520); ctx.lineTo(146, 520); ctx.lineTo(140, 532); ctx.lineTo(114, 532); ctx.fill();
    ctx.fillStyle = "#333"; ctx.beginPath(); ctx.arc(116, 536, 4, 0, 7); ctx.fill();
    ctx.restore();
    drawRadio(t);
    // chuồng gà (trái dưới) + gà, gà con chạy lon ton
    ctx.save(); ctx.translate(30, 0);
    // Nhà chuồng gỗ
    ctx.fillStyle = "#c9a36b"; rr(ctx, 8, 474, 84, 50, 4); ctx.fill();
    ctx.strokeStyle = "rgba(100, 60, 20, 0.18)"; ctx.lineWidth = 1;
    for (let py = 484; py <= 516; py += 10) { ctx.beginPath(); ctx.moveTo(9, py); ctx.lineTo(91, py); ctx.stroke(); }
    // Mái ngói chuồng gà
    ctx.fillStyle = "#9c6644"; ctx.beginPath(); ctx.moveTo(4, 478); ctx.lineTo(50, 456); ctx.lineTo(96, 478); ctx.fill();
    ctx.fillStyle = "#7f4f24"; ctx.beginPath(); ctx.moveTo(2, 478); ctx.lineTo(50, 453); ctx.lineTo(98, 478); ctx.lineTo(96, 481); ctx.lineTo(50, 456); ctx.lineTo(4, 481); ctx.closePath(); ctx.fill();
    // Cửa chuồng + cọng rơm vàng ở lối ra vào
    ctx.fillStyle = "#5c3d2a"; rr(ctx, 40, 498, 20, 26, 3); ctx.fill();
    ctx.fillStyle = "#e9c46a"; ctx.fillRect(38, 521, 24, 3);
    // Đàn gà mái và gà con chạy lon ton
    for (let k = 0; k < 6; k++) {
      const isChick = k > 2, cx = 30 + ((t * (isChick ? 9 : 6) + k * 47) % 170), cy = 540 + Math.sin(t + k * 2) * 10 - (k % 2) * 8;
      // Đạo hàm dx/dt > 0 do t tăng tuyến tính trong hàm modulo, hướng nhìn quay sang phải (1)
      const flip = 1;
      if (isChick) drawChick(cx, cy, 0.75, t, flip, k);
      else drawHen(cx, cy, 0.95, t, flip, k);
    }
    ctx.restore();
    // chuồng bò (phải dưới) + bò gặm cỏ
    ctx.save(); ctx.translate(700, 40);
    // Nền rơm lót chuồng bò
    ctx.fillStyle = "rgba(233, 196, 106, 0.28)";
    ctx.beginPath(); ctx.ellipse(308, 476, 40, 26, 0, 0, Math.PI * 2); ctx.fill();
    // Hàng rào trắng quanh chuồng bò + cọc rào ở góc
    ctx.strokeStyle = "#f8f9fa"; ctx.lineWidth = 2.5; ctx.strokeRect(262, 438, 92, 76);
    ctx.lineWidth = 1.5; ctx.strokeRect(262, 448, 92, 56);
    ctx.fillStyle = "#f8f9fa";
    rr(ctx, 260, 434, 5, 12, 1); ctx.fill();
    rr(ctx, 351, 434, 5, 12, 1); ctx.fill();
    rr(ctx, 260, 506, 5, 12, 1); ctx.fill();
    rr(ctx, 351, 506, 5, 12, 1); ctx.fill();
    // Hai chú bò sữa gặm cỏ trong chuồng
    for (let k = 0; k < 2; k++) {
      const cx = 286 + k * 42 + Math.sin(t * .3 + k * 3) * 6, cy = 470 + k * 22;
      // Đạo hàm dx/dt = 6 * 0.3 * cos(0.3*t + 3*k), quay mặt theo hướng di chuyển
      const flip = Math.cos(t * .3 + k * 3) >= 0 ? 1 : -1;
      drawCow(cx, cy, 0.95, t, flip, k + 1);
    }
    ctx.restore();
    // Đèn nông trại mộc mạc (cột gỗ, bóng vàng ấm, bướm đêm/đom đóm) & dây đèn fairy lights
    drawFarmLamps(t, night);
    for (let k = 0; k < 6; k++) {                                        // bướm
      const bx = (t * 18 + k * 190) % (W + 40) - 20, byy = 220 + (k % 3) * 60 + Math.sin(t * 2 + k) * 20, f = Math.abs(Math.sin(t * 10 + k)) * 3 + 1;
      ctx.fillStyle = ["#ff8fab", "#ffd166", "#a0c4ff"][k % 3]; ctx.beginPath(); ctx.ellipse(bx - 2, byy, f, 3, 0, 0, 7); ctx.ellipse(bx + 2, byy, f, 3, 0, 0, 7); ctx.fill();
    }
  }
  function haySeat(i, t) {
    const b = BEDS[i], o = bedOwner(i), sit = o && o.lying;
    if (sit) drawPlayer({...o, x: b.x + 28, y: b.y + 26, walking: false, up: false, sit: true}, t);
    ctx.fillStyle = "#e9c46a"; rr(ctx, b.x, b.y + 14, b.w || BED_W, 22, 5); ctx.fill();
    ctx.strokeStyle = "#c9a227"; ctx.lineWidth = 1; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(b.x + 4, b.y + 18 + k * 5); ctx.lineTo(b.x + BED_W - 4, b.y + 18 + k * 5); ctx.stroke(); }
    ctx.fillStyle = "#9c6644"; ctx.fillRect(b.x + 14, b.y + 14, 3, 22); ctx.fillRect(b.x + BED_W - 17, b.y + 14, 3, 22);
  }
  async function tapPlot(i) {
    const pl = S().farm[i], inf = plotInfo(pl);
    if (inf.st === "empty") return openSeeds(i);
    if (inf.st === "dry") {
      if (await Life.eco("water", {i})) { Life.apply({xp: 1}); Life.commit(); toast(`💧 Đã tưới ${inf.c.name}! Chín sau ${fmtTime(inf.c.time)}`); }
      return;
    }
    if (inf.st === "grow") { toast(`${inf.c.e} ${inf.c.name} đang lớn… còn ${fmtTime(inf.left)}`); return; }
    const r = await Life.eco("harvest", {i}); if (!r) return;             // server kiểm tra đã chín, tung 2-3 quả
    Life.apply({xp: inf.c.xp, fun: 4}); Life.commit();
    toast(`🧺 Thu hoạch ${r.n} ${inf.c.e} ${inf.c.name}! Mang ra bác Năm bán nhé`);
  }
  function openSeeds(i) {
    const st = S();
    openSheet("🌱 Gieo hạt",
      `${Life.coinLine()}<div class="grid">${CROPS.map(c => {
        const have = (st.inv["seed_" + c.id] || {}).n || 0;
        return `<button class="opt" data-c="${c.id}">${c.e} ${c.name}<small>${have ? `có ${have} hạt` : `mua ${c.seed} 💰`} · chín sau ${fmtTime(c.time)} · bán ${c.sell} 💰</small></button>`;
      }).join("")}</div><div class="vol" style="font-size:12px">Gieo xong nhớ chạm lần nữa để 💧 tưới thì cây mới lớn.</div>`,
      el => el.querySelectorAll("[data-c]").forEach(b => b.onclick = async () => {
        const c = CR[b.dataset.c];
        if (!(await Life.eco("plant", {i, c: c.id}))) return;            // dùng hạt trong rương, hết thì mua
        Life.apply({xp: 1}); Life.commit(); closeSheet();
        toast(`🌱 Đã gieo ${c.name}. Chạm ô đất để 💧 tưới nước!`);
      }));
  }
  function openFarmer() {
    const st = S(), cropPrice = id => (CR[id.slice(5)] || {}).sell || 0;      // giá lấy theo catalog
    const crops = Object.entries(st.inv).filter(([id, x]) => x.cat === "crop" && x.n > 0).map(([id, x]) => [id, {...x, sell: cropPrice(id)}]);
    const total = crops.reduce((s, [, x]) => s + x.n * x.sell, 0);
    openSheet("🧑‍🌾 Bác Năm",
      `${Life.coinLine()}<div class="sec">🧺 Bán nông sản</div>
       ${crops.length ? `<div class="board">${crops.map(([, x]) => `<div><span>${x.e} ${esc(x.name)} ×${x.n}</span><b>${x.n * x.sell} 💰</b></div>`).join("")}</div>
       <button class="primary" id="sellAll" style="margin-top:8px">Bán hết (+${total} 💰)</button>` : `<div class="vol" style="margin:0">Chưa có nông sản. Trồng rau rồi thu hoạch nhé!</div>`}
       <div class="sec">🌱 Mua hạt giống (cất vào rương)</div>
       <div class="grid">${CROPS.map(c => `<button class="opt" data-c="${c.id}">${c.e} Hạt ${c.name}<small>${c.seed} 💰 · có ${(st.inv["seed_" + c.id] || {}).n || 0}</small></button>`).join("")}</div>`,
      el => {
        const sa = el.querySelector("#sellAll");
        if (sa) sa.onclick = async () => {
          const r = await Life.eco("sellCrops"); if (!r) return;
          Life.apply({xp: Math.ceil(r.total / 20)}); Life.commit(); closeSheet(); toast(`💰 Bán được ${r.total} xu!`);
        };
        el.querySelectorAll("[data-c]").forEach(b => b.onclick = async () => {
          if (await Life.eco("buySeed", {c: b.dataset.c})) openFarmer();
        });
      });
  }

  // ---------- 6. Hồ câu cá ----------
  let fishState = null;                                                  // {seat, phase: wait|bite, at}
  const SWIM = FISH.filter(f => f.id !== "boot").slice(0, 7);
  function drawFishing(t) {                          // 🎣 hồ câu NGANG 1120x600: mặt hồ phía trên, cầu gỗ giữa, bờ cỏ phía dưới
    const {L, R, T, B} = bleed(), wv = R - L, night = Life.darkness() > .5;
    const g = ctx.createLinearGradient(0, -100, 0, 80);                  // trời hoàng hôn / đêm
    if (night) { g.addColorStop(0, "#060a22"); g.addColorStop(1, "#2b2d6b"); } else { g.addColorStop(0, "#f28482"); g.addColorStop(1, "#ffd6a5"); }
    ctx.fillStyle = g; ctx.fillRect(L, T, wv, 90 - T);
    const M = LAYOUT.moon;
    ctx.fillStyle = night ? "#fff6c8" : "#ffb703"; ctx.beginPath(); ctx.arc(M.x, M.y + 20, night ? 11 : 18, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(cam.x * .3, 0);                            // núi xa trôi chậm (parallax)
    ctx.fillStyle = night ? "#1b2a3a" : "#c08497"; ctx.beginPath(); ctx.moveTo(L - 400, 84);
    for (let x = L - 400; x <= R + 400; x += 20) ctx.lineTo(x, 60 + Math.sin(x * .025) * 12); ctx.lineTo(R + 400, 84); ctx.fill();
    ctx.restore();
    // mặt hồ phản chiếu trời — mở rộng xuống giữa màn hình
    const wg = ctx.createLinearGradient(0, 80, 0, 390);
    if (night) { wg.addColorStop(0, "#1b2a5a"); wg.addColorStop(1, "#0d1b3a"); } else { wg.addColorStop(0, "#f7b2a0"); wg.addColorStop(.35, "#7ec8e3"); wg.addColorStop(1, "#3a86c8"); }
    ctx.fillStyle = wg; ctx.fillRect(L, 80, wv, 310);
    ctx.fillStyle = night ? "rgba(255,246,200,.25)" : "rgba(255,183,3,.35)";
    for (let k2 = 0; k2 < 7; k2++) ctx.fillRect(M.x - 16 + Math.sin(t * 2 + k2) * 4, 96 + k2 * 10, 32 - k2 * 3, 2);
    ctx.strokeStyle = "rgba(255,255,255,.25)"; ctx.lineWidth = 1;
    for (let k2 = 0; k2 < 40; k2++) { const wx = (k2 * 67 + t * 6) % (W + 40) - 20, wy = 110 + (k2 * 41) % 210; ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + 14, wy); ctx.stroke(); }
    // cá bơi dưới nước (bóng cá)
    for (let rep = 0; rep < 2; rep++) SWIM.forEach((f, i) => {
      const dir = (i + rep) % 2 ? 1 : -1, span = W + 40, fx = (((t * (10 + i * 2) * dir + i * 90 + rep * 500) % span) + span) % span - 20, fy = 140 + i * 24 + Math.sin(t + i + rep) * 6;
      ctx.save(); ctx.translate(fx, fy); ctx.scale(dir, 1); ctx.globalAlpha = .55;
      ctx.fillStyle = f.color; ctx.beginPath(); ctx.ellipse(0, 0, 8, 3.5, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-12, -3.5 + Math.sin(t * 8 + i) * 1.5); ctx.lineTo(-12, 3.5 + Math.sin(t * 8 + i) * 1.5); ctx.fill();
      ctx.restore(); ctx.globalAlpha = 1;
    });
    // bong bóng nổi
    for (let k = 0; k < 6; k++) { const ph = (t * .3 + k / 6) % 1; ctx.strokeStyle = `rgba(255,255,255,${.5 * (1 - ph)})`; ctx.beginPath(); ctx.arc(120 + k * 170, 320 - ph * 150, 1.5 + ph * 2, 0, 7); ctx.stroke(); }
    // lá sen + hoa sen
    [[40, 140], [300, 170], [250, 120], [70, 230], [430, 250], [690, 140], [760, 230], [880, 150], [1010, 210], [1080, 130], [470, 110]].forEach(([x, y], i) => {
      ctx.fillStyle = "#52b788"; ctx.beginPath(); ctx.arc(x, y, 9, .3, 6); ctx.lineTo(x, y); ctx.fill();
      if (i % 2 === 0) { ctx.fillStyle = "#ffafcc"; ctx.beginPath(); ctx.ellipse(x + 2, y - 3, 3, 5, 0, 0, 7); ctx.ellipse(x - 2, y - 2, 3, 5, -.5, 0, 7); ctx.ellipse(x + 5, y - 2, 3, 5, .5, 0, 7); ctx.fill(); }
    });
    // lau sậy lay theo gió ven bờ nước mới
    for (const rx of [6, 14, 22, 60, 620, 628, 640, 1084, 1092, 1100]) {
      ctx.strokeStyle = "#588157"; ctx.lineWidth = 2.2; ctx.beginPath();
      ctx.moveTo(rx, 390); ctx.quadraticCurveTo(rx + Math.sin(t * 1.5 + rx) * 5, 345, rx + Math.sin(t * 1.5 + rx) * 8, 310); ctx.stroke();
      ctx.fillStyle = "#7f4f24"; ctx.fillRect(rx + Math.sin(t * 1.5 + rx) * 8 - 2, 305, 4, 14);
    }
    // cầu gỗ dài nối từ bờ ra giữa hồ (rộng rãi, có lan can và cọc gỗ)
    ctx.save(); ctx.translate(370, 0);
    // cọc trụ cầu dưới nước
    ctx.fillStyle = "#4a3428";
    for (const px of [160, 212]) for (let py = 150; py < 385; py += 42) ctx.fillRect(px, py, 5, 18);
    // mặt ván cầu gỗ
    ctx.fillStyle = "#a47148"; ctx.fillRect(156, 138, 60, 252);
    // vân gỗ ván ngang
    ctx.fillStyle = "rgba(0,0,0,.18)"; for (let py = 142; py < 390; py += 8) ctx.fillRect(156, py, 60, 1.5);
    // lan can gỗ 2 bên
    ctx.fillStyle = "#6b4a35";
    ctx.fillRect(156, 138, 3, 252); ctx.fillRect(213, 138, 3, 252);
    for (let py = 140; py < 390; py += 36) { ctx.fillRect(155, py, 5, 6); ctx.fillRect(212, py, 5, 6); }
    // đèn bão / đèn lồng nhỏ treo đầu cầu
    ctx.fillStyle = night ? "#ffd166" : "#e9ecef"; ctx.beginPath(); ctx.arc(156, 142, 3.5, 0, 7); ctx.arc(215, 142, 3.5, 0, 7); ctx.fill();
    if (night) {
      for (const lx of [156, 215]) {
        const cg = ctx.createRadialGradient(lx, 142, 0, lx, 142, 22);
        cg.addColorStop(0, "rgba(255,210,120,.5)"); cg.addColorStop(1, "rgba(255,210,120,0)");
        ctx.fillStyle = cg; ctx.fillRect(lx - 22, 120, 44, 44);
      }
    }
    ctx.restore();
    // chuồn chuồn + vịt trời
    for (let k2 = 0; k2 < 4; k2++) { const dx = 120 + k2 * 260 + Math.sin(t * .7 + k2 * 3) * 50, dy = 200 + Math.sin(t * 1.3 + k2) * 30; ctx.fillStyle = "#4361ee"; ctx.fillRect(dx - 5, dy, 10, 1.6); ctx.fillStyle = "rgba(200,230,255,.7)"; ctx.fillRect(dx - 2, dy - 3, 4, 2); ctx.fillRect(dx - 2, dy + 2, 4, 2); }
    for (let k = 0; k < 2; k++) {
      const dx = ((t * 8 + k * 30) % (W + 100)) - 50, dy = 128 + k * 10;
      ctx.save(); ctx.translate(dx, dy); ctx.scale(-1, 1); ctx.fillStyle = "#8d6346"; ctx.beginPath(); ctx.ellipse(0, 0, 7, 4, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#2d6a4f"; ctx.beginPath(); ctx.arc(-5, -4, 3, 0, 7); ctx.fill(); ctx.restore();
    }
    // bờ cát + cỏ — dời xuống thấp hơn
    ctx.fillStyle = "#e9d8a6"; ctx.fillRect(L, 386, wv, 26);
    ctx.fillStyle = "rgba(255,255,255,.4)"; ctx.fillRect(L, 386, wv, 2 + Math.sin(t * 2));
    ctx.fillStyle = "#74b566"; ctx.fillRect(L, 412, wv, B - 412);
    ctx.fillStyle = "#64a456"; for (let k2 = 0; k2 < 260; k2++) ctx.fillRect(((k2 * 71) % (W + 200)) - 100, 416 + (k2 * 137) % 190, 2, 5);
    // đom đóm ban đêm ven hồ
    if (night) {
      for (let k = 0; k < 18; k++) {
        const fx = (k * 73 + Math.sin(t * .7 + k) * 30) % W, fy = 350 + Math.sin(t * 1.1 + k * 1.4) * 60;
        const a = (.35 + .55 * Math.sin(t * 2.5 + k * 1.9)) * .9;
        if (a < 0.05) continue;
        const gg = ctx.createRadialGradient(fx, fy, 0, fx, fy, 7);
        gg.addColorStop(0, `rgba(200,255,100,${a})`); gg.addColorStop(1, "rgba(200,255,100,0)");
        ctx.fillStyle = gg; ctx.fillRect(fx - 7, fy - 7, 14, 14);
      }
    }
    // quầy bán mồi + mua cá (cô Lan)
    ctx.save(); ctx.translate(600, 0);
    ctx.fillStyle = "#9c6644"; ctx.fillRect(256, 404, 4, 46); ctx.fillRect(342, 404, 4, 46);
    ctx.fillStyle = "#e76f51"; ctx.beginPath(); ctx.moveTo(250, 412); ctx.lineTo(260, 394); ctx.lineTo(342, 394); ctx.lineTo(352, 412); ctx.fill();
    ctx.fillStyle = "#fff"; for (let x = 262; x < 342; x += 16) ctx.fillRect(x, 396, 8, 15);
    ctx.fillStyle = "#c9a36b"; rr(ctx, 258, 444, 86, 14, 3); ctx.fill();
    ctx.fillStyle = "#264653"; ctx.font = "800 8px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("🐛 MỒI CÂU · MUA CÁ", 300, 386);
    ctx.restore();
    // bảng kỷ lục cá lớn nhất tuần + cá hiếm vừa câu
    ctx.fillStyle = "#6b4a35"; ctx.fillRect(1004, 440, 4, 20); ctx.fillRect(1052, 440, 4, 20);
    ctx.fillStyle = "#f3e9dc"; rr(ctx, 988, 376, 84, 66, 4); ctx.fill(); ctx.strokeStyle = "#6b4a35"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "#264653"; ctx.font = "800 7px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("🏆 KỶ LỤC TUẦN", 1030, 386);
    ctx.font = "9px system-ui"; ctx.fillText("🐟 🐠 🐡", 1030, 400);
    if (fishState && fishState.lastRare) {
      ctx.fillStyle = "#e63946"; rr(ctx, 988, 412, 84, 26, 3); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "700 7px system-ui"; ctx.fillText("⭐ " + fishState.lastRare, 1030, 425);
    }
    // ghế xếp + xô cá + bàn để radio
    ctx.save(); ctx.translate(200, 0);
    ctx.fillStyle = "#4361ee"; rr(ctx, 98, 410, 30, 6, 2); ctx.fill(); ctx.strokeStyle = "#adb5bd"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(100, 432); ctx.lineTo(126, 412); ctx.moveTo(126, 432); ctx.lineTo(100, 412); ctx.stroke();
    ctx.fillStyle = "#adb5bd"; ctx.beginPath(); ctx.moveTo(140, 416); ctx.lineTo(160, 416); ctx.lineTo(157, 434); ctx.lineTo(143, 434); ctx.fill(); ctx.fillStyle = "#4895ef"; ctx.fillRect(142, 417, 16, 3);
    ctx.restore();
    ctx.save(); ctx.translate(100, 0);
    ctx.fillStyle = "#6b4a35"; ctx.fillRect(18, 438, 52, 5); ctx.fillRect(22, 443, 3, 16); ctx.fillRect(63, 443, 3, 16);
    ctx.restore();
    drawRadio(t);
    // cây ven hồ
    for (const [x, y] of [[40, 470], [470, 540], [700, 500], [1090, 540]]) {
      ctx.fillStyle = "rgba(0,0,0,.15)"; ctx.beginPath(); ctx.ellipse(x, y + 22, 16, 5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#7a5236"; ctx.fillRect(x - 3, y + 6, 6, 16);
      ctx.fillStyle = "#3f8f47"; ctx.beginPath(); ctx.arc(x + Math.sin(t + x) * 1, y, 16, 0, 7); ctx.fill();
    }
  }
  function fishSeat(i, t) {
    const b = BEDS[i], o = bedOwner(i), sit = o && o.lying, sx = b.x + 35, sy = b.y + 44;
    ctx.fillStyle = "#8d6346"; rr(ctx, sx - 10, sy - 6, 20, 6, 2); ctx.fill(); ctx.fillRect(sx - 8, sy, 3, 8); ctx.fillRect(sx + 5, sy, 3, 8);
    if (!sit) { ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.font = "11px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("🎣", sx, sy - 16); return; }
    const mine = o.id === myId && fishState && fishState.seat === i, bite = mine && fishState.phase === "bite";
    const bx = sx + 16, by = b.y - 30 + (bite ? 3 + Math.sin(t * 30) * 2 : Math.sin(t * 2 + i) * 1.2);
    ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(bx, by + 3, 6 + (t * 6 % 5), 2, 0, 0, 7); ctx.stroke();
    drawPlayer({...o, x: sx, y: sy, walking: false, up: true, sit: true}, t);
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
  async function castLine(bait) {
    const m = me();
    if (!m || m.bed == null) return;
    const cast = await Life.eco("cast", {bait: bait.id}); if (!cast) return;   // server trừ mồi + hẹn giờ cá cắn
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
      let pulling = false;
      pull.onclick = async () => {
        if (!fishState || pulling) return;
        pulling = true; clear();
        const r = await Life.eco("pull");
        if (!r || r.r === "early") return end(`<div class="wheelBig">💨</div><div class="pomoSub">Giật sớm quá, cá chạy mất rồi 😅</div>`);
        if (r.r === "late") return end(`<div class="wheelBig">🌊</div><div class="pomoSub">Chậm quá, cá ăn mồi rồi bơi mất…</div>`);
        const fish = FISH[r.fish];
        Life.apply({fun: 6, xp: fish.rare ? 8 : 3}); Life.commit();
        if (fish.rare) { send({t: "emote", e: "😂"}); if (fishState) fishState.lastRare = fish.name; }
        end(`<div class="wheelBig">${fish.e}</div><div class="pomoSub">Câu được <b style="color:var(--accent)">${fish.name}</b>${fish.rare ? " ✨ hiếm!" : ""} · bán được ${fish.price} 💰</div>`);
      };
      timers.push(setTimeout(() => {
        if (!fishState) return;
        fishState.phase = "bite"; Sound.ensure(); if (Sound.ctx) Sound.tone(Sound.master, 880, Sound.ctx.currentTime, .15, "square", .05);
        if (pull.isConnected) { el.querySelector("#fz").textContent = "❗"; el.querySelector("#ft").innerHTML = "<b style='color:var(--accent)'>CÁ CẮN! BẤM KÉO NGAY!</b>"; pull.style.background = "#ff4d6d"; pull.style.color = "#fff"; }
        timers.push(setTimeout(() => { if (fishState && fishState.phase === "bite" && !pulling) end(`<div class="wheelBig">🌊</div><div class="pomoSub">Chậm quá, cá ăn mồi rồi bơi mất…</div>`); }, 1400));
      }, cast.wait * 1000));
    });
  }
  function openBait() {
    const st = S(), FI = Object.fromEntries(FISH.map(f => [f.id, f]));
    const fish = Object.entries(st.inv).filter(([, x]) => x.cat === "fish" && x.n > 0).map(([id, x]) => [id, {...x, sell: (FI[id.slice(5)] || {}).price || 0}]);
    const total = fish.reduce((s, [, x]) => s + x.n * x.sell, 0);
    openSheet("🐛 Quầy cô Lan",
      `${Life.coinLine()}<div class="sec">Mua mồi câu</div>
       <div class="grid">${BAITS.map(b => `<button class="opt" data-b="${b.id}">${b.e} ${b.name} ×${b.pack}<small>${b.price} 💰 · đang có ${st.bait[b.id] || 0}</small></button>`).join("")}</div>
       <div class="sec">🐟 Bán cá</div>
       ${fish.length ? `<div class="board">${fish.map(([, x]) => `<div><span>${x.e} ${esc(x.name)} ×${x.n}</span><b>${x.n * x.sell} 💰</b></div>`).join("")}</div>
       <button class="primary" id="sellFish" style="margin-top:8px">Bán hết (+${total} 💰)</button>` : `<div class="vol" style="margin:0">Chưa có cá nào để bán.</div>`}`,
      el => {
        el.querySelectorAll("[data-b]").forEach(btn => btn.onclick = async () => {
          if (await Life.eco("buyBait", {id: btn.dataset.b})) openBait();
        });
        const sf = el.querySelector("#sellFish");
        if (sf) sf.onclick = async () => {
          const r = await Life.eco("sellFish"); if (!r) return;
          Life.apply({xp: Math.ceil(r.total / 20)}); Life.commit(); closeSheet(); toast(`💰 Bán cá được ${r.total} xu!`);
        };
      });
  }

  // ---------- 7. Khu mua sắm (NGANG 1000x600) ----------
  const STORE_R = MALL_STORES.map((s, k) => ({...s, x: 25 + k * 192, y: 18, w: 182, h: 142}));
  const CASHIER_R = {x: 440, y: 190, w: 120, h: 46};
  function drawMall(t) {
    const {L, R, T, B} = bleed(), wv = R - L;
    ctx.fillStyle = "#fde2e4"; ctx.fillRect(L, T, wv, 165 - T);
    ctx.fillStyle = "#fff"; for (let x = Math.floor(L / 30) * 30; x < R; x += 30) ctx.fillRect(x, -10, 2, 28);
    for (let x = 60; x < W; x += 180) {                                   // đèn chùm trần
      ctx.strokeStyle = "#c9a227"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, -10); ctx.lineTo(x, 4); ctx.stroke();
      for (let k = 0; k < 5; k++) { ctx.fillStyle = `rgba(255,236,170,${.7 + Math.sin(t * 2 + k + x) * .2})`; ctx.beginPath(); ctx.arc(x - 12 + k * 6, 8 + (k % 2) * 3, 2.2, 0, 7); ctx.fill(); }
    }
    STORE_R.forEach(s => {                                               // mặt tiền từng cửa hàng (thiết kế cao cấp 3D)
      // tường nền cửa hàng
      ctx.fillStyle = "#ffffff"; rr(ctx, s.x + 2, s.y, s.w - 4, s.h, 6); ctx.fill();
      ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 1.5; ctx.stroke();

      // mái hiên sọc (Awning) đổ bóng
      const awnH = 18, awnSt = 8;
      for (let ai = 0; ai < awnSt; ai++) {
        ctx.fillStyle = ai % 2 ? s.c1 : "#ffffff";
        const ax = s.x + 2 + ai * (s.w - 4) / awnSt, aw = (s.w - 4) / awnSt;
        ctx.beginPath(); ctx.moveTo(ax, s.y); ctx.lineTo(ax + aw, s.y); ctx.lineTo(ax + aw + 2, s.y + awnH); ctx.lineTo(ax - 2, s.y + awnH); ctx.fill();
        ctx.fillStyle = ai % 2 ? s.c1 : "#f1f5f9";
        ctx.beginPath(); ctx.arc(ax + aw / 2, s.y + awnH, aw / 2, 0, Math.PI); ctx.fill(); // viền bèo lượn sóng
      }

      // biển tên tiệm có đèn LED
      ctx.fillStyle = s.c1; rr(ctx, s.x + 12, s.y + awnH + 2, s.w - 24, 20, 4); ctx.fill();
      ctx.fillStyle = "#ffffff"; ctx.font = "800 9.5px Nunito, system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(`${s.e} ${s.name.toUpperCase()}`, s.x + s.w / 2, s.y + awnH + 12);

      // tủ kính trưng bày (Showcase) có khung kim loại
      const gx = s.x + 6, gy = s.y + awnH + 26, gw = s.w - 12, gh = s.h - awnH - 32;
      ctx.fillStyle = "#f8fafc"; rr(ctx, gx, gy, gw, gh, 5); ctx.fill();
      ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 2; ctx.strokeRect(gx, gy, gw, gh);

      // ánh sáng phản chiếu mặt kính chéo
      const glG = ctx.createLinearGradient(gx, gy, gx + gw, gy + gh);
      glG.addColorStop(0, "rgba(255,255,255,.45)"); glG.addColorStop(.3, "rgba(255,255,255,.15)"); glG.addColorStop(.6, "rgba(255,255,255,.02)"); glG.addColorStop(1, "rgba(255,255,255,.2)");
      ctx.fillStyle = glG; ctx.fillRect(gx + 1, gy + 1, gw - 2, gh - 2);

      // NỘI DUNG TỪNG CỬA HÀNG
      if (s.id === "hair") {
        // CỘT BARBER POLE XOAY XOAY (đỏ trắng xanh)
        const bx = gx + 14, by = gy + 12, bh = 46, bw = 10;
        ctx.fillStyle = "#333"; ctx.fillRect(bx - 2, by - 4, bw + 4, 4); ctx.fillRect(bx - 2, by + bh, bw + 4, 4);
        ctx.save(); ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
        ctx.fillStyle = "#fff"; ctx.fillRect(bx, by, bw, bh);
        for (let si = -10; si < bh + 10; si += 8) {
          const sy = by + ((si + t * 20) % (bh + 16));
          ctx.fillStyle = "#e63946"; ctx.beginPath(); ctx.moveTo(bx, sy); ctx.lineTo(bx + bw, sy - 6); ctx.lineTo(bx + bw, sy - 2); ctx.lineTo(bx, sy + 4); ctx.fill();
          ctx.fillStyle = "#1d3557"; ctx.beginPath(); ctx.moveTo(bx, sy + 4); ctx.lineTo(bx + bw, sy - 2); ctx.lineTo(bx + bw, sy + 2); ctx.lineTo(bx, sy + 8); ctx.fill();
        }
        ctx.restore();
        // gương đèn LED + ghế salon
        const mirX = gx + 45, mirY = gy + 14;
        ctx.strokeStyle = "#ffd166"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(mirX + 20, mirY + 18, 16, 0, 7); ctx.stroke();
        ctx.fillStyle = "rgba(230,245,255,.8)"; ctx.beginPath(); ctx.arc(mirX + 20, mirY + 18, 14, 0, 7); ctx.fill();
        // ghế cắt tóc xoay
        ctx.fillStyle = "#1e293b"; rr(ctx, mirX + 10, mirY + 28, 20, 14, 4); ctx.fill();
        ctx.fillStyle = "#64748b"; ctx.fillRect(mirX + 18, mirY + 42, 4, 8); ctx.fillRect(mirX + 14, mirY + 50, 12, 3);
        // ma-nơ-canh tóc mẫu bên phải
        const mx = s.x + s.w - 36, my = gy + 42;
        ctx.fillStyle = "#ffb703"; ctx.beginPath(); ctx.arc(mx, my - 14, 8, 0, 7); ctx.fill(); // tóc vàng
        ctx.fillStyle = SKIN; ctx.beginPath(); ctx.arc(mx, my - 12, 6.5, 0, 7); ctx.fill();
        ctx.fillStyle = "#6d6875"; rr(ctx, mx - 6, my - 5, 12, 16, 3); ctx.fill();
        // biển gợi ý
        ctx.fillStyle = "#4361ee"; ctx.font = "800 7px system-ui"; ctx.fillText("💈 SALON RIÊNG V6", s.x + s.w / 2, gy + gh - 8);
      } else if (s.id === "fashion") {
        // MA-NƠ-CANH MẶC ĐỒ THỜI TRANG ĐANG BÁN
        const mx = s.x + s.w / 2, my = gy + 40;
        // đế gỗ
        ctx.fillStyle = "#8a5a3c"; ctx.beginPath(); ctx.ellipse(mx, my + 14, 14, 4, 0, 0, 7); ctx.fill();
        ctx.fillRect(mx - 1.5, my + 2, 3, 12);
        // áo đầm / vest thời trang
        ctx.fillStyle = "#e63946"; rr(ctx, mx - 10, my - 12, 20, 16, 4); ctx.fill();
        ctx.fillStyle = "#ffd166"; ctx.beginPath(); ctx.moveTo(mx - 6, my - 12); ctx.lineTo(mx, my - 2); ctx.lineTo(mx + 6, my - 12); ctx.stroke();
        ctx.fillStyle = "#f4a261"; ctx.beginPath(); ctx.moveTo(mx - 10, my + 4); ctx.lineTo(mx - 14, my + 14); ctx.lineTo(mx + 14, my + 14); ctx.lineTo(mx + 10, my + 4); ctx.fill(); // váy xoè
        // giá treo quần áo bên cạnh
        ctx.font = "14px system-ui"; ctx.fillText("👗 🧥 👚", mx, gy + 12);
      } else if (s.id === "acc") {
        // TỦ KÍNH PHỤ KIỆN LẤP LÁNH
        const mx = s.x + s.w / 2;
        ctx.fillStyle = "rgba(255,236,170,.4)"; ctx.fillRect(gx + 10, gy + 32, gw - 20, 3);
        ctx.font = "16px system-ui"; ctx.fillText("👒 🕶️ 🎀", mx, gy + 22);
        ctx.font = "16px system-ui"; ctx.fillText("👜 💍 👑", mx, gy + 48);
        ctx.fillStyle = "#e63946"; ctx.font = "800 7px system-ui"; ctx.fillText("✨ MẪU MỚI", mx, gy + gh - 8);
      } else if (s.id === "pet") {
        // TIỆM THÚ CƯNG CÓ CÁC BÉ MINI
        const mx = s.x + s.w / 2;
        ctx.font = "18px system-ui"; ctx.fillText("🐱 🐶 🐰", mx, gy + 24 + Math.sin(t * 2) * 2);
        ctx.font = "13px system-ui"; ctx.fillText("🦴 🐟 🥕", mx, gy + 48);
        ctx.fillStyle = "#06d6a0"; ctx.font = "800 7px system-ui"; ctx.fillText("🐾 NHẬN NUÔI", mx, gy + gh - 8);
      } else if (s.id === "deco") {
        // NỘI THẤT SHOWROOM MINI
        const mx = s.x + s.w / 2;
        ctx.font = "18px system-ui"; ctx.fillText("🛋️ 🛏️ 🪴", mx, gy + 24);
        ctx.font = "14px system-ui"; ctx.fillText("🖼️ 🧸 💡", mx, gy + 48);
        ctx.fillStyle = "#8338ec"; ctx.font = "800 7px system-ui"; ctx.fillText("🏡 TRANG TRÍ", mx, gy + gh - 8);
      }

      if ((s.id === "fashion" || s.id === "deco") && Math.floor(t * 1.5) % 2) {   // biển giảm giá nhấp nháy
        ctx.fillStyle = "#e63946"; rr(ctx, s.x + s.w - 44, s.y + awnH + 4, 38, 14, 4); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.font = "800 7.5px system-ui"; ctx.fillText("SALE", s.x + s.w - 25, s.y + awnH + 11);
      }
    });
    // sàn gạch bóng phản chiếu
    for (let y = 160, r = 0; y < B; y += 30, r++) for (let x = Math.floor(L / 30) * 30, c = (r + Math.floor(L / 30)) & 1; x < R; x += 30, c ^= 1) { ctx.fillStyle = c ? "#f8f0e3" : "#ece0cc"; ctx.fillRect(x, y, 30, 30); }
    ctx.fillStyle = "rgba(255,255,255,.35)"; for (let x = 60; x < W; x += 180) ctx.fillRect(x - 9, 170, 18, 380);
    // quầy thu ngân (phía sau chị Thu)
    ctx.save(); ctx.translate(320, 0);
    ctx.fillStyle = "#cdb4db"; rr(ctx, 120, 198, 120, 36, 6); ctx.fill();
    ctx.fillStyle = "#9d4edd"; rr(ctx, 120, 192, 120, 10, 4); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "800 8px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("THU NGÂN · VÉ SỐ 🎫", 180, 197);
    ctx.font = "14px system-ui"; ctx.fillText("🧾", 140, 216); ctx.fillText("💳", 222, 216);
    ctx.restore();
    // ma-nơ-canh mặc đồ theo mùa
    const OUT = [{shirt: "shirt_navy", hat: "hat_beanie", neck: "neck_scarf", gender: "g_f"}, {shirt: "shirt_suit", hat: "hat_crown", back: "back_angel", gender: "g_m"}];
    [[110, 250, 0], [290, 250, 1], [710, 250, 0], [890, 250, 1]].forEach(([x, y, k]) => {
      ctx.fillStyle = "#adb5bd"; ctx.fillRect(x - 1, y, 2, 14); ctx.fillRect(x - 10, y + 12, 20, 3);
      drawAvatar({x, y: y + 2, color: "#e9ecef", outfit: {...OUT[k], hair: "hair_short", hairColor: "hc_silver", glasses: "gl_none"}, walking: false, up: false}, 0);
    });
    // đảo trưng bày + đèn khuyến mãi
    [[220, 350], [780, 350]].forEach(([x, y], k) => {
      ctx.fillStyle = "#fff"; rr(ctx, x - 44, y - 10, 88, 26, 6); ctx.fill(); ctx.strokeStyle = "#e0c3fc"; ctx.lineWidth = 2; ctx.stroke();
      ctx.font = "14px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(k ? "👠👜💍🕶️" : "🧸🎁🕶️👒", x, y + 2);
      ctx.fillStyle = `rgba(255,240,180,${.25 + Math.sin(t * 3 + k) * .15})`; ctx.beginPath(); ctx.ellipse(x, y - 14, 40, 7, 0, 0, 7); ctx.fill();
    });
    // cây xanh giữa sảnh + chậu cây 2 bên
    for (const px of [30, 380, 620, 970]) { ctx.fillStyle = "#e5e5e5"; rr(ctx, px - 10, 390, 20, 18, 3); ctx.fill(); ctx.fillStyle = "#52b788"; ctx.beginPath(); ctx.arc(px, 380, 12, 0, 7); ctx.arc(px - 7, 372, 7, 0, 7); ctx.arc(px + 7, 372, 7, 0, 7); ctx.fill(); }
    ctx.save(); ctx.translate(320, 0); ctx.fillStyle = "#ffafcc"; rr(ctx, 152, 392, 56, 20, 5); ctx.fill(); ctx.restore();    // quầy nhạc nhỏ dưới radio
    drawRadio(t);
  }
  function mallBench(i, t) {
    const b = BEDS[i], o = bedOwner(i), sit = o && o.lying;
    ctx.fillStyle = "#9d4edd"; rr(ctx, b.x + 4, b.y + 8, BED_W - 8, 10, 4); ctx.fill();
    if (sit) drawPlayer({...o, x: b.x + BED_W / 2, y: b.y + 30, walking: false, up: false, sit: true}, t);
    ctx.fillStyle = "#c77dff"; rr(ctx, b.x, b.y + 22, BED_W, 12, 5); ctx.fill();
    ctx.fillStyle = "#adb5bd"; ctx.fillRect(b.x + 8, b.y + 34, 4, 8); ctx.fillRect(b.x + BED_W - 12, b.y + 34, 4, 8);
  }

  // ---------- 8. Tủ đồ thời trang + cửa hàng ----------
  function owns(id) {
    if (Hair.STY[id]) return id === CATALOG.SALON.default.hair || (S().hairs || []).includes(id);   // kiểu tóc: mua ở tiệm tóc
    if (Hair.DYE[id]) return true;                                       // màu đang nhuộm (đổi màu chỉ ở tiệm tóc)
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
    if (slot === "gender") { try { localStorage.setItem("nc_gender", id); } catch (e) {} }
    S().outfit[slot] = id; Life.commit();
    send({t: "outfit", outfit: S().outfit});
    const m = me(); if (m) m.outfit = {...S().outfit};
  }
  function preview(el) {
    const cv = el.querySelector("#pv"); if (!cv) return;
    const pc = cv.getContext("2d"), saved = ctx;
    pc.setTransform(1, 0, 0, 1, 0, 0); pc.clearRect(0, 0, cv.width, cv.height);
    pc.setTransform(2.6, 0, 0, 2.6, 0, 0);
    ctx = pc;                                                            // vẽ avatar lên canvas xem trước
    try { drawAvatar({x: 27.7, y: 53, color: myColor, outfit: S().outfit, walking: false, up: false, id: myId}, performance.now() / 1000); }
    finally { ctx = saved; }
  }
  let wardTab = "hat";
  function openWardrobe(tab) {
    if (tab) wardTab = tab;
    cleanOutfit();
    const o = S().outfit;
    const items = wardTab === "shirt" ? [{id: "", e: "🩱", name: "Bộ pyjama", price: 0}, ...CLOTHES.filter(c => c.slot === "shirt")]
      : wardTab === "hair" ? CATALOG.SALON.hairstyles.filter(h => owns(h.id)).map(h => ({id: h.id, e: "💇", name: h.name, price: 0}))   // kiểu đã mở khoá
      : CLOTHES.filter(c => c.slot === wardTab);
    openSheet("👗 Tủ đồ",
      `<div style="display:flex;justify-content:center"><canvas id="pv" width="144" height="150" style="background:radial-gradient(#3a3470,#1d1a38);border-radius:16px"></canvas></div>
       <div class="tabs">${WARDROBE_TABS.map(tb => `<button class="${tb.slot === wardTab ? "cur" : ""}" data-tab="${tb.slot}">${tb.e}<span>${tb.name}</span></button>`).join("")}</div>
       <div class="grid">${items.map(c => {
         const has = c.id === "" || owns(c.id), on = o[wardTab] === c.id;
         return `<button class="opt ${on ? "active" : ""} ${has ? "" : "poor"}" data-id="${c.id}">${c.e} ${c.name}<small>${on ? "✓ đang mặc" : has ? (c.price ? ownLabel(c.id) : "miễn phí") : `mua ở khu mua sắm · ${c.price} 💰`}</small></button>`;
       }).join("")}</div>
       <div class="vol" style="font-size:12px">${wardTab === "hair" ? "Kiểu tóc mới và nhuộm màu: ghé 💇 Tiệm Làm Tóc (mở 🗺️ bản đồ), thử tóc miễn phí." : "Mua thêm đồ ở 🛍️ Khu mua sắm (mở 🗺️ bản đồ để tới). Đồ thuê theo ngày tự cởi khi hết hạn."}</div>`,
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
    if (store.id === "hair") {                                           // tóc đã chuyển sang khu riêng (V6)
      openSheet("✂️ Salon tóc đã chuyển nhà", `<div class="pomoSub">Tiệm tóc giờ là khu riêng <b>💇 Tiệm Làm Tóc</b>: 16 kiểu tóc, 15 màu nhuộm, thử tóc miễn phí trước gương!</div>
        <div class="grid"><button class="opt" id="goSalon" style="text-align:center">💇 Đi tới Tiệm Làm Tóc</button></div>`,
        el => el.querySelector("#goSalon").onclick = () => { closeSheet(); travelTo("salon"); });
      return;
    }
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
        el.querySelectorAll("[data-buy]").forEach(b => b.onclick = async () => {
          const c = CL[b.dataset.buy]; if (!(await Life.eco("buyCloth", {id: c.id}))) return;
          done(c, `${c.e} Đã mua ${c.name} (vĩnh viễn) và mặc luôn!`);
        });
        el.querySelectorAll("[data-rent]").forEach(b => b.onclick = async () => {
          const c = CL[b.dataset.rent]; if (!(await Life.eco("buyCloth", {id: c.id, rent: true}))) return;
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
        el.querySelectorAll("[data-p]").forEach(b => b.onclick = async () => {
          const p = PET_SHOP.find(x => x.id === b.dataset.p);
          if (myPet.type === p.id) return;
          if (!(await Life.eco("adopt", {id: p.id}))) return;
          myPet.type = p.id; myPet.name = PETS[p.id].def;
          localStorage.setItem("nc_pet", p.id); localStorage.setItem("nc_petname", "");
          send({t: "pet", pet: {type: p.id, name: ""}}); Life.apply({fun: 15, xp: 3}); Life.commit(); closeSheet();
          toast(`${p.e} Chào mừng bé ${PETS[p.id].def} về với bạn!`);
        });
        el.querySelector("#treat").onclick = async () => {
          if (myPet.type === "none") { toast("Bạn chưa nuôi thú cưng nào"); return; }
          if (!(await Life.eco("treat"))) return;
          Life.apply({fun: PET_TREAT.fun}); Life.commit(); send({t: "pat", target: myId}); closeSheet(); toast("🦴 Bé ăn ngon lành, vẫy đuôi rối rít!");
        };
      });
  }
  function openDecoShop() {
    openSheet("🛋️ Cửa hàng nội thất",
      `${Life.coinLine()}${Life.shopGrid(FURNITURE.filter(f => !f.noshop).map(f => ({...f, keep: true})))}
       <div class="vol" style="font-size:12px">Đồ mua xong cất vào rương. Về 🏠 nhà riêng (mở 🗺️ bản đồ) bấm 🛋️ Bày đồ để đặt.</div>`,
      el => el.querySelectorAll(".shopit").forEach(b => b.onclick = async () => {
        const f = FU[b.dataset.id]; if (!(await Life.eco("buyFurn", {id: f.id}))) return;
        Life.apply({xp: 2}); Life.commit(); openDecoShop();
        toast(`${f.e} Đã mua ${f.name}, cất trong rương`);
      }));
  }
  function openCashier() {
    openSheet("🛍️ Khu mua sắm",
      `${Life.coinLine()}<div class="grid">${MALL_STORES.map(s => `<button class="opt" data-s="${s.id}">${s.e} ${s.name}</button>`).join("")}
       <button class="opt" id="lotto">🎫 Vé số<small>${LOTTERY.price} 💰 · cào trúng ngay</small></button></div>`,
      el => {
        el.querySelectorAll("[data-s]").forEach(b => b.onclick = () => openStore(STORE_R.find(s => s.id === b.dataset.s)));
        el.querySelector("#lotto").onclick = async () => {
          const r = await Life.eco("lotto"); if (!r) return;
          const p = LOTTERY.PRIZES[r.i];
          Life.apply({fun: 3}); Life.commit();
          openSheet("🎫 Vé số", `<div class="wheelBig">${p.coins ? (p.coins >= 200 ? "🤑" : "🎉") : "🍀"}</div><div class="pomoSub">${p.text}</div>
            <div class="grid"><button class="opt" id="more" style="text-align:center">🎫 Mua tờ nữa</button><button class="opt" id="ok" style="text-align:center">✓ Xong</button></div>`,
            e2 => { e2.querySelector("#more").onclick = openCashier; e2.querySelector("#ok").onclick = closeSheet; });
          if (p.coins >= 200) send({t: "emote", e: "😂"});
        };
      });
  }

  // ---------- 9. Nhà riêng: nội thất do cả nhóm bày, server lưu lại ----------
  let homeItems = [], placing = null;
  // Chuỗi bóng đèn fairy lights trang trí ấm áp dọc bờ tường phòng ngủ
  const HOME_FAIRY_BULBS = [
    {x: 40, y: 11}, {x: 105, y: 10}, {x: 175, y: 11}, {x: 245, y: 10},
    {x: 315, y: 11}, {x: 388, y: 10}, {x: 452, y: 10}, {x: 520, y: 11},
    {x: 590, y: 10}, {x: 660, y: 11}, {x: 730, y: 10}, {x: 795, y: 11}
  ];

  function drawHome(t) {                             // 🏠 nhà riêng NGANG 840x600: phong cách chibi ấm cúng, gọn gàng, tiện nghi
    const night = Life.darkness() > .5;
    const {L, R} = bleed();

    // 1. TƯỜNG PHÒNG, GIẤY DÁN TƯỜNG & ỐP CHÂN TƯỜNG WAINSCOTING
    drawWall("#fbf6ee");
    // Giấy dán tường hoa văn pastel kẻ sọc thanh thoát kết hợp chấm nhỏ xinh xắn
    ctx.fillStyle = "rgba(215, 190, 165, 0.18)";
    for (let x = Math.floor(L / 24) * 24; x < R; x += 24) {
      ctx.fillRect(x, 0, 1.5, 108);
      for (let py = 16; py < 100; py += 24) {
        ctx.beginPath(); ctx.arc(x + 12, py, 1.5, 0, 7); ctx.fill();
      }
    }

    // Phần ốp gỗ chân tường wainscoting phong cách Bắc Âu (y = 108 đến 154)
    ctx.fillStyle = "#f5ece1"; ctx.fillRect(L, 108, R - L, 46);
    // Các rãnh ốp gỗ dọc (beadboard)
    ctx.strokeStyle = "rgba(190, 160, 135, 0.35)"; ctx.lineWidth = 1;
    for (let x = Math.floor(L / 16) * 16; x < R; x += 16) {
      ctx.beginPath(); ctx.moveTo(x, 112); ctx.lineTo(x, 154); ctx.stroke();
    }
    // Gờ nẹp chỉ viền trên wainscoting (chair rail) với hiệu ứng gờ nổi
    ctx.fillStyle = "#d4b89b"; ctx.fillRect(L, 106, R - L, 3);
    ctx.fillStyle = "#8a5a3c"; ctx.fillRect(L, 108, R - L, 2);
    ctx.fillStyle = "rgba(0,0,0,0.06)"; ctx.fillRect(L, 110, R - L, 2);

    // Sàn gỗ cao cấp ấm áp và nẹp chân tường (baseboard)
    drawWoodFloor("#b87c4a", "#af7341", "#c18553");
    ctx.fillStyle = "#6b4226"; ctx.fillRect(L, 156, R - L, 8);
    ctx.fillStyle = "#8a5a3c"; ctx.fillRect(L, 154, R - L, 2);
    ctx.fillStyle = "rgba(0,0,0,0.12)"; ctx.fillRect(L, 164, R - L, 2); // bóng đổ nhẹ chân tường xuống sàn gỗ

    // 2. DÂY ĐÈN FAIRY LIGHTS LUNG LINH DỌC THEO MÉP TRÊN BỨC TƯỜNG
    ctx.strokeStyle = "rgba(90, 60, 40, 0.55)"; ctx.lineWidth = 1.2;
    ctx.beginPath();
    let prevX = L > 0 ? 0 : L, prevY = 8;
    ctx.moveTo(prevX, prevY);
    for (let k = 0; k < HOME_FAIRY_BULBS.length; k++) {
      const b = HOME_FAIRY_BULBS[k];
      const midX = (prevX + b.x) / 2, midY = Math.max(prevY, b.y) + 3;
      ctx.quadraticCurveTo(midX, midY, b.x, b.y);
      prevX = b.x; prevY = b.y;
    }
    const endX = R < 840 ? 840 : R;
    ctx.quadraticCurveTo((prevX + endX) / 2, prevY + 3, endX, 8);
    ctx.stroke();

    // Các bóng đèn nhỏ và quầng sáng ban đêm
    const bulbCols = ["#ffe066", "#ffd166", "#ffb4a2", "#ffc6ff", "#caffbf", "#ffd166"];
    for (let k = 0; k < HOME_FAIRY_BULBS.length; k++) {
      const b = HOME_FAIRY_BULBS[k];
      ctx.fillStyle = "#5c4033"; ctx.fillRect(b.x - 1.5, b.y - 3, 3, 3); // chuôi bóng
      const c = bulbCols[k % bulbCols.length];
      if (night) {
        // Quầng sáng ấm áp lung linh ban đêm
        const fg = ctx.createRadialGradient(b.x, b.y, 1, b.x, b.y, 13);
        fg.addColorStop(0, "rgba(255, 235, 150, 0.75)");
        fg.addColorStop(0.5, "rgba(255, 210, 110, 0.3)");
        fg.addColorStop(1, "rgba(255, 200, 90, 0)");
        ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(b.x, b.y, 13, 0, 7); ctx.fill();
        ctx.fillStyle = "#fffdf0"; ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, 7); ctx.fill();
      } else {
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, 7); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.beginPath(); ctx.arc(b.x - 0.8, b.y - 0.8, 1, 0, 7); ctx.fill();
      }
    }

    // 3. KHU VỰC GIỮA: CỬA SỔ LỚN NHÌN RA BẦU TRỜI (hiển thị trọn vẹn, có rèm nhung pastel)
    const winX = 352, winY = 26, winW = 136, winH = 102;
    // Khung gỗ viền ngoài của cửa sổ
    ctx.fillStyle = "#5e3d27"; rr(ctx, winX - 4, winY - 3, winW + 8, winH + 6, 6); ctx.fill();
    ctx.fillStyle = "#7a4e32"; rr(ctx, winX - 1, winY, winW + 2, winH, 4); ctx.fill();

    // Kính cửa sổ nhìn ra bầu trời theo thời gian thực của game
    const g = ctx.createLinearGradient(0, winY + 2, 0, winY + winH - 2);
    if (night) {
      g.addColorStop(0, "#0b1033"); g.addColorStop(1, "#2b2d6b");
    } else {
      const [a, b] = Life.skyColors();
      g.addColorStop(0, a); g.addColorStop(1, b);
    }
    ctx.fillStyle = g; ctx.fillRect(winX + 2, winY + 2, winW - 4, winH - 4);

    if (night) {
      // Mặt trăng tỏa sáng lung linh
      const mg = ctx.createRadialGradient(winX + 96, winY + 24, 4, winX + 96, winY + 24, 20);
      mg.addColorStop(0, "rgba(255, 246, 200, 0.35)"); mg.addColorStop(1, "rgba(255, 246, 200, 0)");
      ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(winX + 96, winY + 24, 20, 0, 7); ctx.fill();
      ctx.fillStyle = "#fff6c8"; ctx.beginPath(); ctx.arc(winX + 96, winY + 24, 9, 0, 7); ctx.fill();
      // Ngôi sao nhỏ lấp lánh ban đêm
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      [[winX + 25, winY + 22], [winX + 56, winY + 34], [winX + 32, winY + 68], [winX + 104, winY + 68]].forEach(([sx, sy]) => {
        ctx.fillRect(sx, sy, 2, 2);
      });
    } else {
      // Mặt trời dịu dàng buổi ngày
      ctx.fillStyle = "#ffe066"; ctx.beginPath(); ctx.arc(winX + 96, winY + 24, 9, 0, 7); ctx.fill();
      // Đám mây chibi nhỏ trôi bồng bềnh
      const cx = winX + 36 + Math.sin(t * 0.2) * 6;
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.beginPath(); ctx.arc(cx, winY + 36, 6, 0, 7); ctx.arc(cx + 8, winY + 33, 8, 0, 7); ctx.arc(cx + 16, winY + 36, 5, 0, 7); ctx.fill();
    }

    // Các nan chia ô cửa sổ bằng gỗ (4 ô kính cân đối, thoáng đãng)
    ctx.fillStyle = "#5e3d27";
    ctx.fillRect(winX + winW / 2 - 2, winY + 2, 4, winH - 4);
    ctx.fillRect(winX + 2, winY + winH / 2 - 2, winW - 4, 4);

    // Bệ cửa sổ bằng gỗ dày dặn (windowsill)
    ctx.fillStyle = "rgba(0,0,0,0.15)"; ctx.fillRect(winX - 10, winY + winH + 3, winW + 20, 3);
    ctx.fillStyle = "#5e3d27"; rr(ctx, winX - 10, winY + winH - 2, winW + 20, 7, 2); ctx.fill();
    ctx.fillStyle = "#8a5a3c"; ctx.fillRect(winX - 8, winY + winH - 2, winW + 16, 2);

    // Chậu cây nhỏ xinh trên bệ cửa sổ
    // Chậu 1: sen đá chibi bên trái
    ctx.fillStyle = "#d4a373"; rr(ctx, winX + 16, winY + winH - 12, 16, 10, 2); ctx.fill();
    ctx.fillStyle = "#52b788"; ctx.beginPath(); ctx.arc(winX + 24, winY + winH - 12, 6, 0, 7); ctx.fill();
    ctx.fillStyle = "#74c69d"; ctx.beginPath(); ctx.arc(winX + 24, winY + winH - 14, 4, 0, 7); ctx.fill();
    // Chậu 2: chậu hoa 3 bông sắc màu pastel bên phải
    ctx.fillStyle = "#e76f51"; rr(ctx, winX + winW - 36, winY + winH - 12, 20, 10, 2); ctx.fill();
    for (let fl = 0; fl < 3; fl++) {
      ctx.fillStyle = ["#ffd166", "#ff8fab", "#a0c4ff"][fl];
      ctx.beginPath(); ctx.arc(winX + winW - 32 + fl * 6, winY + winH - 15, 3, 0, 7); ctx.fill();
    }

    // Thanh treo rèm bằng đồng và rèm vải nhung pastel buông 2 bên cửa sổ
    ctx.fillStyle = "#c9a227"; ctx.fillRect(winX - 22, winY - 9, winW + 44, 4);
    ctx.beginPath(); ctx.arc(winX - 22, winY - 7, 4.5, 0, 7); ctx.arc(winX + winW + 22, winY - 7, 4.5, 0, 7); ctx.fill();

    const sw = Math.sin(t * 0.8) * 2.5;
    ctx.fillStyle = "#ffafcc";
    // Rèm trái
    ctx.beginPath();
    ctx.moveTo(winX - 20, winY - 7);
    ctx.lineTo(winX + 2, winY - 7);
    ctx.quadraticCurveTo(winX - 6 + sw, winY + 54, winX + 4 + sw, winY + winH + 10);
    ctx.lineTo(winX - 20, winY + winH + 10);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#ffd166"; rr(ctx, winX - 18, winY + 56, 10, 5, 2); ctx.fill(); // nơ buộc rèm trái

    // Rèm phải
    ctx.fillStyle = "#ffafcc";
    ctx.beginPath();
    ctx.moveTo(winX + winW + 20, winY - 7);
    ctx.lineTo(winX + winW - 2, winY - 7);
    ctx.quadraticCurveTo(winX + winW + 6 - sw, winY + 54, winX + winW - 4 - sw, winY + winH + 10);
    ctx.lineTo(winX + winW + 20, winY + winH + 10);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#ffd166"; rr(ctx, winX + winW + 8, winY + 56, 10, 5, 2); ctx.fill(); // nơ buộc rèm phải

    // 4. KHU VỰC BÊN TRÁI: GÓC NGỦ ẤM ÁP (SLEEPING CORNER)
    // Kệ gỗ gắn tường bên góc ngủ (floating wall shelf)
    ctx.fillStyle = "rgba(0,0,0,0.1)"; ctx.fillRect(44, 65, 80, 2);
    ctx.fillStyle = "#8a5a3c"; rr(ctx, 42, 60, 84, 5, 2); ctx.fill();
    ctx.fillStyle = "#b07d58"; ctx.fillRect(43, 60, 82, 2);
    // Eke đỡ kệ gỗ
    ctx.fillStyle = "#6b4226";
    ctx.beginPath(); ctx.moveTo(54, 65); ctx.lineTo(60, 71); ctx.lineTo(60, 65); ctx.fill();
    ctx.beginPath(); ctx.moveTo(114, 65); ctx.lineTo(120, 71); ctx.lineTo(120, 65); ctx.fill();

    // Khung ảnh mini 1 trên kệ (tranh núi chibi)
    ctx.fillStyle = "#6b4226"; rr(ctx, 50, 38, 24, 22, 3); ctx.fill();
    ctx.fillStyle = "#faedcd"; ctx.fillRect(52, 40, 20, 18);
    ctx.fillStyle = "#ffb4a2"; ctx.beginPath(); ctx.arc(66, 46, 3, 0, 7); ctx.fill();
    ctx.fillStyle = "#a8dadc"; ctx.beginPath(); ctx.moveTo(53, 58); ctx.lineTo(61, 48); ctx.lineTo(68, 58); ctx.fill();
    ctx.fillStyle = "#457b9d"; ctx.beginPath(); ctx.moveTo(63, 58); ctx.lineTo(68, 51); ctx.lineTo(72, 58); ctx.fill();

    // Khung ảnh mini 2 nhỏ hơn hơi nghiêng (trái tim pastel)
    ctx.fillStyle = "#a0c4ff"; rr(ctx, 77, 43, 16, 17, 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.fillRect(79, 45, 12, 13);
    ctx.fillStyle = "#ff8fab"; ctx.font = "8px system-ui"; ctx.textAlign = "center"; ctx.fillText("♥", 85, 54);

    // Chậu xương rồng nhỏ trên kệ
    ctx.fillStyle = "#e76f51"; rr(ctx, 98, 48, 14, 12, 2); ctx.fill();
    ctx.fillStyle = "#2a9d8f"; ctx.beginPath(); ctx.arc(105, 45, 6, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(101, 44, 3, 0, 7); ctx.arc(109, 44, 3, 0, 7); ctx.fill();
    ctx.fillStyle = "#ffafcc"; ctx.beginPath(); ctx.arc(105, 38, 2, 0, 7); ctx.fill(); // hoa nhỏ xíu

    // Bảng ghim nỉ/cork board ghi chú và lịch treo tường
    ctx.fillStyle = "rgba(0,0,0,0.12)"; rr(ctx, 138, 48, 62, 56, 4); ctx.fill();
    ctx.fillStyle = "#8a5a3c"; rr(ctx, 136, 46, 62, 56, 4); ctx.fill();
    ctx.fillStyle = "#d4a373"; ctx.fillRect(140, 50, 54, 48);
    // Hạt chấm li ti bề mặt gỗ bần
    ctx.fillStyle = "rgba(100,60,30,0.15)";
    for (let cy = 52; cy < 96; cy += 8) {
      for (let cx = 142; cx < 192; cx += 10) ctx.fillRect(cx + ((cy % 16 === 0) ? 4 : 0), cy, 2, 1.5);
    }
    // Tờ lịch mini
    ctx.fillStyle = "#fff"; ctx.fillRect(144, 54, 18, 20);
    ctx.fillStyle = "#e63946"; ctx.fillRect(144, 54, 18, 5);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    for (let r = 0; r < 3; r++) ctx.fillRect(146, 62 + r * 3, 14, 1.5);
    ctx.fillStyle = "#e63946"; ctx.beginPath(); ctx.arc(153, 55, 1.8, 0, 7); ctx.fill(); // đinh ghim đỏ

    // Giấy note vàng pastel
    ctx.fillStyle = "#fef08a"; ctx.fillRect(166, 56, 22, 18);
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(169, 61, 16, 1.5); ctx.fillRect(169, 65, 13, 1.5); ctx.fillRect(169, 69, 10, 1.5);
    ctx.fillStyle = "#06d6a0"; ctx.beginPath(); ctx.arc(177, 57, 1.8, 0, 7); ctx.fill(); // đinh ghim xanh

    // Giấy note hồng có vẽ hình ngôi sao
    ctx.fillStyle = "#ffccd5"; ctx.fillRect(148, 77, 20, 18);
    ctx.fillStyle = "#ff758f"; ctx.font = "8px system-ui"; ctx.textAlign = "center"; ctx.fillText("★", 158, 89);
    ctx.fillStyle = "#ffd166"; ctx.beginPath(); ctx.arc(158, 78, 1.8, 0, 7); ctx.fill();

    // Tủ quần áo cao kiểu dáng Bắc Âu xinh xắn sát tường cạnh góc ngủ
    ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.beginPath(); ctx.ellipse(246, 162, 36, 6, 0, 0, 7); ctx.fill(); // bóng tủ xuống sàn
    ctx.fillStyle = "#5c3d27"; rr(ctx, 218, 154, 8, 8, 2); ctx.fill(); rr(ctx, 266, 154, 8, 8, 2); ctx.fill(); // chân tủ
    ctx.fillStyle = "#8a5a3c"; rr(ctx, 212, 44, 68, 112, 6); ctx.fill();
    ctx.fillStyle = "#fcf8f2"; rr(ctx, 214, 46, 64, 108, 4); ctx.fill();
    ctx.fillStyle = "#ba8a63"; rr(ctx, 210, 42, 72, 6, 2); ctx.fill(); // gờ nóc tủ
    // Cánh tủ đôi
    ctx.strokeStyle = "#decbb5"; ctx.lineWidth = 1.2;
    rr(ctx, 218, 52, 26, 76, 2); ctx.stroke();
    rr(ctx, 248, 52, 26, 76, 2); ctx.stroke();
    ctx.strokeStyle = "#8a5a3c"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(246, 50); ctx.lineTo(246, 130); ctx.stroke(); // khe cánh cửa
    // 2 tay nắm cửa tròn bằng gỗ
    ctx.fillStyle = "#ba8a63";
    ctx.beginPath(); ctx.arc(242, 94, 2.5, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(250, 94, 2.5, 0, 7); ctx.fill();
    // Ngăn kéo dưới
    ctx.strokeStyle = "#decbb5"; ctx.lineWidth = 1.2;
    rr(ctx, 218, 133, 56, 16, 2); ctx.stroke();
    ctx.fillStyle = "#ba8a63"; rr(ctx, 240, 139, 12, 3, 1.5); ctx.fill();
    // Đồ xếp nóc tủ: chăn gấp pastel và giỏ cói
    ctx.fillStyle = "#a0c4ff"; rr(ctx, 220, 36, 24, 7, 2); ctx.fill();
    ctx.fillStyle = "#ffc6ff"; rr(ctx, 222, 31, 20, 6, 2); ctx.fill();
    ctx.fillStyle = "#d4a373"; rr(ctx, 250, 31, 24, 12, 3); ctx.fill();
    ctx.strokeStyle = "#b07d58"; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(250, 37); ctx.lineTo(274, 37); ctx.stroke();

    // Đồng hồ treo tường chạy giờ thực
    drawClock(306, 54);

    // Thảm tròn lông êm ái dưới góc ngủ
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.beginPath(); ctx.ellipse(104, 240, 98, 64, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#fae1dd";
    ctx.beginPath(); ctx.ellipse(104, 236, 96, 62, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = "#e8b4a2"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.ellipse(104, 236, 84, 52, 0, 0, 7); ctx.stroke();
    ctx.setLineDash([]);

    // Tủ đầu giường nhỏ (nightstand) có đèn ngủ cạnh nệm futon
    ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.beginPath(); ctx.ellipse(200, 220, 18, 5, 0, 0, 7); ctx.fill(); // bóng đổ
    ctx.fillStyle = "#5c3d27"; ctx.fillRect(186, 214, 4, 6); ctx.fillRect(210, 214, 4, 6); // chân tủ
    ctx.fillStyle = "#ba8a63"; rr(ctx, 184, 186, 32, 30, 4); ctx.fill();
    ctx.fillStyle = "#d4a373"; rr(ctx, 186, 188, 28, 26, 3); ctx.fill();
    ctx.fillStyle = "#fdfbf7"; rr(ctx, 188, 191, 24, 10, 2); ctx.fill(); rr(ctx, 188, 203, 24, 10, 2); ctx.fill(); // 2 ngăn kéo
    ctx.fillStyle = "#e9c46a"; ctx.beginPath(); ctx.arc(200, 196, 1.8, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(200, 208, 1.8, 0, 7); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.7)"; rr(ctx, 207, 180, 5, 7, 1); ctx.fill(); // cốc nước

    // Đèn ngủ đầu giường
    ctx.fillStyle = "#e9d8a6"; ctx.beginPath(); ctx.arc(197, 184, 4, 0, 7); ctx.fill();
    ctx.fillStyle = "#6b4226"; ctx.fillRect(196, 174, 2, 8);
    ctx.fillStyle = "#ffe5b4";
    ctx.beginPath(); ctx.moveTo(191, 175); ctx.lineTo(203, 175); ctx.lineTo(206, 163); ctx.lineTo(188, 163); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#ffb4a2"; ctx.fillRect(190, 174, 14, 2);

    if (night) {
      const lg = ctx.createRadialGradient(197, 170, 3, 197, 176, 55);
      lg.addColorStop(0, "rgba(255, 230, 150, 0.55)");
      lg.addColorStop(0.5, "rgba(255, 210, 120, 0.2)");
      lg.addColorStop(1, "rgba(255, 210, 120, 0)");
      ctx.fillStyle = lg; ctx.fillRect(142, 121, 110, 110);
    }

    // Dép bông thỏ xinh xắn đặt ở chân nệm futon
    ctx.fillStyle = "rgba(0,0,0,0.15)"; ctx.beginPath(); ctx.ellipse(138, 296, 6, 3, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#fff0f3"; rr(ctx, 133, 290, 10, 6, 3); ctx.fill();
    ctx.fillStyle = "#ffb4a2"; ctx.fillRect(135, 291, 6, 3);
    ctx.fillStyle = "#fff0f3";
    ctx.beginPath(); ctx.ellipse(135, 288, 1.5, 3, -0.2, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(138, 288, 1.5, 3, 0.2, 0, 7); ctx.fill();

    ctx.fillStyle = "rgba(0,0,0,0.15)"; ctx.beginPath(); ctx.ellipse(149, 296, 6, 3, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#fff0f3"; rr(ctx, 144, 290, 10, 6, 3); ctx.fill();
    ctx.fillStyle = "#ffb4a2"; ctx.fillRect(146, 291, 6, 3);
    ctx.fillStyle = "#fff0f3";
    ctx.beginPath(); ctx.ellipse(146, 288, 1.5, 3, -0.2, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(149, 288, 1.5, 3, 0.2, 0, 7); ctx.fill();

    // Giỏ đựng đồ giặt bằng mây đan (laundry basket) cạnh đệm
    ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.beginPath(); ctx.ellipse(44, 324, 18, 6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#c49a6c"; rr(ctx, 30, 294, 28, 28, 5); ctx.fill();
    ctx.fillStyle = "#d4a373"; rr(ctx, 32, 296, 24, 24, 4); ctx.fill();
    ctx.strokeStyle = "rgba(120,70,30,0.25)"; ctx.lineWidth = 1;
    for (let lx = 34; lx < 54; lx += 6) {
      ctx.beginPath(); ctx.moveTo(lx, 298); ctx.lineTo(lx + 4, 318); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(lx + 4, 298); ctx.lineTo(lx, 318); ctx.stroke();
    }
    ctx.fillStyle = "#ba8a63"; rr(ctx, 28, 292, 32, 5, 2); ctx.fill();
    ctx.fillStyle = "#a0c4ff"; ctx.beginPath(); ctx.ellipse(38, 291, 6, 4, -0.2, 0, 7); ctx.fill();
    ctx.fillStyle = "#ffafcc"; ctx.beginPath(); ctx.ellipse(47, 290, 7, 5, 0.3, 0, 7); ctx.fill();

    // Cây trầu bà lá xẻ (monstera) trong chậu sứ ở góc phòng dưới bên trái
    ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.beginPath(); ctx.ellipse(48, 552, 22, 7, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#8a5a3c"; ctx.fillRect(36, 542, 4, 12); ctx.fillRect(56, 542, 4, 12); ctx.fillRect(34, 546, 28, 3);
    ctx.fillStyle = "#f8f9fa"; rr(ctx, 36, 520, 24, 24, 4); ctx.fill();
    ctx.fillStyle = "#e9ecef"; ctx.fillRect(38, 520, 20, 3);

    const leafSway = Math.sin(t * 1.2) * 1.5;
    ctx.strokeStyle = "#2d6a4f"; ctx.lineWidth = 2;
    // Nhánh & lá 1
    ctx.beginPath(); ctx.moveTo(48, 520); ctx.quadraticCurveTo(34, 508, 28 + leafSway, 496); ctx.stroke();
    ctx.fillStyle = "#40916c"; ctx.beginPath(); ctx.ellipse(27 + leafSway, 494, 14, 9, -0.6, 0, 7); ctx.fill();
    ctx.fillStyle = "#fbf6ee"; ctx.beginPath(); ctx.ellipse(25 + leafSway, 492, 4, 1.5, -0.6, 0, 7); ctx.fill();
    // Nhánh & lá 2
    ctx.beginPath(); ctx.moveTo(48, 520); ctx.quadraticCurveTo(56, 506, 68 - leafSway, 498); ctx.stroke();
    ctx.fillStyle = "#52b788"; ctx.beginPath(); ctx.ellipse(69 - leafSway, 496, 15, 10, 0.6, 0, 7); ctx.fill();
    ctx.fillStyle = "#fbf6ee"; ctx.beginPath(); ctx.ellipse(71 - leafSway, 494, 4, 1.5, 0.6, 0, 7); ctx.fill();
    // Nhánh & lá 3
    ctx.beginPath(); ctx.moveTo(48, 520); ctx.quadraticCurveTo(46, 498, 48 + leafSway * 0.5, 484); ctx.stroke();
    ctx.fillStyle = "#2d6a4f"; ctx.beginPath(); ctx.ellipse(48 + leafSway * 0.5, 482, 13, 11, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#fbf6ee"; ctx.beginPath(); ctx.ellipse(48 + leafSway * 0.5, 480, 4, 1.5, 0, 0, 7); ctx.fill();

    // 5. KHU VỰC BÊN PHẢI: GÓC HỌC TẬP & GIẢI TRÍ (STUDY & ENTERTAINMENT CORNER)
    // Kệ sách gỗ 3 tầng đứng sát tường
    ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.beginPath(); ctx.ellipse(554, 160, 36, 5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#8a5a3c"; rr(ctx, 520, 38, 68, 120, 4); ctx.fill();
    ctx.fillStyle = "#ba8a63"; rr(ctx, 522, 40, 64, 116, 3); ctx.fill();
    ctx.fillStyle = "#f4ece1"; ctx.fillRect(524, 42, 60, 112);

    // Tầng 1: chậu cây dây leo rủ xuống + tượng nhỏ
    ctx.fillStyle = "#8a5a3c"; ctx.fillRect(522, 74, 64, 4);
    ctx.fillStyle = "#e76f51"; rr(ctx, 528, 60, 16, 14, 2); ctx.fill();
    ctx.fillStyle = "#52b788"; ctx.beginPath(); ctx.arc(536, 58, 8, 0, 7); ctx.fill();
    ctx.strokeStyle = "#40916c"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(532, 68); ctx.quadraticCurveTo(529, 78, 531, 86); ctx.stroke();
    ctx.fillStyle = "#52b788"; ctx.beginPath(); ctx.arc(531, 86, 2.5, 0, 7); ctx.arc(530, 78, 2, 0, 7); ctx.fill();
    ctx.fillStyle = "#a0c4ff"; ctx.beginPath(); ctx.arc(566, 64, 7, 0, 7); ctx.fill();
    ctx.fillStyle = "#8a5a3c"; rr(ctx, 560, 70, 12, 4, 1); ctx.fill();

    // Tầng 2: dãy sách màu sắc pastel rực rỡ
    ctx.fillStyle = "#8a5a3c"; ctx.fillRect(522, 114, 64, 4);
    const bookColors = ["#2a9d8f", "#e76f51", "#e9c46a", "#a0c4ff", "#b5838d", "#cdb4db"];
    let bx = 528;
    for (let k = 0; k < 6; k++) {
      const bw = 5 + (k % 3), bh = 26 - (k % 4) * 2;
      ctx.fillStyle = bookColors[k];
      ctx.fillRect(bx, 114 - bh, bw, bh);
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.fillRect(bx + 1, 114 - bh + 3, bw - 2, 1.2);
      ctx.fillRect(bx + 1, 114 - bh + 6, bw - 2, 1.2);
      bx += bw + 2;
    }
    ctx.save();
    ctx.translate(bx + 3, 114); ctx.rotate(0.2);
    ctx.fillStyle = "#f4a261"; ctx.fillRect(0, -22, 6, 22);
    ctx.restore();

    // Tầng 3: hộp lưu trữ pastel có nhãn
    ctx.fillStyle = "#8a5a3c"; ctx.fillRect(522, 154, 64, 4);
    ctx.fillStyle = "#bde0fe"; rr(ctx, 528, 126, 26, 26, 3); ctx.fill();
    ctx.fillStyle = "#fff"; rr(ctx, 535, 134, 12, 6, 1); ctx.fill();
    ctx.fillStyle = "#ffc8dd"; rr(ctx, 558, 128, 24, 24, 3); ctx.fill();
    ctx.fillStyle = "#fff"; rr(ctx, 564, 136, 12, 6, 1); ctx.fill();

    // Kệ gỗ gắn tường để radio và tranh âm nhạc mini
    ctx.fillStyle = "#8a5a3c"; rr(ctx, 616, 50, 42, 48, 3); ctx.fill();
    const posterG = ctx.createLinearGradient(0, 52, 0, 96);
    posterG.addColorStop(0, "#ffd166"); posterG.addColorStop(1, "#f4a261");
    ctx.fillStyle = posterG; ctx.fillRect(618, 52, 38, 44);
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.beginPath(); ctx.moveTo(620, 92); ctx.lineTo(632, 78); ctx.lineTo(642, 86); ctx.lineTo(654, 72); ctx.lineTo(656, 92); ctx.fill();
    ctx.fillStyle = "#6b4226"; ctx.font = "10px system-ui"; ctx.textAlign = "center"; ctx.fillText("♪", 637, 68);

    ctx.fillStyle = "rgba(0,0,0,0.12)"; ctx.fillRect(604, 146, 66, 3);
    ctx.fillStyle = "#6b4a35"; rr(ctx, 604, 140, 66, 6, 2); ctx.fill();
    ctx.fillStyle = "#8a5a3c"; ctx.fillRect(606, 140, 62, 2);
    ctx.fillStyle = "#5c3d27";
    ctx.beginPath(); ctx.moveTo(612, 146); ctx.lineTo(618, 153); ctx.lineTo(618, 146); ctx.fill();
    ctx.beginPath(); ctx.moveTo(662, 146); ctx.lineTo(656, 153); ctx.lineTo(656, 146); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(660, 137, 3.5, 0, 7); ctx.fill(); // tách trà nhỏ

    // Vẽ radio và công tắc tương tác
    drawRadio(t);
    ctx.fillStyle = "#ffcad4";
    ctx.beginPath(); ctx.arc(794, 95, 2.5, 0, 7); ctx.arc(800, 95, 2.5, 0, 7); ctx.fill(); // tai mèo nhỏ trang trí công tắc
    drawSwitch();

    // Bàn học & làm việc nhỏ gọn ở góc phải (không chắn lối ra door x: 700..840 y: 470..600)
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath(); ctx.ellipse(728, 226, 46, 10, 0, 0, 7); ctx.fill(); // bóng bàn
    ctx.beginPath(); ctx.ellipse(725, 243, 16, 5, 0, 0, 7); ctx.fill(); // bóng ghế

    // Chân bàn & hộc ngăn kéo
    ctx.fillStyle = "#8a5a3c";
    ctx.fillRect(688, 192, 5, 32); ctx.fillRect(728, 192, 5, 32); ctx.fillRect(764, 192, 5, 32);
    ctx.fillStyle = "#c59262"; rr(ctx, 735, 186, 32, 34, 3); ctx.fill();
    ctx.fillStyle = "#ba8a63"; rr(ctx, 737, 188, 28, 14, 2); ctx.fill(); rr(ctx, 737, 204, 28, 14, 2); ctx.fill();
    ctx.fillStyle = "#e9c46a"; ctx.beginPath(); ctx.arc(751, 195, 1.8, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(751, 211, 1.8, 0, 7); ctx.fill();

    // Mặt bàn gỗ sồi bo tròn
    ctx.fillStyle = "#8a5a3c"; rr(ctx, 684, 172, 88, 20, 5); ctx.fill();
    ctx.fillStyle = "#d4a373"; rr(ctx, 685, 173, 86, 17, 4); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fillRect(687, 174, 82, 2);

    // Laptop chibi mở nắp
    ctx.fillStyle = "#c5c6c7"; rr(ctx, 696, 176, 24, 13, 2); ctx.fill();
    ctx.fillStyle = "#495057"; ctx.fillRect(699, 178, 18, 7);
    ctx.fillStyle = "#adb5bd"; ctx.fillRect(706, 186, 4, 2);
    ctx.fillStyle = "#343a40"; rr(ctx, 696, 160, 24, 16, 2); ctx.fill();
    ctx.fillStyle = night ? "#64dfdf" : "#72efdd"; ctx.fillRect(698, 162, 20, 12);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillRect(700, 164, 8, 1.2); ctx.fillRect(700, 167, 12, 1.2); ctx.fillRect(700, 170, 6, 1.2);
    ctx.fillStyle = "#ff8fab"; ctx.font = "6px system-ui"; ctx.textAlign = "center"; ctx.fillText("♥", 708, 161);

    // Cốc đựng bút sắc màu
    ctx.fillStyle = "#ffd166"; rr(ctx, 726, 173, 8, 11, 2); ctx.fill();
    ctx.fillStyle = "#06d6a0"; ctx.fillRect(727, 167, 1.5, 6);
    ctx.fillStyle = "#ef476f"; ctx.fillRect(730, 166, 1.5, 7);
    ctx.fillStyle = "#118ab2"; ctx.fillRect(732, 168, 1.5, 5);

    // Đèn bàn học (desk lamp)
    ctx.fillStyle = "#6c757d"; ctx.fillRect(748, 176, 8, 3);
    ctx.strokeStyle = "#52b788"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(752, 176); ctx.quadraticCurveTo(755, 164, 747, 160); ctx.stroke();
    ctx.fillStyle = "#52b788";
    ctx.beginPath(); ctx.moveTo(743, 163); ctx.lineTo(752, 158); ctx.lineTo(749, 155); ctx.lineTo(741, 158); ctx.closePath(); ctx.fill();

    if (night) {
      const dg = ctx.createRadialGradient(746, 166, 3, 730, 185, 45);
      dg.addColorStop(0, "rgba(255, 245, 170, 0.65)");
      dg.addColorStop(0.6, "rgba(255, 230, 130, 0.2)");
      dg.addColorStop(1, "rgba(255, 230, 130, 0)");
      ctx.fillStyle = dg; ctx.fillRect(690, 150, 80, 65);
    }

    // Ghế ngồi học đẩy gọn gàng dưới bàn
    ctx.fillStyle = "#5c3d27"; ctx.fillRect(716, 222, 3, 20); ctx.fillRect(732, 222, 3, 20);
    ctx.fillStyle = "#8a5a3c"; rr(ctx, 714, 202, 22, 18, 3); ctx.fill();
    ctx.fillStyle = "#ba8a63"; ctx.fillRect(718, 206, 2.5, 12); ctx.fillRect(724, 206, 2.5, 12); ctx.fillRect(730, 206, 2.5, 12);
    ctx.fillStyle = "#a0c4ff"; rr(ctx, 713, 218, 24, 8, 3); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.fillRect(716, 219, 18, 2);

    // 6. VẼ NỘI THẤT CỦA PHÒNG (do người chơi đặt)
    for (const it of homeItems) { const f = FU[it.k]; if (f && f.rug) { ctx.fillStyle = f.rug; ctx.globalAlpha = .85; ctx.beginPath(); ctx.ellipse(it.x, it.y, f.size / 2 + 10, f.size / 4 + 4, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1; } }

    // TẶNG NGƯỜI MỚI BỘ ĐỒ CƠ BẢN (nếu chưa đặt món đồ nào)
    if (!homeItems.length) {
      // 1. Thảm lông tròn êm ái giữa phòng
      ctx.fillStyle = "#e9c46a"; ctx.globalAlpha = .4; ctx.beginPath(); ctx.ellipse(420, 380, 120, 45, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = "#f4a261"; ctx.lineWidth = 1.5; ctx.stroke(); ctx.globalAlpha = 1;

      // 2. Bàn trà gỗ nhỏ xinh ở giữa phòng
      ctx.fillStyle = "rgba(0,0,0,.15)"; ctx.beginPath(); ctx.ellipse(420, 390, 42, 14, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#8a5a3c"; rr(ctx, 382, 360, 76, 26, 6); ctx.fill();
      ctx.fillStyle = "#b27d52"; rr(ctx, 384, 362, 72, 22, 5); ctx.fill();
      // laptop hoặc tách trà bốc khói trên bàn
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(400, 372, 4.5, 0, 7); ctx.fill();
      ctx.fillStyle = "#6b4226"; ctx.beginPath(); ctx.arc(400, 372, 3, 0, 7); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = .9;
      for (let k = 0; k < 2; k++) {
        const ph = (t * .5 + k * .5) % 1; ctx.beginPath(); ctx.moveTo(399 + k * 3, 368 - ph * 8); ctx.quadraticCurveTo(402 + k * 3, 364 - ph * 8, 399 + k * 3, 360 - ph * 8); ctx.stroke();
      }
      // sách màu pastel trên bàn
      ctx.fillStyle = "#2a9d8f"; ctx.fillRect(422, 366, 16, 5);
      ctx.fillStyle = "#e76f51"; ctx.fillRect(424, 362, 14, 4);

      // 3. Đèn cây đứng (floor lamp) phát sáng góc phòng
      const lx = 280, ly = 320;
      ctx.fillStyle = "#333"; ctx.fillRect(lx - 1, ly - 80, 3, 80); ctx.beginPath(); ctx.ellipse(lx, ly, 10, 3, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#ffd166"; ctx.beginPath(); ctx.moveTo(lx - 14, ly - 70); ctx.lineTo(lx + 14, ly - 70); ctx.lineTo(lx + 10, ly - 90); ctx.lineTo(lx - 10, ly - 90); ctx.fill();
      // quầng sáng đèn ấm áp
      const lampG = ctx.createRadialGradient(lx, ly - 65, 5, lx, ly - 50, 65);
      lampG.addColorStop(0, "rgba(255,220,130,.4)"); lampG.addColorStop(1, "rgba(255,220,130,0)");
      ctx.fillStyle = lampG; ctx.fillRect(lx - 65, ly - 115, 130, 130);

      // 4. Giường nệm ấm cúng ở góc trái (đã có futon cơ bản)
      ctx.fillStyle = "#ffd27a"; ctx.font = "800 11px Nunito, system-ui"; ctx.textAlign = "center";
      ctx.fillText("🏠 Nhà ấm của bạn · bấm 🛋️ Bày đồ để thêm nội thất", 420, 440);
    }

    if (placing) { ctx.fillStyle = "rgba(255,210,122,.15)"; ctx.fillRect(0, 165, W, 410); label("👆 Chạm sàn để đặt " + FU[placing].name, W / 2, 182, "#ffd27a"); }
  }
  function futon(i, t) {
    const b = BEDS[i], o = bedOwner(i), lying = o && o.lying, cols = ["#a0c4ff", "#ffc6ff"];
    ctx.fillStyle = "rgba(0,0,0,.18)"; rr(ctx, b.x + 3, b.y + 5, BED_W, BED_H, 8); ctx.fill();
    ctx.fillStyle = "#fffaf0"; rr(ctx, b.x, b.y, BED_W, BED_H, 8); ctx.fill();
    ctx.fillStyle = "#fff"; rr(ctx, b.x + 12, b.y + 6, BED_W - 24, 18, 7); ctx.fill();
    if (lying) {
      const hx = b.x + BED_W / 2, hy = b.y + 18;
      ctx.fillStyle = "#f5d0a9"; ctx.beginPath(); ctx.arc(hx, hy, 9, 0, 7); ctx.fill();
      ctx.fillStyle = Hair.dye(outfitOf(o).hairColor).hair; ctx.beginPath(); ctx.arc(hx, hy - 3, 9.5, Math.PI, 0); ctx.fill();
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
        el.querySelector("#fStore").onclick = () => { send({t: "furn", a: "del", i: it.i}); closeSheet(); toast(`🎒 Đã cất ${f.name}`); };
      });
  }

  // ---------- 10. Móc vào game chính ----------
  function draw(t) { ({farm: drawFarm, fishing: drawFishing, mall: drawMall, home: drawHome})[myArea](t); }
  function seat(i, t) { ({farm: haySeat, fishing: fishSeat, mall: mallBench, home: futon})[myArea](i, t); }
  let _npcProximityLast = {};   // thời điểm lần cuối trigger bong bóng NPC theo khoảng cách
  function ents(t, list) {
    for (const {n, p} of npcsHere()) {
      // kiểm tra khoảng cách player - NPC, tự trigger bong bóng khi lại gần
      const myP = me();
      if (myP) {
        const dist = Math.hypot(myP.x - p.x, myP.y - p.y);
        const tk = npcTalk[n.id];
        const lastProx = _npcProximityLast[n.id] || 0;
        if (dist < 90 && (!tk || t > tk.until) && t - lastProx > 8) {
          _npcProximityLast[n.id] = t;
          npcTalk[n.id] = {text: pick(n.lines), until: t + 4};
        }
      }
      list.push({y: p.y, f: () => {
        drawAvatar({x: p.x, y: p.y, color: n.color, outfit: n.outfit, walking: p.walking, up: false, id: n.id}, t);
        label(n.name, p.x, p.y - AV_TOP, "#b9fbc0");
        const tk = npcTalk[n.id]; if (tk && t < tk.until) bubble(tk.text, p.x, p.y - AV_TOP - 7);
      }});
    }
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
    for (const {n, p} of npcsHere()) if (Math.abs(x - p.x) < 15 && y > p.y - AV_TOP + 4 && y < p.y + 6) { talkNpc(n); return true; }
    if (myArea === "farm") { const i = PLOTS.findIndex(r => inRect(x, y, r)); if (i >= 0) { tapPlot(i); return true; } }
    if (myArea === "fishing" && inRect(x, y, {x: 850, y: 380, w: 104, h: 80})) { openBait(); return true; }
    if (myArea === "mall") { const s = STORE_R.find(r => inRect(x, y, r)); if (s) { openStore(s); return true; } if (inRect(x, y, CASHIER_R)) { openCashier(); return true; } }
    if (myArea === "home") {
      if (placing && y >= 175 && y <= 575) {
        const k = placing; placing = null;
        if (!((S().inv[k] || {}).n > 0)) { toast("Hết món này trong rương rồi"); return true; }
        send({t: "furn", a: "add", k, x: Math.round(x), y: Math.round(y)});   // server lấy món ra khỏi rương toast(`${FU[k].e} Đã đặt ${FU[k].name}`);
        return true;
      }
      const it = furnHit(x, y); if (it) { furnMenu(it); return true; }
    }
    return false;
  }
  function holes(hole, t) {
    if (myArea === "fishing") hole(902, 410, 90, .8);
    if (myArea === "farm") {
      hole(84, 90, 80, .7);
      hole(878, 420, 60, .5);
      // Vùng sáng cho các cột đèn nông trại và chuỗi bóng đèn fairy lights
      FARM_LAMPS.forEach(l => hole(l.x, l.y, 90, .75));
      FAIRY_BULBS.forEach(b => hole(b.x, b.y, 24, .45));
    }
    if (myArea === "home") {
      // Vùng sáng cho đèn ngủ đầu giường
      hole(197, 172, 75, .8);
      // Vùng sáng cho đèn bàn học góc phải
      hole(748, 168, 80, .85);
      // Vùng sáng nhỏ cho chuỗi đèn fairy lights dọc bờ tường
      HOME_FAIRY_BULBS.forEach(b => hole(b.x, b.y, 20, .45));
      // Đèn cây đứng góc phòng khi chưa bày đồ nội thất
      if (!homeItems.length) hole(280, 255, 75, .7);
      // Vùng sáng cho các món đồ nội thất do người chơi đặt
      for (const it of homeItems) if (it.k === "f_lamp" || it.k === "f_tv" || it.k === "f_tree") hole(it.x, it.y - 20, 80, .8);
    }
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
          openWardrobe, owns, ownLabel, cleanOutfit, outfit: () => cleanOutfit(), npcPos, FARM_LAMPS,
          say: (id, text, sec = 4) => { npcTalk[id] = {text, until: performance.now() / 1000 + sec}; }};   // NPC tự nói (tiệm tóc)
})();
