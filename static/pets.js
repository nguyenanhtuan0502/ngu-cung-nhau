// ============================================================================
// HỆ THỐNG VẼ 21 GIỐNG THÚ CƯNG - THÀNH PHỐ MỘNG MƠ (static/pets.js)
// Đồng bộ phong cách chibi: màu phẳng sáng, viền nâu ấm #6b4a3a (mảnh, bo tròn).
// Tối ưu tốc độ cao: gộp path cùng màu, không gradient, không filter.
// Hỗ trợ Power.on() (tiết kiệm pin): lược bỏ chi tiết nhỏ (chấm sáng mắt, hoa văn).
// ============================================================================

"use strict";

const Pets = (() => {
  // Màu viền nâu ấm chuẩn đồng bộ toàn bộ đồ hoạ game
  const OUTLINE = "#6b4a3a";

  // Danh sách 21 giống thú cưng chuẩn
  const PET_IDS = [
    "cat", "cat_black", "cat_siamese", "cat_calico", "cat_persian",
    "dog", "dog_shiba", "dog_corgi", "dog_poodle", "dog_husky", "dog_dalmatian",
    "bunny", "bunny_lop", "hamster", "squirrel", "hedgehog", "snake",
    "fox", "duck", "turtle", "panda"
  ];
  const PET_SET = new Set(PET_IDS);

  // --------------------------------------------------------------------------
  // CÁC HÀM TIỆN ÍCH DÙNG CHUNG (TỐI ƯU HIỆU NĂNG)
  // --------------------------------------------------------------------------

  // Vẽ mắt (chế độ mở hoặc nhắm khi ngủ / chớp mắt; chân dung icon luôn mở long lanh)
  function drawEyes(c, ex1, ey1, r1, ex2, ey2, r2, isSleeping, blink, eyeCol, lowPower, isIcon) {
    if (isIcon) {
      isSleeping = false;
      blink = false;
    }
    if (isSleeping || blink) {
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.2;
      c.beginPath();
      c.arc(ex1, ey1, r1, 0.2, Math.PI - 0.2);
      if (ex2 != null) c.arc(ex2, ey2, r2, 0.2, Math.PI - 0.2);
      c.stroke();
      return;
    }
    // Mắt mở to tròn
    c.fillStyle = eyeCol || "#241812";
    c.beginPath();
    c.arc(ex1, ey1, r1, 0, Math.PI * 2);
    if (ex2 != null) c.arc(ex2, ey2, r2, 0, Math.PI * 2);
    c.fill();

    // Điểm sáng mắt (luôn có trong chân dung icon để lấp lánh dễ thương)
    if (!lowPower || isIcon) {
      c.fillStyle = "#ffffff";
      c.beginPath();
      c.arc(ex1 + r1 * 0.35, ey1 - r1 * 0.35, Math.max(0.6, r1 * 0.36), 0, Math.PI * 2);
      if (ex2 != null) c.arc(ex2 + r2 * 0.35, ey2 - r2 * 0.35, Math.max(0.5, r2 * 0.36), 0, Math.PI * 2);
      c.fill();
    }
  }

  // Vẽ má hồng xinh xắn
  function drawCheeks(c, x1, y1, x2, y2, rx, ry) {
    c.fillStyle = "rgba(255,130,150,0.45)";
    c.beginPath();
    c.ellipse(x1, y1, rx || 2.2, ry || 1.3, 0, 0, Math.PI * 2);
    if (x2 != null) c.ellipse(x2, y2, (rx || 2.2) * 0.85, (ry || 1.3) * 0.85, 0, 0, Math.PI * 2);
    c.fill();
  }

  // --------------------------------------------------------------------------
  // HỌ MÈO: Mèo mướp, Mèo mun, Mèo Xiêm, Mèo tam thể, Mèo Ba Tư
  // --------------------------------------------------------------------------
  function drawCatFamily(c, id, ctx) {
    const { t, seed, isSleeping, isWalking, lowPower, isRoom, isIcon } = ctx;

    // Màu sắc theo giống
    let mainCol = "#f4a261"; // Mèo mướp cam
    let bellyCol = "#fff1e0";
    let eyeCol = "#241812";
    let innerEarCol = "#ffb8b8";
    let noseCol = "#f08080";

    if (id === "cat_black") {
      mainCol = "#2b2b35";
      bellyCol = "#24242e";
      innerEarCol = "#454050";
      noseCol = "#4a4254";
      eyeCol = isRoom ? "#ffd23f" : "#fcd34d"; // Mèo Mun phòng ngủ mắt vàng #ffd23f
    } else if (id === "cat_siamese") {
      mainCol = "#f5ebe0"; // Lông kem
      bellyCol = "#faf4ed";
      innerEarCol = "#422b1d";
      noseCol = "#2c1b11";
      eyeCol = "#38bdf8"; // Mắt xanh biển biếc
    } else if (id === "cat_calico") {
      mainCol = "#ffffff"; // Trắng tinh
      bellyCol = "#ffffff";
    } else if (id === "cat_persian") {
      mainCol = "#fdfbf7"; // Trắng tuyết bông xù
      bellyCol = "#ffffff";
      innerEarCol = "#ffebee";
    }

    const bob = isWalking ? Math.abs(Math.sin(t * 14 + seed)) * 1.2 : 0;
    const leg = isWalking ? Math.sin(t * 14 + seed) * 3 : 0;
    const tailWag = Math.sin(t * (isWalking ? 8 : 3.5) + seed);
    // Chân dung icon không chớp mắt (luôn mở to)
    const blink = !isSleeping && !isIcon && (((t * 1.5 + seed * 2.7 + 1.0) % 3.8) < 0.14);
    const brSleep = isSleeping ? Math.sin(t * 2.0 + seed) * 0.5 : 0;

    // 1. KHI NGỦ (cuộn tròn bình yên)
    if (isSleeping) {
      // Đuôi cuộn tròn trước thân
      c.strokeStyle = id === "cat_siamese" ? "#422b1d" : mainCol;
      c.lineWidth = id === "cat_persian" ? 4.5 : 2.8;
      c.beginPath();
      c.arc(0, -4.5, 9.5, 0.3, 2.3);
      c.stroke();

      // Viền ngoài đuôi
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.1;
      c.beginPath();
      c.arc(0, -4.5, 9.5, 0.3, 2.3);
      c.stroke();

      // Thân cuộn tròn
      c.fillStyle = mainCol;
      c.beginPath();
      c.ellipse(0, -5.5, 10.5, 6 + brSleep * 0.5, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      // Mảng tam thể hoặc lông xù Ba Tư khi ngủ
      if (id === "cat_calico" && !lowPower) {
        c.fillStyle = "#e76f51";
        c.beginPath();
        c.ellipse(-3, -7.5, 4.5, 3, 0.2, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#2b2b35";
        c.beginPath();
        c.ellipse(3, -5, 3.5, 2.5, -0.2, 0, Math.PI * 2);
        c.fill();
      } else if (id === "cat_persian") {
        // Mèo Ba Tư cuộn thành cục bông tuyết xù mềm mại (tô đầy, không viền rỗng)
        c.fillStyle = mainCol;
        c.beginPath();
        c.arc(-5.5, -7.5, 3.5, 0, Math.PI * 2);
        c.arc(5.5, -7.5, 3.5, 0, Math.PI * 2);
        c.arc(0, -9.0, 3.8, 0, Math.PI * 2);
        c.fill();
      }

      // Đầu gối thấp
      c.fillStyle = mainCol;
      c.beginPath();
      c.arc(6.5, -6, 5.5, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      // Mặt nạ mèo Xiêm khi ngủ
      if (id === "cat_siamese") {
        c.fillStyle = "#422b1d";
        c.beginPath();
        c.ellipse(8, -5.5, 3.2, 2.8, 0, 0, Math.PI * 2);
        c.fill();
      }

      // Tai gấp nhẹ
      c.fillStyle = (id === "cat_siamese" || (id === "cat_calico" && !lowPower)) ? (id === "cat_calico" ? "#e76f51" : "#422b1d") : mainCol;
      c.beginPath();
      c.moveTo(4, -9.5); c.lineTo(4.5, -13); c.lineTo(7, -10.5);
      c.moveTo(7.5, -10.5); c.lineTo(10, -13); c.lineTo(10.5, -8.5);
      c.fill();
      c.stroke();

      // Mắt nhắm ngủ
      drawEyes(c, 8, -6.5, 1.5, 5, -6.5, 1.3, true, false, eyeCol, lowPower, isIcon);
      drawCheeks(c, 7, -4.5, 4.5, -4.5, 1.8, 1);
      return;
    }

    // 2. KHI ĐỨNG HOẶC ĐI (chibi 3/4 nhìn sang phải)

    // Chân xa (phía trong)
    const legFarCol = id === "cat_siamese" ? "#422b1d" : (id === "cat_black" ? "#22222a" : mainCol);
    c.fillStyle = legFarCol;
    c.fillRect(-8.5 - leg, -4, 2.8, 4.2);
    c.fillRect(3.5 - leg, -4, 2.8, 4.2);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.1;
    c.strokeRect(-8.5 - leg, -4, 2.8, 4.2);
    c.strokeRect(3.5 - leg, -4, 2.8, 4.2);

    // Đuôi mèo
    const tailCol = id === "cat_siamese" ? "#422b1d" : mainCol;
    if (id === "cat_persian") {
      // Đuôi xù bồng bềnh hình chùm mây của mèo Ba Tư: khối bông tô đầy màu lông trắng, viền ngoài nét nâu, liền khối không viền trong
      c.fillStyle = mainCol;
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.3;
      c.beginPath();
      const tw = tailWag * 1.5;
      c.moveTo(-7.5, -8.5 - bob);
      c.quadraticCurveTo(-12.5, -8.5 - bob, -13.0, -11.5 - bob); // Múi dưới
      c.quadraticCurveTo(-17.5 + tw, -12.5 - bob, -17.0 + tw, -16.5 - bob); // Múi ngoài giữa
      c.quadraticCurveTo(-16.0 + tw, -22.5 - bob, -10.5 + tw, -22.5 - bob); // Múi đỉnh chóp
      c.quadraticCurveTo(-5.5 + tw, -21.5 - bob, -6.0, -16.5 - bob); // Múi trên trong
      c.quadraticCurveTo(-5.0, -12.5 - bob, -7.5, -8.5 - bob); // Nối về mông
      c.closePath();
      c.fill();
      c.stroke();
    } else {
      // Đuôi dài cong mềm mại
      c.strokeStyle = tailCol;
      c.lineWidth = 2.6;
      c.beginPath();
      c.moveTo(-9, -8 - bob);
      c.quadraticCurveTo(-15, -11 - bob, -13 + tailWag * 2, -19 - bob);
      c.stroke();
      // Viền nét đuôi
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.2;
      c.stroke();

      // Sọc đuôi mèo mướp / tam thể
      if (id === "cat" && !lowPower) {
        c.strokeStyle = "#c55a11";
        c.lineWidth = 2.4;
        c.beginPath();
        c.moveTo(-11.5, -12 - bob); c.lineTo(-12.5, -14 - bob);
        c.moveTo(-12.8, -16 - bob); c.lineTo(-13 + tailWag * 1.5, -18 - bob);
        c.stroke();
      }
    }

    // Thân mèo
    c.fillStyle = mainCol;
    c.beginPath();
    c.ellipse(-1, -8 - bob, 9.2, 6.2, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Bụng trắng (mèo mướp / mèo Xiêm)
    if (id === "cat") {
      c.fillStyle = bellyCol;
      c.beginPath();
      c.ellipse(1, -6 - bob, 6, 3.5, 0, 0, Math.PI * 2);
      c.fill();

      // Sọc vằn cam đậm trên lưng mèo mướp
      if (!lowPower) {
        c.strokeStyle = "#c55a11";
        c.lineWidth = 1.3;
        c.beginPath();
        c.moveTo(-4, -13 - bob); c.lineTo(-3, -8 - bob);
        c.moveTo(0, -13.5 - bob); c.lineTo(1, -9 - bob);
        c.stroke();
      }
    } else if (id === "cat_calico") {
      // Mảng loang cam + đen đặc trưng mèo tam thể
      c.fillStyle = "#e76f51"; // Cam
      c.beginPath();
      c.ellipse(-1, -12 - bob, 4.5, 2.5, 0.1, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#2b2b35"; // Đen
      c.beginPath();
      c.ellipse(-6, -9 - bob, 4.0, 3.2, -0.2, 0, Math.PI * 2);
      c.fill();
    } else if (id === "cat_persian") {
      // Bờm lông cổ xù bông to tròn xung quanh ngực: khối bông liền mạch tô đầy màu lông, viền ngoài nét nâu, không viền trong
      c.fillStyle = mainCol;
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.3;
      c.beginPath();
      c.moveTo(2.0, -11.5 - bob);
      c.quadraticCurveTo(6.5, -12.0 - bob, 6.8, -8.5 - bob); // Múi ngực trên
      c.quadraticCurveTo(8.0, -5.0 - bob, 5.5, -3.8 - bob); // Múi ngực dưới
      c.quadraticCurveTo(3.0, -2.0 - bob, 1.5, -3.8 - bob); // Múi đáy ngực
      c.quadraticCurveTo(-0.5, -2.5 - bob, -0.5, -5.5 - bob); // Múi sau ngực
      c.quadraticCurveTo(-1.0, -9.5 - bob, 2.0, -11.5 - bob); // Khép kín
      c.closePath();
      c.fill();
      c.stroke();
    }

    // Chân gần (phía ngoài)
    const legNearCol = id === "cat_siamese" ? "#422b1d" : (id === "cat_black" ? "#2b2b35" : mainCol);
    c.fillStyle = legNearCol;
    c.fillRect(-6.5 + leg, -4, 2.8, 4.2);
    c.fillRect(5.2 + leg, -4, 2.8, 4.2);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.1;
    c.strokeRect(-6.5 + leg, -4, 2.8, 4.2);
    c.strokeRect(5.2 + leg, -4, 2.8, 4.2);

    // ĐẦU MÈO
    const hx = 6.8, hy = -15 - bob * 0.7;
    const hrx = id === "cat_persian" ? 7.8 : 7.2;
    const hry = id === "cat_persian" ? 7.0 : 6.5;

    // Tai mèo
    const ear1Col = id === "cat_siamese" ? "#422b1d" : (id === "cat_calico" ? "#e76f51" : mainCol);
    const ear2Col = id === "cat_siamese" ? "#422b1d" : (id === "cat_calico" ? "#2b2b35" : mainCol);

    // Tai xa
    c.fillStyle = ear2Col;
    c.beginPath();
    c.moveTo(hx - 4.5, hy - 4.5); c.lineTo(hx - 3, hy - (id === "cat_persian" ? 9.5 : 11.2)); c.lineTo(hx, hy - 5.5);
    c.fill();
    c.stroke();

    // Tai gần
    c.fillStyle = ear1Col;
    c.beginPath();
    c.moveTo(hx + 1.5, hy - 5.5); c.lineTo(hx + 4.5, hy - (id === "cat_persian" ? 9.8 : 11.8)); c.lineTo(hx + 7.5, hy - 4.5);
    c.fill();
    c.stroke();

    // Lòng tai hồng
    c.fillStyle = innerEarCol;
    c.beginPath();
    c.moveTo(hx + 2.8, hy - 5.8); c.lineTo(hx + 4.5, hy - 10.0); c.lineTo(hx + 6.2, hy - 5.2);
    c.fill();

    // Khối đầu tròn
    c.fillStyle = mainCol;
    c.beginPath();
    c.ellipse(hx, hy, hrx, hry, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Chi tiết khuôn mặt riêng
    if (id === "cat_siamese") {
      // Mặt nạ nâu sẫm ở giữa mặt mèo Xiêm
      c.fillStyle = "#422b1d";
      c.beginPath();
      c.ellipse(hx + 3, hy + 0.8, 4.2, 3.4, 0, 0, Math.PI * 2);
      c.fill();
    } else if (id === "cat" && !lowPower) {
      // Sọc trán chữ M mèo mướp
      c.strokeStyle = "#c55a11";
      c.lineWidth = 1.1;
      c.beginPath();
      c.moveTo(hx + 2, hy - 5); c.lineTo(hx + 3.5, hy - 2.5); c.lineTo(hx + 5, hy - 4.8);
      c.stroke();
    }

    // Mắt mở to tròn
    drawEyes(c, hx + 4.2, hy - 0.8, 1.8, hx + 0.2, hy - 0.8, 1.5, isSleeping, blink, eyeCol, lowPower, isIcon);

    // Má hồng
    drawCheeks(c, hx + 3.2, hy + 2.2, hx - 1.2, hy + 2.2, 2.0, 1.2);

    // Mũi & nụ cười vui vẻ
    c.fillStyle = noseCol;
    c.beginPath();
    const noseY = id === "cat_persian" ? hy - 0.2 : hy + 1.2; // Mèo Ba Tư mặt tẹt mũi cao sát mắt
    c.arc(hx + 6.2, noseY, 0.9, 0, Math.PI * 2);
    c.fill();

    // Nụ cười vui vẻ khi chụp chân dung tiệm thú cưng
    if (isIcon) {
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.0;
      c.beginPath();
      c.arc(hx + 4.8, hy + 2.0, 1.2, 0.1, Math.PI - 0.2);
      c.stroke();
    }

    // Ria mép mảnh
    if (!lowPower) {
      c.strokeStyle = id === "cat_black" ? "#555566" : OUTLINE;
      c.lineWidth = 0.9;
      c.beginPath();
      c.moveTo(hx + 7.5, hy + 1); c.lineTo(hx + 12, hy - 0.5);
      c.moveTo(hx + 7.5, hy + 2.5); c.lineTo(hx + 11.5, hy + 3.5);
      c.stroke();
    }
  }

  // --------------------------------------------------------------------------
  // HỌ CHÓ: Cún vàng, Shiba, Corgi, Poodle, Husky, Chó đốm
  // --------------------------------------------------------------------------
  function drawDogFamily(c, id, ctx) {
    const { t, seed, isSleeping, isWalking, lowPower, isIcon } = ctx;

    const bob = isWalking ? Math.abs(Math.sin(t * 14 + seed)) * 1.3 : 0;
    const leg = isWalking ? Math.sin(t * 14 + seed) * 3 : 0;
    const tailWag = Math.sin(t * (isWalking ? 16 : 8) + seed);
    // Chân dung icon không chớp mắt (luôn mở to)
    const blink = !isSleeping && !isIcon && (((t * 1.5 + seed * 2.7 + 1.0) % 3.8) < 0.14);
    const brSleep = isSleeping ? Math.sin(t * 2.0 + seed) * 0.5 : 0;

    // Màu nền từng bé
    let mainCol = "#c68b59"; // Cún vàng
    let snoutCol = "#faeedd";
    let eyeCol = "#241812";

    if (id === "dog_shiba") {
      mainCol = "#e0954f"; // Cam đỏ Shiba
    } else if (id === "dog_corgi") {
      mainCol = "#e8a35c"; // Vàng cam Corgi
    } else if (id === "dog_poodle") {
      mainCol = "#fff5ee"; // Kem xù Poodle
      snoutCol = "#fff5ee";
    } else if (id === "dog_husky") {
      mainCol = "#9aa5b1"; // Xám tro Husky
      snoutCol = "#ffffff";
      eyeCol = "#38bdf8";  // Mắt xanh băng giá
    } else if (id === "dog_dalmatian") {
      mainCol = "#ffffff"; // Trắng tinh
      snoutCol = "#ffffff";
    }

    // 1. KHI NGỦ
    if (isSleeping) {
      c.fillStyle = mainCol;
      c.beginPath();
      c.ellipse(0, -5.5, 11, 6 + brSleep * 0.5, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      // Đốm Dalmatian khi ngủ
      if (id === "dog_dalmatian" && !lowPower) {
        c.fillStyle = "#2b2b35";
        c.beginPath();
        c.arc(-4, -6, 1.8, 0, Math.PI * 2);
        c.arc(2, -7.5, 1.5, 0, Math.PI * 2);
        c.fill();
      }

      // Đầu cún ngủ gối thấp
      c.fillStyle = mainCol;
      c.beginPath();
      c.arc(6.8, -6, 5.8, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      // Mõm cún ngủ
      c.fillStyle = snoutCol;
      c.beginPath();
      c.ellipse(9.2, -5.2, 3.2, 2.4, 0, 0, Math.PI * 2);
      c.fill();

      // Mũi đen
      c.fillStyle = "#1a1a1a";
      c.beginPath();
      c.arc(11.2, -5.8, 1.2, 0, Math.PI * 2);
      c.fill();

      // Mắt nhắm
      drawEyes(c, 8, -6.8, 1.6, 5, -6.8, 1.3, true, false, eyeCol, lowPower, isIcon);
      drawCheeks(c, 7.5, -4.5, null, null, 2.0, 1.2);
      return;
    }

    // 2. KHI ĐỨNG HOẶC ĐI

    // Chân xa
    const legH = id === "dog_corgi" ? 2.5 : 4.5; // Chân Corgi SIÊU NGẮN!
    c.fillStyle = mainCol;
    c.fillRect(-8.5 - leg, -legH, 3.0, legH);
    c.fillRect(3.5 - leg, -legH, 3.0, legH);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.1;
    c.strokeRect(-8.5 - leg, -legH, 3.0, legH);
    c.strokeRect(3.5 - leg, -legH, 3.0, legH);

    // Đuôi chó theo từng giống
    if (id === "dog_shiba") {
      // Đuôi Shiba cuộn tròn xoắn ốc trên lưng!
      c.fillStyle = mainCol;
      c.beginPath();
      c.arc(-8, -13 - bob, 4.2, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.fillStyle = "#ffffff";
      c.beginPath();
      c.arc(-8, -13 - bob, 1.8, 0, Math.PI * 2);
      c.fill();
    } else if (id === "dog_corgi") {
      // Đuôi cụt Corgi ngắn ngủn nhấp nhô
      c.fillStyle = "#ffffff";
      c.beginPath();
      c.arc(-11, -9 - bob, 2.2, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    } else if (id === "dog_poodle") {
      // Đuôi Poodle: cuống đuôi mảnh nối vào cục bông tròn xù ở chóp (tô đầy màu kem, viền ngoài nét nâu)
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(-7.5, -8.5 - bob);
      c.lineTo(-12 + tailWag * 2, -15 - bob);
      c.stroke();

      // Cục bông chóp đuôi: tô đầy màu kem, viền ngoài, che đầu cuống
      c.fillStyle = mainCol;
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.3;
      c.beginPath();
      c.arc(-12.5 + tailWag * 2, -15.5 - bob, 3.8, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    } else {
      // Đuôi vẫy tít mù của cún vàng / Husky / chó đốm
      c.strokeStyle = mainCol;
      c.lineWidth = id === "dog_husky" ? 4.2 : 2.8;
      c.beginPath();
      c.moveTo(-8, -9 - bob);
      c.lineTo(-13 + tailWag * 3, -15 - bob + tailWag * 1.5);
      c.stroke();
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.1;
      c.stroke();
    }

    // Thân chó
    const bodyW = id === "dog_corgi" ? 11.5 : 9.5;
    const bodyH = id === "dog_corgi" ? 6.8 : 6.5;
    c.fillStyle = mainCol;
    c.beginPath();
    c.ellipse(-1, -8 - bob, bodyW, bodyH, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Mông tròn Corgi hình trái tim trắng phía sau
    if (id === "dog_corgi") {
      c.fillStyle = "#ffffff";
      c.beginPath();
      c.ellipse(-9.5, -7.5 - bob, 4.0, 4.2, 0.2, 0, Math.PI * 2);
      c.fill();
    }

    // Đốm đen trên thân chó Dalmatian
    if (id === "dog_dalmatian" && !lowPower) {
      c.fillStyle = "#2b2b35";
      c.beginPath();
      c.arc(-4, -10 - bob, 1.8, 0, Math.PI * 2);
      c.arc(0, -7 - bob, 1.5, 0, Math.PI * 2);
      c.arc(-6, -6 - bob, 1.4, 0, Math.PI * 2);
      c.arc(3, -9 - bob, 1.2, 0, Math.PI * 2);
      c.fill();
    }

    // Ngực trắng (Shiba, Corgi, Husky) & Bờm ngực bông xù Poodle
    if (id === "dog_shiba" || id === "dog_corgi" || id === "dog_husky") {
      c.fillStyle = "#ffffff";
      c.beginPath();
      c.ellipse(3, -7 - bob, 4.5, 4.0, 0, 0, Math.PI * 2);
      c.fill();
    } else if (id === "dog_poodle") {
      // Bờm ngực xù tròn của Poodle (tô đầy màu kem, viền ngoài nét nâu, liền khối không viền trong)
      c.fillStyle = mainCol;
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.3;
      c.beginPath();
      c.moveTo(1.5, -11.0 - bob);
      c.quadraticCurveTo(6.2, -11.5 - bob, 6.5, -7.5 - bob);
      c.quadraticCurveTo(7.5, -4.5 - bob, 5.0, -3.5 - bob);
      c.quadraticCurveTo(2.2, -2.5 - bob, 0.5, -4.5 - bob);
      c.quadraticCurveTo(-0.5, -8.0 - bob, 1.5, -11.0 - bob);
      c.closePath();
      c.fill();
      c.stroke();
    }

    // Chân gần
    c.fillStyle = id === "dog_corgi" ? "#ffffff" : mainCol; // Corgi tất chân trắng
    c.fillRect(-6.5 + leg, -legH, 3.0, legH);
    c.fillRect(5.2 + leg, -legH, 3.0, legH);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.1;
    c.strokeRect(-6.5 + leg, -legH, 3.0, legH);
    c.strokeRect(5.2 + leg, -legH, 3.0, legH);

    // ĐẦU CHÓ
    const hx = 6.8, hy = -15 - bob * 0.7;

    // Tai chó theo giống
    if (id === "dog_shiba" || id === "dog_husky") {
      // Tai tam giác dựng thẳng đứng
      c.fillStyle = mainCol;
      c.beginPath();
      c.moveTo(hx - 3.5, hy - 4.5); c.lineTo(hx - 2, hy - 11.5); c.lineTo(hx + 0.5, hy - 5.5);
      c.moveTo(hx + 1.8, hy - 5.5); c.lineTo(hx + 4.8, hy - 12.0); c.lineTo(hx + 7.2, hy - 4.5);
      c.fill();
      c.stroke();
      // Lòng tai hồng
      c.fillStyle = "#ffcdd2";
      c.beginPath();
      c.moveTo(hx + 3, hy - 5.8); c.lineTo(hx + 4.8, hy - 10.2); c.lineTo(hx + 6.2, hy - 5.2);
      c.fill();
    } else if (id === "dog_corgi") {
      // Tai Corgi: TO, RỘNG, HÌNH TAM GIÁC DỰNG, NGẮN HƠN (bằng ~2/3 trước), ĐẦU TAI HƠI TRÒN
      c.fillStyle = mainCol;
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.3;

      // Tai xa: tam giác dựng rộng
      c.beginPath();
      c.moveTo(hx - 4.2, hy - 4.5);
      c.lineTo(hx - 2.8, hy - 10.2);
      c.quadraticCurveTo(hx - 2.0, hy - 11.2, hx - 1.2, hy - 10.2);
      c.lineTo(hx + 0.6, hy - 5.5);
      c.closePath();
      c.fill();
      c.stroke();

      // Tai gần: to, rộng, hình tam giác dựng, đầu tai hơi tròn
      c.beginPath();
      c.moveTo(hx + 1.2, hy - 5.5);
      c.lineTo(hx + 3.8, hy - 10.8);
      c.quadraticCurveTo(hx + 4.6, hy - 11.8, hx + 5.4, hy - 10.8);
      c.lineTo(hx + 8.0, hy - 4.2);
      c.closePath();
      c.fill();
      c.stroke();

      // Lòng tai hồng rộng hình tam giác bo góc
      c.fillStyle = "#ffb8b8";
      c.beginPath();
      c.moveTo(hx + 2.5, hy - 5.2);
      c.lineTo(hx + 4.3, hy - 9.5);
      c.quadraticCurveTo(hx + 4.6, hy - 10.2, hx + 5.0, hy - 9.5);
      c.lineTo(hx + 6.8, hy - 4.5);
      c.closePath();
      c.fill();
    } else if (id === "dog_poodle") {
      // Tai Poodle vẽ cùng với đầu bên dưới
    } else {
      // Tai cụp mềm của cún vàng / chó đốm
      c.fillStyle = id === "dog_dalmatian" ? "#2b2b35" : mainCol;
      c.beginPath();
      c.ellipse(hx - 2.5, hy - 1.5, 2.6, 5.2, -0.25, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }

    // Khối đầu
    c.fillStyle = mainCol;
    c.beginPath();
    c.ellipse(hx, hy, 7.4, 6.8, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Chi tiết Poodle: Topknot và Tai cục bông hợp nhất liền khối
    if (id === "dog_poodle") {
      // Cục bông đỉnh đầu (topknot): vòm bông tròn xù tô đầy, hợp nhất với đầu không thấy viền cắt trán
      c.fillStyle = mainCol;
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.3;
      c.beginPath();
      c.arc(hx, hy - 6.8, 4.2, Math.PI * 0.95, Math.PI * 2.05);
      c.closePath();
      c.fill();
      c.stroke();
      // Xoá viền đầu bên dưới cục bông để hợp nhất thành 1 khối bông mềm mại
      c.beginPath();
      c.ellipse(hx, hy - 5.5, 3.8, 2.5, 0, 0, Math.PI * 2);
      c.fill();

      // Hai tai cục bông rủ hai bên má (khối bông dài bồng bềnh, tô đầy màu kem, liền khối mềm mại)
      c.beginPath();
      const earX = hx - 3.2, earY = hy - 1.5;
      c.moveTo(earX, earY - 4.5);
      c.quadraticCurveTo(earX - 3.5, earY - 3.0, earX - 3.2, earY);
      c.quadraticCurveTo(earX - 4.0, earY + 3.8, earX - 1.5, earY + 4.5);
      c.quadraticCurveTo(earX + 1.2, earY + 4.5, earX + 1.5, earY + 1.5);
      c.quadraticCurveTo(earX + 1.5, earY - 2.5, earX, earY - 4.5);
      c.closePath();
      c.fill();
      c.stroke();
    }

    // Vệt mặt nạ Husky đặc trưng
    if (id === "dog_husky") {
      c.fillStyle = "#ffffff";
      c.beginPath();
      c.ellipse(hx + 2.5, hy + 0.5, 4.8, 5.0, 0, 0, Math.PI * 2);
      c.fill();
      // Vệt trán Husky
      if (!lowPower) {
        c.fillStyle = mainCol;
        c.beginPath();
        c.moveTo(hx + 1.5, hy - 6.5); c.lineTo(hx + 2.8, hy - 2); c.lineTo(hx + 4.2, hy - 6.5);
        c.fill();
      }
    } else if (id === "dog_shiba") {
      // Má phồng trắng Shiba Urajiro
      c.fillStyle = "#ffffff";
      c.beginPath();
      c.ellipse(hx + 2.5, hy + 2.2, 3.6, 2.8, 0, 0, Math.PI * 2);
      c.ellipse(hx - 1.5, hy + 2.2, 3.0, 2.5, 0, 0, Math.PI * 2);
      c.fill();
      // 2 chấm lông mày trắng Shiba
      if (!lowPower) {
        c.beginPath();
        c.arc(hx + 2.5, hy - 4.2, 0.9, 0, Math.PI * 2);
        c.arc(hx - 1.2, hy - 4.2, 0.8, 0, Math.PI * 2);
        c.fill();
      }
    } else if (id === "dog_corgi") {
      // Vệt trắng giữa trán Corgi
      c.fillStyle = "#ffffff";
      c.beginPath();
      c.ellipse(hx + 3, hy + 0.5, 2.2, 5.0, 0, 0, Math.PI * 2);
      c.fill();
    }

    // Mõm cún
    c.fillStyle = snoutCol;
    c.beginPath();
    c.ellipse(hx + 4.8, hy + 1.2, 3.8, 2.8, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Mũi to tròn màu đen
    c.fillStyle = "#1a1a1a";
    c.beginPath();
    c.arc(hx + 7.6, hy + 0.2, 1.4, 0, Math.PI * 2);
    c.fill();

    // Lưỡi hồng thè nhẹ khi đi
    if (isWalking) {
      c.fillStyle = "#ff6b81";
      c.beginPath();
      c.arc(hx + 5.8, hy + 3.8, 1.3, 0, Math.PI);
      c.fill();
    }

    // Nụ cười vui vẻ khi chụp chân dung tiệm thú cưng
    if (isIcon) {
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.0;
      c.beginPath();
      c.arc(hx + 4.5, hy + 2.0, 1.3, 0.1, Math.PI - 0.2);
      c.stroke();
    }

    // Mắt mở to tròn
    drawEyes(c, hx + 3.8, hy - 1.2, 1.8, hx - 0.2, hy - 1.2, 1.5, isSleeping, blink, eyeCol, lowPower, isIcon);
    drawCheeks(c, hx + 3.0, hy + 2.5, hx - 1.5, hy + 2.5, 2.0, 1.2);
  }

  // --------------------------------------------------------------------------
  // HỌ THỎ & GẶM NHẤM: Thỏ trắng, Thỏ tai cụp, Chuột Hamster, Sóc nâu
  // --------------------------------------------------------------------------

  // Thỏ trắng (bunny) & Thỏ tai cụp (bunny_lop)
  function drawBunnyFamily(c, id, ctx) {
    const { t, seed, isSleeping, isWalking, lowPower, isIcon } = ctx;
    const isLop = id === "bunny_lop";
    const mainCol = isLop ? "#c9a27e" : "#f5f2eb";
    const bellyCol = isLop ? "#f7ede2" : "#ffffff";

    const bob = isWalking ? Math.abs(Math.sin(t * 14 + seed)) * 1.5 : 0;
    const leg = isWalking ? Math.sin(t * 14 + seed) * 3 : 0;
    // Chân dung icon không chớp mắt (luôn mở to)
    const blink = !isSleeping && !isIcon && (((t * 1.5 + seed * 2.7 + 1.0) % 3.8) < 0.14);
    const brSleep = isSleeping ? Math.sin(t * 2.0 + seed) * 0.5 : 0;

    // Khi ngủ: tròn xoe như viên mochi tuyết
    if (isSleeping) {
      // Đuôi tròn nhỏ
      c.fillStyle = "#ffffff";
      c.beginPath();
      c.arc(-8.5, -4, 2.5, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      // Thân ép sát đất
      c.fillStyle = mainCol;
      c.beginPath();
      c.ellipse(0, -5, 10, 5.5 + brSleep * 0.4, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      // Tai cụp / xuôi ra sau lưng
      c.beginPath();
      c.ellipse(-1, -9, 6.5, 2.2, -0.2, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      // Đầu tròn gối ngủ
      c.beginPath();
      c.arc(5.8, -5.5, 5.2, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      drawEyes(c, 7, -5.8, 1.5, 4, -5.8, 1.3, true, false, "#241812", lowPower, isIcon);
      drawCheeks(c, 6.5, -4.0, null, null, 1.8, 1.0);
      return;
    }

    // Khi đứng / nhảy
    // Chân sau gập
    c.fillStyle = mainCol;
    c.beginPath();
    c.ellipse(-4 - leg * 0.5, -4, 4.2, 3.2, 0.2, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Chân trước
    c.fillRect(3.2 + leg, -3.5, 2.6, 3.5);
    c.strokeRect(3.2 + leg, -3.5, 2.6, 3.5);

    // Đuôi bông tròn nhỏ sau mông
    c.fillStyle = "#ffffff";
    c.beginPath();
    c.arc(-9.5, -7 - bob, 2.8, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Thân thỏ
    c.fillStyle = mainCol;
    c.beginPath();
    c.ellipse(-1, -7.5 - bob, 8.8, 6.5, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Bụng kem
    c.fillStyle = bellyCol;
    c.beginPath();
    c.ellipse(1, -6 - bob, 5.5, 4.0, 0, 0, Math.PI * 2);
    c.fill();

    // ĐẦU THỎ
    const hx = 5.5, hy = -14.5 - bob * 0.7;

    // TAI THỎ
    if (isLop) {
      // Thỏ tai cụp: TAI DÀI RỦ CỤP HẲN XUỐNG HAI BÊN MÁ
      const lopSway = isWalking ? Math.sin(t * 12 + seed) * 0.2 : 0;
      c.fillStyle = mainCol;
      c.beginPath();
      c.ellipse(hx - 2, hy + 2, 2.6, 6.5, 0.1 + lopSway, 0, Math.PI * 2);
      c.ellipse(hx + 2.5, hy + 2, 2.6, 6.5, -0.1 + lopSway, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    } else {
      // Thỏ trắng: ĐÔI TAI DÀI DỰNG THẲNG ĐỨNG LÊN CAO (cao ~11 đơn vị)
      const earTwitch = isWalking ? Math.sin(t * 14 + seed) * 0.12 : 0;
      c.fillStyle = mainCol;
      c.beginPath();
      c.ellipse(hx - 1.5, hy - 7.5, 2.0, 5.8, -0.15 + earTwitch, 0, Math.PI * 2);
      c.ellipse(hx + 2.2, hy - 8.0, 2.0, 5.8, 0.1 + earTwitch, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      // Lòng tai hồng
      c.fillStyle = "#ffb7b2";
      c.beginPath();
      c.ellipse(hx + 2.2, hy - 7.5, 1.1, 4.2, 0.1 + earTwitch, 0, Math.PI * 2);
      c.fill();
    }

    // Đầu tròn
    c.fillStyle = mainCol;
    c.beginPath();
    c.ellipse(hx, hy, 6.8, 6.2, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Mũi chữ Y nhỏ xíu
    c.fillStyle = "#ff8fa3";
    c.beginPath();
    c.arc(hx + 5.5, hy + 1.2, 0.9, 0, Math.PI * 2);
    c.fill();

    // Nụ cười vui vẻ
    if (isIcon) {
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.0;
      c.beginPath();
      c.arc(hx + 4.2, hy + 2.2, 1.2, 0.1, Math.PI - 0.2);
      c.stroke();
    }

    // Mắt & má
    drawEyes(c, hx + 3.2, hy - 0.8, 1.8, hx - 0.5, hy - 0.8, 1.5, isSleeping, blink, "#241812", lowPower, isIcon);
    drawCheeks(c, hx + 2.5, hy + 2.2, hx - 1.8, hy + 2.2, 2.2, 1.3);
  }

  // Chuột Hamster (hamster)
  function drawHamster(c, ctx) {
    const { t, seed, isSleeping, isWalking, lowPower, isIcon } = ctx;
    const mainCol = "#f2c48d"; // Cam mật ong
    const bob = isWalking ? Math.abs(Math.sin(t * 14 + seed)) * 1.0 : 0;
    // Chân dung icon không chớp mắt (luôn mở to)
    const blink = !isSleeping && !isIcon && (((t * 1.5 + seed * 2.7 + 1.0) % 3.8) < 0.14);
    const brSleep = isSleeping ? Math.sin(t * 2.0 + seed) * 0.4 : 0;

    // Hamster nhỏ hơn: cao ~15, dài ~18, TRÒN ỦM NHƯ BÁNH BAO
    if (isSleeping) {
      c.fillStyle = mainCol;
      c.beginPath();
      c.ellipse(0, -5, 8.5, 5.5 + brSleep * 0.4, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      // Tai tròn nhỏ
      c.arc(5.5, -8.5, 1.8, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      drawEyes(c, 5.5, -5, 1.4, 2.5, -5, 1.2, true, false, "#241812", lowPower, isIcon);
      drawCheeks(c, 5.0, -3.5, null, null, 2.0, 1.0);
      return;
    }

    // Chân & tay tí hon
    c.fillStyle = "#ffcdd2";
    c.fillRect(-4, -1.8, 2.2, 1.8);
    c.fillRect(3, -1.8, 2.2, 1.8);

    // Đuôi cụt chấm nhỏ
    c.fillStyle = mainCol;
    c.beginPath();
    c.arc(-8.2, -5.5 - bob, 1.4, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Thân tròn ủm như chiếc bánh bao
    c.fillStyle = mainCol;
    c.beginPath();
    c.ellipse(0, -7.5 - bob, 8.5, 7.0, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Bụng trắng
    c.fillStyle = "#ffffff";
    c.beginPath();
    c.ellipse(1.5, -6.5 - bob, 5.0, 4.5, 0, 0, Math.PI * 2);
    c.fill();

    // HAI MÁ PHỒNG TO TRÒN VO CHỨA ĐỒ ĂN
    c.fillStyle = mainCol;
    c.beginPath();
    c.arc(5.5, -8 - bob, 3.8, 0, Math.PI * 2);
    c.arc(8.5, -7.5 - bob, 3.2, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Hai tai tròn nhỏ xíu trên đỉnh đầu
    c.fillStyle = mainCol;
    c.beginPath();
    c.arc(2.0, -14.0 - bob, 2.2, 0, Math.PI * 2);
    c.arc(6.0, -14.0 - bob, 2.0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = "#ffb7b2";
    c.beginPath();
    c.arc(2.0, -14.0 - bob, 1.2, 0, Math.PI * 2);
    c.arc(6.0, -14.0 - bob, 1.1, 0, Math.PI * 2);
    c.fill();

    // Hai tay nhỏ tí hon ôm trước ngực
    c.fillStyle = "#ffcdd2";
    c.beginPath();
    c.ellipse(4.2, -6.0 - bob, 1.8, 1.3, 0.2, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Mũi hồng chấm nhỏ
    c.fillStyle = "#ff6b81";
    c.beginPath();
    c.arc(9.8, -7.5 - bob, 0.8, 0, Math.PI * 2);
    c.fill();

    // Nụ cười vui vẻ
    if (isIcon) {
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.0;
      c.beginPath();
      c.arc(8.0, -6.0 - bob, 1.2, 0.1, Math.PI - 0.2);
      c.stroke();
    }

    // Mắt to tròn đen láy
    drawEyes(c, 5.8, -9.5 - bob, 1.7, 1.8, -9.5 - bob, 1.4, isSleeping, blink, "#241812", lowPower, isIcon);
    drawCheeks(c, 6.2, -6.0 - bob, null, null, 2.4, 1.4);
  }

  // Sóc nâu (squirrel)
  function drawSquirrel(c, ctx) {
    const { t, seed, isSleeping, isWalking, lowPower, isIcon } = ctx;
    const mainCol = "#b5651d"; // Nâu hạt dẻ
    const bob = isWalking ? Math.abs(Math.sin(t * 14 + seed)) * 1.2 : 0;
    const tailBounce = Math.sin(t * (isWalking ? 12 : 3.5) + seed);
    // Chân dung icon không chớp mắt (luôn mở to)
    const blink = !isSleeping && !isIcon && (((t * 1.5 + seed * 2.7 + 1.0) % 3.8) < 0.14);
    const brSleep = isSleeping ? Math.sin(t * 2.0 + seed) * 0.5 : 0;

    // Khi ngủ: đuôi xù to phủ trùm lên lưng như chiếc chăn ấm
    if (isSleeping) {
      c.fillStyle = mainCol;
      c.beginPath();
      c.ellipse(0, -5.5, 9.5, 5.5 + brSleep * 0.4, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      // Đuôi phủ trùm lên lưng
      c.beginPath();
      c.arc(-4, -9, 5.0, 0, Math.PI * 2);
      c.arc(1, -9.5, 4.5, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      // Đầu sóc
      c.beginPath();
      c.arc(6.0, -5.5, 4.8, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      drawEyes(c, 7, -6, 1.4, 4, -6, 1.2, true, false, "#241812", lowPower, isIcon);
      drawCheeks(c, 6.5, -4.2, null, null, 1.8, 1.0);
      return;
    }

    // ĐUÔI XÙ CONG VÚT SIÊU TO (uốn ngược lên trên lưng hình chữ S to bồng bềnh)
    c.fillStyle = mainCol;
    c.beginPath();
    c.arc(-7, -8 - bob, 4.5, 0, Math.PI * 2);
    c.arc(-13, -12 - bob, 5.5, 0, Math.PI * 2);
    c.arc(-11 + tailBounce * 1.5, -18 - bob, 6.0, 0, Math.PI * 2);
    c.arc(-6 + tailBounce * 2.0, -22 - bob, 5.0, 0, Math.PI * 2); // Chóp xù to nhất trên đỉnh
    c.fill();
    c.stroke();

    // Chân sóc
    c.fillRect(-4, -3.5, 2.6, 3.5);
    c.fillRect(3.5, -3.5, 2.6, 3.5);
    c.strokeStyle = OUTLINE;
    c.strokeRect(-4, -3.5, 2.6, 3.5);
    c.strokeRect(3.5, -3.5, 2.6, 3.5);

    // Thân sóc (dáng ngồi ôm hạt dẻ)
    c.fillStyle = mainCol;
    c.beginPath();
    c.ellipse(-1, -7.5 - bob, 7.8, 6.5, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Bụng kem
    c.fillStyle = "#fdf0df";
    c.beginPath();
    c.ellipse(1.5, -6.5 - bob, 5.0, 4.2, 0, 0, Math.PI * 2);
    c.fill();

    // Hai tay nhỏ ôm sát trước ngực
    c.fillStyle = mainCol;
    c.beginPath();
    c.ellipse(5.5, -7.5 - bob, 2.0, 1.4, -0.3, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // ĐẦU SÓC
    const hx = 5.2, hy = -14.2 - bob * 0.7;

    // Tai sóc có chỏm lông nhọn nhẹ
    c.fillStyle = mainCol;
    c.beginPath();
    c.moveTo(hx - 2.5, hy - 4.5); c.lineTo(hx - 1.5, hy - 9.5); c.lineTo(hx + 0.5, hy - 5.5);
    c.moveTo(hx + 1.8, hy - 5.5); c.lineTo(hx + 3.2, hy - 10.0); c.lineTo(hx + 5.0, hy - 4.5);
    c.fill();
    c.stroke();

    // Đầu tròn
    c.fillStyle = mainCol;
    c.beginPath();
    c.ellipse(hx, hy, 6.5, 6.0, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Mũi nhỏ
    c.fillStyle = "#1a1a1a";
    c.beginPath();
    c.arc(hx + 5.5, hy + 0.8, 1.0, 0, Math.PI * 2);
    c.fill();

    // Nụ cười vui vẻ
    if (isIcon) {
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.0;
      c.beginPath();
      c.arc(hx + 4.2, hy + 2.0, 1.2, 0.1, Math.PI - 0.2);
      c.stroke();
    }

    // Mắt & má
    drawEyes(c, hx + 3.0, hy - 0.8, 1.8, hx - 0.5, hy - 0.8, 1.5, isSleeping, blink, "#241812", lowPower, isIcon);
    drawCheeks(c, hx + 2.5, hy + 2.0, hx - 1.5, hy + 2.0, 2.2, 1.2);
  }

  // --------------------------------------------------------------------------
  // NHÓM ĐẶC BIỆT: Nhím, Rắn, Cáo, Vịt, Rùa, Gấu trúc
  // --------------------------------------------------------------------------

  // Nhím con (hedgehog)
  function drawHedgehog(c, ctx) {
    const { t, seed, isSleeping, isWalking, lowPower, isIcon } = ctx;
    const bodyCol = "#faeedd"; // Mặt & da kem
    const spineCol = "#795548"; // Gai lưng nâu
    const bob = isWalking ? Math.abs(Math.sin(t * 14 + seed)) * 0.9 : 0;
    // Chân dung icon không chớp mắt (luôn mở to)
    const blink = !isSleeping && !isIcon && (((t * 1.5 + seed * 2.7 + 1.0) % 3.8) < 0.14);
    const brSleep = isSleeping ? Math.sin(t * 2.0 + seed) * 0.4 : 0;

    // Khi ngủ: cuộn tròn 100% thành quả cầu gai xù tròn vo
    if (isSleeping) {
      c.fillStyle = spineCol;
      c.beginPath();
      c.arc(0, -6, 7.5 + brSleep * 0.4, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      // Gai nhô ra quanh quả cầu
      if (!lowPower) {
        c.fillStyle = "#5d4037";
        c.beginPath();
        c.arc(-3, -11, 1.8, 0, Math.PI * 2);
        c.arc(3, -11, 1.8, 0, Math.PI * 2);
        c.arc(-6, -6, 1.8, 0, Math.PI * 2);
        c.arc(6, -6, 1.8, 0, Math.PI * 2);
        c.fill();
      }
      return;
    }

    // Chân ngắn lũn cũn
    c.fillStyle = bodyCol;
    c.fillRect(-4, -2.5, 2.4, 2.5);
    c.fillRect(3, -2.5, 2.4, 2.5);
    c.strokeStyle = OUTLINE;
    c.strokeRect(-4, -2.5, 2.4, 2.5);
    c.strokeRect(3, -2.5, 2.4, 2.5);

    // LƯNG GAI NÂU (vòm gai phủ kín từ mông lên đỉnh lưng)
    c.fillStyle = spineCol;
    c.beginPath();
    c.ellipse(-2, -8.5 - bob, 8.8, 6.8, -0.15, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Răng cưa gai nhọn nhô lên trên lưng nhím
    if (!lowPower) {
      c.fillStyle = spineCol;
      c.beginPath();
      c.moveTo(-9, -8 - bob); c.lineTo(-12, -9 - bob); c.lineTo(-8, -11 - bob);
      c.moveTo(-7, -13 - bob); c.lineTo(-7, -16 - bob); c.lineTo(-4, -14 - bob);
      c.moveTo(-3, -15 - bob); c.lineTo(-1, -17 - bob); c.lineTo(1, -14.5 - bob);
      c.moveTo(2, -14 - bob); c.lineTo(5, -15.5 - bob); c.lineTo(5, -12 - bob);
      c.fill();
      c.stroke();
    }

    // Mặt nhô về phía trước hình tam giác bo tròn
    c.fillStyle = bodyCol;
    c.beginPath();
    c.moveTo(2, -12 - bob);
    c.quadraticCurveTo(6, -11 - bob, 9.5, -6.5 - bob);
    c.lineTo(4, -3 - bob);
    c.lineTo(0, -4 - bob);
    c.closePath();
    c.fill();
    c.stroke();

    // Mũi hạt tiêu đen bóng
    c.fillStyle = "#1a1a1a";
    c.beginPath();
    c.arc(10.2, -6.5 - bob, 1.3, 0, Math.PI * 2);
    c.fill();

    // Nụ cười vui vẻ
    if (isIcon) {
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.0;
      c.beginPath();
      c.arc(7.2, -5.2 - bob, 1.2, 0.1, Math.PI - 0.2);
      c.stroke();
    }

    // Mắt đen tròn
    drawEyes(c, 6.5, -8.2 - bob, 1.6, null, null, null, isSleeping, blink, "#241812", lowPower, isIcon);
    drawCheeks(c, 6.2, -5.5 - bob, null, null, 1.8, 1.1);
  }

  // Rắn xanh (snake)
  function drawSnake(c, ctx) {
    const { t, seed, isSleeping, isWalking, lowPower, isIcon } = ctx;
    const mainCol = "#7ac74f"; // Xanh lá mạ tươi mát
    const bellyCol = "#d4f199"; // Bụng vàng lục nhạt
    // Chân dung icon không chớp mắt (luôn mở to)
    const blink = !isSleeping && !isIcon && (((t * 1.5 + seed * 2.7 + 1.0) % 3.8) < 0.14);
    const brSleep = isSleeping ? Math.sin(t * 2.0 + seed) * 0.4 : 0;

    // Rắn dài ~32, cao ~10 theo đề bài

    // Khi ngủ: cuộn xoắn ốc 2 vòng đồng tâm sát đất, đầu gối lên giữa thân
    if (isSleeping) {
      c.strokeStyle = mainCol;
      c.lineWidth = 4.8;
      c.beginPath();
      c.arc(0, -4, 8.5 + brSleep * 0.3, 0, Math.PI * 2);
      c.arc(0, -4, 4.0, 0, Math.PI * 1.8);
      c.stroke();
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.1;
      c.stroke();

      // Đầu rắn ngủ
      c.fillStyle = mainCol;
      c.beginPath();
      c.arc(2, -4.5, 4.0, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      drawEyes(c, 3.5, -5, 1.4, null, null, null, true, false, "#241812", lowPower, isIcon);
      drawCheeks(c, 3.0, -3.2, null, null, 1.6, 1.0);
      return;
    }

    // THÂN RẮN UỐN LƯỢN CHỮ S (chuyển động sóng mềm mại)
    const wave = isWalking ? Math.sin(t * 10 + seed) * 2.2 : Math.sin(t * 3.5 + seed) * 0.8;

    c.strokeStyle = mainCol;
    c.lineWidth = 4.8;
    c.beginPath();
    c.moveTo(-15, -2);
    c.bezierCurveTo(-11, -8 + wave, -7, -1 - wave, -2, -5 + wave);
    c.bezierCurveTo(3, -8 - wave, 8, -2 + wave, 11, -5.5);
    c.stroke();

    // Viền thân nét nâu
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.1;
    c.stroke();

    // Bụng vàng lục nhạt
    c.strokeStyle = bellyCol;
    c.lineWidth = 2.0;
    c.beginPath();
    c.moveTo(-14, -1);
    c.bezierCurveTo(-10, -6 + wave, -7, 0 - wave, -2, -3.5 + wave);
    c.bezierCurveTo(3, -6.5 - wave, 8, -0.5 + wave, 10, -4.5);
    c.stroke();

    // ĐẦU RẮN TRÒN DỄ THƯƠNG (chibi snake!)
    const hx = 12.0, hy = -6.5;
    c.fillStyle = mainCol;
    c.beginPath();
    c.ellipse(hx, hy, 4.8, 4.2, 0.1, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.2;
    c.stroke();

    // LƯỠI CHẺ MÀU HỒNG ĐỎ THÈ RA THỤT VÀO THỈNH THOẢNG
    const tongueFlick = Math.sin(t * 6 + seed) > 0.45;
    if (tongueFlick && !isSleeping) {
      c.strokeStyle = "#ff4757";
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(hx + 4.5, hy);
      c.lineTo(hx + 8, hy);
      c.lineTo(hx + 9.5, hy - 1.5); // Chẻ nhánh trên
      c.moveTo(hx + 8, hy);
      c.lineTo(hx + 9.5, hy + 1.5); // Chẻ nhánh dưới
      c.stroke();
    }

    // Nụ cười vui vẻ
    if (isIcon) {
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.0;
      c.beginPath();
      c.arc(hx + 2.0, hy + 1.2, 1.2, 0.1, Math.PI - 0.2);
      c.stroke();
    }

    // Mắt & má
    drawEyes(c, hx + 1.8, hy - 1.2, 1.8, null, null, null, isSleeping, blink, "#241812", lowPower, isIcon);
    drawCheeks(c, hx + 1.2, hy + 1.5, null, null, 2.0, 1.2);
  }

  // Cáo nhỏ (fox)
  function drawFox(c, ctx) {
    const { t, seed, isSleeping, isWalking, lowPower, isIcon } = ctx;
    const mainCol = "#f08a3c"; // Cam rực rỡ
    const bob = isWalking ? Math.abs(Math.sin(t * 14 + seed)) * 1.3 : 0;
    const leg = isWalking ? Math.sin(t * 14 + seed) * 3 : 0;
    const tailWag = Math.sin(t * (isWalking ? 12 : 4) + seed);
    // Chân dung icon không chớp mắt (luôn mở to)
    const blink = !isSleeping && !isIcon && (((t * 1.5 + seed * 2.7 + 1.0) % 3.8) < 0.14);
    const brSleep = isSleeping ? Math.sin(t * 2.0 + seed) * 0.5 : 0;

    // Khi ngủ: cuộn đuôi bông chóp trắng trùm kín thân
    if (isSleeping) {
      c.fillStyle = mainCol;
      c.beginPath();
      c.ellipse(0, -5.5, 10.5, 6 + brSleep * 0.4, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      // Đuôi cuộn tròn với chóp trắng
      c.beginPath();
      c.arc(-3, -7, 5.5, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.fillStyle = "#ffffff";
      c.beginPath();
      c.arc(-6, -8, 2.8, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      // Đầu cáo
      c.fillStyle = mainCol;
      c.beginPath();
      c.arc(6.5, -6, 5.5, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      drawEyes(c, 7.5, -6.5, 1.5, 4.5, -6.5, 1.3, true, false, "#241812", lowPower, isIcon);
      drawCheeks(c, 7.0, -4.5, null, null, 1.8, 1.0);
      return;
    }

    // 4 CHÂN CÁO "MANG TẤT" ĐEN ĐẶC TRƯNG (#222222)
    c.fillStyle = "#222222";
    c.fillRect(-8.5 - leg, -4.5, 2.8, 4.5);
    c.fillRect(3.5 - leg, -4.5, 2.8, 4.5);
    c.fillRect(-6.5 + leg, -4.5, 2.8, 4.5);
    c.fillRect(5.2 + leg, -4.5, 2.8, 4.5);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.1;
    c.strokeRect(-8.5 - leg, -4.5, 2.8, 4.5);
    c.strokeRect(3.5 - leg, -4.5, 2.8, 4.5);
    c.strokeRect(-6.5 + leg, -4.5, 2.8, 4.5);
    c.strokeRect(5.2 + leg, -4.5, 2.8, 4.5);

    // ĐUÔI BÔNG TO XÙ VỚI CHÓP ĐUÔI MÀU TRẮNG TINH
    c.fillStyle = mainCol;
    c.beginPath();
    c.ellipse(-10 + tailWag * 1.5, -12 - bob, 5.5, 7.5, -0.4, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    // Chóp trắng của đuôi
    c.fillStyle = "#ffffff";
    c.beginPath();
    c.ellipse(-12 + tailWag * 2.0, -16 - bob, 3.2, 4.0, -0.4, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Thân cáo
    c.fillStyle = mainCol;
    c.beginPath();
    c.ellipse(-1, -8 - bob, 9.2, 6.2, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Ngực trắng xòe rộng
    c.fillStyle = "#ffffff";
    c.beginPath();
    c.ellipse(3.5, -7 - bob, 4.5, 4.0, 0, 0, Math.PI * 2);
    c.fill();

    // ĐẦU CÁO
    const hx = 6.8, hy = -15 - bob * 0.7;

    // Đôi tai to tam giác dựng đứng, chóp tai và sau tai MÀU ĐEN
    c.fillStyle = "#222222";
    c.beginPath();
    c.moveTo(hx - 4.5, hy - 4.5); c.lineTo(hx - 3, hy - 13.0); c.lineTo(hx + 0.2, hy - 5.5);
    c.moveTo(hx + 1.5, hy - 5.5); c.lineTo(hx + 4.5, hy - 13.5); c.lineTo(hx + 7.8, hy - 4.5);
    c.fill();
    c.stroke();
    // Lòng tai cam
    c.fillStyle = mainCol;
    c.beginPath();
    c.moveTo(hx + 2.2, hy - 5.5); c.lineTo(hx + 4.5, hy - 11.0); c.lineTo(hx + 6.8, hy - 5.0);
    c.fill();

    // Đầu cáo
    c.fillStyle = mainCol;
    c.beginPath();
    c.ellipse(hx, hy, 7.2, 6.5, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Má trắng phồng mềm
    c.fillStyle = "#ffffff";
    c.beginPath();
    c.ellipse(hx + 2.5, hy + 2.0, 4.0, 3.0, 0, 0, Math.PI * 2);
    c.ellipse(hx - 1.5, hy + 2.0, 3.2, 2.5, 0, 0, Math.PI * 2);
    c.fill();

    // Mũi nhọn đen
    c.fillStyle = "#1a1a1a";
    c.beginPath();
    c.arc(hx + 6.8, hy + 1.0, 1.2, 0, Math.PI * 2);
    c.fill();

    // Nụ cười vui vẻ
    if (isIcon) {
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.0;
      c.beginPath();
      c.arc(hx + 4.5, hy + 2.0, 1.2, 0.1, Math.PI - 0.2);
      c.stroke();
    }

    // Mắt & má
    drawEyes(c, hx + 3.8, hy - 1.0, 1.8, hx - 0.2, hy - 1.0, 1.5, isSleeping, blink, "#241812", lowPower, isIcon);
    drawCheeks(c, hx + 3.0, hy + 2.2, hx - 1.5, hy + 2.2, 2.0, 1.2);
  }

  // Vịt con (duck)
  function drawDuck(c, ctx) {
    const { t, seed, isSleeping, isWalking, lowPower, isIcon } = ctx;
    const mainCol = "#ffd93d"; // Vàng tươi ươm
    const beakCol = "#ff7a00"; // Mỏ cam dẹt
    const bob = isWalking ? Math.abs(Math.sin(t * 14 + seed)) * 1.4 : 0;
    const waddle = isWalking ? Math.sin(t * 14 + seed) * 0.15 : 0;
    // Chân dung icon không chớp mắt (luôn mở to)
    const blink = !isSleeping && !isIcon && (((t * 1.5 + seed * 2.7 + 1.0) % 3.8) < 0.14);
    const brSleep = isSleeping ? Math.sin(t * 2.0 + seed) * 0.4 : 0;

    // Vịt con nhỏ hơn: cao ~16, dài ~18

    // Khi ngủ: rúc mỏ vào cánh, thân tròn vo
    if (isSleeping) {
      c.fillStyle = mainCol;
      c.beginPath();
      c.ellipse(0, -5, 8.5, 5.5 + brSleep * 0.4, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      // Đầu vịt
      c.beginPath();
      c.arc(4.5, -6.5, 4.5, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      // Mỏ cam gác lên ngực
      c.fillStyle = beakCol;
      c.beginPath();
      c.ellipse(7.5, -5.5, 2.8, 1.6, 0.1, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      drawEyes(c, 4.5, -7.0, 1.4, null, null, null, true, false, "#241812", lowPower, isIcon);
      drawCheeks(c, 4.0, -5.0, null, null, 1.8, 1.0);
      return;
    }

    // Đôi chân màng cam bước lạch bạch
    const leg1 = isWalking ? Math.sin(t * 14 + seed) * 2.5 : 0;
    c.fillStyle = beakCol;
    c.fillRect(-2 - leg1, -2.5, 2.2, 2.5);
    c.fillRect(2 + leg1, -2.5, 2.2, 2.5);
    // Bàn chân màng dẹt
    c.fillRect(-3 - leg1, -0.8, 3.5, 1.0);
    c.fillRect(1 + leg1, -0.8, 3.5, 1.0);

    // Thân tròn vo
    c.fillStyle = mainCol;
    c.beginPath();
    c.ellipse(-1, -7.5 - bob, 8.0, 6.5, waddle, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Đuôi / phao câu vểnh nhổng lên phía sau
    c.fillStyle = mainCol;
    c.beginPath();
    c.moveTo(-7, -8 - bob); c.lineTo(-10.5, -11 - bob); c.lineTo(-8, -6 - bob);
    c.closePath();
    c.fill();
    c.stroke();

    // Cánh nhỏ ở hông
    c.beginPath();
    c.ellipse(0, -7.5 - bob, 4.5, 3.2, 0.2, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // ĐẦU VỊT TRÒN
    const hx = 4.5, hy = -13.5 - bob * 0.7;

    // Chỏm lông tơ 3 cọng nhỏ trên đỉnh đầu
    c.strokeStyle = mainCol;
    c.lineWidth = 1.8;
    c.beginPath();
    c.moveTo(hx, hy - 5.5); c.lineTo(hx - 1, hy - 8.5);
    c.moveTo(hx + 1, hy - 5.5); c.lineTo(hx + 1.5, hy - 9.0);
    c.stroke();
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.1;
    c.stroke();

    // Đầu tròn vo
    c.fillStyle = mainCol;
    c.beginPath();
    c.arc(hx, hy, 5.5, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // CHIẾC MỎ DẸT MÀU CAM TRÒN TRỊA DỄ THƯƠNG
    c.fillStyle = beakCol;
    c.beginPath();
    c.ellipse(hx + 5.2, hy + 1.0, 3.8, 2.2, 0.05, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Mắt to đen lay láy
    drawEyes(c, hx + 2.5, hy - 1.2, 1.8, hx - 1.0, hy - 1.2, 1.4, isSleeping, blink, "#241812", lowPower, isIcon);
    drawCheeks(c, hx + 1.8, hy + 2.0, null, null, 2.0, 1.2);
  }

  // Rùa con (turtle)
  function drawTurtle(c, ctx) {
    const { t, seed, isSleeping, isWalking, lowPower, isIcon } = ctx;
    const shellCol = "#488b49"; // Mai xanh rêu sẫm
    const skinCol = "#6fbf73";  // Da xanh lá tươi
    const markCol = "#a3e635";  // Hoa văn vàng chanh
    const bob = isWalking ? Math.abs(Math.sin(t * 8 + seed)) * 0.6 : 0;
    const paddle = isWalking ? Math.sin(t * 8 + seed) * 2.0 : 0;
    // Chân dung icon không chớp mắt (luôn mở to)
    const blink = !isSleeping && !isIcon && (((t * 1.5 + seed * 2.7 + 1.0) % 3.8) < 0.14);
    const brSleep = isSleeping ? Math.sin(t * 2.0 + seed) * 0.4 : 0;

    // Rùa nhỏ: cao ~14, dài ~22

    // Khi ngủ: rụt đầu và 4 chân sát vào mai
    if (isSleeping) {
      c.fillStyle = shellCol;
      c.beginPath();
      c.ellipse(0, -6, 9.5, 6.0 + brSleep * 0.3, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      // Hoa văn mai
      if (!lowPower) {
        c.fillStyle = markCol;
        c.beginPath();
        c.arc(-2, -6, 2.0, 0, Math.PI * 2);
        c.arc(3, -6, 1.8, 0, Math.PI * 2);
        c.fill();
      }
      // Đầu thò ra xíu ngủ
      c.fillStyle = skinCol;
      c.beginPath();
      c.arc(7.5, -4.5, 2.8, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      drawEyes(c, 8.2, -4.8, 1.2, null, null, null, true, false, "#241812", lowPower, isIcon);
      return;
    }

    // 4 chân bơi dẹt xanh lá
    c.fillStyle = skinCol;
    c.beginPath();
    c.ellipse(-6 - paddle, -2.5, 3.2, 1.8, -0.2, 0, Math.PI * 2);
    c.ellipse(4 + paddle, -2.5, 3.5, 2.0, 0.2, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Đuôi ngắn nhỏ xíu
    c.beginPath();
    c.moveTo(-9, -4.5 - bob); c.lineTo(-12, -4.0 - bob); c.lineTo(-9, -2.5 - bob);
    c.closePath();
    c.fill();
    c.stroke();

    // VÒM MAI RÙA XANH RÊU VỚI VIỀN ĐỀU NÉT
    c.fillStyle = shellCol;
    c.beginPath();
    c.ellipse(-1, -7.5 - bob, 9.5, 6.5, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Hoa văn đốm / ô lục giác vàng chanh trên mai
    if (!lowPower) {
      c.fillStyle = markCol;
      c.beginPath();
      c.ellipse(-4, -8 - bob, 2.4, 2.0, 0, 0, Math.PI * 2);
      c.ellipse(1, -9 - bob, 2.5, 2.2, 0, 0, Math.PI * 2);
      c.ellipse(0, -5 - bob, 2.2, 1.8, 0, 0, Math.PI * 2);
      c.fill();
    }

    // ĐẦU RÙA THÒ RA PHÍA TRƯỚC
    const hx = 7.5, hy = -6.5 - bob;
    c.fillStyle = skinCol;
    c.beginPath();
    c.ellipse(hx, hy, 4.0, 3.6, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Nụ cười vui vẻ
    if (isIcon) {
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.0;
      c.beginPath();
      c.arc(hx + 1.8, hy + 1.5, 1.1, 0.1, Math.PI - 0.2);
      c.stroke();
    }

    // Mắt to hiền lành & má
    drawEyes(c, hx + 1.8, hy - 1.0, 1.6, null, null, null, isSleeping, blink, "#241812", lowPower, isIcon);
    drawCheeks(c, hx + 1.0, hy + 1.5, null, null, 1.8, 1.1);
  }

  // Gấu trúc nhỏ (panda)
  function drawPanda(c, ctx) {
    const { t, seed, isSleeping, isWalking, lowPower, isIcon } = ctx;
    const whiteCol = "#ffffff";
    const blackCol = "#2b2b35";
    const bob = isWalking ? Math.abs(Math.sin(t * 14 + seed)) * 1.2 : 0;
    const leg = isWalking ? Math.sin(t * 14 + seed) * 3 : 0;
    // Chân dung icon không chớp mắt (luôn mở to)
    const blink = !isSleeping && !isIcon && (((t * 1.5 + seed * 2.7 + 1.0) % 3.8) < 0.14);
    const brSleep = isSleeping ? Math.sin(t * 2.0 + seed) * 0.5 : 0;

    // Khi ngủ: viên tuyết trắng với đốm đen
    if (isSleeping) {
      c.fillStyle = whiteCol;
      c.beginPath();
      c.ellipse(0, -5.5, 10.5, 6.2 + brSleep * 0.4, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      // Đốm đen chân/vai
      c.fillStyle = blackCol;
      c.beginPath();
      c.ellipse(-3, -4.5, 4.0, 3.5, 0, 0, Math.PI * 2);
      c.fill();
      // Đầu gấu trúc
      c.fillStyle = whiteCol;
      c.beginPath();
      c.arc(6.5, -6.5, 5.8, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      // Tai đen
      c.fillStyle = blackCol;
      c.beginPath();
      c.arc(4.5, -11.5, 2.0, 0, Math.PI * 2);
      c.arc(9.0, -11.5, 2.0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      // Mắt nhắm
      drawEyes(c, 8, -6.8, 1.5, 5, -6.8, 1.3, true, false, "#241812", lowPower, isIcon);
      drawCheeks(c, 7.2, -4.5, null, null, 1.8, 1.0);
      return;
    }

    // 4 CHÂN ĐEN VÀ DẢI ĐEN VẮT QUA VAI
    c.fillStyle = blackCol;
    c.fillRect(-8.5 - leg, -4.5, 3.2, 4.5);
    c.fillRect(3.5 - leg, -4.5, 3.2, 4.5);
    c.fillRect(-6.5 + leg, -4.5, 3.2, 4.5);
    c.fillRect(5.2 + leg, -4.5, 3.2, 4.5);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.1;
    c.strokeRect(-8.5 - leg, -4.5, 3.2, 4.5);
    c.strokeRect(3.5 - leg, -4.5, 3.2, 4.5);
    c.strokeRect(-6.5 + leg, -4.5, 3.2, 4.5);
    c.strokeRect(5.2 + leg, -4.5, 3.2, 4.5);

    // Đuôi cụt đen nhỏ sau mông
    c.fillStyle = blackCol;
    c.beginPath();
    c.arc(-10.5, -8 - bob, 2.0, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Thân trắng tròn
    c.fillStyle = whiteCol;
    c.beginPath();
    c.ellipse(-1, -8 - bob, 9.5, 6.8, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Dải áo đen qua vai và ngực gấu trúc
    c.fillStyle = blackCol;
    c.beginPath();
    c.ellipse(3, -7.5 - bob, 4.0, 6.2, 0.1, 0, Math.PI * 2);
    c.fill();

    // ĐẦU GẤU TRÚC
    const hx = 6.8, hy = -15 - bob * 0.7;

    // HAI TAI ĐEN TRÒN VO Ở HAI BÊN ĐỈNH ĐẦU
    c.fillStyle = blackCol;
    c.beginPath();
    c.arc(hx - 3.5, hy - 5.5, 2.6, 0, Math.PI * 2);
    c.arc(hx + 4.5, hy - 6.0, 2.6, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Khối đầu trắng tròn xoe
    c.fillStyle = whiteCol;
    c.beginPath();
    c.ellipse(hx, hy, 7.5, 6.8, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // HAI QUẦNG MẮT ĐEN HÌNH OVAN NGHIÊNG ĐẶC TRƯNG GẤU TRÚC
    c.fillStyle = blackCol;
    c.beginPath();
    c.ellipse(hx + 3.5, hy - 0.8, 2.6, 3.2, 0.35, 0, Math.PI * 2);
    c.ellipse(hx - 1.2, hy - 0.8, 2.2, 2.8, -0.35, 0, Math.PI * 2);
    c.fill();

    // Mắt có chấm sáng trắng bên trong quầng đen
    drawEyes(c, hx + 3.8, hy - 1.0, 1.5, hx - 1.0, hy - 1.0, 1.3, isSleeping, blink, "#ffffff", lowPower, isIcon);

    // Má hồng phấn xuyên qua lớp lông trắng
    drawCheeks(c, hx + 3.2, hy + 2.4, hx - 1.5, hy + 2.4, 2.2, 1.2);

    // Mũi tam giác nhỏ bo tròn màu đen
    c.fillStyle = blackCol;
    c.beginPath();
    c.arc(hx + 5.8, hy + 1.2, 1.1, 0, Math.PI * 2);
    c.fill();

    // Nụ cười vui vẻ
    if (isIcon) {
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.0;
      c.beginPath();
      c.arc(hx + 4.5, hy + 2.2, 1.2, 0.1, Math.PI - 0.2);
      c.stroke();
    }
  }

  // --------------------------------------------------------------------------
  // BẢNG ĐIỀU PHỐI VẼ CHO 21 GIỐNG
  // --------------------------------------------------------------------------
  const PET_DRAWERS = {
    cat: (c, ctx) => drawCatFamily(c, "cat", ctx),
    cat_black: (c, ctx) => drawCatFamily(c, "cat_black", ctx),
    cat_siamese: (c, ctx) => drawCatFamily(c, "cat_siamese", ctx),
    cat_calico: (c, ctx) => drawCatFamily(c, "cat_calico", ctx),
    cat_persian: (c, ctx) => drawCatFamily(c, "cat_persian", ctx),

    dog: (c, ctx) => drawDogFamily(c, "dog", ctx),
    dog_shiba: (c, ctx) => drawDogFamily(c, "dog_shiba", ctx),
    dog_corgi: (c, ctx) => drawDogFamily(c, "dog_corgi", ctx),
    dog_poodle: (c, ctx) => drawDogFamily(c, "dog_poodle", ctx),
    dog_husky: (c, ctx) => drawDogFamily(c, "dog_husky", ctx),
    dog_dalmatian: (c, ctx) => drawDogFamily(c, "dog_dalmatian", ctx),

    bunny: (c, ctx) => drawBunnyFamily(c, "bunny", ctx),
    bunny_lop: (c, ctx) => drawBunnyFamily(c, "bunny_lop", ctx),
    hamster: (c, ctx) => drawHamster(c, ctx),
    squirrel: (c, ctx) => drawSquirrel(c, ctx),

    hedgehog: (c, ctx) => drawHedgehog(c, ctx),
    snake: (c, ctx) => drawSnake(c, ctx),
    fox: (c, ctx) => drawFox(c, ctx),
    duck: (c, ctx) => drawDuck(c, ctx),
    turtle: (c, ctx) => drawTurtle(c, ctx),
    panda: (c, ctx) => drawPanda(c, ctx),
  };

  // --------------------------------------------------------------------------
  // CÁC HÀM API CHÍNH
  // --------------------------------------------------------------------------

  // Kiểm tra xem id có trong danh sách thú cưng và vẽ được hay không
  function has(id) {
    if (!id) return false;
    return id === "room" || PET_SET.has(id);
  }

  // Vẽ 1 bé thú cưng lên context c (toạ độ thế giới)
  function draw(c, id, o, t, seed, isRoom) {
    if (!c) return;
    if (id === "room") {
      id = "cat_black";
      isRoom = true;
    }
    const drawer = PET_DRAWERS[id];
    if (!drawer) return;

    o = o || {};
    t = Number(t) || 0;
    seed = Number(seed) || 0;

    const dir = (o.dir === -1) ? -1 : 1;
    const isSleeping = !!o.sleeping;
    const isWalking = !!o.walking && !isSleeping;

    // Xử lý nảy lên khi được vuốt ve (0 <= t - jumpAt < 0.35s thì nảy ~7 đơn vị)
    const jt = t - (Number(o.jumpAt) || -999);
    const jump = (jt >= 0 && jt < 0.35) ? Math.sin((jt / 0.35) * Math.PI) * 7 : 0;

    // Chế độ tiết kiệm pin
    const lowPower = (typeof Power !== "undefined" && typeof Power.on === "function" && Power.on());

    c.save();

    // Dịch chuyển đến điểm chạm đất dưới chân
    c.translate(o.x || 0, o.y || 0);

    // 1. LUÔN VẼ BÓNG ELIP MỜ DƯỚI CHÂN rgba(0,0,0,.22) TRÊN MẶT ĐẤT
    c.fillStyle = "rgba(0,0,0,0.22)";
    c.beginPath();
    if (isSleeping) {
      c.ellipse(0, 0, 11, 3.8, 0, 0, Math.PI * 2);
    } else {
      const sw = id === "snake" ? 15 : (id === "duck" || id === "hamster" || id === "turtle" ? 7.5 : 9.5);
      const sh = id === "snake" ? 3.5 : 3.0;
      const shrink = jump > 0 ? Math.max(0.4, 1 - jump * 0.08) : 1;
      c.ellipse(0, 0, sw * shrink, sh * shrink, 0, 0, Math.PI * 2);
    }
    c.fill();

    // 2. KHI NHẢY: NẢY LÊN CAO -jump ĐƠN VỊ
    if (jump > 0) {
      c.translate(0, -jump);
    }

    // 3. HƯỚNG NHÌN (dir = 1 nhìn phải, -1 nhìn trái)
    c.scale(dir, 1);

    // Cài đặt nét viền chuẩn đồng bộ
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.3;
    c.lineCap = "round";
    c.lineJoin = "round";

    // 4. VẼ THÚ CƯNG
    drawer(c, {
      t,
      seed,
      isSleeping,
      isWalking,
      jump,
      lowPower,
      isRoom: !!isRoom,
      isIcon: !!o.isIcon
    });

    c.restore();
  }

  // Vẽ chân dung bé đứng yên, căn giữa, vừa khít canvas (dùng ở tiệm thú cưng)
  function icon(canvas, id, t) {
    if (!canvas || !canvas.getContext) return;
    const c = canvas.getContext("2d");
    const w = canvas.width || 96;
    const h = canvas.height || 80;
    c.clearRect(0, 0, w, h);

    if (id === "room") id = "cat_black";
    if (!PET_DRAWERS[id]) return;

    t = Number(t) || 0;

    // Phóng to cho vừa ~80% canvas và căn giữa
    // Kích thước chuẩn các bé: rộng ~28-32, cao ~22-26 đơn vị
    const s = Math.min((w * 0.80) / 32, (h * 0.80) / 25);
    const cx = w / 2;
    // Trọng tâm dọc ở khoảng y = -10.5 đơn vị, đặt chân ở cy
    const cy = h / 2 + 10.5 * s;

    c.save();
    c.translate(cx, cy);
    c.scale(s, s);
    // Chân dung trong tiệm thú cưng: luôn MỞ MẮT, vẻ mặt vui (không chớp mắt)
    draw(c, id, { x: 0, y: 0, dir: 1, walking: false, sleeping: false, jumpAt: -999, isIcon: true }, t, 0, false);
    c.restore();
  }

  return { has, draw, icon };
})();

// Xuất ra phạm vi toàn cục hoặc module nếu có
if (typeof window !== "undefined") {
  window.Pets = Pets;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = Pets;
}
