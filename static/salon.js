// ================== 💇 TIỆM LÀM TÓC (V6) ==================
// Nạp SAU zones.js. Khu chung (có kênh) vào qua bản đồ. 2 NPC: Chị Gương (lễ tân) + Anh Tóc (thợ).
// Giao diện "Gương": thử tóc MIỄN PHÍ, không giới hạn, chạy hoàn toàn ở trình duyệt (không gọi server);
// chỉ khi bấm "Chốt kiểu này" mới gửi eco "salonApply" (server kiểm tra màu hợp lệ + đủ xu, salon.py).
// Kiểu tóc + màu nhuộm + giá: salon/hair_catalog.json → CATALOG.SALON. Hình vẽ tóc: hair.js.
"use strict";

const Salon = (() => {
  const SAL = CATALOG.SALON, ID = "salon";
  const S = () => Life.S();
  const OFF = {x: -500, y: -500, w: 1, h: 1};
  const DEF = SAL.default;

  // ---------- 1. Đăng ký khu vào bảng của game ----------
  LAYOUTS.salon = {ww: 1000, wh: 600, floor: {x1: 20, y1: 175, x2: 980, y2: 585},
                   beds: [{x: 300, y: 300}, {x: 455, y: 300}, {x: 610, y: 300}], bw: 90, bh: 70, sitY: 62,   // 3 ghế salon xoay
                   tvr: null, scr: null, radio: {x: 880, y: 116, w: 44, h: 26}, sw: OFF, moon: null};
  AREA_DOORS.salon = [{x: 476, y: 538, w: 48, h: 37, side: "bottom", spot: {x: 500, y: 556}, to: "map"}];
  AREA_NAME.salon = "💇 Tiệm Làm Tóc";
  Areas.TXT.salon = {icon: "💇", sit: "💺<span>Ngồi vào ghế</span>", full: "Hết ghế rồi, đợi chút nhé! 😅", taken: "Ghế của",
    hello: "💇 Tiệm Làm Tóc: ngồi vào ghế (hoặc chạm Anh Tóc) để mở Gương, thử tóc miễn phí thoải mái. Chỉ tốn xu khi bấm Chốt!",
    share: "Ra tiệm làm tóc đổi kiểu với mình nè 💇"};
  NPCS.salon = [
    {id: "guong", name: "Chị Gương", color: "#2b2d42", act: "salon_help", path: [[118, 372]],
     outfit: {hair: "long", hairColor: "hong", hat: "hat_flower", shirt: "shirt_suit", glasses: "gl_none"},
     lines: SAL.npc_lines.guong},
    {id: "toc", name: "Anh Tóc", color: "#ff8fab", act: "salon_mirror", speed: 9, path: [[300, 430], [720, 430]],
     outfit: {gender: "g_m", hair: "short", hairColor: "tim", glasses: "gl_round", hat: "hat_none"},
     lines: SAL.npc_lines.toc},
  ];

  // ---------- 2. NPC tự nói 10–15 giây (xáo túi, không lặp liên tiếp) ----------
  const bags = {}, last = {};
  let nextTalk = 0, turn = 0;
  function nextLine(id) {
    const all = NPCS.salon.find(n => n.id === id).lines;
    if (!bags[id] || !bags[id].length) {
      bags[id] = all.slice().sort(() => Math.random() - .5);
      if (bags[id][0] === last[id] && bags[id].length > 1) bags[id].push(bags[id].shift());
    }
    return (last[id] = bags[id].shift());
  }
  function autoTalk(t) {
    if (t < nextTalk) return;
    if (nextTalk) { const id = ["toc", "guong"][turn++ % 2]; Areas.say(id, nextLine(id), 5); }
    nextTalk = t + 10 + Math.random() * 5;
  }

  // ---------- 3. Vẽ cảnh (hình tạm vẽ bằng code) ----------
  // ART-START: phần vẽ trang trí của tiệm, chỉ hình ảnh, không có logic
  function drawRoom(t) {
    ctx.save();
    // 1. Nền tường pastel hồng tím & sàn gỗ sáng
    drawWall("#faeaf2");
    const {L, R, T} = bleed(), wv = R - L;

    // Hoa văn sọc pastel dịu mắt trên tường
    ctx.fillStyle = "rgba(255,255,255,.24)";
    for (let x = Math.floor(L / 28) * 28; x < R; x += 28) {
      ctx.fillRect(x, T, 14, 165 - T);
    }
    // Phào chỉ trần nhà viền vàng kem
    ctx.fillStyle = "#fff8f0"; ctx.fillRect(L, 0, wv, 10);
    ctx.fillStyle = "#f5d08a"; ctx.fillRect(L, 10, wv, 2);

    // Bo chân tường ốp gỗ pastel tím hồng cao cấp
    ctx.fillStyle = "#e3c2ec"; ctx.fillRect(L, 138, wv, 24);
    ctx.fillStyle = "#d2a8dc"; ctx.fillRect(L, 138, wv, 3);
    ctx.fillStyle = "rgba(0,0,0,.06)";
    for (let x = Math.floor(L / 18) * 18; x < R; x += 18) {
      ctx.fillRect(x, 141, 1.5, 21);
    }
    ctx.fillStyle = "#f5d08a"; ctx.fillRect(L, 160, wv, 2);

    // Sàn gỗ màu ấm sáng
    drawWoodFloor("#f6ece2", "#faefe5", "#eedfd2");

    // 2. Biển hiệu TIỆM LÀM TÓC uốn lượn dễ thương ở giữa tường
    ctx.fillStyle = "rgba(0,0,0,.08)"; rr(ctx, 402, 14, 196, 30, 15); ctx.fill();
    ctx.fillStyle = "#fff7fa"; rr(ctx, 400, 12, 196, 30, 15); ctx.fill();
    ctx.strokeStyle = "#e8b4cb"; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.strokeStyle = "#f3d5e2"; ctx.lineWidth = 1; rr(ctx, 404, 16, 188, 22, 11); ctx.stroke();
    ctx.font = "800 14px Nunito,system-ui,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#9333ea"; ctx.fillText("✂️ TIỆM LÀM TÓC ✨", 498, 27);

    // 3. Đèn thả trần xinh xắn (4 bóng lung linh)
    const lampX = [205, 415, 585, 745];
    for (let k = 0; k < lampX.length; k++) {
      const lx = lampX[k], sway = Math.sin(t * 1.5 + k) * 1.5;
      ctx.strokeStyle = "#c89d58"; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx + sway, 35); ctx.stroke();
      ctx.fillStyle = ["#ffc6d9", "#cdb4db", "#ffd6a5", "#cbf3f0"][k];
      ctx.beginPath(); ctx.moveTo(lx + sway - 11, 45); ctx.lineTo(lx + sway + 11, 45); ctx.lineTo(lx + sway, 35); ctx.closePath(); ctx.fill();
      const glow = .6 + .3 * Math.sin(t * 2.5 + k);
      ctx.fillStyle = `rgba(255,245,180,${glow * .35})`; ctx.beginPath(); ctx.arc(lx + sway, 47, 12, 0, 7); ctx.fill();
      ctx.fillStyle = "#fff9d2"; ctx.beginPath(); ctx.arc(lx + sway, 46, 4, 0, 7); ctx.fill();
    }

    // 4. Tranh treo tường mẫu tóc nghệ thuật
    // Tranh trái (tóc xoăn lượn sóng)
    ctx.fillStyle = "#d4a373"; rr(ctx, 235, 52, 44, 56, 4); ctx.fill();
    ctx.fillStyle = "#fefae0"; ctx.fillRect(238, 55, 38, 50);
    ctx.fillStyle = "#e07a5f"; ctx.beginPath(); ctx.arc(257, 72, 8, 0, 7); ctx.fill();
    ctx.fillStyle = "#f2cc8f"; ctx.beginPath(); ctx.arc(257, 82, 12, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = "#d4a373"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(250, 76); ctx.quadraticCurveTo(246, 88, 252, 94); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(264, 76); ctx.quadraticCurveTo(268, 88, 262, 94); ctx.stroke();
    // Tranh phải (dụng cụ cắt tóc vintage)
    ctx.fillStyle = "#d4a373"; rr(ctx, 720, 52, 44, 56, 4); ctx.fill();
    ctx.fillStyle = "#fefae0"; ctx.fillRect(723, 55, 38, 50);
    ctx.font = "18px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("🪮", 742, 74); ctx.fillText("✂️", 742, 92);

    // 5. 3 Gương lớn vòm cong + viền đèn LED lung linh trên 3 ghế
    for (let k = 0; k < 3; k++) {
      const b = BEDS[k], cx = b.x + BED_W / 2;
      const mx = cx - 41, my = 42, mw = 82, mh = 114;

      // Thảm tròn bông xù dưới ghế (vẽ trên sàn gỗ)
      ctx.fillStyle = "rgba(0,0,0,.04)"; ctx.beginPath(); ctx.ellipse(cx, b.y + 58, 48, 22, 0, 0, 7); ctx.fill();
      ctx.fillStyle = ["#f8d7da", "#e2d4f0", "#d8f3dc"][k]; ctx.beginPath(); ctx.ellipse(cx, b.y + 57, 46, 20, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, b.y + 57, 41, 17, 0, 0, 7); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.65)";
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
        ctx.beginPath(); ctx.arc(cx + Math.cos(a) * 44, b.y + 57 + Math.sin(a) * 19, 1.8, 0, 7); ctx.fill();
      }

      // Khung gương mạ vàng cao cấp
      ctx.fillStyle = "#d4af37"; rr(ctx, mx - 5, my - 5, mw + 10, mh + 8, 26); ctx.fill();
      ctx.fillStyle = "#fef0cd"; rr(ctx, mx - 2, my - 2, mw + 4, mh + 5, 24); ctx.fill();

      // Mặt gương bóng loáng
      const gg = ctx.createLinearGradient(mx, my, mx + mw, my + mh);
      gg.addColorStop(0, "#ebf6fc"); gg.addColorStop(.6, "#d5edfa"); gg.addColorStop(1, "#c4e5f7");
      ctx.fillStyle = gg; rr(ctx, mx, my, mw, mh + 2, 22); ctx.fill();

      // Vệt sáng bóng phản chiếu trên gương
      ctx.save(); rr(ctx, mx, my, mw, mh + 2, 22); ctx.clip();
      ctx.fillStyle = "rgba(255,255,255,.42)";
      ctx.beginPath(); ctx.moveTo(mx + 8, my); ctx.lineTo(mx + 32, my); ctx.lineTo(mx, my + 48); ctx.lineTo(mx, my + 16); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(mx + 38, my); ctx.lineTo(mx + 46, my); ctx.lineTo(mx, my + 68); ctx.lineTo(mx, my + 56); ctx.closePath(); ctx.fill();
      ctx.restore();

      // 10 bóng đèn viền lung linh chạy quanh gương
      for (let j = 0; j < 10; j++) {
        let bx, by;
        if (j < 6) {
          const ang = Math.PI + (j + .5) / 6 * Math.PI;
          bx = cx + Math.cos(ang) * (mw / 2 + 1);
          by = my + 28 + Math.sin(ang) * 26;
        } else if (j < 8) {
          bx = mx + mw + 1; by = my + 54 + (j - 6) * 32;
        } else {
          bx = mx - 1; by = my + 54 + (j - 8) * 32;
        }
        const on = (Math.floor(t * 2.5) + j + k * 3) % 4 !== 0;
        if (on) {
          ctx.fillStyle = "rgba(255,235,160,.4)"; ctx.beginPath(); ctx.arc(bx, by, 6.5, 0, 7); ctx.fill();
        }
        ctx.fillStyle = on ? "#fffde7" : "#e6d7a8"; ctx.beginPath(); ctx.arc(bx, by, 3.2, 0, 7); ctx.fill();
      }

      // Kệ nhỏ chân gương đặt phụ kiện
      ctx.fillStyle = "#d4af37"; rr(ctx, cx - 44, 154, 88, 7, 3); ctx.fill();
      ctx.fillStyle = "#fff8ed"; rr(ctx, cx - 42, 155, 84, 4, 2); ctx.fill();
      ctx.fillStyle = ["#ff8fab", "#4cc9f0", "#a3b18a"][k]; rr(ctx, cx - 34, 142, 7, 13, 2); ctx.fill();
      ctx.fillStyle = "#ffd166"; ctx.fillRect(cx - 32, 139, 3, 3);
      ctx.fillStyle = "#adb5bd"; ctx.fillRect(cx - 14, 152, 14, 2);
      ctx.fillStyle = "#e76f51"; rr(ctx, cx + 22, 146, 10, 8, 2); ctx.fill();
      ctx.fillStyle = "#52b788"; ctx.beginPath(); ctx.arc(cx + 27, 144, 4, 0, 7); ctx.fill();
    }

    // 6. Quầy lễ tân Chị Gương (khung cảm ứng x: 34..196, y: 292..362)
    ctx.fillStyle = "rgba(0,0,0,.14)"; ctx.beginPath(); ctx.ellipse(115, 362, 80, 10, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#c28490"; rr(ctx, 40, 302, 150, 58, 8); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.16)";
    for (let x = 48; x < 184; x += 10) { ctx.fillRect(x, 306, 5, 48); }
    ctx.fillStyle = "#a86875"; ctx.fillRect(40, 354, 150, 6);
    // Bảng tên LỄ TÂN vàng kim
    ctx.fillStyle = "#ffd166"; rr(ctx, 84, 322, 62, 22, 6); ctx.fill();
    ctx.fillStyle = "#fff8e7"; rr(ctx, 86, 324, 58, 18, 4); ctx.fill();
    ctx.font = "800 10px Nunito,system-ui,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#7b2cbf"; ctx.fillText("LỄ TÂN ✿", 115, 333);
    // Mặt quầy đá cẩm thạch trắng
    ctx.fillStyle = "#ffffff"; rr(ctx, 34, 292, 162, 13, 6); ctx.fill();
    ctx.fillStyle = "#f0ece9"; ctx.fillRect(38, 300, 154, 4);
    // Sổ hẹn khách hàng
    ctx.fillStyle = "#ffafcc"; rr(ctx, 50, 283, 24, 14, 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.fillRect(53, 285, 9, 10); ctx.fillRect(63, 285, 9, 10);
    ctx.fillStyle = "#b5838d"; ctx.fillRect(55, 287, 5, 1.2); ctx.fillRect(55, 290, 6, 1.2);
    // Chuông bấm gọi mạ vàng
    ctx.fillStyle = "#c9a227"; ctx.fillRect(92, 289, 10, 3);
    ctx.fillStyle = "#ffd166"; ctx.beginPath(); ctx.arc(97, 287, 5.5, Math.PI, 0); ctx.fill();
    ctx.fillStyle = "#4a4a4a"; ctx.fillRect(96, 280, 2, 2);
    // Chậu cây nhỏ trên quầy
    ctx.fillStyle = "#e9c46a"; rr(ctx, 162, 281, 14, 12, 3); ctx.fill();
    ctx.fillStyle = "#2d6a4f";
    ctx.beginPath(); ctx.arc(165, 276, 5, 0, 7); ctx.arc(173, 274, 6, 0, 7); ctx.arc(169, 270, 5, 0, 7); ctx.fill();

    // Cây xanh lớn cạnh quầy (x: 206..226, y: 310..365)
    ctx.fillStyle = "rgba(0,0,0,.12)"; ctx.beginPath(); ctx.ellipse(216, 364, 14, 6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#b7b7a4"; rr(ctx, 206, 338, 20, 24, 4); ctx.fill();
    ctx.fillStyle = "#a5a58d"; ctx.fillRect(208, 340, 16, 4);
    ctx.fillStyle = "#52796f";
    for (const [px, py, pr] of [[216, 328, 9], [208, 318, 11], [224, 316, 10], [214, 306, 12], [222, 302, 9]]) {
      ctx.beginPath(); ctx.arc(px, py, pr, 0, 7); ctx.fill();
    }

    // 7. Kệ sản phẩm chăm sóc tóc nhiều tầng bên phải (x: 785..935, y: 170..290)
    ctx.fillStyle = "rgba(0,0,0,.08)"; rr(ctx, 786, 172, 148, 122, 10); ctx.fill();
    ctx.fillStyle = "#fffcf9"; rr(ctx, 784, 170, 148, 122, 10); ctx.fill();
    ctx.strokeStyle = "#eedfd5"; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = "#fdf0f5"; rr(ctx, 788, 174, 140, 114, 8); ctx.fill();

    const shelfY = [212, 252, 290];
    for (let s = 0; s < 3; s++) {
      ctx.fillStyle = "#e8c39e"; rr(ctx, 788, shelfY[s] - 4, 140, 6, 2); ctx.fill();
      ctx.fillStyle = "#f5e6d3"; ctx.fillRect(790, shelfY[s] - 4, 136, 2);
    }
    // Tầng 1: Chai dưỡng tóc cao cấp
    const cTop = ["#ff8fab", "#b5179e", "#4cc9f0", "#7209b7", "#f72585", "#4895ef"];
    for (let k = 0; k < 6; k++) {
      const bx = 798 + k * 21;
      ctx.fillStyle = cTop[k]; rr(ctx, bx, 186, 13, 22, 4); ctx.fill();
      ctx.fillStyle = "#ffd166"; ctx.fillRect(bx + 4, 181, 5, 5);
      ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.fillRect(bx + 2, 188, 3, 14);
    }
    // Tầng 2: Hộp thuốc nhuộm tóc rực rỡ
    const cMid = ["#f72585", "#7209b7", "#3a0ca3", "#4361ee", "#4cc9f0", "#06d6a0"];
    for (let k = 0; k < 6; k++) {
      const bx = 798 + k * 21;
      ctx.fillStyle = cMid[k]; rr(ctx, bx, 226, 14, 22, 3); ctx.fill();
      ctx.fillStyle = "#ffffff"; ctx.fillRect(bx + 2, 232, 10, 8);
    }
    // Tầng 3: Hũ sáp vuốt tóc & khăn bông
    for (let k = 0; k < 4; k++) {
      const jx = 798 + k * 20;
      ctx.fillStyle = ["#ffb703", "#fb8500", "#e63946", "#8338ec"][k];
      rr(ctx, jx, 274, 15, 12, 4); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.fillRect(jx + 2, 272, 11, 3);
    }
    for (let k = 0; k < 2; k++) {
      const tx = 886 + k * 18;
      ctx.fillStyle = k ? "#d8f3dc" : "#e0aaff";
      rr(ctx, tx, 270, 15, 16, 6); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(tx + 8, 278, 4, 6, 0, 0, 7); ctx.stroke();
    }

    // 8. Xe đẩy dụng cụ làm tóc (trolley x: 724, y: 320..365)
    ctx.fillStyle = "rgba(0,0,0,.1)"; ctx.beginPath(); ctx.ellipse(738, 364, 16, 5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#adb5bd"; ctx.fillRect(727, 322, 3, 40); ctx.fillRect(746, 322, 3, 40);
    for (let s = 0; s < 3; s++) {
      ctx.fillStyle = "#e9ecef"; rr(ctx, 724, 324 + s * 13, 26, 6, 2); ctx.fill();
    }
    ctx.fillStyle = "#ff6b81"; rr(ctx, 726, 316, 10, 8, 2); ctx.fill();
    ctx.fillStyle = "#2f3542"; ctx.fillRect(733, 319, 6, 3);
    ctx.fillStyle = "#333"; ctx.beginPath(); ctx.arc(728, 364, 2.5, 0, 7); ctx.arc(748, 364, 2.5, 0, 7); ctx.fill();

    // 9. Máy sấy tóc đứng chụp đầu + hơi nước bốc lên (x khoảng 870, y: 350..450)
    const dx = 838;
    ctx.fillStyle = "rgba(0,0,0,.15)"; ctx.beginPath(); ctx.ellipse(dx, 448, 26, 7, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = "#ced4da"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(dx - 20, 448); ctx.lineTo(dx + 20, 448); ctx.stroke();
    for (const wx of [-20, -7, 7, 20]) {
      ctx.fillStyle = "#495057"; ctx.beginPath(); ctx.arc(dx + wx, 448, 2.5, 0, 7); ctx.fill();
    }
    ctx.fillStyle = "#adb5bd"; ctx.fillRect(dx - 3, 396, 6, 50);
    ctx.fillStyle = "#dee2e6"; ctx.fillRect(dx - 1, 396, 2, 50);
    ctx.fillStyle = "#6c757d"; rr(ctx, dx - 7, 398, 14, 18, 4); ctx.fill();
    ctx.fillStyle = "#48cae4"; ctx.beginPath(); ctx.arc(dx, 407, 3.5, 0, 7); ctx.fill();
    ctx.strokeStyle = "#adb5bd"; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(dx, 398); ctx.quadraticCurveTo(dx - 12, 375, dx - 4, 356); ctx.stroke();
    // Mũ sấy hấp dầu
    ctx.fillStyle = "rgba(181, 23, 158, .75)"; rr(ctx, dx - 26, 348, 44, 34, 16); ctx.fill();
    ctx.strokeStyle = "#ffd166"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "rgba(255, 112, 166, .4)"; ctx.beginPath(); ctx.ellipse(dx - 4, 374, 18, 6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.beginPath(); ctx.arc(dx - 12, 356, 4, 0, 7); ctx.fill();

    // Hơi nước bốc lên từ máy sấy
    for (let k = 0; k < 4; k++) {
      const ph = (t * .45 + k * .25) % 1;
      const sx = dx - 12 + k * 8 + Math.sin(t * 2.5 + k * 2) * 5;
      const sy = 346 - ph * 38;
      const sr = 3.5 + ph * 6.5;
      ctx.fillStyle = `rgba(255, 240, 250, ${.55 * Math.sin(ph * Math.PI)})`;
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, 7); ctx.fill();
    }
    ctx.restore();
  }

  function drawChair(i, t, sit) {
    // Ghế salon xoay: chân xoay + lưng ghế (vẽ TRƯỚC người ngồi)
    ctx.save();
    const b = BEDS[i], cx = b.x + BED_W / 2;

    // Bóng đổ trên sàn
    ctx.fillStyle = "rgba(0,0,0,.16)"; ctx.beginPath(); ctx.ellipse(cx, b.y + 70, 32, 7, 0, 0, 7); ctx.fill();
    // Đĩa chân xoay mạ chrome sáng bóng
    ctx.fillStyle = "#8a94a6"; ctx.beginPath(); ctx.ellipse(cx, b.y + 69, 24, 6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#dce1e9"; ctx.beginPath(); ctx.ellipse(cx, b.y + 68, 22, 5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.ellipse(cx, b.y + 67, 16, 3, 0, 0, 7); ctx.fill();
    // Cột thủy lực nâng ghế
    ctx.fillStyle = "#adb5bd"; ctx.fillRect(cx - 4, b.y + 42, 8, 26);
    ctx.fillStyle = "#ffffff"; ctx.fillRect(cx - 1.5, b.y + 42, 3, 26);
    // Bàn đạp chân tăng chỉnh
    ctx.fillStyle = "#6c757d"; ctx.fillRect(cx + 4, b.y + 61, 12, 2.5);
    ctx.fillStyle = "#212529"; rr(ctx, cx + 14, b.y + 60, 6, 4, 1); ctx.fill();

    // Lưng ghế đệm nhung tím pastel thanh lịch
    ctx.fillStyle = "#d4af37"; rr(ctx, cx - 27, b.y + 6, 54, 44, 14); ctx.fill();
    ctx.fillStyle = "#9d4edd"; rr(ctx, cx - 24, b.y + 8, 48, 40, 12); ctx.fill();
    ctx.fillStyle = "#c77dff"; rr(ctx, cx - 20, b.y + 11, 40, 34, 10); ctx.fill();
    // Đường may múi dọc sang trọng
    ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx - 7, b.y + 14); ctx.lineTo(cx - 7, b.y + 40);
    ctx.moveTo(cx + 7, b.y + 14); ctx.lineTo(cx + 7, b.y + 40);
    ctx.stroke();
    // Cúc đính đệm
    ctx.fillStyle = "#7b2cbf";
    ctx.beginPath(); ctx.arc(cx - 7, b.y + 26, 2, 0, 7); ctx.arc(cx + 7, b.y + 26, 2, 0, 7); ctx.fill();
    ctx.restore();
  }

  function drawChairFront(i, t) {
    // Đệm ngồi + tay vịn ghế salon (vẽ SAU, đè lên chân người ngồi)
    ctx.save();
    const b = BEDS[i], cx = b.x + BED_W / 2;

    // Đệm ngồi êm ái dày dặn
    ctx.fillStyle = "#5a189a"; rr(ctx, cx - 31, b.y + 50, 62, 14, 7); ctx.fill();
    ctx.fillStyle = "#7b2cbf"; rr(ctx, cx - 29, b.y + 48, 58, 12, 6); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.3)"; rr(ctx, cx - 24, b.y + 49, 48, 4, 2); ctx.fill();

    // 2 tay vịn bọc kim loại viền đệm
    for (const s of [-1, 1]) {
      const ax = s < 0 ? cx - 34 : cx + 25;
      ctx.fillStyle = "#adb5bd"; rr(ctx, ax + 2, b.y + 42, 5, 14, 2); ctx.fill();
      ctx.fillStyle = "#5a189a"; rr(ctx, ax, b.y + 36, 9, 8, 3); ctx.fill();
      ctx.fillStyle = "#d4af37"; ctx.fillRect(ax + 1, b.y + 35, 7, 1.5);
    }
    ctx.restore();
  }
  // ART-END

  function seat(i, t) {
    const b = BEDS[i], o = bedOwner(i), sit = o && o.lying;
    drawChair(i, t, sit);
    if (sit) drawPlayer({...o, x: b.x + BED_W / 2, y: b.y + LAYOUTS.salon.sitY + Math.sin(t * 2 + i) * .4, walking: false, up: true, sit: true}, t);
    drawChairFront(i, t);
  }
  let seatedOpened = false;
  function draw(t) {
    drawRoom(t);
    autoTalk(t);
    const m = me();                                         // vừa ngồi xuống ghế → mở Gương
    if (m && m.lying && m.bed != null) { if (!seatedOpened) { seatedOpened = true; openMirror(); } }
    else seatedOpened = false;
  }
  function over(t) {                                         // kéo cắt lách cách cạnh Anh Tóc
    const n = NPCS.salon[1], p = Areas.npcPos(n), ph = (t * .7) % 1;
    if (ph < .5) { ctx.font = "11px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.globalAlpha = 1 - ph * 2;
                   ctx.fillText("✂️", p.x + 14 + Math.sin(t * 9) * 2, p.y - 46 - ph * 14); ctx.globalAlpha = 1; }
  }

  // ---------- 4. Giao diện "Gương" ----------
  const st = {hair: DEF.hair, color: DEF.hairColor, turn: 0, light: 100, compare: false, raf: 0};
  const owned = h => h === DEF.hair || (S().hairs || []).includes(h);
  const cur = () => { const o = S().outfit || {}; return {hair: Hair.style(o.hair), color: Hair.DYE[o.hairColor] ? o.hairColor : DEF.hairColor}; };
  function priceOf(h, c) {                                  // giống price_of() ở salon.py
    const now = cur(), sp = owned(h) ? 0 : Hair.STY[h].price, dp = c === now.color ? 0 : Hair.DYE[c].price;
    const free = !!(S().salonFree && (sp || dp) && (owned(h) || Hair.STY[h].tier === "C") && (!dp || Hair.DYE[c].group === "co_ban"));
    return {total: free ? 0 : sp + dp, sp, dp, free};
  }
  function css() {
    if (document.getElementById("salonCss")) return;
    const s = document.createElement("style"); s.id = "salonCss";
    s.textContent = `.sal{display:grid;grid-template-columns:1fr 1.15fr 1fr;gap:10px;align-items:start}
      .salCol{max-height:58vh;overflow:auto;display:flex;flex-direction:column;gap:6px;padding:2px}
      .salCol h4{margin:4px 0 0;font-size:12px;color:var(--muted)}
      .hs{display:flex;justify-content:space-between;align-items:center;gap:6px;padding:7px 9px;border-radius:12px;border:2px solid var(--t);background:rgba(255,255,255,.06);color:inherit;font:inherit;font-size:13px;text-align:left;cursor:pointer}
      .hs b{font-weight:800}.hs small{opacity:.85;white-space:nowrap}.hs.on{background:var(--t);color:#1d1838}
      .hs .tier{font-size:10px;font-weight:900;background:var(--t);color:#fff;border-radius:6px;padding:1px 5px;margin-right:4px}.hs.on .tier{background:#1d1838}
      .dyes{display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:6px}
      .dy{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 2px;border-radius:12px;border:2px solid transparent;background:rgba(255,255,255,.06);color:inherit;font:inherit;font-size:11px;cursor:pointer}
      .dy.on{border-color:var(--accent)}.dy i{width:26px;height:26px;border-radius:50%;border:2px solid #5a3a2a;box-shadow:inset -4px -4px 0 rgba(0,0,0,.12),inset 3px 3px 0 rgba(255,255,255,.45)}
      .salMid{display:flex;flex-direction:column;align-items:center;gap:8px}
      .salMid canvas{width:100%;max-width:240px;border-radius:18px;background:radial-gradient(#fff5fb,#f2c6de 70%,#c9a96e 71%,#c9a96e 74%,#f2c6de 75%);touch-action:none}
      .salBtns{display:flex;gap:6px;width:100%}.salBtns button{flex:1;padding:8px 4px}
      .salPrice{font-size:13px;text-align:center;min-height:34px}.salPrice .miss{color:#ff6b6b;font-weight:800}
      .salGo{width:100%;padding:11px;font-weight:900;font-size:15px}
      @media (max-width:640px){.sal{grid-template-columns:1fr 1fr}.salMid{grid-column:1/3;grid-row:1}.salCol{max-height:34vh}}`;
    document.head.appendChild(s);
  }
  function drawMirror(cv) {
    const c = cv.getContext("2d"), saved = ctx, t = performance.now() / 1000, sc = 4.2;
    const look = st.compare ? cur() : st;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
    const k = 1 - Math.abs(st.turn) * .14;                  // xoay nhẹ trái/phải: bóp ngang + lệch
    c.setTransform(sc * k, 0, st.turn * sc * .06, sc, cv.width / 2 + st.turn * 10, 0);
    ctx = c;
    try { Areas.drawAvatar({x: 0, y: 66, color: myColor, outfit: {...(S().outfit || {}), hair: look.hair, hairColor: look.color, hat: "hat_none"},   // soi gương: bỏ mũ để thấy tóc
                            walking: false, up: false, id: myId}, t); }
    finally { ctx = saved; }
    if (st.compare) { c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = "rgba(29,24,56,.75)"; rr(c, 8, 8, 84, 24, 10); c.fill();
                      c.fillStyle = "#fff"; c.font = "800 13px system-ui"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("⏪ Tóc cũ", 50, 20); }
  }
  function mirrorLoop() {
    const cv = document.getElementById("salCv");
    if (!cv || $("#sheet").classList.contains("hidden")) { st.raf = 0; return; }   // đóng Gương thì dừng vẽ
    drawMirror(cv); st.raf = requestAnimationFrame(mirrorLoop);
  }
  function priceHtml() {
    const now = cur();
    if (st.hair === now.hair && st.color === now.color) return `<div class="salPrice">✨ Đây là kiểu tóc bạn đang để</div>`;
    const p = priceOf(st.hair, st.color), have = S().coins;
    const parts = [p.sp ? `kiểu ${p.sp}` : "", p.dp ? `nhuộm ${p.dp}` : ""].filter(Boolean).join(" + ");
    if (p.free) return `<div class="salPrice">🎁 Lần đầu làm tóc: <b>miễn phí</b></div><button class="opt salGo" id="salGo">✂️ Chốt kiểu này · Miễn phí</button>`;
    if (have < p.total) return `<div class="salPrice">Giá ${parts} = <b>${p.total} 💰</b><br><span class="miss">Còn thiếu ${p.total - have} xu</span> (bạn có ${have})</div>`;
    return `<div class="salPrice">Giá ${parts || "0"} 💰</div><button class="opt salGo" id="salGo">✂️ Chốt kiểu này · ${p.total} 💰</button>`;
  }
  function openMirror(keep) {
    css();
    if (!keep) { const now = cur(); st.hair = now.hair; st.color = now.color; st.turn = 0; st.compare = false; }
    const tierCol = SAL.tiers;
    const styles = ["C", "B", "A", "S"].map(tier => `<h4>Bậc ${tier}</h4>` + SAL.hairstyles.filter(h => h.tier === tier).map(h => {
      const mine = owned(h.id);
      return `<button class="hs ${st.hair === h.id ? "on" : ""}" data-h="${h.id}" style="--t:${tierCol[h.tier]}"><span><span class="tier">${h.tier}</span><b>${h.name}</b></span>
        <small>${mine ? "✓ đã có" : `🔒 ${h.price} 💰`}</small></button>`;
    }).join("")).join("");
    const dyes = Object.entries(SAL.groups).map(([g, name]) => `<h4>${name} · ${SAL.dyes.find(d => d.group === g).price} 💰/lần</h4><div class="dyes">` +
      SAL.dyes.filter(d => d.group === g).map(d => `<button class="dy ${st.color === d.id ? "on" : ""}" data-c="${d.id}" title="${d.name}">
        <i style="background:${d.hair}"></i>${d.name}${cur().color === d.id ? " ✓" : ""}</button>`).join("") + `</div>`).join("");
    openSheet("🪞 Gương thử tóc",
      `${Life.coinLine()}<div class="sal">
        <div class="salCol">${styles}</div>
        <div class="salMid"><canvas id="salCv" width="240" height="290" style="filter:brightness(${st.light}%)"></canvas>
          <div class="salBtns"><button class="opt" id="salL">↶ Trái</button><button class="opt" id="salCmp">👀 Giữ: tóc cũ</button><button class="opt" id="salR">Phải ↷</button></div>
          <div id="salBuy" style="width:100%">${priceHtml()}</div>
          <small style="color:var(--muted);text-align:center">Thử thoải mái, miễn phí! Chỉ trả xu khi bấm Chốt.<br>Kiểu đã mua dùng lại miễn phí (đổi trong 👗 Tủ đồ).</small></div>
        <div class="salCol">${dyes}<h4>💡 Ánh sáng gương</h4><input type="range" id="salLight" min="70" max="130" value="${st.light}"></div>
      </div>`,
      el => {
        const cv = el.querySelector("#salCv");
        const refresh = () => {                                         // cập nhật tại chỗ (giữ vị trí cuộn danh sách)
          el.querySelectorAll("[data-h]").forEach(b => b.classList.toggle("on", b.dataset.h === st.hair));
          el.querySelectorAll("[data-c]").forEach(b => b.classList.toggle("on", b.dataset.c === st.color));
          el.querySelector("#salBuy").innerHTML = priceHtml(); bindGo();
        };
        el.querySelectorAll("[data-h]").forEach(b => b.onclick = () => { st.hair = b.dataset.h; refresh(); });
        el.querySelectorAll("[data-c]").forEach(b => b.onclick = () => { st.color = b.dataset.c; refresh(); });
        el.querySelector("#salL").onclick = () => { st.turn = Math.max(-1, st.turn - 1); };
        el.querySelector("#salR").onclick = () => { st.turn = Math.min(1, st.turn + 1); };
        const cmp = el.querySelector("#salCmp");                        // giữ nhấn để xem tóc cũ
        const on = e => { e.preventDefault(); st.compare = true; }, off = () => { st.compare = false; };
        cmp.addEventListener("pointerdown", on); ["pointerup", "pointerleave", "pointercancel"].forEach(ev => cmp.addEventListener(ev, off));
        el.querySelector("#salLight").oninput = e => { st.light = +e.target.value; cv.style.filter = `brightness(${st.light}%)`; };
        const bindGo = () => { const go = el.querySelector("#salGo"); if (go) go.onclick = () => buy(go); };
        bindGo();
        const buy = async go => {
          go.disabled = true;
          const r = await Life.eco("salonApply", {hair: st.hair, color: st.color});
          if (!r) { go.disabled = false; return; }
          S().outfit = {...S().outfit, ...r.outfit};
          const m = me(); if (m) m.outfit = {...S().outfit};
          Life.apply({fun: 10, xp: 3}); Life.commit();
          Areas.say("toc", r.unlocked ? "Kiểu mới hợp bạn ghê! Đã lưu vào tủ đồ ✨" : "Xong rồi! Đẹp chưa nè ✨", 5);
          send({t: "emote", e: "❤️"});
          toast(r.free ? "🎁 Làm tóc lần đầu miễn phí, đẹp quá!" : `✨ Tóc mới xong! −${r.paid} 💰`);
          openMirror(true);
        };
        if (!st.raf) mirrorLoop();
      });
  }

  // ---------- 5. Chạm / nút hành động ----------
  function tap(x, y) {
    if (inRect(x, y, {x: 34, y: 292, w: 162, h: 70})) { help(); return true; }   // quầy lễ tân
    return false;
  }
  function help() {
    openSheet("💁 Chị Gương", `<div style="display:flex;gap:12px;align-items:center"><img src="/static/salon/npc_stylist_f.svg" style="width:90px;height:135px;object-fit:contain">
      <div class="pomoSub" style="text-align:left">Chào bạn! Ngồi vào ghế (hoặc chạm Anh Tóc) để mở <b>🪞 Gương</b>.<br>
      · Thử tóc <b>miễn phí, không giới hạn</b>, chỉ trả xu khi bấm <b>Chốt</b>.<br>
      · Kiểu tóc mua 1 lần là của bạn mãi, đổi lại trong 👗 Tủ đồ.<br>
      · Nhuộm màu tính tiền mỗi lần đổi màu.${S().salonFree ? "<br>· 🎁 Bạn còn <b>1 lần làm tóc miễn phí</b> (kiểu bậc C + màu cơ bản)." : ""}</div></div>
      <div class="grid"><button class="opt" id="hMir" style="text-align:center">🪞 Mở Gương ngay</button></div>`,
      el => el.querySelector("#hMir").onclick = () => openMirror());
  }
  const npcAct = a => ({salon_mirror: () => openMirror(), salon_help: help})[a]?.();

  // ---------- 6. Gắn vào các móc của Zones (index.html đã gọi Zones.* ở mọi chỗ cần) ----------
  const here = () => myArea === ID;
  const Z = {...Zones};
  Zones.has = a => a === ID || Z.has(a);
  Zones.draw = t => here() ? draw(t) : Z.draw(t);
  Zones.seat = (i, t) => here() ? seat(i, t) : Z.seat(i, t);
  Zones.tap = (x, y) => here() ? tap(x, y) : Z.tap(x, y);
  Zones.act = () => here() ? openMirror() : Z.act();
  Zones.actLabel = a => a === ID ? "🪞 Gương" : Z.actLabel(a);
  Zones.npcAct = a => String(a).startsWith("salon_") ? npcAct(a) : Z.npcAct(a);
  Zones.holes = (hole, t) => here() ? undefined : Z.holes(hole, t);
  Zones.over = t => here() ? over(t) : Z.over(t);
  Zones.onArea = a => { nextTalk = 0; Z.onArea(a); };

  return {openMirror, help, priceOf};
})();
