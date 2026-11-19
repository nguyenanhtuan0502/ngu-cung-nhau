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

  // ---------- 2. Avatar NHÂN VẬT CHIBI CHUẨN MẪU SVG (400x600) ----------
  // Phong cách: viền nâu ấm #6b4a3a đều nét, màu phẳng sáng sạch, đầu rất to tròn có 2 tai nhỏ hai bên,
  // mắt to long lanh nâu ấm 2 chấm sáng, thân nhỏ gọn, bóng đổ elip đen mờ dưới chân.
  // Tối ưu hiệu năng: không gradient, không clip, gom path giảm beginPath, cache màu.
  const outfitOf = p => ({...DEFAULT_OUTFIT, ...(p.outfit || {})});
  const INK = "#6b4a3a";
  const SKIN_DEFAULT = "#ffe0c8";
  const NECK_DEFAULT = "#f2b99b";
  const EYE_DARK = "#3a2a2a";
  const IRIS_BROWN = "#8a5a38";
  const PUPIL_BLACK = "#2a1c1c";
  const BLUSH_F = "rgba(255,143,163,0.55)";
  const BLUSH_M = "rgba(255,143,163,0.35)";
  const SHADOW_COLOR = "rgba(0,0,0,0.16)";
  const PI2 = Math.PI * 2;
  const SCALE_K = 46 / 500; // Tỉ lệ scale để nhân vật cao ~46 đơn vị từ chân lên đầu

  // Bộ nhớ đệm màu giúp không phải tính toán chuỗi hex mỗi khung hình
  const COLOR_CACHE = new Map();
  function tone(hex, amt) {
    const key = `${hex}_${amt}`;
    let res = COLOR_CACHE.get(key);
    if (res !== undefined) return res;
    const n = parseInt(String(hex).slice(1), 16);
    if (isNaN(n)) { COLOR_CACHE.set(key, hex); return hex; }
    const f = v => Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt));
    res = "#" + [n >> 16, (n >> 8) & 255, n & 255].map(v => f(v).toString(16).padStart(2, "0")).join("");
    COLOR_CACHE.set(key, res);
    return res;
  }

  // Vẽ hình chữ nhật bo tròn không làm ngắt beginPath của Canvas
  function addRoundRect(c, x, y, w, h, r) {
    if (c.roundRect) { c.roundRect(x, y, w, h, r); return; }
    r = Math.min(r, w / 2, h / 2);
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  // Kính mắt theo chuẩn toạ độ mắt SVG (tâm mắt tại 146 và 254, y=238)
  function drawGlasses(g, by) {
    if (!g || g === "gl_none") return;
    if (g === "gl_round") {
      ctx.strokeStyle = "#3a2a2a"; ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(146, 238 + by, 32, 0, PI2);
      ctx.moveTo(286, 238 + by);
      ctx.arc(254, 238 + by, 32, 0, PI2);
      ctx.moveTo(178, 238 + by); ctx.lineTo(222, 238 + by);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.beginPath();
      ctx.arc(138, 226 + by, 8, 0, PI2);
      ctx.arc(246, 226 + by, 8, 0, PI2);
      ctx.fill();
    } else if (g === "gl_sun") {
      ctx.fillStyle = "#22222e"; ctx.strokeStyle = INK; ctx.lineWidth = 4;
      ctx.beginPath();
      addRoundRect(ctx, 114, 212 + by, 64, 52, 14);
      addRoundRect(ctx, 222, 212 + by, 64, 52, 14);
      ctx.rect(178, 228 + by, 44, 10);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.fillRect(124, 220 + by, 18, 7);
      ctx.fillRect(232, 220 + by, 18, 7);
    } else if (g === "gl_heart") {
      ctx.fillStyle = "rgba(255,77,141,0.9)"; ctx.strokeStyle = INK; ctx.lineWidth = 4;
      for (const cx of [146, 254]) {
        ctx.beginPath();
        ctx.moveTo(cx, 260 + by);
        ctx.bezierCurveTo(cx - 38, 230 + by, cx - 22, 205 + by, cx, 222 + by);
        ctx.bezierCurveTo(cx + 22, 205 + by, cx + 38, 230 + by, cx, 260 + by);
        ctx.fill(); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(176, 230 + by); ctx.lineTo(224, 230 + by); ctx.stroke();
    }
  }
  const glassesChibi = (g, by) => drawGlasses(g, by);

  // Mũ đội đầu theo chuẩn toạ độ đầu SVG (tâm 200, 215, bán kính 130x114)
  function drawHat(id, by, body, up) {
    const h = CL[id]; if (!h || id === "hat_none") return;
    const c = h.color;
    ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.lineJoin = "round"; ctx.lineCap = "round";
    if (id === "hat_nightcap" || id === "hat_santa") {
      const hatCol = id === "hat_santa" ? "#e63946" : (body || c || "#7b2cbf");
      // 1. Thân chóp mũ mềm uốn lệch sang bên phải
      ctx.fillStyle = hatCol;
      ctx.beginPath();
      ctx.moveTo(112, 142 + by);
      ctx.bezierCurveTo(110, 45 + by, 220, 25 + by, 305, 145 + by);
      ctx.quadraticCurveTo(270, 110 + by, 288, 142 + by);
      ctx.quadraticCurveTo(200, 116 + by, 112, 142 + by);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      // 2. Vành mũ trắng mềm ôm trên trán/tóc (nằm trên tóc, hoàn toàn không che mắt)
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(106, 142 + by);
      ctx.quadraticCurveTo(200, 116 + by, 294, 142 + by);
      ctx.quadraticCurveTo(304, 154 + by, 292, 162 + by);
      ctx.quadraticCurveTo(200, 138 + by, 108, 162 + by);
      ctx.quadraticCurveTo(96, 154 + by, 106, 142 + by);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      // 3. Quả bông tròn trắng mềm ở đỉnh chóp
      ctx.beginPath();
      ctx.arc(310, 152 + by, 18, 0, PI2);
      ctx.fill(); ctx.stroke();
    } else if (id === "hat_beanie") {
      ctx.fillStyle = c; ctx.beginPath();
      ctx.arc(200, 128 + by, 124, Math.PI, 0); ctx.fill(); ctx.stroke();
      ctx.fillStyle = tone(c, -0.2); ctx.beginPath();
      addRoundRect(ctx, 72, 110 + by, 256, 42, 18); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#ffffff"; ctx.beginPath();
      ctx.arc(200, 2 + by, 26, 0, PI2); ctx.fill(); ctx.stroke();
    } else if (id === "hat_cap") {
      ctx.fillStyle = c; ctx.beginPath();
      ctx.arc(200, 135 + by, 120, Math.PI, 0); ctx.fill(); ctx.stroke();
      ctx.fillStyle = tone(c, -0.22); ctx.beginPath();
      ctx.ellipse(up ? 130 : 270, 135 + by, 72, 22, up ? -0.15 : 0.15, 0, PI2);
      ctx.fill(); ctx.stroke();
    } else if (id === "hat_bow") {
      ctx.save(); ctx.translate(290, 118 + by);
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(-34, -20); ctx.lineTo(-34, 22); ctx.closePath();
      ctx.moveTo(0, 0); ctx.lineTo(34, -20); ctx.lineTo(34, 22); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = tone(c, -0.2); ctx.beginPath();
      ctx.arc(0, 0, 9, 0, PI2); ctx.fill(); ctx.stroke();
      ctx.restore();
    } else if (id === "hat_flower") {
      ctx.save(); ctx.translate(286, 120 + by);
      ctx.fillStyle = c;
      for (let k = 0; k < 5; k++) {
        const a = k * 1.2566;
        ctx.beginPath(); ctx.arc(Math.cos(a) * 20, Math.sin(a) * 20, 14, 0, PI2); ctx.fill(); ctx.stroke();
      }
      ctx.fillStyle = "#ffd54a"; ctx.beginPath(); ctx.arc(0, 0, 12, 0, PI2); ctx.fill(); ctx.stroke();
      ctx.restore();
    } else if (id === "hat_crown") {
      ctx.fillStyle = c; ctx.beginPath();
      ctx.moveTo(140, 100 + by); ctx.lineTo(130, 25 + by); ctx.lineTo(168, 65 + by);
      ctx.lineTo(200, 10 + by); ctx.lineTo(232, 65 + by); ctx.lineTo(270, 25 + by);
      ctx.lineTo(260, 100 + by); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#e63946"; ctx.beginPath(); ctx.arc(200, 68 + by, 10, 0, PI2); ctx.fill(); ctx.stroke();
    } else if (id === "hat_witch") {
      ctx.fillStyle = c; ctx.beginPath();
      ctx.ellipse(200, 108 + by, 150, 34, 0, 0, PI2); ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(125, 104 + by); ctx.lineTo(245, -35 + by); ctx.lineTo(275, 104 + by);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#ffd54a"; ctx.fillRect(128, 88 + by, 144, 20); ctx.strokeRect(128, 88 + by, 144, 20);
    }
  }

  // Phụ kiện cổ (khăn, nơ, vòng ngọc)
  function drawNeck(nk, by, up) {
    if (!nk || nk.id === "neck_none") return;
    const c = nk.color;
    ctx.strokeStyle = INK; ctx.lineWidth = 4;
    if (nk.id === "neck_scarf") {
      ctx.fillStyle = c; ctx.beginPath();
      addRoundRect(ctx, 146, 312 + by, 108, 38, 14); ctx.fill(); ctx.stroke();
      if (!up) {
        ctx.beginPath(); addRoundRect(ctx, 212, 345 + by, 32, 68, 10); ctx.fill(); ctx.stroke();
        ctx.fillStyle = tone(c, -0.2); ctx.fillRect(212, 395 + by, 32, 14);
      }
    } else if (nk.id === "neck_bowtie" && !up) {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(200, 332 + by); ctx.lineTo(175, 318 + by); ctx.lineTo(175, 346 + by); ctx.closePath();
      ctx.moveTo(200, 332 + by); ctx.lineTo(225, 318 + by); ctx.lineTo(225, 346 + by); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(200, 332 + by, 6, 0, PI2); ctx.fill(); ctx.stroke();
    } else if (nk.id === "neck_pearl" && !up) {
      ctx.fillStyle = c;
      for (let k = 0; k < 7; k++) {
        const a = (k / 6) * Math.PI;
        ctx.beginPath();
        ctx.arc(160 + k * 13.3, 332 + Math.sin(a) * 16 + by, 6.5, 0, PI2);
        ctx.fill(); ctx.stroke();
      }
    }
  }

  // Phụ kiện lưng (ba lô, áo choàng, cánh)
  function drawBack(b, by, t, front) {
    if (!b || b.id === "back_none") return;
    const c = b.color;
    ctx.strokeStyle = INK; ctx.lineWidth = 4;
    if (b.id === "back_bag") {
      if (front) {
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(164, 340 + by); ctx.lineTo(164, 430 + by);
        ctx.moveTo(236, 340 + by); ctx.lineTo(236, 430 + by);
        ctx.stroke();
        return;
      }
      ctx.fillStyle = c; ctx.beginPath();
      addRoundRect(ctx, 140, 340 + by, 120, 106, 22); ctx.fill(); ctx.stroke();
      ctx.fillStyle = tone(c, -0.16); ctx.beginPath();
      addRoundRect(ctx, 155, 390 + by, 90, 48, 14); ctx.fill(); ctx.stroke();
    } else if (b.id === "back_cape") {
      if (front) return;
      ctx.fillStyle = c; ctx.beginPath();
      ctx.moveTo(156, 336 + by); ctx.lineTo(124, 495 + by);
      ctx.quadraticCurveTo(200, 520 + by, 276, 495 + by);
      ctx.lineTo(244, 336 + by); ctx.closePath();
      ctx.fill(); ctx.stroke();
    } else if (b.id === "back_angel" || b.id === "back_fairy" || b.id === "back_bat") {
      const flap = Math.sin(t * (b.id === "back_bat" ? 5 : 3)) * 0.18;
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(200 + s * 36, 360 + by);
        ctx.rotate(s * (-0.4 + flap));
        ctx.scale(s, 1);
        if (b.id === "back_bat") {
          ctx.fillStyle = c; ctx.beginPath();
          ctx.moveTo(0, 0); ctx.lineTo(60, -32); ctx.lineTo(48, -4); ctx.lineTo(64, 12);
          ctx.lineTo(38, 12); ctx.lineTo(34, 32); ctx.closePath();
          ctx.fill(); ctx.stroke();
        } else {
          ctx.globalAlpha = b.id === "back_fairy" ? 0.75 : 1;
          ctx.fillStyle = c; ctx.beginPath();
          ctx.ellipse(38, -16, 42, 22, -0.3, 0, PI2);
          ctx.ellipse(30, 16, 26, 16, 0.4, 0, PI2);
          ctx.fill(); ctx.stroke();
          ctx.globalAlpha = 1;
        }
        ctx.restore();
      }
    }
  }

  // Khuôn mặt chuẩn SVG: mắt to tròn, tròng nâu ấm, 2 chấm sáng, lông mày, má hồng, miệng cười
  function drawFace(x, hy, t, seed, happy, male, hairColor, powerSave) {
    let by = 0;
    if (typeof hy === "number" && hy >= 100 && hy < 500) {
      // Khi gọi chuẩn (200, 215 + by, t, seed, happy, male, hairColor, powerSave)
      by = hy - 215;
    } else if (arguments.length <= 7 && typeof x === "number") {
      // Tương thích khi gọi dạng (by, t, seed, happy, male, hairColor, powerSave)
      powerSave = hairColor;
      hairColor = male;
      male = happy;
      happy = seed;
      seed = t;
      t = hy;
      by = x;
    }
    happy = !!happy;
    male = !!male;
    t = typeof t === "number" ? t : 0;
    seed = typeof seed === "number" ? seed : 0;

    // Chỉ nhắm mắt khi p.happy hoặc khi đang chớp mắt thoáng qua (~0.14s mỗi 4.3s)
    const blink = happy || ((t * 1.5 + seed * 3.7) % 4.3 < 0.14);
    const lk = Math.sin(t * 0.6 + seed), look = lk > 0.93 ? 4 : lk < -0.93 ? -4 : 0;

    // Má hồng phẳng nhẹ hai bên
    ctx.fillStyle = male ? BLUSH_M : BLUSH_F;
    ctx.beginPath();
    ctx.ellipse(108, 276 + by, 21, 12, 0, 0, PI2);
    ctx.moveTo(292 + 21, 276 + by);
    ctx.ellipse(292, 276 + by, 21, 12, 0, 0, PI2);
    ctx.fill();

    if (blink) {
      // Chớp mắt cười vòng cung nhẹ
      ctx.strokeStyle = INK; ctx.lineWidth = male ? 6.5 : 5.5; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(146 + look, 244 + by, 20, 3.4, 6.0);
      ctx.moveTo(254 + look + 20 * Math.cos(3.4), 244 + by + 20 * Math.sin(3.4));
      ctx.arc(254 + look, 244 + by, 20, 3.4, 6.0);
      ctx.stroke();
    } else {
      // Mắt mở to tròn (chuẩn mẫu nu_01_mia và nam_01_an)
      // 1. Tròng mắt nền tối
      ctx.fillStyle = EYE_DARK; ctx.strokeStyle = INK; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(146 + look, 238 + by, 25, 32, 0, 0, PI2);
      ctx.moveTo(254 + look + 25, 238 + by);
      ctx.ellipse(254 + look, 238 + by, 25, 32, 0, 0, PI2);
      ctx.fill(); ctx.stroke();

      // 2. Tròng mắt nâu ấm (#8a5a38)
      ctx.fillStyle = IRIS_BROWN;
      ctx.beginPath();
      ctx.ellipse(146 + look, 244 + by, 19, 22, 0, 0, PI2);
      ctx.moveTo(254 + look + 19, 244 + by);
      ctx.ellipse(254 + look, 244 + by, 19, 22, 0, 0, PI2);
      ctx.fill();

      // 3. Con ngươi tối (#2a1c1c)
      ctx.fillStyle = PUPIL_BLACK;
      ctx.beginPath();
      ctx.ellipse(146 + look, 248 + by, 10, 12, 0, 0, PI2);
      ctx.moveTo(254 + look + 10, 248 + by);
      ctx.ellipse(254 + look, 248 + by, 10, 12, 0, 0, PI2);
      ctx.fill();

      // 4. 2 chấm sáng trắng tròn (1 to r=9 góc trên trái, 1 nhỏ r=4.5 góc dưới phải)
      // Dùng moveTo trước mỗi arc để KHÔNG có đường nối ngang giữa 2 mắt
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(138 + look, 226 + by, 9, 0, PI2);
      ctx.moveTo(246 + look + 9, 226 + by);
      ctx.arc(246 + look, 226 + by, 9, 0, PI2);
      if (!powerSave) {
        ctx.moveTo(155 + look + 4.5, 252 + by);
        ctx.arc(155 + look, 252 + by, 4.5, 0, PI2);
        ctx.moveTo(263 + look + 4.5, 252 + by);
        ctx.arc(263 + look, 252 + by, 4.5, 0, PI2);
      }
      ctx.fill();

      // 5. Mi trên cong nét (nữ lineWidth 5, nam lineWidth 7 theo mẫu SVG)
      ctx.strokeStyle = INK; ctx.lineWidth = male ? 7 : 5; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(120 + look, 220 + by); ctx.quadraticCurveTo(146 + look, 202 + by, 172 + look, 220 + by);
      ctx.moveTo(228 + look, 220 + by); ctx.quadraticCurveTo(254 + look, 202 + by, 280 + look, 220 + by);
      ctx.stroke();
    }

    // Lông mày mảnh cong (nữ) hoặc đậm thẳng (nam)
    ctx.strokeStyle = hairColor || INK; ctx.lineWidth = male ? 8 : 6; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(126, 196 + by); ctx.quadraticCurveTo(146, male ? 189 + by : 186 + by, 166, 194 + by);
    ctx.moveTo(234, 194 + by); ctx.quadraticCurveTo(254, male ? 189 + by : 186 + by, 274, 196 + by);
    ctx.stroke();

    // Mũi nhỏ xinh
    ctx.strokeStyle = "rgba(107,74,58,0.7)"; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(200, 262 + by); ctx.quadraticCurveTo(203, 267 + by, 198, 268 + by);
    ctx.stroke();

    // Miệng nhỏ cười hồng
    ctx.strokeStyle = INK; ctx.lineWidth = 3;
    ctx.fillStyle = male ? "#8a2f3f" : "#e8627c";
    ctx.beginPath();
    if (male) {
      ctx.moveTo(180, 280 + by); ctx.quadraticCurveTo(200, 306 + by, 220, 280 + by); ctx.closePath();
      ctx.fill(); ctx.stroke();
      if (!powerSave) {
        ctx.strokeStyle = "#ff8fa3"; ctx.lineWidth = 3.5; ctx.beginPath();
        ctx.moveTo(188, 290 + by); ctx.quadraticCurveTo(200, 298 + by, 212, 290 + by); ctx.stroke();
      }
    } else {
      ctx.moveTo(184, 280 + by); ctx.quadraticCurveTo(200, 298 + by, 216, 280 + by);
      ctx.quadraticCurveTo(200, 284 + by, 184, 280 + by); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
  }

  // p: {x, y (chân), color, outfit, walking, up (quay lưng), sit (ngồi), happy, crouch, id/name}
  function drawAvatar(p, t) {
    const isMe = p.id === (typeof myId !== "undefined" ? myId : null);
    const hasActiveFarmAction = isMe && (typeof activeFarmActions !== "undefined" && Object.keys(activeFarmActions).length > 0);
    const o = outfitOf(p), up = hasActiveFarmAction || !!p.up, sit = !!p.sit, walk = !!p.walking && !sit;
    const seed = ((p.id || p.name || "a").charCodeAt(0) % 17) * 0.7;
    const ph = t * 10 + seed;
    const step = walk ? Math.sin(ph) : 0;
    // Nhún khi đi bộ hoặc thở nhẹ khi đứng (tính theo hệ toạ độ SVG)
    const bob = walk ? Math.abs(Math.sin(ph)) * 14 : Math.sin(t * 2 + seed) * 3.8;
    const crouch = (isMe && typeof farmCrouchOffset !== "undefined" && farmCrouchOffset) || p.crouch || 0;
    // Hạ thấp người khi ngồi ~5 đơn vị (khoảng 54 đơn vị SVG)
    const sitDY = sit ? 54 : 0;
    const by = sitDY - bob + (crouch / SCALE_K);

    const shirt = CL[o.shirt], pj = !shirt, top = shirt ? shirt.color : (p.color || "#e63946");
    const pants = pj ? tone(top, 0.15) : shirt.id === "shirt_suit" ? "#2b2d42" : "#4a6fa5";
    const shoe = pj ? tone(top, 0.45) : shirt.id === "shirt_suit" ? "#2a2a2a" : "#ffffff";
    const back = CL[o.back], hasBack = back && back.id !== "back_none";
    const male = o.gender === "g_m";
    const powerSave = typeof Power !== "undefined" && Power.on && Power.on();

    // Thiết lập hệ toạ độ scale: gốc (0,0) đặt tại giữa 2 chân ở p.x, p.y
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(SCALE_K, SCALE_K);
    ctx.translate(-200, -552);

    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // 1. Bóng đổ elip đen mờ dưới chân
    ctx.fillStyle = SHADOW_COLOR;
    ctx.beginPath();
    ctx.ellipse(200, 562, 95 - Math.abs(step) * 8, 16, 0, 0, PI2);
    ctx.fill();

    // 2. Phụ kiện lưng (cánh, ba lô) phía sau
    if (hasBack && !up) drawBack(back, by, t, false);

    // 3. Tóc sau
    if (!up) Hair.back(ctx, o.hair, o.hairColor, 200, 215 + by, 432 + by, male);

    // 4. Chân & Giày
    const stepL = walk ? step * 16 : 0;
    const stepR = walk ? -step * 16 : 0;
    const liftL = walk ? Math.max(0, step) * 16 : 0;
    const liftR = walk ? Math.max(0, -step) * 16 : 0;

    // Hai ống chân màu da
    ctx.fillStyle = SKIN_DEFAULT; ctx.strokeStyle = INK; ctx.lineWidth = 4;
    ctx.beginPath();
    const swL = sit ? Math.sin(t * 2.2 + seed) * 4 : 0, swR = sit ? Math.sin(t * 2.2 + seed + 1.3) * 4 : 0;   // chân đung đưa khi ngồi
    if (sit) {
      addRoundRect(ctx, 156 + swL, 486 + by, 32, 44, 13);
      addRoundRect(ctx, 212 + swR, 486 + by, 32, 44, 13);
    } else {
      addRoundRect(ctx, 166 + stepL, 440 + by - liftL, 30, 86, 13);
      addRoundRect(ctx, 204 + stepR, 440 + by - liftR, 30, 86, 13);
    }
    ctx.fill(); ctx.stroke();

    // Tất trắng
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    if (sit) {
      addRoundRect(ctx, 154 + swL, 512 + by, 36, 22, 10);
      addRoundRect(ctx, 210 + swR, 512 + by, 36, 22, 10);
    } else {
      addRoundRect(ctx, 164 + stepL, 496 + by - liftL, 34, 34, 10);
      addRoundRect(ctx, 202 + stepR, 496 + by - liftR, 34, 34, 10);
    }
    ctx.fill(); ctx.stroke();

    // Giày tròn màu
    ctx.fillStyle = shoe;
    ctx.beginPath();
    if (sit) {
      // giày nhìn từ trước (mũi giày hướng ra người xem), đung đưa theo cẳng chân
      ctx.ellipse(172 + swL, 538 + by, 24, 15, 0, 0, PI2);
      ctx.moveTo(252 + swR, 538 + by);
      ctx.ellipse(228 + swR, 538 + by, 24, 15, 0, 0, PI2);
    } else {
      ctx.moveTo(146 + stepL, 546 + by - liftL); ctx.quadraticCurveTo(146 + stepL, 522 + by - liftL, 172 + stepL, 522 + by - liftL);
      ctx.lineTo(196 + stepL, 522 + by - liftL); ctx.quadraticCurveTo(204 + stepL, 538 + by - liftL, 196 + stepL, 552 + by - liftL);
      ctx.lineTo(152 + stepL, 552 + by - liftL); ctx.closePath();
      ctx.moveTo(254 + stepR, 546 + by - liftR); ctx.quadraticCurveTo(254 + stepR, 522 + by - liftR, 228 + stepR, 522 + by - liftR);
      ctx.lineTo(204 + stepR, 522 + by - liftR); ctx.quadraticCurveTo(196 + stepR, 538 + by - liftR, 204 + stepR, 552 + by - liftR);
      ctx.lineTo(248 + stepR, 552 + by - liftR); ctx.closePath();
    }
    ctx.fill(); ctx.stroke();

    // 5. Quần / Váy ngắn
    ctx.fillStyle = pants;
    ctx.beginPath();
    ctx.moveTo(154, 424 + by); ctx.quadraticCurveTo(200, 438 + by, 246, 424 + by);
    ctx.lineTo(250, 472 + by); ctx.quadraticCurveTo(226, 484 + by, 202, 472 + by);
    ctx.lineTo(198, 472 + by); ctx.quadraticCurveTo(174, 484 + by, 150, 472 + by);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(200, 436 + by); ctx.lineTo(200, 470 + by);
    ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
    if (sit) {                                       // đùi hướng ra phía trước: 2 đầu gối tròn màu quần, hơi tách nhau
      ctx.fillStyle = pants; ctx.strokeStyle = INK; ctx.lineWidth = 4;
      ctx.beginPath();
      addRoundRect(ctx, 146, 456 + by, 52, 40, 18);
      addRoundRect(ctx, 202, 456 + by, 52, 40, 18);
      ctx.fill(); ctx.stroke();
    }

    // 6. Tay áo & Cánh tay tròn màu da
    const longS = pj || (shirt && (shirt.id === "shirt_hoodie" || shirt.id === "shirt_suit" || shirt.id === "shirt_yellow"));
    const armAngleL = walk ? step * 0.35 : (sit ? 0.12 : Math.sin(t * 2 + seed) * 0.04);
    const armAngleR = walk ? -step * 0.35 : (sit ? 0.12 : -Math.sin(t * 2 + seed) * 0.04);

    const len = 70;
    const sxL = 160, syL = 350 + by;
    const hxL = sxL + Math.sin(armAngleL) * len * 0.9 - 15;
    const hyL = syL + Math.cos(armAngleL) * len;
    const mxL = (sxL + hxL) / 2 - 10;
    const myL = (syL + hyL) / 2;

    const sxR = 240, syR = 350 + by;
    const hxR = sxR + Math.sin(armAngleR) * len * 0.9 + 15;
    const hyR = syR + Math.cos(armAngleR) * len;
    const mxR = (sxR + hxR) / 2 + 10;
    const myR = (syR + hyR) / 2;

    // Viền nâu ngoài cả 2 tay gộp vào 1 path
    ctx.strokeStyle = INK; ctx.lineWidth = 26; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(sxL, syL); ctx.quadraticCurveTo(mxL, myL, hxL, hyL);
    ctx.moveTo(sxR, syR); ctx.quadraticCurveTo(mxR, myR, hxR, hyR);
    ctx.stroke();

    // Nét da/áo trong cả 2 tay gộp vào 1 path
    ctx.strokeStyle = longS ? top : SKIN_DEFAULT; ctx.lineWidth = 19;
    ctx.beginPath();
    ctx.moveTo(sxL, syL); ctx.quadraticCurveTo(mxL, myL, hxL, hyL);
    ctx.moveTo(sxR, syR); ctx.quadraticCurveTo(mxR, myR, hxR, hyR);
    ctx.stroke();

    if (longS) {
      ctx.fillStyle = SKIN_DEFAULT; ctx.strokeStyle = INK; ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(hxL, hyL + 2, 11, 0, PI2);
      ctx.moveTo(hxR + 11, hyR + 2);
      ctx.arc(hxR, hyR + 2, 11, 0, PI2);
      ctx.fill(); ctx.stroke();
    }

    // 7. Thân áo dáng chữ A + Tay áo
    ctx.fillStyle = top; ctx.strokeStyle = INK; ctx.lineWidth = 4;
    ctx.beginPath();
    // Thân áo
    ctx.moveTo(156, 336 + by); ctx.quadraticCurveTo(200, 322 + by, 244, 336 + by);
    ctx.lineTo(252, 432 + by); ctx.quadraticCurveTo(200, 446 + by, 148, 432 + by);
    ctx.closePath();
    // Tay áo ngắn trái
    ctx.moveTo(150, 340 + by); ctx.quadraticCurveTo(128, 352 + by, 132, 376 + by);
    ctx.lineTo(158, 372 + by); ctx.lineTo(160, 344 + by); ctx.closePath();
    // Tay áo ngắn phải
    ctx.moveTo(250, 340 + by); ctx.quadraticCurveTo(272, 352 + by, 268, 376 + by);
    ctx.lineTo(242, 372 + by); ctx.lineTo(240, 344 + by); ctx.closePath();
    ctx.fill(); ctx.stroke();

    // Chi tiết mặt trước áo
    if (!up) {
      // Cổ áo
      ctx.strokeStyle = INK; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(184, 332 + by); ctx.quadraticCurveTo(200, 346 + by, 216, 332 + by); ctx.stroke();

      if (pj) {
        // Áo pyjama: 2 cúc áo tròn
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(200, 372 + by, 4.5, 0, PI2);
        ctx.arc(200, 402 + by, 4.5, 0, PI2);
        ctx.fill(); ctx.stroke();
      } else if (shirt && shirt.id === "shirt_hoodie") {
        // Túi áo hoodie
        ctx.beginPath();
        ctx.moveTo(168, 410 + by); ctx.lineTo(232, 410 + by);
        ctx.lineTo(240, 436 + by); ctx.lineTo(160, 436 + by);
        ctx.closePath(); ctx.stroke();
        // Dây mũ hoodie
        ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(188, 346 + by); ctx.lineTo(186, 376 + by);
        ctx.moveTo(212, 346 + by); ctx.lineTo(214, 376 + by);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(184, 338 + by); ctx.quadraticCurveTo(200, 358 + by, 216, 338 + by); ctx.stroke();
      } else if (shirt && shirt.id === "shirt_suit") {
        // Áo vest + cà vạt đỏ
        ctx.fillStyle = "#f8f9fa"; ctx.beginPath();
        ctx.moveTo(186, 334 + by); ctx.lineTo(200, 392 + by); ctx.lineTo(214, 334 + by); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = shirt.tie || "#e63946"; ctx.beginPath();
        ctx.moveTo(196, 340 + by); ctx.lineTo(204, 340 + by);
        ctx.lineTo(206, 384 + by); ctx.lineTo(200, 396 + by); ctx.lineTo(194, 384 + by);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      } else if (shirt && shirt.stripe) {
        // Áo kẻ ngang
        ctx.fillStyle = shirt.stripe;
        ctx.fillRect(152, 368 + by, 96, 12);
        ctx.fillRect(150, 396 + by, 100, 12);
      } else {
        // Họa tiết trái tim nhỏ xinh trước ngực
        ctx.fillStyle = "#ff7a9c"; ctx.strokeStyle = INK; ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(200, 392 + by);
        ctx.bezierCurveTo(190, 380 + by, 176, 388 + by, 186, 400 + by);
        ctx.lineTo(200, 414 + by);
        ctx.lineTo(214, 400 + by);
        ctx.bezierCurveTo(224, 388 + by, 210, 380 + by, 200, 392 + by);
        ctx.fill(); ctx.stroke();
      }
    }

    // 8. Cổ áo / Phụ kiện cổ
    if (hasBack) drawBack(back, by, t, true);
    drawNeck(CL[o.neck], by, up);

    // Cổ nhân vật
    ctx.fillStyle = NECK_DEFAULT; ctx.strokeStyle = INK; ctx.lineWidth = 4;
    ctx.beginPath();
    addRoundRect(ctx, 184, 312 + by, 32, 30, 10);
    ctx.fill(); ctx.stroke();

    // 9. Hai tai tròn nhỏ hai bên đầu
    ctx.fillStyle = SKIN_DEFAULT;
    ctx.beginPath();
    ctx.ellipse(70, 228 + by, 15, 19, 0, 0, PI2);
    ctx.moveTo(330 + 15, 228 + by);
    ctx.ellipse(330, 228 + by, 15, 19, 0, 0, PI2);
    ctx.fill(); ctx.stroke();

    // 10. Đầu rất to và tròn, rộng hơn vai nhiều
    ctx.beginPath();
    ctx.ellipse(200, 215 + by, 130, 114, 0, 0, PI2);
    ctx.fill(); ctx.stroke();

    // 11. Khuôn mặt / Tóc trước / Mũ / Kính
    const dyeObj = Hair.dye(o.hairColor);
    const hairCol = dyeObj ? dyeObj.hair : INK;
    if (up) {
      Hair.view(ctx, o.hair, o.hairColor, 200, 215 + by, 432 + by, male);
    } else {
      drawFace(200, 215 + by, t, seed, !!p.happy, !!male, hairCol, powerSave);
      Hair.front(ctx, o.hair, o.hairColor, 200, 215 + by, 432 + by, male);
      drawGlasses(o.glasses, by);
    }

    drawHat(o.hat, by, top, up);

    ctx.restore();
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
  // Bố cục 16 ô đất nông trại (8 cột x 2 hàng), kích thước 58x70, căn giữa khu đất y: 250..432
  const PLOTS = Array.from({length: 16}, (_, i) => ({
    x: 191 + (i % 8) * 64,
    y: 260 + (i / 8 | 0) * 82,
    w: 58,
    h: 70
  }));
  // Vị trí kho lương thực (kho gỗ đặt bên phải cánh đồng, nằm giữa luống hoa hướng dương)
  const BARN = { x: 875, y: 220, w: 124, h: 120 };
  const S = () => Life.S();
  // Quản lý hoạt ảnh và hành động nông trại
  const activeFarmActions = {}; // i -> { type, t0, dur, crop, harvestN, isMe, flyTriggered }
  let pendingFarmWalk = null;   // ô đất đang trên đường đi tới
  let farmCrouchOffset = 0;     // độ khom người khi cuốc đất
  function farmLandCfg() {
    return (typeof CATALOG !== "undefined" && CATALOG.FARM_LAND)
      ? CATALOG.FARM_LAND
      : {start: 8, prices: [150, 250, 400, 600, 850, 1150, 1500, 2000]};
  }
  function nextLandPrice(land) {
    const cfg = farmLandCfg();
    const idx = land - cfg.start;
    if (idx < 0 || idx >= cfg.prices.length) return null;
    return cfg.prices[idx];
  }
  // Hiệu ứng lấp lánh (sparkle) khi mở thêm ô đất mới
  let plotSparkles = [];
  function addPlotSparkle(i) {
    const r = PLOTS[i];
    if (!r) return;
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    const now = performance.now() / 1000;
    const colors = ["#ffd166", "#80ed99", "#ff9ebb", "#70d6ff", "#ffffff", "#f4a261"];
    for (let k = 0; k < 28; k++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 20 + Math.random() * 50;
      plotSparkles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 16,
        t0: now,
        dur: 0.9 + Math.random() * 0.6,
        size: 2 + Math.random() * 2.5,
        color: colors[k % colors.length]
      });
    }
  }
  // Hiệu ứng nông sản bay vào kho lương thực khi thu hoạch
  let cropFlyAnims = [];
  function addCropFlyAnim(plotIdx, emoji, count = 2) {
    const pl = PLOTS[plotIdx];
    if (!pl) return;
    const sx = pl.x + pl.w / 2, sy = pl.y + pl.h / 2;
    const tx = BARN.x + BARN.w / 2, ty = BARN.y + BARN.h - 22;
    const now = performance.now() / 1000;
    for (let k = 0; k < count; k++) {
      cropFlyAnims.push({
        x0: sx + (Math.random() - 0.5) * 12,
        y0: sy + (Math.random() - 0.5) * 12,
        x1: tx + (Math.random() - 0.5) * 12,
        y1: ty + (Math.random() - 0.5) * 8,
        e: emoji,
        t0: now + k * 0.08,
        dur: 0.75 + Math.random() * 0.1,
        arc: 45 + Math.random() * 20,
        rot: (Math.random() - 0.5) * 0.8
      });
    }
  }

  // Danh sách vị trí các con vật đang được vẽ trên màn hình nông trại (để bắt sự kiện chạm tap)
  let drawnFarmAnimals = [];

  // Hiệu ứng sản phẩm chăn nuôi (trứng gà, sữa bò) bay vào kho lương thực khi thu hoạch
  function addAnimalFlyAnim(sx, sy, emoji, count = 2) {
    const tx = BARN.x + BARN.w / 2, ty = BARN.y + BARN.h - 22;
    const now = performance.now() / 1000;
    for (let k = 0; k < count; k++) {
      cropFlyAnims.push({
        x0: sx + (Math.random() - 0.5) * 12,
        y0: sy + (Math.random() - 0.5) * 12,
        x1: tx + (Math.random() - 0.5) * 12,
        y1: ty + (Math.random() - 0.5) * 8,
        e: emoji,
        t0: now + k * 0.08,
        dur: 0.75 + Math.random() * 0.1,
        arc: 45 + Math.random() * 20,
        rot: (Math.random() - 0.5) * 0.8
      });
    }
  }

  // Lấy cấu hình loài vật nuôi từ CATALOG hoặc cấu hình dự phòng
  function animalCfg(k) {
    if (typeof CATALOG !== "undefined" && CATALOG.ANIMALS && CATALOG.ANIMALS[k]) {
      return CATALOG.ANIMALS[k];
    }
    if (k === "chicken") {
      return {
        name: "Gà mái", e: "🐔", start: 2, max: 8,
        prices: [60, 90, 130, 180, 240, 300], feed: 3, time: 120,
        product: { id: "egg", e: "🥚", name: "Trứng gà", sell: 8 }
      };
    }
    return {
      name: "Bò sữa", e: "🐄", start: 1, max: 4,
      prices: [250, 400, 600], feed: 8, time: 300,
      product: { id: "milk", e: "🥛", name: "Sữa bò", sell: 25 }
    };
  }

  // Trạng thái hiện tại của con vật: đói (hungry), đang no chờ lớn (waiting), hoặc sẵn sàng thu hoạch (ready)
  function animalInfo(k, an) {
    const cfg = animalCfg(k);
    const time = cfg.time || (k === "chicken" ? 120 : 300);
    const f = an && typeof an.f === "number" ? an.f : 0;
    if (f <= 0) return { st: "hungry", f: 0, time, left: time, prog: 0, cfg };
    const passed = nowS() - f;
    if (passed >= time) return { st: "ready", f, time, passed, left: 0, prog: 1, cfg };
    const prog = Math.min(1, Math.max(0, passed / time));
    const left = Math.max(0, time - passed);
    return { st: "waiting", f, time, passed, left, prog, cfg };
  }

  // Vẽ bong bóng trạng thái phía trên con vật (đói / đang chờ / sẵn sàng thu hoạch)
  function drawAnimalBubble(x, y, k, inf, t, i, isCow) {
    if (inf.st === "hungry") {
      // Đang đói: bong bóng nhỏ hiển thị bông lúa mì 🌾 bồng bềnh nhẹ
      const bx = x, by = y - (isCow ? 20 : 16) + Math.sin(t * 3 + i) * 1.5;
      ctx.save();
      ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
      ctx.beginPath(); ctx.arc(bx, by + 1, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.beginPath(); ctx.arc(bx, by, 8.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.beginPath(); ctx.arc(bx - 2, by + 9.5, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.font = '9.5px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",system-ui';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🌾", bx, by + 0.5);
      ctx.restore();
    } else if (inf.st === "waiting") {
      // Đang no & chờ: vòng tiến trình nhỏ (progress ring) sắc nét
      const rx = x, ry = y - (isCow ? 20 : 16);
      const rad = 6.5;
      const prog = isFinite(inf.prog) ? inf.prog : 0;
      ctx.save();
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.beginPath(); ctx.arc(rx, ry, rad + 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(rx, ry, rad, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = "#52b788";
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(rx, ry, rad, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (inf.st === "ready") {
      // Sẵn sàng thu hoạch: bong bóng nảy lên xuống, phát sáng lấp lánh (glow) với biểu tượng trứng / sữa
      const bounce = Math.abs(Math.sin(t * 4.5 + i * 1.3)) * 4.5;
      const bx = x, by = y - (isCow ? 22 : 18) - bounce;
      const prodEmoji = (inf.cfg && inf.cfg.product && inf.cfg.product.e) || (isCow ? "🥛" : "🥚");
      ctx.save();
      const glowAlpha = 0.4 + 0.25 * Math.sin(t * 5 + i);
      ctx.fillStyle = `rgba(255, 215, 0, ${glowAlpha})`;
      ctx.beginPath(); ctx.arc(bx, by, 13.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(bx, by, 9.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#ffb703";
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(bx - 2, by + 10.5, 2, 0, Math.PI * 2); ctx.fill();
      ctx.font = '11px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",system-ui';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(prodEmoji, bx, by);
      ctx.restore();
    }
  }
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
    {x: 168, y: 235},  // Góc trên bên trái ruộng rau, cạnh hàng rào sau
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

  // ---------- Dây đèn trang trí & đèn lồng quanh ruộng rau (fairy lights & lamp posts) ----------
  // Bố trí quanh viền ruộng (180..708, 250..432) không che lấp ô đất
  const FIELD_POSTS = [
    {x: 180, y: 245, corner: true},
    {x: 312, y: 245},
    {x: 444, y: 245},
    {x: 576, y: 245},
    {x: 708, y: 245, corner: true},
    {x: 180, y: 430, corner: true},
    {x: 708, y: 430, corner: true},
  ];

  const FIELD_BULBS = (() => {
    const bulbs = [];
    let idx = 0;
    // Dây đèn dọc mép trên ruộng (4 nhịp uốn cong nhẹ)
    const topXs = [180, 312, 444, 576, 708];
    for (let s = 0; s < topXs.length - 1; s++) {
      const x1 = topXs[s], x2 = topXs[s + 1], y0 = 244;
      const count = 4;
      for (let k = 1; k <= count; k++) {
        const u = k / (count + 1);
        const bx = x1 + (x2 - x1) * u;
        const by = y0 + Math.sin(u * Math.PI) * 4.5;
        bulbs.push({x: Math.round(bx * 10) / 10, y: Math.round(by * 10) / 10, k: idx++});
      }
    }
    // Dây đèn 2 bên mép ruộng (trái & phải)
    for (const sx of [180, 708]) {
      const y1 = 246, y2 = 428, count = 3;
      for (let k = 1; k <= count; k++) {
        const u = k / (count + 1);
        const by = y1 + (y2 - y1) * u;
        const bx = sx + (sx === 180 ? -2 : 2) * Math.sin(u * Math.PI);
        bulbs.push({x: Math.round(bx * 10) / 10, y: Math.round(by * 10) / 10, k: idx++});
      }
    }
    return bulbs;
  })();

  function drawFieldLights(t, night) {
    // 1. Dây điện treo đèn ở mép ruộng
    const topXs = [180, 312, 444, 576, 708];
    ctx.strokeStyle = night ? "rgba(45, 35, 25, 0.7)" : "rgba(70, 50, 30, 0.8)";
    ctx.lineWidth = 1.1;
    for (let s = 0; s < topXs.length - 1; s++) {
      const x1 = topXs[s], x2 = topXs[s + 1];
      ctx.beginPath();
      ctx.moveTo(x1, 244);
      ctx.quadraticCurveTo((x1 + x2) / 2, 248.5, x2, 244);
      ctx.stroke();
    }
    for (const sx of [180, 708]) {
      ctx.beginPath();
      ctx.moveTo(sx, 246);
      ctx.quadraticCurveTo(sx + (sx === 180 ? -2 : 2), 337, sx, 428);
      ctx.stroke();
    }

    // 2. Các bóng đèn tròn nhỏ (fairy lights)
    FIELD_BULBS.forEach(b => {
      ctx.fillStyle = "#2d3142";
      ctx.fillRect(b.x - 1, b.y - 2, 2, 2);

      if (night) {
        const tw = Math.sin(t * 4.2 + b.k * 1.4) * 0.08;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const fg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 16);
        fg.addColorStop(0, `rgba(255, 225, 145, ${0.45 + tw})`);
        fg.addColorStop(0.5, `rgba(255, 175, 75, ${(0.25 + tw) * 0.6})`);
        fg.addColorStop(1, "rgba(255, 150, 50, 0)");
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = FAIRY_WARM_COLORS[b.k % FAIRY_WARM_COLORS.length];
        ctx.beginPath();
        ctx.arc(b.x, b.y, 2.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        ctx.beginPath();
        ctx.arc(b.x - 0.5, b.y - 0.6, 0.8, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = FAIRY_DAY_COLORS[b.k % FAIRY_DAY_COLORS.length];
        ctx.beginPath();
        ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.15)";
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
    });

    // 3. Cọc gỗ và đèn lồng ở 4 góc ruộng
    FIELD_POSTS.forEach(p => {
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 6, 3.5, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#6d4a2d";
      ctx.fillRect(p.x - 2, p.y - 8, 4, 14);
      ctx.fillStyle = "#8d6346";
      ctx.fillRect(p.x - 2, p.y - 8, 1, 14);
      ctx.fillStyle = "#523720";
      ctx.fillRect(p.x - 3, p.y - 10, 6, 2);

      if (p.corner) {
        const lx = p.x + (p.x < 300 ? -4 : 4), ly = p.y - 7;
        ctx.strokeStyle = "#374151";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 6);
        ctx.lineTo(lx, ly - 4);
        ctx.lineTo(lx, ly);
        ctx.stroke();

        ctx.fillStyle = "#374151";
        ctx.beginPath();
        ctx.moveTo(lx - 4, ly);
        ctx.lineTo(lx, ly - 3);
        ctx.lineTo(lx + 4, ly);
        ctx.closePath();
        ctx.fill();

        if (night) {
          const flicker = Math.sin(t * 6 + p.x * 0.1) * 0.05;
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          const glowR = 40;
          const gGlow = ctx.createRadialGradient(lx, ly + 4, 0, lx, ly + 4, glowR);
          const a = Math.max(0.1, 0.45 + flicker);
          gGlow.addColorStop(0, `rgba(255, 230, 130, ${a})`);
          gGlow.addColorStop(0.35, `rgba(255, 185, 60, ${a * 0.6})`);
          gGlow.addColorStop(0.7, `rgba(255, 130, 25, ${a * 0.2})`);
          gGlow.addColorStop(1, "rgba(255, 100, 0, 0)");
          ctx.fillStyle = gGlow;
          ctx.beginPath();
          ctx.arc(lx, ly + 4, glowR, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          ctx.fillStyle = "#ffe066";
          ctx.beginPath();
          ctx.arc(lx, ly + 3.5, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#fffbeb";
          ctx.beginPath();
          ctx.arc(lx, ly + 3, 1.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = "#e9ecef";
          ctx.beginPath();
          ctx.arc(lx, ly + 3.5, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "rgba(0,0,0,0.18)";
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    });
  }

  // Vẽ kho lương thực (Barn / Granary) bằng gỗ đỏ mộc mạc và ấm cúng
  function drawBarn(t, night) {
    const bx = BARN.x, by = BARN.y, bw = BARN.w, bh = BARN.h;

    // 1. Bóng đổ êm dịu trên nền đất dưới chân kho
    ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
    ctx.beginPath();
    ctx.ellipse(bx + bw / 2, by + bh - 2, bw / 2 + 6, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Thân tường gỗ kho (đỏ nâu ấm cúng)
    const wx = bx + 8, wy = by + 34, ww = bw - 16, wh = bh - 36;
    ctx.fillStyle = night ? "#5c241e" : "#9e382f";
    ctx.fillRect(wx, wy, ww, wh);

    // Đường vân các tấm ván gỗ dọc thân kho
    ctx.strokeStyle = night ? "rgba(35, 12, 8, 0.55)" : "rgba(75, 20, 15, 0.4)";
    ctx.lineWidth = 1;
    for (let px = wx + 9; px < wx + ww; px += 9) {
      ctx.beginPath();
      ctx.moveTo(px, wy);
      ctx.lineTo(px, wy + wh);
      ctx.stroke();
    }

    // Cột trụ gỗ chịu lực ở góc và xà ngang chân tường
    ctx.fillStyle = night ? "#441814" : "#7d2921";
    ctx.fillRect(wx, wy, 7, wh);                  // cột góc trái
    ctx.fillRect(wx + ww - 7, wy, 7, wh);          // cột góc phải
    ctx.fillRect(wx, wy + wh - 4, ww, 4);          // chân tường gỗ

    // 3. Mái ngói gambrel (mái vòm nông trại 2 độ dốc đặc trưng)
    // Tam giác hồi mái bằng ván gỗ đỏ
    ctx.fillStyle = night ? "#6a2923" : "#ab3e33";
    ctx.beginPath();
    ctx.moveTo(bx + 4, by + 35);
    ctx.lineTo(bx + 18, by + 17);
    ctx.lineTo(bx + bw / 2, by + 4);
    ctx.lineTo(bx + bw - 18, by + 17);
    ctx.lineTo(bx + bw - 4, by + 35);
    ctx.closePath();
    ctx.fill();

    // Nẹp mái và mặt ngói gỗ sẫm
    ctx.fillStyle = night ? "#2d1c16" : "#553022";
    ctx.beginPath();
    ctx.moveTo(bx - 6, by + 36);
    ctx.lineTo(bx + 15, by + 15);
    ctx.lineTo(bx + bw / 2, by + 1);
    ctx.lineTo(bx + bw - 15, by + 15);
    ctx.lineTo(bx + bw + 6, by + 36);
    ctx.lineTo(bx + bw + 6, by + 40);
    ctx.lineTo(bx - 6, by + 40);
    ctx.closePath();
    ctx.fill();

    // Viền bờ nóc mái
    ctx.strokeStyle = night ? "#43281c" : "#7d4832";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Hàng ngói lợp (shingles)
    ctx.strokeStyle = night ? "rgba(20, 10, 5, 0.5)" : "rgba(235, 190, 150, 0.3)";
    ctx.lineWidth = 1.1;
    [by + 10, by + 18, by + 26, by + 34].forEach((sy, idx) => {
      ctx.beginPath();
      const span = (sy - by) / 36;
      const xL = bx + bw / 2 - (bw / 2 + 5) * span;
      const xR = bx + bw / 2 + (bw / 2 + 5) * span;
      ctx.moveTo(xL, sy);
      ctx.lineTo(xR, sy);
      ctx.stroke();
      for (let kx = xL + 7 + (idx % 2) * 5; kx < xR - 4; kx += 10) {
        ctx.beginPath();
        ctx.moveTo(kx, sy - 7);
        ctx.lineTo(kx, sy);
        ctx.stroke();
      }
    });

    // 4. Cửa gác xép để rơm (hay loft window)
    const lx = bx + bw / 2 - 11, ly = by + 13, lw = 22, lh = 20;
    // Khung cửa gác xép
    ctx.fillStyle = night ? "#26130c" : "#4a2416";
    rr(ctx, lx - 2, ly - 2, lw + 4, lh + 4, 3);
    ctx.fill();
    // Ô cửa sổ: ban đêm tỏa ánh sáng vàng ấm áp
    if (night) {
      const glow = ctx.createRadialGradient(lx + lw / 2, ly + lh / 2, 2, lx + lw / 2, ly + lh / 2, 22);
      glow.addColorStop(0, "#fff6be");
      glow.addColorStop(0.5, "#ffd166");
      glow.addColorStop(1, "rgba(255, 190, 40, 0.2)");
      ctx.fillStyle = glow;
      rr(ctx, lx, ly, lw, lh, 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "#ffe49e";
      rr(ctx, lx, ly, lw, lh, 2);
      ctx.fill();
    }
    // Chữ thập khung cửa sổ (+)
    ctx.strokeStyle = night ? "#3a1c11" : "#68351f";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(lx + lw / 2, ly); ctx.lineTo(lx + lw / 2, ly + lh);
    ctx.moveTo(lx, ly + lh / 2); ctx.lineTo(lx + lw, ly + lh / 2);
    ctx.stroke();

    // Rơm vàng vắt ra ngoài cửa gác xép (hay peeking out)
    ctx.fillStyle = "#e9c46a";
    ctx.beginPath();
    ctx.moveTo(lx + 3, ly + lh);
    ctx.lineTo(lx + 6, ly + lh + 5);
    ctx.lineTo(lx + 9, ly + lh + 1);
    ctx.lineTo(lx + 13, ly + lh + 6);
    ctx.lineTo(lx + 16, ly + lh + 2);
    ctx.lineTo(lx + 19, ly + lh + 4);
    ctx.lineTo(lx + 19, ly + lh);
    ctx.closePath();
    ctx.fill();

    // 5. Tấm biển nhỏ "🏚️ Kho lương thực"
    const sw = 86, sh = 16, sx = bx + bw / 2 - sw / 2, sy = by + 46;
    // Dây xích sắt treo biển
    ctx.strokeStyle = "#4d392a";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx + 10, sy - 6); ctx.lineTo(sx + 10, sy);
    ctx.moveTo(sx + sw - 10, sy - 6); ctx.lineTo(sx + sw - 10, sy);
    ctx.stroke();
    // Tấm gỗ biển
    ctx.fillStyle = night ? "#6a4529" : "#dfb37c";
    rr(ctx, sx, sy, sw, sh, 3);
    ctx.fill();
    ctx.strokeStyle = night ? "#442a17" : "#7d5028";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // Chữ biển hiệu
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 8.5px system-ui";
    ctx.fillStyle = night ? "#ffe49e" : "#43250e";
    ctx.fillText("🏚️ Kho lương thực", sx + sw / 2, sy + sh / 2 + 0.5);

    // 6. Cửa đôi lớn bằng gỗ (big double door)
    const dw = 48, dh = 48, dx = bx + (bw - dw) / 2, dy = by + bh - dh;
    // Khung cửa đậm
    ctx.fillStyle = night ? "#221008" : "#4a2416";
    rr(ctx, dx - 2, dy - 2, dw + 4, dh + 2, 3);
    ctx.fill();
    // Lòng trong cửa tối
    ctx.fillStyle = night ? "#120804" : "#2b140b";
    ctx.fillRect(dx, dy, dw, dh);

    // 2 cánh cửa gỗ
    const doorW = 22;
    ctx.fillStyle = night ? "#58221c" : "#943b2f";
    rr(ctx, dx, dy, doorW, dh, 1); ctx.fill();
    rr(ctx, dx + dw - doorW, dy, doorW, dh, 1); ctx.fill();

    // Nẹp chữ X chéo trên mỗi cánh cửa (classic barn X brace)
    ctx.strokeStyle = night ? "#38130e" : "#68241b";
    ctx.lineWidth = 2;
    // Cánh trái
    ctx.beginPath();
    ctx.moveTo(dx + 2, dy + 2); ctx.lineTo(dx + doorW - 2, dy + dh - 2);
    ctx.moveTo(dx + doorW - 2, dy + 2); ctx.lineTo(dx + 2, dy + dh - 2);
    ctx.stroke();
    // Cánh phải
    ctx.beginPath();
    ctx.moveTo(dx + dw - doorW + 2, dy + 2); ctx.lineTo(dx + dw - 2, dy + dh - 2);
    ctx.moveTo(dx + dw - 2, dy + 2); ctx.lineTo(dx + dw - doorW + 2, dy + dh - 2);
    ctx.stroke();

    // Bản lề sắt & tay nắm cửa
    ctx.fillStyle = "#2c2c2c";
    ctx.fillRect(dx - 1, dy + 10, 4, 3);
    ctx.fillRect(dx - 1, dy + dh - 12, 4, 3);
    ctx.fillRect(dx + dw - 3, dy + 10, 4, 3);
    ctx.fillRect(dx + dw - 3, dy + dh - 12, 4, 3);
    ctx.fillStyle = "#e9c46a";
    ctx.beginPath();
    ctx.arc(dx + doorW - 3, dy + dh / 2, 2, 0, 7);
    ctx.arc(dx + dw - doorW + 3, dy + dh / 2, 2, 0, 7);
    ctx.fill();

    // 7. Đồ đạc nông sản bày bên ngoài kho
    // Bên trái: Bao gạo / bao lúa bố đay
    ctx.fillStyle = "#d4b27d";
    rr(ctx, bx + 15, by + bh - 22, 14, 20, 5); ctx.fill();
    ctx.fillStyle = "#9c7244"; ctx.fillRect(bx + 18, by + bh - 24, 8, 3);
    ctx.strokeStyle = "rgba(120,80,30,0.35)"; ctx.strokeRect(bx + 18, by + bh - 15, 8, 8);
    // Bao thứ 2 nghiêng bên cạnh
    ctx.fillStyle = "#c9a36b";
    rr(ctx, bx + 26, by + bh - 16, 13, 14, 4); ctx.fill();
    ctx.fillStyle = "#9c7244"; ctx.fillRect(bx + 29, by + bh - 18, 7, 3);
    // Vài nhánh bông lúa
    ctx.font = '11px "Segoe UI Emoji","Apple Color Emoji",system-ui';
    ctx.fillText("🌾", bx + 16, by + bh - 8);

    // Xếp bí đỏ (pumpkins) bên trái
    const px1 = bx + 9, py1 = by + bh - 7;
    ctx.fillStyle = "#e85d04"; ctx.beginPath(); ctx.ellipse(px1, py1, 7, 6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#f48c06"; ctx.beginPath(); ctx.ellipse(px1, py1, 4.5, 6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#2d6a4f"; ctx.fillRect(px1 - 1, py1 - 8, 2, 3);
    // Quả bí nhỏ hơn
    const px2 = bx + 4, py2 = by + bh - 5;
    ctx.fillStyle = "#f48c06"; ctx.beginPath(); ctx.ellipse(px2, py2, 5, 4.2, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#2d6a4f"; ctx.fillRect(px2 - 1, py2 - 6, 1.5, 2.5);

    // Bên phải: Thùng gỗ đựng bắp ngô (corn crate)
    const cw = 22, ch = 16, cx = bx + 92, cy = by + bh - 18;
    ctx.fillStyle = night ? "#533722" : "#8d5b34";
    rr(ctx, cx, cy, cw, ch, 2); ctx.fill();
    ctx.strokeStyle = night ? "#3a2212" : "#653d1d"; ctx.lineWidth = 1;
    ctx.strokeRect(cx, cy, cw, ch);
    ctx.beginPath(); ctx.moveTo(cx, cy + ch / 2); ctx.lineTo(cx + cw, cy + ch / 2); ctx.stroke();
    // Bắp ngô vàng đầy ắp thùng
    ctx.font = '11px "Segoe UI Emoji","Apple Color Emoji",system-ui';
    ctx.fillText("🌽", cx + 7, cy + 5);
    ctx.fillText("🌽", cx + 15, cy + 6);

    // Quả bí ngô bên cạnh thùng bắp
    const px3 = bx + 117, py3 = by + bh - 6;
    ctx.fillStyle = "#e85d04"; ctx.beginPath(); ctx.ellipse(px3, py3, 6, 5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#2d6a4f"; ctx.fillRect(px3 - 1, py3 - 7, 2, 2.5);

    // 8. Khi có nông sản trong kho: emoji thò ra từ cửa và huy hiệu tổng số
    const st = S();
    const cropsInBarn = st && st.inv ? Object.entries(st.inv).filter(([id, x]) => x && (x.cat === "crop" || x.cat === "prod") && x.n > 0) : [];
    const totalCropCount = cropsInBarn.reduce((sum, [, x]) => sum + (x.n || 0), 0);
    if (totalCropCount > 0) {
      // Biểu tượng nông sản nhô ra từ khe cửa
      const peekEmojis = cropsInBarn.slice(0, 3).map(([, x]) => x.e);
      ctx.font = '13px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",system-ui';
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      if (peekEmojis[0]) ctx.fillText(peekEmojis[0], dx + dw / 2 - 4, dy + dh - 12);
      if (peekEmojis[1]) ctx.fillText(peekEmojis[1], dx + dw / 2 + 5, dy + dh - 16);
      if (peekEmojis[2]) ctx.fillText(peekEmojis[2], dx + dw / 2, dy + dh - 23);

      // Huy hiệu nhỏ đỏ/cam hiển thị tổng số lượng nông sản (badge)
      const badgeText = totalCropCount > 99 ? "99+" : String(totalCropCount);
      const badgeX = dx + dw + 2, badgeY = dy + 5;
      ctx.fillStyle = "#e63946";
      rr(ctx, badgeX - 10, badgeY - 8, 20, 15, 7); ctx.fill();
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 9px system-ui";
      ctx.fillText(badgeText, badgeX, badgeY);
    }
  }

  function drawFarm(t) {
    drawnFarmAnimals = [];
    const st = S();
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

    // Ruộng 16 ô đất ở giữa màn hình (8 cột x 2 hàng, y: 250..432)
    ctx.fillStyle = "#8d6346"; rr(ctx, 180, 250, 528, 182, 8); ctx.fill();
    const farm = (S() && Array.isArray(S().farm)) ? S().farm : [];
    const land = farm.length;
    PLOTS.forEach((r, i) => {
      const owned = i < land;
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2;

      // 1. Ô đất chưa mở khóa: vẽ đất cỏ có hàng rào bao quanh
      if (!owned) {
        const isNext = (i === land);
        // Nền cỏ ô đất chưa mở
        ctx.fillStyle = isNext ? "#689f53" : "#547f43";
        rr(ctx, r.x, r.y, r.w, r.h, 6);
        ctx.fill();

        // Khóm cỏ dại mọc tự nhiên
        ctx.fillStyle = isNext ? "#7dbb65" : "#497138";
        ctx.fillRect(r.x + 8, r.y + 12, 2, 5);
        ctx.fillRect(r.x + 11, r.y + 10, 2, 7);
        ctx.fillRect(r.x + r.w - 12, r.y + r.h - 16, 2, 6);
        ctx.fillRect(r.x + r.w - 9, r.y + r.h - 18, 2, 8);

        // Hàng rào gỗ bao quanh ô đất
        ctx.strokeStyle = isNext ? "rgba(90, 55, 30, 0.75)" : "rgba(60, 40, 25, 0.55)";
        ctx.lineWidth = 1.2;
        ctx.strokeRect(r.x + 3.5, r.y + 3.5, r.w - 7, r.h - 7);

        // Cọc gỗ nhỏ ở 4 góc ô đất
        ctx.fillStyle = isNext ? "#7a4e2b" : "#5a3a20";
        ctx.fillRect(r.x + 2, r.y + 2, 4, 5);
        ctx.fillRect(r.x + r.w - 6, r.y + 2, 4, 5);
        ctx.fillRect(r.x + 2, r.y + r.h - 7, 4, 5);
        ctx.fillRect(r.x + r.w - 6, r.y + r.h - 7, 4, 5);

        if (isNext) {
          // Ô tiếp theo có thể mua: Biển gỗ cắm đất ghi 🔒 và giá xu
          const price = nextLandPrice(land) || 150;
          // Cọc gỗ cắm biển
          ctx.fillStyle = "#5c3d2a";
          ctx.fillRect(cx - 2, cy - 2, 4, 18);

          // Tấm biển gỗ
          const sw = 48, sh = 28, sx = cx - sw / 2, sy = cy - 14;
          // Bóng đổ biển gỗ
          ctx.fillStyle = "rgba(0,0,0,0.22)";
          rr(ctx, sx + 1, sy + 2, sw, sh, 4);
          ctx.fill();
          // Mặt gỗ
          ctx.fillStyle = "#8d5b34";
          rr(ctx, sx, sy, sw, sh, 4);
          ctx.fill();
          // Viền gỗ
          ctx.strokeStyle = "#5a381e";
          ctx.lineWidth = 1.2;
          ctx.strokeRect(sx, sy, sw, sh);
          // Vân sáng mép trên biển
          ctx.fillStyle = "rgba(255,255,255,0.18)";
          ctx.fillRect(sx + 2, sy + 2, sw - 4, 2);

          // Chữ trên biển gỗ: 🔒 và giá xu
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.font = "11px system-ui";
          ctx.fillText("🔒", cx, sy + 8);
          ctx.font = "bold 9.5px system-ui";
          ctx.fillStyle = "#ffe066";
          ctx.fillText(`${price} xu`, cx, sy + 20);
        } else {
          // Các ô bị khóa khác: mờ đi (dim) và có biểu tượng khóa mờ
          ctx.fillStyle = "rgba(20, 30, 20, 0.42)";
          rr(ctx, r.x, r.y, r.w, r.h, 6);
          ctx.fill();

          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.font = "14px system-ui";
          ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
          ctx.fillText("🔒", cx, cy);
        }
        return;
      }

      // 2. Ô đất đã sở hữu: vẽ đất trồng cây
      const inf = plotInfo(farm[i]);
      const busyAct = activeFarmActions[i];
      ctx.fillStyle = inf.st === "grow" || inf.st === "ripe" ? "#5c3d2a" : "#7a5236"; rr(ctx, r.x, r.y, r.w, r.h, 6); ctx.fill();   // đất ướt sẫm màu
      ctx.strokeStyle = "rgba(0,0,0,.18)"; ctx.lineWidth = 1.5;
      for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(r.x + 6, r.y + k * r.h / 4); ctx.lineTo(r.x + r.w - 6, r.y + k * r.h / 4); ctx.stroke(); }
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      if (inf.st === "empty") {
        if (!busyAct) {
          ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.font = "700 18px system-ui"; ctx.fillText("+", cx, cy);
        }
      }
      else if (inf.st === "dry") {
        if (!busyAct || busyAct.type !== "plant") {
          ctx.fillStyle = "#e9c46a";
          const stepX = (r.w - 24) / 2;
          for (let k = 0; k < 6; k++) {
            ctx.beginPath();
            ctx.arc(r.x + 12 + (k % 3) * stepX, r.y + 20 + (k / 3 | 0) * 20, 2, 0, 7);
            ctx.fill();
          }
        }
        if (!busyAct || busyAct.type !== "water") {
          ctx.font = "14px system-ui"; ctx.fillText("💧", cx, r.y + 10 + Math.sin(t * 4) * 2);
        }
      } else {
        const k = inf.k, sway = Math.sin(t * 2 + i) * 1.5;
        const stepX = (r.w - 24) / 2;
        const hideHarvestCrop = busyAct && busyAct.type === "harvest" && (performance.now() / 1000 - busyAct.t0) < busyAct.dur * 0.45;
        if (!hideHarvestCrop) {
          for (let j = 0; j < 3; j++) {
            const px = r.x + 12 + j * stepX, py = r.y + r.h - 12;
            if (k < .25) { ctx.font = "13px system-ui"; ctx.fillText("🌱", px, py - 4); continue; }
            const hgt = 10 + Math.min(1, k) * 24;
            ctx.strokeStyle = inf.c.leaf; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + sway, py - hgt); ctx.stroke();
            ctx.fillStyle = inf.c.leaf; ctx.beginPath(); ctx.ellipse(px - 4 + sway, py - hgt * .55, 4.5, 2.3, -.6, 0, 7); ctx.ellipse(px + 4 + sway, py - hgt * .75, 4.5, 2.3, .6, 0, 7); ctx.fill();
            if (k >= .6) { ctx.font = `${inf.st === "ripe" ? 17 : 10}px system-ui`; ctx.fillText(inf.c.e, px + sway, py - hgt - 4); }
          }
          if (inf.st === "ripe") { ctx.font = "10px system-ui"; ctx.fillStyle = `rgba(255,255,200,${.5 + Math.sin(t * 5 + i) * .5})`; ctx.fillText("✨", r.x + r.w - 8, r.y + 8); }
          else { ctx.fillStyle = "rgba(0,0,0,.35)"; rr(ctx, r.x + 6, r.y + r.h - 6, r.w - 12, 4, 2); ctx.fill(); ctx.fillStyle = "#80ed99"; rr(ctx, r.x + 6, r.y + r.h - 6, (r.w - 12) * k, 4, 2); ctx.fill(); }
        }
      }
    });
    // Hoạt ảnh hành động làm ruộng (trồng / tưới / thu hoạch) và thanh tiến trình
    drawFarmActionAnimations(t);
    // ruộng hướng dương trang trí bên phải (rạp theo gió, chừa chỗ cho kho lương thực)
    for (let r = 0; r < 4; r++) for (let k = 0; k < 7; k++) {
      const x = 770 + k * 44 + (r % 2) * 18, y = 214 + r * 40;
      if (x >= 865 && x <= 1005 && y >= 210 && y <= 345) continue;
      const sw = Math.sin(t * 1.4 + k * .5 + r) * 2.5;
      ctx.strokeStyle = "#4f7942"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y + 20); ctx.lineTo(x + sw, y); ctx.stroke();
      ctx.fillStyle = "#ffc300"; ctx.beginPath(); ctx.arc(x + sw, y, 6, 0, 7); ctx.fill(); ctx.fillStyle = "#7f4f24"; ctx.beginPath(); ctx.arc(x + sw, y, 2.6, 0, 7); ctx.fill();
    }
    // Kho lương thực (barn / granary) bằng gỗ đỏ/nâu ấm cúng
    drawBarn(t, night);
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
    // chuồng gà (trái dưới) + gà mái theo số lượng và gà con trang trí
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
    // 1. Gà con trang trí chạy lon ton
    for (let c = 0; c < 3; c++) {
      const ckPhase = t * 1.5 + c * 2.1;
      const ckX = 35 + c * 52 + Math.sin(ckPhase) * 14;
      const ckY = 538 + (c % 2) * 10 + Math.cos(ckPhase * 0.7) * 4;
      const ckFlip = Math.cos(ckPhase) >= 0 ? 1 : -1;
      drawChick(ckX, ckY, 0.75, t, ckFlip, c + 5);
    }
    // 2. Đàn gà mái của trang trại: số lượng = S().animals.chicken.length
    const hens = (st && st.animals && Array.isArray(st.animals.chicken)) ? st.animals.chicken : [{f: 0}, {f: 0}];
    const henSlots = [
      { bx: 50,  by: 532 },
      { bx: 110, by: 534 },
      { bx: 165, by: 532 },
      { bx: 40,  by: 554 },
      { bx: 95,  by: 556 },
      { bx: 150, by: 554 },
      { bx: 75,  by: 544 },
      { bx: 130, by: 546 },
    ];
    for (let i = 0; i < hens.length; i++) {
      const slot = henSlots[i % henSlots.length];
      const phase = t * 0.8 + i * 1.5;
      const cx = slot.bx + Math.sin(phase) * 10;
      const cy = slot.by + Math.cos(phase * 0.8) * 4;
      const flip = Math.cos(phase) >= 0 ? 1 : -1;
      drawHen(cx, cy, 0.95, t, flip, i);
      const worldX = 30 + cx, worldY = cy;
      drawnFarmAnimals.push({ k: "chicken", i, x: worldX, y: worldY });
      const inf = animalInfo("chicken", hens[i]);
      drawAnimalBubble(cx, cy, "chicken", inf, t, i, false);
    }
    ctx.restore();
    // chuồng bò (phải dưới) + bò sữa theo dữ liệu server
    ctx.save(); ctx.translate(700, 40);
    // Nền rơm lót chuồng bò (mở rộng nhẹ vừa vặn cho tối đa 4 bò)
    ctx.fillStyle = "rgba(233, 196, 106, 0.28)";
    ctx.beginPath(); ctx.ellipse(311, 478, 50, 32, 0, 0, Math.PI * 2); ctx.fill();
    // Hàng rào trắng quanh chuồng bò + cọc rào ở góc
    const penX = 248, penY = 434, penW = 126, penH = 88;
    ctx.strokeStyle = "#f8f9fa"; ctx.lineWidth = 2.5; ctx.strokeRect(penX, penY, penW, penH);
    ctx.lineWidth = 1.5; ctx.strokeRect(penX, penY + 10, penW, penH - 20);
    ctx.fillStyle = "#f8f9fa";
    rr(ctx, penX - 2, penY - 4, 5, 12, 1); ctx.fill();
    rr(ctx, penX + penW - 3, penY - 4, 5, 12, 1); ctx.fill();
    rr(ctx, penX - 2, penY + penH - 8, 5, 12, 1); ctx.fill();
    rr(ctx, penX + penW - 3, penY + penH - 8, 5, 12, 1); ctx.fill();
    // Đàn bò sữa của trang trại: số lượng = S().animals.cow.length
    const cows = (st && st.animals && Array.isArray(st.animals.cow)) ? st.animals.cow : [{f: 0}];
    const cowSlots = [
      { bx: 280, by: 464 },
      { bx: 342, by: 464 },
      { bx: 278, by: 498 },
      { bx: 340, by: 498 },
    ];
    for (let i = 0; i < cows.length; i++) {
      let slot;
      if (cows.length === 1) slot = { bx: 310, by: 478 };
      else if (cows.length === 2) slot = (i === 0) ? { bx: 286, by: 472 } : { bx: 336, by: 486 };
      else slot = cowSlots[i % cowSlots.length];
      const cowPhase = t * 0.35 + i * 1.9;
      const cx = slot.bx + Math.sin(cowPhase) * 7;
      const cy = slot.by + Math.cos(cowPhase * 0.7) * 3;
      const flip = Math.cos(cowPhase) >= 0 ? 1 : -1;
      drawCow(cx, cy, 0.95, t, flip, i + 1);
      const worldX = 700 + cx, worldY = 40 + cy;
      drawnFarmAnimals.push({ k: "cow", i, x: worldX, y: worldY });
      const inf = animalInfo("cow", cows[i]);
      drawAnimalBubble(cx, cy, "cow", inf, t, i, true);
    }
    ctx.restore();
    // Đèn nông trại mộc mạc (cột gỗ, bóng vàng ấm, bướm đêm/đom đóm) & dây đèn fairy lights
    drawFarmLamps(t, night);
    // Dây đèn và đèn lồng chiếu sáng cánh đồng rau ban đêm
    drawFieldLights(t, night);
    // Hiệu ứng lấp lánh (sparkles) khi mua ô đất mới
    if (plotSparkles.length) {
      const curT = performance.now() / 1000;
      plotSparkles = plotSparkles.filter(s => curT - s.t0 < s.dur);
      ctx.save();
      for (const s of plotSparkles) {
        const p = (curT - s.t0) / s.dur;
        const alpha = 1 - p;
        const px = s.x + s.vx * p;
        const py = s.y + s.vy * p + 30 * p * p;
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.fillStyle = s.color;
        const sz = s.size * (1 - p * 0.3);
        ctx.beginPath();
        ctx.arc(px, py, sz, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px - sz * 2, py); ctx.lineTo(px + sz * 2, py);
        ctx.moveTo(px, py - sz * 2); ctx.lineTo(px, py + sz * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
    // Hoạt ảnh nông sản bay từ ruộng vào kho lương thực khi thu hoạch
    if (cropFlyAnims.length) {
      const curT = performance.now() / 1000;
      cropFlyAnims = cropFlyAnims.filter(a => curT - a.t0 < a.dur + 0.25);
      ctx.save();
      for (const a of cropFlyAnims) {
        const dt = curT - a.t0;
        if (dt < 0) continue;
        const p = Math.min(1, dt / a.dur);
        const ease = p * (2 - p);
        const curX = a.x0 + (a.x1 - a.x0) * ease;
        const curY = a.y0 + (a.y1 - a.y0) * ease - Math.sin(p * Math.PI) * a.arc;
        const scale = p < 0.2 ? 0.6 + (p / 0.2) * 0.6 : (p > 0.8 ? 1.2 - ((p - 0.8) / 0.2) * 0.6 : 1.2);
        const alpha = p > 0.9 ? 1 - (p - 0.9) / 0.1 : 1;

        ctx.save();
        ctx.translate(curX, curY);
        ctx.scale(scale, scale);
        ctx.rotate(a.rot * p * 3);
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.font = '18px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",system-ui';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(a.e, 0, 0);
        ctx.restore();

        if (p < 0.85 && Math.random() < 0.35) {
          ctx.fillStyle = "rgba(255, 235, 130, 0.75)";
          ctx.beginPath();
          ctx.arc(curX - 4 + (Math.random() - 0.5) * 8, curY + 4 + (Math.random() - 0.5) * 6, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
    for (let k = 0; k < 6; k++) {                                        // bướm
      const bx = (t * 18 + k * 190) % (W + 40) - 20, byy = 220 + (k % 3) * 60 + Math.sin(t * 2 + k) * 20, f = Math.abs(Math.sin(t * 10 + k)) * 3 + 1;
      ctx.fillStyle = ["#ff8fab", "#ffd166", "#a0c4ff"][k % 3]; ctx.beginPath(); ctx.ellipse(bx - 2, byy, f, 3, 0, 0, 7); ctx.ellipse(bx + 2, byy, f, 3, 0, 0, 7); ctx.fill();
    }
  }
  function haySeat(i, t) {
    const b = BEDS[i], o = bedOwner(i), sit = o && o.lying;
    ctx.fillStyle = "#e9c46a"; rr(ctx, b.x, b.y + 14, b.w || BED_W, 22, 5); ctx.fill();
    ctx.strokeStyle = "#c9a227"; ctx.lineWidth = 1; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(b.x + 4, b.y + 18 + k * 5); ctx.lineTo(b.x + BED_W - 4, b.y + 18 + k * 5); ctx.stroke(); }
    ctx.fillStyle = "#9c6644"; ctx.fillRect(b.x + 14, b.y + 14, 3, 22); ctx.fillRect(b.x + BED_W - 17, b.y + 14, 3, 22);
    // vẽ người SAU bó rơm: ngồi trên bó rơm, quay mặt ra (trước đây bị bó rơm che, chỉ thấy đầu)
    if (sit) drawPlayer({...o, x: b.x + (b.w || BED_W) / 2, y: b.y + 32 + Math.sin(t * 2 + i) * .4, walking: false, up: false, sit: true}, t);
  }
  // Vẽ các hoạt ảnh hành động nông trại (trồng, tưới, thu hoạch) và thanh tiến trình
  function drawFarmActionAnimations(t) {
    const curT = performance.now() / 1000;
    let isAnyPlanting = false;
    const m = typeof me === "function" ? me() : null;

    for (const [iStr, a] of Object.entries(activeFarmActions)) {
      const i = +iStr;
      const r = PLOTS[i];
      if (!r) continue;

      const dt = curT - a.t0;
      if (dt < 0) continue;
      const p = Math.min(1, Math.max(0, dt / a.dur));

      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      const px = m ? m.x : cx;
      const py = m ? m.y : (r.y + r.h + 8);

      // 1. Trồng cây (plant)
      if (a.type === "plant") {
        const dx = cx;
        const dy = r.y + r.h - 18;

        if (a.isMe && p < 0.6) {
          farmCrouchOffset = Math.sin(p / 0.6 * Math.PI) * 2.8;
          isAnyPlanting = true;
        }

        // Giai đoạn 1: Xẻng đào đất & bụi đất bắn lên (0 <= p < 0.45)
        if (p < 0.45) {
          const digPhase = (p / 0.45) * Math.PI * 4;
          const trowelAngle = -0.4 + Math.sin(digPhase) * 0.45;
          const tx = dx + 6 + Math.cos(digPhase) * 2;
          const ty = dy - 6 + Math.sin(digPhase) * 3;

          // Hố đất đang đào
          const holeScale = Math.min(1, p / 0.2);
          ctx.fillStyle = "#3a2012";
          ctx.beginPath();
          ctx.ellipse(dx, dy, 8 * holeScale, 4 * holeScale, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#25140b";
          ctx.lineWidth = 1;
          ctx.stroke();

          // Hạt đất bắn lên
          for (let k = 0; k < 8; k++) {
            const ptP = (p / 0.45 * 2.5 + k * 0.35) % 1;
            const ang = (k / 8) * Math.PI * 1.6 + 0.2;
            const dist = 14 * ptP;
            const dirtX = dx + Math.cos(ang) * dist;
            const dirtY = dy - Math.sin(ang) * dist * 1.3 + ptP * ptP * 8;
            ctx.fillStyle = k % 2 === 0 ? "#5c3d2a" : "#3d2314";
            ctx.beginPath();
            ctx.arc(dirtX, dirtY, 1.2 + (k % 3) * 0.5, 0, Math.PI * 2);
            ctx.fill();
          }

          // Cây xẻng nhỏ (hand trowel)
          ctx.save();
          ctx.translate(tx, ty);
          ctx.rotate(trowelAngle);
          // Cán gỗ
          ctx.fillStyle = "#8d5b34";
          ctx.fillRect(-2, -10, 4, 8);
          ctx.fillStyle = "#5c3d2a";
          ctx.fillRect(-2.5, -3, 5, 2);
          // Lưỡi xẻng kim loại
          ctx.fillStyle = "#adb5bd";
          ctx.beginPath();
          ctx.moveTo(-3, -1);
          ctx.lineTo(3, -1);
          ctx.lineTo(4, 7);
          ctx.lineTo(0, 11);
          ctx.lineTo(-4, 7);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = "#495057";
          ctx.lineWidth = 0.8;
          ctx.stroke();
          // Vệt sáng trên lưỡi xẻng
          ctx.fillStyle = "#e9ecef";
          ctx.beginPath();
          ctx.moveTo(-1, 0);
          ctx.lineTo(1, 0);
          ctx.lineTo(1, 7);
          ctx.lineTo(0, 9);
          ctx.lineTo(-1, 7);
          ctx.fill();
          ctx.restore();
        } else {
          // Hố đất đã đào
          ctx.fillStyle = "#3a2012";
          ctx.beginPath();
          ctx.ellipse(dx, dy, 8, 4, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Giai đoạn 2: Hạt giống rơi vào lòng đất (0.35 <= p < 0.7)
        if (p >= 0.35 && p < 0.7) {
          const sp = (p - 0.35) / 0.35;
          const seedY = (dy - 18) + sp * sp * 18;
          const seedX = dx + Math.sin(sp * 6) * 1.5;

          ctx.save();
          ctx.translate(seedX, seedY);
          ctx.rotate(sp * 1.2);
          ctx.fillStyle = "#d4a373";
          ctx.beginPath();
          ctx.ellipse(0, 0, 2, 3.2, 0.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#7f4f24";
          ctx.lineWidth = 0.7;
          ctx.stroke();
          ctx.restore();

          if (sp > 0.8) {
            const puffP = (sp - 0.8) / 0.2;
            ctx.fillStyle = `rgba(141, 91, 52, ${(1 - puffP) * 0.45})`;
            ctx.beginPath();
            ctx.ellipse(dx, dy + 1, 6 + puffP * 5, 3 + puffP * 2, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Giai đoạn 3: Mầm cây nhỏ nhú lên và lấp lánh (0.65 <= p <= 1.0)
        if (p >= 0.65) {
          const sprP = (p - 0.65) / 0.35;
          const bounce = Math.sin(sprP * Math.PI * 0.75) * 1.25;
          const scale = Math.min(1.2, Math.max(0, bounce));

          ctx.save();
          ctx.translate(dx, dy);
          ctx.scale(scale, scale);
          // Thân mầm xanh
          ctx.strokeStyle = "#2d6a4f";
          ctx.lineWidth = 2;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(0, 2);
          ctx.lineTo(0, -7);
          ctx.stroke();
          // Hai lá mầm tròn nhỏ
          ctx.fillStyle = "#52b788";
          ctx.beginPath();
          ctx.ellipse(-3.5, -8, 3.5, 2, -0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#74c69d";
          ctx.beginPath();
          ctx.ellipse(3.5, -8, 3.5, 2, 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // Ngôi sao lấp lánh quanh mầm cây
          if (sprP > 0.35) {
            const starCoords = [[-8, -14, 0], [8, -12, 1], [-3, -19, 2], [7, -20, 3]];
            for (const [ox, oy, idx] of starCoords) {
              const tw = Math.sin(p * 20 + idx * 2);
              if (tw > 0) drawSparkleStar(ctx, dx + ox, dy + oy, 2.5 * tw);
            }
          }
        }
      }

      // 2. Tưới nước (water)
      else if (a.type === "water") {
        const wx = cx;
        const wy = cy + 4;
        const canX = px - 8;
        const canY = py - 20;

        // Đất ướt sẫm màu dần
        if (p >= 0.2) {
          const wetAlpha = p < 0.5 ? ((p - 0.2) / 0.3) * 0.45 : 0.45 * (1 - (p - 0.5) / 0.5 * 0.2);
          ctx.fillStyle = `rgba(30, 15, 8, ${wetAlpha})`;
          rr(ctx, r.x + 3, r.y + 3, r.w - 6, r.h - 6, 5);
          ctx.fill();
        }

        // Bình tưới nghiêng và tia nước
        let tilt = 0;
        if (p < 0.15) tilt = (p / 0.15) * -0.55;
        else if (p < 0.85) tilt = -0.55 + Math.sin(p * 25) * 0.04;
        else tilt = -0.55 * (1 - (p - 0.85) / 0.15);

        // Vị trí đầu vòi tưới
        const spoutX = canX + Math.cos(tilt) * 18 - Math.sin(tilt) * -10;
        const spoutY = canY + Math.sin(tilt) * 18 + Math.cos(tilt) * -10;

        // Dòng nước vòng cung uốn lượn xuống ô đất (0.12 <= p <= 0.88)
        if (p >= 0.12 && p <= 0.88) {
          const ctrlX = (spoutX + wx) / 2 + 6;
          const ctrlY = Math.min(spoutY, wy) - 14;

          for (let k = 0; k < 12; k++) {
            const u = ((p * 4.5 + k / 12) % 1);
            const dropX = (1 - u) * (1 - u) * spoutX + 2 * (1 - u) * u * ctrlX + u * u * wx + Math.sin(k * 4) * 2;
            const dropY = (1 - u) * (1 - u) * spoutY + 2 * (1 - u) * u * ctrlY + u * u * wy;
            ctx.fillStyle = k % 3 === 0 ? "#caf0f8" : (k % 3 === 1 ? "#90e0ef" : "#00b4d8");
            ctx.beginPath();
            ctx.ellipse(dropX, dropY, 1.8, 2.6, 0.3, 0, Math.PI * 2);
            ctx.fill();
          }

          // Giọt nước bắn tung tóe trên mặt đất
          for (let k = 0; k < 6; k++) {
            const spP = (p * 8 + k * 0.4) % 1;
            const spAng = -Math.PI * 0.15 - (k / 6) * Math.PI * 0.7;
            const spDist = 12 * spP;
            const spX = wx + Math.cos(spAng) * spDist;
            const spY = wy + Math.sin(spAng) * spDist * 0.75;
            ctx.fillStyle = `rgba(202, 240, 248, ${1 - spP})`;
            ctx.beginPath();
            ctx.arc(spX, spY, 1.2, 0, Math.PI * 2);
            ctx.fill();
          }

          // Vòng sóng nước lăn tăn trên mặt đất
          for (let k = 0; k < 2; k++) {
            const ripP = ((p * 3 + k * 0.5) % 1);
            ctx.strokeStyle = `rgba(144, 224, 239, ${(1 - ripP) * 0.75})`;
            ctx.lineWidth = 1.3;
            ctx.beginPath();
            ctx.ellipse(wx, wy + 2, 4 + ripP * 18, 2 + ripP * 8, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        // Vẽ bình tưới nước xinh xắn
        ctx.save();
        ctx.translate(canX, canY);
        ctx.rotate(tilt);
        // Thân bình xanh ngọc
        ctx.fillStyle = "#48cae4";
        rr(ctx, -8, -7, 16, 14, 3);
        ctx.fill();
        ctx.strokeStyle = "#0077b6";
        ctx.lineWidth = 1;
        ctx.stroke();
        // Vạch trang trí
        ctx.fillStyle = "#90e0ef";
        ctx.fillRect(-7, -2, 14, 3);
        // Quai cầm trên
        ctx.strokeStyle = "#0077b6";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, -7, 6, Math.PI * 0.9, Math.PI * 0.1, false);
        ctx.stroke();
        // Vòi tưới vươn dài
        ctx.fillStyle = "#0096c7";
        ctx.beginPath();
        ctx.moveTo(6, -2);
        ctx.lineTo(16, -11);
        ctx.lineTo(17, -8);
        ctx.lineTo(7, 2);
        ctx.closePath();
        ctx.fill();
        // Đầu hoa sen vòi tưới
        ctx.fillStyle = "#48cae4";
        ctx.beginPath();
        ctx.ellipse(17.5, -9.5, 3.5, 5, 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#0077b6";
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.restore();
      }

      // 3. Thu hoạch (harvest)
      else if (a.type === "harvest") {
        const cropEmoji = (a.crop && a.crop.e) || "🥕";
        const count = a.harvestN || 2;

        // Cây nảy lên tung ra khỏi đất (0 <= p < 0.45)
        if (p < 0.45) {
          const bp = p / 0.45;
          const bounceH = Math.sin(bp * Math.PI) * 22;
          const popScale = 1 + Math.sin(bp * Math.PI) * 0.35;

          ctx.save();
          ctx.translate(cx, cy - bounceH);
          ctx.scale(popScale, popScale);
          ctx.font = '22px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",system-ui';
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(cropEmoji, 0, 0);
          ctx.restore();

          if (bp < 0.5) {
            ctx.fillStyle = `rgba(100, 60, 30, ${(1 - bp * 2) * 0.5})`;
            ctx.beginPath();
            ctx.ellipse(cx, cy + 8, 12, 5, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Kích hoạt nông sản bay về kho lương thực tại đỉnh nảy
        if (p >= 0.35 && !a.flyTriggered) {
          a.flyTriggered = true;
          addCropFlyAnim(i, cropEmoji, count);
        }

        // Dòng chữ +N bay lên (0.15 <= p <= 1.0)
        if (p >= 0.15) {
          const tp = (p - 0.15) / 0.85;
          const textY = cy - 8 - tp * 34;
          const alpha = tp < 0.65 ? 1 : Math.max(0, 1 - (tp - 0.65) / 0.35);

          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.font = 'bold 14px system-ui';
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
          ctx.lineWidth = 3;
          ctx.strokeText(`+${count} ${cropEmoji}`, cx, textY);
          ctx.fillStyle = "#80ed99";
          ctx.fillText(`+${count} ${cropEmoji}`, cx, textY);
          ctx.font = '10px system-ui';
          ctx.fillText("✨", cx + 22, textY - 4);
          ctx.restore();
        }
      }

      // 4. Thanh tiến trình nhỏ trên đầu ô đất (Requirement 3)
      const barW = 34, barH = 5;
      const barX = cx - barW / 2, barY = r.y - 8;
      ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
      rr(ctx, barX, barY, barW, barH, 2.5);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 0.8;
      ctx.stroke();

      const barCol = a.type === "plant" ? "#80ed99" : (a.type === "water" ? "#48cae4" : "#ffd166");
      ctx.fillStyle = barCol;
      rr(ctx, barX + 1, barY + 1, Math.max(1, (barW - 2) * p), barH - 2, 1.5);
      ctx.fill();
    }

    if (!isAnyPlanting) farmCrouchOffset = 0;
  }

  // Lấy vị trí đứng ngay dưới mép dưới ô đất, căn giữa, kẹp trong sàn nông trại
  function getPlotStandSpot(i) {
    const r = PLOTS[i];
    if (!r) return null;
    const fl = (typeof LAYOUT !== "undefined" && LAYOUT.farm && LAYOUT.farm.floor) ||
               (typeof FLOOR !== "undefined" ? FLOOR : { x1: 20, y1: 175, x2: 1100, y2: 585 });
    const cx = r.x + r.w / 2;
    const by = r.y + r.h;
    const sx = Math.max(fl.x1, Math.min(fl.x2, Math.round(cx)));
    const sy = Math.max(fl.y1, Math.min(fl.y2, Math.round(by + 8)));
    return { x: sx, y: sy };
  }

  // Kiểm tra ô đất có đang bận thực hiện hành động hay không
  function isPlotBusy(i) {
    return pendingFarmWalk === i || !!activeFarmActions[i];
  }

  // Cho nhân vật đi bộ tới điểm đứng cạnh ô đất
  function walkToPlot(i) {
    return new Promise(resolve => {
      const spot = getPlotStandSpot(i);
      if (!spot) return resolve(false);
      const m = typeof me === "function" ? me() : null;
      if (!m) return resolve(false);

      // Nếu đã ở rất gần (~8px) thì hành động ngay lập tức
      if (Math.hypot(m.x - spot.x, m.y - spot.y) <= 8) {
        return resolve(true);
      }

      // Đặt mục tiêu đi tới giống như chạm sàn trong index.html
      m.tx = spot.x;
      m.ty = spot.y;
      if (typeof taps !== "undefined" && Array.isArray(taps)) {
        taps.push({ x: spot.x, y: spot.y, t: performance.now() / 1000 });
      }
      if (typeof send === "function") {
        send({ t: "move", x: spot.x, y: spot.y });
      }

      const t0 = performance.now();
      let animId = null;

      function checkArrival() {
        // Hết thời gian chờ ~6s -> hủy nhẹ nhàng
        if (performance.now() - t0 > 6000) {
          if (animId) cancelAnimationFrame(animId);
          return resolve(false);
        }
        // Rời khỏi khu nông trại -> hủy
        if (typeof myArea !== "undefined" && myArea !== "farm") {
          if (animId) cancelAnimationFrame(animId);
          return resolve(false);
        }
        const curM = typeof me === "function" ? me() : null;
        if (!curM) {
          if (animId) cancelAnimationFrame(animId);
          return resolve(false);
        }

        // Nếu người chơi chạm đi nơi khác hoặc chuyển hướng -> hủy nhẹ nhàng
        if (Math.hypot(curM.tx - spot.x, curM.ty - spot.y) > 6) {
          if (animId) cancelAnimationFrame(animId);
          return resolve(false);
        }

        // Đã đến trong phạm vi ~8px của điểm đứng
        if (Math.hypot(curM.x - spot.x, curM.y - spot.y) <= 8) {
          if (animId) cancelAnimationFrame(animId);
          return resolve(true);
        }

        animId = requestAnimationFrame(checkArrival);
      }

      animId = requestAnimationFrame(checkArrival);
    });
  }

  // Điều phối toàn bộ quy trình hành động: đi bộ -> quay mặt -> hoạt ảnh 0.9-1.2s + gọi eco
  async function runFarmAction(i, type, data = {}) {
    if (isPlotBusy(i)) return;
    pendingFarmWalk = i;

    const arrived = await walkToPlot(i);
    if (pendingFarmWalk === i) pendingFarmWalk = null;
    if (!arrived) return;

    // Quay mặt về phía ô đất (hướng lên trên)
    const m = typeof me === "function" ? me() : null;
    if (m) m.up = true;

    const dur = 1.05; // Thời lượng hoạt ảnh 1.05s
    const t0 = performance.now() / 1000;
    const crop = data.crop || null;

    // Bắt đầu gọi eco ngay khi khởi động hoạt ảnh
    let ecoPromise = null;
    if (type === "plant" && crop) {
      ecoPromise = Life.eco("plant", { i, c: crop.id });
    } else if (type === "water") {
      ecoPromise = Life.eco("water", { i });
    } else if (type === "harvest") {
      ecoPromise = Life.eco("harvest", { i });
    }

    const actionObj = {
      type,
      t0,
      dur,
      crop,
      harvestN: 2,
      isMe: true,
      flyTriggered: false,
    };
    activeFarmActions[i] = actionObj;

    let ecoResult = null;
    if (ecoPromise) {
      ecoPromise.then(r => {
        ecoResult = r;
        if (r && r.n) actionObj.harvestN = r.n;
      }).catch(() => {});
    }

    // Đợi chạy hết hoạt ảnh (1.05s)
    await new Promise(r => setTimeout(r, dur * 1000));

    // Đảm bảo kết quả eco đã về (tối đa chờ thêm 2s nếu mạng trễ)
    if (ecoPromise && !ecoResult) {
      try {
        ecoResult = await Promise.race([
          ecoPromise,
          new Promise(r => setTimeout(() => r(null), 2000))
        ]);
        if (ecoResult && ecoResult.n) actionObj.harvestN = ecoResult.n;
      } catch (e) {}
    }

    // Xử lý sau khi hoàn thành hoạt ảnh
    if (ecoResult) {
      if (type === "plant") {
        Life.apply({ xp: 1 });
        Life.commit();
        toast(`🌱 Đã gieo ${crop.name}. Chạm ô đất để 💧 tưới nước!`);
      } else if (type === "water") {
        Life.apply({ xp: 1 });
        Life.commit();
        toast(`💧 Đã tưới ${crop.name}! Chín sau ${fmtTime(crop.time)}`);
      } else if (type === "harvest") {
        Life.apply({ xp: crop.xp, fun: 4 });
        Life.commit();
        const n = actionObj.harvestN || ecoResult.n || 2;
        toast(`🧺 Thu hoạch ${n} ${crop.e} ${crop.name}! Mang ra bác Năm bán nhé`);
      }
    }

    delete activeFarmActions[i];
    if (m) {
      m.up = false;
      farmCrouchOffset = 0;
    }
  }

  async function tapPlot(i) {
    const farm = (S() && Array.isArray(S().farm)) ? S().farm : [];
    const land = farm.length;

    // 1. Ô đất chưa mở khóa (locked)
    if (i >= land) {
      if (i === land) {
        // Ô đất tiếp theo có thể mua
        const price = nextLandPrice(land);
        if (price == null) {
          toast("Bạn đã mở rộng toàn bộ đất nông trại rồi! 🌾");
          return;
        }
        openSheet("🌱 Mở rộng ruộng",
          `${Life.coinLine()}<div class="vol" style="margin:0 0 12px">Mở rộng ruộng: mua thêm 1 ô đất với giá <b>${price} xu</b>?</div>
           <div class="grid"><button class="primary" id="btnBuyLand">Mua ngay (${price} 💰)</button><button class="opt" id="btnCancelLand" style="text-align:center">Hủy</button></div>`,
          el => {
            const btnCancel = el.querySelector("#btnCancelLand");
            if (btnCancel) btnCancel.onclick = closeSheet;
            const btnBuy = el.querySelector("#btnBuyLand");
            if (btnBuy) btnBuy.onclick = async () => {
              btnBuy.disabled = true;
              const r = await Life.eco("buyLand");
              if (!r) { btnBuy.disabled = false; return; }
              closeSheet();
              toast("🌱 Đã mở thêm ô đất mới!");
              if (typeof log === "function") log(`🌱 Đã mở thêm 1 ô đất mới! (-${price} 💰)`);
              addPlotSparkle(i);
            };
          }
        );
      } else {
        // Ô đất bị khóa phía sau: báo cần mở ô trước đó trước
        toast("Hãy mở ô đất trước đó trước nhé! 🔒");
      }
      return;
    }

    // Đang có hành động trên ô đất này -> bỏ qua chạm để chống gửi yêu cầu kép
    if (isPlotBusy(i)) return;

    // 2. Ô đất đã sở hữu
    const pl = farm[i], inf = plotInfo(pl);
    if (inf.st === "empty") return openSeeds(i);
    if (inf.st === "dry") {
      runFarmAction(i, "water", { crop: inf.c });
      return;
    }
    if (inf.st === "grow") {
      toast(`${inf.c.e} ${inf.c.name} đang lớn… còn ${fmtTime(inf.left)}`);
      return;
    }
    // inf.st === "ripe"
    runFarmAction(i, "harvest", { crop: inf.c });
  }

  function openSeeds(i) {
    if (isPlotBusy(i)) return;
    const st = S();
    openSheet("🌱 Gieo hạt",
      `${Life.coinLine()}<div class="grid">${CROPS.map(c => {
        const have = (st.inv["seed_" + c.id] || {}).n || 0;
        return `<button class="opt" data-c="${c.id}">${c.e} ${c.name}<small>${have ? `có ${have} hạt` : `mua ${c.seed} 💰`} · chín sau ${fmtTime(c.time)} · bán ${c.sell} 💰</small></button>`;
      }).join("")}</div><div class="vol" style="font-size:12px">Gieo xong nhớ chạm lần nữa để 💧 tưới thì cây mới lớn.</div>`,
      el => el.querySelectorAll("[data-c]").forEach(b => b.onclick = async () => {
        const c = CR[b.dataset.c];
        closeSheet();
        runFarmAction(i, "plant", { crop: c });
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

  // Bảng thông tin kho lương thực (nông sản, sản phẩm chăn nuôi & hạt giống dự trữ)
  function openBarn() {
    const st = S();
    const itemPrice = (id, cat) => {
      if (cat === "prod") {
        const pid = id.startsWith("prod_") ? id.slice(5) : id;
        const anCfg = typeof CATALOG !== "undefined" && CATALOG.ANIMALS;
        if (anCfg) {
          for (const a of Object.values(anCfg)) {
            if (a && a.product && a.product.id === pid) return a.product.sell || 0;
          }
        }
        if (pid === "egg") return 8;
        if (pid === "milk") return 25;
        return 0;
      }
      return (CR[id.slice(5)] || CR[id] || {}).sell || 0;
    };
    const crops = Object.entries(st.inv || {})
      .filter(([id, x]) => x && (x.cat === "crop" || x.cat === "prod") && x.n > 0)
      .map(([id, x]) => [id, {...x, sell: itemPrice(id, x.cat)}]);
    const total = crops.reduce((s, [, x]) => s + x.n * x.sell, 0);
    const seeds = Object.entries(st.inv || {}).filter(([id, x]) => x && (x.cat === "seed" || id.startsWith("seed_")) && x.n > 0);

    const cropsHtml = crops.length ? `
      <div class="board">${crops.map(([, x]) => `<div><span>${x.e} ${esc(x.name)} ×${x.n} <small style="opacity:.75">(${x.sell} 💰)</small></span><b>${x.n * x.sell} 💰</b></div>`).join("")}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 4px 2px;font-size:13px">
        <span style="opacity:.85">Tổng giá trị:</span><b>${total} 💰</b>
      </div>
      <button class="primary" id="sellAllBarn" style="margin-top:8px">Bán hết (+${total} 💰)</button>
    ` : `<div class="vol" style="margin:0">Kho còn trống. Trồng rau và chăn nuôi rồi thu hoạch nhé!</div>`;

    const seedsHtml = seeds.length ? `
      <div class="grid">${seeds.map(([, x]) => `<div class="opt" style="cursor:default"><span>${x.e || "🌱"} ${esc(x.name)}</span><small>Số lượng: ${x.n}</small></div>`).join("")}</div>
    ` : `<div class="vol" style="margin:0">Chưa có hạt giống trong kho.</div>`;

    openSheet("🏚️ Kho lương thực",
      `${Life.coinLine()}
       <div class="sec">🧺 Nông sản & chăn nuôi</div>
       ${cropsHtml}
       <div class="sec">🌱 Hạt giống trong kho</div>
       ${seedsHtml}
       <div class="vol" style="font-size:12px;margin-top:10px">💡 Nông sản và sản phẩm chăn nuôi tự cất vào kho.</div>`,
      el => {
        const sa = el.querySelector("#sellAllBarn");
        if (sa) sa.onclick = async () => {
          const r = await Life.eco("sellCrops"); if (!r) return;
          Life.apply({xp: Math.ceil(r.total / 20)}); Life.commit(); closeSheet(); toast(`💰 Bán được ${r.total} xu!`);
        };
      }
    );
  }

  // Mở bảng quản lý vật nuôi: Chuồng gà hoặc Chuồng bò
  function openAnimals(k) {
    const isChicken = (k === "chicken");
    const title = isChicken ? "🐔 Chuồng gà" : "🐄 Chuồng bò";
    const cfg = animalCfg(k);
    const st = S();
    const list = (st && st.animals && Array.isArray(st.animals[k])) ? st.animals[k] : [];
    const prod = cfg.product || (isChicken ? {id: "egg", e: "🥚", name: "Trứng gà", sell: 8} : {id: "milk", e: "🥛", name: "Sữa bò", sell: 25});
    const feedCost = cfg.feed || (isChicken ? 3 : 8);
    const prodName = prod.name;
    const prodEmoji = prod.e;
    const readyText = isChicken ? "Có trứng!" : "Có sữa!";

    const start = cfg.start || 1;
    const maxN = cfg.max || start;
    const prices = cfg.prices || [];
    const count = list.length;
    const idx = Math.max(0, count - start);
    const canBuy = (count < maxN && idx >= 0 && idx < prices.length);
    const nextPrice = canBuy ? prices[idx] : null;

    const rowsHtml = list.map((an, i) => {
      const inf = animalInfo(k, an);
      let stHtml = "";
      if (inf.st === "hungry") {
        stHtml = `Đang đói · <button class="opt btn-feed" data-i="${i}" style="padding:4px 9px;font-size:12px;margin:0">Cho ăn ${feedCost} 💰</button>`;
      } else if (inf.st === "ready") {
        stHtml = `${readyText} <button class="primary btn-collect" data-i="${i}" style="padding:4px 11px;font-size:12px;margin:0">Thu</button>`;
      } else {
        stHtml = `<span data-countdown-i="${i}" style="opacity:.85">Đang no · còn ${fmtTime(inf.left)}</span>`;
      }
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 4px;border-bottom:1px solid rgba(255,255,255,0.07)">
          <span style="font-weight:600">${cfg.e || (isChicken ? "🐔" : "🐄")} Con ${i + 1}</span>
          <div style="display:flex;align-items:center;gap:6px">${stHtml}</div>
        </div>
      `;
    }).join("");

    const buyHtml = canBuy
      ? `<div class="grid"><button class="opt" id="btnBuyAnimal" style="text-align:center">Mua thêm 1 con: ${nextPrice} 💰</button></div>`
      : `<div class="vol" style="margin:4px 0;text-align:center">Đã đủ ${maxN} con (tối đa)</div>`;

    openSheet(title,
      `${Life.coinLine()}
       <div class="sec">🐾 Danh sách ${cfg.name || (isChicken ? "gà mái" : "bò sữa")}</div>
       <div class="board" style="padding:2px 8px">
         ${rowsHtml || `<div class="vol" style="margin:0">Chưa có con vật nào.</div>`}
       </div>
       <div class="grid" style="margin-top:10px">
         <button class="opt" id="btnFeedAll" style="text-align:center">🌾 Cho ăn tất cả</button>
         <button class="opt" id="btnCollectAll" style="text-align:center">🧺 Thu hoạch tất cả</button>
       </div>
       <div class="sec">➕ Mua thêm</div>
       ${buyHtml}
       <div class="vol" style="font-size:12px;margin-top:8px">💡 Cho ăn và chờ thời gian để thu hoạch ${prodName.toLowerCase()}.</div>`,
      el => {
        // 1. Cho ăn từng con
        el.querySelectorAll(".btn-feed").forEach(btn => {
          btn.onclick = async () => {
            const i = +btn.dataset.i;
            const r = await Life.eco("feedAnimal", { k, i });
            if (!r) return;
            Life.apply({ xp: 1 });
            Life.commit();
            toast(`🌾 Đã cho ${cfg.name} (Con ${i + 1}) ăn (-${feedCost} 💰)!`);
            openAnimals(k);
          };
        });

        // 2. Thu hoạch từng con
        el.querySelectorAll(".btn-collect").forEach(btn => {
          btn.onclick = async () => {
            const i = +btn.dataset.i;
            const r = await Life.eco("collectAnimal", { k, i });
            if (!r) return;
            Life.apply({ xp: 2 });
            Life.commit();
            const pos = drawnFarmAnimals.find(a => a.k === k && a.i === i);
            const sx = pos ? pos.x : (isChicken ? 100 : 1000);
            const sy = pos ? pos.y : (isChicken ? 540 : 500);
            addAnimalFlyAnim(sx, sy, prodEmoji, 2);
            toast(`${prodEmoji} +1 ${prodName}`);
            openAnimals(k);
          };
        });

        // 3. Cho ăn tất cả
        const btnFeedAll = el.querySelector("#btnFeedAll");
        if (btnFeedAll) {
          btnFeedAll.onclick = async () => {
            const r = await Life.eco("feedAll");
            if (!r) return;
            Life.apply({ xp: Math.max(1, r.n) });
            Life.commit();
            toast(`🌾 Đã cho ăn ${r.n} con vật (-${r.price} 💰)!`);
            openAnimals(k);
          };
        }

        // 4. Thu hoạch tất cả
        const btnCollectAll = el.querySelector("#btnCollectAll");
        if (btnCollectAll) {
          btnCollectAll.onclick = async () => {
            const r = await Life.eco("collectAll");
            if (!r) return;
            Life.apply({ xp: Math.max(2, r.n * 2) });
            Life.commit();
            drawnFarmAnimals.forEach(a => {
              const an = (S().animals && S().animals[a.k] && S().animals[a.k][a.i]);
              const inf = animalInfo(a.k, an);
              if (inf.st === "ready") {
                const pEmoji = (inf.cfg && inf.cfg.product && inf.cfg.product.e) || (a.k === "cow" ? "🥛" : "🥚");
                addAnimalFlyAnim(a.x, a.y, pEmoji, 2);
              }
            });
            toast(`🧺 Thu hoạch tất cả ${r.n} sản phẩm!`);
            openAnimals(k);
          };
        }

        // 5. Mua thêm con vật
        const btnBuy = el.querySelector("#btnBuyAnimal");
        if (btnBuy) {
          btnBuy.onclick = async () => {
            btnBuy.disabled = true;
            const r = await Life.eco("buyAnimal", { k });
            if (!r) { btnBuy.disabled = false; return; }
            Life.apply({ xp: 5 });
            Life.commit();
            toast(`🎉 Đã mua thêm 1 con ${cfg.name}!`);
            openAnimals(k);
          };
        }

        // 6. Cập nhật đếm ngược mỗi giây trong giao diện
        const iv = setInterval(() => {
          if (!document.body.contains(el)) { clearInterval(iv); return; }
          const curSt = S();
          const curList = (curSt && curSt.animals && Array.isArray(curSt.animals[k])) ? curSt.animals[k] : [];
          let shouldRefresh = false;
          el.querySelectorAll("[data-countdown-i]").forEach(span => {
            const idx = +span.dataset.countdownI;
            const an = curList[idx];
            const inf = animalInfo(k, an);
            if (inf.st !== "waiting") {
              shouldRefresh = true;
            } else {
              span.textContent = `Đang no · còn ${fmtTime(inf.left)}`;
            }
          });
          if (shouldRefresh) {
            clearInterval(iv);
            openAnimals(k);
          }
        }, 1000);
      }
    );
  }

  // ---------- 6. Hồ câu cá ----------
  let fishState = null;                                                  // {seat, phase: wait|bite, at}
  const SWIM = FISH.filter(f => f.id !== "boot").slice(0, 7);

  // Khởi tạo hoạt ảnh CSS cho cá khi câu được (nảy nhẹ và lấp lánh)
  function ensureFishStyles() {
    if (typeof document === "undefined" || document.getElementById("fishAnimStyle")) return;
    const st = document.createElement("style");
    st.id = "fishAnimStyle";
    st.textContent = `
      @keyframes fishBounce {
        0%, 100% { transform: translateY(0) scale(1) rotate(0deg); }
        35% { transform: translateY(-10px) scale(1.04) rotate(-3deg); }
        70% { transform: translateY(-4px) scale(0.98) rotate(2deg); }
      }
      @keyframes fishSparkle {
        0% { transform: scale(0.7) rotate(0deg); opacity: 0.4; }
        50% { transform: scale(1.25) rotate(25deg); opacity: 1; }
        100% { transform: scale(0.8) rotate(45deg); opacity: 0.6; }
      }
    `;
    document.head.appendChild(st);
  }

  // Vẽ mắt chibi to tròn long lanh hai đốm sáng
  function drawCuteEye(c, ex, ey, r, irisCol = "#2b1810") {
    c.fillStyle = "#ffffff";
    c.beginPath(); c.arc(ex, ey, r, 0, Math.PI * 2); c.fill();
    c.strokeStyle = "rgba(0,0,0,0.25)"; c.lineWidth = 0.8; c.stroke();
    c.fillStyle = irisCol;
    c.beginPath(); c.arc(ex + 0.3, ey, r * 0.82, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#ffffff";
    c.beginPath(); c.arc(ex - r * 0.28, ey - r * 0.3, r * 0.38, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(ex + r * 0.32, ey + r * 0.32, r * 0.18, 0, Math.PI * 2); c.fill();
    c.strokeStyle = "#1a0c06"; c.lineWidth = 1.1; c.lineCap = "round";
    c.beginPath(); c.arc(ex, ey, r * 1.05, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
  }

  // Vẽ ngôi sao lấp lánh cho loài cá hiếm
  function drawSparkleStar(c, sx, sy, r) {
    c.fillStyle = "#ffd166";
    c.beginPath();
    c.moveTo(sx, sy - r * 1.4);
    c.quadraticCurveTo(sx, sy, sx + r * 1.4, sy);
    c.quadraticCurveTo(sx, sy, sx, sy + r * 1.4);
    c.quadraticCurveTo(sx, sy, sx - r * 1.4, sy);
    c.quadraticCurveTo(sx, sy, sx, sy - r * 1.4);
    c.fill();
    c.fillStyle = "#ffffff";
    c.beginPath(); c.arc(sx, sy, r * 0.35, 0, Math.PI * 2); c.fill();
  }

  // Bảng vẽ chi tiết từng loại cá/vật phẩm câu được theo phong cách chibi dễ thương (khung 120x120)
  const FISH_DRAWERS = {
    // 1. Cá chép (carp)
    carp: (c) => {
      c.fillStyle = "rgba(0,0,0,0.08)"; c.beginPath(); c.ellipse(60, 96, 36, 6, 0, 0, Math.PI * 2); c.fill();
      const tg = c.createLinearGradient(15, 38, 38, 76);
      tg.addColorStop(0, "#e76f51"); tg.addColorStop(1, "#f4a261");
      c.fillStyle = tg; c.beginPath();
      c.moveTo(34, 58);
      c.bezierCurveTo(24, 40, 12, 36, 12, 44);
      c.quadraticCurveTo(14, 54, 25, 58);
      c.quadraticCurveTo(14, 62, 12, 72);
      c.bezierCurveTo(12, 80, 24, 76, 34, 58);
      c.fill();
      c.strokeStyle = "rgba(255,255,255,0.45)"; c.lineWidth = 1; c.beginPath();
      c.moveTo(32, 58); c.lineTo(16, 46);
      c.moveTo(32, 58); c.lineTo(15, 58);
      c.moveTo(32, 58); c.lineTo(16, 70);
      c.stroke();

      c.fillStyle = "#e76f51"; c.beginPath();
      c.moveTo(42, 41);
      c.bezierCurveTo(48, 28, 62, 30, 68, 41);
      c.quadraticCurveTo(55, 37, 42, 41);
      c.fill();

      c.fillStyle = "#f4a261"; c.beginPath();
      c.moveTo(44, 73); c.quadraticCurveTo(38, 83, 34, 77); c.quadraticCurveTo(40, 72, 44, 73); c.fill();

      const bg = c.createLinearGradient(30, 36, 85, 76);
      bg.addColorStop(0, "#e76f51");
      bg.addColorStop(0.45, "#f4a261");
      bg.addColorStop(1, "#ffe3a8");
      c.fillStyle = bg;
      c.beginPath();
      c.moveTo(88, 58);
      c.bezierCurveTo(86, 42, 60, 36, 34, 54);
      c.quadraticCurveTo(30, 58, 34, 62);
      c.bezierCurveTo(60, 80, 86, 74, 88, 58);
      c.closePath();
      c.fill();
      c.strokeStyle = "#c85a3a"; c.lineWidth = 1.8; c.stroke();

      c.fillStyle = "rgba(255, 243, 176, 0.55)"; c.beginPath();
      c.moveTo(82, 62);
      c.quadraticCurveTo(60, 76, 40, 65);
      c.quadraticCurveTo(60, 70, 82, 62);
      c.fill();

      c.strokeStyle = "rgba(215, 95, 50, 0.45)"; c.lineWidth = 1.2;
      for (let row = 0; row < 3; row++) {
        const rx = 44 + row * 8, ry = 50 + row * 6;
        c.beginPath(); c.arc(rx, ry, 4.5, -0.6, 1.8); c.stroke();
        c.beginPath(); c.arc(rx + 6, ry - 3, 4.5, -0.6, 1.8); c.stroke();
      }
      c.fillStyle = "rgba(255, 255, 255, 0.7)";
      c.beginPath(); c.arc(54, 48, 1.4, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(62, 54, 1.2, 0, Math.PI * 2); c.fill();

      c.strokeStyle = "rgba(180, 70, 40, 0.4)"; c.lineWidth = 1.5;
      c.beginPath(); c.arc(70, 58, 8, 0.6, 2.6); c.stroke();

      c.strokeStyle = "#e76f51"; c.lineWidth = 1.8; c.lineCap = "round";
      c.beginPath(); c.moveTo(86, 62); c.quadraticCurveTo(92, 68, 89, 74); c.stroke();
      c.beginPath(); c.moveTo(84, 64); c.quadraticCurveTo(88, 70, 85, 73); c.stroke();

      c.fillStyle = "rgba(244, 162, 97, 0.85)"; c.beginPath();
      c.moveTo(68, 64); c.quadraticCurveTo(56, 76, 52, 72); c.quadraticCurveTo(58, 62, 66, 64); c.fill();
      c.strokeStyle = "#e76f51"; c.lineWidth = 1; c.stroke();

      c.fillStyle = "rgba(255, 99, 132, 0.35)"; c.beginPath(); c.ellipse(73, 64, 4.5, 2.8, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = "#8b2500"; c.lineWidth = 1.4; c.lineCap = "round";
      c.beginPath(); c.moveTo(88, 58); c.quadraticCurveTo(86, 61, 83, 59); c.stroke();

      drawCuteEye(c, 76, 50, 5.5);
    },

    // 2. Cá rô (perch)
    perch: (c) => {
      c.fillStyle = "rgba(0,0,0,0.08)"; c.beginPath(); c.ellipse(60, 96, 36, 6, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#606c38"; c.beginPath();
      c.moveTo(34, 58);
      c.quadraticCurveTo(16, 42, 14, 48);
      c.quadraticCurveTo(18, 58, 14, 68);
      c.quadraticCurveTo(16, 74, 34, 58);
      c.fill();
      c.strokeStyle = "#283618"; c.lineWidth = 1; c.stroke();

      c.fillStyle = "#4f772d";
      c.beginPath();
      c.moveTo(38, 44);
      c.lineTo(41, 28); c.lineTo(46, 34); c.lineTo(51, 25);
      c.lineTo(56, 32); c.lineTo(61, 26); c.lineTo(67, 34);
      c.lineTo(71, 44);
      c.closePath();
      c.fill();
      c.strokeStyle = "#283618"; c.lineWidth = 1.4; c.stroke();
      c.strokeStyle = "rgba(255,255,255,0.4)"; c.lineWidth = 1;
      [[41, 28], [51, 25], [61, 26]].forEach(([gx, gy]) => {
        c.beginPath(); c.moveTo(gx, gy); c.lineTo(gx + 3, gy + 14); c.stroke();
      });

      c.fillStyle = "#606c38"; c.beginPath();
      c.moveTo(48, 73); c.lineTo(43, 82); c.lineTo(54, 75); c.fill();

      const bg = c.createLinearGradient(40, 36, 85, 76);
      bg.addColorStop(0, "#386641");
      bg.addColorStop(0.5, "#6a994e");
      bg.addColorStop(1, "#e9f5db");
      c.fillStyle = bg;
      c.beginPath();
      c.moveTo(88, 58);
      c.bezierCurveTo(85, 42, 60, 36, 34, 53);
      c.quadraticCurveTo(30, 58, 34, 63);
      c.bezierCurveTo(60, 80, 85, 74, 88, 58);
      c.closePath();
      c.fill();
      c.strokeStyle = "#1b4332"; c.lineWidth = 1.8; c.stroke();

      c.strokeStyle = "rgba(27, 67, 50, 0.55)"; c.lineWidth = 3.2; c.lineCap = "round";
      [[46, 42, 48, 62], [54, 40, 55, 65], [62, 40, 63, 64], [70, 43, 71, 62]].forEach(([x1, y1, x2, y2]) => {
        c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo((x1 + x2) / 2 + 1, (y1 + y2) / 2, x2, y2); c.stroke();
      });

      c.strokeStyle = "#1b4332"; c.lineWidth = 1.4;
      c.beginPath(); c.arc(71, 58, 8.5, 0.7, 2.5); c.stroke();
      c.fillStyle = "#1b4332"; c.beginPath(); c.arc(68, 59, 1.2, 0, Math.PI * 2); c.fill();

      c.fillStyle = "rgba(106, 153, 78, 0.85)"; c.beginPath();
      c.moveTo(68, 63); c.quadraticCurveTo(58, 73, 54, 69); c.quadraticCurveTo(60, 60, 68, 63); c.fill();

      c.fillStyle = "rgba(255, 120, 100, 0.3)"; c.beginPath(); c.ellipse(75, 64, 4, 2.5, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = "#1b4332"; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(88, 58); c.lineTo(84, 60); c.stroke();

      drawCuteEye(c, 77, 50, 5.2, "#854d0e");
    },

    // 3. Cá vàng (gold)
    gold: (c) => {
      c.fillStyle = "rgba(0,0,0,0.08)"; c.beginPath(); c.ellipse(60, 96, 36, 6, 0, 0, Math.PI * 2); c.fill();
      const tg = c.createLinearGradient(10, 24, 40, 88);
      tg.addColorStop(0, "rgba(255, 107, 53, 0.85)");
      tg.addColorStop(0.5, "rgba(255, 183, 3, 0.75)");
      tg.addColorStop(1, "rgba(255, 230, 109, 0.5)");
      c.fillStyle = tg;
      c.beginPath();
      c.moveTo(38, 58);
      c.bezierCurveTo(24, 30, 8, 22, 10, 36);
      c.bezierCurveTo(12, 48, 22, 52, 38, 58);
      c.fill();
      c.beginPath();
      c.moveTo(38, 58);
      c.bezierCurveTo(22, 64, 8, 68, 10, 82);
      c.bezierCurveTo(12, 92, 26, 82, 38, 58);
      c.fill();
      c.fillStyle = "rgba(255, 214, 10, 0.7)";
      c.beginPath();
      c.moveTo(36, 58);
      c.bezierCurveTo(18, 45, 6, 50, 6, 60);
      c.bezierCurveTo(6, 70, 18, 72, 36, 58);
      c.fill();

      c.fillStyle = "rgba(255, 158, 0, 0.85)"; c.beginPath();
      c.moveTo(42, 42);
      c.bezierCurveTo(46, 20, 62, 22, 66, 42);
      c.quadraticCurveTo(54, 34, 42, 42);
      c.fill();

      const bg = c.createRadialGradient(68, 52, 6, 60, 60, 34);
      bg.addColorStop(0, "#fff275");
      bg.addColorStop(0.35, "#ffb703");
      bg.addColorStop(0.75, "#fb8500");
      bg.addColorStop(1, "#d90429");
      c.fillStyle = bg;
      c.beginPath();
      c.ellipse(62, 58, 26, 22, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "#d90429"; c.lineWidth = 1.6; c.stroke();

      c.fillStyle = "rgba(255, 195, 0, 0.85)"; c.beginPath();
      c.moveTo(68, 66); c.quadraticCurveTo(56, 80, 52, 74); c.quadraticCurveTo(58, 62, 68, 66); c.fill();

      c.fillStyle = "#fff";
      [[52, 50, 1.6], [58, 46, 1.2], [48, 56, 1.3], [56, 64, 1.1]].forEach(([sx, sy, sr]) => {
        c.beginPath(); c.arc(sx, sy, sr, 0, Math.PI * 2); c.fill();
      });

      c.fillStyle = "rgba(255, 45, 85, 0.4)"; c.beginPath(); c.ellipse(74, 65, 5.5, 3.5, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#d90429"; c.beginPath(); c.ellipse(88, 60, 2, 2.5, 0, 0, Math.PI * 2); c.fill();

      c.strokeStyle = "rgba(255, 255, 255, 0.75)"; c.lineWidth = 1;
      c.beginPath(); c.arc(96, 52, 3.5, 0, Math.PI * 2); c.stroke();
      c.fillStyle = "rgba(255,255,255,0.6)"; c.beginPath(); c.arc(95, 51, 1, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(104, 44, 2, 0, Math.PI * 2); c.stroke();

      drawCuteEye(c, 78, 49, 6.2);
    },

    // 4. Tôm càng (shrimp)
    shrimp: (c) => {
      c.fillStyle = "rgba(0,0,0,0.08)"; c.beginPath(); c.ellipse(60, 96, 36, 6, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#ff5d8f";
      [[-15, 78], [-10, 84], [-3, 86], [4, 84]].forEach(([ox, oy]) => {
        c.beginPath(); c.ellipse(36 + ox, oy, 7, 3.5, 0.4, 0, Math.PI * 2); c.fill();
        c.strokeStyle = "#c9184a"; c.lineWidth = 0.8; c.stroke();
      });

      const segments = [
        {x: 40, y: 72, rx: 9, ry: 7, rot: 0.5},
        {x: 46, y: 64, rx: 11, ry: 8, rot: 0.3},
        {x: 54, y: 57, rx: 12, ry: 9, rot: 0.1},
        {x: 63, y: 54, rx: 13, ry: 10, rot: -0.05},
      ];
      segments.forEach(seg => {
        const sg = c.createLinearGradient(seg.x - seg.rx, seg.y - seg.ry, seg.x + seg.rx, seg.y + seg.ry);
        sg.addColorStop(0, "#ff4d6d"); sg.addColorStop(1, "#ffb3c1");
        c.fillStyle = sg;
        c.beginPath(); c.ellipse(seg.x, seg.y, seg.rx, seg.ry, seg.rot, 0, Math.PI * 2); c.fill();
        c.strokeStyle = "#c9184a"; c.lineWidth = 1.2; c.stroke();
        c.fillStyle = "rgba(255,255,255,0.45)"; c.beginPath();
        c.ellipse(seg.x, seg.y - seg.ry * 0.45, seg.rx * 0.6, 2, seg.rot, 0, Math.PI * 2); c.fill();
      });

      c.strokeStyle = "#ff758f"; c.lineWidth = 1.6; c.lineCap = "round";
      [[44, 76], [50, 71], [58, 66]].forEach(([lx, ly]) => {
        c.beginPath(); c.moveTo(lx, ly); c.lineTo(lx - 4, ly + 6); c.stroke();
      });

      const hg = c.createLinearGradient(60, 40, 85, 62);
      hg.addColorStop(0, "#ff4d6d"); hg.addColorStop(1, "#ffccd5");
      c.fillStyle = hg;
      c.beginPath();
      c.moveTo(96, 46);
      c.quadraticCurveTo(88, 38, 70, 42);
      c.quadraticCurveTo(65, 48, 66, 60);
      c.quadraticCurveTo(76, 64, 86, 56);
      c.closePath();
      c.fill();
      c.strokeStyle = "#c9184a"; c.lineWidth = 1.5; c.stroke();

      c.strokeStyle = "#a4133c"; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(86, 44); c.lineTo(96, 46); c.stroke();

      c.strokeStyle = "#ff4d6d"; c.lineWidth = 1.6; c.lineCap = "round";
      c.beginPath(); c.moveTo(86, 46); c.bezierCurveTo(96, 32, 85, 18, 50, 18); c.stroke();
      c.beginPath(); c.moveTo(85, 48); c.bezierCurveTo(100, 40, 95, 26, 65, 22); c.stroke();

      c.strokeStyle = "#ff4d6d"; c.lineWidth = 2.4;
      c.beginPath(); c.moveTo(76, 60); c.quadraticCurveTo(86, 72, 94, 68); c.stroke();
      c.fillStyle = "#48cae4"; c.beginPath();
      c.moveTo(94, 68); c.quadraticCurveTo(100, 62, 102, 66); c.lineTo(96, 69); c.fill();
      c.beginPath();
      c.moveTo(94, 68); c.quadraticCurveTo(100, 74, 103, 70); c.lineTo(96, 69); c.fill();
      c.strokeStyle = "#0077b6"; c.lineWidth = 1; c.stroke();

      c.fillStyle = "rgba(255, 77, 109, 0.4)"; c.beginPath(); c.ellipse(78, 56, 4, 2.5, 0, 0, Math.PI * 2); c.fill();
      drawCuteEye(c, 80, 47, 4.5);
    },

    // 5. Cua đồng (crab)
    crab: (c) => {
      c.fillStyle = "rgba(0,0,0,0.08)"; c.beginPath(); c.ellipse(60, 96, 40, 6, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = "#d90429"; c.lineWidth = 2.8; c.lineCap = "round";
      c.beginPath(); c.moveTo(42, 60); c.quadraticCurveTo(28, 58, 24, 70); c.stroke();
      c.beginPath(); c.moveTo(40, 66); c.quadraticCurveTo(26, 68, 22, 80); c.stroke();
      c.beginPath(); c.moveTo(42, 72); c.quadraticCurveTo(30, 78, 28, 88); c.stroke();
      c.beginPath(); c.moveTo(78, 60); c.quadraticCurveTo(92, 58, 96, 70); c.stroke();
      c.beginPath(); c.moveTo(80, 66); c.quadraticCurveTo(94, 68, 98, 80); c.stroke();
      c.beginPath(); c.moveTo(78, 72); c.quadraticCurveTo(90, 78, 92, 88); c.stroke();

      c.strokeStyle = "#d90429"; c.lineWidth = 4;
      c.beginPath(); c.moveTo(42, 56); c.quadraticCurveTo(26, 48, 28, 38); c.stroke();
      c.beginPath(); c.moveTo(78, 56); c.quadraticCurveTo(94, 48, 92, 38); c.stroke();

      c.fillStyle = "#ef233c";
      c.beginPath();
      c.moveTo(28, 38);
      c.bezierCurveTo(18, 36, 14, 24, 25, 22);
      c.bezierCurveTo(28, 26, 26, 32, 28, 38);
      c.fill();
      c.beginPath();
      c.moveTo(28, 38);
      c.bezierCurveTo(36, 36, 38, 22, 28, 22);
      c.bezierCurveTo(26, 26, 28, 32, 28, 38);
      c.fill();
      c.strokeStyle = "#a4133c"; c.lineWidth = 1.4; c.stroke();

      c.beginPath();
      c.moveTo(92, 38);
      c.bezierCurveTo(84, 36, 82, 22, 92, 22);
      c.bezierCurveTo(94, 26, 92, 32, 92, 38);
      c.fill();
      c.beginPath();
      c.moveTo(92, 38);
      c.bezierCurveTo(102, 36, 106, 24, 95, 22);
      c.bezierCurveTo(92, 26, 94, 32, 92, 38);
      c.fill();
      c.stroke();

      const mg = c.createLinearGradient(60, 44, 60, 82);
      mg.addColorStop(0, "#ef233c");
      mg.addColorStop(0.7, "#d90429");
      mg.addColorStop(1, "#800f2f");
      c.fillStyle = mg;
      c.beginPath();
      c.ellipse(60, 66, 24, 17, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "#590d22"; c.lineWidth = 1.8; c.stroke();

      c.fillStyle = "rgba(255, 255, 255, 0.4)"; c.beginPath();
      c.ellipse(60, 56, 14, 4, 0, 0, Math.PI * 2); c.fill();

      c.fillStyle = "#ef233c";
      c.fillRect(51, 46, 5, 8);
      c.fillRect(64, 46, 5, 8);

      drawCuteEye(c, 53, 44, 5);
      drawCuteEye(c, 67, 44, 5);

      c.strokeStyle = "#590d22"; c.lineWidth = 1.6; c.lineCap = "round";
      c.beginPath(); c.arc(60, 69, 5.5, 0.2, Math.PI - 0.2); c.stroke();

      c.fillStyle = "rgba(255, 180, 190, 0.55)";
      c.beginPath(); c.ellipse(47, 68, 4, 2.5, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(73, 68, 4, 2.5, 0, 0, Math.PI * 2); c.fill();
    },

    // 6. Cá koi (koi, rare)
    koi: (c) => {
      c.fillStyle = "rgba(0,0,0,0.08)"; c.beginPath(); c.ellipse(60, 96, 38, 6, 0, 0, Math.PI * 2); c.fill();
      const tg = c.createLinearGradient(12, 38, 36, 76);
      tg.addColorStop(0, "rgba(255,255,255,0.95)");
      tg.addColorStop(1, "rgba(255, 107, 107, 0.6)");
      c.fillStyle = tg; c.beginPath();
      c.moveTo(34, 58);
      c.bezierCurveTo(22, 38, 10, 34, 10, 44);
      c.quadraticCurveTo(14, 56, 24, 58);
      c.quadraticCurveTo(14, 60, 10, 72);
      c.bezierCurveTo(10, 82, 22, 78, 34, 58);
      c.fill();
      c.strokeStyle = "rgba(230, 57, 70, 0.3)"; c.lineWidth = 1; c.stroke();

      c.fillStyle = "rgba(255,255,255,0.9)"; c.beginPath();
      c.moveTo(42, 40); c.bezierCurveTo(48, 28, 64, 30, 68, 40); c.fill();

      const bg = c.createLinearGradient(32, 36, 88, 76);
      bg.addColorStop(0, "#f8f9fa");
      bg.addColorStop(0.5, "#e9ecef");
      bg.addColorStop(1, "#dee2e6");
      c.fillStyle = bg;
      c.beginPath();
      c.moveTo(88, 58);
      c.bezierCurveTo(86, 42, 60, 36, 34, 54);
      c.quadraticCurveTo(30, 58, 34, 62);
      c.bezierCurveTo(60, 80, 86, 74, 88, 58);
      c.closePath();
      c.fill();
      c.strokeStyle = "#ced4da"; c.lineWidth = 1.6; c.stroke();

      c.fillStyle = "#e63946";
      c.beginPath(); c.ellipse(78, 48, 6.5, 4.5, 0.2, 0, Math.PI * 2); c.fill();
      c.beginPath();
      c.moveTo(64, 40);
      c.bezierCurveTo(56, 36, 48, 44, 52, 54);
      c.bezierCurveTo(60, 58, 68, 50, 64, 40);
      c.fill();
      c.beginPath(); c.ellipse(40, 56, 5, 3.5, -0.2, 0, Math.PI * 2); c.fill();

      c.fillStyle = "#212529";
      c.beginPath(); c.ellipse(60, 56, 2.5, 1.8, 0.3, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(46, 52, 1.8, 1.2, -0.1, 0, Math.PI * 2); c.fill();

      c.strokeStyle = "#e63946"; c.lineWidth = 1.6; c.lineCap = "round";
      c.beginPath(); c.moveTo(86, 61); c.quadraticCurveTo(92, 67, 88, 73); c.stroke();

      c.fillStyle = "rgba(255, 255, 255, 0.9)"; c.beginPath();
      c.moveTo(68, 64); c.quadraticCurveTo(58, 76, 54, 72); c.quadraticCurveTo(60, 62, 68, 64); c.fill();
      c.strokeStyle = "rgba(230, 57, 70, 0.4)"; c.lineWidth = 1; c.stroke();

      c.fillStyle = "rgba(255, 107, 107, 0.35)"; c.beginPath(); c.ellipse(74, 63, 4.5, 2.5, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = "#9d0208"; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(88, 58); c.quadraticCurveTo(86, 61, 84, 59); c.stroke();

      drawCuteEye(c, 78, 51, 5.2);
      drawSparkleStar(c, 96, 32, 5);
      drawSparkleStar(c, 24, 30, 4);
      drawSparkleStar(c, 90, 80, 4);
    },

    // 7. Cá nóc (puffer, rare)
    puffer: (c) => {
      c.fillStyle = "rgba(0,0,0,0.08)"; c.beginPath(); c.ellipse(60, 96, 38, 6, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#f4a261"; c.beginPath();
      c.moveTo(32, 60); c.lineTo(18, 52); c.lineTo(22, 60); c.lineTo(18, 68); c.closePath(); c.fill();
      c.strokeStyle = "#e76f51"; c.lineWidth = 1; c.stroke();

      c.fillStyle = "#f4a261"; c.beginPath();
      c.moveTo(42, 36); c.quadraticCurveTo(46, 28, 50, 36); c.fill();

      const bg = c.createRadialGradient(66, 50, 10, 60, 60, 32);
      bg.addColorStop(0, "#fff3b0");
      bg.addColorStop(0.45, "#ffd166");
      bg.addColorStop(0.85, "#f4a261");
      bg.addColorStop(1, "#e76f51");
      c.fillStyle = bg;
      c.beginPath();
      c.arc(60, 60, 28, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "#e76f51"; c.lineWidth = 2; c.stroke();

      c.fillStyle = "rgba(255, 255, 240, 0.65)"; c.beginPath();
      c.arc(60, 68, 20, 0.3, Math.PI - 0.3); c.fill();

      c.fillStyle = "#e76f51";
      for (let a = 0.5; a < Math.PI * 2; a += 0.42) {
        const gx = 60 + Math.cos(a) * 28;
        const gy = 60 + Math.sin(a) * 28;
        const tx = 60 + Math.cos(a) * 34;
        const ty = 60 + Math.sin(a) * 34;
        const px = 60 + Math.cos(a + 0.12) * 27;
        const py = 60 + Math.sin(a + 0.12) * 27;
        c.beginPath(); c.moveTo(gx, gy); c.lineTo(tx, ty); c.lineTo(px, py); c.fill();
      }

      c.fillStyle = "rgba(180, 80, 30, 0.45)";
      [[50, 42, 2.5], [62, 38, 2.8], [72, 44, 2.2], [54, 50, 2], [42, 54, 2.4]].forEach(([dx, dy, dr]) => {
        c.beginPath(); c.arc(dx, dy, dr, 0, Math.PI * 2); c.fill();
      });

      c.fillStyle = "#f4a261"; c.beginPath();
      c.ellipse(54, 68, 5, 3, -0.4, 0, Math.PI * 2); c.fill();
      c.strokeStyle = "#e76f51"; c.lineWidth = 0.8; c.stroke();

      c.fillStyle = "rgba(255, 99, 132, 0.45)"; c.beginPath(); c.ellipse(74, 65, 6, 4, 0, 0, Math.PI * 2); c.fill();

      c.strokeStyle = "#c1121f"; c.lineWidth = 1.8; c.lineCap = "round";
      c.beginPath();
      c.arc(88, 58, 2.5, Math.PI * 0.7, Math.PI * 1.8);
      c.arc(88, 62, 2.5, Math.PI * 0.2, Math.PI * 1.3);
      c.stroke();

      drawCuteEye(c, 74, 50, 6);

      c.strokeStyle = "rgba(255, 255, 255, 0.75)"; c.lineWidth = 1;
      c.beginPath(); c.arc(98, 48, 3, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.arc(104, 38, 2, 0, Math.PI * 2); c.stroke();

      drawSparkleStar(c, 94, 28, 5);
      drawSparkleStar(c, 24, 28, 4);
    },

    // 8. Rùa vàng (turtle, rare)
    turtle: (c) => {
      c.fillStyle = "rgba(0,0,0,0.08)"; c.beginPath(); c.ellipse(60, 96, 38, 6, 0, 0, Math.PI * 2); c.fill();

      c.fillStyle = "#90be6d";
      c.beginPath(); c.ellipse(74, 73, 8, 4.5, 0.5, 0, Math.PI * 2); c.fill();
      c.strokeStyle = "#40916c"; c.lineWidth = 1.2; c.stroke();
      c.beginPath(); c.ellipse(40, 73, 7, 4, -0.4, 0, Math.PI * 2); c.fill(); c.stroke();

      c.fillStyle = "#6b9080";
      c.beginPath(); c.ellipse(70, 47, 7, 3.8, -0.4, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(36, 49, 6, 3.5, 0.4, 0, Math.PI * 2); c.fill();

      c.fillStyle = "#90be6d"; c.beginPath();
      c.moveTo(33, 62); c.lineTo(24, 63); c.lineTo(33, 66); c.closePath(); c.fill();
      c.stroke();

      const hg = c.createLinearGradient(74, 52, 94, 62);
      hg.addColorStop(0, "#90be6d"); hg.addColorStop(1, "#c7f9cc");
      c.fillStyle = hg;
      c.beginPath();
      c.moveTo(74, 54);
      c.bezierCurveTo(76, 44, 92, 44, 93, 56);
      c.bezierCurveTo(94, 66, 80, 68, 74, 62);
      c.closePath();
      c.fill();
      c.strokeStyle = "#40916c"; c.lineWidth = 1.4; c.stroke();

      c.fillStyle = "rgba(255, 100, 130, 0.4)"; c.beginPath(); c.ellipse(84, 60, 3.5, 2.2, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = "#2d6a4f"; c.lineWidth = 1.3; c.lineCap = "round";
      c.beginPath(); c.moveTo(92, 57); c.quadraticCurveTo(89, 61, 86, 59); c.stroke();

      drawCuteEye(c, 85, 50, 4.2);

      const mg = c.createRadialGradient(54, 52, 6, 54, 58, 26);
      mg.addColorStop(0, "#ffe066");
      mg.addColorStop(0.5, "#f4a261");
      mg.addColorStop(0.85, "#e76f51");
      mg.addColorStop(1, "#9c6644");
      c.fillStyle = mg;
      c.beginPath();
      c.ellipse(54, 58, 24, 18, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "#6b4a35"; c.lineWidth = 2; c.stroke();

      c.strokeStyle = "#ffd166"; c.lineWidth = 2.5; c.beginPath();
      c.ellipse(54, 58, 23, 17, 0, 0, Math.PI * 2); c.stroke();

      c.strokeStyle = "rgba(255, 255, 255, 0.65)"; c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(54, 46); c.lineTo(60, 50); c.lineTo(60, 58);
      c.lineTo(54, 62); c.lineTo(48, 58); c.lineTo(48, 50);
      c.closePath();
      c.stroke();
      [[54, 46, 54, 41], [60, 50, 68, 48], [60, 58, 68, 64], [54, 62, 54, 75], [48, 58, 38, 64], [48, 50, 38, 48]].forEach(([x1, y1, x2, y2]) => {
        c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
      });

      drawSparkleStar(c, 96, 32, 5);
      drawSparkleStar(c, 24, 34, 4);
    },

    // 9. Chiếc ủng cũ (boot)
    boot: (c) => {
      c.fillStyle = "rgba(0,0,0,0.08)"; c.beginPath(); c.ellipse(60, 96, 36, 6, 0, 0, Math.PI * 2); c.fill();
      const bg = c.createLinearGradient(40, 30, 85, 85);
      bg.addColorStop(0, "#7f5539");
      bg.addColorStop(0.5, "#9c6644");
      bg.addColorStop(1, "#582f0e");
      c.fillStyle = bg;
      c.beginPath();
      c.moveTo(42, 34);
      c.lineTo(66, 34);
      c.quadraticCurveTo(68, 56, 72, 64);
      c.bezierCurveTo(84, 68, 92, 70, 90, 82);
      c.lineTo(84, 85);
      c.lineTo(38, 85);
      c.lineTo(38, 76);
      c.lineTo(42, 34);
      c.closePath();
      c.fill();
      c.strokeStyle = "#381a08"; c.lineWidth = 2; c.stroke();

      c.fillStyle = "#381a08"; c.fillRect(36, 84, 52, 6);
      c.strokeStyle = "#241005"; c.lineWidth = 1.2;
      for (let sx = 42; sx <= 82; sx += 8) {
        c.beginPath(); c.moveTo(sx, 84); c.lineTo(sx, 90); c.stroke();
      }

      c.strokeStyle = "#ddb892"; c.lineWidth = 1; c.setLineDash([2, 2]);
      c.beginPath();
      c.moveTo(40, 81); c.lineTo(84, 81); c.quadraticCurveTo(86, 76, 74, 67);
      c.stroke();
      c.setLineDash([]);

      c.fillStyle = "#b08968"; c.beginPath(); c.rect(48, 44, 12, 10); c.fill();
      c.strokeStyle = "#462208"; c.lineWidth = 1; c.stroke();
      c.strokeStyle = "#fff"; c.lineWidth = 0.9;
      c.beginPath(); c.moveTo(50, 49); c.lineTo(54, 49); c.moveTo(52, 47); c.lineTo(52, 51); c.stroke();

      c.fillStyle = "#241005"; c.beginPath(); c.ellipse(82, 76, 4, 3, 0.3, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#52b788"; c.beginPath(); c.arc(83, 75, 2.8, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#111"; c.beginPath(); c.arc(84, 74, 0.8, 0, Math.PI * 2); c.fill();

      c.strokeStyle = "#74c69d"; c.lineWidth = 1.8; c.lineCap = "round";
      c.beginPath(); c.moveTo(40, 56); c.quadraticCurveTo(55, 62, 64, 52); c.stroke();
      c.fillStyle = "#52b788"; c.beginPath(); c.ellipse(56, 59, 3, 1.8, 0.4, 0, Math.PI * 2); c.fill();

      c.fillStyle = "#90e0ef";
      c.beginPath(); c.ellipse(39, 94, 1.8, 2.5, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(40, 100, 1.2, 0, Math.PI * 2); c.fill();

      drawCuteEye(c, 54, 40, 4);
      drawCuteEye(c, 62, 40, 4);
      c.strokeStyle = "#241005"; c.lineWidth = 1.2;
      c.beginPath(); c.arc(58, 46, 3, 0.3, Math.PI - 0.3); c.stroke();
    }
  };

  // Bộ nhớ đệm icon cá đã vẽ theo id + kích thước (cache kết quả per id+size)
  const _fishIconCache = new Map();

  // Hàm tạo icon minh họa chi tiết cho từng loại cá trên canvas offscreen, trả về Data URL
  function fishIcon(id, size) {
    if (!id || typeof id !== "string") return null;
    const cleanId = id.startsWith("fish_") ? id.slice(5) : id;
    if (!FISH_DRAWERS[cleanId]) return null;
    size = Math.round(size || 32);
    const key = cleanId + "_" + size;
    if (_fishIconCache.has(key)) return _fishIconCache.get(key);

    ensureFishStyles();
    if (typeof document === "undefined") return null;

    const cv = document.createElement("canvas");
    const dpr = 2; // Nhân đôi độ phân giải để ảnh siêu sắc nét
    cv.width = size * dpr;
    cv.height = size * dpr;
    const c = cv.getContext("2d");
    if (!c) return null;

    c.scale((size * dpr) / 120, (size * dpr) / 120);
    FISH_DRAWERS[cleanId](c);

    const url = cv.toDataURL();
    _fishIconCache.set(key, url);
    return url;
  }
  if (typeof window !== "undefined") window.fishIcon = fishIcon;

  // Vẽ chú cá nhảy vọt lên khỏi hồ nước kèm bọt sóng và giọt nước bắn tung tóe
  function drawJumpingFish(ctx, t, night) {
    const PJ = 5.2; // chu kỳ mỗi 5.2 giây
    const jCycle = Math.floor(t / PJ);
    const jTime = t % PJ;
    const jDur = 1.15; // thời gian nhảy 1.15 giây
    if (jTime >= jDur) return;

    const p = jTime / jDur; // tiến độ từ 0 đến 1
    const JUMP_SPOTS = [
      {x: 270, y: 220, dir: 1, type: "koi"},
      {x: 840, y: 195, dir: -1, type: "gold"},
      {x: 360, y: 175, dir: 1, type: "carp"},
      {x: 750, y: 235, dir: -1, type: "koi"},
      {x: 220, y: 255, dir: 1, type: "gold"},
      {x: 890, y: 180, dir: -1, type: "silver"}
    ];
    const spot = JUMP_SPOTS[jCycle % JUMP_SPOTS.length];
    const dist = 64 * spot.dir;
    const hMax = 42;
    const curX = spot.x - dist * 0.5 + dist * p;
    const curY = spot.y - Math.sin(p * Math.PI) * hMax;

    const vx = dist;
    const vy = -Math.cos(p * Math.PI) * hMax * Math.PI;
    const angle = Math.atan2(vy, Math.abs(vx)) * spot.dir;

    const shadowDist = spot.y - curY;
    if (shadowDist > 0) {
      ctx.fillStyle = night ? "rgba(5, 12, 28, 0.4)" : "rgba(10, 40, 70, 0.22)";
      ctx.beginPath();
      ctx.ellipse(curX, spot.y, Math.max(3, 11 - shadowDist * 0.12), Math.max(1.5, 3.5 - shadowDist * 0.04), 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (p < 0.35) {
      const sp = p / 0.35;
      const spX = spot.x - dist * 0.5, spY = spot.y;
      const spFade = 1 - sp;
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.7 * spFade})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(spX, spY, 3 + sp * 14, 1.2 + sp * 5, 0, 0, Math.PI * 2); ctx.stroke();

      ctx.fillStyle = `rgba(240, 250, 255, ${0.8 * spFade})`;
      ctx.beginPath();
      ctx.moveTo(spX - 7, spY);
      ctx.quadraticCurveTo(spX - 3, spY - 14 * spFade, spX, spY - 2 * spFade);
      ctx.quadraticCurveTo(spX + 3, spY - 14 * spFade, spX + 7, spY);
      ctx.fill();

      [[-6, -16], [-2, -22], [3, -19], [6, -14], [0, -24]].forEach(([dx, dy]) => {
        const dropX = spX + dx * sp;
        const dropY = spY + dy * sp + sp * sp * 20;
        ctx.fillStyle = `rgba(255, 255, 255, ${0.85 * spFade})`;
        ctx.beginPath(); ctx.arc(dropX, dropY, 1.2, 0, Math.PI * 2); ctx.fill();
      });
    }

    if (p > 0.65) {
      const rp = (p - 0.65) / 0.35;
      const epX = spot.x + dist * 0.5, epY = spot.y;
      const reFade = Math.sin(rp * Math.PI);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.75 * (1 - rp)})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(epX, epY, 4 + rp * 16, 1.5 + rp * 6, 0, 0, Math.PI * 2); ctx.stroke();

      ctx.fillStyle = `rgba(240, 250, 255, ${0.85 * reFade})`;
      ctx.beginPath();
      ctx.moveTo(epX - 8, epY);
      ctx.quadraticCurveTo(epX - 4, epY - 16 * reFade, epX, epY - 3 * reFade);
      ctx.quadraticCurveTo(epX + 4, epY - 16 * reFade, epX + 8, epY);
      ctx.fill();

      [[-7, -18], [-3, -24], [2, -21], [7, -16], [0, -26]].forEach(([dx, dy]) => {
        const dropX = epX + dx * rp;
        const dropY = epY + dy * rp + rp * rp * 22;
        ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * (1 - rp)})`;
        ctx.beginPath(); ctx.arc(dropX, dropY, 1.3, 0, Math.PI * 2); ctx.fill();
      });
    }

    ctx.save();
    ctx.translate(curX, curY);
    ctx.scale(spot.dir, 1);
    ctx.rotate(angle);
    ctx.globalAlpha = 1.0;

    const bend = Math.sin(p * Math.PI) * 2;
    const isKoi = spot.type === "koi";
    const isGold = spot.type === "gold";

    ctx.fillStyle = isKoi ? "#ff6b6b" : (isGold ? "#ffb703" : "#ced4da");
    ctx.beginPath();
    ctx.moveTo(-10, -bend);
    ctx.quadraticCurveTo(-15, -6 - bend * 1.5, -18, -7 - bend * 2);
    ctx.lineTo(-14, -bend);
    ctx.lineTo(-18, 7 - bend * 0.5);
    ctx.quadraticCurveTo(-15, 6, -10, -bend);
    ctx.fill();

    ctx.fillStyle = isKoi ? "#e63946" : (isGold ? "#fb8500" : "#6c757d");
    ctx.beginPath();
    ctx.moveTo(2, -4.5 - bend);
    ctx.quadraticCurveTo(-2, -9 - bend * 1.2, -6, -4 - bend);
    ctx.fill();

    const fg = ctx.createLinearGradient(0, -6, 0, 6);
    if (isKoi) { fg.addColorStop(0, "#ffffff"); fg.addColorStop(1, "#f1faee"); }
    else if (isGold) { fg.addColorStop(0, "#ffd166"); fg.addColorStop(1, "#fb8500"); }
    else { fg.addColorStop(0, "#e9ecef"); fg.addColorStop(1, "#6c757d"); }
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(11, 0);
    ctx.quadraticCurveTo(5, -5.5 - bend, -3, -5 - bend);
    ctx.quadraticCurveTo(-8, -2.5 - bend, -10, -bend);
    ctx.quadraticCurveTo(-8, 2.5 - bend, -3, 5 - bend);
    ctx.quadraticCurveTo(5, 5.5 - bend, 11, 0);
    ctx.closePath();
    ctx.fill();

    if (isKoi) {
      ctx.fillStyle = "#e63946";
      ctx.beginPath(); ctx.ellipse(6, -bend, 2.6, 1.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-1, -1 - bend, 3.2, 2.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#222";
      ctx.beginPath(); ctx.ellipse(-4, 1 - bend, 1.2, 0.9, 0, 0, Math.PI * 2); ctx.fill();
    }

    ctx.fillStyle = isKoi ? "rgba(255,255,255,0.85)" : "rgba(255,183,3,0.85)";
    ctx.beginPath(); ctx.ellipse(3, 2 - bend, 4.5, 2.2, 0.4, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(7.5, -1.5 - bend, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(7.8, -1.5 - bend, 1.0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(7.5, -1.9 - bend, 0.5, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.beginPath(); ctx.arc(1, -1.5 - bend, 1.2, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }

  // Vẽ cá bơi dưới hồ nước: uốn lượn hình sin, vảy lấp lánh, vây ve vẩy, các loài cá đa dạng
  function drawFishInPond(ctx, f, i, rep, fx, fy, dir, t, night) {
    let sp = (i + rep * 3) % 4; // 0: koi, 1: gold, 2: carp, 3: silver
    if (f.id === "koi") sp = 0;
    else if (f.id === "gold") sp = 1;
    else if (f.id === "carp") sp = 2;
    else if (f.id === "perch") sp = 2;

    const isKoi = sp === 0;
    const isGold = sp === 1;
    const isCarp = sp === 2;
    const isSilver = sp === 3;

    const bh = isGold ? 5.2 : (isSilver ? 3.4 : 4.4);
    const swimSpeed = isSilver ? 11 : 8.5;
    const swimPhase = t * swimSpeed + i * 1.8 + rep * 2.4;

    const spineDy = (x) => Math.sin(swimPhase - x * 0.16) * Math.max(0, (12 - x) / 24) * 3.3;

    ctx.save();
    ctx.translate(fx, fy);
    ctx.scale(dir, 1);
    ctx.globalAlpha = night ? 0.6 : 0.72;

    let finColor = "rgba(255,255,255,0.7)";
    if (isGold) finColor = "rgba(255, 183, 3, 0.75)";
    else if (isCarp) finColor = "rgba(108, 117, 125, 0.65)";
    else if (isSilver) finColor = "rgba(202, 240, 248, 0.75)";

    // Vây lưng
    ctx.fillStyle = finColor;
    ctx.beginPath();
    ctx.moveTo(1, -bh * 0.7 + spineDy(1));
    ctx.quadraticCurveTo(-2, -bh * 1.5 + spineDy(-2), -6, -bh * 0.6 + spineDy(-6));
    ctx.lineTo(-6, -bh * 0.2 + spineDy(-6));
    ctx.closePath();
    ctx.fill();

    // Vây ngực xa
    const finFlap = Math.sin(t * 12 + i) * 0.32;
    ctx.save();
    ctx.translate(3, -bh * 0.4 + spineDy(3));
    ctx.rotate(-0.35 - finFlap);
    ctx.beginPath(); ctx.ellipse(3, 0, 4, 1.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Vây đuôi
    const tBaseY = spineDy(-10);
    const tTip1 = -bh * 1.25 + spineDy(-17);
    const tTip2 = bh * 1.25 + spineDy(-17);
    const tNotch = spineDy(-13);
    ctx.fillStyle = finColor;
    ctx.beginPath();
    ctx.moveTo(-10, tBaseY);
    ctx.quadraticCurveTo(-14, tTip1 * 0.75, -17, tTip1);
    ctx.quadraticCurveTo(-14, tNotch, -12, tNotch);
    ctx.quadraticCurveTo(-14, tNotch, -17, tTip2);
    ctx.quadraticCurveTo(-14, tTip2 * 0.75, -10, tBaseY);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(-10, tBaseY); ctx.lineTo(-16, tTip1 * 0.85);
    ctx.moveTo(-10, tBaseY); ctx.lineTo(-16, tTip2 * 0.85);
    ctx.stroke();

    // Thân cá uốn lượn
    const bg = ctx.createLinearGradient(0, -bh, 0, bh);
    if (isKoi) {
      bg.addColorStop(0, "#f8f9fa"); bg.addColorStop(0.5, "#e9ecef"); bg.addColorStop(1, "#ffffff");
    } else if (isGold) {
      bg.addColorStop(0, "#fb8500"); bg.addColorStop(0.5, "#ffb703"); bg.addColorStop(1, "#fff3b0");
    } else if (isCarp) {
      bg.addColorStop(0, "#495057"); bg.addColorStop(0.5, "#6c757d"); bg.addColorStop(1, "#ced4da");
    } else {
      bg.addColorStop(0, "#90e0ef"); bg.addColorStop(0.5, "#caf0f8"); bg.addColorStop(1, "#ffffff");
    }
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(11, spineDy(11));
    ctx.quadraticCurveTo(5, -bh + spineDy(5), -2, -bh * 0.95 + spineDy(-2));
    ctx.quadraticCurveTo(-7, -bh * 0.5 + spineDy(-7), -10, -0.9 + spineDy(-10));
    ctx.lineTo(-10, 0.9 + spineDy(-10));
    ctx.quadraticCurveTo(-7, bh * 0.5 + spineDy(-7), -2, bh + spineDy(-2));
    ctx.quadraticCurveTo(5, bh * 0.9 + spineDy(5), 11, spineDy(11));
    ctx.closePath();
    ctx.fill();

    // Hoa văn loài cá
    if (isKoi) {
      ctx.fillStyle = "#ff4500";
      ctx.beginPath(); ctx.ellipse(6, -0.4 + spineDy(6), 2.8, 1.8, 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, -0.8 + spineDy(0), 3.4, 2.2, -0.1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-6, -0.3 + spineDy(-6), 2.5, 1.6, 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#1e1e24";
      ctx.beginPath(); ctx.ellipse(-2, 1.1 + spineDy(-2), 1.3, 0.9, 0, 0, Math.PI * 2); ctx.fill();
    } else if (isCarp) {
      ctx.strokeStyle = "rgba(40, 50, 40, 0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(3, -bh * 0.65 + spineDy(3)); ctx.lineTo(3, bh * 0.5 + spineDy(3));
      ctx.moveTo(-1, -bh * 0.65 + spineDy(-1)); ctx.lineTo(-1, bh * 0.5 + spineDy(-1));
      ctx.moveTo(-5, -bh * 0.55 + spineDy(-5)); ctx.lineTo(-5, bh * 0.4 + spineDy(-5));
      ctx.stroke();
    }

    // Vảy cá lấp lánh phản quang (Scale shimmer)
    const shimmer = Math.sin(t * 6 + i * 2.3 + rep * 1.7);
    if (shimmer > 0.15) {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.7 * shimmer})`;
      ctx.beginPath(); ctx.arc(1.5, -0.5 + spineDy(1.5), 1.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-2.5, 0.7 + spineDy(-2.5), 1.0, 0, Math.PI * 2); ctx.fill();
    }

    // Vây ngực gần
    ctx.save();
    ctx.translate(4, bh * 0.35 + spineDy(4));
    ctx.rotate(0.35 + finFlap);
    ctx.fillStyle = finColor;
    ctx.beginPath(); ctx.ellipse(3, 0, 4.6, 2.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Mắt cá
    ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(7.6, -1.3 + spineDy(7.6), 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#111118"; ctx.beginPath(); ctx.arc(7.9, -1.3 + spineDy(7.6), 1.0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(7.6, -1.7 + spineDy(7.6), 0.5, 0, Math.PI * 2); ctx.fill();

    // Lớp phủ xanh ngọc mặt nước tạo cảm giác chìm dưới nước
    ctx.fillStyle = night ? "rgba(10, 25, 60, 0.18)" : "rgba(40, 140, 200, 0.14)";
    ctx.beginPath();
    ctx.ellipse(0, spineDy(0), 12, bh, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
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
    // cá bơi dưới nước (vẽ chi tiết theo góc nhìn nghiêng/trên, thân uốn lượn hình sin, vảy lấp lánh)
    for (let rep = 0; rep < 2; rep++) SWIM.forEach((f, i) => {
      const dir = (i + rep) % 2 ? 1 : -1, span = W + 40;
      const fx = (((t * (10 + i * 2) * dir + i * 90 + rep * 500) % span) + span) % span - 20;
      const fy = 140 + i * 24 + Math.sin(t + i + rep) * 6;

      // Gợn sóng nước mềm mại thỉnh thoảng xuất hiện phía trên cá bơi
      const ripP = (t * 0.75 + i * 1.3 + rep * 2.1) % 3.5;
      if (ripP < 1.4) {
        const rp = ripP / 1.4;
        ctx.save();
        ctx.strokeStyle = `rgba(220, 245, 255, ${0.28 * (1 - rp)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(fx, fy - 2, 4 + rp * 16, 1.5 + rp * 5, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Vẽ thân cá bơi cử động sinh động
      drawFishInPond(ctx, f, i, rep, fx, fy, dir, t, night);
    });

    // Thỉnh thoảng (mỗi vài giây) có một chú cá nhảy vọt lên khỏi mặt nước kèm bọt nước và giọt bắn
    drawJumpingFish(ctx, t, night);
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
    const rareFishName = lastRareFish || (fishState && fishState.lastRare);
    if (rareFishName) {
      ctx.fillStyle = "#e63946"; rr(ctx, 988, 412, 84, 26, 3); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "700 7px system-ui"; ctx.fillText("⭐ " + rareFishName, 1030, 425);
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
    updateFishingHUD(t);
  }
  let lastRareFish = "";
  let fishingHudEl = null;
  let spaceListenerBound = false;

  // Khởi tạo giao diện HUD câu cá (nút tròn to + thanh tiến trình kéo cá)
  function ensureFishingHUD() {
    if (fishingHudEl && fishingHudEl.isConnected) return fishingHudEl;
    if (!document.getElementById("fishingStyles")) {
      const st = document.createElement("style");
      st.id = "fishingStyles";
      st.textContent = `
        .fish-hud-box {
          position: fixed;
          right: calc(20px + var(--sr, 0px));
          bottom: calc(20px + var(--sb, 0px));
          z-index: 15;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          pointer-events: none;
          user-select: none;
          -webkit-user-select: none;
        }
        body.touch .fish-hud-box {
          bottom: calc(96px + var(--sb, 0px));
          right: calc(18px + var(--sr, 0px));
        }
        body.lefty .fish-hud-box {
          right: auto;
          left: calc(18px + var(--sl, 0px));
        }
        .fish-hud-box * {
          pointer-events: auto;
        }
        .fish-reel-card {
          background: rgba(20, 17, 45, 0.92);
          border: 1.5px solid rgba(255, 210, 122, 0.7);
          border-radius: 16px;
          padding: 10px 14px;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          min-width: 175px;
          max-width: 220px;
          animation: fishCardPop 0.2s ease-out;
        }
        .fish-reel-card.hidden {
          display: none !important;
        }
        @keyframes fishCardPop {
          from { transform: scale(0.85); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .fish-weight-hint {
          font-size: 13px;
          font-weight: 800;
          color: var(--accent, #ffd166);
          text-shadow: 0 1px 3px rgba(0,0,0,0.5);
        }
        .fish-prog-track {
          width: 100%;
          height: 12px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 6px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .fish-prog-fill {
          height: 100%;
          width: 0%;
          background: linear-gradient(90deg, #38b000, #70e000, #ffff3f);
          border-radius: 5px;
          transition: width 0.08s ease-out;
          box-shadow: 0 0 8px rgba(112, 224, 0, 0.7);
        }
        .fish-prog-label {
          font-size: 11px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.95);
        }
        .fish-action-btn {
          width: 74px;
          height: 74px;
          border-radius: 50%;
          background: rgba(255, 210, 122, 0.28);
          border: 2px solid rgba(255, 210, 122, 0.65);
          font-size: 22px;
          font-weight: 800;
          color: var(--accent, #ffd166);
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          touch-action: manipulation;
          transition: transform 0.08s, background 0.15s, border-color 0.15s;
          outline: none;
        }
        .fish-action-btn:active {
          transform: scale(0.92);
        }
        .fish-action-btn.bite {
          background: radial-gradient(circle, #ff4d6d, #d90429);
          border-color: #ffccd5;
          color: #fff;
          box-shadow: 0 0 24px rgba(255, 77, 109, 0.9), 0 6px 18px rgba(0, 0, 0, 0.45);
          animation: fishBitePulse 0.35s infinite alternate;
        }
        @keyframes fishBitePulse {
          from { transform: scale(1); box-shadow: 0 0 16px rgba(255, 77, 109, 0.7); }
          to { transform: scale(1.12); box-shadow: 0 0 28px rgba(255, 77, 109, 1); }
        }
        .fish-action-btn.fight {
          width: 84px;
          height: 84px;
          background: radial-gradient(circle, #ff9e00, #e85d04);
          border-color: #ffe6a7;
          color: #fff;
          box-shadow: 0 0 22px rgba(255, 158, 0, 0.8), 0 6px 18px rgba(0,0,0,0.4);
          animation: fishFightPulse 0.25s infinite alternate;
        }
        @keyframes fishFightPulse {
          from { transform: scale(1); }
          to { transform: scale(1.08); }
        }
        .fish-btn-icon {
          font-size: 22px;
          line-height: 1;
        }
        .fish-btn-txt {
          font-size: 11px;
          font-weight: 800;
          line-height: 1.1;
          margin-top: 2px;
        }
        .fish-btn-hint {
          font-size: 9px;
          opacity: 0.75;
          font-weight: 600;
        }
      `;
      document.head.appendChild(st);
    }

    const el = document.createElement("div");
    el.id = "fishingHUD";
    el.className = "fish-hud-box hidden";
    el.innerHTML = `
      <div id="fishReelCard" class="fish-reel-card hidden">
        <div class="fish-weight-hint" id="fishWeightHint">🐟 Cá nặng ~0 kg</div>
        <div class="fish-prog-track">
          <div class="fish-prog-fill" id="fishProgFill" style="width:0%"></div>
        </div>
        <div class="fish-prog-label" id="fishProgLabel">Cá đã kéo lên: 0%</div>
      </div>
      <button id="fishActionBtn" class="fish-action-btn" aria-label="Câu cá">
        <span class="fish-btn-icon" id="fishBtnIcon">🎣</span>
        <span class="fish-btn-txt" id="fishBtnTxt">Quăng cần</span>
        <small class="fish-btn-hint" id="fishBtnHint">(Space)</small>
      </button>
    `;
    document.body.appendChild(el);
    fishingHudEl = el;

    const btn = el.querySelector("#fishActionBtn");
    btn.addEventListener("pointerdown", e => {
      e.preventDefault();
      e.stopPropagation();
      handleFishingAction();
    });
    btn.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
    });
    return el;
  }

  // Cập nhật trạng thái nút và bảng kéo cá
  let currentHUDState = "";
  function setHUDState(state, data) {
    if (currentHUDState === state && state !== "fight") return;
    currentHUDState = state;
    const hud = ensureFishingHUD();
    const btn = hud.querySelector("#fishActionBtn");
    const icon = hud.querySelector("#fishBtnIcon");
    const txt = hud.querySelector("#fishBtnTxt");
    const hint = hud.querySelector("#fishBtnHint");
    const rc = hud.querySelector("#fishReelCard");

    btn.className = "fish-action-btn";
    if (state === "idle") {
      icon.textContent = "🎣";
      txt.textContent = "Quăng cần";
      hint.textContent = "(Space)";
      rc.classList.add("hidden");
    } else if (state === "cast") {
      icon.textContent = "🎣";
      txt.textContent = "Đang quăng";
      hint.textContent = "…";
      rc.classList.add("hidden");
    } else if (state === "wait") {
      icon.textContent = "🎣";
      txt.textContent = "Chờ cá…";
      hint.textContent = "(Chờ ❗)";
      rc.classList.add("hidden");
    } else if (state === "bite") {
      btn.classList.add("bite");
      icon.textContent = "❗";
      txt.textContent = "GIẬT!";
      hint.textContent = "(Bấm ngay!)";
      rc.classList.add("hidden");
    } else if (state === "busy") {
      icon.textContent = "⏳";
      txt.textContent = "Chờ xíu";
      hint.textContent = "…";
      rc.classList.add("hidden");
    } else if (state === "fight") {
      btn.classList.add("fight");
      icon.textContent = "⚡";
      txt.textContent = "BẤM LIÊN TỤC!";
      hint.textContent = "(Space/Chạm)";
      rc.classList.remove("hidden");
      if (data && data.kg != null) {
        hud.querySelector("#fishWeightHint").textContent = `🐟 Cá nặng ~${data.kg} kg`;
      }
      setReelProgress(0);
    }
  }

  // Cập nhật phần trăm thanh tiến trình kéo cá
  function setReelProgress(pct) {
    if (!fishingHudEl) return;
    const fill = fishingHudEl.querySelector("#fishProgFill");
    const lbl = fishingHudEl.querySelector("#fishProgLabel");
    if (fill) fill.style.width = pct + "%";
    if (lbl) lbl.textContent = `Cá đã kéo lên: ${pct}%`;
  }

  // Lắng nghe phím Space trên máy tính
  function bindSpaceListener() {
    if (spaceListenerBound) return;
    spaceListenerBound = true;
    window.addEventListener("keydown", e => {
      if (myArea !== "fishing") return;
      if (e.code === "Space" || e.key === " ") {
        if (/INPUT|TEXTAREA/.test((e.target || {}).tagName || "")) return;
        const m = me();
        if (m && m.bed != null && m.lying) {
          e.preventDefault();
          handleFishingAction();
        }
      }
    });
  }

  // Xử lý hành động bấm nút / Space tùy theo trạng thái câu hiện tại
  function handleFishingAction() {
    if (!fishState || fishState.phase === "idle") {
      checkAndCast();
    } else if (fishState.phase === "cast") {
      // Đang quăng dây ra hồ, chờ phao chạm nước
    } else if (fishState.phase === "wait" || fishState.phase === "bite") {
      handlePull();
    } else if (fishState.phase === "fight") {
      handleReelTap();
    }
  }

  // Kiểm tra mồi và quăng cần (mở chọn mồi nếu có nhiều hơn 1 loại)
  function checkAndCast() {
    const m = me();
    if (!m || m.bed == null || !m.lying) {
      toast("🎣 Chạm vào một ghế đẩu bên bờ hồ để ngồi câu trước nhé");
      return;
    }
    const st = S();
    const baits = BAITS.filter(b => (st.bait[b.id] || 0) > 0);
    if (!baits.length) {
      toast("🐛 Hết mồi rồi! Mua mồi ở quầy của cô Lan");
      openBait();
      return;
    }
    if (baits.length === 1) {
      castLine(baits[0]);
    } else {
      openSheet("🎣 Chọn mồi câu",
        `<div class="vol" style="margin:0 0 10px">Chọn loại mồi để câu cá:</div>
         <div class="grid">${baits.map(b => `<button class="opt" data-b="${b.id}">${b.e} ${b.name}<small>còn ${st.bait[b.id]} · ${b.rare > 1 ? "dễ ra cá hiếm" : "mồi thường"}</small></button>`).join("")}</div>`,
        el => el.querySelectorAll("[data-b]").forEach(btn => btn.onclick = () => {
          closeSheet();
          castLine(BAITS.find(b => b.id === btn.dataset.b));
        }));
    }
  }

  // Gửi lệnh thả câu lên server
  async function castLine(bait) {
    const m = me();
    if (!m || m.bed == null || !m.lying) return;
    const cast = await Life.eco("cast", {bait: bait.id});
    if (!cast) return;

    const seat = m.bed;
    const now = performance.now() / 1000;
    fishState = {
      seat,
      phase: "cast",
      castStart: now,
      castDur: 0.6,
      biteTime: now + cast.wait,
      bait: bait.id,
      wait: cast.wait,
      finishing: false,
    };
    setHUDState("cast");
  }

  // Giật cần câu khi cá cắn hoặc giật sớm
  async function handlePull() {
    if (!fishState || (fishState.phase !== "bite" && fishState.phase !== "wait")) return;
    fishState.phase = "pulling";
    setHUDState("busy");

    const r = await Life.eco("pull");
    if (!r || r.r === "early") {
      fishState = null;
      showEarly();
      return;
    }
    if (r.r === "late") {
      fishState = null;
      showLate();
      return;
    }
    if (r.r === "hook") {
      startReelMiniGame(r);
    }
  }

  // Khởi động màn chơi kéo cá mini-game
  function startReelMiniGame(r) {
    const m = me();
    fishState = {
      seat: m ? m.bed : 0,
      phase: "fight",
      fight: r.fight,
      targetTaps: r.taps,
      power: r.power,
      kg: r.kg,
      taps: 0,
      fightStart: performance.now() / 1000,
      finishing: false,
    };
    setHUDState("fight", r);
  }

  // Xử lý mỗi lần người chơi bấm nút / Space khi kéo cá
  function handleReelTap() {
    if (!fishState || fishState.phase !== "fight" || fishState.finishing) return;
    fishState.taps++;
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try { navigator.vibrate(20); } catch (_) {}
    }
    Sound.ensure();
    if (Sound.ctx) {
      Sound.tone(Sound.master, 420 + (fishState.taps % 10) * 35, Sound.ctx.currentTime, 0.035, "triangle", 0.08, 0.005);
    }
    const elapsed = (performance.now() / 1000) - fishState.fightStart;
    let pct = Math.floor((fishState.taps / fishState.targetTaps) * 100);
    if (fishState.taps >= fishState.targetTaps && elapsed < fishState.fight * 0.6) {
      pct = 99; // Giữ ở 99% cho đến khi qua 60% thời gian kéo
    }
    pct = Math.min(100, Math.max(0, pct));
    setReelProgress(pct);

    if (fishState.taps >= fishState.targetTaps && elapsed >= fishState.fight * 0.6) {
      finishFight();
    }
  }

  // Kết thúc màn kéo cá: gọi server kiểm tra kết quả và hiển thị
  async function finishFight() {
    if (!fishState || fishState.finishing) return;
    fishState.finishing = true;
    const taps = fishState.taps;
    const c = document.getElementById("c");
    if (c) c.style.transform = "";
    setHUDState("idle");

    const rr = await Life.eco("reel", {taps});
    fishState = null;
    if (!rr || rr.r === "lost") {
      showLost();
    } else if (rr.r === "ok") {
      showWon(rr);
    }
  }

  function showEarly() {
    setHUDState("idle");
    openSheet("🎣 Câu cá",
      `<div class="wheelBig">💨</div>
       <div class="pomoSub" style="font-size:15px;font-weight:700">Giật sớm quá, cá chạy mất rồi 😅</div>
       <div class="vol" style="margin-top:6px">Chờ phao chìm và hiện ❗ rồi hãy giật nhé!</div>
       <div class="grid" style="margin-top:14px">
         <button class="opt" id="again" style="text-align:center">🎣 Quăng tiếp</button>
         <button class="opt" id="stop" style="text-align:center">✓ Nghỉ</button>
       </div>`,
      el => {
        el.querySelector("#again").onclick = () => { closeSheet(); checkAndCast(); };
        el.querySelector("#stop").onclick = closeSheet;
      });
  }

  function showLate() {
    setHUDState("idle");
    openSheet("🎣 Câu cá",
      `<div class="wheelBig">🌊</div>
       <div class="pomoSub" style="font-size:15px;font-weight:700">Chậm quá, cá ăn mồi rồi bơi mất…</div>
       <div class="vol" style="margin-top:6px">Khi thấy ❗ và nút GIẬT sáng lên, hãy bấm ngay nhé!</div>
       <div class="grid" style="margin-top:14px">
         <button class="opt" id="again" style="text-align:center">🎣 Quăng tiếp</button>
         <button class="opt" id="stop" style="text-align:center">✓ Nghỉ</button>
       </div>`,
      el => {
        el.querySelector("#again").onclick = () => { closeSheet(); checkAndCast(); };
        el.querySelector("#stop").onclick = closeSheet;
      });
  }

  function showLost() {
    openSheet("🎣 Câu cá",
      `<div class="wheelBig">💨</div>
       <div class="pomoSub" style="font-size:15px;font-weight:700;color:#ff6b6b">Cá giãy thoát mất rồi…!</div>
       <div class="vol" style="margin-top:6px">Lần sau hãy bấm liên tục thật nhanh tay nhé!</div>
       <div class="grid" style="margin-top:14px">
         <button class="opt" id="again" style="text-align:center">🎣 Quăng tiếp</button>
         <button class="opt" id="stop" style="text-align:center">✓ Nghỉ</button>
       </div>`,
      el => {
        el.querySelector("#again").onclick = () => { closeSheet(); checkAndCast(); };
        el.querySelector("#stop").onclick = closeSheet;
      });
  }

  function showWon(rr) {
    const fish = FISH[rr.fish];
    Life.apply({fun: 6, xp: fish.rare ? 8 : 3});
    Life.commit();
    if (fish.rare) {
      send({t: "emote", e: "😂"});
      lastRareFish = fish.name;
    }
    const fIcon = fishIcon(fish.id, 120);
    const fishVisual = fIcon
      ? (fish.rare
          ? `<div style="position:relative;display:inline-block;line-height:0">
               <img src="${fIcon}" width="120" height="120" style="display:block;margin:0 auto;animation:fishBounce 1.8s ease-in-out infinite;filter:drop-shadow(0 8px 18px rgba(255,200,50,0.4))" alt="${esc(fish.name)}"/>
               <span style="position:absolute;top:-6px;right:-8px;font-size:22px;animation:fishSparkle 1.2s ease-in-out infinite alternate">✨</span>
               <span style="position:absolute;bottom:-2px;left:-8px;font-size:18px;animation:fishSparkle 1.4s ease-in-out infinite alternate 0.5s">⭐</span>
               <span style="position:absolute;top:10px;left:-6px;font-size:14px;animation:fishSparkle 1.1s ease-in-out infinite alternate 0.8s">✨</span>
             </div>`
          : `<img src="${fIcon}" width="120" height="120" style="display:inline-block;animation:fishBounce 1.8s ease-in-out infinite;filter:drop-shadow(0 6px 14px rgba(0,0,0,0.18))" alt="${esc(fish.name)}"/>`
        )
      : fish.e;

    openSheet("🎣 Câu cá",
      `<div class="wheelBig" style="line-height:1;min-height:120px;display:flex;align-items:center;justify-content:center">${fishVisual}</div>
       <div class="pomoSub">Câu được <b style="color:var(--accent)">${fish.name}</b> · <b>${rr.kg} kg</b>${fish.rare ? " ✨ hiếm!" : ""} · bán được ${fish.price} 💰</div>
       <div class="grid" style="margin-top:14px">
         <button class="opt" id="again" style="text-align:center">🎣 Quăng tiếp</button>
         <button class="opt" id="stop" style="text-align:center">✓ Nghỉ</button>
       </div>`,
      el => {
        el.querySelector("#again").onclick = () => { closeSheet(); checkAndCast(); };
        el.querySelector("#stop").onclick = closeSheet;
      });
  }

  // Cập nhật trạng thái câu và HUD mỗi frame
  function updateFishingHUD(t) {
    const m = me();
    const isSeated = m && myArea === "fishing" && m.bed != null && m.lying;
    if (!isSeated) {
      cleanupFishing();
      return;
    }
    const hud = ensureFishingHUD();
    hud.classList.remove("hidden");
    bindSpaceListener();

    if (!fishState) {
      setHUDState("idle");
      return;
    }

    const now = performance.now() / 1000;
    if (fishState.phase === "cast") {
      setHUDState("cast");
      if (now - fishState.castStart >= (fishState.castDur || 0.6)) {
        fishState.phase = "wait";
        setHUDState("wait");
      }
    } else if (fishState.phase === "wait") {
      setHUDState("wait");
      if (now >= fishState.biteTime) {
        fishState.phase = "bite";
        fishState.biteAt = now;
        Sound.ensure();
        if (Sound.ctx) Sound.tone(Sound.master, 880, Sound.ctx.currentTime, .15, "square", .06);
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          try { navigator.vibrate([40, 30, 40]); } catch (_) {}
        }
        setHUDState("bite");
      }
    } else if (fishState.phase === "bite") {
      setHUDState("bite");
      if (now - fishState.biteAt > 1.8 && !fishState.finishing) {
        handlePull();
      }
    } else if (fishState.phase === "fight") {
      const pwr = fishState.power || 1;
      const mult = pwr >= 4 ? 2.5 : 1.6;
      const shakeX = (Math.random() * 2 - 1) * pwr * mult;
      const shakeY = (Math.random() * 2 - 1) * pwr * mult;
      const c = document.getElementById("c");
      if (c) c.style.transform = `translate(${shakeX.toFixed(1)}px, ${shakeY.toFixed(1)}px)`;

      const elapsed = now - fishState.fightStart;
      if (fishState.taps >= fishState.targetTaps && elapsed >= fishState.fight * 0.6) {
        finishFight();
      } else if (elapsed >= fishState.fight + 6.0) {
        finishFight();
      } else {
        let pct = Math.floor((fishState.taps / fishState.targetTaps) * 100);
        if (fishState.taps >= fishState.targetTaps && elapsed < fishState.fight * 0.6) {
          pct = 99;
        }
        pct = Math.min(100, Math.max(0, pct));
        setReelProgress(pct);
      }
    }
  }

  // Dọn dẹp trạng thái khi người chơi rời ghế hoặc đổi khu
  function cleanupFishing() {
    fishState = null;
    const c = document.getElementById("c");
    if (c) c.style.transform = "";
    if (fishingHudEl) {
      fishingHudEl.classList.add("hidden");
      const rc = fishingHudEl.querySelector("#fishReelCard");
      if (rc) rc.classList.add("hidden");
    }
  }

  function openFishing() {
    checkAndCast();
  }

  function fishSeat(i, t) {
    const b = BEDS[i], o = bedOwner(i), sit = o && o.lying, sx = b.x + 35, sy = b.y + 44;
    ctx.fillStyle = "#8d6346"; rr(ctx, sx - 10, sy - 6, 20, 6, 2); ctx.fill(); ctx.fillRect(sx - 8, sy, 3, 8); ctx.fillRect(sx + 5, sy, 3, 8);
    if (!sit) { ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.font = "11px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("🎣", sx, sy - 16); return; }

    const mine = o.id === myId && fishState && fishState.seat === i;
    const phase = mine ? fishState.phase : "idle";
    const bite = phase === "bite";
    const fight = phase === "fight";
    const casting = phase === "cast";
    const pwr = (mine && fishState.power) || 1;

    const targetBx = sx + 16, targetBy = b.y - 30;
    let tipX = sx + 22, tipY = sy - 66;
    let bx = targetBx, by = targetBy;
    let showFloat = false;

    if (casting) {
      showFloat = true;
      const cp = Math.min(1, Math.max(0, (performance.now() / 1000 - fishState.castStart) / (fishState.castDur || 0.6)));
      const arcY = -Math.sin(cp * Math.PI) * 45;
      bx = (sx + 22) + (targetBx - (sx + 22)) * cp;
      by = (sy - 66) + (targetBy - (sy - 66)) * cp + arcY;
      tipX = sx + 22 + Math.sin(cp * Math.PI) * 5;
      tipY = sy - 66 + Math.sin(cp * Math.PI) * 3;
    } else if (phase === "wait") {
      showFloat = true;
      bx = targetBx;
      by = targetBy + Math.sin(t * 2.5 + i) * 1.5;
      // Vòng gợn nước nhẹ quanh phao
      ctx.strokeStyle = "rgba(255,255,255,.4)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(bx, by + 3, 5 + Math.sin(t * 2.2) * 1.5, 1.8, 0, 0, 7); ctx.stroke();
    } else if (bite) {
      showFloat = true;
      bx = targetBx;
      by = targetBy + 4.5 + Math.sin(t * 32) * 2.2;
      tipY += Math.sin(t * 32) * 2;
      // Vòng gợn nước dồn dập
      ctx.strokeStyle = "rgba(255,255,255,.65)"; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(bx, by + 3, 7 + Math.sin(t * 14) * 2.5, 2.2, 0, 0, 7); ctx.stroke();
    } else if (fight) {
      showFloat = true;
      const rShakeX = Math.sin(t * (30 + pwr * 8)) * (pwr * 1.5);
      const rShakeY = pwr * 2.5 + Math.cos(t * (35 + pwr * 8)) * (pwr * 1.5);
      tipX += rShakeX;
      tipY += rShakeY;

      const fShakeX = Math.sin(t * (40 + pwr * 10)) * (pwr * 2.0);
      const fShakeY = Math.cos(t * (45 + pwr * 10)) * (pwr * 1.8);
      bx = targetBx + fShakeX;
      by = targetBy + 4 + fShakeY;

      // Hiệu ứng sóng nước té nước quanh phao
      for (let r = 0; r < 3; r++) {
        const rad = ((t * 8 + r * 3) % 12) + 4;
        const alpha = Math.max(0, 1 - rad / 16) * 0.7;
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.ellipse(bx, by + 3, rad, rad * 0.35, 0, 0, 7); ctx.stroke();
      }
      // Giọt nước bắn lên
      for (let s = 0; s < 4 + pwr; s++) {
        const spP = (t * (4 + s) + s * 1.7) % 1;
        const spX = bx + (Math.sin(s * 99) * 14 * spP);
        const spY = by - (Math.sin(spP * Math.PI) * (10 + pwr * 3));
        ctx.fillStyle = `rgba(255,255,255,${0.8 - spP * 0.5})`;
        ctx.beginPath(); ctx.arc(spX, spY, 1.4, 0, 7); ctx.fill();
      }
      // Cá hiếm (power >= 4): hiệu ứng lấp lánh vàng trên mặt nước
      if (pwr >= 4) {
        for (let g = 0; g < 5; g++) {
          const gp = (t * 2.5 + g * 1.3) % 1;
          const gx = bx + Math.sin(g * 47) * 22;
          const gy = by - 4 + Math.cos(g * 31) * 9 - gp * 14;
          const ga = (1 - gp) * 0.9;
          ctx.fillStyle = `rgba(255, 215, 0, ${ga})`;
          ctx.font = "800 10px system-ui"; ctx.textAlign = "center";
          ctx.fillText("✨", gx, gy);
        }
      }
    } else {
      // Người chơi khác đang ngồi câu hoặc bản thân chưa quăng
      showFloat = !mine;
      if (showFloat) {
        bx = targetBx;
        by = targetBy + Math.sin(t * 2 + i) * 1.2;
        ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = 1; ctx.beginPath();
        ctx.ellipse(bx, by + 3, 6 + (t * 6 % 5), 2, 0, 0, 7); ctx.stroke();
      }
    }

    drawPlayer({...o, x: sx, y: sy, walking: false, up: true, sit: true}, t);

    // Cần câu (uốn cong khi giãy cá)
    ctx.strokeStyle = "#5c3d2a"; ctx.lineWidth = fight ? 2.5 : 2; ctx.beginPath();
    if (fight) {
      ctx.moveTo(sx + 6, sy - 18);
      ctx.quadraticCurveTo(sx + 15, sy - 42, tipX, tipY);
    } else {
      ctx.moveTo(sx + 6, sy - 18);
      ctx.lineTo(tipX, tipY);
    }
    ctx.stroke();

    // Dây câu + phao
    if (showFloat) {
      ctx.strokeStyle = fight ? "rgba(255,255,255,.95)" : "rgba(255,255,255,.7)";
      ctx.lineWidth = fight ? 1 : 0.8;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      if (fight) {
        ctx.lineTo(bx, by);
      } else {
        ctx.quadraticCurveTo(bx + 4, by - 20, bx, by);
      }
      ctx.stroke();

      // Phao câu (nửa đỏ nửa trắng)
      ctx.fillStyle = "#e63946"; ctx.beginPath(); ctx.arc(bx, by, 2.8, Math.PI, 0); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(bx, by, 2.8, 0, Math.PI); ctx.fill();
    }

    if (bite) {
      ctx.font = "700 15px system-ui"; ctx.fillStyle = "#ffd166"; ctx.textAlign = "center";
      ctx.fillText("❗", bx, by - 14);
    }
  }
  function openBait() {
    const st = S(), FI = Object.fromEntries(FISH.map(f => [f.id, f]));
    const fish = Object.entries(st.inv).filter(([, x]) => x.cat === "fish" && x.n > 0).map(([id, x]) => [id, {...x, sell: (FI[id.slice(5)] || {}).price || 0}]);
    const total = fish.reduce((s, [, x]) => s + x.n * x.sell, 0);
    openSheet("🐛 Quầy cô Lan",
      `${Life.coinLine()}<div class="sec">Mua mồi câu</div>
       <div class="grid">${BAITS.map(b => `<button class="opt" data-b="${b.id}">${b.e} ${b.name} ×${b.pack}<small>${b.price} 💰 · đang có ${st.bait[b.id] || 0}</small></button>`).join("")}</div>
       <div class="sec">🐟 Bán cá</div>
       ${fish.length ? `<div class="board">${fish.map(([id, x]) => {
         const fId = id.startsWith("fish_") ? id.slice(5) : id;
         const fIcon = fishIcon(fId, 28);
         const iconHtml = fIcon
           ? `<img src="${fIcon}" width="28" height="28" style="vertical-align:middle;margin-right:6px;object-fit:contain;display:inline-block" alt="${esc(x.name)}"/>`
           : `<span style="margin-right:4px">${x.e}</span>`;
         return `<div><span style="display:inline-flex;align-items:center">${iconHtml}${esc(x.name)} ×${x.n}</span><b>${x.n * x.sell} 💰</b></div>`;
       }).join("")}</div>
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
        ctx.fillStyle = SKIN_DEFAULT; ctx.beginPath(); ctx.arc(mx, my - 12, 6.5, 0, 7); ctx.fill();
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
  // ---------- Thử đồ miễn phí tại cửa hàng quần áo (khu mua sắm) ----------
  let storeTry = {}, storeUp = false, storeRaf = 0;

  function storeCss() {
    if (document.getElementById("storeCss")) return;
    const s = document.createElement("style"); s.id = "storeCss";
    s.textContent = `
      .store-pv-box { display: flex; flex-direction: column; align-items: center; gap: 8px; margin: 0 0 10px; }
      .store-pv-wrap { position: relative; display: inline-block; }
      #storePv { width: 148px; height: 158px; border-radius: 18px; display: block;
                 background: radial-gradient(circle at 50% 35%, #3d3570, #191630 80%);
                 border: 2px solid rgba(255, 215, 120, 0.3); box-shadow: 0 4px 14px rgba(0,0,0,.35); touch-action: none; cursor: pointer; }
      .store-rot-btn { position: absolute; top: 8px; right: 8px; padding: 3px 8px; border-radius: 12px;
                       background: rgba(18, 15, 38, 0.82); color: #fff; border: 1px solid rgba(255,255,255,0.25);
                       cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 3px; }
      .store-rot-btn:hover { background: rgba(30, 25, 60, 0.95); }
      .store-pv-bar { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 6px; width: 100%; min-height: 28px; }
      .store-pv-bar .mini { padding: 5px 11px; font-size: 12px; font-weight: 700; border-radius: 10px; }
      .store-btn-buy { background: #ffd27a !important; color: #1f1832 !important; border: none !important; }
      .store-btn-wear { background: #52b788 !important; color: #fff !important; border: none !important; }
      .store-list { max-height: 44vh; overflow-y: auto; padding: 2px 2px 6px; -webkit-overflow-scrolling: touch; }
      .store-card { cursor: pointer; transition: border-color .15s, box-shadow .15s; }
      .store-card.store-trying { border-color: var(--accent) !important; background: rgba(255,210,122,.18) !important;
                                 box-shadow: 0 0 8px rgba(255,210,122,.35); }
      .store-try-btn { font-size: 11px; padding: 2px 7px; border-radius: 8px; }
      .store-try-btn.cur { background: var(--accent); color: #1d1838; font-weight: 800; border-color: transparent; }
      @media (max-height: 460px) {
        #storePv { width: 116px; height: 124px; }
        .store-pv-box { gap: 4px; margin-bottom: 6px; }
        .store-list { max-height: 38vh; }
      }
    `;
    document.head.appendChild(s);
  }

  function drawStorePv(cv) {
    if (!cv) return;
    const c = cv.getContext("2d"), saved = ctx, t = performance.now() / 1000, sc = 2.8;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
    c.setTransform(sc, 0, 0, sc, cv.width / 2, 0);
    // Thảm tròn sang trọng phòng thử đồ
    c.fillStyle = "rgba(255, 255, 255, 0.06)";
    c.beginPath(); c.ellipse(0, 56, 22, 6, 0, 0, 7); c.fill();
    c.strokeStyle = "rgba(255, 215, 120, 0.2)"; c.lineWidth = 1; c.stroke();
    ctx = c;
    const curOutfit = cleanOutfit();
    const previewOutfit = { ...curOutfit, ...storeTry };
    try {
      drawAvatar({
        x: 0,
        y: 56,
        color: myColor,
        outfit: previewOutfit,
        walking: false,
        up: !!storeUp,
        id: myId
      }, t);
    } finally {
      ctx = saved;
    }
  }

  function storePvLoop() {
    const cv = document.getElementById("storePv");
    if (!cv || $("#sheet").classList.contains("hidden")) {
      storeRaf = 0;
      return;
    }
    drawStorePv(cv);
    storeRaf = requestAnimationFrame(storePvLoop);
  }

  function storePvBarHtml() {
    const triedIds = Object.values(storeTry);
    const hasTried = triedIds.length > 0;
    let html = `<button class="mini ghostb store-reset-btn" id="storeReset" ${hasTried ? "" : "disabled style=\"opacity:.5\""}>↺ Bỏ thử</button>`;
    if (!hasTried) {
      html += `<span style="font-size:12px;color:var(--muted);margin-left:4px">Chạm món đồ bên dưới để thử ✨</span>`;
    } else {
      for (const id of triedIds) {
        const c = CL[id];
        if (!c) continue;
        if (owns(c.id)) {
          const isWearing = S().outfit && S().outfit[c.slot] === c.id;
          if (isWearing) {
            html += `<button class="mini ghostb" disabled style="opacity:.65">✓ Đang mặc${triedIds.length > 1 ? ` ${c.name}` : ""}</button>`;
          } else {
            html += `<button class="mini store-btn-wear" data-try-wear="${c.id}">✓ Mặc luôn${triedIds.length > 1 ? ` ${c.name}` : ""}</button>`;
          }
        } else {
          html += `<button class="mini store-btn-buy" data-try-buy="${c.id}">Mua ${c.name} · ${c.price} 💰</button>`;
        }
      }
    }
    return html;
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
    storeCss();
    const items = CLOTHES.filter(c => store.slots.includes(c.slot) && c.price > 0);
    openSheet(`${store.e} ${store.name}`,
      `${Life.coinLine()}
       <div class="store-pv-box">
         <div class="store-pv-wrap">
           <canvas id="storePv" width="180" height="190"></canvas>
           <button id="storeRot" class="mini store-rot-btn" title="Xoay trước / sau">⟲ <small id="storeRotLbl">${storeUp ? "Lưng" : "Trước"}</small></button>
         </div>
         <div class="store-pv-bar" id="storePvBar">
           ${storePvBarHtml()}
         </div>
       </div>
       <div class="store-list">
         <div class="grid">${items.map(c => {
           const perm = S().owned[c.id] === 0, rent = Math.ceil(c.price / RENT_FACTOR);
           const isTrying = storeTry[c.slot] === c.id;
           return `<div class="opt store-card ${isTrying ? "active store-trying" : ""}" data-card-id="${c.id}" style="display:flex;flex-direction:column;gap:6px">
             <div style="display:flex;justify-content:space-between;align-items:center;gap:4px">
               <span style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.e} ${c.name}</span>
               <button class="mini store-try-btn ${isTrying ? "cur" : "ghostb"}" data-try="${c.id}">${isTrying ? "✓ Đang thử" : "👁️ Thử"}</button>
             </div>
             ${perm ? `<button class="mini" data-wear="${c.id}">✓ Đã có · Mặc</button>`
                    : `<button class="mini" data-buy="${c.id}">Mua ${c.price} 💰</button><button class="mini ghostb" data-rent="${c.id}">Thuê 1 ngày ${rent} 💰${owns(c.id) ? " (gia hạn)" : ""}</button>`}
           </div>`;
         }).join("")}</div>
       </div>`,
      el => {
        const done = (c, msg) => { equip(c.slot, c.id); Life.apply({xp: 2, fun: 5}); Life.commit(); toast(msg); openStore(store); };

        const buyItem = async (c, btn) => {
          if (!c) return;
          if (btn) btn.disabled = true;
          const ok = await Life.eco("buyCloth", {id: c.id});
          if (!ok) {
            if (btn) btn.disabled = false;
            return;
          }
          delete storeTry[c.slot];
          done(c, `${c.e} Đã mua ${c.name} (vĩnh viễn) và mặc luôn!`);
        };

        const refreshUI = () => {
          el.querySelectorAll(".store-card").forEach(card => {
            const id = card.dataset.cardId;
            const c = CL[id];
            const isTrying = c && storeTry[c.slot] === id;
            card.classList.toggle("active", isTrying);
            card.classList.toggle("store-trying", isTrying);
            const tryBtn = card.querySelector(".store-try-btn");
            if (tryBtn) {
              tryBtn.textContent = isTrying ? "✓ Đang thử" : "👁️ Thử";
              tryBtn.classList.toggle("cur", isTrying);
              tryBtn.classList.toggle("ghostb", !isTrying);
            }
          });
          const bar = el.querySelector("#storePvBar");
          if (bar) {
            bar.innerHTML = storePvBarHtml();
            bindPvBar(bar);
          }
          const rotLbl = el.querySelector("#storeRotLbl");
          if (rotLbl) rotLbl.textContent = storeUp ? "Lưng" : "Trước";
          const cv = el.querySelector("#storePv");
          if (cv) drawStorePv(cv);
        };

        const toggleTry = c => {
          if (storeTry[c.slot] === c.id) {
            delete storeTry[c.slot];
          } else {
            storeTry[c.slot] = c.id;
          }
          refreshUI();
        };

        const bindPvBar = barEl => {
          const resetBtn = barEl.querySelector("#storeReset");
          if (resetBtn) resetBtn.onclick = e => {
            e.stopPropagation();
            storeTry = {};
            storeUp = false;
            refreshUI();
          };
          barEl.querySelectorAll("[data-try-buy]").forEach(b => b.onclick = e => {
            e.stopPropagation();
            buyItem(CL[b.dataset.tryBuy], b);
          });
          barEl.querySelectorAll("[data-try-wear]").forEach(b => b.onclick = e => {
            e.stopPropagation();
            const c = CL[b.dataset.tryWear];
            if (!c) return;
            equip(c.slot, c.id);
            delete storeTry[c.slot];
            toast(`${c.e} Đã mặc ${c.name}`);
            refreshUI();
          });
        };

        bindPvBar(el.querySelector("#storePvBar"));

        el.querySelectorAll(".store-card").forEach(card => {
          card.onclick = e => {
            if (e.target.closest("[data-buy]") || e.target.closest("[data-rent]") || e.target.closest("[data-wear]")) return;
            const c = CL[card.dataset.cardId];
            if (c) toggleTry(c);
          };
        });

        el.querySelectorAll(".store-try-btn").forEach(btn => {
          btn.onclick = e => {
            e.stopPropagation();
            const c = CL[btn.dataset.try];
            if (c) toggleTry(c);
          };
        });

        el.querySelectorAll("[data-buy]").forEach(b => b.onclick = e => {
          e.stopPropagation();
          buyItem(CL[b.dataset.buy], b);
        });

        el.querySelectorAll("[data-rent]").forEach(b => b.onclick = async e => {
          e.stopPropagation();
          const c = CL[b.dataset.rent]; if (!c) return;
          b.disabled = true;
          if (!(await Life.eco("buyCloth", {id: c.id, rent: true}))) {
            b.disabled = false;
            return;
          }
          delete storeTry[c.slot];
          done(c, `${c.e} Đã thuê ${c.name} 1 ngày!`);
        });

        el.querySelectorAll("[data-wear]").forEach(b => b.onclick = e => {
          e.stopPropagation();
          const c = CL[b.dataset.wear]; if (!c) return;
          equip(c.slot, c.id);
          delete storeTry[c.slot];
          toast(`${c.e} Đã mặc ${c.name}`);
          refreshUI();
        });

        const rotBtn = el.querySelector("#storeRot");
        if (rotBtn) rotBtn.onclick = e => {
          e.stopPropagation();
          storeUp = !storeUp;
          refreshUI();
        };

        const cv = el.querySelector("#storePv");
        if (cv) cv.onclick = () => {
          storeUp = !storeUp;
          refreshUI();
        };

        if (storeRaf) { cancelAnimationFrame(storeRaf); storeRaf = 0; }
        storePvLoop();
      });
  }
  // giống chưa có ảnh đẹp (static/pet_sprites.js) thì chưa bán, hiện "Sắp có"
  const soon = id => typeof Pets !== "undefined" && Pets.hasSprite && !Pets.hasSprite(id);
  function openPetShop() {
    openSheet("🐾 Tiệm thú cưng",
      `${Life.coinLine()}${[...new Set(PET_SHOP.map(p => p.group || "Khác"))].map(g => `<div class="sec">${g}</div><div class="grid petgrid">${PET_SHOP.filter(p => (p.group || "Khác") === g).map(p => `<button class="opt petopt ${myPet.type === p.id ? "active" : ""}" data-p="${p.id}" ${soon(p.id) && myPet.type !== p.id ? "disabled" : ""}><canvas class="peticon" data-icon="${p.id}" width="96" height="80"></canvas><b>${p.label || p.name}</b><small>${myPet.type === p.id ? "đang nuôi" : soon(p.id) ? "🎨 Sắp có" : p.price + " 💰"}</small></button>`).join("")}</div>`).join("")}
       <div class="grid" style="margin-top:8px">
       <button class="opt" id="treat">${PET_TREAT.e} ${PET_TREAT.name}<small>${PET_TREAT.price} 💰 · 😊+${PET_TREAT.fun}</small></button></div>
       <div class="vol" style="font-size:12px">Nhận nuôi bé mới thì bé cũ về nhà nghỉ nhé 🏡</div>`,
      el => {
        // chân dung từng bé (static/pets.js); không có thì hiện emoji
        el.querySelectorAll("[data-icon]").forEach(cv => {
          if (typeof Pets !== "undefined" && Pets.has(cv.dataset.icon)) Pets.icon(cv, cv.dataset.icon, 0);
          else cv.replaceWith(Object.assign(document.createElement("span"), {className: "peticon", textContent: PETS[cv.dataset.icon].e}));
        });
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
    if (myArea === "farm") {
      const hitAnimal = drawnFarmAnimals.find(a => Math.hypot(x - a.x, y - a.y) <= 26);
      if (hitAnimal) {
        openAnimals(hitAnimal.k);
        return true;
      }
      if (inRect(x, y, BARN)) { openBarn(); return true; }
      const i = PLOTS.findIndex(r => inRect(x, y, r));
      if (i >= 0) { tapPlot(i); return true; }
    }
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
      // Vùng sáng ấm áp cho cửa gác xép kho lương thực
      hole(BARN.x + BARN.w / 2, BARN.y + 24, 60, .75);
      // Vùng sáng cho các cột đèn nông trại và chuỗi bóng đèn fairy lights
      FARM_LAMPS.forEach(l => hole(l.x, l.y, 90, .75));
      FAIRY_BULBS.forEach(b => hole(b.x, b.y, 24, .45));
      // Vùng sáng cho đèn ruộng: 4 góc và bao phủ toàn bộ cánh đồng cây trồng
      hole(180, 250, 75, .8);
      hole(708, 250, 75, .8);
      hole(180, 430, 75, .8);
      hole(708, 430, 75, .8);
      for (let hx = 225; hx <= 665; hx += 70) {
        hole(hx, 295, 75, .8);
        hole(hx, 377, 75, .8);
      }
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
  function onArea(a) {
    placing = null; cleanupFishing();
    storeTry = {}; storeUp = false;
    if (storeRaf) { cancelAnimationFrame(storeRaf); storeRaf = 0; }
    for (const k of Object.keys(activeFarmActions)) delete activeFarmActions[k];
    pendingFarmWalk = null;
    farmCrouchOffset = 0;
  }
  function setHome(items) { homeItems = Array.isArray(items) ? items : []; }

  return {has: a => NEW.has(a), openPetShop, TXT, draw, seat, ents, tap, holes, act, over: drawSeason, drawAvatar, onJoin, onArea, setHome,
          openWardrobe, owns, ownLabel, cleanOutfit, outfit: () => cleanOutfit(), npcPos, FARM_LAMPS, fishIcon, BARN, openBarn, openAnimals,
          say: (id, text, sec = 4) => { npcTalk[id] = {text, until: performance.now() / 1000 + sec}; }};   // NPC tự nói (tiệm tóc)
})();
