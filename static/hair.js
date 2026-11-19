// ================== TÓC NHÂN VẬT THEO ĐÚNG PHONG CÁCH SVG ==================
// Kiểu tóc + màu nhuộm lấy từ salon/hair_catalog.json (server gửi qua CATALOG.SALON).
// Vẽ theo chuẩn phong cách SVG (viền nâu ấm #6b4a3a, màu phẳng, vệt sáng cong trên đỉnh đầu).
// Tối ưu tốc độ cao: không gradient, không shadow, giảm thiểu beginPath, cache màu nhuộm.
"use strict";

const Hair = (() => {
  const SAL = (typeof CATALOG !== "undefined" && CATALOG.SALON) || { hairstyles: [], dyes: [], default: { hair: "short", hairColor: "nau" } };
  const STY = Object.fromEntries((SAL.hairstyles || []).map(h => [h.id, h]));
  const DYE = Object.fromEntries((SAL.dyes || []).map(d => [d.id, d]));
  // Tóc bản cũ (trước V6) → kiểu/màu mới (NPC, dữ liệu cũ còn dùng mã cũ)
  const OLD_HAIR = { hair_short: "short", hair_long: "long", hair_bun: "twinbun", hair_spiky: "spiky" };
  const OLD_COLOR = { hc_brown: "naudam", hc_black: "den", hc_blonde: "vang", hc_pink: "hong", hc_blue: "xanh", hc_silver: "bac" };
  const style = id => STY[id] ? id : OLD_HAIR[id] || (SAL.default && SAL.default.hair) || "short";
  const dye = id => DYE[id] || DYE[OLD_COLOR[id]] || (SAL.default && DYE[SAL.default.hairColor]) || { hair: "#7a4a30", hl: "#a8704c" };

  // Bộ nhớ đệm màu giúp không phải tính toán chuỗi hex mỗi khung hình
  const TONE_CACHE = new Map();
  function tone(hex, amt) {
    const key = `${hex}_${amt}`;
    let res = TONE_CACHE.get(key);
    if (res !== undefined) return res;
    const n = parseInt(String(hex).slice(1), 16);
    if (isNaN(n)) { TONE_CACHE.set(key, hex); return hex; }
    const f = v => Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt));
    res = "#" + [n >> 16, (n >> 8) & 255, n & 255].map(v => f(v).toString(16).padStart(2, "0")).join("");
    TONE_CACHE.set(key, res);
    return res;
  }

  // Thông số vẽ tóc
  function params(colorId, x, hy, hipY, male) {
    const d = dye(colorId);
    return {
      x, hy, hipY, male,
      c: d.hair,
      hl: d.hl,
      line: "#6b4a3a",
      dark: tone(d.hair, -0.12),
      sh: tone(d.hair, -0.2)
    };
  }

  // Viền nâu ấm đều nét đặc trưng (#6b4a3a, nét 4, round)
  function ink(g, w = 4) {
    g.lineWidth = w;
    g.strokeStyle = "#6b4a3a";
    g.lineJoin = "round";
    g.lineCap = "round";
  }

  // Vệt sáng cong trên đỉnh tóc (đặc trưng từ mẫu SVG)
  function shine(g, P, dy = 0) {
    g.strokeStyle = P.hl;
    g.lineWidth = 9;
    g.lineCap = "round";
    g.globalAlpha = 0.8;
    g.beginPath();
    g.moveTo(120, 112 + dy);
    g.quadraticCurveTo(160, 88 + dy, 214, 96 + dy);
    g.stroke();
    g.globalAlpha = 1;
  }

  // Tóc gáy ngắn (An, Khôi)
  function nape(g, P, dy) {
    g.fillStyle = P.c; ink(g, 4);
    g.beginPath();
    g.moveTo(64, 222 + dy);
    g.quadraticCurveTo(62, 66 + dy, 200, 62 + dy);
    g.quadraticCurveTo(338, 66 + dy, 336, 222 + dy);
    g.closePath();
    g.fill(); g.stroke();
  }

  // Tóc dài buông sau lưng (Linh)
  function longBack(g, P, dy) {
    g.fillStyle = P.c; ink(g, 4);
    g.beginPath();
    g.moveTo(52, 222 + dy);
    g.quadraticCurveTo(48, 60 + dy, 200, 56 + dy);
    g.quadraticCurveTo(352, 60 + dy, 348, 222 + dy);
    g.lineTo(362, 440 + dy);
    g.quadraticCurveTo(330, 470 + dy, 300, 440 + dy);
    g.lineTo(100, 440 + dy);
    g.quadraticCurveTo(70, 470 + dy, 38, 440 + dy);
    g.closePath();
    g.fill(); g.stroke();
  }

  // Tóc bob sau lưng (Mia)
  function bobBack(g, P, dy) {
    g.fillStyle = P.c; ink(g, 4);
    g.beginPath();
    g.moveTo(56, 222 + dy);
    g.quadraticCurveTo(52, 62 + dy, 200, 58 + dy);
    g.quadraticCurveTo(348, 62 + dy, 344, 222 + dy);
    g.lineTo(350, 320 + dy);
    g.quadraticCurveTo(326, 340 + dy, 306, 316 + dy);
    g.lineTo(94, 316 + dy);
    g.quadraticCurveTo(74, 340 + dy, 50, 320 + dy);
    g.closePath();
    g.fill(); g.stroke();
  }

  // Mái lượn sóng phía trước của nữ (Mia / Linh)
  function femaleBangs(g, P, dy) {
    g.fillStyle = P.c; ink(g, 4);
    g.beginPath();
    g.moveTo(66, 214 + dy);
    g.quadraticCurveTo(70, 78 + dy, 200, 74 + dy);
    g.quadraticCurveTo(330, 78 + dy, 334, 214 + dy);
    g.quadraticCurveTo(316, 170 + dy, 286, 150 + dy);
    g.quadraticCurveTo(262, 190 + dy, 232, 156 + dy);
    g.quadraticCurveTo(214, 196 + dy, 190, 154 + dy);
    g.quadraticCurveTo(166, 192 + dy, 142, 152 + dy);
    g.quadraticCurveTo(104, 166 + dy, 66, 214 + dy);
    g.closePath();
    g.fill(); g.stroke();
    shine(g, P, dy);
  }

  // Mái tóc ngắn gọn của nam (An)
  function maleBangs(g, P, dy) {
    g.fillStyle = P.c; ink(g, 4);
    g.beginPath();
    g.moveTo(66, 214 + dy);
    g.quadraticCurveTo(64, 80 + dy, 200, 76 + dy);
    g.quadraticCurveTo(336, 80 + dy, 334, 214 + dy);
    g.quadraticCurveTo(322, 160 + dy, 296, 142 + dy);
    g.quadraticCurveTo(250, 172 + dy, 200, 140 + dy);
    g.quadraticCurveTo(150, 168 + dy, 104, 146 + dy);
    g.quadraticCurveTo(76, 168 + dy, 66, 214 + dy);
    g.closePath();
    g.fill(); g.stroke();
    shine(g, P, dy);
  }

  // Mái tóc nhọn cá tính (Khôi)
  function spikyBangs(g, P, dy) {
    g.fillStyle = P.c; ink(g, 4);
    g.beginPath();
    g.moveTo(62, 214 + dy);
    g.quadraticCurveTo(58, 120 + dy, 84, 98 + dy);
    g.lineTo(92, 56 + dy);
    g.lineTo(130, 88 + dy);
    g.lineTo(160, 36 + dy);
    g.lineTo(192, 84 + dy);
    g.lineTo(232, 30 + dy);
    g.lineTo(250, 86 + dy);
    g.lineTo(296, 50 + dy);
    g.lineTo(306, 100 + dy);
    g.lineTo(334, 96 + dy);
    g.quadraticCurveTo(344, 130 + dy, 338, 214 + dy);
    g.quadraticCurveTo(322, 160 + dy, 296, 142 + dy);
    g.quadraticCurveTo(250, 172 + dy, 200, 140 + dy);
    g.quadraticCurveTo(150, 168 + dy, 104, 146 + dy);
    g.quadraticCurveTo(76, 168 + dy, 62, 214 + dy);
    g.closePath();
    g.fill(); g.stroke();
  }

  // Khối nhìn từ sau lưng (nhân vật quay lưng)
  function viewBase(g, P, dy) {
    g.fillStyle = P.c; ink(g, 4);
    g.beginPath();
    g.moveTo(56, 222 + dy);
    g.quadraticCurveTo(52, 60 + dy, 200, 56 + dy);
    g.quadraticCurveTo(348, 60 + dy, 344, 222 + dy);
    g.quadraticCurveTo(328, 320 + dy, 200, 324 + dy);
    g.quadraticCurveTo(72, 320 + dy, 56, 222 + dy);
    g.closePath();
    g.fill(); g.stroke();
    // Vệt sáng sau đầu
    g.strokeStyle = P.hl; g.lineWidth = 8; g.lineCap = "round"; g.globalAlpha = 0.7;
    g.beginPath();
    g.moveTo(130, 108 + dy); g.quadraticCurveTo(170, 88 + dy, 220, 96 + dy);
    g.stroke();
    g.globalAlpha = 1;
  }

  // 16 kiểu tóc trong game
  const STYLES = {
    short: {
      back: (g, P, dy) => nape(g, P, dy),
      front: (g, P, dy) => (P.male ? maleBangs(g, P, dy) : femaleBangs(g, P, dy)),
      view: (g, P, dy) => viewBase(g, P, dy)
    },
    bob: {
      back: (g, P, dy) => bobBack(g, P, dy),
      front: (g, P, dy) => femaleBangs(g, P, dy),
      view: (g, P, dy) => { bobBack(g, P, dy); viewBase(g, P, dy); }
    },
    long: {
      back: (g, P, dy) => longBack(g, P, dy),
      front: (g, P, dy) => {
        // Lọn tóc dài thả hai bên vai
        g.fillStyle = P.c; ink(g, 4);
        g.beginPath();
        g.moveTo(66, 214 + dy); g.lineTo(54, 320 + dy); g.lineTo(76, 310 + dy); g.lineTo(82, 220 + dy);
        g.moveTo(334, 214 + dy); g.lineTo(346, 320 + dy); g.lineTo(324, 310 + dy); g.lineTo(318, 220 + dy);
        g.closePath(); g.fill(); g.stroke();
        femaleBangs(g, P, dy);
      },
      view: (g, P, dy) => { longBack(g, P, dy); viewBase(g, P, dy); }
    },
    spiky: {
      back: (g, P, dy) => nape(g, P, dy),
      front: (g, P, dy) => spikyBangs(g, P, dy),
      view: (g, P, dy) => { viewBase(g, P, dy); spikyBangs(g, P, dy); }
    },
    twinbun: {
      back: (g, P, dy) => nape(g, P, dy),
      front: (g, P, dy) => {
        // Hai búi tóc tròn hai bên
        g.fillStyle = P.c; ink(g, 4);
        for (const bx of [100, 300]) {
          g.beginPath(); g.arc(bx, 95 + dy, 40, 0, 6.2831853); g.fill(); g.stroke();
          g.strokeStyle = P.hl; g.lineWidth = 5; g.beginPath();
          g.arc(bx, 95 + dy, 26, 3.8, 5.8); g.stroke();
        }
        femaleBangs(g, P, dy);
      },
      view: (g, P, dy) => {
        g.fillStyle = P.c; ink(g, 4);
        for (const bx of [100, 300]) {
          g.beginPath(); g.arc(bx, 95 + dy, 40, 0, 6.2831853); g.fill(); g.stroke();
        }
        viewBase(g, P, dy);
      }
    },
    side: {
      back: (g, P, dy) => nape(g, P, dy),
      front: (g, P, dy) => {
        // Mái rẽ ngôi lệch
        g.fillStyle = P.c; ink(g, 4);
        g.beginPath();
        g.moveTo(66, 214 + dy);
        g.quadraticCurveTo(70, 78 + dy, 200, 74 + dy);
        g.quadraticCurveTo(330, 78 + dy, 334, 214 + dy);
        g.quadraticCurveTo(320, 160 + dy, 296, 146 + dy);
        g.quadraticCurveTo(230, 170 + dy, 160, 140 + dy);
        g.quadraticCurveTo(110, 170 + dy, 66, 214 + dy);
        g.closePath();
        g.fill(); g.stroke();
        shine(g, P, dy);
      },
      view: (g, P, dy) => viewBase(g, P, dy)
    },
    pony: {
      back: (g, P, dy) => {
        nape(g, P, dy);
        // Đuôi ngựa buông bên phải
        g.fillStyle = P.c; ink(g, 4);
        g.beginPath();
        g.moveTo(310, 150 + dy);
        g.quadraticCurveTo(375, 140 + dy, 365, 250 + dy);
        g.quadraticCurveTo(350, 320 + dy, 320, 340 + dy);
        g.quadraticCurveTo(338, 250 + dy, 312, 190 + dy);
        g.closePath(); g.fill(); g.stroke();
        // Dây buộc tóc
        g.fillStyle = P.dark; g.beginPath();
        g.ellipse(312, 165 + dy, 14, 18, 0.4, 0, 6.2831853);
        g.fill(); g.stroke();
      },
      front: (g, P, dy) => femaleBangs(g, P, dy),
      view: (g, P, dy) => {
        viewBase(g, P, dy);
        g.fillStyle = P.c; ink(g, 4);
        g.beginPath();
        g.moveTo(310, 150 + dy);
        g.quadraticCurveTo(375, 140 + dy, 365, 250 + dy);
        g.quadraticCurveTo(350, 320 + dy, 320, 340 + dy);
        g.quadraticCurveTo(338, 250 + dy, 312, 190 + dy);
        g.closePath(); g.fill(); g.stroke();
      }
    },
    twin: {
      back: (g, P, dy) => {
        nape(g, P, dy);
        // Hai chùm tóc hai bên
        g.fillStyle = P.c; ink(g, 4);
        g.beginPath();
        g.ellipse(60, 260 + dy, 32, 48, -0.2, 0, 6.2831853);
        g.ellipse(340, 260 + dy, 32, 48, 0.2, 0, 6.2831853);
        g.fill(); g.stroke();
      },
      front: (g, P, dy) => {
        femaleBangs(g, P, dy);
        // Nơ/dây buộc tóc hai bên
        g.fillStyle = P.dark; ink(g, 3);
        g.beginPath();
        g.ellipse(74, 226 + dy, 12, 16, -0.3, 0, 6.2831853);
        g.ellipse(326, 226 + dy, 12, 16, 0.3, 0, 6.2831853);
        g.fill(); g.stroke();
      },
      view: (g, P, dy) => {
        g.fillStyle = P.c; ink(g, 4);
        g.beginPath();
        g.ellipse(60, 260 + dy, 32, 48, -0.2, 0, 6.2831853);
        g.ellipse(340, 260 + dy, 32, 48, 0.2, 0, 6.2831853);
        g.fill(); g.stroke();
        viewBase(g, P, dy);
      }
    },
    wavy: {
      back: (g, P, dy) => {
        // Tóc gợn sóng buông dài
        g.fillStyle = P.c; ink(g, 4);
        g.beginPath();
        g.moveTo(52, 222 + dy);
        g.quadraticCurveTo(46, 60 + dy, 200, 56 + dy);
        g.quadraticCurveTo(354, 60 + dy, 348, 222 + dy);
        g.bezierCurveTo(365, 270 + dy, 340, 330 + dy, 360, 390 + dy);
        g.lineTo(350, 446 + dy);
        g.quadraticCurveTo(320, 470 + dy, 290, 446 + dy);
        g.quadraticCurveTo(260, 470 + dy, 230, 446 + dy);
        g.quadraticCurveTo(200, 470 + dy, 170, 446 + dy);
        g.quadraticCurveTo(140, 470 + dy, 110, 446 + dy);
        g.lineTo(50, 446 + dy);
        g.bezierCurveTo(40, 390 + dy, 60, 330 + dy, 35, 270 + dy);
        g.closePath();
        g.fill(); g.stroke();
      },
      front: (g, P, dy) => {
        // Lọn sóng xoăn thả hai bên ngực
        g.fillStyle = P.c; ink(g, 4);
        g.beginPath();
        g.moveTo(66, 214 + dy); g.quadraticCurveTo(45, 270 + dy, 60, 320 + dy);
        g.quadraticCurveTo(80, 310 + dy, 84, 220 + dy);
        g.moveTo(334, 214 + dy); g.quadraticCurveTo(355, 270 + dy, 340, 320 + dy);
        g.quadraticCurveTo(320, 310 + dy, 316, 220 + dy);
        g.closePath(); g.fill(); g.stroke();
        femaleBangs(g, P, dy);
      },
      view: (g, P, dy) => {
        STYLES.wavy.back(g, P, dy);
        viewBase(g, P, dy);
      }
    },
    bun: {
      back: (g, P, dy) => nape(g, P, dy),
      front: (g, P, dy) => {
        // Búi tóc cao trên đỉnh
        g.fillStyle = P.c; ink(g, 4);
        g.beginPath(); g.arc(200, 50 + dy, 46, 0, 6.2831853); g.fill(); g.stroke();
        g.strokeStyle = P.hl; g.lineWidth = 5; g.beginPath();
        g.arc(200, 50 + dy, 32, 3.7, 5.7); g.stroke();
        g.fillStyle = P.dark; g.beginPath();
        g.ellipse(200, 88 + dy, 24, 12, 0, 0, 6.2831853); g.fill(); g.stroke();
        femaleBangs(g, P, dy);
      },
      view: (g, P, dy) => {
        viewBase(g, P, dy);
        g.fillStyle = P.c; ink(g, 4);
        g.beginPath(); g.arc(200, 50 + dy, 46, 0, 6.2831853); g.fill(); g.stroke();
      }
    },
    mushroom: {
      back: (g, P, dy) => {
        g.fillStyle = P.c; ink(g, 4);
        g.beginPath();
        g.ellipse(200, 220 + dy, 134, 100, 0, 0, Math.PI);
        g.fill(); g.stroke();
      },
      front: (g, P, dy) => {
        // Tóc nấm vòm tròn mái bằng
        g.fillStyle = P.c; ink(g, 4);
        g.beginPath();
        g.moveTo(64, 214 + dy);
        g.quadraticCurveTo(68, 76 + dy, 200, 74 + dy);
        g.quadraticCurveTo(332, 76 + dy, 336, 214 + dy);
        g.quadraticCurveTo(320, 175 + dy, 280, 166 + dy);
        g.quadraticCurveTo(200, 168 + dy, 120, 166 + dy);
        g.quadraticCurveTo(80, 175 + dy, 64, 214 + dy);
        g.closePath();
        g.fill(); g.stroke();
        shine(g, P, dy);
      },
      view: (g, P, dy) => {
        g.fillStyle = P.c; ink(g, 4);
        g.beginPath();
        g.moveTo(64, 214 + dy);
        g.quadraticCurveTo(68, 76 + dy, 200, 74 + dy);
        g.quadraticCurveTo(332, 76 + dy, 336, 214 + dy);
        g.quadraticCurveTo(200, 270 + dy, 64, 214 + dy);
        g.closePath();
        g.fill(); g.stroke();
        shine(g, P, dy);
      }
    },
    curlyb: {
      back: (g, P, dy) => nape(g, P, dy),
      front: (g, P, dy) => {
        // Xoăn ngắn: các lọn tròn bo viền
        g.fillStyle = P.c; ink(g, 4);
        g.beginPath();
        g.arc(80, 180 + dy, 30, 0, 6.2831853);
        g.arc(110, 130 + dy, 32, 0, 6.2831853);
        g.arc(160, 90 + dy, 34, 0, 6.2831853);
        g.arc(210, 85 + dy, 35, 0, 6.2831853);
        g.arc(260, 95 + dy, 34, 0, 6.2831853);
        g.arc(300, 140 + dy, 32, 0, 6.2831853);
        g.arc(320, 185 + dy, 30, 0, 6.2831853);
        g.fill(); g.stroke();
        femaleBangs(g, P, dy);
      },
      view: (g, P, dy) => {
        g.fillStyle = P.c; ink(g, 4);
        g.beginPath();
        g.arc(80, 180 + dy, 30, 0, 6.2831853);
        g.arc(110, 130 + dy, 32, 0, 6.2831853);
        g.arc(160, 90 + dy, 34, 0, 6.2831853);
        g.arc(210, 85 + dy, 35, 0, 6.2831853);
        g.arc(260, 95 + dy, 34, 0, 6.2831853);
        g.arc(300, 140 + dy, 32, 0, 6.2831853);
        g.arc(320, 185 + dy, 30, 0, 6.2831853);
        g.fill(); g.stroke();
        viewBase(g, P, dy);
      }
    },
    braid: {
      back: (g, P, dy) => nape(g, P, dy),
      front: (g, P, dy) => {
        // Bím tết thả một bên vai
        femaleBangs(g, P, dy);
        g.fillStyle = P.c; ink(g, 4);
        for (const [nx, ny, nr] of [[92, 250, 24], [86, 290, 22], [82, 330, 20]]) {
          g.beginPath(); g.arc(nx, ny + dy, nr, 0, 6.2831853); g.fill(); g.stroke();
        }
        g.fillStyle = P.dark; g.beginPath();
        g.ellipse(82, 360 + dy, 12, 8, 0, 0, 6.2831853); g.fill(); g.stroke();
        g.fillStyle = P.c; g.beginPath();
        g.moveTo(82, 365 + dy); g.lineTo(74, 390 + dy); g.lineTo(90, 390 + dy); g.closePath();
        g.fill(); g.stroke();
      },
      view: (g, P, dy) => {
        viewBase(g, P, dy);
        g.fillStyle = P.c; ink(g, 4);
        for (const [nx, ny, nr] of [[92, 250, 24], [86, 290, 22], [82, 330, 20]]) {
          g.beginPath(); g.arc(nx, ny + dy, nr, 0, 6.2831853); g.fill(); g.stroke();
        }
      }
    },
    slick: {
      back: (g, P, dy) => nape(g, P, dy),
      front: (g, P, dy) => {
        // Tóc vuốt ngược lộ trán
        g.fillStyle = P.c; ink(g, 4);
        g.beginPath();
        g.moveTo(76, 214 + dy);
        g.quadraticCurveTo(68, 80 + dy, 185, 50 + dy);
        g.lineTo(200, 24 + dy);
        g.lineTo(215, 50 + dy);
        g.quadraticCurveTo(332, 80 + dy, 324, 214 + dy);
        g.quadraticCurveTo(310, 160 + dy, 200, 150 + dy);
        g.quadraticCurveTo(90, 160 + dy, 76, 214 + dy);
        g.closePath();
        g.fill(); g.stroke();
        shine(g, P, dy - 20);
      },
      view: (g, P, dy) => {
        viewBase(g, P, dy);
        g.fillStyle = P.c; ink(g, 4);
        g.beginPath();
        g.moveTo(185, 52 + dy); g.lineTo(200, 24 + dy); g.lineTo(215, 52 + dy);
        g.closePath(); g.fill(); g.stroke();
      }
    },
    curly: {
      back: (g, P, dy) => {
        // Quả bông xoăn lớn quanh đầu
        g.fillStyle = P.c; ink(g, 4);
        g.beginPath();
        g.arc(70, 210 + dy, 48, 0, 6.2831853);
        g.arc(80, 130 + dy, 52, 0, 6.2831853);
        g.arc(140, 70 + dy, 56, 0, 6.2831853);
        g.arc(200, 50 + dy, 58, 0, 6.2831853);
        g.arc(260, 70 + dy, 56, 0, 6.2831853);
        g.arc(320, 130 + dy, 52, 0, 6.2831853);
        g.arc(330, 210 + dy, 48, 0, 6.2831853);
        g.fill(); g.stroke();
      },
      front: (g, P, dy) => {
        femaleBangs(g, P, dy);
      },
      view: (g, P, dy) => {
        STYLES.curly.back(g, P, dy);
        viewBase(g, P, dy);
      }
    },
    mohawk: {
      back: (g, P, dy) => nape(g, P, dy),
      front: (g, P, dy) => {
        // Hai bên cạo sát
        g.fillStyle = P.sh; g.globalAlpha = 0.25;
        g.beginPath();
        g.ellipse(110, 190 + dy, 35, 55, -0.2, 0, 6.2831853);
        g.ellipse(290, 190 + dy, 35, 55, 0.2, 0, 6.2831853);
        g.fill();
        g.globalAlpha = 1;
        // Dải tóc dựng ở giữa đỉnh đầu
        g.fillStyle = P.c; ink(g, 4);
        g.beginPath();
        g.moveTo(175, 180 + dy);
        g.lineTo(170, 60 + dy);
        g.lineTo(200, 18 + dy);
        g.lineTo(230, 60 + dy);
        g.lineTo(225, 180 + dy);
        g.closePath();
        g.fill(); g.stroke();
        g.strokeStyle = P.hl; g.lineWidth = 5; g.beginPath();
        g.moveTo(200, 30 + dy); g.lineTo(200, 160 + dy); g.stroke();
      },
      view: (g, P, dy) => {
        viewBase(g, P, dy);
        g.fillStyle = P.c; ink(g, 4);
        g.beginPath();
        g.moveTo(180, 270 + dy); g.lineTo(180, 50 + dy);
        g.lineTo(200, 18 + dy);
        g.lineTo(220, 50 + dy); g.lineTo(220, 270 + dy);
        g.closePath(); g.fill(); g.stroke();
      }
    }
  };

  // Điều phối vẽ từng lớp tóc
  function draw(layer, g, id, colorId, x, hy, hipY, male) {
    const s = STYLES[style(id)] || STYLES.short;
    const f = s[layer] || STYLES.short[layer];
    if (!f) return;
    // Kiểm tra toạ độ chibi cũ hay hệ toạ độ SVG
    const isChibi = Math.abs(hy) < 100;
    if (isChibi) {
      g.save();
      g.translate(x, hy);
      g.scale(11.2 / 130, 11.2 / 130);
      g.translate(-200, -215);
      f(g, params(colorId, 200, 215, 215 + (hipY - hy) * (130 / 11.2), male), 0);
      g.restore();
    } else {
      const dy = hy - 215;
      f(g, params(colorId, x, hy, hipY, male), dy);
    }
  }

  return {
    STY, DYE, style, dye, tone,
    back: (g, id, col, x, hy, hipY, male) => draw("back", g, id, col, x, hy, hipY, male),
    front: (g, id, col, x, hy, hipY, male) => draw("front", g, id, col, x, hy, hipY, male),
    view: (g, id, col, x, hy, hipY, male) => draw("view", g, id, col, x, hy, hipY, male)
  };
})();
