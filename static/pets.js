// ============================================================================
// HỆ THỐNG VẼ 21 GIỐNG THÚ CƯNG - THÀNH PHỐ MỘNG MƠ (static/pets.js)
// Thiết kế Chibi sinh động: Thân dài thon tỉ lệ 1.7:1 (có ngực, eo, mông, lưng cong),
// cổ ngắn nâng đầu to ở trước-trên, mõm nhô rõ theo giống, 4 chân thuôn bước so le.
// Tối ưu tốc độ cực cao: Dùng hằng số màu cố định, gộp path cùng màu để fill/stroke
// 1 lần cho cả khối, đảm bảo < 5ms cho 25 bé cùng lúc trên điện thoại.
// ============================================================================

"use strict";

const Pets = (() => {
  // --------------------------------------------------------------------------
  // HẰNG SỐ MÀU SẮC CỐ ĐỊNH (Không tạo chuỗi mới mỗi khung hình để đạt tốc độ tối đa)
  // --------------------------------------------------------------------------
  const OUTLINE = "#6b4a3a";
  const SHADOW_COL = "rgba(0,0,0,0.22)";
  const BLUSH_COL = "rgba(255,130,150,0.45)";
  const EYE_BLACK = "#241812";
  const NOSE_BLACK = "#1a1a1a";
  const WHITE = "#ffffff";
  const PINK_INNER = "#ffb8b8";
  const PINK_NOSE = "#ff8fa3";
  const TONGUE_RED = "#ff4757";
  const EYE_BLUE = "#38bdf8";
  const EYE_ROOM = "#ffd23f";
  const EYE_AMBER = "#fcd34d";

  // Danh sách 21 giống thú cưng chuẩn
  const PET_IDS = [
    "cat", "cat_black", "cat_siamese", "cat_calico", "cat_persian",
    "dog", "dog_shiba", "dog_corgi", "dog_poodle", "dog_husky", "dog_dalmatian",
    "bunny", "bunny_lop", "hamster", "squirrel", "hedgehog", "snake",
    "fox", "duck", "turtle", "panda"
  ];
  const PET_SET = new Set(PET_IDS);

  // --------------------------------------------------------------------------
  // CÁC HÀM TRỢ GIÚP DÙNG CHUNG (TỐI ƯU HIỆU NĂNG)
  // --------------------------------------------------------------------------

  // Vẽ mắt: mở to tròn hoặc nhắm khi ngủ / chớp mắt; chân dung tiệm luôn mở long lanh
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
    c.fillStyle = eyeCol || EYE_BLACK;
    c.beginPath();
    c.arc(ex1, ey1, r1, 0, Math.PI * 2);
    if (ex2 != null) c.arc(ex2, ey2, r2, 0, Math.PI * 2);
    c.fill();

    // Điểm sáng mắt (luôn có trong chân dung tiệm để long lanh dễ thương)
    if (!lowPower || isIcon) {
      c.fillStyle = WHITE;
      c.beginPath();
      c.arc(ex1 + r1 * 0.35, ey1 - r1 * 0.35, Math.max(0.6, r1 * 0.36), 0, Math.PI * 2);
      if (ex2 != null) c.arc(ex2 + r2 * 0.35, ey2 - r2 * 0.35, Math.max(0.5, r2 * 0.36), 0, Math.PI * 2);
      c.fill();
    }
  }

  // Vẽ má hồng xinh xắn
  function drawCheeks(c, x1, y1, x2, y2, rx, ry) {
    c.fillStyle = BLUSH_COL;
    c.beginPath();
    c.ellipse(x1, y1, rx || 2.2, ry || 1.3, 0, 0, Math.PI * 2);
    if (x2 != null) c.ellipse(x2, y2, (rx || 2.2) * 0.85, (ry || 1.3) * 0.85, 0, 0, Math.PI * 2);
    c.fill();
  }

  // Đường dẫn chân thuôn có bàn chân tròn nhỏ (thay thế ô vuông cũ)
  function pathTaperedLeg(c, topX, topY, footX, footY, wTop, wBottom) {
    c.moveTo(topX - wTop * 0.5, topY);
    c.lineTo(footX - wBottom * 0.5, footY - 1.2);
    c.quadraticCurveTo(footX - wBottom * 0.5, footY, footX, footY);
    c.quadraticCurveTo(footX + wBottom * 0.5, footY, footX + wBottom * 0.5, footY - 1.2);
    c.lineTo(topX + wTop * 0.5, topY);
    c.closePath();
  }

  // --------------------------------------------------------------------------
  // HỌ MÈO: Mèo mướp, Mèo mun, Mèo Xiêm, Mèo tam thể, Mèo Ba Tư
  // --------------------------------------------------------------------------
  function drawCatFamily(c, id, ctx) {
    const { t, seed, isSleeping, isWalking, lowPower, isRoom, isIcon } = ctx;

    let mainCol = "#f4a261"; // Mèo mướp cam
    let bellyCol = "#fff0dd";
    let eyeCol = EYE_BLACK;
    let innerEarCol = PINK_INNER;
    let noseCol = PINK_NOSE;

    if (id === "cat_black") {
      mainCol = "#2b2b35";
      bellyCol = "#24242e";
      innerEarCol = "#454050";
      noseCol = "#4a4254";
      eyeCol = isRoom ? EYE_ROOM : EYE_AMBER;
    } else if (id === "cat_siamese") {
      mainCol = "#f5ebe0";
      bellyCol = "#faf4ed";
      innerEarCol = "#422b1d";
      noseCol = "#2c1b11";
      eyeCol = EYE_BLUE;
    } else if (id === "cat_calico") {
      mainCol = WHITE;
      bellyCol = WHITE;
    } else if (id === "cat_persian") {
      mainCol = "#fdfbf7";
      bellyCol = WHITE;
      innerEarCol = "#ffebee";
    }

    const bob = isWalking ? Math.abs(Math.sin(t * 14 + seed)) * 1.1 : 0;
    const leg = isWalking ? Math.sin(t * 12 + seed) * 3 : 0;
    const tailWag = Math.sin(t * (isWalking ? 8 : 3.5) + seed);
    const blink = !isSleeping && !isIcon && (((t * 1.5 + seed * 2.7 + 1.0) % 3.8) < 0.14);
    const brSleep = isSleeping ? Math.sin(t * 2.0 + seed) * 0.4 : 0;

    // 1. KHI NGỦ (nằm cuộn mềm mại nhận rõ đầu, tai, thân, đuôi)
    if (isSleeping) {
      // Đuôi quấn ôm sát thân
      c.strokeStyle = id === "cat_siamese" ? "#422b1d" : mainCol;
      c.lineWidth = id === "cat_persian" ? 4.5 : 2.5;
      c.beginPath();
      c.moveTo(-7.5, -4.5);
      c.quadraticCurveTo(-1.0, -1.0, 5.0, -3.0);
      c.stroke();
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.1;
      c.stroke();

      // Thân mèo nằm duỗi cong mềm
      c.fillStyle = mainCol;
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.3;
      c.beginPath();
      c.moveTo(5.0, -5.0 + brSleep);
      c.quadraticCurveTo(1.0, -8.5 + brSleep, -5.0, -8.0 + brSleep); // Sống lưng cong
      c.quadraticCurveTo(-9.0, -7.5 + brSleep, -8.5, -3.5); // Mông
      c.quadraticCurveTo(-3.0, -2.5, 3.5, -2.5); // Bụng áp đất
      c.closePath();
      c.fill();
      c.stroke();

      // Đầu gối nghiêng ngủ
      c.beginPath();
      c.ellipse(6.5, -5.8, 5.2, 4.2, 0.1, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      // Tai nằm xuôi
      c.fillStyle = (id === "cat_siamese" || id === "cat_calico") ? (id === "cat_calico" ? "#e76f51" : "#422b1d") : mainCol;
      c.beginPath();
      c.moveTo(4.5, -8.5); c.lineTo(5.0, -12.0); c.lineTo(7.5, -9.5);
      c.moveTo(7.8, -9.5); c.lineTo(10.2, -12.2); c.lineTo(10.5, -8.0);
      c.fill();
      c.stroke();

      drawEyes(c, 8.2, -6.0, 1.4, 5.2, -6.0, 1.2, true, false, eyeCol, lowPower, isIcon);
      drawCheeks(c, 7.5, -4.2, 4.8, -4.2, 1.6, 0.9);
      return;
    }

    // 2. KHI ĐỨNG HOẶC ĐI (Chibi thanh thoát: Thân uốn lượn có ngực/eo/mông, cổ ngắn, chân thuôn)

    // Chân xa (phía trong) - Gộp chung 1 path
    const legFarCol = id === "cat_siamese" ? "#422b1d" : (id === "cat_black" ? "#22222a" : mainCol);
    c.fillStyle = legFarCol;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.1;
    c.beginPath();
    pathTaperedLeg(c, 3.5, -6.5 - bob, 3.8 - leg, 0, 2.6, 1.8); // Chân trước xa
    pathTaperedLeg(c, -6.5, -6.5 - bob, -7.2 + leg, 0, 2.8, 1.8); // Chân sau xa
    c.fill();
    c.stroke();

    // Đuôi mèo
    const tailCol = id === "cat_siamese" ? "#422b1d" : mainCol;
    if (id === "cat_persian") {
      // Đuôi xù mây Ba Tư: khối bông liền mạch tô đầy, viền nét mép ngoài
      c.fillStyle = mainCol;
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.3;
      c.beginPath();
      const tw = tailWag * 1.5;
      c.moveTo(-7.5, -9.0 - bob);
      c.quadraticCurveTo(-12.5, -9.0 - bob, -13.0, -12.0 - bob);
      c.quadraticCurveTo(-17.5 + tw, -13.0 - bob, -17.0 + tw, -16.5 - bob);
      c.quadraticCurveTo(-16.0 + tw, -22.5 - bob, -10.5 + tw, -22.5 - bob);
      c.quadraticCurveTo(-5.5 + tw, -21.5 - bob, -6.0, -16.5 - bob);
      c.quadraticCurveTo(-5.0, -12.5 - bob, -7.5, -9.0 - bob);
      c.closePath();
      c.fill();
      c.stroke();
    } else {
      // Đuôi dài cong duyên dáng
      c.strokeStyle = tailCol;
      c.lineWidth = 2.6;
      c.beginPath();
      c.moveTo(-8.0, -9.5 - bob);
      c.bezierCurveTo(-14.5, -11.0 - bob, -11.0, -17.5 - bob, -13.0 + tailWag * 2, -21.0 - bob);
      c.stroke();
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.2;
      c.stroke();

      if (id === "cat" && !lowPower) {
        c.strokeStyle = "#c55a11";
        c.lineWidth = 2.4;
        c.beginPath();
        c.moveTo(-11.5, -13.0 - bob); c.lineTo(-12.5, -15.0 - bob);
        c.moveTo(-12.2, -17.0 - bob); c.lineTo(-13.0 + tailWag * 1.5, -19.5 - bob);
        c.stroke();
      }
    }

    // THÂN MÈO: Thân dài hơn cao (tỉ lệ ~1.7:1), ngực nhô, eo thắt, mông cong, lưng uốn lượn
    c.fillStyle = mainCol;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.3;
    c.beginPath();
    c.moveTo(6.5, -8.5 - bob); // Ức ngực
    c.quadraticCurveTo(5.2, -6.0 - bob, 3.5, -6.0 - bob); // Ngực dưới
    c.quadraticCurveTo(0, -7.2 - bob, -4.5, -6.5 - bob); // Eo thắt nhẹ
    c.quadraticCurveTo(-8.0, -6.5 - bob, -8.5, -9.5 - bob); // Dưới hông
    c.quadraticCurveTo(-9.2, -12.5 - bob, -6.5, -12.2 - bob); // Mông cong tròn
    c.quadraticCurveTo(-1.0, -11.5 - bob, 3.5, -12.5 - bob); // Lưng uốn cong
    c.quadraticCurveTo(5.5, -13.5 - bob, 7.5, -13.0 - bob); // Cổ vươn đỡ đầu
    c.quadraticCurveTo(7.5, -10.5 - bob, 6.5, -8.5 - bob); // Nối về ngực
    c.closePath();
    c.fill();
    c.stroke();

    // Mảng bụng / hoa văn
    if (id === "cat") {
      c.fillStyle = bellyCol;
      c.beginPath();
      c.ellipse(1.5, -7.0 - bob, 4.5, 2.5, 0.1, 0, Math.PI * 2);
      c.fill();
      if (!lowPower) {
        c.strokeStyle = "#c55a11";
        c.lineWidth = 1.3;
        c.beginPath();
        c.moveTo(-3.5, -12.2 - bob); c.lineTo(-2.5, -8.5 - bob);
        c.moveTo(0.5, -12.0 - bob); c.lineTo(1.5, -8.8 - bob);
        c.stroke();
      }
    } else if (id === "cat_calico") {
      c.fillStyle = "#e76f51"; // Cam
      c.beginPath();
      c.ellipse(-0.5, -11.5 - bob, 4.0, 2.2, 0.1, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#2b2b35"; // Đen
      c.beginPath();
      c.ellipse(-6.0, -10.0 - bob, 3.5, 2.8, -0.2, 0, Math.PI * 2);
      c.fill();
    } else if (id === "cat_persian") {
      // Bờm lông cổ xù Ba Tư: liền khối mềm mại, không viền trong
      c.fillStyle = mainCol;
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.3;
      c.beginPath();
      c.moveTo(2.5, -12.0 - bob);
      c.quadraticCurveTo(7.0, -12.5 - bob, 7.2, -9.0 - bob);
      c.quadraticCurveTo(8.2, -5.5 - bob, 5.8, -4.2 - bob);
      c.quadraticCurveTo(3.2, -2.5 - bob, 1.8, -4.2 - bob);
      c.quadraticCurveTo(-0.2, -3.0 - bob, -0.2, -6.0 - bob);
      c.quadraticCurveTo(-0.5, -10.0 - bob, 2.5, -12.0 - bob);
      c.closePath();
      c.fill();
      c.stroke();
    }

    // Chân gần (phía ngoài) - Thuôn dài có bàn chân tròn nhỏ
    const legNearCol = id === "cat_siamese" ? "#422b1d" : (id === "cat_black" ? "#2b2b35" : mainCol);
    c.fillStyle = legNearCol;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.1;
    c.beginPath();
    pathTaperedLeg(c, 5.0, -6.2 - bob, 5.5 + leg, 0, 2.8, 2.0); // Chân trước gần
    pathTaperedLeg(c, -5.0, -6.2 - bob, -5.8 - leg, 0, 3.0, 2.0); // Chân sau gần
    c.fill();
    c.stroke();

    // ĐẦU MÈO: To chibi (~40-45% chiều cao), cổ ngắn nâng ở trước-trên thân, đầu hơi rộng ngang, má bầu
    const hx = 7.5, hy = -16.5 - bob * 0.7;

    // Tai mèo
    const ear1Col = id === "cat_siamese" ? "#422b1d" : (id === "cat_calico" ? "#e76f51" : mainCol);
    const ear2Col = id === "cat_siamese" ? "#422b1d" : (id === "cat_calico" ? "#2b2b35" : mainCol);

    // Gộp 2 tai vào 1 path
    c.fillStyle = ear2Col;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(hx - 4.5, hy - 3.5); c.lineTo(hx - 3.0, hy - 10.2); c.lineTo(hx - 0.5, hy - 4.5); // Tai xa
    c.fill();
    c.stroke();

    c.fillStyle = ear1Col;
    c.beginPath();
    c.moveTo(hx + 1.2, hy - 4.5); c.lineTo(hx + 4.5, hy - 10.8); c.lineTo(hx + 6.8, hy - 3.2); // Tai gần
    c.fill();
    c.stroke();

    // Lòng tai hồng
    c.fillStyle = innerEarCol;
    c.beginPath();
    c.moveTo(hx + 2.5, hy - 4.5); c.lineTo(hx + 4.5, hy - 9.0); c.lineTo(hx + 5.8, hy - 3.8);
    c.fill();

    // Khối đầu mèo: hơi rộng ngang, má bầu phúng phính (không phải tròn vo)
    c.fillStyle = mainCol;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.3;
    c.beginPath();
    c.moveTo(hx - 4.5, hy - 3.5);
    c.quadraticCurveTo(hx, hy - 5.5, hx + 4.5, hy - 3.5); // Đỉnh đầu
    c.quadraticCurveTo(hx + 7.5, hy - 0.5, hx + 6.5, hy + 3.0); // Má phải phúng phính
    c.quadraticCurveTo(hx + 4.0, hy + 5.5, hx, hy + 5.0); // Cằm
    c.quadraticCurveTo(hx - 5.5, hy + 5.2, hx - 6.5, hy + 2.5); // Má trái
    c.quadraticCurveTo(hx - 7.5, hy - 0.5, hx - 4.5, hy - 3.5);
    c.closePath();
    c.fill();
    c.stroke();

    // Mặt nạ mèo Xiêm / Sọc trán mèo mướp
    if (id === "cat_siamese") {
      c.fillStyle = "#422b1d";
      c.beginPath();
      c.ellipse(hx + 3.0, hy + 1.2, 4.0, 3.2, 0, 0, Math.PI * 2);
      c.fill();
    } else if (id === "cat" && !lowPower) {
      c.strokeStyle = "#c55a11";
      c.lineWidth = 1.1;
      c.beginPath();
      c.moveTo(hx + 1.8, hy - 4.5); c.lineTo(hx + 3.2, hy - 2.0); c.lineTo(hx + 4.8, hy - 4.2);
      c.stroke();
    }

    // Mắt mở to tròn
    drawEyes(c, hx + 3.8, hy - 0.8, 1.8, hx - 0.2, hy - 0.8, 1.5, isSleeping, blink, eyeCol, lowPower, isIcon);
    drawCheeks(c, hx + 3.2, hy + 2.2, hx - 1.5, hy + 2.2, 2.0, 1.2);

    // Mũi & Nụ cười vui vẻ
    c.fillStyle = noseCol;
    c.beginPath();
    const noseY = id === "cat_persian" ? hy - 0.2 : hy + 1.2;
    c.arc(hx + 5.8, noseY, 0.9, 0, Math.PI * 2);
    c.fill();

    if (isIcon) {
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.0;
      c.beginPath();
      c.arc(hx + 4.8, hy + 2.0, 1.2, 0.1, Math.PI - 0.2);
      c.stroke();
    }

    if (!lowPower) {
      c.strokeStyle = id === "cat_black" ? "#555566" : OUTLINE;
      c.lineWidth = 0.9;
      c.beginPath();
      c.moveTo(hx + 6.8, hy + 1.0); c.lineTo(hx + 11.5, hy - 0.5);
      c.moveTo(hx + 6.8, hy + 2.5); c.lineTo(hx + 11.0, hy + 3.5);
      c.stroke();
    }
  }

  // --------------------------------------------------------------------------
  // HỌ CHÓ: Cún vàng, Shiba, Corgi, Poodle, Husky, Chó đốm
  // --------------------------------------------------------------------------
  function drawDogFamily(c, id, ctx) {
    const { t, seed, isSleeping, isWalking, lowPower, isIcon } = ctx;

    const bob = isWalking ? Math.abs(Math.sin(t * 14 + seed)) * 1.2 : 0;
    const leg = isWalking ? Math.sin(t * 12 + seed) * 3 : 0;
    const tailWag = Math.sin(t * (isWalking ? 16 : 8) + seed);
    const blink = !isSleeping && !isIcon && (((t * 1.5 + seed * 2.7 + 1.0) % 3.8) < 0.14);
    const brSleep = isSleeping ? Math.sin(t * 2.0 + seed) * 0.4 : 0;

    let mainCol = "#c68b59";
    let snoutCol = "#faeedd";
    let eyeCol = EYE_BLACK;

    if (id === "dog_shiba") {
      mainCol = "#e0954f";
    } else if (id === "dog_corgi") {
      mainCol = "#e8a35c";
    } else if (id === "dog_poodle") {
      mainCol = "#fff5ee";
      snoutCol = "#fff5ee";
    } else if (id === "dog_husky") {
      mainCol = "#9aa5b1";
      snoutCol = WHITE;
      eyeCol = EYE_BLUE;
    } else if (id === "dog_dalmatian") {
      mainCol = WHITE;
      snoutCol = WHITE;
    }

    // 1. KHI NGỦ (nằm duỗi mềm mại nhận rõ đầu, tai, thân, đuôi)
    if (isSleeping) {
      c.fillStyle = mainCol;
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.3;
      c.beginPath();
      c.moveTo(5.0, -5.0 + brSleep);
      c.quadraticCurveTo(1.0, -8.5 + brSleep, -5.5, -8.0 + brSleep); // Lưng
      c.quadraticCurveTo(-9.5, -7.5 + brSleep, -8.8, -3.5); // Mông
      c.quadraticCurveTo(-3.0, -2.5, 3.5, -2.5); // Bụng
      c.closePath();
      c.fill();
      c.stroke();

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
      c.ellipse(6.8, -5.8, 5.5, 4.5, 0.1, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      // Mõm cún ngủ
      c.fillStyle = snoutCol;
      c.beginPath();
      c.ellipse(9.2, -5.2, 3.2, 2.4, 0, 0, Math.PI * 2);
      c.fill();

      c.fillStyle = NOSE_BLACK;
      c.beginPath();
      c.arc(11.2, -5.8, 1.2, 0, Math.PI * 2);
      c.fill();

      drawEyes(c, 8, -6.8, 1.6, 5, -6.8, 1.3, true, false, eyeCol, lowPower, isIcon);
      drawCheeks(c, 7.5, -4.5, null, null, 2.0, 1.2);
      return;
    }

    // 2. KHI ĐỨNG HOẶC ĐI: Dáng khỏe khoắn, ngực nhô, eo thon, chân thuôn bước so le

    // Chân xa (phía trong)
    const legH = id === "dog_corgi" ? 3.0 : 6.0; // Corgi chân ngắn đặc trưng
    c.fillStyle = mainCol;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.1;
    c.beginPath();
    pathTaperedLeg(c, 3.5, -legH - bob, 3.8 - leg, 0, 2.8, 2.0); // Chân trước xa
    pathTaperedLeg(c, -6.5, -legH - bob, -7.2 + leg, 0, 3.0, 2.0); // Chân sau xa
    c.fill();
    c.stroke();

    // Đuôi chó theo giống
    if (id === "dog_shiba") {
      // Đuôi Shiba cuộn tròn xoắn trên lưng
      c.fillStyle = mainCol;
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.3;
      c.beginPath();
      c.arc(-8, -13.5 - bob, 4.2, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.fillStyle = WHITE;
      c.beginPath();
      c.arc(-8, -13.5 - bob, 1.8, 0, Math.PI * 2);
      c.fill();
    } else if (id === "dog_corgi") {
      // Đuôi ngắn củn nhấp nhô
      c.fillStyle = WHITE;
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.2;
      c.beginPath();
      c.arc(-10.5, -9.5 - bob, 2.2, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    } else if (id === "dog_poodle") {
      // Đuôi Poodle: cuống mảnh nối cục bông tròn chóp
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(-7.5, -9.0 - bob); c.lineTo(-12 + tailWag * 2, -15.5 - bob);
      c.stroke();
      c.fillStyle = mainCol;
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.3;
      c.beginPath();
      c.arc(-12.5 + tailWag * 2, -16.0 - bob, 3.8, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    } else {
      // Đuôi vẫy tít mù
      c.strokeStyle = mainCol;
      c.lineWidth = id === "dog_husky" ? 4.2 : 2.8;
      c.beginPath();
      c.moveTo(-8, -9.5 - bob);
      c.lineTo(-13 + tailWag * 3, -15.5 - bob + tailWag * 1.5);
      c.stroke();
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.1;
      c.stroke();
    }

    // THÂN CHÓ: Thân dài hơn cao (tỉ lệ ~1.7:1; Corgi ~1.9:1), ngực nở, eo thon, mông tròn
    const rearX = id === "dog_corgi" ? -10.5 : -8.5;
    c.fillStyle = mainCol;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.3;
    c.beginPath();
    c.moveTo(6.8, -8.5 - bob); // Ngực nở
    c.quadraticCurveTo(5.5, -legH - bob, 3.5, -legH - bob);
    c.quadraticCurveTo(0, -legH - 1.2 - bob, -4.5, -legH - 0.5 - bob); // Eo thon
    c.quadraticCurveTo(rearX, -legH - 0.5 - bob, rearX - 0.5, -9.5 - bob); // Hông mông
    c.quadraticCurveTo(rearX - 0.5, -12.5 - bob, -6.5, -12.2 - bob); // Mông tròn
    c.quadraticCurveTo(-1.0, -11.5 - bob, 3.5, -12.5 - bob); // Sống lưng cong
    c.quadraticCurveTo(5.8, -13.5 - bob, 7.8, -13.0 - bob); // Cổ vươn lên
    c.quadraticCurveTo(7.8, -10.5 - bob, 6.8, -8.5 - bob);
    c.closePath();
    c.fill();
    c.stroke();

    // Mông tròn Corgi hình trái tim trắng
    if (id === "dog_corgi") {
      c.fillStyle = WHITE;
      c.beginPath();
      c.ellipse(-9.5, -8.5 - bob, 3.8, 4.0, 0.2, 0, Math.PI * 2);
      c.fill();
    }

    // Đốm Dalmatian
    if (id === "dog_dalmatian" && !lowPower) {
      c.fillStyle = "#2b2b35";
      c.beginPath();
      c.arc(-4, -10 - bob, 1.8, 0, Math.PI * 2);
      c.arc(0, -7.5 - bob, 1.5, 0, Math.PI * 2);
      c.arc(-6, -6.5 - bob, 1.4, 0, Math.PI * 2);
      c.arc(3, -9 - bob, 1.2, 0, Math.PI * 2);
      c.fill();
    }

    // Ngực trắng / Bờm ngực Poodle
    if (id === "dog_shiba" || id === "dog_corgi" || id === "dog_husky") {
      c.fillStyle = WHITE;
      c.beginPath();
      c.ellipse(3.8, -7.5 - bob, 4.5, 3.8, 0, 0, Math.PI * 2);
      c.fill();
    } else if (id === "dog_poodle") {
      // Bờm ngực xù Poodle tô đầy màu kem, viền ngoài nét nâu
      c.fillStyle = mainCol;
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.3;
      c.beginPath();
      c.moveTo(1.5, -11.5 - bob);
      c.quadraticCurveTo(6.5, -12.0 - bob, 6.8, -8.0 - bob);
      c.quadraticCurveTo(7.8, -5.0 - bob, 5.2, -4.0 - bob);
      c.quadraticCurveTo(2.5, -3.0 - bob, 0.8, -5.0 - bob);
      c.quadraticCurveTo(-0.2, -8.5 - bob, 1.5, -11.5 - bob);
      c.closePath();
      c.fill();
      c.stroke();
    }

    // Chân gần (phía ngoài)
    c.fillStyle = id === "dog_corgi" ? WHITE : mainCol;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.1;
    c.beginPath();
    pathTaperedLeg(c, 5.2, -legH - bob, 5.5 + leg, 0, 3.0, 2.2); // Chân trước gần
    pathTaperedLeg(c, -4.8, -legH - bob, -5.5 - leg, 0, 3.2, 2.2); // Chân sau gần
    c.fill();
    c.stroke();

    // ĐẦU CHÓ: To chibi (~40-45% chiều cao), cổ ngắn nâng ở trước-trên thân, MÕM NHÔ RÕ RỆT
    const hx = 7.5, hy = -16.5 - bob * 0.7;

    // Tai chó theo giống
    if (id === "dog_shiba" || id === "dog_husky") {
      // Tai tam giác nhọn dựng thẳng đứng
      c.fillStyle = mainCol;
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(hx - 4.5, hy - 3.5); c.lineTo(hx - 3.0, hy - 10.5); c.lineTo(hx - 0.5, hy - 4.5);
      c.moveTo(hx + 1.2, hy - 4.5); c.lineTo(hx + 4.5, hy - 11.2); c.lineTo(hx + 6.8, hy - 3.2);
      c.fill();
      c.stroke();
      c.fillStyle = PINK_INNER;
      c.beginPath();
      c.moveTo(hx + 2.5, hy - 4.5); c.lineTo(hx + 4.5, hy - 9.5); c.lineTo(hx + 5.8, hy - 3.8);
      c.fill();
    } else if (id === "dog_corgi") {
      // Tai Corgi: TO, RỘNG, TAM GIÁC DỰNG ĐỨNG, NGẮN HƠN (~2/3 bunny), ĐẦU TAI HƠI TRÒN
      c.fillStyle = mainCol;
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.3;
      c.beginPath();
      c.moveTo(hx - 4.2, hy - 4.0);
      c.lineTo(hx - 2.8, hy - 9.8);
      c.quadraticCurveTo(hx - 2.0, hy - 10.6, hx - 1.2, hy - 9.8);
      c.lineTo(hx + 0.6, hy - 5.0);
      c.closePath();
      c.fill();
      c.stroke();

      c.beginPath();
      c.moveTo(hx + 1.2, hy - 5.0);
      c.lineTo(hx + 3.8, hy - 10.2);
      c.quadraticCurveTo(hx + 4.6, hy - 11.2, hx + 5.4, hy - 10.2);
      c.lineTo(hx + 8.0, hy - 3.8);
      c.closePath();
      c.fill();
      c.stroke();

      c.fillStyle = PINK_INNER;
      c.beginPath();
      c.moveTo(hx + 2.5, hy - 4.8);
      c.lineTo(hx + 4.3, hy - 9.0);
      c.quadraticCurveTo(hx + 4.6, hy - 9.6, hx + 5.0, hy - 9.0);
      c.lineTo(hx + 6.8, hy - 4.0);
      c.closePath();
      c.fill();
    } else if (id === "dog_poodle") {
      // Poodle vẽ tai và topknot bên dưới
    } else {
      // Tai cụp mềm của cún vàng / chó đốm
      c.fillStyle = id === "dog_dalmatian" ? "#2b2b35" : mainCol;
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.2;
      c.beginPath();
      c.ellipse(hx - 2.5, hy - 1.5, 2.6, 5.2, -0.25, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }

    // Khối đầu chó & MÕM NHÔ RA PHÍA TRƯỚC
    const isSnoutPointy = id === "dog_shiba" || id === "dog_husky";
    const snoutReach = isSnoutPointy ? 8.2 : (id === "dog_poodle" ? 7.2 : 7.6);
    const snoutDrop = isSnoutPointy ? 1.0 : 1.4;

    c.fillStyle = mainCol;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.3;
    c.beginPath();
    c.moveTo(hx - 4.5, hy - 3.5);
    c.quadraticCurveTo(hx, hy - 5.8, hx + 4.2, hy - 3.5); // Sọ đầu
    c.quadraticCurveTo(hx + 5.5, hy - 1.0, hx + snoutReach, hy + snoutDrop); // Sống mũi dốc ra trước
    c.quadraticCurveTo(hx + snoutReach + 0.8, hy + snoutDrop + 2.2, hx + 5.5, hy + 3.8); // Mõm dưới
    c.quadraticCurveTo(hx + 3.0, hy + 5.5, hx, hy + 5.0); // Cằm
    c.quadraticCurveTo(hx - 5.5, hy + 5.2, hx - 6.5, hy + 2.5); // Má sau
    c.quadraticCurveTo(hx - 7.5, hy - 0.5, hx - 4.5, hy - 3.5);
    c.closePath();
    c.fill();
    c.stroke();

    // Chi tiết Poodle: Topknot và Tai cục bông hợp nhất mềm mại
    if (id === "dog_poodle") {
      c.fillStyle = mainCol;
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.3;
      c.beginPath();
      c.arc(hx, hy - 6.8, 4.2, Math.PI * 0.95, Math.PI * 2.05);
      c.closePath();
      c.fill();
      c.stroke();
      c.beginPath();
      c.ellipse(hx, hy - 5.5, 3.8, 2.5, 0, 0, Math.PI * 2);
      c.fill();

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

    // Hoa văn mặt nạ Husky / Urajiro Shiba / Vệt trắng Corgi
    if (id === "dog_husky") {
      c.fillStyle = WHITE;
      c.beginPath();
      c.ellipse(hx + 3.2, hy + 1.0, 4.8, 4.2, 0, 0, Math.PI * 2);
      c.fill();
      if (!lowPower) {
        c.fillStyle = mainCol;
        c.beginPath();
        c.moveTo(hx + 1.5, hy - 5.5); c.lineTo(hx + 3.0, hy - 1.5); c.lineTo(hx + 4.5, hy - 5.5);
        c.fill();
      }
    } else if (id === "dog_shiba") {
      c.fillStyle = WHITE;
      c.beginPath();
      c.ellipse(hx + 3.0, hy + 2.2, 3.8, 2.6, 0, 0, Math.PI * 2);
      c.ellipse(hx - 1.5, hy + 2.2, 3.0, 2.2, 0, 0, Math.PI * 2);
      c.fill();
      if (!lowPower) {
        c.beginPath();
        c.arc(hx + 2.5, hy - 4.2, 0.9, 0, Math.PI * 2);
        c.arc(hx - 1.2, hy - 4.2, 0.8, 0, Math.PI * 2);
        c.fill();
      }
    } else if (id === "dog_corgi") {
      c.fillStyle = WHITE;
      c.beginPath();
      c.ellipse(hx + 3.5, hy + 0.8, 2.2, 4.8, 0, 0, Math.PI * 2);
      c.fill();
    }

    // Mõm cún phía trước
    if (snoutCol !== mainCol) {
      c.fillStyle = snoutCol;
      c.beginPath();
      c.ellipse(hx + 5.0, hy + 1.8, 3.6, 2.6, 0, 0, Math.PI * 2);
      c.fill();
    }

    // Mũi to tròn đen bóng ở chóp mõm
    c.fillStyle = NOSE_BLACK;
    c.beginPath();
    c.arc(hx + snoutReach, hy + snoutDrop, 1.3, 0, Math.PI * 2);
    c.fill();

    // Lưỡi hồng thè nhẹ khi đi
    if (isWalking) {
      c.fillStyle = TONGUE_RED;
      c.beginPath();
      c.arc(hx + 5.8, hy + 4.2, 1.3, 0, Math.PI);
      c.fill();
    }

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
    const bellyCol = isLop ? "#f7ede2" : WHITE;

    const bob = isWalking ? Math.abs(Math.sin(t * 14 + seed)) * 1.5 : 0;
    const leg = isWalking ? Math.sin(t * 12 + seed) * 3 : 0;
    const blink = !isSleeping && !isIcon && (((t * 1.5 + seed * 2.7 + 1.0) % 3.8) < 0.14);
    const brSleep = isSleeping ? Math.sin(t * 2.0 + seed) * 0.4 : 0;

    if (isSleeping) {
      c.fillStyle = WHITE;
      c.beginPath();
      c.arc(-8.5, -4, 2.5, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      c.fillStyle = mainCol;
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.3;
      c.beginPath();
      c.moveTo(5.0, -4.5 + brSleep);
      c.quadraticCurveTo(1.0, -8.0 + brSleep, -5.5, -7.5 + brSleep);
      c.quadraticCurveTo(-9.0, -7.0 + brSleep, -8.5, -3.0);
      c.quadraticCurveTo(-3.0, -2.0, 3.5, -2.0);
      c.closePath();
      c.fill();
      c.stroke();

      c.beginPath();
      c.ellipse(-1, -8.5, 6.5, 2.2, -0.2, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      c.beginPath();
      c.arc(5.8, -5.5, 5.0, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      drawEyes(c, 7, -5.8, 1.5, 4, -5.8, 1.3, true, false, EYE_BLACK, lowPower, isIcon);
      drawCheeks(c, 6.5, -4.0, null, null, 1.8, 1.0);
      return;
    }

    // Dáng ngồi thỏ đặc trưng: Mông to cong cao, lưng uốn cong mềm mại, chân sau gập dài
    c.fillStyle = mainCol;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.1;
    c.beginPath();
    pathTaperedLeg(c, 3.2, -5.5 - bob, 3.5 - leg, 0, 2.4, 1.8); // Chân trước
    c.fill();
    c.stroke();

    // Đuôi cục bông tròn nhỏ sau mông
    c.fillStyle = WHITE;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.2;
    c.beginPath();
    c.arc(-9.5, -8.5 - bob, 2.8, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Thân thỏ: ngực thon, lưng uốn cong, mông to cong cao
    c.fillStyle = mainCol;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.3;
    c.beginPath();
    c.moveTo(5.5, -8.0 - bob);
    c.quadraticCurveTo(4.2, -5.5 - bob, 2.5, -5.5 - bob);
    c.quadraticCurveTo(-1.0, -6.5 - bob, -5.0, -5.8 - bob);
    c.quadraticCurveTo(-8.5, -5.8 - bob, -9.0, -9.5 - bob); // Mông cao
    c.quadraticCurveTo(-9.2, -13.0 - bob, -6.0, -12.5 - bob);
    c.quadraticCurveTo(-1.0, -11.0 - bob, 3.0, -12.0 - bob); // Lưng thỏ cong
    c.quadraticCurveTo(4.8, -13.0 - bob, 6.5, -12.5 - bob); // Cổ
    c.quadraticCurveTo(6.8, -10.0 - bob, 5.5, -8.0 - bob);
    c.closePath();
    c.fill();
    c.stroke();

    // Chân sau thỏ gập áp sát hông
    c.beginPath();
    c.ellipse(-4.5, -4.5, 4.2, 2.8, 0.2, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Bụng kem
    c.fillStyle = bellyCol;
    c.beginPath();
    c.ellipse(1.5, -6.5 - bob, 4.5, 3.0, 0, 0, Math.PI * 2);
    c.fill();

    // ĐẦU THỎ
    const hx = 6.2, hy = -15.5 - bob * 0.7;

    // TAI THỎ
    if (isLop) {
      // Thỏ tai cụp: TAI DÀI RỦ CỤP HẲN XUỐNG HAI BÊN MÁ
      const lopSway = isWalking ? Math.sin(t * 12 + seed) * 0.2 : 0;
      c.fillStyle = mainCol;
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.2;
      c.beginPath();
      c.ellipse(hx - 2, hy + 2, 2.6, 6.5, 0.1 + lopSway, 0, Math.PI * 2);
      c.ellipse(hx + 2.5, hy + 2, 2.6, 6.5, -0.1 + lopSway, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    } else {
      // Thỏ trắng: ĐÔI TAI DÀI DỰNG THẲNG ĐỨNG LÊN CAO
      const earTwitch = isWalking ? Math.sin(t * 14 + seed) * 0.12 : 0;
      c.fillStyle = mainCol;
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.2;
      c.beginPath();
      c.ellipse(hx - 1.5, hy - 7.5, 2.0, 5.8, -0.15 + earTwitch, 0, Math.PI * 2);
      c.ellipse(hx + 2.2, hy - 8.0, 2.0, 5.8, 0.1 + earTwitch, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      c.fillStyle = PINK_INNER;
      c.beginPath();
      c.ellipse(hx + 2.2, hy - 7.5, 1.1, 4.2, 0.1 + earTwitch, 0, Math.PI * 2);
      c.fill();
    }

    // Đầu thỏ
    c.fillStyle = mainCol;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.3;
    c.beginPath();
    c.ellipse(hx, hy, 6.5, 5.8, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Mũi chữ Y nhỏ xinh
    c.fillStyle = PINK_NOSE;
    c.beginPath();
    c.arc(hx + 5.2, hy + 1.2, 0.9, 0, Math.PI * 2);
    c.fill();

    if (isIcon) {
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.0;
      c.beginPath();
      c.arc(hx + 4.2, hy + 2.2, 1.2, 0.1, Math.PI - 0.2);
      c.stroke();
    }

    drawEyes(c, hx + 3.2, hy - 0.8, 1.8, hx - 0.5, hy - 0.8, 1.5, isSleeping, blink, EYE_BLACK, lowPower, isIcon);
    drawCheeks(c, hx + 2.5, hy + 2.2, hx - 1.8, hy + 2.2, 2.2, 1.3);
  }

  // Chuột Hamster (hamster): Thân hơi dài thuôn có dáng, thấy rõ 4 chân bước, má phồng 2 bên
  function drawHamster(c, ctx) {
    const { t, seed, isSleeping, isWalking, lowPower, isIcon } = ctx;
    const mainCol = "#f2c48d";
    const bob = isWalking ? Math.abs(Math.sin(t * 14 + seed)) * 1.0 : 0;
    const leg = isWalking ? Math.sin(t * 12 + seed) * 2 : 0;
    const blink = !isSleeping && !isIcon && (((t * 1.5 + seed * 2.7 + 1.0) % 3.8) < 0.14);
    const brSleep = isSleeping ? Math.sin(t * 2.0 + seed) * 0.4 : 0;

    if (isSleeping) {
      c.fillStyle = mainCol;
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.3;
      c.beginPath();
      c.moveTo(4.5, -4.5 + brSleep);
      c.quadraticCurveTo(0, -7.5 + brSleep, -5.0, -7.0 + brSleep);
      c.quadraticCurveTo(-8.0, -6.5 + brSleep, -7.5, -2.5);
      c.quadraticCurveTo(-2.0, -1.8, 3.5, -1.8);
      c.closePath();
      c.fill();
      c.stroke();

      c.beginPath();
      c.arc(5.0, -7.5, 1.8, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      drawEyes(c, 5.5, -5, 1.4, 2.5, -5, 1.2, true, false, EYE_BLACK, lowPower, isIcon);
      drawCheeks(c, 5.0, -3.5, null, null, 2.0, 1.0);
      return;
    }

    // 4 chân tí hon đang bước
    c.fillStyle = "#ffcdd2";
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.0;
    c.beginPath();
    pathTaperedLeg(c, 3.5, -3.5 - bob, 4.0 - leg, 0, 2.0, 1.5);
    pathTaperedLeg(c, -4.5, -3.5 - bob, -5.0 + leg, 0, 2.2, 1.5);
    c.fill();
    c.stroke();

    // Đuôi cụt chấm nhỏ
    c.fillStyle = mainCol;
    c.beginPath();
    c.arc(-8.5, -5.5 - bob, 1.4, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Thân hamster thuôn dài mềm mại (tỉ lệ ~1.6:1, không phải quả bóng tròn)
    c.fillStyle = mainCol;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.3;
    c.beginPath();
    c.moveTo(5.5, -6.5 - bob);
    c.quadraticCurveTo(4.0, -3.8 - bob, 2.5, -3.8 - bob);
    c.quadraticCurveTo(0, -4.5 - bob, -4.5, -4.0 - bob);
    c.quadraticCurveTo(-8.0, -4.0 - bob, -8.2, -7.0 - bob);
    c.quadraticCurveTo(-8.5, -10.5 - bob, -5.5, -10.2 - bob);
    c.quadraticCurveTo(-1.0, -9.5 - bob, 3.0, -10.5 - bob);
    c.quadraticCurveTo(5.2, -11.5 - bob, 6.8, -10.8 - bob);
    c.quadraticCurveTo(6.8, -8.5 - bob, 5.5, -6.5 - bob);
    c.closePath();
    c.fill();
    c.stroke();

    // Bụng trắng
    c.fillStyle = WHITE;
    c.beginPath();
    c.ellipse(1.5, -5.5 - bob, 4.5, 2.8, 0, 0, Math.PI * 2);
    c.fill();

    // Chân gần tí hon
    c.fillStyle = "#ffcdd2";
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.0;
    c.beginPath();
    pathTaperedLeg(c, 4.5, -3.5 - bob, 5.0 + leg, 0, 2.0, 1.5);
    pathTaperedLeg(c, -3.5, -3.5 - bob, -4.0 - leg, 0, 2.2, 1.5);
    c.fill();
    c.stroke();

    // ĐẦU & HAI MÁ PHỒNG TO PHÚNG PHÍNH
    const hx = 6.5, hy = -12.5 - bob * 0.7;

    // Hai tai tròn nhỏ trên đỉnh đầu
    c.fillStyle = mainCol;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.1;
    c.beginPath();
    c.arc(hx - 3.5, hy - 4.5, 2.0, 0, Math.PI * 2);
    c.arc(hx + 0.5, hy - 5.0, 1.8, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Đầu & 2 má phồng to chứa đồ ăn
    c.fillStyle = mainCol;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.3;
    c.beginPath();
    c.ellipse(hx, hy, 5.5, 4.8, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Má phồng to hai bên
    c.beginPath();
    c.arc(hx + 3.0, hy + 1.5, 2.8, 0, Math.PI * 2);
    c.arc(hx - 2.5, hy + 1.5, 2.4, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Hai tay nhỏ tí hon ôm trước ngực
    c.fillStyle = "#ffcdd2";
    c.beginPath();
    c.ellipse(hx + 1.0, hy + 3.2, 1.6, 1.2, 0.2, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Mũi hồng
    c.fillStyle = PINK_NOSE;
    c.beginPath();
    c.arc(hx + 5.2, hy + 1.0, 0.8, 0, Math.PI * 2);
    c.fill();

    if (isIcon) {
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.0;
      c.beginPath();
      c.arc(hx + 4.0, hy + 2.2, 1.1, 0.1, Math.PI - 0.2);
      c.stroke();
    }

    drawEyes(c, hx + 2.5, hy - 1.0, 1.6, hx - 1.2, hy - 1.0, 1.3, isSleeping, blink, EYE_BLACK, lowPower, isIcon);
    drawCheeks(c, hx + 3.0, hy + 2.0, hx - 2.2, hy + 2.0, 2.0, 1.2);
  }

  // Sóc nâu (squirrel)
  function drawSquirrel(c, ctx) {
    const { t, seed, isSleeping, isWalking, lowPower, isIcon } = ctx;
    const mainCol = "#b5651d";
    const bob = isWalking ? Math.abs(Math.sin(t * 14 + seed)) * 1.2 : 0;
    const tailBounce = Math.sin(t * (isWalking ? 12 : 3.5) + seed);
    const blink = !isSleeping && !isIcon && (((t * 1.5 + seed * 2.7 + 1.0) % 3.8) < 0.14);
    const brSleep = isSleeping ? Math.sin(t * 2.0 + seed) * 0.4 : 0;

    if (isSleeping) {
      c.fillStyle = mainCol;
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.3;
      c.beginPath();
      c.moveTo(5.0, -5.0 + brSleep);
      c.quadraticCurveTo(1.0, -8.0 + brSleep, -5.0, -7.5 + brSleep);
      c.quadraticCurveTo(-8.5, -7.0 + brSleep, -8.0, -3.0);
      c.quadraticCurveTo(-3.0, -2.0, 3.5, -2.0);
      c.closePath();
      c.fill();
      c.stroke();

      c.beginPath();
      c.arc(-4, -9, 4.5, 0, Math.PI * 2);
      c.arc(1, -9.5, 4.0, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      c.beginPath();
      c.arc(5.8, -5.5, 4.5, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      drawEyes(c, 7, -6, 1.4, 4, -6, 1.2, true, false, EYE_BLACK, lowPower, isIcon);
      drawCheeks(c, 6.5, -4.2, null, null, 1.8, 1.0);
      return;
    }

    // ĐUÔI XÙ CONG VÚT SIÊU TO uốn lượn ngược lên lưng hình chữ S bồng bềnh
    c.fillStyle = mainCol;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.3;
    c.beginPath();
    c.arc(-7, -8 - bob, 4.5, 0, Math.PI * 2);
    c.arc(-13, -12 - bob, 5.5, 0, Math.PI * 2);
    c.arc(-11 + tailBounce * 1.5, -18 - bob, 6.0, 0, Math.PI * 2);
    c.arc(-6 + tailBounce * 2.0, -22 - bob, 5.0, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Dáng ngồi kiễng ôm ngực: Thân thon, lưng uốn, mông ngồi vững
    c.beginPath();
    pathTaperedLeg(c, -4.0, -4.5, -4.5, 0, 3.2, 2.0); // Chân sau gập ngồi
    pathTaperedLeg(c, 3.5, -4.5, 3.8, 0, 2.4, 1.8);
    c.fill();
    c.stroke();

    // Thân sóc
    c.beginPath();
    c.moveTo(5.2, -7.5 - bob);
    c.quadraticCurveTo(4.0, -5.2 - bob, 2.5, -5.2 - bob);
    c.quadraticCurveTo(-1.0, -6.0 - bob, -5.0, -5.5 - bob);
    c.quadraticCurveTo(-8.0, -5.5 - bob, -8.2, -9.0 - bob);
    c.quadraticCurveTo(-8.5, -12.5 - bob, -5.5, -12.0 - bob);
    c.quadraticCurveTo(-1.0, -11.0 - bob, 3.0, -12.0 - bob);
    c.quadraticCurveTo(4.8, -13.0 - bob, 6.2, -12.5 - bob);
    c.quadraticCurveTo(6.5, -9.5 - bob, 5.2, -7.5 - bob);
    c.closePath();
    c.fill();
    c.stroke();

    // Bụng kem
    c.fillStyle = "#fdf0df";
    c.beginPath();
    c.ellipse(1.5, -6.8 - bob, 4.5, 3.0, 0, 0, Math.PI * 2);
    c.fill();

    // Hai tay nhỏ ôm sát trước ngực như đang gặm hạt dẻ
    c.fillStyle = mainCol;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.1;
    c.beginPath();
    c.ellipse(5.2, -7.5 - bob, 2.0, 1.4, -0.3, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // ĐẦU SÓC
    const hx = 6.0, hy = -15.0 - bob * 0.7;

    // Tai có chỏm lông nhọn
    c.fillStyle = mainCol;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(hx - 2.5, hy - 4.5); c.lineTo(hx - 1.5, hy - 9.5); c.lineTo(hx + 0.5, hy - 5.5);
    c.moveTo(hx + 1.8, hy - 5.5); c.lineTo(hx + 3.2, hy - 10.0); c.lineTo(hx + 5.0, hy - 4.5);
    c.fill();
    c.stroke();

    c.beginPath();
    c.ellipse(hx, hy, 6.2, 5.5, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    c.fillStyle = NOSE_BLACK;
    c.beginPath();
    c.arc(hx + 5.5, hy + 0.8, 1.0, 0, Math.PI * 2);
    c.fill();

    if (isIcon) {
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.0;
      c.beginPath();
      c.arc(hx + 4.2, hy + 2.0, 1.2, 0.1, Math.PI - 0.2);
      c.stroke();
    }

    drawEyes(c, hx + 3.0, hy - 0.8, 1.8, hx - 0.5, hy - 0.8, 1.5, isSleeping, blink, EYE_BLACK, lowPower, isIcon);
    drawCheeks(c, hx + 2.5, hy + 2.0, hx - 1.5, hy + 2.0, 2.2, 1.2);
  }

  // --------------------------------------------------------------------------
  // NHÓM ĐẶC BIỆT: Nhím, Rắn, Cáo, Vịt, Rùa, Gấu trúc
  // --------------------------------------------------------------------------

  // Nhím con (hedgehog): Thân hình GIỌT NƯỚC, mõm nhọn hoắt, thấy rõ 4 chân
  function drawHedgehog(c, ctx) {
    const { t, seed, isSleeping, isWalking, lowPower, isIcon } = ctx;
    const bodyCol = "#faeedd";
    const spineCol = "#795548";
    const bob = isWalking ? Math.abs(Math.sin(t * 14 + seed)) * 0.9 : 0;
    const leg = isWalking ? Math.sin(t * 12 + seed) * 2 : 0;
    const blink = !isSleeping && !isIcon && (((t * 1.5 + seed * 2.7 + 1.0) % 3.8) < 0.14);
    const brSleep = isSleeping ? Math.sin(t * 2.0 + seed) * 0.4 : 0;

    if (isSleeping) {
      c.fillStyle = spineCol;
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.3;
      c.beginPath();
      c.arc(0, -5.5, 7.5 + brSleep * 0.4, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      return;
    }

    // 4 chân ngắn thuôn nâng thân lên khỏi mặt đất
    c.fillStyle = bodyCol;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.0;
    c.beginPath();
    pathTaperedLeg(c, 3.5, -3.5 - bob, 4.0 - leg, 0, 2.2, 1.6);
    pathTaperedLeg(c, -4.5, -3.5 - bob, -5.0 + leg, 0, 2.4, 1.6);
    c.fill();
    c.stroke();

    // THÂN HÌNH GIỌT NƯỚC: Mông tròn nở nang phủ gai nâu, thuôn nhọn dần về chiếc mõm kem nhọn
    c.fillStyle = spineCol;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.3;
    c.beginPath();
    c.moveTo(3.0, -11.0 - bob);
    c.quadraticCurveTo(-1.0, -13.5 - bob, -5.5, -12.5 - bob); // Vòm gai lưng
    c.quadraticCurveTo(-9.5, -11.5 - bob, -9.0, -7.5 - bob); // Đáy mông giọt nước
    c.quadraticCurveTo(-8.5, -4.5 - bob, -4.5, -4.5 - bob);
    c.quadraticCurveTo(0, -4.8 - bob, 3.5, -4.2 - bob);
    c.closePath();
    c.fill();
    c.stroke();

    // Gai nhọn nhô lên trên lưng giọt nước
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

    // Mặt nhô về phía trước: MÕM NHỌN HOẮT hình nón giọt nước
    c.fillStyle = bodyCol;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(1.5, -10.5 - bob);
    c.lineTo(10.5, -5.5 - bob); // Chóp mõm nhọn
    c.lineTo(3.0, -3.5 - bob);
    c.closePath();
    c.fill();
    c.stroke();

    // Chân gần
    c.fillStyle = bodyCol;
    c.beginPath();
    pathTaperedLeg(c, 4.5, -3.5 - bob, 5.0 + leg, 0, 2.2, 1.6);
    pathTaperedLeg(c, -3.5, -3.5 - bob, -4.0 - leg, 0, 2.4, 1.6);
    c.fill();
    c.stroke();

    // Mũi hạt tiêu đen bóng ở đỉnh mõm nhọn
    c.fillStyle = NOSE_BLACK;
    c.beginPath();
    c.arc(10.8, -5.5 - bob, 1.2, 0, Math.PI * 2);
    c.fill();

    if (isIcon) {
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.0;
      c.beginPath();
      c.arc(7.2, -4.8 - bob, 1.1, 0.1, Math.PI - 0.2);
      c.stroke();
    }

    drawEyes(c, 6.2, -7.5 - bob, 1.5, null, null, null, isSleeping, blink, EYE_BLACK, lowPower, isIcon);
    drawCheeks(c, 6.0, -5.0 - bob, null, null, 1.6, 1.0);
  }

  // Rắn xanh (snake): Thân sóng uốn lượn chữ S, cổ thắt nhỏ ngóc đầu lên
  function drawSnake(c, ctx) {
    const { t, seed, isSleeping, isWalking, lowPower, isIcon } = ctx;
    const mainCol = "#7ac74f";
    const bellyCol = "#d4f199";
    const blink = !isSleeping && !isIcon && (((t * 1.5 + seed * 2.7 + 1.0) % 3.8) < 0.14);
    const brSleep = isSleeping ? Math.sin(t * 2.0 + seed) * 0.4 : 0;

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

      c.fillStyle = mainCol;
      c.beginPath();
      c.arc(2, -4.5, 4.0, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      drawEyes(c, 3.5, -5, 1.4, null, null, null, true, false, EYE_BLACK, lowPower, isIcon);
      drawCheeks(c, 3.0, -3.2, null, null, 1.6, 1.0);
      return;
    }

    // THÂN RẮN UỐN LƯỢN CHỮ S DÀI THON THOÁT
    const wave = isWalking ? Math.sin(t * 10 + seed) * 2.2 : Math.sin(t * 3.5 + seed) * 0.8;

    c.strokeStyle = mainCol;
    c.lineWidth = 4.8;
    c.beginPath();
    c.moveTo(-15, -2);
    c.bezierCurveTo(-11, -8 + wave, -7, -1 - wave, -2, -5 + wave);
    c.bezierCurveTo(3, -8 - wave, 8, -2 + wave, 11, -5.5);
    c.stroke();

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

    // ĐẦU RẮN NGÓC LÊN
    const hx = 12.0, hy = -6.5;
    c.fillStyle = mainCol;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.2;
    c.beginPath();
    c.ellipse(hx, hy, 4.8, 4.0, 0.1, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Lưỡi chẻ thè ra
    const tongueFlick = Math.sin(t * 6 + seed) > 0.45;
    if (tongueFlick && !isSleeping) {
      c.strokeStyle = TONGUE_RED;
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(hx + 4.5, hy);
      c.lineTo(hx + 8, hy);
      c.lineTo(hx + 9.5, hy - 1.5);
      c.moveTo(hx + 8, hy);
      c.lineTo(hx + 9.5, hy + 1.5);
      c.stroke();
    }

    if (isIcon) {
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.0;
      c.beginPath();
      c.arc(hx + 2.0, hy + 1.2, 1.2, 0.1, Math.PI - 0.2);
      c.stroke();
    }

    drawEyes(c, hx + 1.8, hy - 1.2, 1.8, null, null, null, isSleeping, blink, EYE_BLACK, lowPower, isIcon);
    drawCheeks(c, hx + 1.2, hy + 1.5, null, null, 2.0, 1.2);
  }

  // Cáo nhỏ (fox): Dáng thon dài, ngực trắng nở, MÕM THON NHỌN, 4 chân mang tất đen
  function drawFox(c, ctx) {
    const { t, seed, isSleeping, isWalking, lowPower, isIcon } = ctx;
    const mainCol = "#f08a3c";
    const bob = isWalking ? Math.abs(Math.sin(t * 14 + seed)) * 1.3 : 0;
    const leg = isWalking ? Math.sin(t * 12 + seed) * 3 : 0;
    const tailWag = Math.sin(t * (isWalking ? 12 : 4) + seed);
    const blink = !isSleeping && !isIcon && (((t * 1.5 + seed * 2.7 + 1.0) % 3.8) < 0.14);
    const brSleep = isSleeping ? Math.sin(t * 2.0 + seed) * 0.4 : 0;

    if (isSleeping) {
      c.fillStyle = mainCol;
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.3;
      c.beginPath();
      c.moveTo(5.0, -5.0 + brSleep);
      c.quadraticCurveTo(1.0, -8.5 + brSleep, -5.5, -8.0 + brSleep);
      c.quadraticCurveTo(-9.5, -7.5 + brSleep, -8.8, -3.5);
      c.quadraticCurveTo(-3.0, -2.5, 3.5, -2.5);
      c.closePath();
      c.fill();
      c.stroke();

      c.beginPath();
      c.arc(-3, -7, 5.5, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.fillStyle = WHITE;
      c.beginPath();
      c.arc(-6, -8, 2.8, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      c.fillStyle = mainCol;
      c.beginPath();
      c.arc(6.5, -6, 5.5, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      drawEyes(c, 7.5, -6.5, 1.5, 4.5, -6.5, 1.3, true, false, EYE_BLACK, lowPower, isIcon);
      drawCheeks(c, 7.0, -4.5, null, null, 1.8, 1.0);
      return;
    }

    // 4 CHÂN CÁO THON DÀI "MANG TẤT" ĐEN (#222222)
    c.fillStyle = "#222222";
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.1;
    c.beginPath();
    pathTaperedLeg(c, 3.5, -6.0 - bob, 3.8 - leg, 0, 2.6, 1.8); // Chân trước xa
    pathTaperedLeg(c, -6.5, -6.0 - bob, -7.2 + leg, 0, 2.8, 1.8); // Chân sau xa
    c.fill();
    c.stroke();

    // ĐUÔI BÔNG TO XÙ VỚI CHÓP ĐUÔI MÀU TRẮNG TINH
    c.fillStyle = mainCol;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.3;
    c.beginPath();
    c.ellipse(-10 + tailWag * 1.5, -12 - bob, 5.5, 7.5, -0.4, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    c.fillStyle = WHITE;
    c.beginPath();
    c.ellipse(-12 + tailWag * 2.0, -16 - bob, 3.2, 4.0, -0.4, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // THÂN CÁO: Thon dài thanh thoát, lưng uốn, ngực nhô, eo thắt
    c.fillStyle = mainCol;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.3;
    c.beginPath();
    c.moveTo(6.5, -8.5 - bob);
    c.quadraticCurveTo(5.2, -6.0 - bob, 3.5, -6.0 - bob);
    c.quadraticCurveTo(0, -7.2 - bob, -4.5, -6.5 - bob);
    c.quadraticCurveTo(-8.0, -6.5 - bob, -8.5, -9.5 - bob);
    c.quadraticCurveTo(-9.2, -12.5 - bob, -6.5, -12.2 - bob);
    c.quadraticCurveTo(-1.0, -11.5 - bob, 3.5, -12.5 - bob);
    c.quadraticCurveTo(5.5, -13.5 - bob, 7.5, -13.0 - bob);
    c.quadraticCurveTo(7.5, -10.5 - bob, 6.5, -8.5 - bob);
    c.closePath();
    c.fill();
    c.stroke();

    // Ngực trắng xòe rộng
    c.fillStyle = WHITE;
    c.beginPath();
    c.ellipse(3.8, -7.5 - bob, 4.2, 3.8, 0, 0, Math.PI * 2);
    c.fill();

    // Chân gần (phía ngoài) mang tất đen
    c.fillStyle = "#222222";
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.1;
    c.beginPath();
    pathTaperedLeg(c, 5.0, -6.0 - bob, 5.5 + leg, 0, 2.8, 2.0);
    pathTaperedLeg(c, -5.0, -6.0 - bob, -5.8 - leg, 0, 3.0, 2.0);
    c.fill();
    c.stroke();

    // ĐẦU CÁO & MÕM THON NHỌN
    const hx = 7.5, hy = -16.5 - bob * 0.7;

    // Tai to tam giác dựng đứng, chóp tai màu đen
    c.fillStyle = "#222222";
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(hx - 4.5, hy - 3.5); c.lineTo(hx - 3.0, hy - 11.5); c.lineTo(hx - 0.5, hy - 4.5);
    c.moveTo(hx + 1.2, hy - 4.5); c.lineTo(hx + 4.5, hy - 12.0); c.lineTo(hx + 6.8, hy - 3.2);
    c.fill();
    c.stroke();

    c.fillStyle = mainCol;
    c.beginPath();
    c.moveTo(hx + 2.2, hy - 4.5); c.lineTo(hx + 4.5, hy - 9.5); c.lineTo(hx + 5.8, hy - 3.8);
    c.fill();

    // Khối đầu & MÕM CÁO THON NHỌN
    c.fillStyle = mainCol;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.3;
    c.beginPath();
    c.moveTo(hx - 4.5, hy - 3.5);
    c.quadraticCurveTo(hx, hy - 5.8, hx + 4.2, hy - 3.5);
    c.quadraticCurveTo(hx + 5.5, hy - 1.0, hx + 8.5, hy + 0.8); // Mõm cáo thon nhọn dài
    c.quadraticCurveTo(hx + 9.2, hy + 2.8, hx + 5.5, hy + 3.8);
    c.quadraticCurveTo(hx + 3.0, hy + 5.5, hx, hy + 5.0);
    c.quadraticCurveTo(hx - 5.5, hy + 5.2, hx - 6.5, hy + 2.5);
    c.quadraticCurveTo(hx - 7.5, hy - 0.5, hx - 4.5, hy - 3.5);
    c.closePath();
    c.fill();
    c.stroke();

    // Má trắng cáo
    c.fillStyle = WHITE;
    c.beginPath();
    c.ellipse(hx + 2.5, hy + 2.0, 3.8, 2.5, 0, 0, Math.PI * 2);
    c.ellipse(hx - 1.5, hy + 2.0, 3.0, 2.0, 0, 0, Math.PI * 2);
    c.fill();

    // Mũi nhọn đen
    c.fillStyle = NOSE_BLACK;
    c.beginPath();
    c.arc(hx + 8.5, hy + 0.8, 1.1, 0, Math.PI * 2);
    c.fill();

    if (isIcon) {
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.0;
      c.beginPath();
      c.arc(hx + 4.5, hy + 2.0, 1.2, 0.1, Math.PI - 0.2);
      c.stroke();
    }

    drawEyes(c, hx + 3.8, hy - 1.0, 1.8, hx - 0.2, hy - 1.0, 1.5, isSleeping, blink, EYE_BLACK, lowPower, isIcon);
    drawCheeks(c, hx + 3.0, hy + 2.2, hx - 1.5, hy + 2.2, 2.0, 1.2);
  }

  // Vịt con (duck): Thân hình thuyền, ngực nở, CỔ VƯƠN CAO, ĐUÔI VỂNH NHỔNG, mỏ cam dẹt
  function drawDuck(c, ctx) {
    const { t, seed, isSleeping, isWalking, lowPower, isIcon } = ctx;
    const mainCol = "#ffd93d";
    const beakCol = "#ff7a00";
    const bob = isWalking ? Math.abs(Math.sin(t * 14 + seed)) * 1.4 : 0;
    const waddle = isWalking ? Math.sin(t * 14 + seed) * 0.15 : 0;
    const blink = !isSleeping && !isIcon && (((t * 1.5 + seed * 2.7 + 1.0) % 3.8) < 0.14);
    const brSleep = isSleeping ? Math.sin(t * 2.0 + seed) * 0.4 : 0;

    if (isSleeping) {
      c.fillStyle = mainCol;
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.3;
      c.beginPath();
      c.ellipse(0, -5, 8.5, 5.5 + brSleep * 0.4, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      c.beginPath();
      c.arc(4.5, -6.5, 4.5, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      c.fillStyle = beakCol;
      c.beginPath();
      c.ellipse(7.5, -5.5, 2.8, 1.6, 0.1, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      drawEyes(c, 4.5, -7.0, 1.4, null, null, null, true, false, EYE_BLACK, lowPower, isIcon);
      drawCheeks(c, 4.0, -5.0, null, null, 1.8, 1.0);
      return;
    }

    // Đôi chân màng cam bước lạch bạch
    const leg1 = isWalking ? Math.sin(t * 14 + seed) * 2.5 : 0;
    c.fillStyle = beakCol;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.0;
    c.fillRect(-2 - leg1, -2.5, 2.2, 2.5);
    c.fillRect(2 + leg1, -2.5, 2.2, 2.5);
    c.strokeRect(-2 - leg1, -2.5, 2.2, 2.5);
    c.strokeRect(2 + leg1, -2.5, 2.2, 2.5);
    // Bàn chân màng dẹt
    c.fillRect(-3.5 - leg1, -0.8, 4.0, 1.0);
    c.fillRect(0.5 + leg1, -0.8, 4.0, 1.0);

    // THÂN VỊT HÌNH THUYỀN VỚI ĐUÔI VỂNH NHỔNG CAO LÊN
    c.fillStyle = mainCol;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.3;
    c.beginPath();
    c.moveTo(5.5, -7.5 - bob); // Ngực nhô phía trước
    c.quadraticCurveTo(4.0, -4.5 - bob, 2.0, -4.5 - bob); // Bụng
    c.quadraticCurveTo(-2.0, -4.8 - bob, -6.5, -5.2 - bob);
    c.lineTo(-10.5, -11.5 - bob); // ĐUÔI VỂNH NHỔNG CAO LÊN PHÍA SAU
    c.lineTo(-7.0, -8.5 - bob);
    c.quadraticCurveTo(-2.0, -8.5 - bob, 3.0, -10.5 - bob); // Sống lưng thon
    c.quadraticCurveTo(4.5, -12.5 - bob, 5.0, -14.0 - bob); // CỔ VƯƠN CAO
    c.quadraticCurveTo(6.8, -10.5 - bob, 5.5, -7.5 - bob);
    c.closePath();
    c.fill();
    c.stroke();

    // Cánh nhỏ ở hông
    c.beginPath();
    c.ellipse(0, -7.5 - bob, 4.5, 3.2, 0.2 + waddle, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // ĐẦU VỊT TRÒN TRÊN CỔ VƯƠN CAO
    const hx = 5.2, hy = -15.0 - bob * 0.7;

    // Chỏm lông tơ 3 cọng trên đỉnh đầu
    c.strokeStyle = mainCol;
    c.lineWidth = 1.8;
    c.beginPath();
    c.moveTo(hx, hy - 5.2); c.lineTo(hx - 1, hy - 8.2);
    c.moveTo(hx + 1, hy - 5.2); c.lineTo(hx + 1.5, hy - 8.8);
    c.stroke();
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.1;
    c.stroke();

    c.fillStyle = mainCol;
    c.beginPath();
    c.arc(hx, hy, 5.2, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // CHIẾC MỎ DẸT MÀU CAM NHÔ DÀI RA PHÍA TRƯỚC
    c.fillStyle = beakCol;
    c.beginPath();
    c.ellipse(hx + 5.5, hy + 1.0, 3.8, 2.2, 0.05, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    drawEyes(c, hx + 2.5, hy - 1.2, 1.8, hx - 1.0, hy - 1.2, 1.4, isSleeping, blink, EYE_BLACK, lowPower, isIcon);
    drawCheeks(c, hx + 1.8, hy + 2.0, null, null, 2.0, 1.2);
  }

  // Rùa con (turtle): Mai vòm có gờ, CỔ & ĐẦU THÒ DÀI RA NGOÀI MAI, 4 chân bơi thò ra
  function drawTurtle(c, ctx) {
    const { t, seed, isSleeping, isWalking, lowPower, isIcon } = ctx;
    const shellCol = "#488b49";
    const skinCol = "#6fbf73";
    const markCol = "#a3e635";
    const bob = isWalking ? Math.abs(Math.sin(t * 8 + seed)) * 0.6 : 0;
    const paddle = isWalking ? Math.sin(t * 8 + seed) * 2.0 : 0;
    const blink = !isSleeping && !isIcon && (((t * 1.5 + seed * 2.7 + 1.0) % 3.8) < 0.14);
    const brSleep = isSleeping ? Math.sin(t * 2.0 + seed) * 0.4 : 0;

    if (isSleeping) {
      c.fillStyle = shellCol;
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.3;
      c.beginPath();
      c.ellipse(0, -6, 9.5, 6.0 + brSleep * 0.3, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      if (!lowPower) {
        c.fillStyle = markCol;
        c.beginPath();
        c.arc(-2, -6, 2.0, 0, Math.PI * 2);
        c.arc(3, -6, 1.8, 0, Math.PI * 2);
        c.fill();
      }

      c.fillStyle = skinCol;
      c.beginPath();
      c.arc(7.5, -4.5, 2.8, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      drawEyes(c, 8.2, -4.8, 1.2, null, null, null, true, false, EYE_BLACK, lowPower, isIcon);
      return;
    }

    // 4 chân bơi dẹt xanh lá thò ra ngoài mai
    c.fillStyle = skinCol;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.1;
    c.beginPath();
    c.ellipse(-6 - paddle, -2.5, 3.2, 1.8, -0.2, 0, Math.PI * 2);
    c.ellipse(4 + paddle, -2.5, 3.5, 2.0, 0.2, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Đuôi nhỏ nhọn thò ra sau mai
    c.beginPath();
    c.moveTo(-9.5, -4.5 - bob); c.lineTo(-12.5, -4.0 - bob); c.lineTo(-9.5, -2.5 - bob);
    c.closePath();
    c.fill();
    c.stroke();

    // MAI RÙA VÒM CONG VỚI GỜ MÉP TÁCH BIỆT RÕ RÀNG
    c.fillStyle = shellCol;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.3;
    c.beginPath();
    c.ellipse(-1, -7.5 - bob, 9.5, 6.5, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Hoa văn lục giác vàng chanh trên mai
    if (!lowPower) {
      c.fillStyle = markCol;
      c.beginPath();
      c.ellipse(-4, -8 - bob, 2.4, 2.0, 0, 0, Math.PI * 2);
      c.ellipse(1, -9 - bob, 2.5, 2.2, 0, 0, Math.PI * 2);
      c.ellipse(0, -5 - bob, 2.2, 1.8, 0, 0, Math.PI * 2);
      c.fill();
    }

    // CỔ VÀ ĐẦU RÙA THÒ HẲN RA NGOÀI MAI VỀ PHÍA TRƯỚC
    const hx = 8.5, hy = -6.5 - bob;
    c.fillStyle = skinCol;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(5.0, -8.0 - bob);
    c.quadraticCurveTo(hx - 1.0, hy - 4.0, hx + 2.5, hy - 2.5); // Cổ thò ra ngoài
    c.quadraticCurveTo(hx + 4.5, hy, hx + 3.0, hy + 2.5); // Đầu tròn
    c.quadraticCurveTo(hx - 1.0, hy + 3.5, 5.0, -5.0 - bob);
    c.closePath();
    c.fill();
    c.stroke();

    if (isIcon) {
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.0;
      c.beginPath();
      c.arc(hx + 1.8, hy + 1.5, 1.1, 0.1, Math.PI - 0.2);
      c.stroke();
    }

    drawEyes(c, hx + 1.8, hy - 1.0, 1.6, null, null, null, isSleeping, blink, EYE_BLACK, lowPower, isIcon);
    drawCheeks(c, hx + 1.0, hy + 1.5, null, null, 1.8, 1.1);
  }

  // Gấu trúc nhỏ (panda): Thân dài có ngực/eo/mông, cổ ngắn nâng đầu to, mõm tròn nhô rõ
  function drawPanda(c, ctx) {
    const { t, seed, isSleeping, isWalking, lowPower, isIcon } = ctx;
    const whiteCol = WHITE;
    const blackCol = "#2b2b35";
    const bob = isWalking ? Math.abs(Math.sin(t * 14 + seed)) * 1.2 : 0;
    const leg = isWalking ? Math.sin(t * 12 + seed) * 3 : 0;
    const blink = !isSleeping && !isIcon && (((t * 1.5 + seed * 2.7 + 1.0) % 3.8) < 0.14);
    const brSleep = isSleeping ? Math.sin(t * 2.0 + seed) * 0.4 : 0;

    if (isSleeping) {
      c.fillStyle = whiteCol;
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1.3;
      c.beginPath();
      c.moveTo(5.0, -5.0 + brSleep);
      c.quadraticCurveTo(1.0, -8.5 + brSleep, -5.5, -8.0 + brSleep);
      c.quadraticCurveTo(-9.5, -7.5 + brSleep, -8.8, -3.5);
      c.quadraticCurveTo(-3.0, -2.5, 3.5, -2.5);
      c.closePath();
      c.fill();
      c.stroke();

      c.fillStyle = blackCol;
      c.beginPath();
      c.ellipse(-3, -4.5, 4.0, 3.5, 0, 0, Math.PI * 2);
      c.fill();

      c.fillStyle = whiteCol;
      c.beginPath();
      c.arc(6.5, -6.5, 5.5, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      c.fillStyle = blackCol;
      c.beginPath();
      c.arc(4.5, -11.5, 2.0, 0, Math.PI * 2);
      c.arc(9.0, -11.5, 2.0, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      drawEyes(c, 8, -6.8, 1.5, 5, -6.8, 1.3, true, false, EYE_BLACK, lowPower, isIcon);
      drawCheeks(c, 7.2, -4.5, null, null, 1.8, 1.0);
      return;
    }

    // 4 CHÂN ĐEN VÀ DẢI ĐEN VẮT QUA VAI
    c.fillStyle = blackCol;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.1;
    c.beginPath();
    pathTaperedLeg(c, 3.5, -6.0 - bob, 3.8 - leg, 0, 3.0, 2.2);
    pathTaperedLeg(c, -6.5, -6.0 - bob, -7.2 + leg, 0, 3.2, 2.2);
    c.fill();
    c.stroke();

    // Đuôi cụt đen nhỏ sau mông
    c.beginPath();
    c.arc(-9.5, -9.5 - bob, 2.0, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Thân gấu trúc: ngực nở, eo thon nhẹ, mông tròn
    c.fillStyle = whiteCol;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.3;
    c.beginPath();
    c.moveTo(6.5, -8.5 - bob);
    c.quadraticCurveTo(5.2, -6.0 - bob, 3.5, -6.0 - bob);
    c.quadraticCurveTo(0, -7.0 - bob, -4.5, -6.5 - bob);
    c.quadraticCurveTo(-8.0, -6.5 - bob, -8.5, -9.5 - bob);
    c.quadraticCurveTo(-9.2, -12.5 - bob, -6.5, -12.2 - bob);
    c.quadraticCurveTo(-1.0, -11.5 - bob, 3.5, -12.5 - bob);
    c.quadraticCurveTo(5.5, -13.5 - bob, 7.5, -13.0 - bob);
    c.quadraticCurveTo(7.5, -10.5 - bob, 6.5, -8.5 - bob);
    c.closePath();
    c.fill();
    c.stroke();

    // Dải áo đen qua vai và ngực gấu trúc
    c.fillStyle = blackCol;
    c.beginPath();
    c.ellipse(3.2, -8.0 - bob, 4.0, 5.8, 0.1, 0, Math.PI * 2);
    c.fill();

    // Chân gần (phía ngoài)
    c.beginPath();
    pathTaperedLeg(c, 5.0, -6.0 - bob, 5.5 + leg, 0, 3.2, 2.4);
    pathTaperedLeg(c, -5.0, -6.0 - bob, -5.8 - leg, 0, 3.4, 2.4);
    c.fill();
    c.stroke();

    // ĐẦU GẤU TRÚC: Cổ ngắn nâng đầu tròn to, mõm ngắn tròn nhô phía trước
    const hx = 7.5, hy = -16.5 - bob * 0.7;

    // Hai tai tròn đen ở đỉnh đầu
    c.fillStyle = blackCol;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.2;
    c.beginPath();
    c.arc(hx - 3.8, hy - 5.5, 2.6, 0, Math.PI * 2);
    c.arc(hx + 4.5, hy - 5.8, 2.6, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Khối đầu trắng
    c.fillStyle = whiteCol;
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.3;
    c.beginPath();
    c.moveTo(hx - 4.5, hy - 3.5);
    c.quadraticCurveTo(hx, hy - 5.8, hx + 4.2, hy - 3.5);
    c.quadraticCurveTo(hx + 5.5, hy - 1.0, hx + 7.5, hy + 1.2); // Mõm ngắn tròn nhô trước
    c.quadraticCurveTo(hx + 7.8, hy + 3.2, hx + 5.2, hy + 4.0);
    c.quadraticCurveTo(hx + 3.0, hy + 5.5, hx, hy + 5.0);
    c.quadraticCurveTo(hx - 5.5, hy + 5.2, hx - 6.5, hy + 2.5);
    c.quadraticCurveTo(hx - 7.5, hy - 0.5, hx - 4.5, hy - 3.5);
    c.closePath();
    c.fill();
    c.stroke();

    // Hai quầng mắt đen hình ovan nghiêng đặc trưng
    c.fillStyle = blackCol;
    c.beginPath();
    c.ellipse(hx + 3.5, hy - 0.8, 2.6, 3.2, 0.35, 0, Math.PI * 2);
    c.ellipse(hx - 1.2, hy - 0.8, 2.2, 2.8, -0.35, 0, Math.PI * 2);
    c.fill();

    // Mắt có chấm sáng trắng long lanh
    drawEyes(c, hx + 3.8, hy - 1.0, 1.5, hx - 1.0, hy - 1.0, 1.3, isSleeping, blink, WHITE, lowPower, isIcon);
    drawCheeks(c, hx + 3.2, hy + 2.4, hx - 1.5, hy + 2.4, 2.2, 1.2);

    // Mũi tam giác nhỏ bo tròn màu đen
    c.fillStyle = blackCol;
    c.beginPath();
    c.arc(hx + 6.8, hy + 1.2, 1.1, 0, Math.PI * 2);
    c.fill();

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
    c.fillStyle = SHADOW_COL;
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
    const s = Math.min((w * 0.80) / 32, (h * 0.80) / 25);
    const cx = w / 2;
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
