// ================== THÚ CƯNG DÙNG ẢNH (Microsoft Fluent Emoji 3D, giấy phép MIT) ==================
// Ảnh ở static/pets_img/ (đã cắt sát + thu nhỏ 160px, giấy phép: static/pets_img/LICENSE-fluentui-emoji.txt).
// Nạp SAU pets.js: bé nào có ảnh thì vẽ bằng ảnh + cử động bằng code (thở, nhún khi đi, nằm ngủ),
// bé nào chưa có ảnh thì vẫn dùng hình vẽ bằng code trong pets.js.
"use strict";

(() => {
  if (typeof Pets === "undefined") return;
  // id thú cưng → tên ảnh. Ảnh gốc đều quay mặt sang TRÁI. h = chiều cao bé (đơn vị thế giới; người cao 46).
  const MAP = {
    cat: {img: "cat", h: 22}, cat_black: {img: "black_cat", h: 22}, dog: {img: "dog", h: 23}, dog_poodle: {img: "poodle", h: 24},
    bunny: {img: "rabbit", h: 21}, squirrel: {img: "chipmunk", h: 23}, hedgehog: {img: "hedgehog", h: 16}, snake: {img: "snake", h: 22},
    turtle: {img: "turtle", h: 15}, duck: {img: "duck", h: 20}, hamster: {img: "hamster", h: 17}, fox: {img: "fox", h: 20},
    panda: {img: "panda", h: 21},
    pig: {img: "pig", h: 19}, tiger: {img: "tiger", h: 21}, penguin: {img: "penguin", h: 22}, parrot: {img: "parrot", h: 22},
    skunk: {img: "skunk", h: 19}, dragon: {img: "dragon", h: 26},
  };
  const IMG = {};
  for (const [id, m] of Object.entries(MAP)) {
    const im = new Image();
    im.src = `/static/pets_img/${m.img}.png`;
    IMG[id] = im;
  }
  const ready = id => IMG[id] && IMG[id].complete && IMG[id].naturalWidth > 0;
  const base = {has: Pets.has, draw: Pets.draw, icon: Pets.icon};

  function drawSprite(c, id, o, t, seed, isRoom) {
    const im = IMG[id], m = MAP[id], h = m.h, w = h * im.naturalWidth / im.naturalHeight;
    const sd = (seed || 0) * 1.7, jt = t - (o.jumpAt ?? -9);
    const jump = jt >= 0 && jt < .35 ? Math.sin(jt / .35 * Math.PI) * 7 : 0;
    c.save();
    c.translate(o.x, o.y);
    c.fillStyle = "rgba(0,0,0,.22)";                                      // bóng dưới chân
    c.beginPath(); c.ellipse(0, 0, w * .38, 2.6, 0, 0, Math.PI * 2); c.fill();
    if (o.sleeping) {                                                     // ngủ: nằm thấp, thở chậm, chữ z bay
      const br = 1 + Math.sin(t * 1.8 + sd) * .03;
      c.save(); c.scale(o.dir === 1 ? -1 : 1, 1); c.scale(1.08, .78 * br);
      c.drawImage(im, -w / 2, -h, w, h); c.restore();
      const ph = (t * .5 + sd) % 1;
      c.globalAlpha = Math.sin(ph * Math.PI) * .8; c.fillStyle = "#5b6b9a";
      c.font = `700 ${5 + ph * 3}px Nunito, system-ui`; c.textAlign = "center";
      c.fillText("z", w * .3 + ph * 4, -h * .8 - ph * 8);
    } else {
      let dy = -jump, rot = 0, sy = 1;
      if (o.walking) { const s = Math.sin(t * 11 + sd); dy -= Math.abs(s) * 2.4; rot = s * .06; }
      else sy = 1 + Math.sin(t * 2.6 + sd) * .025;                        // thở nhẹ khi đứng yên
      c.translate(0, dy); c.rotate(rot);
      c.scale(o.dir === 1 ? -1 : 1, sy);                                  // ảnh quay trái → lật khi đi sang phải
      c.drawImage(im, -w / 2, -h, w, h);
    }
    c.restore();
  }

  Pets.has = id => ready(id) || base.has(id);
  Pets.draw = (c, id, o, t, seed, isRoom) => ready(id) ? drawSprite(c, id, o, t, seed, isRoom) : base.draw(c, id, o, t, seed, isRoom);
  Pets.icon = (canvas, id, t) => {
    if (!ready(id)) return base.icon(canvas, id, t);
    const c = canvas.getContext("2d"), im = IMG[id], s = Math.min(canvas.width / im.naturalWidth, canvas.height / im.naturalHeight) * .85;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, canvas.width, canvas.height);
    c.translate(canvas.width / 2, canvas.height / 2); c.scale(-1, 1);    // nhìn sang phải giống trong game
    c.drawImage(im, -im.naturalWidth * s / 2, -im.naturalHeight * s / 2, im.naturalWidth * s, im.naturalHeight * s);
    c.setTransform(1, 0, 0, 1, 0, 0);
  };
  Pets.sprites = MAP;
  Pets.hasSprite = id => !!MAP[id];                                       // bé đã có ảnh đẹp (bán ở tiệm)
})();
