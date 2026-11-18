// ================== 3 KHU MỚI: 🎪 Khu vui chơi · 📈 Khu chứng khoán · 💞 Khu hẹn hò ==================
// Nạp SAU areas.js. Đăng ký bố cục/cửa/tên khu vào bảng của game, cung cấp hàm vẽ cảnh + bảng chơi.
// Mọi xu, tỉ lệ, kết quả may rủi do SERVER tính (arcade.py, stock.py, dating.py); file này chỉ hiển thị + gửi yêu cầu.
// Cấu hình (giá, tỉ lệ, mã cổ phiếu, sở thích…) ở catalog.json → CATALOG.ARCADE / STOCK / DATING.
"use strict";

const Zones = (() => {
  const A = CATALOG.ARCADE, SK = CATALOG.STOCK, DT = CATALOG.DATING;
  const IDS = new Set(["arcade", "stock", "dating"]);
  const OFF = {x: -500, y: -500, w: 1, h: 1};
  const S = () => Life.S();
  const eco = (a, p) => Life.eco(a, p);
  const fmt = n => Math.round(n).toLocaleString("vi-VN");
  const RANK = Object.fromEntries(A.CLAW_RANKS.map(r => [r.rank, r]));
  const FACE = Object.fromEntries(A.BC_FACES.map(f => [f.id, f]));

  // ---------- 1. Đăng ký khu vào bảng của game ----------
  Object.assign(LAYOUTS, {
    arcade: {ww: 1120, wh: 600, floor: {x1: 20, y1: 175, x2: 1100, y2: 585},
             beds: [{x: 330, y: 360}, {x: 330, y: 420}, {x: 740, y: 360}, {x: 740, y: 420}], bw: 80, bh: 40, sitY: 30,
             tvr: null, scr: null, radio: {x: 960, y: 432, w: 50, h: 30}, sw: OFF, moon: {x: 300, y: 46}},
    stock:  {ww: 1000, wh: 600, floor: {x1: 20, y1: 175, x2: 980, y2: 585},
             beds: [140, 280, 600, 740].map(x => ({x, y: 290})).concat([140, 280, 600, 740].map(x => ({x, y: 410}))), bw: 110, bh: 80, sitY: 66,
             tvr: null, scr: null, radio: {x: 860, y: 512, w: 44, h: 26}, sw: {x: 966, y: 110, w: 13, h: 19}, moon: null},
    dating: {ww: 1120, wh: 600, floor: {x1: 20, y1: 262, x2: 1100, y2: 585}, minY: 262,
             beds: [140, 210, 500, 570, 850, 920].map(x => ({x, y: 420})), bw: 70, bh: 40, sitY: 30,
             tvr: null, scr: null, radio: {x: 660, y: 516, w: 44, h: 26}, sw: OFF, moon: {x: 820, y: 44}},
  });
  const exit = cx => [{x: cx - 24, y: 538, w: 48, h: 37, side: "bottom", spot: {x: cx, y: 556}, to: "map"}];
  Object.assign(AREA_DOORS, {arcade: exit(560), stock: exit(500), dating: exit(560)});
  Object.assign(AREA_NAME, {arcade: "🎪 Khu vui chơi", stock: "📈 Khu chứng khoán", dating: "💞 Khu hẹn hò"});
  OUTDOOR.add("arcade"); OUTDOOR.add("dating");
  Object.assign(Areas.TXT, {
    arcade: {icon: "🎪", sit: "🪑<span>Ngồi</span>", full: "Hết ghế rồi! 😅", taken: "Ghế của",
             hello: "🎪 Khu vui chơi: 🎲 bầu cua (giữa), 🧸 máy gắp gấu (trái), 🎡 quay thưởng + 🎫 xổ số (phải). Tỉ lệ công khai ở từng quầy!",
             share: "Ra khu vui chơi với mình nè 🎪"},
    stock:  {icon: "📈", sit: "💺<span>Ngồi</span>", full: "Hết bàn rồi! 😅", taken: "Bàn của",
             hello: "📈 Khu chứng khoán ảo: ngồi vào bàn giao dịch (hoặc chạm bảng điện) để mua bán. Đây là mô phỏng để học, không phải lời khuyên đầu tư thật.",
             share: "Vào sàn chứng khoán ảo với mình nè 📈"},
    dating: {icon: "💞", sit: "💕<span>Ngồi</span>", full: "Hết ghế đôi rồi! 😅", taken: "Ghế của",
             hello: "💞 Khu hẹn hò: chạm Cô Duyên để tạo hồ sơ, tìm bạn cùng nhóm tuổi. Đừng chia sẻ số điện thoại hay mạng xã hội nhé!",
             share: "Ra khu hẹn hò dạo chơi nè 💞"},
  });

  // ---------- 2. Trạng thái nhận từ server ----------
  const st = {bc: null, chip: 10, marquee: "🧸 Gắp được gấu S+ là cả kênh được thông báo!", confetti: [],
              stk: null, hist: {}, stkSel: "NONG", stkTab: "board", lanterns: [], arcadeSince: 0, warned: 0, panel: ""};
  for (let k = 0; k < 7; k++) st.lanterns.push({x: 80 + k * 150, t0: -k * 9, by: "", base: true});

  // ---------- 3. Vẽ cảnh ----------
  const day = () => Life.isDay();
  function sky(top, bottom, night) {
    const {L, R, T} = bleed();
    const g = ctx.createLinearGradient(0, -100, 0, bottom);
    if (night) { g.addColorStop(0, "#0b0a2e"); g.addColorStop(1, "#3a2a6b"); } else { const [a, b] = Life.skyColors(); g.addColorStop(0, a); g.addColorStop(1, b); }
    ctx.fillStyle = g; ctx.fillRect(L, T, R - L, bottom - T);
    if (night) for (const s of winStars.concat(tvStars)) for (let k = 0; k < 4; k++) { ctx.fillStyle = `rgba(255,255,255,${.4 + .4 * Math.sin(performance.now() / 500 + s.p + k)})`; ctx.fillRect(-200 + k * 380 + s.x * 380, -60 + s.y * (bottom + 40), 1.5, 1.5); }
  }
  function bulb(x, y, on, c = "#ffd166") {
    ctx.fillStyle = on ? c : "rgba(255,255,255,.35)"; ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 7); ctx.fill();
    if (on) { ctx.fillStyle = "rgba(255,230,150,.25)"; ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill(); }
  }
  function plush(x, y, size, rank, t, glow) {                 // gấu bông nhỏ (hình tạm)
    const r = size / 2, R0 = RANK[rank], c = {C: "#c9a27e", B: "#f4a6c4", A: "#a0c4ff", S: "#cdb4db", "S+": "#ffe066"}[rank];
    if (glow && (rank === "S" || rank === "S+")) { ctx.fillStyle = `rgba(255,240,150,${.25 + Math.sin(t * 4) * .1})`; ctx.beginPath(); ctx.arc(x, y, r * 1.5, 0, 7); ctx.fill(); }
    ctx.fillStyle = c; ctx.strokeStyle = tone2(c, -.35); ctx.lineWidth = Math.max(.8, r * .08);
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(x + s * r * .62, y - r * .62, r * .32, 0, 7); ctx.fill(); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(x, y, r * .78, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#fff4e6"; ctx.beginPath(); ctx.ellipse(x, y + r * .22, r * .34, r * .26, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#3a2219"; ctx.beginPath(); ctx.arc(x - r * .28, y - r * .1, r * .09, 0, 7); ctx.arc(x + r * .28, y - r * .1, r * .09, 0, 7); ctx.arc(x, y + r * .14, r * .08, 0, 7); ctx.fill();
    ctx.strokeStyle = R0.color; ctx.lineWidth = Math.max(1, r * .12); ctx.beginPath(); ctx.arc(x, y, r * .95, .3, Math.PI - .3); ctx.stroke();
    if (rank === "S+") { ctx.fillStyle = "#ff7ab6"; ctx.font = `${r * .7}px system-ui`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("✨", x + r * .8, y - r * .9); }
  }
  function tone2(hex, amt) {
    const n = parseInt(String(hex).slice(1), 16); if (isNaN(n)) return hex;
    const f = v => Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt));
    return "#" + [n >> 16, (n >> 8) & 255, n & 255].map(v => f(v).toString(16).padStart(2, "0")).join("");
  }

  // ---------- Các hàm hỗ trợ trang trí chibi dễ thương ----------
  // Vẽ hình trái tim chibi
  function drawHeart(x, y, size, col) {
    ctx.fillStyle = col;
    ctx.beginPath();
    const r = size / 2;
    ctx.moveTo(x, y + r * 0.9);
    ctx.bezierCurveTo(x - r * 1.15, y + r * 0.2, x - r * 1.15, y - r * 0.85, x, y - r * 0.3);
    ctx.bezierCurveTo(x + r * 1.15, y - r * 0.85, x + r * 1.15, y + r * 0.2, x, y + r * 0.9);
    ctx.fill();
  }

  // Vẽ ngôi sao 4 cánh lấp lánh (sparkle ánh sáng vàng / neon)
  function drawSparkle(x, y, r, col = "#ffd166", rot = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.quadraticCurveTo(0, 0, 0, r);
    ctx.quadraticCurveTo(0, 0, -r, 0);
    ctx.quadraticCurveTo(0, 0, 0, -r);
    ctx.fill();
    ctx.restore();
  }

  // Vẽ chùm bóng bay trái tim đung đưa mềm mại theo gió
  function drawHeartBalloon(x, y, col, t, seed = 0, size = 16) {
    const sw = Math.sin(t * 1.6 + seed) * 4;
    const bx = x + sw, by = y + Math.cos(t * 1.2 + seed) * 3;
    // Dây bóng uốn cong
    ctx.strokeStyle = "rgba(180,180,180,0.65)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + size + 22);
    ctx.quadraticCurveTo(x + sw * 0.5, y + size + 10, bx, by + size * 0.55);
    ctx.stroke();
    // Nút thắt nơ nhỏ
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(bx, by + size * 0.52, 2, 0, 7);
    ctx.fill();
    // Thân bóng trái tim
    drawHeart(bx, by, size, col);
    // Vệt bóng sáng trắng tạo độ phồng 3D
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.beginPath();
    ctx.ellipse(bx - size * 0.22, by - size * 0.22, size * 0.16, size * 0.09, -0.6, 0, 7);
    ctx.fill();
  }

  // Vẽ bình hoa thủy tinh cắm hoa hồng tươi trên bàn
  function drawFlowerVase(x, y, t) {
    // Bình thủy tinh nhỏ
    ctx.fillStyle = "rgba(225,245,255,0.7)";
    ctx.strokeStyle = "rgba(180,215,245,0.9)";
    ctx.lineWidth = 1;
    rr(ctx, x - 5, y - 9, 10, 11, 3);
    ctx.fill();
    ctx.stroke();
    // Nước trong bình
    ctx.fillStyle = "rgba(160,225,255,0.5)";
    rr(ctx, x - 4, y - 4, 8, 5, 2);
    ctx.fill();
    // Cành và lá hoa
    ctx.strokeStyle = "#40916c";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y - 8); ctx.lineTo(x - 4, y - 16);
    ctx.moveTo(x, y - 8); ctx.lineTo(x + 4, y - 17);
    ctx.moveTo(x, y - 8); ctx.lineTo(x, y - 20);
    ctx.stroke();
    // Bông hoa hồng và baby trắng nở rộ
    ctx.fillStyle = "#ff758f";
    ctx.beginPath(); ctx.arc(x - 4, y - 16, 3.5, 0, 7); ctx.fill();
    ctx.fillStyle = "#ffb3c1";
    ctx.beginPath(); ctx.arc(x - 4, y - 16, 2, 0, 7); ctx.fill();
    ctx.fillStyle = "#ff4d6d";
    ctx.beginPath(); ctx.arc(x, y - 20, 4, 0, 7); ctx.fill();
    ctx.fillStyle = "#ff8fa3";
    ctx.beginPath(); ctx.arc(x, y - 20, 2.2, 0, 7); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(x + 4, y - 17, 3, 0, 7); ctx.fill();
    ctx.fillStyle = "#ffd166";
    ctx.beginPath(); ctx.arc(x + 4, y - 17, 1.3, 0, 7); ctx.fill();
  }

  // Vẽ cây cảnh văn phòng hiện đại (Bàng Singapore, Lưỡi Hổ, Trầu Bà)
  function drawOfficePlant(x, y, type = "fig") {
    // Chân đế kim loại + chậu gốm trắng
    ctx.fillStyle = "#343a40";
    ctx.fillRect(x - 8, y + 13, 16, 3);
    ctx.fillStyle = "#f8f9fa";
    ctx.strokeStyle = "#ced4da";
    ctx.lineWidth = 1;
    rr(ctx, x - 9, y - 2, 18, 15, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#5c4033"; // Đất
    ctx.beginPath(); ctx.ellipse(x, y - 1, 8, 3, 0, 0, 7); ctx.fill();
    if (type === "fig") {
      // Cây bàng Singapore tán lá tròn to
      ctx.strokeStyle = "#6b4a35"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x, y - 1); ctx.lineTo(x, y - 22); ctx.stroke();
      const leaves = [[-9, -9, 7, 11, -0.4], [9, -11, 7, 11, 0.4], [-8, -19, 8, 12, -0.3], [8, -21, 8, 12, 0.3], [0, -27, 8, 12, 0]];
      leaves.forEach(([lx, ly, rx, ry, rot]) => {
        ctx.save(); ctx.translate(x + lx, y + ly); ctx.rotate(rot);
        ctx.fillStyle = "#2d6a4f"; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = "#52b788"; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(0, ry * 0.8); ctx.lineTo(0, -ry * 0.8); ctx.stroke();
        ctx.restore();
      });
    } else if (type === "snake") {
      // Cây Lưỡi Hổ lá vươn thẳng viền vàng phong thủy
      const blades = [[-5, 0, 17, -0.15], [-2, 0, 23, -0.05], [3, 0, 21, 0.08], [6, 0, 15, 0.18]];
      blades.forEach(([bx, by, h, rot]) => {
        ctx.save(); ctx.translate(x + bx, y + by); ctx.rotate(rot);
        ctx.fillStyle = "#ffd166"; // Viền vàng
        ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(0, -h); ctx.lineTo(3, 0); ctx.fill();
        ctx.fillStyle = "#2d6a4f"; // Ruột xanh
        ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(0, -h + 2); ctx.lineTo(2, 0); ctx.fill();
        ctx.restore();
      });
    } else {
      // Cây Trầu bà xẻ lá Monstera
      ctx.strokeStyle = "#40916c"; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(x, y - 1); ctx.quadraticCurveTo(x - 7, y - 11, x - 11, y - 18); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y - 1); ctx.quadraticCurveTo(x + 7, y - 11, x + 11, y - 18); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y - 1); ctx.lineTo(x, y - 20); ctx.stroke();
      ctx.fillStyle = "#1b4332";
      ctx.beginPath(); ctx.arc(x - 11, y - 18, 8, 0, 7); ctx.arc(x + 11, y - 18, 8, 0, 7); ctx.arc(x, y - 22, 9, 0, 7); ctx.fill();
      ctx.fillStyle = "#52b788";
      ctx.beginPath(); ctx.arc(x - 11, y - 18, 3.5, 0, 7); ctx.arc(x + 11, y - 18, 3.5, 0, 7); ctx.fill();
    }
  }

  function drawArcade(t) {                                    // 🎪 hội chợ ngoài trời & arcade 1120x600
    const night = Life.darkness() > .5, {L, R, B} = bleed();
    sky(-400, 160, night);

    // ---- Nền sau: vòng quay lớn + đu quay ghế bay (parallax) ----
    ctx.save(); ctx.translate(cam.x * .35, 0);
    // Vòng quay khổng lồ (Ferris wheel) lớn hơn, chi tiết hơn
    const fx = 950, fy = 65, fR = 75;
    ctx.strokeStyle = night ? "rgba(255,180,255,.8)" : "rgba(255,255,255,.85)"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(fx, fy, fR, 0, 7); ctx.stroke();
    ctx.strokeStyle = night ? "rgba(255,210,120,.5)" : "rgba(240,240,255,.6)"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(fx, fy, fR * .55, 0, 7); ctx.stroke();
    for (let k = 0; k < 12; k++) {
      const a = t * .18 + k / 12 * Math.PI * 2, cx = fx + Math.cos(a) * fR, cy = fy + Math.sin(a) * fR;
      ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(cx, cy); ctx.stroke();
      // Cabin vòng quay
      ctx.fillStyle = ["#ff595e", "#ffca3a", "#8ac926", "#1982c4", "#6a4c93", "#ff924c"][k % 6];
      rr(ctx, cx - 7, cy - 4, 14, 11, 3); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.fillRect(cx - 5, cy - 2, 10, 5);
      // Đèn nhỏ trên vành
      bulb(cx, cy, (Math.floor(t * 3) + k) % 2 === 0, "#fff3b0");
    }
    // Chân trụ vòng quay
    ctx.strokeStyle = "#495057"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(fx - 40, 160); ctx.lineTo(fx, fy); ctx.lineTo(fx + 40, 160); ctx.stroke();
    ctx.fillStyle = "#ffca3a"; ctx.beginPath(); ctx.arc(fx, fy, 6, 0, 7); ctx.fill();

    // Đu quay ghế bay xích (Wave swinger / Chairoplane) ở góc trái nền sau
    const swX = 180, swY = 85, swR = 48;
    ctx.fillStyle = "#6a4c93"; ctx.beginPath(); ctx.moveTo(swX - 16, 160); ctx.lineTo(swX - 10, swY); ctx.lineTo(swX + 10, swY); ctx.lineTo(swX + 16, 160); ctx.fill();
    // Chóp đu quay
    ctx.fillStyle = "#ff595e"; ctx.beginPath(); ctx.moveTo(swX - 40, swY); ctx.lineTo(swX, swY - 24); ctx.lineTo(swX + 40, swY); ctx.fill();
    ctx.fillStyle = "#ffd166"; for (let sk = 0; sk < 7; sk++) bulb(swX - 35 + sk * 11, swY, (Math.floor(t * 4) + sk) % 2 === 0);
    // Các ghế bay văng nghiêng
    for (let k = 0; k < 6; k++) {
      const a = t * .8 + k / 6 * Math.PI * 2, swingR = swR + Math.sin(a) * 12;
      const chX = swX + Math.cos(a) * swingR, chY = swY + 18 + Math.abs(Math.sin(a)) * 14;
      ctx.strokeStyle = "rgba(220,220,220,.7)"; ctx.lineWidth = .9;
      ctx.beginPath(); ctx.moveTo(swX + Math.cos(a) * 20, swY); ctx.lineTo(chX, chY); ctx.stroke();
      ctx.fillStyle = ["#1982c4", "#ffca3a", "#8ac926"][k % 3];
      rr(ctx, chX - 4, chY, 8, 6, 1.5); ctx.fill();
    }

    // Đốm pháo hoa và ánh đèn lễ hội xa xa ban đêm
    if (night) {
      for (let fk = 0; fk < 3; fk++) {
        const ph = (t * 0.4 + fk * 0.33) % 1;
        const fx0 = 420 + fk * 220, fy0 = 40 + (fk % 2) * 25;
        if (ph < 0.7) {
          const fr = ph * 28;
          ctx.strokeStyle = ["rgba(255,100,180,", "rgba(100,240,255,", "rgba(255,220,100,"][fk] + (1 - ph / 0.7) + ")";
          ctx.lineWidth = 1.2;
          for (let sp = 0; sp < 8; sp++) {
            const sa = sp / 8 * 6.28;
            ctx.beginPath(); ctx.moveTo(fx0 + Math.cos(sa) * (fr * 0.3), fy0 + Math.sin(sa) * (fr * 0.3));
            ctx.lineTo(fx0 + Math.cos(sa) * fr, fy0 + Math.sin(sa) * fr); ctx.stroke();
          }
        }
      }
    }
    ctx.restore();

    ctx.fillStyle = night ? "#2a2550" : "#95c97d"; ctx.fillRect(L, 120, R - L, 40);   // Cỏ xa

    // ---- Giàn đèn trần công nghiệp & đèn rọi arcade (ceiling lights) ----
    ctx.fillStyle = "#2b2d42"; ctx.fillRect(L, 22, R - L, 5); // Khung giàn xà trần kim loại
    for (let lx = Math.floor(L / 140) * 140; lx < R; lx += 140) {
      // Dây cáp treo & chao đèn chụp công nghiệp
      ctx.strokeStyle = "#495057"; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(lx, 22); ctx.lineTo(lx, 42); ctx.stroke();
      // Chao đèn vòm kim loại
      ctx.fillStyle = "#1e1e2f"; ctx.beginPath(); ctx.arc(lx, 42, 9, Math.PI, 0); ctx.fill();
      ctx.fillStyle = "#ffd166"; ctx.beginPath(); ctx.arc(lx, 43, 3, 0, 7); ctx.fill();
      // Vệt sáng rọi nhẹ xuống sàn (spotlight cone)
      const grad = ctx.createLinearGradient(lx, 44, lx, 180);
      grad.addColorStop(0, "rgba(255,235,160,0.12)"); grad.addColorStop(1, "rgba(255,235,160,0)");
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.moveTo(lx - 8, 44); ctx.lineTo(lx + 8, 44); ctx.lineTo(lx + 45, 180); ctx.lineTo(lx - 45, 180); ctx.fill();
    }

    // ---- Họa tiết thảm Arcade retro (carpet pattern thập niên 90 / vũ trụ rực rỡ) ----
    const carpetBg = night ? "#181432" : "#231c42";
    ctx.fillStyle = carpetBg; ctx.fillRect(L, 150, R - L, B - 150);
    // Lưới hoa văn thảm arcade neon hình học
    const cStep = 44;
    const startX = Math.floor(L / cStep) * cStep;
    for (let cy = 150, row = 0; cy < B; cy += cStep, row++) {
      for (let cx = startX, col = 0; cx < R; cx += cStep, col++) {
        const seed = (row * 7 + col * 13) % 4;
        const ncx = cx + 22, ncy = cy + 22;
        if (seed === 0) {
          // Tam giác neon hồng & xanh
          ctx.fillStyle = "rgba(255,42,133,0.35)";
          ctx.beginPath(); ctx.moveTo(ncx - 10, ncy + 8); ctx.lineTo(ncx + 4, ncy - 10); ctx.lineTo(ncx + 10, ncy + 6); ctx.fill();
          ctx.fillStyle = "rgba(0,245,212,0.3)";
          ctx.beginPath(); ctx.moveTo(ncx - 6, ncy - 8); ctx.lineTo(ncx + 8, ncy - 4); ctx.lineTo(ncx, ncy + 9); ctx.fill();
        } else if (seed === 1) {
          // Ngôi sao vàng retro 4 cánh
          drawSparkle(ncx, ncy, 6, "rgba(255,209,102,0.4)", 0.2);
          ctx.fillStyle = "rgba(160,100,255,0.35)";
          ctx.fillRect(ncx - 8, ncy - 8, 4, 4); ctx.fillRect(ncx + 4, ncy + 4, 4, 4);
        } else if (seed === 2) {
          // Vệt sóng neon zigzag
          ctx.strokeStyle = "rgba(0,187,249,0.35)"; ctx.lineWidth = 1.8;
          ctx.beginPath(); ctx.moveTo(ncx - 10, ncy - 4); ctx.lineTo(ncx - 3, ncy + 5); ctx.lineTo(ncx + 4, ncy - 5); ctx.lineTo(ncx + 10, ncy + 4); ctx.stroke();
          ctx.fillStyle = "rgba(254,228,64,0.35)";
          ctx.beginPath(); ctx.arc(ncx + 6, ncy - 7, 2, 0, 7); ctx.fill();
        } else {
          // Hạt kim cương neon tím
          ctx.fillStyle = "rgba(155,93,229,0.35)";
          ctx.beginPath(); ctx.moveTo(ncx, ncy - 9); ctx.lineTo(ncx + 8, ncy); ctx.lineTo(ncx, ncy + 9); ctx.lineTo(ncx - 8, ncy); ctx.fill();
          drawSparkle(ncx, ncy, 3.5, "rgba(255,100,200,0.45)");
        }
      }
    }
    // Viền thảm sang trọng tiếp giáp bãi cỏ
    ctx.fillStyle = "#ff007f"; ctx.fillRect(L, 149, R - L, 2);
    ctx.fillStyle = "#00f5d4"; ctx.fillRect(L, 151, R - L, 1);

    // ---- Cổng vòm bóng đèn + biển hiệu Neon KHU VUI CHƠI ----
    const on = k => (Math.floor(t * 3) + k) % 3 !== 0;
    ctx.strokeStyle = "#c1121f"; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(560, 150, 130, Math.PI, 0); ctx.stroke();
    ctx.strokeStyle = "#ffd166"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(560, 150, 130, Math.PI, 0); ctx.stroke();
    for (let k = 0; k <= 20; k++) { const a = Math.PI + k / 20 * Math.PI; bulb(560 + Math.cos(a) * 130, 150 + Math.sin(a) * 130, on(k)); }

    // Biển neon vòm trung tâm với viền ống phát sáng
    ctx.fillStyle = "#1e0842"; rr(ctx, 445, 28, 230, 44, 12); ctx.fill();
    ctx.strokeStyle = (Math.floor(t * 2) % 2) ? "#ff4fd8" : "#4cc9f0"; ctx.lineWidth = 2.5; ctx.stroke();
    // Chữ neon sáng rực
    ctx.fillStyle = (Math.floor(t * 2) % 2) ? "#ff4fd8" : "#4cc9f0";
    ctx.font = "900 20px Nunito, system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("🎪 KHU VUI CHƠI 🎪", 560, 50);

    // ---- Biển Neon hai bên: "🕹️ ARCADE ZONE" và "✨ LUCKY PRIZES ✨" ----
    // Biển Neon trái (trên máy gắp gấu)
    ctx.fillStyle = "#120d2b"; rr(ctx, 110, 68, 160, 28, 6); ctx.fill();
    ctx.strokeStyle = "#00f5d4"; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.fillStyle = (Math.floor(t * 2.5) % 2) ? "#00f5d4" : "#ff70a6";
    ctx.font = "900 11px monospace"; ctx.textAlign = "center";
    ctx.fillText("🕹️ ARCADE ZONE 🕹️", 190, 83);

    // Biển Neon phải (trên quầy quay thưởng)
    ctx.fillStyle = "#120d2b"; rr(ctx, 840, 68, 160, 28, 6); ctx.fill();
    ctx.strokeStyle = "#ffd166"; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.fillStyle = (Math.floor(t * 2.5) % 2) ? "#ffd166" : "#f72585";
    ctx.font = "900 11px monospace"; ctx.textAlign = "center";
    ctx.fillText("✨ LUCKY PRIZES ✨", 920, 83);

    // Dây bóng đèn nhấp nháy giăng ngang nhiều tầng
    const lightStrings = [
      {x1: 0, y1: 155, x2: 440, y2: 155, sag: 18},
      {x1: 680, y1: 155, x2: 1120, y2: 155, sag: 18},
      {x1: 80, y1: 185, x2: 430, y2: 185, sag: 14},
      {x1: 690, y1: 185, x2: 1040, y2: 185, sag: 14}
    ];
    lightStrings.forEach((ls, idx) => {
      ctx.strokeStyle = "rgba(100,70,50,.55)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ls.x1, ls.y1); ctx.quadraticCurveTo((ls.x1 + ls.x2) / 2, ls.y1 + ls.sag, ls.x2, ls.y2); ctx.stroke();
      const nBulbs = 14;
      for (let bi = 1; bi < nBulbs; bi++) {
        const prog = bi / nBulbs, bx = ls.x1 + (ls.x2 - ls.x1) * prog, by = ls.y1 + Math.sin(prog * Math.PI) * ls.sag;
        const bcol = ["#ff595e", "#ffca3a", "#8ac926", "#1982c4", "#ff924c"][(bi + idx) % 5];
        bulb(bx, by, (Math.floor(t * 3.5) + bi + idx) % 3 !== 0, bcol);
      }
    });

    // Dây cờ phướn lễ hội
    for (const [x0, x1] of [[0, 430], [690, 1120]]) {
      ctx.strokeStyle = "rgba(80,60,60,.6)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, 162); ctx.quadraticCurveTo((x0 + x1) / 2, 182, x1, 162); ctx.stroke();
      for (let x = x0 + 15, k = 0; x < x1; x += 26, k++) {
        const yy = 162 + Math.sin((x - x0) / (x1 - x0) * Math.PI) * 10;
        ctx.fillStyle = ["#e63946", "#ffd166", "#2a9d8f", "#4cc9f0", "#f72585"][k % 5];
        ctx.beginPath(); ctx.moveTo(x - 7, yy); ctx.lineTo(x + 7, yy); ctx.lineTo(x, yy + 12); ctx.fill();
      }
    }

    // ---- Kệ trưng bày quà tặng gấu bông (prize shelf with plush toys) ----
    // Nằm ngay phía trên dãy máy gắp gấu (x: 42 đến 338, y: 104 đến 165)
    ctx.fillStyle = "#4a2810"; rr(ctx, 42, 108, 296, 56, 5); ctx.fill(); // Tủ gỗ trưng bày
    ctx.strokeStyle = "#c99a5e"; ctx.lineWidth = 1.5; ctx.stroke();
    // 2 tầng kệ gỗ bóng có đèn LED rọi
    [132, 160].forEach((sy, tier) => {
      ctx.fillStyle = "#8d5b32"; ctx.fillRect(44, sy, 292, 4); // Mặt kệ gỗ
      // Đèn LED dải hắt sáng màu vàng ấm
      ctx.fillStyle = "rgba(255,235,160,0.35)"; ctx.fillRect(44, sy - 18, 292, 18);
    });
    // Gấu bông & quà tặng trên kệ tầng 1 (trên cùng)
    plush(80, 122, 22, "S+", t, true);          // Gấu S+ vàng kim
    plush(140, 122, 19, "S", t, true);           // Gấu S tím pastel
    plush(195, 122, 18, "B", t, false);          // Thỏ hồng
    plush(250, 122, 18, "A", t, false);          // Gấu xanh dương
    // Cúp vô địch vàng nhỏ ở góc kệ
    ctx.fillStyle = "#ffd166";
    ctx.beginPath(); ctx.moveTo(295, 114); ctx.lineTo(311, 114); ctx.lineTo(306, 126); ctx.lineTo(300, 126); ctx.closePath(); ctx.fill();
    ctx.fillRect(301, 126, 4, 5); ctx.fillRect(297, 131, 12, 2);
    ctx.fillStyle = "#ff4d6d"; ctx.font = "800 6px system-ui"; ctx.fillText("1ST", 303, 121);

    // Quà tặng trên kệ tầng 2
    plush(70, 150, 16, "C", t, false);           // Gấu nâu cổ điển
    plush(120, 150, 17, "B", t, false);          // Mèo hồng
    plush(175, 150, 17, "A", t, false);          // Cánh cụt xanh
    plush(230, 150, 17, "S", t, true);           // Gấu bông tím
    // Hộp quà thắt nơ lụa
    ctx.fillStyle = "#ff595e"; rr(ctx, 275, 142, 15, 14, 2); ctx.fill();
    ctx.fillStyle = "#ffd166"; ctx.fillRect(281, 142, 3, 14); ctx.fillRect(275, 148, 15, 3);
    ctx.fillStyle = "#4cc9f0"; rr(ctx, 298, 140, 17, 16, 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.fillRect(305, 140, 3, 16); ctx.fillRect(298, 147, 17, 3);

    // ---- Dãy máy game Arcade cổ điển ở hậu cảnh với màn hình nhấp nháy ----
    // Nhóm 1 (x: 350 - 425): Máy song đấu đối kháng + Máy bắn phi thuyền vũ trụ
    const drawCabinet = (x, y, w, h, title, themeCol, scrCol, gameType) => {
      // Bóng sàn máy arcade
      ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h + 2, w * 0.55, 5, 0, 0, 7); ctx.fill();
      // Thùng máy
      ctx.fillStyle = "#161622"; rr(ctx, x, y, w, h, 4); ctx.fill();
      ctx.strokeStyle = themeCol; ctx.lineWidth = 1.5; ctx.stroke();
      // Bảng tên Marquee phát sáng
      ctx.fillStyle = themeCol; rr(ctx, x + 3, y + 3, w - 6, 11, 2); ctx.fill();
      ctx.fillStyle = "#ffffff"; ctx.font = "900 6.5px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(title, x + w / 2, y + 8.5);
      // Màn hình CRT viền vát
      ctx.fillStyle = "#0a0a14"; rr(ctx, x + 3, y + 16, w - 6, 24, 2); ctx.fill();
      ctx.fillStyle = scrCol; ctx.fillRect(x + 5, y + 18, w - 10, 20); // Màn hình hiển thị
      // Nội dung màn hình nhấp nháy động
      if (gameType === "fight") {
        // Trò đối kháng: thanh máu + 2 đấu sĩ pixel
        ctx.fillStyle = "#ff4d6d"; ctx.fillRect(x + 6, y + 19, 8, 2);
        ctx.fillStyle = "#39ff88"; ctx.fillRect(x + w - 14, y + 19, 8, 2);
        const hit = (Math.floor(t * 4) % 2);
        ctx.fillStyle = "#ffd166"; ctx.fillRect(x + 8 + (hit ? 2 : 0), y + 27, 4, 8); // Đấu sĩ 1
        ctx.fillStyle = "#4cc9f0"; ctx.fillRect(x + w - 12 - (hit ? 2 : 0), y + 27, 4, 8); // Đấu sĩ 2
        if (Math.floor(t * 3) % 2) { ctx.fillStyle = "#ff0055"; ctx.font = "800 5px monospace"; ctx.fillText("K.O!", x + w / 2, y + 26); }
      } else if (gameType === "space") {
        // Bắn ruồi vũ trụ: phi thuyền pixel + đạn laze + quái vật
        ctx.fillStyle = "#39ff88"; ctx.fillRect(x + w / 2 - 2, y + 32, 4, 4); // Phi thuyền
        ctx.fillStyle = "#ffff00"; ctx.fillRect(x + w / 2 - 1, y + 26 - ((t * 40) % 12), 2, 4); // Đạn
        ctx.fillStyle = "#ff007f";
        for (let ei = 0; ei < 3; ei++) ctx.fillRect(x + 7 + ei * 7 + Math.sin(t * 4 + ei) * 2, y + 20, 3, 3); // Alien
      } else if (gameType === "race") {
        // Đua xe 3D: đường đua uốn lượn + xe đua pixel
        ctx.fillStyle = "#3a86ff"; ctx.fillRect(x + 5, y + 18, w - 10, 8); // Bầu trời
        ctx.fillStyle = "#333333"; ctx.fillRect(x + 5, y + 26, w - 10, 12); // Mặt đường
        ctx.fillStyle = "#ffffff"; ctx.fillRect(x + w / 2 - 1 + Math.sin(t * 3) * 4, y + 26, 2, 12); // Vạch kẻ đường
        ctx.fillStyle = "#ff0054"; ctx.fillRect(x + w / 2 - 3 + Math.sin(t * 3) * 3, y + 31, 6, 5); // Xe đua
      } else {
        // Game nhảy audition / âm nhạc: mũi tên nhảy lên
        const arrs = ["▲", "▼", "◀", "▶"];
        ctx.fillStyle = ["#ff595e", "#ffca3a", "#8ac926", "#1982c4"][Math.floor(t * 3) % 4];
        ctx.font = "8px system-ui"; ctx.fillText(arrs[Math.floor(t * 4) % 4], x + w / 2, y + 27);
        if (Math.floor(t * 3) % 2) { ctx.fillStyle = "#ffbe0b"; ctx.font = "800 5px monospace"; ctx.fillText("PERFECT", x + w / 2, y + 34); }
      }
      // Bàn điều khiển (control deck) nghiêng
      ctx.fillStyle = "#252538"; rr(ctx, x + 2, y + 42, w - 4, 10, 2); ctx.fill();
      // Cần gạt joystick đỏ + nút bấm
      ctx.fillStyle = "#ff0054"; ctx.beginPath(); ctx.arc(x + 8, y + 46, 2, 0, 7); ctx.fill();
      ctx.fillStyle = "#ffd166"; ctx.beginPath(); ctx.arc(x + w - 10, y + 45, 1.4, 0, 7); ctx.fill();
      ctx.fillStyle = "#00f5d4"; ctx.beginPath(); ctx.arc(x + w - 6, y + 47, 1.4, 0, 7); ctx.fill();
      // Cửa nhét xu (coin door) với 2 khe sáng đỏ
      ctx.fillStyle = "#11111a"; rr(ctx, x + 5, y + 54, w - 10, 14, 1); ctx.fill();
      ctx.fillStyle = "#ff3333"; ctx.fillRect(x + 8, y + 57, 4, 2); ctx.fillRect(x + w - 12, y + 57, 4, 2);
    };

    // 2 máy arcade bên trái cổng vòm (x: 350, 390)
    drawCabinet(350, 172, 34, 72, "BRAWL", "#7209b7", "#10002b", "fight");
    drawCabinet(390, 172, 34, 72, "GALAXY", "#00b4d8", "#03045e", "space");

    // 2 máy arcade bên phải cổng vòm (x: 700, 740)
    drawCabinet(700, 172, 34, 72, "TURBO", "#e63946", "#1d3557", "race");
    drawCabinet(740, 172, 34, 72, "DANCE", "#f72585", "#240046", "dance");

    // Máy đổi xu tự động (Token dispenser) đặt cạnh dãy gắp gấu
    ctx.fillStyle = "#2b2d42"; rr(ctx, 24, 200, 18, 44, 3); ctx.fill();
    ctx.strokeStyle = "#ffd166"; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = "#ffd166"; ctx.font = "800 6px monospace"; ctx.textAlign = "center"; ctx.fillText("XU", 33, 208);
    // Cửa kính nhìn thấy xu vàng bên trong
    ctx.fillStyle = "rgba(255,220,100,0.5)"; rr(ctx, 27, 212, 12, 14, 2); ctx.fill();
    ctx.fillStyle = "#d4a373"; ctx.fillRect(27, 230, 12, 8); // Khay trả xu
    drawSparkle(33, 234, 3, "#ffd166", t * 2);

    // ---- Dãy máy gắp gấu (trái) ----
    ctx.fillStyle = "#1b1b2f"; rr(ctx, 40, 170, 300, 22, 6); ctx.fill();                 // Bảng "gấu hiếm vừa gắp" chạy chữ
    ctx.save(); ctx.beginPath(); ctx.rect(44, 172, 292, 18); ctx.clip();
    ctx.fillStyle = "#39ff88"; ctx.font = "700 10px monospace"; ctx.textAlign = "left";
    const mw = ctx.measureText(st.marquee).width + 60, mx = 336 - ((t * 40) % (mw + 292));
    ctx.fillText(st.marquee, mx, 181); ctx.restore();
    CLAW_R.forEach((m, k) => {
      const {x, y, w, h} = m, vip = m.m === "vip";
      ctx.fillStyle = vip ? "#7b2cbf" : "#ff8fab"; rr(ctx, x, y, w, h, 8); ctx.fill();
      ctx.fillStyle = "rgba(220,245,255,.6)"; rr(ctx, x + 6, y + 8, w - 12, h * .55, 4); ctx.fill();
      const cage = (st.cages || {})[m.m] || [];
      cage.slice(0, 6).forEach((it, j) => plush(x + 12 + (j % 3) * (w - 24) / 2, y + h * .55 - (j < 3 ? 2 : 12), RANK[it.rank].size * .32, it.rank, t, true));
      ctx.strokeStyle = "#555"; ctx.lineWidth = 1; const cx = x + w / 2 + Math.sin(t * 1.3 + k) * (w * .3);
      ctx.beginPath(); ctx.moveTo(cx, y + 8); ctx.lineTo(cx, y + 22); ctx.stroke(); ctx.fillStyle = "#adb5bd"; ctx.fillRect(cx - 4, y + 22, 8, 3);
      ctx.fillStyle = "#222"; rr(ctx, x + 8, y + h * .7, w - 16, h * .22, 3); ctx.fill();
      ctx.fillStyle = "#ffd166"; ctx.font = "800 8px Nunito, system-ui"; ctx.textAlign = "center"; ctx.fillText(vip ? "CAO CẤP 30💰" : "GẮP GẤU 10💰", x + w / 2, y + h * .81);
      for (let b = 0; b < 5; b++) bulb(x + 8 + b * (w - 16) / 4, y + 3, on(b + k));
    });

    // ---- Bàn bầu cua (ở giữa sân y: 340) ----
    ctx.fillStyle = "rgba(0,0,0,.22)"; ctx.beginPath(); ctx.ellipse(560, 436, 148, 22, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#704124"; rr(ctx, 428, 338, 264, 98, 12); ctx.fill(); // Viền gỗ sơn mài
    ctx.strokeStyle = "#e9c46a"; ctx.lineWidth = 2; ctx.stroke(); // Viền chỉ vàng
    ctx.fillStyle = "#b21e27"; rr(ctx, 440, 348, 240, 78, 8); ctx.fill();                    // Chiếu hoa đỏ
    A.BC_FACES.forEach((f, k) => {
      const cx = 480 + (k % 3) * 80, cy = 369 + Math.floor(k / 3) * 38;
      ctx.fillStyle = "#fff8e7"; rr(ctx, cx - 34, cy - 15, 68, 33, 5); ctx.fill();
      ctx.strokeStyle = "#e9d8a6"; ctx.lineWidth = 1; ctx.stroke();
      ctx.font = "20px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(f.e, cx - 12, cy);
      ctx.fillStyle = "#7a1d1d"; ctx.font = "800 9px Nunito, system-ui"; ctx.fillText(f.name.toUpperCase(), cx + 16, cy);
      const tot = st.bc && st.bc.totals ? st.bc.totals[f.id] : 0;
      if (tot) {
        ctx.fillStyle = "#ffd166"; ctx.beginPath(); ctx.arc(cx + 26, cy - 12, 7, 0, 7); ctx.fill();
        ctx.fillStyle = "#5a3b00"; ctx.font = "800 6px system-ui"; ctx.fillText(tot > 999 ? "999+" : tot, cx + 26, cy - 12);
      }
    });
    // Chồng xu cược trang trí ở góc bàn
    [[438, 346, "#ffd166"], [680, 346, "#ff595e"], [438, 418, "#4cc9f0"], [680, 418, "#06d6a0"]].forEach(([cx, cy, col]) => {
      for (let ci = 0; ci < 3; ci++) {
        ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(cx, cy - ci * 3, 5, 2.5, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.2)"; ctx.lineWidth = 0.5; ctx.stroke();
      }
    });

    const bc = st.bc, rolling = bc && bc.phase === "roll";                                     // Bát + xúc xắc
    ctx.save(); ctx.translate(700, 360 + (rolling ? Math.sin(t * 30) * 2 : 0));
    ctx.fillStyle = "#f8f1e5"; ctx.beginPath(); ctx.ellipse(0, 12, 22, 7, 0, 0, 7); ctx.fill();
    if (!bc || bc.phase !== "result") {
      ctx.fillStyle = "#a26a42"; ctx.beginPath(); ctx.arc(0, 10, 18, Math.PI, 0); ctx.fill();
      ctx.fillStyle = "#ffd166"; ctx.fillRect(-4, -10, 8, 4);
    } else {
      bc.dice.forEach((d, k) => {
        ctx.fillStyle = "#fff"; rr(ctx, -19 + k * 13, 2, 11, 11, 2); ctx.fill();
        ctx.font = "9px system-ui"; ctx.textAlign = "center"; ctx.fillText(FACE[d].e, -13.5 + k * 13, 8);
      });
    }
    ctx.restore();
    if (bc) {
      ctx.fillStyle = "rgba(20,17,45,.88)"; rr(ctx, 500, 316, 120, 20, 8); ctx.fill();
      ctx.strokeStyle = "#ffd166"; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = "#ffd27a"; ctx.font = "800 10px Nunito, system-ui"; ctx.textAlign = "center";
      ctx.fillText(bc.phase === "bet" ? `⏳ Đặt cược ${Math.max(0, Math.ceil(bc.end - serverNow()))}s` : bc.phase === "roll" ? "🥣 Đang lắc bát…" : "🎉 Mở bát!", 560, 326);
    }

    // ---- Quầy quay thưởng + lồng cầu xổ số (phải) ----
    ctx.fillStyle = "#6b4a35"; ctx.fillRect(896, 230, 8, 70);
    ctx.save(); ctx.translate(900, 222); ctx.rotate(t * .6);
    for (let k = 0; k < 8; k++) {
      ctx.fillStyle = ["#ff8fab", "#ffd166", "#a0c4ff", "#90be6d", "#cdb4db", "#f4a261", "#4cc9f0", "#e63946"][k];
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 42, k * Math.PI / 4, (k + 1) * Math.PI / 4); ctx.fill();
    }
    ctx.restore(); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(900, 222, 7, 0, 7); ctx.fill();
    ctx.fillStyle = "#e63946"; ctx.beginPath(); ctx.moveTo(894, 175); ctx.lineTo(906, 175); ctx.lineTo(900, 186); ctx.fill();
    for (let k = 0; k < 16; k++) bulb(900 + Math.cos(k / 16 * 6.28) * 47, 222 + Math.sin(k / 16 * 6.28) * 47, on(k), "#fff3b0");
    ctx.strokeStyle = "#adb5bd"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(1010, 300, 24, 0, 7); ctx.stroke();      // Lồng cầu
    for (let k = 0; k < 8; k++) {
      const a = t * 3 + k * .8;
      ctx.fillStyle = ["#ff6b6b", "#ffd166", "#4cc9f0", "#90be6d"][k % 4];
      ctx.beginPath(); ctx.arc(1010 + Math.cos(a) * 14 * ((k % 3) / 3 + .4), 300 + Math.sin(a * 1.3) * 12, 3.4, 0, 7); ctx.fill();
    }
    ctx.fillStyle = "#6b4a35"; ctx.fillRect(1006, 324, 8, 22);
    ctx.fillStyle = "#fff"; rr(ctx, 790, 330, 260, 34, 6); ctx.fill();                      // Quầy, mái sọc
    for (let k = 0; k < 10; k++) { ctx.fillStyle = k % 2 ? "#e63946" : "#fff"; ctx.fillRect(790 + k * 26, 318, 26, 14); }
    ctx.fillStyle = "#3a0ca3"; ctx.font = "800 10px Nunito, system-ui"; ctx.textAlign = "center"; ctx.fillText("🎡 QUAY THƯỞNG · 🎫 XỔ SỐ 18:30", 920, 348);

    // ---- Đu quay ngựa gỗ (dưới trái) ----
    const carX = 150, carY = 470;
    ctx.fillStyle = "#f4a6c4"; ctx.beginPath(); ctx.moveTo(carX - 90, carY - 50); ctx.lineTo(carX, carY - 95); ctx.lineTo(carX + 90, carY - 50); ctx.fill();
    for (let k = 0; k < 9; k++) bulb(carX - 90 + k * 22.5, carY - 50, on(k));
    ctx.fillStyle = "#fff0f6"; ctx.fillRect(carX - 86, carY - 50, 172, 8);
    for (let k = 0; k < 4; k++) {
      const a = t * .8 + k * Math.PI / 2, hx = carX + Math.cos(a) * 70, hy = carY - 10 + Math.sin(a * 2) * 3;
      if (Math.sin(a) < -.2) continue;
      ctx.strokeStyle = "#ffd166"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(hx, carY - 42); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.font = "18px system-ui"; ctx.textAlign = "center"; ctx.fillText("🐴", hx, hy);
    }
    ctx.fillStyle = "#c9a36b"; ctx.beginPath(); ctx.ellipse(carX, carY + 14, 95, 14, 0, 0, 7); ctx.fill();

    // ---- Xe bán kẹo bông gòn chi tiết (dưới phải) ----
    const cartX = 960, cartY = 480;
    ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.beginPath(); ctx.ellipse(cartX + 30, cartY + 44, 45, 10, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#ffafcc"; rr(ctx, cartX, cartY, 70, 38, 8); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.fillRect(cartX + 6, cartY + 6, 58, 6);
    ctx.strokeStyle = "#8a5a3c"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cartX + 16, cartY + 38, 14, 0, 7); ctx.stroke();
    ctx.fillStyle = "#ffd166"; ctx.beginPath(); ctx.arc(cartX + 16, cartY + 38, 4, 0, 7); ctx.fill();
    for (let sp = 0; sp < 6; sp++) {
      const sa = sp / 6 * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cartX + 16, cartY + 38); ctx.lineTo(cartX + 16 + Math.cos(sa) * 14, cartY + 38 + Math.sin(sa) * 14); ctx.stroke();
    }
    ctx.fillStyle = "#555"; ctx.fillRect(cartX + 54, cartY + 36, 4, 8);
    ctx.fillStyle = "rgba(220,245,255,.6)"; rr(ctx, cartX + 8, cartY - 24, 54, 24, 6); ctx.fill();
    [["#ffb4d6", 18, -12], ["#a0c4ff", 35, -14], ["#fdffb6", 52, -11]].forEach(([c, cx, cy]) => {
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cartX + cx, cartY + cy, 9, 0, 7); ctx.arc(cartX + cx - 4, cartY + cy + 3, 7, 0, 7); ctx.arc(cartX + cx + 4, cartY + cy + 3, 7, 0, 7); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.fillRect(cartX + cx - 1, cartY + cy + 6, 2, 10);
    });
    ctx.beginPath(); ctx.moveTo(cartX - 4, cartY - 26); ctx.lineTo(cartX + 35, cartY - 42); ctx.lineTo(cartX + 74, cartY - 26); ctx.fill();
    for (let st = 0; st < 6; st++) {
      ctx.fillStyle = st % 2 ? "#ff70a6" : "#ffffff";
      ctx.fillRect(cartX - 4 + st * 13, cartY - 28, 13, 6);
    }
    ctx.fillStyle = "#c1121f"; ctx.font = "800 7px system-ui"; ctx.textAlign = "center"; ctx.fillText("🍭 KẸO BÔNG", cartX + 35, cartY + 22);

    // Chùm bóng bay bay bay
    for (let k = 0; k < 5; k++) {
      const bx = 1060 + Math.sin(t + k) * 4 + (k - 2) * 9, by = 400 - k % 3 * 12 + Math.sin(t * 1.4 + k) * 3;
      ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = .6; ctx.beginPath(); ctx.moveTo(bx, by + 8); ctx.lineTo(1060, 450); ctx.stroke();
      ctx.fillStyle = ["#ff6b6b", "#ffd166", "#4cc9f0", "#f72585", "#90be6d"][k]; ctx.beginPath(); ctx.ellipse(bx, by, 6, 8, 0, 0, 7); ctx.fill();
    }

    // Tia sáng đồng xu lấp lánh (coin sparkles) bay lơ lửng quanh khu vực trò chơi
    for (let sk = 0; sk < 7; sk++) {
      const sx = (260 + sk * 110 + Math.sin(t * 2 + sk) * 15);
      const sy = 280 + (sk % 3) * 60 + Math.cos(t * 1.8 + sk) * 10;
      const spR = 2.5 + Math.sin(t * 3 + sk) * 1.5;
      drawSparkle(sx, sy, spR, "#ffd166", t * 2 + sk);
      // Đồng xu vàng chibi nhỏ xoay tròn
      if (sk % 2 === 0) {
        ctx.fillStyle = "#ffd166"; ctx.beginPath(); ctx.ellipse(sx + 10, sy - 8, 3.5, 3.5 * Math.abs(Math.sin(t * 3 + sk)), 0, 0, 7); ctx.fill();
      }
    }
  }
  const CLAW_R = [{x: 46, y: 196, w: 66, h: 96, m: "normal"}, {x: 118, y: 196, w: 66, h: 96, m: "normal"},
                  {x: 196, y: 196, w: 66, h: 96, m: "vip"}, {x: 268, y: 196, w: 66, h: 96, m: "vip"}];
  const BC_R = {x: 430, y: 340, w: 290, h: 94}, WHEEL_R = {x: 780, y: 170, w: 280, h: 200};

  function drawStock(t) {                                     // 📈 sàn giao dịch chứng khoán 1000x600
    const {L, R, T, B} = bleed(), wv = R - L;
    const dk = Life.darkness(); // Mức độ tối trời từ 0 (ngày) đến 1 (đêm)

    // Sơn tường phía sau sàn giao dịch
    const g = ctx.createLinearGradient(0, T, 0, 165); g.addColorStop(0, "#081326"); g.addColorStop(1, "#122847");
    ctx.fillStyle = g; ctx.fillRect(L, T, wv, 165 - T);

    // ---- Cửa sổ kính panorama nhìn ra đường chân trời thành phố (City Skyline) theo ngày / đêm ----
    const winX = 18, winY = 14, winW = 148, winH = 144;
    ctx.save(); ctx.beginPath(); ctx.rect(winX, winY, winW, winH); ctx.clip();
    // Bầu trời thay đổi mượt mà theo Life.darkness()
    const skyG = ctx.createLinearGradient(winX, winY, winX, winY + winH);
    if (dk < 0.4) {
      // Ban ngày: trời xanh mát mẻ, mây trắng bồng bềnh
      skyG.addColorStop(0, "#4a90e2"); skyG.addColorStop(1, "#bfe3f7");
    } else if (dk < 0.7) {
      // Hoàng hôn: ráng hồng cam tím rực rỡ
      skyG.addColorStop(0, "#2c1654"); skyG.addColorStop(0.5, "#802265"); skyG.addColorStop(1, "#f39c6b");
    } else {
      // Ban đêm: trời đêm huyền bí, trăng sao lấp lánh
      skyG.addColorStop(0, "#050a18"); skyG.addColorStop(1, "#142143");
    }
    ctx.fillStyle = skyG; ctx.fillRect(winX, winY, winW, winH);

    // Mây trôi ban ngày / Sao lấp lánh ban đêm
    if (dk < 0.5) {
      // Mây trôi
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      const c1x = winX + ((t * 4 + 20) % (winW + 40)) - 30;
      ctx.beginPath(); ctx.arc(c1x, winY + 28, 12, 0, 7); ctx.arc(c1x + 10, winY + 24, 15, 0, 7); ctx.arc(c1x + 22, winY + 28, 11, 0, 7); ctx.fill();
    } else {
      // Ngôi sao đêm lấp lánh
      for (const s of winStars) {
        ctx.fillStyle = `rgba(255,255,255,${.3 + .5 * Math.sin(t * 3 + s.p)})`;
        ctx.fillRect(winX + s.x * winW, winY + s.y * 60, 1.5, 1.5);
      }
    }

    // Các tòa cao ốc tài chính (Skyscrapers) nhiều tầng lớp
    const buildings = [
      {w: 18, h: 65, spire: false}, {w: 22, h: 98, spire: true}, {w: 20, h: 80, spire: false},
      {w: 25, h: 120, spire: true}, {w: 19, h: 74, spire: false}, {w: 24, h: 104, spire: false},
      {w: 20, h: 58, spire: false}
    ];
    let bxCursor = winX + 2;
    buildings.forEach((bld, bi) => {
      const bh = bld.h, by = (winY + winH) - bh;
      // Thân cao ốc
      ctx.fillStyle = dk < 0.5 ? (bi % 2 ? "#577590" : "#43aa8b") : (bi % 2 ? "#1a2542" : "#131b33");
      ctx.fillRect(bxCursor, by, bld.w, bh);
      // Cột ăng-ten tháp tài chính có đèn đỏ nhấp nháy trên nóc
      if (bld.spire) {
        ctx.strokeStyle = "#8d99ae"; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(bxCursor + bld.w / 2, by); ctx.lineTo(bxCursor + bld.w / 2, by - 14); ctx.stroke();
        // Đèn đỏ hàng không chớp tắt
        ctx.fillStyle = (Math.floor(t * 2) % 2 === 0) ? "#ff3333" : "rgba(255,50,50,0.3)";
        ctx.beginPath(); ctx.arc(bxCursor + bld.w / 2, by - 14, 2, 0, 7); ctx.fill();
      }
      // Các ô cửa sổ văn phòng phát sáng
      const winRows = Math.floor(bh / 10) - 1;
      const winCols = Math.floor(bld.w / 6);
      for (let r = 0; r < winRows; r++) {
        for (let c = 0; c < winCols; c++) {
          const isLit = ((bi * 11 + r * 7 + c * 3) % 5 !== 0);
          if (dk < 0.5) {
            // Ban ngày: kính phản quang ánh trời
            ctx.fillStyle = "rgba(220,240,255,0.45)";
            ctx.fillRect(bxCursor + 2 + c * 5, by + 4 + r * 9, 3, 5);
          } else if (isLit) {
            // Ban đêm: ánh đèn văn phòng vàng ấm / xanh cyan
            ctx.fillStyle = (r + c + bi) % 3 === 0 ? "rgba(100,240,255,0.85)" : "rgba(255,225,120,0.9)";
            ctx.fillRect(bxCursor + 2 + c * 5, by + 4 + r * 9, 3, 5);
          }
        }
      }
      bxCursor += bld.w + 1;
    });

    // Vệt phản chiếu ánh sáng chéo trên mặt kính cửa sổ
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath(); ctx.moveTo(winX, winY); ctx.lineTo(winX + 45, winY); ctx.lineTo(winX + 15, winY + winH); ctx.lineTo(winX, winY + winH); ctx.fill();
    ctx.restore();

    // Khung cửa sổ kim loại kiên cố
    ctx.strokeStyle = "#c9d6e3"; ctx.lineWidth = 3; ctx.strokeRect(winX, winY, winW, winH);
    ctx.fillStyle = "#c9d6e3";
    ctx.fillRect(winX + winW / 2 - 1, winY, 2, winH); // Nan đứng
    ctx.fillRect(winX, winY + winH * 0.6, winW, 2);   // Nan ngang

    // ---- Bảng điện tử khổng lồ trên tường (Big Ticker Board with scrolling numbers) ----
    ctx.fillStyle = "#040711"; rr(ctx, 180, 14, 640, 128, 6); ctx.fill();
    ctx.strokeStyle = "#1d3557"; ctx.lineWidth = 3; ctx.stroke();
    // Viền LED xanh công nghệ cao
    ctx.strokeStyle = "rgba(56,189,248,0.4)"; ctx.lineWidth = 1;
    rr(ctx, 182, 16, 636, 124, 5); ctx.stroke();

    // Dải Ticker chạy chữ số chứng khoán scrolling numbers ở trên đỉnh bảng điện
    const tk = st.stk ? st.stk.tk : null;
    ctx.save(); ctx.beginPath(); ctx.rect(184, 17, 632, 14); ctx.clip();
    ctx.fillStyle = "#0a1124"; ctx.fillRect(184, 17, 632, 14);
    const tickTape = tk ? Object.entries(tk).map(([sym, o]) => {
      const chg = (o.p - o.prev) / o.prev * 100;
      return `${sym}: ${o.p.toFixed(2)} ${chg >= 0 ? "▲+" : "▼"}${chg.toFixed(1)}%`;
    }).join("    •    ") : "NONG: 15.20 ▲+3.4%    •    CAFE: 32.00 ▲+1.8%    •    THUY: 24.50 ▼-2.1%    •    DUOC: 45.00 ▲+0.5%    •    THEP: 28.60 ▲+4.2%";
    ctx.fillStyle = "#38bdf8"; ctx.font = "800 8.5px monospace"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    const ttw = ctx.measureText(tickTape).width + 80;
    const ttx = 816 - ((t * 40) % (ttw + 632));
    ctx.fillText(tickTape, ttx, 24);
    ctx.restore();

    // Lưới các mã chứng khoán chính (xanh tăng, đỏ giảm, vàng tham chiếu)
    if (tk) Object.entries(tk).forEach(([sym, s], k) => {
      const x = 192 + (k % 6) * 104, y = 34 + Math.floor(k / 6) * 50, ch = (s.p - s.prev) / s.prev * 100;
      const col = ch > .05 ? "#39ff88" : ch < -.05 ? "#ff4d5e" : "#ffd166";
      ctx.fillStyle = "#0c1220"; rr(ctx, x, y, 96, 43, 4); ctx.fill();
      ctx.fillStyle = "#e6edf3"; ctx.font = "800 11px monospace"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(sym, x + 6, y + 10);
      ctx.fillStyle = col; ctx.font = "800 13px monospace"; ctx.fillText(s.p.toFixed(2), x + 6, y + 26);
      ctx.font = "700 9px monospace"; ctx.textAlign = "right"; ctx.fillText(`${ch >= 0 ? "▲" : "▼"}${Math.abs(ch).toFixed(1)}%`, x + 92, y + 10);
      const h = st.hist[sym] || [];
      if (h.length > 2) {                                      // Biểu đồ đường nhỏ với vùng gradient
        const mn = Math.min(...h), mx = Math.max(...h) || 1;
        ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.beginPath();
        h.slice(-30).forEach((v, i, a) => {
          const px = x + 50 + i / (a.length - 1) * 42, py = y + 36 - (mx > mn ? (v - mn) / (mx - mn) : .5) * 14;
          i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        });
        ctx.stroke();
      }
    });
    else {
      ctx.fillStyle = "#39ff88"; ctx.font = "800 14px monospace"; ctx.textAlign = "center"; ctx.fillText("ĐANG KẾT NỐI BẢNG GIÁ…", 500, 78);
    }

    // Dòng tin tức chạy ngang trên tường (tin nóng tài chính)
    ctx.fillStyle = "#0a0f1d"; ctx.fillRect(180, 144, 640, 16);
    ctx.save(); ctx.beginPath(); ctx.rect(180, 144, 640, 16); ctx.clip();
    const news = (st.stk && st.stk.news || []).map(n => `${n.up ? "📈" : "📉"} ${n.sector}: ${n.text}`).join("    •    ") || "📰 Chào mừng tới sàn giao dịch ảo — mô phỏng để học, không phải lời khuyên đầu tư thật";
    ctx.fillStyle = "#ffd27a"; ctx.font = "700 10px Nunito, system-ui"; ctx.textAlign = "left";
    const nw = ctx.measureText(news).width + 80; ctx.fillText(news, 820 - ((t * 45) % (nw + 640)), 152); ctx.restore();

    // ---- Đồng hồ các trung tâm tài chính thế giới (World Financial Clocks) ----
    // Việt Nam (HOSE), New York (NYSE), London (LSE), Tokyo (TSE)
    const clkFull = Life.clockFull() || "12:00:00";
    const vnH = parseInt(clkFull.slice(0, 2)) || 12;
    const vnM = clkFull.slice(3, 5);
    const nyH = (vnH - 11 + 24) % 24;
    const lonH = (vnH - 7 + 24) % 24;
    const tokH = (vnH + 2) % 24;
    const worldClocks = [
      {city: "VN", flag: "🇻🇳", time: `${String(vnH).padStart(2, "0")}:${vnM}`, open: Boolean(st.stk && st.stk.open)},
      {city: "NY", flag: "🇺🇸", time: `${String(nyH).padStart(2, "0")}:${vnM}`, open: (nyH >= 9 && nyH < 16)},
      {city: "LD", flag: "🇬🇧", time: `${String(lonH).padStart(2, "0")}:${vnM}`, open: (lonH >= 8 && lonH < 16)},
      {city: "TK", flag: "🇯🇵", time: `${String(tokH).padStart(2, "0")}:${vnM}`, open: (tokH >= 9 && tokH < 15)}
    ];
    // Khung bảng đồng hồ thế giới ở góc phải
    ctx.fillStyle = "#0c1220"; rr(ctx, 846, 14, 116, 54, 6); ctx.fill();
    ctx.strokeStyle = "#2b3a55"; ctx.lineWidth = 1.5; ctx.stroke();
    worldClocks.forEach((c, idx) => {
      const cx = 852 + (idx % 2) * 56, cy = 25 + Math.floor(idx / 2) * 23;
      ctx.fillStyle = "#94a3b8"; ctx.font = "700 7.5px monospace"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillText(`${c.flag} ${c.city}`, cx, cy - 5);
      ctx.fillStyle = "#f8fafc"; ctx.font = "800 9.5px monospace";
      ctx.fillText(c.time, cx, cy + 6);
      // Đèn xanh nếu đang giờ giao dịch, cam nếu ngoài giờ
      ctx.fillStyle = c.open ? "#39ff88" : "#f59e0b";
      ctx.beginPath(); ctx.arc(cx + 46, cy, 2, 0, 7); ctx.fill();
    });

    // Bảng xếp hạng lãi cao nhất
    ctx.fillStyle = "#13233f"; rr(ctx, 846, 72, 116, 82, 6); ctx.fill();
    ctx.fillStyle = "#ffd27a"; ctx.font = "800 9px Nunito, system-ui"; ctx.textAlign = "center"; ctx.fillText("🏆 LÃI CAO NHẤT", 904, 84);
    ((st.stk && st.stk.leader) || []).slice(0, 4).forEach((r, k) => {
      ctx.fillStyle = "#e6edf3"; ctx.font = "700 8.5px Nunito, system-ui"; ctx.textAlign = "left";
      ctx.fillText(`${k + 1}. ${r.name}`.slice(0, 11), 852, 98 + k * 13);
      ctx.textAlign = "right"; ctx.fillStyle = r.pct >= 0 ? "#39ff88" : "#ff4d5e";
      ctx.fillText(`${r.pct >= 0 ? "+" : ""}${r.pct}%`, 956, 98 + k * 13);
    });
    drawSwitch(); // Công tắc đèn sàn

    // ---- Sàn đá hoa cương bóng phản chiếu ánh đèn (Reflective Granite Floor) ----
    for (let y = 160, r = 0; y < B; y += 40, r++) {
      for (let x = Math.floor(L / 80) * 80 + (r % 2 ? 40 : 0); x < R; x += 80) {
        ctx.fillStyle = (x / 80 + r) % 2 ? "#e9edf2" : "#dfe4ea"; ctx.fillRect(x, y, 80, 40);
      }
    }
    // Vệt bóng ánh sáng phản chiếu trần và bảng điện xuống sàn
    ctx.fillStyle = "rgba(255,255,255,.3)"; for (let k = 0; k < 6; k++) ctx.fillRect(60 + k * 180, 170, 30, 400);
    ctx.fillStyle = "rgba(56,189,248,0.06)"; ctx.fillRect(200, 170, 600, 260); // Ánh sáng xanh bảng điện hắt xuống sàn
    ctx.fillStyle = "#16303a"; ctx.fillRect(L, 158, wv, 6); // Len chân tường đá đen

    // ---- Bảng điện tử treo đầu trụ trung tâm (Central Trading Board) ----
    const midX = 370, midY = 210, midW = 260, midH = 58;
    ctx.fillStyle = "#05070d"; rr(ctx, midX, midY, midW, midH, 8); ctx.fill();
    ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 2.5; ctx.stroke();
    // Viền đèn LED nhấp nháy
    ctx.fillStyle = "#38bdf8"; ctx.font = "800 9px monospace"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText("📊 VN-INDEX 1,280.5 ▲+12.4 (1.0%)", midX + 10, midY + 16);
    ctx.fillStyle = "#e6edf3"; ctx.font = "700 8.5px monospace";
    ctx.fillText("📈 HNX: 235.8 ▲+2.1  •  UPCOM: 91.2", midX + 10, midY + 30);
    // Dòng chữ chạy giá các mã chính bên dưới bảng trung tâm
    ctx.save(); ctx.beginPath(); ctx.rect(midX + 6, midY + 40, midW - 12, 14); ctx.clip();
    const tickLine = tk ? Object.entries(tk).map(([m, o]) => `${m}: ${o.p.toFixed(1)}${(o.p >= o.prev) ? "▲" : "▼"}`).join("   ") : "NONG: 15.2▲   CAFE: 32.0▲   THUY: 24.5▼   DUOC: 45.0▲";
    ctx.fillStyle = "#39ff88"; ctx.font = "800 8.5px monospace"; ctx.textAlign = "left";
    const tlw = ctx.measureText(tickLine).width + 60;
    const tlx = (midX + midW - 6) - ((t * 40) % (tlw + midW - 12));
    ctx.fillText(tickLine, tlx, midY + 47);
    ctx.restore();
    // Đèn trạng thái live
    ctx.fillStyle = "#39ff88"; ctx.beginPath(); ctx.arc(midX + midW - 14, midY + 16, 4, 0, 7); ctx.fill();

    // ---- Quầy tư vấn (giữa) + cây cảnh văn phòng + góc cà phê lounge ----
    ctx.fillStyle = "#1d3557"; rr(ctx, 430, 280, 140, 36, 8); ctx.fill();
    ctx.strokeStyle = "#457b9d"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = "#ffd27a"; ctx.font = "800 9px Nunito, system-ui"; ctx.textAlign = "center"; ctx.fillText("💬 QUẦY TƯ VẤN ĐẦU TƯ", 500, 292);
    ctx.fillStyle = "rgba(168,218,220,0.5)"; ctx.fillRect(440, 302, 120, 10); // Vách ngăn kính mờ
    // Cây kim tiền mini trên bàn tư vấn
    ctx.fillStyle = "#e76f51"; rr(ctx, 444, 300, 8, 8, 2); ctx.fill();
    ctx.fillStyle = "#2d6a4f"; ctx.beginPath(); ctx.arc(448, 298, 4, 0, 7); ctx.arc(446, 295, 3, 0, 7); ctx.arc(450, 295, 3, 0, 7); ctx.fill();

    // Cây cảnh văn phòng hiện đại: Bàng Singapore, Lưỡi Hổ phong thủy
    drawOfficePlant(40, 532, "fig");         // Cây bàng Singapore góc trái
    drawOfficePlant(960, 532, "fig");        // Cây bàng Singapore góc phải
    drawOfficePlant(418, 280, "snake");      // Cây lưỡi hổ cạnh quầy tư vấn trái
    drawOfficePlant(582, 280, "snake");      // Cây lưỡi hổ cạnh quầy tư vấn phải
    drawOfficePlant(775, 528, "monstera");   // Cây trầu bà monstera cạnh sofa

    // Khu vực Sofa tiếp khách & đài Radio
    ctx.fillStyle = "#6b4a35"; rr(ctx, 800, 520, 150, 34, 10); ctx.fill();
    ctx.fillStyle = "#a47148"; rr(ctx, 806, 512, 138, 12, 6); ctx.fill();   // Tựa lưng sofa da
    ctx.fillStyle = "#3a3a46"; rr(ctx, RADIO.x - 4, RADIO.y + 24, RADIO.w + 8, 6, 2); ctx.fill();
    drawRadio(t);

    // Cà phê nóng bốc khói trên bàn kính
    ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = 1;
    for (let k = 0; k < 2; k++) {
      const ph = (t * .5 + k * .5) % 1;
      ctx.globalAlpha = Math.sin(ph * Math.PI);
      ctx.beginPath(); ctx.moveTo(918 + k * 4, 510 - ph * 10);
      ctx.quadraticCurveTo(921 + k * 4, 506 - ph * 10, 918 + k * 4, 502 - ph * 10); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.fillStyle = "#fff"; ctx.fillRect(914, 512, 10, 8); // Tách cà phê

    // Cột nước uống nóng lạnh văn phòng cạnh sofa
    ctx.fillStyle = "#e9ecef"; rr(ctx, 955, 492, 18, 48, 4); ctx.fill();
    ctx.fillStyle = "#00b4d8"; ctx.beginPath(); ctx.arc(964, 496, 6, 0, 7); ctx.fill(); // Bình nước khoáng xanh
    ctx.fillStyle = "#ff4d6d"; ctx.fillRect(960, 516, 2, 4); // Vòi nóng
    ctx.fillStyle = "#0077b6"; ctx.fillRect(966, 516, 2, 4); // Vòi lạnh

    // Băng tin tức chạy chữ dưới chân màn hình (tránh lối cửa thoát 476..524)
    ctx.fillStyle = "#0c1220"; ctx.fillRect(L, 570, wv, 15);
    ctx.fillStyle = "#ffd166"; ctx.fillRect(L, 569, wv, 1);
    ctx.save(); ctx.beginPath(); ctx.rect(L, 570, wv, 15); ctx.clip();
    const bottomNews = "🔴 TIN NÓNG: Lãi suất điều hành ổn định  •  🌾 Nhóm Nông sản xuất khẩu tăng mạnh  •  🐟 Ngư nghiệp đạt sản lượng kỷ lục  •  ⚡ Cổ phiếu năng lượng bứt phá phiên chiều  •  📊 Thị trường mở cửa từ 9h-15h thứ 2 tới thứ 6";
    ctx.fillStyle = "#ffffff"; ctx.font = "800 9px Nunito, system-ui"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    const bnw = ctx.measureText(bottomNews).width + 100;
    const bnx = R - ((t * 45) % (bnw + wv));
    ctx.fillText(bottomNews, bnx, 577);
    ctx.restore();
  }
  const BOARD_R = {x: 180, y: 14, w: 640, h: 146}, MID_BOARD_R = {x: 370, y: 210, w: 260, h: 58};

  function drawDating(t) {                                    // 💞 phố lãng mạn & hẹn hò 1120x600: hồ đèn hoa đăng
    const dk = Life.darkness(), {L, R, B} = bleed();
    // Bầu trời chuyển sắc hồng tím hoàng hôn đến đêm lãng mạn
    const g = ctx.createLinearGradient(0, -100, 0, 110);
    g.addColorStop(0, dk > .5 ? "#120a35" : "#5b3a8c"); g.addColorStop(1, dk > .5 ? "#4a2a6b" : "#ffb3c6");
    ctx.fillStyle = g; ctx.fillRect(L, -500, R - L, 610);
    for (const s of winStars) for (let k = 0; k < 4; k++) {
      ctx.fillStyle = `rgba(255,255,255,${(.3 + .4 * Math.sin(t * 2 + s.p + k)) * (dk > .5 ? 1 : .4)})`;
      ctx.fillRect(-200 + k * 380 + s.x * 380, -60 + s.y * 140, 1.5, 1.5);
    }
    // Trăng tròn vàng dịu tỏa sáng
    ctx.fillStyle = "#fff6c8"; ctx.beginPath(); ctx.arc(LAYOUT.moon.x, LAYOUT.moon.y, 16, 0, 7); ctx.fill();
    ctx.fillStyle = "rgba(255,246,200,0.18)"; ctx.beginPath(); ctx.arc(LAYOUT.moon.x, LAYOUT.moon.y, 24, 0, 7); ctx.fill();

    ctx.save(); ctx.translate(cam.x * .3, 0);                                                    // Đu quay nhỏ phát sáng ở xa
    for (let k = 0; k < 12; k++) {
      const a = t * .2 + k / 12 * 6.28; ctx.fillStyle = `hsl(${(k * 30 + t * 40) % 360},90%,70%)`;
      ctx.beginPath(); ctx.arc(1000 + Math.cos(a) * 34, 66 + Math.sin(a) * 34, 2.6, 0, 7); ctx.fill();
    }
    ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(1000, 66, 34, 0, 7); ctx.stroke();
    ctx.fillStyle = dk > .5 ? "#2a1d4a" : "#8e6fb3";
    for (let k = 0; k < 14; k++) { const h = 20 + (k * 29) % 40; ctx.fillRect(-150 + k * 100, 110 - h, 60, h); }
    ctx.restore();

    // ---- Hồ nước: phản chiếu hồng tím, gợn sóng, đèn hoa đăng trôi ----
    const wg = ctx.createLinearGradient(0, 105, 0, 255);
    wg.addColorStop(0, dk > .5 ? "#2b1e5a" : "#d291bc"); wg.addColorStop(1, dk > .5 ? "#140d33" : "#6a4c93");
    ctx.fillStyle = wg; ctx.fillRect(L, 105, R - L, 150);
    // Gợn sóng lăn tăn
    ctx.strokeStyle = "rgba(255,255,255,.22)";
    for (let k = 0; k < 30; k++) {
      const x = (k * 71 + t * 8) % (W + 40) - 20, y = 120 + (k * 37) % 120;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 16, y); ctx.stroke();
    }
    // Cánh hoa anh đào trôi trên mặt nước
    for (let pk = 0; pk < 12; pk++) {
      const px = ((pk * 93 + t * 14) % (W + 60)) - 30, py = 125 + (pk * 31) % 110;
      ctx.fillStyle = "rgba(255,182,193,0.75)";
      ctx.beginPath(); ctx.ellipse(px, py, 3.5, 2, Math.sin(t + pk), 0, 7); ctx.fill();
    }
    st.lanterns = st.lanterns.filter(l => l.base || t - l.t0 < 60);
    for (const l of st.lanterns) {
      const age = t - l.t0, x = ((l.x + age * 12) % (W + 80) + W + 80) % (W + 80) - 40, y = 230 - Math.min(1, age / 4) * 40 - (l.base ? 30 + (l.x % 50) : 0) + Math.sin(t + l.x) * 2;
      ctx.fillStyle = "rgba(255,190,90,.25)"; ctx.beginPath(); ctx.arc(x, y, 12, 0, 7); ctx.fill();
      ctx.fillStyle = "#ff8fab"; ctx.beginPath(); ctx.moveTo(x - 7, y + 3); ctx.lineTo(x, y - 7); ctx.lineTo(x + 7, y + 3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#ffd166"; ctx.beginPath(); ctx.arc(x, y + 1, 2.2, 0, 7); ctx.fill();
      ctx.fillStyle = "rgba(255,200,120,.25)"; ctx.fillRect(x - 1, y + 6, 2, 10);              // Bóng phản chiếu
    }

    // Cầu đôi cong qua hồ
    for (const bx of [470, 560]) {
      ctx.strokeStyle = "#f8d7e8"; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(bx + 45, 255, 50, Math.PI, 0); ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = 1.5;
      for (let k = 0; k <= 8; k++) {
        const a = Math.PI + k / 8 * Math.PI;
        ctx.beginPath(); ctx.moveTo(bx + 45 + Math.cos(a) * 50, 255 + Math.sin(a) * 50); ctx.lineTo(bx + 45 + Math.cos(a) * 50, 240 + Math.sin(a) * 50); ctx.stroke();
        bulb(bx + 45 + Math.cos(a) * 50, 238 + Math.sin(a) * 50, (Math.floor(t * 2) + k) % 2 === 0, "#ffb3c6");
      }
    }

    // Bờ hồ + lối đi lát đá hồng phấn
    ctx.fillStyle = "#e8c4d8"; ctx.fillRect(L, 252, R - L, 12);
    for (let y = 264, r = 0; y < B; y += 26, r++) {
      for (let x = Math.floor(L / 52) * 52 + (r % 2 ? 26 : 0); x < R; x += 52) {
        ctx.fillStyle = (r + x / 52) % 2 ? (dk > .5 ? "#4b3a66" : "#f7dce8") : (dk > .5 ? "#43345e" : "#f1cfe0");
        ctx.fillRect(x, y, 52, 26);
      }
    }

    // ---- Dây đèn Fairy lights lung linh giăng ngang qua các ngọn cây và phố ----
    const fairyLines = [
      {x1: 60, y1: 280, x2: 380, y2: 275, sag: 22},
      {x1: 380, y1: 275, x2: 800, y2: 280, sag: 30},
      {x1: 800, y1: 280, x2: 1070, y2: 275, sag: 24}
    ];
    fairyLines.forEach((fl, idx) => {
      ctx.strokeStyle = "rgba(180,140,160,0.5)"; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(fl.x1, fl.y1);
      ctx.quadraticCurveTo((fl.x1 + fl.x2) / 2, fl.y1 + fl.sag, fl.x2, fl.y2); ctx.stroke();
      const nDots = 16;
      for (let di = 1; di < nDots; di++) {
        const pr = di / nDots;
        const fx = fl.x1 + (fl.x2 - fl.x1) * pr;
        const fy = fl.y1 + (fl.y2 - fl.y1) * pr + Math.sin(pr * Math.PI) * fl.sag;
        const fcol = ["#ffd166", "#ff8fab", "#cdb4db", "#ffd6e0", "#a0c4ff"][(di + idx) % 5];
        bulb(fx, fy, (Math.floor(t * 3) + di + idx) % 3 !== 0, fcol);
      }
    });

    // Cây anh đào sakura nở rộ có dây đèn
    for (const [x, y] of [[60, 300], [380, 296], [800, 300], [1070, 296]]) {
      ctx.fillStyle = "#6b4a35"; ctx.fillRect(x - 4, y, 8, 40);
      ctx.fillStyle = "#f4a6c4"; ctx.beginPath(); ctx.arc(x, y - 6, 30, 0, 7); ctx.arc(x - 20, y + 6, 18, 0, 7); ctx.arc(x + 20, y + 6, 18, 0, 7); ctx.fill();
      for (let k = 0; k < 9; k++) bulb(x - 28 + k * 7, y - 6 + Math.sin(k) * 8, (Math.floor(t * 2) + k) % 3 > 0, "#fff3b0");
      for (let k = 0; k < 4; k++) {
        const ph = (t * .2 + k / 4 + x) % 1;
        ctx.fillStyle = `rgba(255,192,214,${1 - ph})`; ctx.fillRect(x - 20 + Math.sin(t + k) * 18, y + ph * 70, 2.4, 2.4);
      }
    }

    // Bụi hoa cẩm tú cầu (Hydrangea) nở dọc lối đi bờ hồ
    [260, 430, 730, 890].forEach((hx, hi) => {
      ctx.fillStyle = ["#b8c0ff", "#ffc6ff", "#ffd6e0", "#c8b6ff"][hi % 4];
      ctx.beginPath(); ctx.arc(hx, 260, 10, 0, 7); ctx.arc(hx - 6, 262, 7, 0, 7); ctx.arc(hx + 6, 262, 7, 0, 7); ctx.fill();
      ctx.fillStyle = "#52b788"; ctx.beginPath(); ctx.ellipse(hx, 266, 12, 3, 0, 0, 7); ctx.fill();
    });

    // ---- Quán Cà phê Hẹn hò lãng mạn (Romantic Café Look) & Tường Pastel ----
    // Tường pastel ấm áp với chỉ phào trang nhã
    ctx.fillStyle = "#ffcad4"; rr(ctx, 20, 294, 230, 76, 8); ctx.fill(); // Tường pastel hồng
    ctx.strokeStyle = "#f4a6b8"; ctx.lineWidth = 1.5; ctx.stroke();
    // Khung cửa sổ cà phê vòm kiểu Pháp lấp lánh nến
    ctx.fillStyle = "#ffe5ec"; rr(ctx, 32, 312, 60, 48, 6); ctx.fill();
    ctx.fillStyle = "rgba(255,230,160,0.4)"; rr(ctx, 36, 316, 52, 40, 4); ctx.fill(); // Ánh đèn vàng bên trong quán
    // Rèm ren mềm mại buộc nơ hồng
    ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(44, 322, 7, 0, 3.14); ctx.arc(80, 322, 7, 0, 3.14); ctx.stroke();
    // Bánh kem & tách trà trên bệ cửa sổ
    ctx.fillStyle = "#ff758f"; ctx.fillRect(58, 344, 8, 6); // Bánh dâu
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(62, 343, 2, 0, 7); ctx.fill();

    // Mái hiên sọc hồng pastel - trắng có rèm lượn sóng
    for (let k = 0; k < 9; k++) {
      ctx.fillStyle = k % 2 ? "#ff8fab" : "#fff0f5";
      ctx.fillRect(20 + k * 25.5, 290, 25.5, 15);
      // Rèm viền sóng uốn cong
      ctx.beginPath(); ctx.arc(20 + k * 25.5 + 12.75, 305, 5, 0, Math.PI); ctx.fill();
    }
    // Biển hiệu quán cà phê chữ vàng ánh kim
    ctx.fillStyle = "#592d1d"; rr(ctx, 104, 306, 90, 20, 6); ctx.fill();
    ctx.strokeStyle = "#ffd166"; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = "#ffd27a"; ctx.font = "800 9.5px Nunito, system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("☕ CÀ PHÊ ĐÔI 💕", 149, 316);

    // Bảng đen menu quán cà phê xinh xắn đặt trên giá vẽ
    ctx.fillStyle = "#2d3142"; rr(ctx, 106, 334, 46, 32, 3); ctx.fill();
    ctx.strokeStyle = "#8d5b4c"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.font = "700 6px Nunito, system-ui"; ctx.textAlign = "center";
    ctx.fillText("MENU TÌNH YÊU", 129, 342);
    ctx.fillStyle = "#ffd166"; ctx.fillText("Trà Đào 💕 Trà Sữa", 129, 350);
    ctx.fillText("Bánh Dâu 🍰", 129, 358);

    // Bàn cà phê ngoài trời (x: 70, 200) với khăn bàn ren, nến thơm và bình hoa
    for (const tx of [70, 200]) {
      // Mặt bàn tròn phủ khăn ren
      ctx.fillStyle = "rgba(0,0,0,0.15)"; ctx.beginPath(); ctx.ellipse(tx, 356, 20, 8, 0, 0, 7); ctx.fill(); // Bóng bàn
      ctx.fillStyle = "#fff8f0"; ctx.beginPath(); ctx.ellipse(tx, 350, 19, 7.5, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = "#ffccd5"; ctx.lineWidth = 1; ctx.stroke();
      // Chân bàn sắt uốn nghệ thuật
      ctx.strokeStyle = "#4a4e69"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(tx, 357); ctx.lineTo(tx, 370); ctx.lineTo(tx - 8, 374);
      ctx.moveTo(tx, 370); ctx.lineTo(tx + 8, 374); ctx.stroke();
      // Bình hoa tươi lãng mạn trên bàn
      drawFlowerVase(tx + 8, 348, t);
      // Nến cốc lung linh phát sáng
      ctx.fillStyle = "rgba(255,200,90,0.35)"; ctx.beginPath(); ctx.arc(tx - 7, 343, 6, 0, 7); ctx.fill();
      ctx.fillStyle = `rgba(255,200,90,${.8 + Math.sin(t * 8 + tx) * .2})`; ctx.beginPath(); ctx.arc(tx - 7, 343, 2.4, 0, 7); ctx.fill();
    }

    // ---- Photobooth & Bức tường ảnh kỷ niệm tình yêu (Photo Wall) ----
    ctx.fillStyle = "#c1121f"; rr(ctx, 650, 290, 70, 100, 6); ctx.fill(); ctx.fillStyle = "#ffafcc"; ctx.fillRect(656, 300, 58, 80);
    ctx.fillStyle = "#fff"; ctx.font = "800 9px Nunito, system-ui"; ctx.textAlign = "center"; ctx.fillText("📸 PHOTO", 685, 296);
    ctx.font = "18px system-ui"; ctx.fillText("💕", 685, 340);

    // BỨC TƯỜNG ẢNH KỶ NIỆM (Photo Wall đặt cạnh photobooth từ x: 730 đến 845)
    ctx.fillStyle = "#fdf0ed"; rr(ctx, 730, 292, 116, 78, 6); ctx.fill(); // Tấm bảng gỗ treo ảnh pastel
    ctx.strokeStyle = "#f3c68f"; ctx.lineWidth = 1.8; ctx.stroke();
    // Dây đèn fairy lights đan chéo trên tường ảnh
    ctx.strokeStyle = "rgba(220,160,140,0.6)"; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(734, 304); ctx.quadraticCurveTo(788, 316, 842, 304); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(734, 338); ctx.quadraticCurveTo(788, 348, 842, 338); ctx.stroke();
    for (let pi = 0; pi < 6; pi++) {
      bulb(742 + pi * 18, 308 + Math.sin(pi) * 3, (Math.floor(t * 3) + pi) % 2 === 0, "#ffd166");
      bulb(746 + pi * 17, 342 + Math.sin(pi + 1) * 3, (Math.floor(t * 3) + pi) % 2 !== 0, "#ff8fab");
    }
    // Biển chữ neon nhỏ trên tường ảnh
    ctx.fillStyle = "#ff758f"; ctx.font = "800 7px Nunito, system-ui"; ctx.textAlign = "center";
    ctx.fillText("KỶ NIỆM 💕 MEMORIES", 788, 300);

    // Các tấm ảnh Polaroid chụp đôi chibi ghim kẹp gỗ
    const polaroids = [
      {x: 742, y: 312, rot: -0.06, heart: "❤️"},
      {x: 775, y: 310, rot: 0.05, heart: "✨"},
      {x: 808, y: 312, rot: -0.04, heart: "🌹"},
      {x: 755, y: 342, rot: 0.04, heart: "☕"},
      {x: 792, y: 343, rot: -0.05, heart: "💖"}
    ];
    polaroids.forEach(p => {
      ctx.save(); ctx.translate(p.x + 11, p.y + 13); ctx.rotate(p.rot);
      // Khung giấy polaroid trắng
      ctx.fillStyle = "#ffffff"; rr(ctx, -11, -13, 22, 26, 2); ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.15)"; ctx.lineWidth = 0.5; ctx.stroke();
      // Lòng ảnh màu sắc phong cảnh
      ctx.fillStyle = "#ffd6e0"; ctx.fillRect(-9, -11, 18, 16);
      ctx.font = "9px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(p.heart, 0, -3);
      // Kẹp gỗ kẹp ảnh ở trên
      ctx.fillStyle = "#d4a373"; ctx.fillRect(-2, -15, 4, 4);
      ctx.restore();
    });

    // ---- Tiệm hoa tươi rực rỡ (phải) ----
    ctx.fillStyle = "#2d6a4f"; rr(ctx, 860, 312, 210, 60, 8); ctx.fill();
    for (let k = 0; k < 8; k++) { ctx.fillStyle = k % 2 ? "#90be6d" : "#fff"; ctx.fillRect(860 + k * 26.25, 302, 26.25, 14); }
    ctx.font = "14px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("🌹🌷🌻💐🌸", 965, 342);
    ctx.fillStyle = "#fff"; ctx.font = "800 9px Nunito, system-ui"; ctx.fillText("TIỆM HOA TÌNH YÊU", 965, 362);

    // Chậu hoa & giỏ hoa treo trang trí tiệm hoa
    for (let fx = 875; fx <= 1055; fx += 36) {
      ctx.fillStyle = "#c97a5e"; rr(ctx, fx - 7, 360, 14, 11, 2); ctx.fill();
      ctx.fillStyle = ["#ff70a6", "#ffbe0b", "#9b5de5", "#00bbf9", "#ff4d6d"][(fx / 36) % 5];
      ctx.beginPath(); ctx.arc(fx, 356, 5, 0, 7); ctx.arc(fx - 4, 358, 4, 0, 7); ctx.arc(fx + 4, 358, 4, 0, 7); ctx.fill();
    }

    // Giá vẽ của chú họa sĩ + loa nhạc
    ctx.fillStyle = "#6b4a35"; ctx.fillRect(330, 470, 3, 50); ctx.fillRect(350, 470, 3, 50);
    ctx.fillStyle = "#fff"; rr(ctx, 322, 456, 40, 32, 2); ctx.fill();
    ctx.fillStyle = "#ff8fab"; ctx.beginPath(); ctx.arc(336, 472, 6, 0, 7); ctx.fill();
    ctx.fillStyle = "#a0c4ff"; ctx.beginPath(); ctx.arc(348, 474, 6, 0, 7); ctx.fill();
    drawRadio(t);

    // ---- Chùm bóng bay trái tim (Heart Balloons) ----
    // Chùm 1 ở quán cà phê bên trái
    drawHeartBalloon(232, 318, "#ff758f", t, 0, 15);
    drawHeartBalloon(244, 312, "#ffb3c1", t, 1.2, 13);
    drawHeartBalloon(222, 314, "#c77dff", t, 2.5, 14);
    // Chùm 2 cạnh cầu đôi
    drawHeartBalloon(448, 260, "#ff4d6d", t, 0.8, 14);
    drawHeartBalloon(458, 254, "#ffd166", t, 1.9, 12);
    // Chùm 3 cạnh tường ảnh kỷ niệm
    drawHeartBalloon(736, 310, "#f72585", t, 1.5, 14);
    drawHeartBalloon(840, 308, "#4cc9f0", t, 2.8, 13);

    // ---- Nốt nhạc du dương bay lơ lửng (Soft music notes floating) ----
    const musicNotes = ["♪", "♫", "♬", "♩", "𝄞"];
    for (let k = 0; k < 6; k++) {
      const ph = (t * 0.08 + k / 6) % 1;
      const nx = (660 + Math.sin(t * 1.6 + k * 2) * 35 + (k % 2 === 0 ? -140 : 10) + (k * 65)) % 1120;
      const ny = 530 - ph * 260;
      ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.75;
      ctx.fillStyle = ["#ff9ebb", "#c8b6ff", "#b8f2e6", "#ffd166", "#ffc6ff"][k % 5];
      ctx.font = "bold 13px system-ui";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(musicNotes[k % musicNotes.length], nx, ny);
    }
    ctx.globalAlpha = 1;

    // Trái tim tình yêu bay lơ lửng nhẹ nhàng
    for (let k = 0; k < 8; k++) {
      const ph = (t * .08 + k / 8) % 1; ctx.globalAlpha = Math.sin(ph * Math.PI) * .7;
      ctx.font = "10px system-ui"; ctx.textAlign = "center";
      ctx.fillText("💗", (k * 149 + Math.sin(t + k) * 20) % W, 560 - ph * 300);
    }
    ctx.globalAlpha = 1;
  }
  const DUYEN_SPOTS = {booth: {x: 650, y: 290, w: 70, h: 100}, flower: {x: 860, y: 302, w: 210, h: 70}, lake: {x: 0, y: 105, w: 1120, h: 150}, cafe: {x: 20, y: 290, w: 230, h: 80}};

  function seat(i, t) {                                       // Ghế ngồi từng khu
    const b = BEDS[i], o = bedOwner(i), sit = o && o.lying;
    if (myArea === "stock") {                                 // Bàn giao dịch tài chính 2 màn hình hiện đại
      const x = b.x, y = b.y;
      // Bóng đổ của bàn giao dịch
      ctx.fillStyle = "rgba(0,0,0,.22)"; rr(ctx, x + 4, y + 14, 102, 44, 6); ctx.fill();
      // Mặt bàn làm việc bóng bẩy màu đá xám đen cao cấp
      ctx.fillStyle = "#1e293b"; rr(ctx, x + 2, y + 6, 106, 44, 6); ctx.fill();
      ctx.strokeStyle = "#334155"; ctx.lineWidth = 1.2; ctx.stroke();
      // Bàn di chuột dài (desk mat)
      ctx.fillStyle = "#0f172a"; rr(ctx, x + 10, y + 10, 90, 36, 4); ctx.fill();

      // 2 màn hình đồ họa chuyên nghiệp (màn hình 1: nến candlestick, màn hình 2: độ sâu lệnh/bảng giá)
      for (let k = 0; k < 2; k++) {
        const mx = x + 14 + k * 44, my = y + 8;
        ctx.fillStyle = "#020617"; rr(ctx, mx, my, 38, 26, 3); ctx.fill(); // Viền màn hình
        ctx.strokeStyle = "rgba(56,189,248,0.5)"; ctx.lineWidth = 0.8; ctx.stroke();
        if (k === 0) {
          // Màn hình 1: Biểu đồ nến Nhật xanh/đỏ + đường MA vàng
          ctx.fillStyle = "#090d16"; ctx.fillRect(mx + 2, my + 2, 34, 22);
          for (let ci = 0; ci < 5; ci++) {
            const cx = mx + 5 + ci * 6.5;
            const isUp = (ci + i) % 2 === 0;
            const cCol = isUp ? "#39ff88" : "#ff4d5e";
            // Râu nến
            ctx.strokeStyle = cCol; ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.moveTo(cx + 1.5, my + 5); ctx.lineTo(cx + 1.5, my + 19); ctx.stroke();
            // Thân nến
            ctx.fillStyle = cCol;
            ctx.fillRect(cx, my + (isUp ? 9 : 7), 3, 7);
          }
          // Đường xu hướng MA vàng
          ctx.strokeStyle = "#ffd166"; ctx.lineWidth = 1; ctx.beginPath();
          for (let j = 0; j < 6; j++) {
            const px = mx + 4 + j * 6, py = my + 14 + Math.sin(j * 1.3 + i + t * (sit ? 1 : 0)) * 4;
            j ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
          }
          ctx.stroke();
        } else {
          // Màn hình 2: Sổ lệnh & cột khối lượng mua bán
          ctx.fillStyle = "#0b1329"; ctx.fillRect(mx + 2, my + 2, 34, 22);
          for (let bi = 0; bi < 4; bi++) {
            ctx.fillStyle = "rgba(57,255,136,0.6)"; ctx.fillRect(mx + 4, my + 5 + bi * 4, 10 + (bi * 3) % 12, 2.5);
            ctx.fillStyle = "rgba(255,77,94,0.6)"; ctx.fillRect(mx + 20, my + 5 + bi * 4, 12 - (bi * 2) % 8, 2.5);
          }
        }
        // Đèn nguồn màn hình phát sáng
        ctx.fillStyle = "#38bdf8"; ctx.beginPath(); ctx.arc(mx + 19, my + 24.5, 0.8, 0, 7); ctx.fill();
        // Chân đế màn hình kim loại
        ctx.fillStyle = "#64748b"; ctx.fillRect(mx + 16, my + 26, 6, 2);
      }

      // Bàn phím cơ có đèn nền LED + chuột
      ctx.fillStyle = "#334155"; rr(ctx, x + 34, y + 36, 28, 9, 2); ctx.fill();
      ctx.fillStyle = "#38bdf8"; ctx.fillRect(x + 36, y + 38, 24, 1.5); // Đèn nền LED bàn phím
      ctx.fillStyle = "#64748b"; rr(ctx, x + 66, y + 37, 6, 8, 2); ctx.fill(); // Chuột máy tính

      // Ly cà phê gốm sứ văn phòng
      ctx.fillStyle = "#ffffff"; rr(ctx, x + 80, y + 36, 7, 8, 2); ctx.fill();
      ctx.fillStyle = "#78350f"; ctx.fillRect(x + 81, y + 37, 5, 2); // Nước cà phê

      // Ghế xoay công thái học (Ergonomic Office Chair)
      ctx.fillStyle = "#1d3557"; rr(ctx, x + 40, y + 58, 30, 24, 7); ctx.fill();
      ctx.strokeStyle = "#457b9d"; ctx.lineWidth = 1; ctx.stroke();
      if (sit) drawPlayer({...o, x: x + 55, y: y + 80 + Math.sin(t * 2 + i) * .4, walking: false, up: true, sit: true}, t);
      // Đệm ngồi phía trước
      ctx.fillStyle = "#274472"; rr(ctx, x + 37, y + 78, 36, 9, 4); ctx.fill();
      return;
    }

    const dating = myArea === "dating";
    if (dating) {
      // Ghế băng công viên tình nhân: đệm nhung hồng bọc nút, tay vịn gỗ
      ctx.fillStyle = "#ffafcc"; rr(ctx, b.x + 3, b.y + 5, BED_W - 6, 14, 6); ctx.fill();
      ctx.strokeStyle = "#ff758f"; ctx.lineWidth = 1; ctx.stroke();
      // Gối tựa lưng trái tim nhỏ xinh xắn
      drawHeart(b.x + BED_W / 2, b.y + 11, 8, "#ff4d6d");

      // Bàn trà nhỏ giữa mỗi cặp ghế đôi (i chẵn: 0, 2, 4) có bình hoa hồng và nến
      if (i % 2 === 0) {
        const tx = b.x + BED_W + 5, ty = b.y + 16;
        // Bàn tròn nhỏ
        ctx.fillStyle = "rgba(0,0,0,0.15)"; ctx.beginPath(); ctx.ellipse(tx, ty + 12, 10, 4, 0, 0, 7); ctx.fill();
        ctx.fillStyle = "#fff8f0"; ctx.beginPath(); ctx.ellipse(tx, ty + 8, 9, 4, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = "#ffccd5"; ctx.lineWidth = 0.8; ctx.stroke();
        // Bình hoa tươi nhỏ trên bàn đôi
        drawFlowerVase(tx, ty + 7, t);
        // Trái tim tình nhân kết nối giữa 2 bạn
        ctx.font = "11px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("💗", tx, ty - 12);
      }

      if (sit) drawPlayer({...o, x: b.x + BED_W / 2, y: b.y + 30, walking: false, up: false, sit: true}, t);
      // Đệm ngồi êm ái
      ctx.fillStyle = "#ff8fab"; rr(ctx, b.x, b.y + 22, BED_W, 12, 5); ctx.fill();
      ctx.fillStyle = "#704124"; ctx.fillRect(b.x + 8, b.y + 34, 4, 8); ctx.fillRect(b.x + BED_W - 12, b.y + 34, 4, 8);
    } else {
      // Ghế arcade retro: ghế đẩu quầy bar chân kim loại xoay
      ctx.fillStyle = "#4cc9f0"; rr(ctx, b.x + 4, b.y + 6, BED_W - 8, 12, 5); ctx.fill();
      ctx.strokeStyle = "#0077b6"; ctx.lineWidth = 1; ctx.stroke();
      if (sit) drawPlayer({...o, x: b.x + BED_W / 2, y: b.y + 30, walking: false, up: false, sit: true}, t);
      ctx.fillStyle = "#f72585"; rr(ctx, b.x, b.y + 22, BED_W, 12, 5); ctx.fill();
      ctx.fillStyle = "#adb5bd"; ctx.fillRect(b.x + 8, b.y + 34, 4, 8); ctx.fillRect(b.x + BED_W - 12, b.y + 34, 4, 8);
    }
  }

  function draw(t) {
    ({arcade: drawArcade, stock: drawStock, dating: drawDating})[myArea](t);
    if (myArea === "arcade" && st.arcadeSince && serverNow() - st.arcadeSince > 1800 && st.warned < st.arcadeSince) {   // nhắc nghỉ khi chơi lâu
      st.warned = serverNow(); toast("🍵 Bạn ở khu vui chơi 30 phút rồi, nghỉ tay chút nhé!");
    }
  }
  function over(t) {                                         // pháo giấy khi trúng lớn / kết đôi
    st.confetti = st.confetti.filter(c => t - c.t0 < 2.5);
    for (const c of st.confetti) { const a = t - c.t0; ctx.fillStyle = c.c; ctx.save(); ctx.translate(c.x + c.vx * a, c.y + c.vy * a + 60 * a * a); ctx.rotate(a * 6 + c.x); ctx.fillRect(-2, -1, 4, 2); ctx.restore(); }
  }
  function confetti(x, y) {
    const t = performance.now() / 1000;
    for (let k = 0; k < 60; k++) st.confetti.push({x, y, t0: t, vx: (Math.random() - .5) * 160, vy: -60 - Math.random() * 110, c: ["#ff4d6d", "#ffd166", "#4cc9f0", "#90be6d", "#c77dff"][k % 5]});
  }
  function holes(hole, t) {
    if (myArea === "arcade") {
      // Giữ nguyên các lỗ sáng ban đêm hiện có
      hole(560, 360, 640, .55); hole(560, 330, 200, .6); hole(560, 120, 170, .8);
      hole(150, 440, 110, .7); hole(900, 222, 90, .8); hole(190, 240, 120, .6);
      // Lỗ sáng mới cho khu trò chơi: máy arcade, kệ gấu bông, biển neon, xe kẹo bông
      hole(370, 215, 90, .7);   // Máy arcade cổ điển 1 & 2
      hole(720, 215, 90, .7);   // Máy arcade cổ điển 3 & 4
      hole(190, 135, 130, .65); // Kệ gấu bông và biển Arcade Zone
      hole(920, 135, 110, .65); // Biển Lucky Prizes
      hole(980, 480, 90, .6);   // Xe kẹo bông phát sáng
      hole(560, 50, 120, .75);  // Biển neon vòm trung tâm
    }
    if (myArea === "stock") {
      // Lỗ sáng sàn chứng khoán ban đêm: bảng điện tử, cửa sổ thành phố, đồng hồ thế giới, bàn giao dịch
      hole(500, 80, 420, .85);  // Bảng điện tử lớn HOSE
      hole(500, 235, 190, .75); // Bảng điện tử trung tâm
      hole(95, 90, 110, .6);    // Cửa sổ ngắm thành phố đêm
      hole(915, 80, 130, .7);   // Đồng hồ các thủ phủ tài chính & BXH
      hole(210, 330, 120, .6);  // Cụm bàn giao dịch trái trên
      hole(670, 330, 120, .6);  // Cụm bàn giao dịch phải trên
      hole(210, 450, 120, .6);  // Cụm bàn giao dịch trái dưới
      hole(670, 450, 120, .6);  // Cụm bàn giao dịch phải dưới
      hole(500, 298, 100, .55); // Quầy tư vấn
    }
    if (myArea === "dating") {
      // Giữ nguyên các lỗ sáng ban đêm hiện có
      hole(560, 420, 620, .35); hole(600, 200, 220, .55);
      for (const [x, y] of [[60, 300], [380, 296], [800, 300], [1070, 296]]) hole(x, y, 70, .75);
      hole(135, 340, 90, .6);
      // Lỗ sáng mới cho khu hẹn hò: tường ảnh kỷ niệm, tiệm hoa, cầu đôi, nến bàn đôi
      hole(788, 335, 100, .7);  // Tường ảnh kỷ niệm & đèn fairy lights
      hole(965, 340, 110, .65); // Tiệm hoa đêm
      hole(515, 240, 110, .7);  // Đèn cầu đôi
      hole(200, 350, 80, .65);  // Bàn nến cà phê
      hole(245, 435, 60, .6);   // Nến bàn đôi 1
      hole(605, 435, 60, .6);   // Nến bàn đôi 2
      hole(955, 435, 60, .6);   // Nến bàn đôi 3
    }
  }

  // ---------- 4. Chạm vào cảnh ----------
  function tap(x, y) {
    if (myArea === "arcade") {
      const m = CLAW_R.find(r => inRect(x, y, r, 4)); if (m) { openClaw(m.m); return true; }
      if (inRect(x, y, BC_R, 6)) { openBC(); return true; }
      if (inRect(x, y, WHEEL_R)) { openLotto(); return true; }
    } else if (myArea === "stock") {
      if (inRect(x, y, BOARD_R) || inRect(x, y, MID_BOARD_R)) { openStock(); return true; }
    } else if (myArea === "dating") {
      if (inRect(x, y, DUYEN_SPOTS.booth)) { photobooth(); return true; }
      if (inRect(x, y, DUYEN_SPOTS.flower)) { openDating("pair"); return true; }
      if (inRect(x, y, DUYEN_SPOTS.lake)) { lantern(); return true; }
    }
    return false;
  }
  function act() { if (myArea === "arcade") openBC(); else if (myArea === "stock") openStock(); else if (myArea === "dating") openDating(); }
  function npcAct(a) {
    ({baucua: openBC, lottery: openLotto, bear: openBear, stock: openStock, news: () => { const n = st.stk && st.stk.news[0]; toast(n ? `📰 ${n.sector}: ${n.text}` : "📰 Chưa có tin mới, lát quay lại nha!"); },
      duyen: () => openDating(), flowers: () => openDating("pair"), painter: photobooth})[a]?.();
  }
  const actLabel = a => ({arcade: "🎲 Bầu cua", stock: "📈 Giao dịch", dating: "💞 Hẹn hò"})[a];

  // ---------- 5. Bảng: 🎲 Bầu cua tôm cá ----------
  function bcHtml() {
    const bc = st.bc;
    if (!bc) return `<div class="vol">Đang kết nối bàn…</div>`;
    const left = Math.max(0, Math.ceil(bc.end - serverNow()));
    const phase = bc.phase === "bet" ? (bc.players ? `⏳ Đặt cược: còn <b>${left}s</b>` : `⏳ Chờ người đặt cược đầu tiên…`) : bc.phase === "roll" ? "🥣 Anh Tí đang lắc bát…" : "🎉 Mở bát!";
    const dice = bc.phase === "result" ? `<div class="bcDice">${bc.dice.map(d => `<span>${FACE[d].e}</span>`).join("")}</div>` : `<div class="bcDice ${bc.phase === "roll" ? "shake" : ""}"><span>🥣</span></div>`;
    return `<div class="pomoSub" style="margin:0 0 6px">${phase} · phiên ${bc.round} · 💰 ${fmt(S().coins)} xu</div>${dice}
      <div class="bcGrid">${A.BC_FACES.map(f => { const n = bc.phase === "result" ? bc.dice.filter(d => d === f.id).length : 0;
        return `<button class="bcCell ${n ? "hit" : ""}" data-face="${f.id}" ${bc.phase !== "bet" ? "disabled" : ""}><b>${f.e}</b><span>${f.name}</span>
          <small>Tổng ${fmt(bc.totals[f.id] || 0)}${bc.mine[f.id] ? ` · <em>bạn ${bc.mine[f.id]}</em>` : ""}</small>${n ? `<i>×${n}</i>` : ""}</button>`; }).join("")}</div>
      <div class="timers" style="grid-template-columns:repeat(5,1fr);margin-top:8px">${[5, 10, 20, 50, 100].map(c => `<button data-chip="${c}" class="${st.chip === c ? "cur" : ""}">${c} 💰</button>`).join("")}</div>
      ${bc.wins && bc.wins.length && bc.phase === "result" ? `<div class="vol" style="margin:6px 0 0">🏅 ${bc.wins.map(([n, w]) => `${esc(n)} +${w}`).join(" · ")}</div>` : ""}
      <div class="sec">📜 10 phiên gần nhất</div><div class="bcHist">${(bc.hist || []).map(h => `<span>${h.map(d => FACE[d].e).join("")}</span>`).join("") || "<small>chưa có</small>"}</div>
      <details class="rules"><summary>ℹ️ Luật chơi & tỉ lệ</summary>Đặt cược trong ${A.BC_BET_SEC} giây → lắc 3 xúc xắc → mở bát. Ô xuất hiện <b>k</b> con (k = 1, 2, 3) thì nhận lại tiền cược + <b>k lần</b> tiền cược; ô không xuất hiện thì mất cược.
        Mỗi mặt xúc xắc có tỉ lệ 1/6, do server tung ngẫu nhiên. Cược ${A.BC_MIN}–${A.BC_MAX} xu mỗi phiên, thua tối đa ${A.DAILY_LOSS_LIMIT} xu mỗi ngày. Xu chỉ là xu ảo trong game.</details>`;
  }
  function openBC() {
    if (myArea !== "arcade") { toast("🎲 Bàn bầu cua ở 🎪 khu vui chơi"); return; }
    st.panel = "bc";
    openSheet("🎲 Bầu cua tôm cá · Anh Tí", `<div id="bcBox">${bcHtml()}</div>`, bindBC);
  }
  function bindBC(el) {
    el.querySelectorAll("[data-chip]").forEach(b => b.onclick = () => { st.chip = +b.dataset.chip; refreshBC(); });
    el.querySelectorAll("[data-face]").forEach(b => b.onclick = async () => { Sound.ensure(); if (await eco("bcBet", {face: b.dataset.face, amt: st.chip})) { Sound.tone && Sound.ctx && Sound.tone(Sound.master, 660, Sound.ctx.currentTime, .08, "triangle", .05); } });
  }
  function refreshBC() {
    const box = document.getElementById("bcBox");
    if (box && st.panel === "bc" && !$("#sheet").classList.contains("hidden")) { const open = box.querySelector("details")?.open; box.innerHTML = bcHtml(); if (open) box.querySelector("details").open = true; bindBC(box); }
  }
  setInterval(() => { if (st.bc && st.bc.phase === "bet") refreshBC(); }, 1000);

  // ---------- 6. Bảng: 🧸 Máy gắp gấu (móc tự lắc, bấm GẮP đúng lúc) ----------
  let claw = null;
  async function openClaw(m) {
    if (myArea !== "arcade") return;
    const r = await eco("clawCage", {m}); if (!r) return;
    const M = A.CLAW_MACHINES.find(x => x.id === m);
    st.cages = {...(st.cages || {}), [m]: r.cage};
    claw = {m, cage: r.cage, x0: performance.now(), phase: "move", x: .5, y: 0, held: null, msg: "", raf: 0, miss: r.miss};
    st.panel = "claw";
    openSheet(`🧸 ${M.name} · ${M.price} xu/lượt`,
      `<div class="tabs" style="margin-top:0">${A.CLAW_MACHINES.map(x => `<button data-m="${x.id}" class="${x.id === m ? "cur" : ""}">${x.id === "vip" ? "💎" : "🧸"}<span>${x.name} · ${x.price}💰</span></button>`).join("")}</div>
       <canvas id="clawCv" width="640" height="420" style="width:100%;max-width:340px;display:block;margin:0 auto;border-radius:14px;background:#1d1a38"></canvas>
       <div class="pomoSub" id="clawMsg" style="margin:6px 0">Móc đang lắc qua lại · bấm <b>GẮP</b> khi móc ở ngay trên con gấu bạn muốn!</div>
       <button class="primary" id="clawGo" style="margin-top:0">🕹️ GẮP (${M.price} 💰)</button>
       <details class="rules"><summary>ℹ️ Tỉ lệ công khai</summary><table class="rtab"><tr><th>Hạng</th><th>Xuất hiện</th><th>Giữ chặt</th><th>Bác Gấu mua</th><th>Điểm trang trí</th></tr>
       ${A.CLAW_RANKS.map(r => `<tr><td style="color:${r.color};font-weight:800">${r.rank}</td><td>${r.appear}%</td><td>${Math.round(r.grip * 100 * M.grip)}%</td><td>${r.sell} xu</td><td>${r.deco}</td></tr>`).join("")}</table>
       Xác suất gắp được = độ canh trúng × độ giữ chặt. Trượt ${A.PITY_EVERY} lượt liên tiếp thì độ giữ chặt +${Math.round(A.PITY_BONUS * 100)}% (không bảo đảm ra hạng cao). Đang trượt liên tiếp: ${r.miss}.</details>`,
      el => {
        el.querySelectorAll("[data-m]").forEach(b => b.onclick = () => { cancelAnimationFrame(claw.raf); openClaw(b.dataset.m); });
        el.querySelector("#clawGo").onclick = () => grab(el);
        loop();
      });
  }
  function clawDraw() {
    const cv = document.getElementById("clawCv"); if (!cv || !claw) return false;
    const c = cv.getContext("2d"), saved = ctx, t = performance.now() / 1000;
    c.setTransform(2, 0, 0, 2, 0, 0); c.clearRect(0, 0, 320, 210);
    const g = c.createLinearGradient(0, 0, 0, 210); g.addColorStop(0, "#cfe8ff"); g.addColorStop(1, "#a9c7ff"); c.fillStyle = g; c.fillRect(10, 10, 300, 190);
    c.fillStyle = "#ffd6e7"; c.fillRect(250, 150, 60, 50); c.fillStyle = "#c1121f"; c.font = "800 9px Nunito"; c.textAlign = "center"; c.fillText("LỐI RA", 280, 196);
    ctx = c;
    try {
      claw.cage.forEach((it, k) => { if (claw.held && claw.held.id === it.id) return; plush(20 + it.x * 220, 182 - (k % 2) * 16, RANK[it.rank].size * .55, it.rank, t, true); });
      if (claw.phase === "move") claw.x = .5 + .48 * Math.sin((performance.now() - claw.x0) / 1000 * 1.9);
      const cx = 20 + claw.x * 220, cy = 18 + claw.y * 150;
      c.strokeStyle = "#555"; c.lineWidth = 2; c.beginPath(); c.moveTo(cx, 10); c.lineTo(cx, cy); c.stroke();
      c.fillStyle = "#6c757d"; c.fillRect(cx - 9, cy, 18, 5);
      const open = claw.phase === "down" ? 9 : 4;
      c.strokeStyle = "#495057"; c.lineWidth = 2.4; c.beginPath(); c.moveTo(cx - 7, cy + 5); c.lineTo(cx - open, cy + 16); c.moveTo(cx + 7, cy + 5); c.lineTo(cx + open, cy + 16); c.stroke();
      if (claw.held) plush(cx, cy + 22, RANK[claw.held.rank].size * .55, claw.held.rank, t, true);
    } finally { ctx = saved; }
    c.fillStyle = "rgba(255,255,255,.25)"; c.fillRect(14, 12, 6, 186);
    return true;
  }
  function loop() { if (!clawDraw()) return; claw.raf = requestAnimationFrame(loop); }
  function tween(obj, key, to, ms) { return new Promise(res => { const from = obj[key], t0 = performance.now(); const f = () => { const k = Math.min(1, (performance.now() - t0) / ms); obj[key] = from + (to - from) * k; k < 1 ? requestAnimationFrame(f) : res(); }; f(); }); }
  async function grab(el) {
    if (!claw || claw.phase !== "move") return;
    claw.phase = "down"; const x = claw.x;
    const go = el.querySelector("#clawGo"); go.disabled = true;
    const pr = eco("clawPlay", {m: claw.m, x});
    await tween(claw, "y", 1, 650);
    const r = await pr;
    if (!r) { claw.phase = "move"; claw.y = 0; go.disabled = false; return; }
    const target = claw.cage.find(it => it.id === r.id);
    if ((r.r === "win" || r.r === "drop") && target) claw.held = target;
    claw.phase = "up";
    if (r.r === "drop") { await tween(claw, "y", .55, 450); claw.held = null; el.querySelector("#clawMsg").innerHTML = "😱 Gấu bị rớt giữa đường! Tiếc quá…"; await tween(claw, "y", 0, 300); }
    else { await tween(claw, "y", 0, 700); }
    if (r.r === "win") {
      await tween(claw, "x", .94, 500); claw.held = null;
      el.querySelector("#clawMsg").innerHTML = `🎉 Gắp được <b style="color:${RANK[r.rank].color}">gấu hạng ${r.rank}</b>! Đã cất vào 🎒 túi (bán cho Bác Gấu hoặc bày trong nhà)`;
      if (r.rank === "S" || r.rank === "S+") confetti(me().x, me().y - 60);
    } else if (r.r === "miss") el.querySelector("#clawMsg").innerHTML = "😢 Trượt rồi, canh lại nhé!";
    claw.cage = r.cage; st.cages[claw.m] = r.cage;
    claw.phase = "move"; claw.x0 = performance.now() - Math.asin(Math.max(-1, Math.min(1, (claw.x - .5) / .48))) / 1.9 * 1000;
    go.disabled = false;
  }

  // ---------- 7. Bảng: 🧸 Bác Gấu (bán gấu) · 🎡 Chị Hoa (quay thưởng + xổ số) ----------
  async function openBear() {
    if (myArea !== "arcade") return;
    const r = await eco("plushPrices"); if (!r) return;
    const have = A.CLAW_RANKS.map(x => ({...x, n: (S().inv["f_plush_" + x.rank.replace("+", "P")] || {}).n || 0}));
    openSheet("🧸 Bác Gấu mua gấu bông",
      `${Life.coinLine()}<div class="board">${have.map(x => `<div><span style="color:${x.color};font-weight:800">Hạng ${x.rank}</span><span>có ${x.n} · giá hôm nay <b>${r.prices[x.rank]} 💰</b>
        ${x.n ? `<button class="mini" data-sell="${x.rank}">Bán 1</button>` : ""}</span></div>`).join("")}</div>
       <div class="vol" style="font-size:12px">Giá thay đổi nhẹ mỗi ngày. Gấu cũng có thể mang về 🏠 nhà riêng (🛋️ Bày đồ) để trang trí: hạng càng cao gấu càng to.</div>`,
      el => el.querySelectorAll("[data-sell]").forEach(b => b.onclick = async () => { const s = await eco("sellPlush", {rank: b.dataset.sell}); if (s) { toast(`💰 Bán gấu ${b.dataset.sell} được ${s.price} xu`); openBear(); } }));
  }
  async function openLotto() {
    if (myArea !== "arcade") return;
    const r = await eco("lottoStatus"); if (!r) return;
    const today = Life.today();
    const mine = r.tickets.slice().reverse();
    openSheet("🎡 Quầy quay thưởng · Chị Hoa",
      `${Life.coinLine()}<button class="opt" id="lwheel" style="width:100%;text-align:center">🎡 Vòng quay may mắn (1 lượt miễn phí mỗi ngày)</button>
       <div class="sec">🎫 Xổ số cộng đồng · quay lúc ${r.draw_time} mỗi ngày (giờ VN)</div>
       <div class="lottoBall">${r.today ? [...r.today].map(d => `<span>${d}</span>`).join("") : `<em>🎰 Chưa quay · ${r.draw_time}</em>`}</div>
       <div class="ytrow"><input id="lnum" maxlength="3" inputmode="numeric" placeholder="Chọn 3 số (bỏ trống = ngẫu nhiên)"><button id="lbuy">Mua vé ${r.price} 💰</button></div>
       <div class="board">${mine.length ? mine.map(x => `<div><span>🎫 <b>${x.n}</b> · ${x.d === today ? "hôm nay" : x.d.slice(5)}</span><span>${!x.w ? "⏳ chờ quay" : x.prize ? `🎉 ${x.pname} <b>+${x.prize}</b>${x.c ? " ✓" : ""}` : `kết quả ${x.w} · không trúng`}</span></div>`).join("") : `<div><span>Chưa có vé nào</span></div>`}</div>
       <button class="opt" id="lclaim" style="width:100%;text-align:center;margin-top:8px">💰 Nhận thưởng vé trúng</button>
       <details class="rules"><summary>ℹ️ Giải thưởng & tỉ lệ</summary>${r.prizes.map(p => `${p.name}: <b>${p.coins} xu</b> (tỉ lệ ${p.match === 3 ? "1/1000" : p.match === 2 ? "9/1000" : "90/1000"})`).join("<br>")}<br>Tối đa ${r.max} vé/ngày, nhận thưởng trong 7 ngày. Server quay số ngẫu nhiên.</details>`,
      el => {
        el.querySelector("#lwheel").onclick = () => Life.spinWheel ? Life.spinWheel() : toast("Vòng quay đang bận");
        el.querySelector("#lbuy").onclick = async () => { const n = el.querySelector("#lnum").value.trim(); const b = await eco("lottoBuy", {n}); if (b) { toast(`🎫 Đã mua vé ${b.n}`); openLotto(); } };
        el.querySelector("#lclaim").onclick = async () => { const c = await eco("lottoClaim"); if (c) { toast(`🎉 Nhận ${c.total} xu!`); confetti(me().x, me().y - 60); openLotto(); } };
      });
  }

  // ---------- 8. Bảng: 📈 Giao dịch chứng khoán ----------
  async function openStock(tab) {
    if (myArea !== "stock") { toast("📈 Giao dịch ở khu chứng khoán"); return; }
    if (tab) st.stkTab = tab;
    const r = await eco("stkState"); if (!r) return;
    st.stk = {...(st.stk || {}), ...r}; st.hist = r.hist || st.hist; st.panel = "stock";
    renderStock();
  }
  function spark(cv, h, col) {
    const c = cv.getContext("2d"), w = cv.width, ht = cv.height; c.clearRect(0, 0, w, ht);
    if (!h || h.length < 2) return;
    const mn = Math.min(...h), mx = Math.max(...h);
    c.strokeStyle = col; c.lineWidth = 3; c.beginPath();
    h.forEach((v, i) => { const x = i / (h.length - 1) * w, y = ht - 8 - (mx > mn ? (v - mn) / (mx - mn) : .5) * (ht - 16); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke();
    c.lineTo(w, ht); c.lineTo(0, ht); c.closePath(); c.fillStyle = col === "#39ff88" ? "rgba(57,255,136,.12)" : "rgba(255,77,94,.12)"; c.fill();
  }
  function renderStock() {
    const s = st.stk, tk = s.tk, sel = tk[st.stkSel] ? st.stkSel : Object.keys(tk)[0]; st.stkSel = sel;
    const ch = sym => (tk[sym].p - tk[sym].prev) / tk[sym].prev * 100, col = v => v > .05 ? "up" : v < -.05 ? "dn" : "eq";
    const tabs = [["board", "📊 Bảng giá"], ["port", "💼 Danh mục"], ["leader", "🏆 Xếp hạng"], ["news", "📰 Tin tức"]];
    let body = "";
    if (st.stkTab === "board") {
      const c0 = ch(sel), h = (s.port || []).find(p => p.sym === sel);
      body = `<div class="stkWrap"><div class="stkList">${Object.keys(tk).map(sym => `<button class="stkRow ${sym === sel ? "sel" : ""}" data-sym="${sym}"><b>${sym}</b><span class="${col(ch(sym))}">${tk[sym].p.toFixed(2)}</span><small class="${col(ch(sym))}">${ch(sym) >= 0 ? "+" : ""}${ch(sym).toFixed(2)}%</small></button>`).join("")}</div>
        <div class="stkDetail"><div class="stkName">${sel} · ${tk[sel].name}<small>${tk[sel].sector} · tham chiếu ${tk[sel].prev.toFixed(2)}</small></div>
          <div class="stkPrice ${col(c0)}">${tk[sel].p.toFixed(2)} <small>${c0 >= 0 ? "▲" : "▼"} ${Math.abs(c0).toFixed(2)}%</small></div>
          <canvas id="stkCv" width="520" height="150" style="width:100%;height:75px"></canvas>
          <div class="vol" style="margin:4px 0">Đang có: <b>${h ? h.q : 0}</b> cp · 💰 ${fmt(S().coins)} xu · vốn tối đa ${fmt(s.cap)} (đã dùng ${fmt(s.invested)})</div>
          <div class="ytrow"><input id="sq" type="number" min="1" max="1000" value="${st.lastQ || 1}" style="max-width:80px"><button id="sbuy" style="background:#2a9d8f">Mua</button><button id="ssell" style="background:#e63946">Bán</button></div>
          <div class="ytrow"><input id="slim" type="number" step="0.01" placeholder="Giá chờ (lệnh giới hạn)"><button id="slb" style="background:#457b9d">Chờ mua</button><button id="sls" style="background:#9c6644">Chờ bán</button></div>
          <div class="vol" style="font-size:11px;margin:0">Phí ${(s.fee * 100).toFixed(2)}%/lệnh (tối thiểu 1 xu) · ${s.always ? "Đang mở cả ngày (chế độ thử)" : "Phiên: T2–T6 " + s.sessions.map(x => x.join("–")).join(", ")}</div></div></div>`;
    } else if (st.stkTab === "port") {
      body = `<div class="statRow"><span>Lãi / lỗ</span><span></span><b class="${s.pl >= 0 ? "up" : "dn"}">${s.pl >= 0 ? "+" : ""}${fmt(s.pl)} xu (${s.plPct}%)</b></div>
        <div class="board">${(s.port || []).map(p => { const pl = p.value - p.cost; return `<div><span><b>${p.sym}</b> ×${p.q} · vốn ${fmt(p.cost)}</span><b class="${pl >= 0 ? "up" : "dn"}">${fmt(p.value)} (${pl >= 0 ? "+" : ""}${(pl / p.cost * 100).toFixed(1)}%)</b></div>`; }).join("") || "<div><span>Chưa có cổ phiếu nào</span></div>"}</div>
        <div class="sec">⏳ Lệnh chờ</div><div class="board">${(s.orders || []).map(o => `<div><span>${o.side === "buy" ? "Mua" : "Bán"} ${o.q} ${o.sym} @ ${o.lim}</span><button class="mini ghostb" data-cancel="${o.id}">Hủy</button></div>`).join("") || "<div><span>Không có</span></div>"}</div>
        <div class="sec">🧾 Giao dịch gần đây</div><div class="board">${(s.trades || []).map(x => `<div><span>${x.side === "buy" ? "🟢 Mua" : "🔴 Bán"} ${x.q} ${x.sym}</span><b>${x.p}</b></div>`).join("") || "<div><span>Chưa có</span></div>"}</div>`;
    } else if (st.stkTab === "leader") {
      body = `<div class="board">${(s.leader || []).map((r, k) => `<div><span>${k < 3 ? ["🥇", "🥈", "🥉"][k] : k + 1 + "."} ${esc(r.name)}</span><b class="${r.pct >= 0 ? "up" : "dn"}">${r.pct >= 0 ? "+" : ""}${r.pct}%</b></div>`).join("") || "<div><span>Chưa có ai giao dịch đủ 50 xu</span></div>"}</div>
        <div class="vol" style="font-size:12px">Xếp theo % lãi trên tổng tiền đã mua (công bằng giữa người nhiều xu và ít xu).</div>`;
    } else {
      body = `<div class="board">${(s.news || []).map(n => `<div><span>${n.up ? "📈" : "📉"} <b>${n.sector}</b>: ${n.text}</span></div>`).join("") || "<div><span>Chưa có tin. Anh phóng viên sẽ đọc tin khi có sự kiện!</span></div>"}</div>
        <div class="vol" style="font-size:12px">💡 Cô Phương: đừng bỏ hết trứng vào một giỏ, chia vốn ra nhiều ngành để giảm rủi ro nha.</div>`;
    }
    openSheet("📈 Sàn giao dịch ảo",
      `<div class="tabs" style="margin-top:0">${tabs.map(([k, n]) => `<button data-tab="${k}" class="${k === st.stkTab ? "cur" : ""}">${n.split(" ")[0]}<span>${n.split(" ").slice(1).join(" ")}</span></button>`).join("")}</div>${body}
       <div class="vol" style="font-size:11px;color:#ffb4a2">⚠️ Đây là mô phỏng để học, không phải lời khuyên đầu tư thật. Xu ảo không đổi ra tiền.</div>`,
      el => {
        el.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { st.stkTab = b.dataset.tab; renderStock(); });
        el.querySelectorAll("[data-sym]").forEach(b => b.onclick = () => { st.stkSel = b.dataset.sym; renderStock(); });
        el.querySelectorAll("[data-cancel]").forEach(b => b.onclick = async () => { const r = await eco("stkCancel", {id: b.dataset.cancel}); if (r) { Object.assign(st.stk, r); renderStock(); } });
        const cv = el.querySelector("#stkCv"); if (cv) spark(cv, st.hist[st.stkSel], (tk[st.stkSel].p >= tk[st.stkSel].prev) ? "#39ff88" : "#ff4d5e");
        const order = async (side, kind) => {
          const q = Math.max(1, Math.min(1000, parseInt(el.querySelector("#sq").value) || 1)); st.lastQ = q;
          const lim = parseFloat(el.querySelector("#slim").value);
          const r = await eco("stkOrder", {sym: st.stkSel, side, q, kind, lim}); if (!r) return;
          Object.assign(st.stk, r); toast(r.msg); renderStock();
        };
        const b = id => el.querySelector(id);
        if (b("#sbuy")) { b("#sbuy").onclick = () => order("buy", "market"); b("#ssell").onclick = () => order("sell", "market"); b("#slb").onclick = () => order("buy", "limit"); b("#sls").onclick = () => order("sell", "limit"); }
      });
  }
  function stockTick(m) {
    st.stk = {...(st.stk || {}), tk: m.tk, news: m.news, open: m.open};
    for (const [sym, s] of Object.entries(m.tk)) st.hist[sym] = ((st.hist[sym] || []).concat(s.p)).slice(-60);
    if (m.fresh) { log(`📰 <b>${m.fresh.sector}</b>: ${esc(m.fresh.text)}`); }
    if (st.panel === "stock" && !$("#sheet").classList.contains("hidden") && st.stkTab === "board") {   // cập nhật số, giữ ô nhập
      const el = $(".sheet-body");
      for (const [sym, s] of Object.entries(m.tk)) { const row = el.querySelector(`[data-sym="${sym}"]`); if (row) { const c = (s.p - s.prev) / s.prev * 100, k = c > .05 ? "up" : c < -.05 ? "dn" : "eq"; row.children[1].textContent = s.p.toFixed(2); row.children[1].className = k; row.children[2].textContent = `${c >= 0 ? "+" : ""}${c.toFixed(2)}%`; row.children[2].className = k; } }
      const p = el.querySelector(".stkPrice"); if (p) { const s = m.tk[st.stkSel], c = (s.p - s.prev) / s.prev * 100; p.className = "stkPrice " + (c > .05 ? "up" : c < -.05 ? "dn" : "eq"); p.innerHTML = `${s.p.toFixed(2)} <small>${c >= 0 ? "▲" : "▼"} ${Math.abs(c).toFixed(2)}%</small>`; }
      const cv = el.querySelector("#stkCv"); if (cv) spark(cv, st.hist[st.stkSel], m.tk[st.stkSel].p >= m.tk[st.stkSel].prev ? "#39ff88" : "#ff4d5e");
    }
  }

  // ---------- 9. Bảng: 💞 Hẹn hò (an toàn trước) ----------
  function ageOk() { return st.age === "16" || st.age === "18"; }
  function openAgeGate(after) {
    if (st.age === "u16") { toast(`💞 Khu hẹn hò dành cho người từ ${DT.MIN_AGE} tuổi trở lên`); return; }
    openSheet("💞 Xác nhận độ tuổi",
      `<div class="vol" style="margin:0 0 10px;line-height:1.5">Khu hẹn hò chỉ dành cho người từ <b>${DT.MIN_AGE} tuổi</b> trở lên, và chỉ ghép đôi <b>trong cùng nhóm tuổi</b> (16–17 với nhau, 18+ với nhau).
       Bạn chỉ xác nhận <b>một lần</b>, hãy chọn đúng nhé.</div>
       <div class="grid" style="grid-template-columns:1fr 1fr 1fr">${[["u16", "Dưới 16 tuổi"], ["16", "16–17 tuổi"], ["18", "18 tuổi trở lên"]].map(([k, n]) => `<button class="opt" data-age="${k}" style="text-align:center">${n}</button>`).join("")}</div>
       <div class="vol" style="font-size:12px">🛡️ Không chia sẻ số điện thoại, địa chỉ, mạng xã hội. Gặp ai khó chịu: bấm 🚫 Chặn hoặc ⚠️ Báo cáo.</div>`,
      el => el.querySelectorAll("[data-age]").forEach(b => b.onclick = async () => {
        const r = await eco("setAge", {age: b.dataset.age}); if (!r) return;
        st.age = r.age; closeSheet();
        if (r.age === "u16") toast(`Khu hẹn hò dành cho ${DT.MIN_AGE}+, bạn chơi các khu khác nhé 🌳`); else after && after();
      }));
  }
  let dTab = "find";
  async function openDating(tab) {
    if (myArea !== "dating") { toast("💞 Ở khu hẹn hò mới mở được"); return; }
    if (tab) dTab = tab;
    const r = await eco("dBrowse"); if (!r) return;
    st.panel = "dating"; st.age = r.age; st.match = r.match;
    const p = r.prof, m = r.match;
    const tabs = [["find", "💘 Tìm bạn"], ["me", "🪪 Hồ sơ"], ["pair", "💞 Đôi của tôi"]];
    let body = "";
    if (!p.on && dTab === "find") dTab = "me";
    if (dTab === "me") {
      body = `<label class="setrow"><input type="checkbox" id="don" ${p.on ? "checked" : ""}><span>💘 Bật chế độ hẹn hò<small>Tắt bất kỳ lúc nào để ẩn hồ sơ khỏi người khác</small></span></label>
        <label class="setrow"><input type="checkbox" id="dhide" ${p.hide ? "checked" : ""}><span>🙈 Ẩn trạng thái "đang hẹn hò"<small>Không hiện 💞 trên tên của bạn</small></span></label>
        <div class="sec">✍️ Giới thiệu (tối đa ${DT.BIO_MAX} ký tự · số điện thoại/link/mạng xã hội sẽ bị che)</div>
        <div class="ytrow"><input id="dbio" maxlength="${DT.BIO_MAX}" value="${esc(p.bio)}" placeholder="VD: Mê mèo và trà sữa 🧋"></div>
        <div class="sec">🎯 Sở thích (chọn tối đa 5)</div>
        <div class="hobs">${r.hobbies.map(h => `<button class="hob ${p.hob.includes(h) ? "on" : ""}" data-h="${esc(h)}">${h}</button>`).join("")}</div>
        <button class="primary" id="dsave">💾 Lưu hồ sơ</button>
        <div class="vol" style="font-size:12px">Nhóm tuổi của bạn: <b>${r.age === "18" ? "18+" : "16–17"}</b> · chỉ thấy và ghép với người cùng nhóm.</div>`;
    } else if (dTab === "find") {
      body = r.cards.length ? `<div class="dcards">${r.cards.map(c => `<div class="dcard"><canvas width="120" height="140" data-av="${c.uid}"></canvas>
          <div><b>${esc(c.name)}</b>${c.taken ? ` <small>💞 đã có đôi</small>` : ""}<div class="dbio">${esc(c.bio || "…")}</div><div class="dhob">${c.hob.join(" ")}</div>
          <div class="dbtns"><button class="mini" data-like="${c.uid}" ${c.liked ? "disabled" : ""}>${c.liked ? "💗 Đã thả tim" : "❤️ Thả tim"}</button><button class="mini ghostb" data-wave="${c.uid}">👋 Chào</button>
          <button class="mini ghostb" data-block="${c.uid}">🚫 Chặn</button><button class="mini ghostb" data-report="${c.uid}">⚠️ Báo cáo</button></div></div></div>`).join("")}</div>`
        : `<div class="vol" style="margin:0">Chưa có ai cùng nhóm tuổi đang bật chế độ hẹn hò trong kênh này. Rủ bạn bè vào hoặc thử kênh khác nhé!</div>`;
    } else {
      const days = m ? Math.max(0, Math.round((new Date(Life.today()) - new Date(m.since)) / 86400000)) : 0;
      body = m ? `<div class="pomoBig" style="font-size:30px">💞 ${esc(m.name)}</div><div class="pomoSub">Bên nhau ${days + 1} ngày · từ ${m.since}</div>
          <div class="grid"><button class="opt" id="dflower">🌹 Tặng hoa (${DT.FLOWER_PRICE} 💰)</button><button class="opt" id="dlant">🏮 Thả đèn hoa đăng (${DT.LANTERN_PRICE} 💰)</button>
          <button class="opt" id="dphoto">📸 Chụp ảnh đôi</button><button class="opt off" id="dunmatch">💔 Hủy kết đôi</button></div>`
        : `<div class="vol" style="margin:0 0 8px">Chưa kết đôi. Cả hai cùng ❤️ thả tim cho nhau là thành đôi!</div><div class="grid"><button class="opt" id="dlant">🏮 Thả đèn hoa đăng (${DT.LANTERN_PRICE} 💰)</button><button class="opt" id="dphoto">📸 Chụp ảnh</button></div>`;
    }
    openSheet("💞 Khu hẹn hò · Cô Duyên",
      `<div class="tabs" style="margin-top:0">${tabs.map(([k, n]) => `<button data-dt="${k}" class="${k === dTab ? "cur" : ""}">${n.split(" ")[0]}<span>${n.split(" ").slice(1).join(" ")}</span></button>`).join("")}</div>${body}
       <div class="vol" style="font-size:11px">🛡️ Không chia sẻ thông tin cá nhân. Không chuyển xu qua hẹn hò (chỉ tặng quà, tối đa ${DT.GIFT_PER_DAY}/ngày).</div>`,
      el => {
        el.querySelectorAll("[data-dt]").forEach(b => b.onclick = () => openDating(b.dataset.dt));
        el.querySelectorAll(".hob").forEach(b => b.onclick = () => { if (!b.classList.contains("on") && el.querySelectorAll(".hob.on").length >= 5) return toast("Tối đa 5 sở thích"); b.classList.toggle("on"); });
        const q = s => el.querySelector(s);
        if (q("#dsave")) q("#dsave").onclick = async () => {
          const r2 = await eco("dProf", {on: q("#don").checked, hide: q("#dhide").checked, bio: q("#dbio").value, hob: [...el.querySelectorAll(".hob.on")].map(b => b.dataset.h)});
          if (r2) { toast("💾 Đã lưu hồ sơ"); openDating(r2.prof.on ? "find" : "me"); }
        };
        el.querySelectorAll("[data-av]").forEach(cv => { const c = r.cards.find(x => x.uid === cv.dataset.av); if (c) avatarTo(cv, {outfit: c.outfit, color: c.color, name: c.name}); });
        el.querySelectorAll("[data-like]").forEach(b => b.onclick = async () => { const x = await eco("dLike", {uid: b.dataset.like}); if (x) { if (x.match) { toast(`💞 Kết đôi với ${x.match.name}!`); confetti(me().x, me().y - 60); } else toast("❤️ Đã thả tim"); openDating(x.match ? "pair" : "find"); } });
        el.querySelectorAll("[data-wave]").forEach(b => b.onclick = async () => { if (await eco("dWave", {uid: b.dataset.wave})) toast("👋 Đã gửi lời chào"); });
        el.querySelectorAll("[data-block]").forEach(b => b.onclick = async () => { if (confirm("Chặn người này? Hai bạn sẽ không thấy nhau trong khu hẹn hò nữa.") && await eco("dBlock", {uid: b.dataset.block})) { toast("🚫 Đã chặn"); openDating("find"); } });
        el.querySelectorAll("[data-report]").forEach(b => b.onclick = async () => { const why = prompt("Lý do báo cáo (VD: nói tục, xin thông tin cá nhân…)"); if (why && why.trim() && await eco("dReport", {uid: b.dataset.report, reason: why})) { toast("⚠️ Đã gửi báo cáo và chặn người này"); openDating("find"); } });
        if (q("#dflower")) q("#dflower").onclick = async () => { if (await eco("dFlower")) toast("🌹 Đã tặng hoa!"); };
        if (q("#dlant")) q("#dlant").onclick = () => { closeSheet(); lantern(); };
        if (q("#dphoto")) q("#dphoto").onclick = photobooth;
        if (q("#dunmatch")) q("#dunmatch").onclick = async () => { if (confirm("Hủy kết đôi?") && await eco("dUnmatch")) { toast("💔 Đã hủy kết đôi"); openDating("find"); } };
      });
  }
  function avatarTo(cv, p, w = cv.width, h = cv.height, sc = 2) {
    const c = cv.getContext("2d"), saved = ctx;
    c.setTransform(sc, 0, 0, sc, 0, 0); c.clearRect(0, 0, w, h);
    ctx = c; try { Areas.drawAvatar({x: w / sc / 2, y: h / sc - 8, walking: false, up: false, id: p.name, ...p}, performance.now() / 1000); } finally { ctx = saved; }
  }
  async function lantern() {
    if (myArea !== "dating") return;
    if (await eco("dLantern")) toast("🏮 Đèn hoa đăng đã được thả, ước điều gì đó đi!");
  }
  function photobooth() {
    if (myArea !== "dating") return;
    const m = st.match, mate = m ? [...here()].find(p => p.uid === m.uid) : null;
    openSheet("📸 Photobooth", `<canvas id="pbCv" width="640" height="480" style="width:100%;max-width:320px;display:block;margin:0 auto;border-radius:16px"></canvas>
      <div class="pomoSub">${mate ? `Ảnh đôi với ${esc(mate.name)} 💞` : m ? "Người ấy chưa ở đây, chụp ảnh một mình nhé" : "Chụp ảnh kỷ niệm ở khu hẹn hò"}</div><a class="primary" id="pbSave" style="display:block;text-align:center;text-decoration:none" download="anh-hen-ho.png">💾 Lưu ảnh</a>`,
      el => {
        const cv = el.querySelector("#pbCv"), c = cv.getContext("2d");
        const g = c.createLinearGradient(0, 0, 0, 480); g.addColorStop(0, "#ffd6e7"); g.addColorStop(1, "#cdb4db"); c.fillStyle = g; c.fillRect(0, 0, 640, 480);
        c.font = "40px system-ui"; c.textAlign = "center"; for (let k = 0; k < 14; k++) c.fillText(["💗", "💖", "✨", "🌸"][k % 4], (k * 97) % 640, 40 + (k * 61) % 420);
        const ppl = [me(), mate].filter(Boolean), saved = ctx;
        ctx = c; try { ppl.forEach((p, k) => { c.setTransform(5, 0, 0, 5, 0, 0); Areas.drawAvatar({...p, x: (ppl.length === 1 ? 64 : 44 + k * 40), y: 82, walking: false, up: false, sit: false, happy: true}, performance.now() / 1000); }); }
        finally { ctx = saved; c.setTransform(1, 0, 0, 1, 0, 0); }
        c.fillStyle = "rgba(255,255,255,.85)"; c.fillRect(0, 420, 640, 60); c.fillStyle = "#c1121f"; c.font = "800 26px Nunito, system-ui";
        c.fillText(`${ppl.map(p => p.name).join(" 💞 ")} · ${Life.today()}`, 320, 458);
        c.strokeStyle = "#ff8fab"; c.lineWidth = 16; c.strokeRect(8, 8, 624, 464);
        el.querySelector("#pbSave").href = cv.toDataURL("image/png");
      });
  }

  // ---------- 10. Tin nhắn từ server ----------
  function onMsg(m) {
    if (m.t === "bc") { st.bc = m.state; refreshBC(); }
    else if (m.t === "stk") stockTick(m);
    else if (m.t === "announce") { st.marquee = m.text; toast(m.text); log(esc(m.text)); if (m.big) confetti(me() ? me().x : 500, me() ? me().y - 60 : 300); }
    else if (m.t === "pinfo") { const p = players.get(m.id); if (p) p.pair = m.pair; }
    else if (m.t === "dt") {
      if (m.a === "needAge") openAgeGate(() => travelTo("dating"));
      else if (m.a === "liked") { toast(`❤️ ${m.name} vừa thả tim bạn!`); log(`❤️ <b>${esc(m.name)}</b> vừa thả tim bạn ở khu hẹn hò`); }
      else if (m.a === "wave") toast(`👋 ${m.name} gửi lời chào bạn`);
      else if (m.a === "match") { toast(`💞 Bạn và ${m.name} đã thành đôi!`); confetti(me().x, me().y - 60); st.match = {name: m.name}; }
      else if (m.a === "unmatch") { toast(`💔 ${m.name} đã hủy kết đôi`); st.match = null; }
      else if (m.a === "flower") { toast(`🌹 ${m.name} tặng bạn một bông hoa!`); log(`🌹 <b>${esc(m.name)}</b> tặng bạn hoa (đã cất vào 🎒 túi)`); }
      else if (m.a === "lantern") { st.lanterns.push({x: m.x - 60, t0: performance.now() / 1000, by: m.by}); log(`🏮 <b>${esc(m.by)}</b> vừa thả đèn hoa đăng${m.pair ? ` cùng ${esc(m.pair)}` : ""}`); }
    }
  }
  function onArea(a) {
    st.panel = "";
    if (a === "arcade") { st.arcadeSince = serverNow(); eco("clawCage", {m: "normal"}).then(r => r && (st.cages = {...(st.cages || {}), normal: r.cage})); eco("clawCage", {m: "vip"}).then(r => r && (st.cages = {...(st.cages || {}), vip: r.cage})); }
    else st.arcadeSince = 0;
    if (a === "stock") eco("stkState").then(r => { if (r) { st.stk = r; st.hist = r.hist; } });
  }

  return {has: a => IDS.has(a), draw, seat, tap, act, actLabel, npcAct, holes, over, onMsg, onArea, ageOk, openAgeGate, openBC, openStock, openDating};
})();
