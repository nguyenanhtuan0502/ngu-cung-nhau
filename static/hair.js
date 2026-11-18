// ================== TÓC NHÂN VẬT (V6 – Tiệm Làm Tóc) ==================
// Kiểu tóc + màu nhuộm lấy từ salon/hair_catalog.json (server gửi qua CATALOG.SALON).
// File này CHỈ vẽ tóc lên canvas, không có logic mua bán. Nạp TRƯỚC areas.js.
//
// Toạ độ chibi (giống drawAvatar trong areas.js): x = giữa người, hy = tâm đầu (đầu là elip rộng 11.2, cao 10.3),
// hipY = hông (tóc dài buông tới đây). Mỗi kiểu tóc có 3 lớp:
//   back(g, P)  : tóc phía SAU đầu, vẽ trước thân người (tóc dài, đuôi ngựa, bím…)
//   front(g, P) : tóc phía TRƯỚC (vòm tóc + mái), vẽ sau mặt
//   view(g, P)  : nhìn từ SAU lưng (nhân vật đi lên trên màn hình), vẽ thay cho mặt
// P = {x, hy, hipY, c (màu tóc), hl (màu ánh sáng), line (viền), sh (bóng), male}
"use strict";

const Hair = (() => {
  const SAL = CATALOG.SALON;
  const STY = Object.fromEntries(SAL.hairstyles.map(h => [h.id, h]));
  const DYE = Object.fromEntries(SAL.dyes.map(d => [d.id, d]));
  // Tóc bản cũ (trước V6) → kiểu/màu mới (NPC, dữ liệu cũ còn dùng mã cũ)
  const OLD_HAIR = {hair_short: "short", hair_long: "long", hair_bun: "twinbun", hair_spiky: "spiky"};
  const OLD_COLOR = {hc_brown: "naudam", hc_black: "den", hc_blonde: "vang", hc_pink: "hong", hc_blue: "xanh", hc_silver: "bac"};
  const style = id => STY[id] ? id : OLD_HAIR[id] || SAL.default.hair;
  const dye = id => DYE[id] || DYE[OLD_COLOR[id]] || DYE[SAL.default.hairColor];

  function tone(hex, amt) {                          // amt > 0: sáng hơn, < 0: tối hơn
    const n = parseInt(String(hex).slice(1), 16); if (isNaN(n)) return hex;
    const f = v => Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt));
    return "#" + [n >> 16, (n >> 8) & 255, n & 255].map(v => f(v).toString(16).padStart(2, "0")).join("");
  }
  function params(colorId, x, hy, hipY, male) {
    const d = dye(colorId);
    return {x, hy, hipY, male, c: d.hair, hl: d.hl, line: tone(d.hair, -.45), sh: tone(d.hair, -.18), dark: tone(d.hair, -.1)};
  }
  function ink(g, P, w = .85) { g.lineWidth = w; g.strokeStyle = P.line; g.lineJoin = "round"; g.lineCap = "round"; }

  // ---------- Mảnh ghép dùng chung ----------
  // Tóc gáy sau đầu (làm đầu tròn đầy hơn)
  function nape(g, P) {
    const {x, hy} = P; g.fillStyle = P.dark; ink(g, P, .8);
    g.beginPath(); g.ellipse(x, hy + .5, 12, 10.6, 0, 0, Math.PI); g.fill(); g.stroke();
  }
  // Mảng tóc dài buông sau lưng tới hông. w = độ xoè hai bên, wave = gợn sóng ở đuôi
  function longBack(g, P, w = 1, wave = 0) {
    const {x, hy, hipY} = P; g.fillStyle = P.dark; ink(g, P, .8);
    g.beginPath(); g.moveTo(x - 11 * w, hy - 3);
    g.bezierCurveTo(x - 14.5 * w, hy + 9, x - 12.5 * w, hipY - 3, x - 8.5 * w, hipY);
    if (wave) {                                       // đuôi tóc gợn sóng
      for (let k = 0; k < 4; k++) { const a = x - 8.5 * w + (k + 1) * 17 * w / 4; g.quadraticCurveTo(a - 2 * w, hipY + (k % 2 ? -wave : wave), a, hipY); }
    } else {
      g.quadraticCurveTo(x - 4, hipY - 2.4, x, hipY - .6); g.quadraticCurveTo(x + 4, hipY - 2.4, x + 8.5 * w, hipY);
    }
    g.bezierCurveTo(x + 12.5 * w, hipY - 3, x + 14.5 * w, hy + 9, x + 11 * w, hy - 3); g.closePath(); g.fill(); g.stroke();
  }
  // Vòm tóc + 2 lọn mai + mái răng cưa. side = lọn mai dài xuống bao nhiêu, tips = mũi mái [x, y] từ phải sang trái
  const TIPS_SOFT = [[6.6, -.8], [3.6, -.1], [.4, -1.4], [-2.8, -.2], [-6, -1], [-9.6, -2.2]];
  const TIPS_MESSY = [[6.4, -1.4], [3.2, -.2], [0, -1.8], [-3.2, -.4], [-6.4, -1.6], [-9.6, -2.2]];
  function dome(g, P, {side = 4, tips = TIPS_SOFT, depth = 5.6} = {}) {
    const {x, hy} = P; g.fillStyle = P.c; ink(g, P);
    g.beginPath(); g.moveTo(x - 11.8, hy + side);
    g.bezierCurveTo(x - 13.6, hy - 8.8, x - 7.4, hy - 13.6, x, hy - 13.4);
    g.bezierCurveTo(x + 7.4, hy - 13.6, x + 13.6, hy - 8.8, x + 11.8, hy + side);
    g.quadraticCurveTo(x + 10.6, hy, x + 9.6, hy - 2.2);
    let px = 9.6;
    for (const [tx, ty] of tips) { g.quadraticCurveTo(x + (px + tx) / 2, hy - depth, x + tx, hy + ty); px = tx; }
    g.quadraticCurveTo(x - 10.6, hy, x - 11.8, hy + side);
    g.closePath(); g.fill(); g.stroke();
    g.fillStyle = P.sh; g.globalAlpha = .55;                                       // bóng mềm bên phải
    g.beginPath(); g.moveTo(x + 11.8, hy + side); g.quadraticCurveTo(x + 13, hy - 6, x + 6, hy - 12); g.quadraticCurveTo(x + 10, hy - 6, x + 9.6, hy - 2.2); g.closePath(); g.fill();
    g.globalAlpha = 1;
  }
  // Vòng sáng anime trên tóc (dùng màu hl của thuốc nhuộm)
  function shine(g, P, r = 9.4, dy = -2.5) {
    const {x, hy} = P;
    g.strokeStyle = P.hl; g.lineWidth = 1.5; g.lineCap = "round";
    g.beginPath(); g.arc(x, hy + dy, r, Math.PI * 1.16, Math.PI * 1.38); g.stroke();
    g.beginPath(); g.arc(x, hy + dy, r, Math.PI * 1.5, Math.PI * 1.62); g.stroke();
    g.fillStyle = "rgba(255,255,255,.7)"; g.beginPath(); g.arc(x - 6.3, hy - 9.6, .7, 0, 7); g.fill();
  }
  // Sợi tóc vểnh trên đỉnh
  function strand(g, P) {
    const {x, hy} = P; g.strokeStyle = P.c; g.lineWidth = 1.3;
    g.beginPath(); g.moveTo(x + .5, hy - 13); g.quadraticCurveTo(x + 2, hy - 17.5, x + 5.2, hy - 15.6); g.stroke();
  }
  // Nhìn từ sau: cả đầu phủ tóc + đường rẽ tóc + vệt sáng
  function viewBase(g, P) {
    const {x, hy} = P; g.fillStyle = P.c; ink(g, P);
    g.beginPath(); g.ellipse(x, hy - .6, 12, 11.4, 0, 0, 7); g.fill(); g.stroke();
    g.strokeStyle = tone(P.c, -.2); g.lineWidth = .7;
    for (const dx of [-4, 0, 4]) { g.beginPath(); g.moveTo(x + dx * .4, hy - 9); g.quadraticCurveTo(x + dx, hy, x + dx * 1.3, hy + 9); g.stroke(); }
    g.strokeStyle = P.hl; g.lineWidth = 1.4; g.beginPath(); g.arc(x, hy - 1, 9.5, Math.PI * 1.2, Math.PI * 1.45); g.stroke();
  }
  function viewLong(g, P) {
    const {x, hy, hipY} = P; g.fillStyle = P.c; ink(g, P);
    g.beginPath(); g.moveTo(x - 11.5, hy); g.bezierCurveTo(x - 13.5, hy + 10, x - 11, hipY - 2, x - 7, hipY); g.lineTo(x + 7, hipY);
    g.bezierCurveTo(x + 11, hipY - 2, x + 13.5, hy + 10, x + 11.5, hy); g.closePath(); g.fill(); g.stroke();
  }
  function buns(g, P, dx = 9.4, dy = -9.6, r = 4.4) {           // 2 búi tròn
    const {x, hy} = P;
    for (const s of [-1, 1]) {
      g.fillStyle = P.c; ink(g, P); g.beginPath(); g.arc(x + s * dx, hy + dy, r, 0, 7); g.fill(); g.stroke();
      g.fillStyle = P.hl; g.beginPath(); g.arc(x + s * dx - 1.3, hy + dy - 1.4, r * .27, 0, 7); g.fill();
    }
  }
  function spikes(g, P, list) {                                 // các mũi tóc nhọn [dx, cao, rộng]
    const {x, hy} = P; g.fillStyle = P.c; ink(g, P); g.beginPath();
    for (const [dx, h, w] of list) {
      g.moveTo(x + dx - w, hy - 10.4 + Math.abs(dx) * .2); g.lineTo(x + dx + .8, hy - 12 - h); g.lineTo(x + dx + w, hy - 10.4 + Math.abs(dx) * .2);
    }
    g.fill(); g.stroke();
  }
  const TIPS_HIGH = [[6.6, -1.2], [3.6, -1.0], [.4, -1.5], [-2.8, -1.0], [-6, -1.2], [-9.6, -2.2]];
  function wavyBack(g, P, fillCol) {
    const {x, hy, hipY} = P; g.fillStyle = fillCol; ink(g, P, .8);
    g.beginPath(); g.moveTo(x - 11, hy - 3);
    g.bezierCurveTo(x - 15.5, hy + 4, x - 12, hy + 9, x - 15.5, hy + 14);
    g.bezierCurveTo(x - 16.5, hy + 18, x - 12.5, hipY - 2, x - 9, hipY);
    for (let k = 0; k < 4; k++) {
      const a = x - 9 + (k + 1) * 18 / 4;
      g.quadraticCurveTo(a - 2.2, hipY + (k % 2 ? -2.2 : 2.2), a, hipY);
    }
    g.bezierCurveTo(x + 12.5, hipY - 2, x + 16.5, hy + 18, x + 15.5, hy + 14);
    g.bezierCurveTo(x + 12, hy + 9, x + 15.5, hy + 4, x + 11, hy - 3);
    g.closePath(); g.fill(); g.stroke();
  }
  function topBun(g, P) {
    const {x, hy} = P;
    g.fillStyle = P.c; ink(g, P);
    g.beginPath(); g.arc(x, hy - 14.8, 5.2, 0, 7); g.fill(); g.stroke();
    g.strokeStyle = P.hl; g.lineWidth = 1.3; g.lineCap = "round";
    g.beginPath(); g.arc(x, hy - 14.8, 3.2, Math.PI * 1.15, Math.PI * 1.6); g.stroke();
    g.fillStyle = tone(P.c, -.35); ink(g, P, .7);
    g.beginPath(); g.ellipse(x, hy - 11.2, 3.2, 1.4, 0, 0, 7); g.fill(); g.stroke();
  }
  function braidSide(g, P) {
    const {x, hy} = P;
    const nodes = [[-11.5, 5.5, 4.0], [-12.8, 11.2, 3.7], [-13.8, 16.5, 3.4]];
    for (const [nx, ny, nr] of nodes) {
      g.fillStyle = P.c; ink(g, P);
      g.beginPath(); g.arc(x + nx, hy + ny, nr, 0, 7); g.fill(); g.stroke();
      g.strokeStyle = tone(P.c, -.25); g.lineWidth = .7;
      g.beginPath(); g.arc(x + nx, hy + ny, nr * .6, Math.PI * .8, Math.PI * 1.8); g.stroke();
      g.fillStyle = P.hl; g.beginPath(); g.arc(x + nx - nr * .3, hy + ny - nr * .3, nr * .28, 0, 7); g.fill();
    }
    g.fillStyle = tone(P.c, -.35); ink(g, P, .7);
    g.beginPath(); g.ellipse(x - 14, hy + 20.2, 1.6, 1, 0, 0, 7); g.fill(); g.stroke();
    g.fillStyle = P.c; ink(g, P, .7);
    g.beginPath(); g.moveTo(x - 14, hy + 21.2); g.lineTo(x - 15.2, hy + 23.8); g.lineTo(x - 12.8, hy + 23.8); g.closePath(); g.fill(); g.stroke();
  }
  const CURLYB_OUTER = [
    [-11.5, 2, 3.4], [-11.8, -3.5, 3.5], [-9, -8.5, 3.6], [-4.5, -12.5, 3.6], [0, -13.2, 3.6],
    [4.5, -12.5, 3.6], [9, -8.5, 3.6], [11.8, -3.5, 3.5], [11.5, 2, 3.4],
  ];
  const CURLYB_BANGS = [
    [-7.2, -3.4, 2.2], [-3.6, -3.8, 2.3], [0, -4.0, 2.4], [3.6, -3.8, 2.3], [7.2, -3.4, 2.2],
  ];
  const CURLY_OUTER = [
    [-13.5, 3.5, 4.4], [-15.2, -2, 4.8], [-14.5, -8, 5], [-10, -13, 5.2], [-4, -15.2, 5.2],
    [4, -15.2, 5.2], [10, -13, 5.2], [14.5, -8, 5], [15.2, -2, 4.8], [13.5, 3.5, 4.4],
  ];
  const CURLY_BANGS = [
    [-5.5, -4.5, 3.2], [0, -5.0, 3.4], [5.5, -4.5, 3.2],
  ];

  // ---------- 16 kiểu tóc ----------
  // Mặc định của mọi kiểu (kiểu nào chưa khai báo lớp nào thì dùng lớp này)
  const BASE = {
    back: (g, P) => nape(g, P),
    front: (g, P) => { dome(g, P, {side: P.male ? 1.8 : 4, tips: P.male ? TIPS_MESSY : TIPS_SOFT, depth: P.male ? 6.8 : 5.6}); shine(g, P); },
    view: (g, P) => viewBase(g, P),
  };
  const STYLES = {
    short: {                                                     // Ngắn gọn (kiểu mặc định)
      front: (g, P) => { BASE.front(g, P); strand(g, P); },
    },
    long: {                                                      // Dài thẳng
      back: (g, P) => longBack(g, P),
      front: (g, P) => { dome(g, P, {side: 8.5}); shine(g, P); strand(g, P); },
      view: (g, P) => { viewLong(g, P); viewBase(g, P); },
    },
    twinbun: {                                                   // Hai búi
      front: (g, P) => { buns(g, P); BASE.front(g, P); },
      view: (g, P) => { buns(g, P); viewBase(g, P); },
    },
    spiky: {                                                     // Tóc nhọn
      front: (g, P) => { spikes(g, P, [[-8, 4, 3.2], [-4, 6.5, 3.4], [.5, 7.5, 3.4], [5, 6, 3.2], [8.6, 3.5, 3]]); dome(g, P, {side: P.male ? 1.8 : 4, tips: TIPS_MESSY, depth: 6.8}); shine(g, P); },
      view: (g, P) => { viewBase(g, P); spikes(g, P, [[-6, 5, 3], [-1, 6, 3.2], [4, 5, 3.2]]); },
    },
    bob: {                                                       // Bob (tóc ngang cằm ôm mặt)
      back: (g, P) => {
        nape(g, P);
        const {x, hy} = P; g.fillStyle = P.dark; ink(g, P, .8);
        g.beginPath(); g.moveTo(x - 12.5, hy);
        g.bezierCurveTo(x - 14.5, hy + 4, x - 13.5, hy + 8.5, x - 9.5, hy + 9.5);
        g.quadraticCurveTo(x, hy + 10.5, x + 9.5, hy + 9.5);
        g.bezierCurveTo(x + 13.5, hy + 8.5, x + 14.5, hy + 4, x + 12.5, hy);
        g.closePath(); g.fill(); g.stroke();
      },
      front: (g, P) => {
        const {x, hy} = P; g.fillStyle = P.c; ink(g, P);
        g.beginPath(); g.moveTo(x - 13.5, hy + 8.5);
        g.bezierCurveTo(x - 14.2, hy - 4, x - 7.4, hy - 13.6, x, hy - 13.4);
        g.bezierCurveTo(x + 7.4, hy - 13.6, x + 14.2, hy - 4, x + 13.5, hy + 8.5);
        g.quadraticCurveTo(x + 11.5, hy + 8, x + 9.6, hy - 2.2);
        let px = 9.6;
        for (const [tx, ty] of TIPS_HIGH) { g.quadraticCurveTo(x + (px + tx) / 2, hy - 5.6, x + tx, hy + ty); px = tx; }
        g.quadraticCurveTo(x - 11.5, hy + 8, x - 13.5, hy + 8.5);
        g.closePath(); g.fill(); g.stroke();
        shine(g, P);
      },
      view: (g, P) => {
        const {x, hy} = P; g.fillStyle = P.c; ink(g, P);
        g.beginPath(); g.moveTo(x - 13.5, hy + 8.5);
        g.bezierCurveTo(x - 14.2, hy - 4, x - 7.4, hy - 13.6, x, hy - 13.4);
        g.bezierCurveTo(x + 7.4, hy - 13.6, x + 14.2, hy - 4, x + 13.5, hy + 8.5);
        g.quadraticCurveTo(x + 11.5, hy + 9.8, x + 8, hy + 10.2);
        g.quadraticCurveTo(x, hy + 10.8, x - 8, hy + 10.2);
        g.quadraticCurveTo(x - 11.5, hy + 9.8, x - 13.5, hy + 8.5);
        g.closePath(); g.fill(); g.stroke();
        g.strokeStyle = tone(P.c, -.2); g.lineWidth = .7;
        for (const dx of [-4, 0, 4]) { g.beginPath(); g.moveTo(x + dx * .4, hy - 9); g.quadraticCurveTo(x + dx, hy, x + dx * 1.3, hy + 8.5); g.stroke(); }
        shine(g, P);
      },
    },
    side: {                                                      // Rẽ ngôi (mái rẽ lệch một bên)
      front: (g, P) => {
        const {x, hy} = P; g.fillStyle = P.c; ink(g, P);
        g.beginPath(); g.moveTo(x - 11.8, hy + 2);
        g.bezierCurveTo(x - 13.6, hy - 8.8, x - 7.4, hy - 13.6, x, hy - 13.4);
        g.bezierCurveTo(x + 7.4, hy - 13.6, x + 13.6, hy - 8.8, x + 11.8, hy + 2);
        g.quadraticCurveTo(x + 10.6, hy, x + 9.6, hy - 1.5);
        g.quadraticCurveTo(x + 3.5, hy - 3.2, x - 3.5, hy - 6.5);
        g.quadraticCurveTo(x - 7, hy - 3.2, x - 9.6, hy - 1.5);
        g.quadraticCurveTo(x - 10.6, hy, x - 11.8, hy + 2);
        g.closePath(); g.fill(); g.stroke();
        g.strokeStyle = P.line; g.lineWidth = .7;
        g.beginPath(); g.moveTo(x - 3.5, hy - 6.5); g.quadraticCurveTo(x - 2.5, hy - 10.5, x - 1.5, hy - 13.4); g.stroke();
        shine(g, P);
      },
      view: (g, P) => {
        const {x, hy} = P; viewBase(g, P);
        g.strokeStyle = P.line; g.lineWidth = .75;
        g.beginPath(); g.moveTo(x - 2, hy - 12); g.quadraticCurveTo(x - 3, hy - 4, x - 2, hy + 8); g.stroke();
      },
    },
    pony: {                                                      // Đuôi ngựa (đuôi buộc sau lệch phải buông xuống)
      back: (g, P) => {
        nape(g, P);
        const {x, hy} = P;
        g.fillStyle = P.c; ink(g, P);
        g.beginPath();
        g.moveTo(x + 6, hy - 4);
        g.bezierCurveTo(x + 13, hy - 6, x + 18.8, hy - 1, x + 18.2, hy + 6);
        g.bezierCurveTo(x + 17.5, hy + 10.5, x + 15.5, hy + 13.5, x + 12.5, hy + 15);
        g.quadraticCurveTo(x + 11.5, hy + 9.5, x + 7, hy);
        g.closePath(); g.fill(); g.stroke();
        g.strokeStyle = P.hl; g.lineWidth = 1.3; g.lineCap = "round";
        g.beginPath(); g.moveTo(x + 10, hy - 4.5); g.quadraticCurveTo(x + 17.5, hy + 1, x + 14.5, hy + 10); g.stroke();
      },
      front: (g, P) => { dome(g, P, {tips: TIPS_HIGH}); shine(g, P); strand(g, P); },
      view: (g, P) => {
        const {x, hy} = P; viewBase(g, P);
        g.fillStyle = P.c; ink(g, P);
        g.beginPath();
        g.moveTo(x + 6, hy - 4);
        g.bezierCurveTo(x + 13, hy - 6, x + 18.8, hy - 1, x + 18.2, hy + 6);
        g.bezierCurveTo(x + 17.5, hy + 10.5, x + 15.5, hy + 13.5, x + 12.5, hy + 15);
        g.quadraticCurveTo(x + 11.5, hy + 9.5, x + 7, hy);
        g.closePath(); g.fill(); g.stroke();
        g.fillStyle = tone(P.c, -.35); ink(g, P, .7);
        g.beginPath(); g.ellipse(x + 6.5, hy - 3.5, 2, 2.8, 0.4, 0, 7); g.fill(); g.stroke();
        g.strokeStyle = P.hl; g.lineWidth = 1.3; g.lineCap = "round";
        g.beginPath(); g.moveTo(x + 10, hy - 4.5); g.quadraticCurveTo(x + 17.5, hy + 1, x + 14.5, hy + 10); g.stroke();
      },
    },
    twin: {                                                      // Hai bím (2 chùm tóc buộc hai bên tai)
      back: (g, P) => {
        nape(g, P);
        const {x, hy} = P;
        for (const s of [-1, 1]) {
          g.fillStyle = P.c; ink(g, P);
          g.beginPath();
          g.ellipse(x + s * 14.8, hy + 6.2, 4.8, 5.4, s * .2, 0, 7);
          g.fill(); g.stroke();
          g.fillStyle = P.hl; g.beginPath();
          g.arc(x + s * 14.2, hy + 4.8, 1.5, 0, 7); g.fill();
        }
      },
      front: (g, P) => {
        dome(g, P, {tips: TIPS_HIGH}); shine(g, P);
        const {x, hy} = P;
        for (const s of [-1, 1]) {
          g.fillStyle = tone(P.c, -.35); ink(g, P, .7);
          g.beginPath(); g.ellipse(x + s * 12.2, hy + 2.5, 1.5, 2.2, s * .3, 0, 7); g.fill(); g.stroke();
        }
      },
      view: (g, P) => {
        const {x, hy} = P;
        for (const s of [-1, 1]) {
          g.fillStyle = P.c; ink(g, P);
          g.beginPath();
          g.ellipse(x + s * 14.8, hy + 6.2, 4.8, 5.4, s * .2, 0, 7);
          g.fill(); g.stroke();
          g.fillStyle = P.hl; g.beginPath();
          g.arc(x + s * 14.2, hy + 4.8, 1.5, 0, 7); g.fill();
        }
        viewBase(g, P);
        g.strokeStyle = tone(P.c, -.2); g.lineWidth = .7;
        for (const s of [-1, 1]) {
          g.beginPath(); g.moveTo(x + s * 3, hy - 6); g.quadraticCurveTo(x + s * 7, hy - 2, x + s * 12, hy + 2.5); g.stroke();
          g.beginPath(); g.moveTo(x + s * 4, hy + 6); g.quadraticCurveTo(x + s * 8, hy + 4, x + s * 12, hy + 2.5); g.stroke();
          g.fillStyle = tone(P.c, -.35); ink(g, P, .7);
          g.beginPath(); g.ellipse(x + s * 12.2, hy + 2.5, 1.5, 2.2, s * .3, 0, 7); g.fill(); g.stroke();
        }
      },
    },
    wavy: {                                                      // Dài gợn sóng (dài tới hông, đuôi lượn sóng)
      back: (g, P) => wavyBack(g, P, P.dark),
      front: (g, P) => {
        const {x, hy} = P;
        for (const s of [-1, 1]) {
          g.fillStyle = P.c; ink(g, P);
          g.beginPath();
          g.moveTo(x + s * 10, hy + 2);
          g.bezierCurveTo(x + s * 14.5, hy + 6, x + s * 11, hy + 10, x + s * 14, hy + 14);
          g.quadraticCurveTo(x + s * 12.5, hy + 17.5, x + s * 9.5, hy + 16.5);
          g.bezierCurveTo(x + s * 8.5, hy + 12, x + s * 11.5, hy + 8, x + s * 8.2, hy + 3);
          g.closePath(); g.fill(); g.stroke();
        }
        dome(g, P, {side: 6, tips: TIPS_HIGH}); shine(g, P); strand(g, P);
      },
      view: (g, P) => {
        wavyBack(g, P, P.c); viewBase(g, P);
        const {x, hy, hipY} = P;
        g.strokeStyle = tone(P.c, -.18); g.lineWidth = .7;
        for (const dx of [-4, 0, 4]) {
          g.beginPath();
          g.moveTo(x + dx * .6, hy + 6);
          g.quadraticCurveTo(x + dx * 1.5, hy + 13, x + dx, hipY - 2);
          g.stroke();
        }
      },
    },
    bun: {                                                       // Búi cao (1 búi tròn trên đỉnh)
      front: (g, P) => { dome(g, P, {tips: TIPS_HIGH}); shine(g, P); topBun(g, P); },
      view: (g, P) => {
        viewBase(g, P);
        const {x, hy} = P;
        g.strokeStyle = tone(P.c, -.2); g.lineWidth = .7;
        for (const dx of [-5, 0, 5]) {
          g.beginPath(); g.moveTo(x + dx, hy + 6); g.quadraticCurveTo(x + dx * .5, hy - 4, x, hy - 11); g.stroke();
        }
        topBun(g, P);
      },
    },
    mushroom: {                                                  // Tóc nấm (mái bằng tròn như cái nấm)
      back: (g, P) => {
        const {x, hy} = P; g.fillStyle = P.dark; ink(g, P, .8);
        g.beginPath(); g.ellipse(x, hy + 1.2, 12.2, 8.5, 0, 0, Math.PI); g.fill(); g.stroke();
      },
      front: (g, P) => {
        const {x, hy} = P; g.fillStyle = P.c; ink(g, P);
        g.beginPath();
        g.moveTo(x - 12.8, hy + 5);
        g.bezierCurveTo(x - 14.2, hy - 8.8, x - 7.4, hy - 13.8, x, hy - 13.6);
        g.bezierCurveTo(x + 7.4, hy - 13.8, x + 14.2, hy - 8.8, x + 12.8, hy + 5);
        g.quadraticCurveTo(x + 11.5, hy + 2, x + 9, hy - 1.3);
        g.quadraticCurveTo(x, hy - 1.8, x - 9, hy - 1.3);
        g.quadraticCurveTo(x - 11.5, hy + 2, x - 12.8, hy + 5);
        g.closePath(); g.fill(); g.stroke();
        shine(g, P);
      },
      view: (g, P) => {
        const {x, hy} = P; g.fillStyle = P.c; ink(g, P);
        g.beginPath();
        g.moveTo(x - 12.8, hy + 5);
        g.bezierCurveTo(x - 14.2, hy - 8.8, x - 7.4, hy - 13.8, x, hy - 13.6);
        g.bezierCurveTo(x + 7.4, hy - 13.8, x + 14.2, hy - 8.8, x + 12.8, hy + 5);
        g.quadraticCurveTo(x, hy + 7.2, x - 12.8, hy + 5);
        g.closePath(); g.fill(); g.stroke();
        g.strokeStyle = tone(P.c, -.2); g.lineWidth = .7;
        for (const dx of [-4, 0, 4]) { g.beginPath(); g.moveTo(x + dx * .4, hy - 9); g.quadraticCurveTo(x + dx, hy - 1, x + dx * 1.2, hy + 4); g.stroke(); }
        shine(g, P);
      },
    },
    curlyb: {                                                    // Xoăn ngắn (vòm tóc gồm nhiều lọn tròn nhỏ)
      front: (g, P) => {
        const {x, hy} = P;
        g.fillStyle = P.c; g.beginPath(); g.ellipse(x, hy - 3.5, 11.5, 10, 0, 0, 7); g.fill();
        for (const [dx, dy, r] of CURLYB_OUTER) {
          g.fillStyle = P.c; ink(g, P, .8);
          g.beginPath(); g.arc(x + dx, hy + dy, r, 0, 7); g.fill(); g.stroke();
          g.fillStyle = P.hl; g.beginPath(); g.arc(x + dx - r * .3, hy + dy - r * .3, r * .28, 0, 7); g.fill();
        }
        for (const [dx, dy, r] of CURLYB_BANGS) {
          g.fillStyle = P.c; ink(g, P, .8);
          g.beginPath(); g.arc(x + dx, hy + dy, r, 0, 7); g.fill(); g.stroke();
          g.fillStyle = P.hl; g.beginPath(); g.arc(x + dx - r * .25, hy + dy - r * .25, r * .28, 0, 7); g.fill();
        }
      },
      view: (g, P) => {
        const {x, hy} = P; viewBase(g, P);
        for (const [dx, dy, r] of CURLYB_OUTER) {
          g.fillStyle = P.c; ink(g, P, .8);
          g.beginPath(); g.arc(x + dx, hy + dy, r, 0, 7); g.fill(); g.stroke();
          g.fillStyle = P.hl; g.beginPath(); g.arc(x + dx - r * .3, hy + dy - r * .3, r * .28, 0, 7); g.fill();
        }
        for (const [dx, dy] of [[-4, -6], [4, -6], [0, -2], [-5, 3], [0, 5], [5, 3]]) {
          g.fillStyle = P.c; ink(g, P, .8);
          g.beginPath(); g.arc(x + dx, hy + dy, 2.7, 0, 7); g.fill(); g.stroke();
        }
      },
    },
    braid: {                                                     // Tóc tết (bím tết thả một bên vai, các đốt tròn)
      front: (g, P) => { dome(g, P, {tips: TIPS_HIGH}); shine(g, P); braidSide(g, P); },
      view: (g, P) => {
        viewBase(g, P);
        const {x, hy} = P;
        g.strokeStyle = tone(P.c, -.2); g.lineWidth = .7;
        for (const dy of [-4, 0, 4]) {
          g.beginPath(); g.moveTo(x + 4, hy + dy * .8); g.quadraticCurveTo(x - 4, hy + 2 + dy * .5, x - 11, hy + 5); g.stroke();
        }
        braidSide(g, P);
      },
    },
    slick: {                                                     // Vuốt ngược (tóc vuốt ra sau, lộ trán, có chóp nhỏ phía sau)
      front: (g, P) => {
        const {x, hy} = P; g.fillStyle = P.c; ink(g, P);
        g.beginPath();
        g.moveTo(x - 11.2, hy + 1.5);
        g.bezierCurveTo(x - 13.5, hy - 8.8, x - 7, hy - 13.6, x - 1.5, hy - 13.5);
        g.lineTo(x + 1.5, hy - 16.8);
        g.lineTo(x + 4, hy - 13.5);
        g.bezierCurveTo(x + 7.5, hy - 13.6, x + 13.5, hy - 8.8, x + 11.2, hy + 1.5);
        g.quadraticCurveTo(x + 10.5, hy, x + 9.5, hy - 1.2);
        g.quadraticCurveTo(x, hy - 5.8, x - 9.5, hy - 1.2);
        g.quadraticCurveTo(x - 10.5, hy, x - 11.2, hy + 1.5);
        g.closePath(); g.fill(); g.stroke();
        g.strokeStyle = tone(P.c, -.2); g.lineWidth = .7;
        for (const dx of [-5, -2, 2, 5]) {
          g.beginPath(); g.moveTo(x + dx, hy - 5); g.quadraticCurveTo(x + dx * .8, hy - 9, x + dx * .5, hy - 13); g.stroke();
        }
        shine(g, P, 9, -4);
      },
      view: (g, P) => {
        const {x, hy} = P; viewBase(g, P);
        g.fillStyle = P.c; ink(g, P);
        g.beginPath();
        g.moveTo(x - 1.5, hy - 13.2); g.lineTo(x + 1.5, hy - 16.8); g.lineTo(x + 4, hy - 13.2);
        g.closePath(); g.fill(); g.stroke();
      },
    },
    curly: {                                                     // Xoăn bồng (quả bông nhiều lọn tròn to phủ quanh đầu)
      back: (g, P) => {
        nape(g, P);
        const {x, hy} = P;
        for (const [dx, dy, r] of CURLY_OUTER) {
          g.fillStyle = P.dark; ink(g, P, .8);
          g.beginPath(); g.arc(x + dx, hy + dy, r, 0, 7); g.fill(); g.stroke();
        }
      },
      front: (g, P) => {
        const {x, hy} = P;
        g.fillStyle = P.c; g.beginPath(); g.ellipse(x, hy - 3.5, 12, 10.5, 0, 0, 7); g.fill();
        for (const [dx, dy, r] of CURLY_OUTER) {
          g.fillStyle = P.c; ink(g, P, .8);
          g.beginPath(); g.arc(x + dx, hy + dy, r, 0, 7); g.fill(); g.stroke();
          g.fillStyle = P.hl; g.beginPath(); g.arc(x + dx - r * .3, hy + dy - r * .3, r * .28, 0, 7); g.fill();
          g.strokeStyle = tone(P.c, -.2); g.lineWidth = .7;
          g.beginPath(); g.arc(x + dx, hy + dy, r * .55, 0, Math.PI * 1.2); g.stroke();
        }
        for (const [dx, dy, r] of CURLY_BANGS) {
          g.fillStyle = P.c; ink(g, P, .8);
          g.beginPath(); g.arc(x + dx, hy + dy, r, 0, 7); g.fill(); g.stroke();
          g.fillStyle = P.hl; g.beginPath(); g.arc(x + dx - r * .3, hy + dy - r * .3, r * .28, 0, 7); g.fill();
          g.strokeStyle = tone(P.c, -.2); g.lineWidth = .7;
          g.beginPath(); g.arc(x + dx, hy + dy, r * .55, 0, Math.PI * 1.2); g.stroke();
        }
      },
      view: (g, P) => {
        const {x, hy} = P; viewBase(g, P);
        for (const [dx, dy, r] of CURLY_OUTER) {
          g.fillStyle = P.c; ink(g, P, .8);
          g.beginPath(); g.arc(x + dx, hy + dy, r, 0, 7); g.fill(); g.stroke();
          g.fillStyle = P.hl; g.beginPath(); g.arc(x + dx - r * .3, hy + dy - r * .3, r * .28, 0, 7); g.fill();
          g.strokeStyle = tone(P.c, -.2); g.lineWidth = .7;
          g.beginPath(); g.arc(x + dx, hy + dy, r * .55, 0, Math.PI * 1.2); g.stroke();
        }
        for (const [dx, dy] of [[-4, -6], [4, -6], [0, 0]]) {
          g.fillStyle = P.c; ink(g, P, .8);
          g.beginPath(); g.arc(x + dx, hy + dy, 4.2, 0, 7); g.fill(); g.stroke();
          g.strokeStyle = tone(P.c, -.2); g.lineWidth = .7;
          g.beginPath(); g.arc(x + dx, hy + dy, 2.2, 0, Math.PI * 1.2); g.stroke();
        }
      },
    },
    mohawk: {                                                    // Mohican (một dải tóc dựng giữa đầu, hai bên cạo ngắn)
      front: (g, P) => {
        const {x, hy} = P;
        g.fillStyle = P.sh; g.globalAlpha = .28;
        g.beginPath();
        g.ellipse(x - 7.5, hy - 2, 4, 6, -.2, 0, 7);
        g.ellipse(x + 7.5, hy - 2, 4, 6, .2, 0, 7);
        g.fill();
        g.globalAlpha = 1;
        g.fillStyle = P.c; ink(g, P);
        g.beginPath();
        g.moveTo(x, hy - 4.5);
        g.quadraticCurveTo(x - 3.8, hy - 8, x - 3.5, hy - 14);
        g.lineTo(x - 2.5, hy - 16.5);
        g.lineTo(x - 1, hy - 17.5);
        g.lineTo(x, hy - 20);
        g.lineTo(x + 1.2, hy - 17.5);
        g.lineTo(x + 2.5, hy - 16.5);
        g.lineTo(x + 3.5, hy - 14);
        g.quadraticCurveTo(x + 3.8, hy - 8, x, hy - 4.5);
        g.closePath(); g.fill(); g.stroke();
        g.strokeStyle = P.hl; g.lineWidth = 1.3; g.lineCap = "round";
        g.beginPath(); g.moveTo(x, hy - 6); g.lineTo(x, hy - 19); g.stroke();
      },
      view: (g, P) => {
        const {x, hy} = P;
        g.fillStyle = tone(P.c, .2); g.globalAlpha = .18;
        g.beginPath(); g.ellipse(x, hy - .6, 12, 11.4, 0, 0, 7); g.fill();
        g.globalAlpha = 1;
        g.fillStyle = P.sh; g.globalAlpha = .28;
        g.beginPath();
        g.ellipse(x - 7.5, hy - 2, 4, 6, -.2, 0, 7);
        g.ellipse(x + 7.5, hy - 2, 4, 6, .2, 0, 7);
        g.fill();
        g.globalAlpha = 1;
        g.fillStyle = P.c; ink(g, P);
        g.beginPath();
        g.moveTo(x - 3.5, hy + 7);
        g.lineTo(x - 3.5, hy - 14);
        g.lineTo(x - 2.5, hy - 16.5);
        g.lineTo(x - 1, hy - 17.5);
        g.lineTo(x, hy - 20);
        g.lineTo(x + 1.2, hy - 17.5);
        g.lineTo(x + 2.5, hy - 16.5);
        g.lineTo(x + 3.5, hy - 14);
        g.lineTo(x + 3.5, hy + 7);
        g.closePath(); g.fill(); g.stroke();
        g.strokeStyle = P.hl; g.lineWidth = 1.3; g.lineCap = "round";
        g.beginPath(); g.moveTo(x, hy + 6); g.lineTo(x, hy - 19); g.stroke();
      },
    },
  };

  function draw(layer, g, id, colorId, x, hy, hipY, male) {
    const s = STYLES[style(id)] || {}, f = s[layer] || BASE[layer];
    g.save(); try { f(g, params(colorId, x, hy, hipY, male)); } finally { g.restore(); }
  }
  return {
    STY, DYE, style, dye, tone,
    back: (g, id, col, x, hy, hipY, male) => draw("back", g, id, col, x, hy, hipY, male),
    front: (g, id, col, x, hy, hipY, male) => draw("front", g, id, col, x, hy, hipY, male),
    view: (g, id, col, x, hy, hipY, male) => draw("view", g, id, col, x, hy, hipY, male),
  };
})();
