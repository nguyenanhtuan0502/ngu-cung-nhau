// =============================================================================
// static/weather.js - Hệ thống thời tiết đồng bộ cho trò chơi
// =============================================================================

const Weather = (() => {
  'use strict';

  // ---------------------------------------------------------------------------
  // 1. Cấu hình & Dữ liệu thời tiết
  // ---------------------------------------------------------------------------
  const SLOT_DURATION = 1800;   // 30 phút một chu kỳ thời tiết (tính bằng giây)
  const FADE_DURATION = 40;     // Chuyển cảnh mềm mại trong 40 giây ở ranh giới slot
  const RAINBOW_DURATION = 240; // Cầu vồng xuất hiện trong 4 phút đầu của slot trời quang sau mưa

  // Thông tin hiển thị HUD & tin nhắn thông báo khi đổi thời tiết
  const WEATHER_INFO = {
    clear: {
      id: 'clear',
      emoji: '☀️',
      name: 'Trời quang',
      enterMsg: '☀️ Trời quang đãng, thời tiết thật dễ chịu và ấm áp!',
      dim: 0.0
    },
    cloudy: {
      id: 'cloudy',
      emoji: '⛅',
      name: 'Nhiều mây',
      enterMsg: '⛅ Trời nhiều mây, râm mát và có bóng mây trôi nhẹ.',
      dim: 0.08
    },
    rain: {
      id: 'rain',
      emoji: '🌧️',
      name: 'Mưa',
      enterMsg: '🌧️ Trời bắt đầu mưa rồi, nhớ trú mưa nha!',
      dim: 0.22
    },
    storm: {
      id: 'storm',
      emoji: '⛈️',
      name: 'Giông bão',
      enterMsg: '⛈️ Giông bão ập tới kèm sấm sét dữ dội, cẩn thận nhé!',
      dim: 0.38
    },
    fog: {
      id: 'fog',
      emoji: '🌫️',
      name: 'Sương mù',
      enterMsg: '🌫️ Sương mù giăng kín lối, không khí thật huyền ảo...',
      dim: 0.16
    },
    snow: {
      id: 'snow',
      emoji: '❄️',
      name: 'Tuyết',
      enterMsg: '❄️ Tuyết rơi rồi! Từng bông tuyết trắng xóa thật đẹp.',
      dim: 0.10
    },
    rainbow: {
      id: 'rainbow',
      emoji: '🌈',
      name: 'Cầu vồng',
      enterMsg: '🌈 Kìa, cầu vồng rực rỡ xuất hiện sau cơn mưa kìa!',
      dim: 0.0
    }
  };

  // ---------------------------------------------------------------------------
  // 2. Các hàm tiện ích hỗ trợ (Utility Helpers)
  // ---------------------------------------------------------------------------

  // Lấy thời gian đồng bộ toàn server (giây)
  function getNow() {
    try {
      if (typeof serverNow === 'function') {
        const sn = serverNow();
        if (typeof sn === 'number' && !isNaN(sn)) return sn;
      }
    } catch (e) {}
    return Date.now() / 1000;
  }

  // Kiểm tra mùa tuyết (chỉ xuất hiện trong mùa Giáng sinh hoặc Năm mới)
  function isSnowSeason() {
    try {
      if (typeof window !== 'undefined' && window.location && window.location.search) {
        const s = new URLSearchParams(window.location.search).get('season');
        if (s === 'xmas' || s === 'newyear') return true;
      }
      if (typeof SEASON === 'string' && (SEASON === 'xmas' || SEASON === 'newyear')) return true;
      if (typeof activeSeason === 'string' && (activeSeason === 'xmas' || activeSeason === 'newyear')) return true;
      if (typeof SEASONS === 'object' && SEASONS !== null) {
        if (SEASONS.active === 'xmas' || SEASONS.active === 'newyear') return true;
      }
      // Kiểm tra theo ngày lịch: từ 15/12 đến 15/01 hàng năm
      const d = new Date();
      const m = d.getMonth(); // 11 là tháng 12, 0 là tháng 1
      const date = d.getDate();
      if (m === 11 && date >= 15) return true;
      if (m === 0 && date <= 15) return true;
    } catch (e) {}
    return false;
  }

  // Kiểm tra ban ngày (dựa theo Life.isDay() hoặc giờ địa phương)
  function isDaytime() {
    try {
      if (typeof Life !== 'undefined' && typeof Life.isDay === 'function') {
        return !!Life.isDay();
      }
    } catch (e) {}
    const h = new Date().getHours();
    return h >= 6 && h < 18;
  }

  // Ép thời tiết qua tham số URL phục vụ kiểm thử (&weather=rain|storm|fog|snow|cloudy|clear|rainbow)
  // Đọc 1 lần lúc tải trang: sau khi vào game, đường dẫn bị viết lại (mất &weather=)
  const URL_OVERRIDE = readUrlWeatherOverride();
  function getUrlWeatherOverride() { return URL_OVERRIDE; }
  function readUrlWeatherOverride() {
    try {
      if (typeof window !== 'undefined' && window.location && window.location.search) {
        const param = new URLSearchParams(window.location.search).get('weather');
        if (param) {
          const w = param.toLowerCase().trim();
          if (['rain', 'storm', 'fog', 'snow', 'cloudy', 'clear', 'rainbow'].includes(w)) {
            return w;
          }
        }
      }
    } catch (e) {}
    return null;
  }

  // Kiểm tra chế độ tiết kiệm pin (Power.on())
  function isBatterySaver() {
    try {
      return typeof Power !== 'undefined' && Power.on && Power.on();
    } catch (e) {
      return false;
    }
  }

  // Lấy phạm vi thế giới hiển thị (có tính đến bleed() nếu có)
  function getViewBounds() {
    const w = (typeof W === 'number' && W > 0) ? W : (typeof ctx !== 'undefined' && ctx.canvas ? ctx.canvas.width : 1000);
    const h = (typeof H === 'number' && H > 0) ? H : (typeof ctx !== 'undefined' && ctx.canvas ? ctx.canvas.height : 800);
    let l = 0, r = w, t = 0, b = h;
    if (typeof bleed === 'function') {
      try {
        const bl = bleed();
        if (bl) {
          // bleed() trả về toạ độ thật của mép vùng nhìn thấy (L có thể âm), không phải khoảng lề
          l = bl.L; r = bl.R; t = Math.max(bl.T, -120); b = bl.B;
        }
      } catch (e) {}
    }
    return { l, r, t, b, w: r - l, h: b - t };
  }

  // ---------------------------------------------------------------------------
  // 3. Tính toán thời tiết đồng bộ theo khe 30 phút (Shared Weather)
  // ---------------------------------------------------------------------------

  // Hàm băm xác định số nguyên slot thành số thực [0, 1) phân bố đều
  function hashSlot(s) {
    let h = (s ^ 0x9e3779b9) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
    h = (h ^ (h >>> 16)) >>> 0;
    return (h >>> 0) / 4294967296;
  }

  // Xác định loại thời tiết gốc của một slot:
  // - quang (clear): 45% (0.00 .. 0.45)
  // - nhiều mây (cloudy): 20% (0.45 .. 0.65)
  // - mưa (rain): 18% (0.65 .. 0.83)
  // - giông bão (storm): 5% (0.83 .. 0.88)
  // - sương mù (fog): 7% (0.88 .. 0.95)
  // - tuyết (snow): 5% (0.95 .. 1.00 - chỉ trong xmas/newyear, nếu không thành clear)
  function getSlotRawWeather(slotIndex) {
    const r = hashSlot(slotIndex);
    let w = 'clear';
    if (r < 0.45) w = 'clear';
    else if (r < 0.65) w = 'cloudy';
    else if (r < 0.83) w = 'rain';
    else if (r < 0.88) w = 'storm';
    else if (r < 0.95) w = 'fog';
    else w = 'snow';

    if (w === 'snow' && !isSnowSeason()) {
      w = 'clear';
    }
    return w;
  }

  // Tính trọng số (weights: 0..1) của từng loại thời tiết tại thời điểm now
  function getCurrentWeights(now) {
    const weights = { clear: 0, cloudy: 0, rain: 0, storm: 0, fog: 0, snow: 0, rainbow: 0 };

    const override = getUrlWeatherOverride();
    if (override) {
      weights[override] = 1.0;
      return weights;
    }

    const currentSlot = Math.floor(now / SLOT_DURATION);
    const slotTime = now - (currentSlot * SLOT_DURATION); // Giây tính từ đầu slot (0..1800)

    const prevWeather = getSlotRawWeather(currentSlot - 1);
    const currWeather = getSlotRawWeather(currentSlot);

    // Điều kiện cầu vồng: slot trước mưa/bão, slot này trời quang, đang ban ngày
    const hadRainOrStorm = (prevWeather === 'rain' || prevWeather === 'storm');
    const isRainbowCandidate = hadRainOrStorm && (currWeather === 'clear') && isDaytime();

    if (isRainbowCandidate && slotTime < RAINBOW_DURATION) {
      if (slotTime < FADE_DURATION) {
        // Chuyển mượt từ mưa/bão sang cầu vồng
        const p = slotTime / FADE_DURATION;
        weights[prevWeather] = 1 - p;
        weights.rainbow = p;
      } else if (slotTime < RAINBOW_DURATION - FADE_DURATION) {
        // Cầu vồng rực rỡ nhất
        weights.rainbow = 1.0;
      } else {
        // Cầu vồng mờ dần chuyển sang trời quang đãng
        const p = (slotTime - (RAINBOW_DURATION - FADE_DURATION)) / FADE_DURATION;
        weights.rainbow = 1 - p;
        weights.clear = p;
      }
    } else {
      if (slotTime < FADE_DURATION) {
        // Chuyển mượt ở ranh giới 2 slot trong 40 giây
        const p = slotTime / FADE_DURATION;
        if (prevWeather === currWeather) {
          weights[currWeather] = 1.0;
        } else {
          weights[prevWeather] = 1 - p;
          weights[currWeather] = p;
        }
      } else {
        weights[currWeather] = 1.0;
      }
    }

    return weights;
  }

  // Tìm loại thời tiết chiếm ưu thế nhất (cho HUD và âm thanh)
  function getDominantWeather(weights) {
    let dominant = 'clear';
    let maxWeight = -1;
    for (const key in weights) {
      if (weights[key] > maxWeight) {
        maxWeight = weights[key];
        dominant = key;
      }
    }
    return dominant;
  }

  // ---------------------------------------------------------------------------
  // 4. Hệ thống âm thanh thời tiết (Web Audio API)
  // ---------------------------------------------------------------------------
  let audioContextRef = null;
  let rainSourceNode = null;
  let rainFilterNode = null;
  let rainGainNode = null;
  let nextThunderAudioTime = 0;

  // Tạo đệm tiếng ồn hồng (pink/brown noise) mô phỏng tiếng mưa rơi tự nhiên
  function createRainNoiseBuffer(actx) {
    const sampleRate = actx.sampleRate || 44100;
    const bufferSize = sampleRate * 2.5;
    const buffer = actx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.045 * white) / 1.045;
      data[i] = lastOut * 3.2;
    }
    return buffer;
  }

  function initRainAudioNodes(actx, masterGain) {
    try {
      if (!actx || !masterGain) return;
      const buffer = createRainNoiseBuffer(actx);

      rainFilterNode = actx.createBiquadFilter();
      rainFilterNode.type = 'lowpass';
      rainFilterNode.frequency.value = 800;

      rainGainNode = actx.createGain();
      rainGainNode.gain.value = 0.0001;

      rainSourceNode = actx.createBufferSource();
      rainSourceNode.buffer = buffer;
      rainSourceNode.loop = true;

      rainSourceNode.connect(rainFilterNode);
      rainFilterNode.connect(rainGainNode);
      rainGainNode.connect(masterGain);

      rainSourceNode.start(0);
      audioContextRef = actx;
    } catch (e) {
      // Bỏ qua lỗi âm thanh, không bao giờ ném ngoại lệ
    }
  }

  // Cập nhật âm thanh mưa liên tục theo trọng số thời tiết và vị trí trong nhà/ngoài trời
  function updateWeatherAudio(weights, isOut) {
    try {
      if (typeof Sound === 'undefined' || !Sound || !Sound.ctx || !Sound.master) return;
      const actx = Sound.ctx;
      if (actx.state !== 'running') return;

      if (!rainSourceNode || audioContextRef !== actx || !rainGainNode) {
        initRainAudioNodes(actx, Sound.master);
      }

      if (!rainGainNode || !rainFilterNode) return;

      const rainTotalWeight = weights.rain + weights.storm;
      if (rainTotalWeight <= 0.02) {
        rainGainNode.gain.setTargetAtTime(0.0001, actx.currentTime, 0.3);
      } else {
        const isStorm = weights.storm > weights.rain;
        const maxVol = isStorm ? (isOut ? 0.15 : 0.04) : (isOut ? 0.08 : 0.02);
        const targetVol = Math.max(0.0001, maxVol * rainTotalWeight);
        const targetFreq = isStorm ? (isOut ? 1500 : 700) : (isOut ? 950 : 500);

        rainGainNode.gain.setTargetAtTime(targetVol, actx.currentTime, 0.25);
        rainFilterNode.frequency.setTargetAtTime(targetFreq, actx.currentTime, 0.25);
      }
    } catch (e) {}
  }

  // Phát tiếng sấm rền trầm ấm, tự nhiên
  function playThunderSound(isOut) {
    try {
      if (typeof Sound === 'undefined' || !Sound || !Sound.ctx || !Sound.master) return;
      const actx = Sound.ctx;
      if (actx.state !== 'running') return;

      const dur = 2.4 + Math.random() * 1.2;
      const thunderBuf = actx.createBuffer(1, Math.floor(actx.sampleRate * dur), actx.sampleRate);
      const data = thunderBuf.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < data.length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = (b0 + 0.02 * white) / 1.02;
        b1 = (b1 + 0.02 * b0) / 1.02;
        b2 = (b2 + 0.02 * b1) / 1.02;
        data[i] = b2 * 4.6;
      }

      const src = actx.createBufferSource();
      src.buffer = thunderBuf;

      const flt = actx.createBiquadFilter();
      flt.type = 'lowpass';
      flt.frequency.value = isOut ? 220 : 110;

      const gn = actx.createGain();
      const now = actx.currentTime;
      const peak = isOut ? (0.22 + Math.random() * 0.08) : (0.06 + Math.random() * 0.03);

      gn.gain.setValueAtTime(0.001, now);
      gn.gain.linearRampToValueAtTime(peak, now + 0.06);
      gn.gain.linearRampToValueAtTime(peak * 0.65, now + 0.35);
      gn.gain.exponentialRampToValueAtTime(0.001, now + dur);

      src.connect(flt);
      flt.connect(gn);
      gn.connect(Sound.master);

      src.start(now);
      src.stop(now + dur + 0.1);
    } catch (e) {}
  }

  // ---------------------------------------------------------------------------
  // 5. Hệ thống hạt và hiệu ứng thị giác (Particle Systems & Visuals)
  // ---------------------------------------------------------------------------
  let lastTimeSeconds = 0;

  // Hạt mưa
  const MAX_RAIN_DROPS = 240;
  const rainDrops = [];
  for (let i = 0; i < MAX_RAIN_DROPS; i++) {
    rainDrops.push({
      x: 0,
      y: 0,
      len: 16,
      speed: 700,
      groundY: 0,
      alpha: 0.5
    });
  }

  // Vết gợn sóng khi giọt mưa chạm đất (Splashes / Ripples)
  const MAX_SPLASHES = 45;
  const splashes = [];
  for (let i = 0; i < MAX_SPLASHES; i++) {
    splashes.push({ active: false, x: 0, y: 0, r: 0, maxR: 12, alpha: 0.5 });
  }
  let splashHead = 0;

  function addSplash(x, y, scale) {
    const s = splashes[splashHead];
    splashHead = (splashHead + 1) % MAX_SPLASHES;
    s.active = true;
    s.x = x;
    s.y = y;
    s.r = 2;
    s.maxR = (8 + Math.random() * 6) * scale;
    s.alpha = 0.45;
  }

  // Vũng nước đọng trên mặt đất tự lớn dần khi mưa và bay hơi khi tạnh
  const puddles = [
    { rxRatio: 0.22, ryRatio: 0.68, rw: 48, rh: 18, scale: 0 },
    { rxRatio: 0.52, ryRatio: 0.82, rw: 58, rh: 22, scale: 0 },
    { rxRatio: 0.76, ryRatio: 0.60, rw: 44, rh: 16, scale: 0 },
    { rxRatio: 0.38, ryRatio: 0.45, rw: 36, rh: 14, scale: 0 },
    { rxRatio: 0.84, ryRatio: 0.86, rw: 52, rh: 20, scale: 0 },
    { rxRatio: 0.64, ryRatio: 0.35, rw: 38, rh: 15, scale: 0 }
  ];

  // Hạt tuyết rơi
  const MAX_SNOWFLAKES = 110;
  const snowFlakes = [];
  for (let i = 0; i < MAX_SNOWFLAKES; i++) {
    snowFlakes.push({
      x: 0,
      y: 0,
      r: 1.5 + Math.random() * 2.2,
      speed: 35 + Math.random() * 45,
      swaySpeed: 1.4 + Math.random() * 2.0,
      swayAmp: 14 + Math.random() * 18,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.45 + Math.random() * 0.45
    });
  }

  // Trạng thái sét đánh và chớp sáng (Lightning)
  let lightningStartTime = -100;
  let lightningEndTime = -100;
  let nextLightningTime = 8;
  const lightningSegments = [];

  function triggerLightningStrike(t, bounds, isOut) {
    lightningStartTime = t;
    lightningEndTime = t + 0.32;
    lightningSegments.length = 0;

    let cx = bounds.l + bounds.w * (0.15 + Math.random() * 0.7);
    let cy = bounds.t;
    const groundLimit = bounds.t + bounds.h * (0.65 + Math.random() * 0.3);

    while (cy < groundLimit) {
      const ny = cy + 22 + Math.random() * 32;
      const nx = cx + (Math.random() - 0.5) * 45;
      lightningSegments.push({ x1: cx, y1: cy, x2: nx, y2: ny });
      if (Math.random() < 0.28) {
        lightningSegments.push({ x1: cx, y1: cy, x2: cx + (Math.random() - 0.5) * 60, y2: cy + 24 });
      }
      cx = nx;
      cy = ny;
    }

    playThunderSound(isOut);
  }

  function getLightningFlashAlpha(t) {
    if (t >= lightningEndTime) return 0;
    const dur = lightningEndTime - lightningStartTime;
    if (dur <= 0) return 0;
    const p = (t - lightningStartTime) / dur;
    if (p < 0.25) {
      return 1.0 - (p / 0.25) * 0.6; // Đợt chớp ban đầu rất sáng
    } else if (p < 0.55) {
      const p2 = (p - 0.25) / 0.3;
      return 0.4 + Math.sin(p2 * Math.PI) * 0.45; // Nhấp nháy đợt thứ hai
    } else {
      return Math.max(0, 0.4 * (1.0 - (p - 0.55) / 0.45)); // Mờ dần
    }
  }

  // ---------------------------------------------------------------------------
  // 6. Quản lý giao diện HUD (Weather Badge & Log Notifications)
  // ---------------------------------------------------------------------------
  let hudBadgeEl = null;
  let lastLoggedDominant = null;
  let isHudInitialized = false;

  function ensureHudBadge() {
    if (hudBadgeEl && document.body.contains(hudBadgeEl)) return hudBadgeEl;
    hudBadgeEl = document.getElementById('weather-badge');
    if (!hudBadgeEl) {
      // Dự phòng nếu trong HTML chưa có sẵn phần tử #weather-badge
      hudBadgeEl = document.createElement('button');
      hudBadgeEl.id = 'weather-badge';
      hudBadgeEl.className = 'pill';
      hudBadgeEl.title = 'Thời tiết (chạm để xem chi tiết)';
      const topBar = document.getElementById('top');
      if (topBar) {
        const rightGroup = topBar.querySelector('.tgroup:last-child');
        if (rightGroup) rightGroup.insertBefore(hudBadgeEl, rightGroup.querySelector('#clockPill') || rightGroup.firstChild);
        else topBar.appendChild(hudBadgeEl);
      } else {
        document.body.appendChild(hudBadgeEl);
      }
    }
    if (!hudBadgeEl._boundClick) {
      hudBadgeEl._boundClick = true;
      hudBadgeEl.addEventListener('click', () => {
        const info = WEATHER_INFO[lastLoggedDominant] || WEATHER_INFO.clear;
        if (typeof toast === 'function') toast(info.enterMsg || `${info.emoji} Thời tiết: ${info.name}`);
      });
    }
    return hudBadgeEl;
  }

  function updateHud(dominant) {
    if (typeof document === 'undefined') return;
    const badge = ensureHudBadge();
    if (!badge) return;

    // Ẩn huy hiệu thời tiết khi đang ở sảnh chờ (#lobby)
    const lobby = document.getElementById('lobby');
    let isLobbyVisible = false;
    if (lobby) {
      if (lobby.offsetParent !== null) isLobbyVisible = true;
      else {
        try {
          const style = window.getComputedStyle(lobby);
          if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
            isLobbyVisible = true;
          }
        } catch (e) {}
      }
    }

    if (isLobbyVisible) {
      badge.style.display = 'none';
      return;
    }

    const info = WEATHER_INFO[dominant] || WEATHER_INFO.clear;
    const innerHtml = `<span class="w-emoji">${info.emoji}</span><span class="w-name"> ${info.name}</span>`;
    if (badge.innerHTML !== innerHtml) {
      badge.innerHTML = innerHtml;
    }
    badge.style.display = 'inline-flex';

    // Thông báo vào khung log khi thời tiết thay đổi
    if (!isHudInitialized) {
      isHudInitialized = true;
      lastLoggedDominant = dominant;
    } else if (dominant !== lastLoggedDominant) {
      lastLoggedDominant = dominant;
      try {
        if (typeof log === 'function') {
          log(info.enterMsg);
        }
      } catch (e) {}
    }
  }

  // ---------------------------------------------------------------------------
  // 7. Vẽ hiệu ứng ngoài trời (Outdoor Visuals)
  // ---------------------------------------------------------------------------
  function drawOutdoorVisuals(t, dt, weights, bounds, batterySaver) {
    // 7.1. Cầu vồng (Rainbow)
    if (weights.rainbow > 0.01) {
      const rw = weights.rainbow;
      const cx = bounds.l + bounds.w * 0.5;
      const cy = bounds.t + bounds.h * 0.88;
      const baseR = Math.min(bounds.w * 0.50, bounds.h * 0.80);
      const rainbowColors = [
        'rgba(255, 65, 65, ',
        'rgba(255, 150, 45, ',
        'rgba(255, 225, 45, ',
        'rgba(65, 205, 95, ',
        'rgba(50, 165, 255, ',
        'rgba(95, 90, 235, ',
        'rgba(175, 75, 225, '
      ];
      ctx.save();
      ctx.lineWidth = 10;
      for (let i = 0; i < rainbowColors.length; i++) {
        ctx.strokeStyle = `${rainbowColors[i]}${0.14 * rw})`;
        ctx.beginPath();
        ctx.arc(cx, cy, baseR + i * 9, Math.PI * 1.18, Math.PI * 1.82);
        ctx.stroke();
      }
      // Dải cầu vồng phụ mờ ảo
      ctx.lineWidth = 5;
      for (let i = 0; i < rainbowColors.length; i++) {
        ctx.strokeStyle = `${rainbowColors[i]}${0.05 * rw})`;
        ctx.beginPath();
        ctx.arc(cx, cy, baseR * 1.16 + i * 5, Math.PI * 1.20, Math.PI * 1.80);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 7.2. Bóng mây trôi (Cloudy shadows)
    if (weights.cloudy > 0.01) {
      const cw = weights.cloudy;
      ctx.save();
      ctx.fillStyle = `rgba(15, 25, 45, ${0.085 * cw})`;
      const cloudCount = batterySaver ? 3 : 5;
      for (let i = 0; i < cloudCount; i++) {
        const speed = 20 + i * 5;
        const cx = bounds.l + ((t * speed + i * 360) % (bounds.w + 500)) - 250;
        const cy = bounds.t + bounds.h * (0.15 + (i * 0.22) % 0.7);
        ctx.beginPath();
        ctx.ellipse(cx, cy, 140, 65, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 55, cy - 18, 95, 50, 0, 0, Math.PI * 2);
        ctx.ellipse(cx - 50, cy + 12, 85, 45, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 7.3. Sương mù nhiều lớp lững lờ trôi (Fog mist bands)
    if (weights.fog > 0.01) {
      const fw = weights.fog;
      ctx.save();
      const bandCount = batterySaver ? 2 : 4;
      for (let i = 0; i < bandCount; i++) {
        const by = bounds.t + bounds.h * (0.2 + i * 0.22);
        const dir = (i % 2 === 0) ? 1 : -1;
        const speed = (18 + i * 8) * dir;
        const driftOffset = (t * speed) % (bounds.w + 600);

        // Dải gradient sương mềm ngang màn hình
        const grad = ctx.createLinearGradient(0, by - 50, 0, by + 50);
        grad.addColorStop(0, 'rgba(225, 235, 248, 0)');
        grad.addColorStop(0.5, `rgba(220, 235, 248, ${0.12 * fw})`);
        grad.addColorStop(1, 'rgba(225, 235, 248, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(bounds.l, by - 50, bounds.w, 100);

        // Các đốm sương mù bồng bềnh chuyển động
        ctx.fillStyle = `rgba(225, 238, 250, ${0.10 * fw})`;
        const puffCount = batterySaver ? 2 : 4;
        for (let j = 0; j < puffCount; j++) {
          const px = bounds.l + ((driftOffset + j * 320) % (bounds.w + 400)) - 200;
          const py = by + Math.sin(t * 0.8 + j) * 15;
          ctx.beginPath();
          ctx.ellipse(px, py, 160, 42, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    // 7.4. Vũng nước trên mặt đất tự lớn lên và thu nhỏ dần (Puddles)
    const rainIntensity = weights.rain + weights.storm;
    for (let i = 0; i < puddles.length; i++) {
      const p = puddles[i];
      if (rainIntensity > 0.05) {
        p.scale = Math.min(1.0, p.scale + dt * 0.035 * rainIntensity);
      } else {
        p.scale = Math.max(0.0, p.scale - dt * 0.012);
      }

      if (p.scale > 0.02) {
        const px = bounds.l + bounds.w * p.rxRatio;
        const py = bounds.t + bounds.h * p.ryRatio;
        const curRw = p.rw * p.scale;
        const curRh = p.rh * p.scale;

        // Thân vũng nước phản chiếu
        ctx.fillStyle = `rgba(100, 145, 190, ${0.22 * p.scale})`;
        ctx.beginPath();
        ctx.ellipse(px, py, curRw, curRh, 0, 0, Math.PI * 2);
        ctx.fill();

        // Viền bóng nước
        ctx.strokeStyle = `rgba(215, 238, 255, ${0.28 * p.scale})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Gợn sóng nhỏ bên trong vũng nước
        if (rainIntensity > 0.2 && Math.sin(t * 3.2 + i * 2) > 0.6) {
          const ripR = (curRw * 0.4) * ((Math.sin(t * 3.2 + i * 2) - 0.6) / 0.4);
          ctx.strokeStyle = `rgba(225, 245, 255, ${0.25 * p.scale})`;
          ctx.beginPath();
          ctx.ellipse(px, py, ripR, ripR * (curRh / curRw), 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    // 7.5. Mưa và Giông bão: Hạt mưa rơi nghiêng & gợn sóng khi chạm đất
    if (rainIntensity > 0.01) {
      const isStorm = weights.storm > weights.rain;
      const maxRain = batterySaver ? 40 : 130;
      const maxStorm = batterySaver ? 70 : 220;
      const activeDrops = Math.floor(weights.rain * maxRain + weights.storm * maxStorm);

      // Gió thổi giật mạnh khi có giông bão
      const windX = isStorm ? (Math.sin(t * 1.6) * 90 - 130) : -60;
      const slantX = windX * 0.022;

      ctx.save();
      ctx.beginPath();
      for (let i = 0; i < activeDrops; i++) {
        const d = rainDrops[i];
        const fallSpeed = isStorm ? (850 + (i % 6) * 40) : (650 + (i % 6) * 30);
        d.x += windX * dt;
        d.y += fallSpeed * dt;

        if (d.y >= d.groundY || d.y > bounds.b || d.x < bounds.l - 120 || d.x > bounds.r + 120) {
          if (d.y >= d.groundY && Math.random() < (isStorm ? 0.35 : 0.22)) {
            addSplash(d.x, d.groundY, isStorm ? 1.3 : 1.0);
          }
          d.x = bounds.l - 60 + Math.random() * (bounds.w + 220);
          d.y = bounds.t - Math.random() * 80;
          d.groundY = bounds.t + bounds.h * (0.25 + Math.random() * 0.75);
          d.len = isStorm ? (22 + Math.random() * 12) : (14 + Math.random() * 8);
        }

        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + slantX, d.y + d.len);
      }
      ctx.strokeStyle = `rgba(195, 225, 255, ${Math.min(0.8, weights.rain * 0.42 + weights.storm * 0.68)})`;
      ctx.lineWidth = isStorm ? 1.5 : 1.0;
      ctx.stroke();
      ctx.restore();

      // Cập nhật và vẽ các vòng sóng nước khi giọt mưa va chạm đất
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i < MAX_SPLASHES; i++) {
        const s = splashes[i];
        if (!s.active) continue;
        s.r += 24 * dt;
        s.alpha -= 1.8 * dt;
        if (s.alpha <= 0 || s.r >= s.maxR) {
          s.active = false;
          continue;
        }
        ctx.ellipse(s.x, s.y, s.r, s.r * 0.35, 0, 0, Math.PI * 2);
      }
      ctx.strokeStyle = `rgba(205, 230, 255, ${0.38 * rainIntensity})`;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    // 7.6. Tuyết rơi lắc lư và lớp tuyết đọng trắng xóa ở chân bản đồ (Snow)
    if (weights.snow > 0.01) {
      const sw = weights.snow;
      const maxSnow = batterySaver ? 30 : 90;
      const activeFlakes = Math.floor(sw * maxSnow);

      ctx.save();
      ctx.beginPath();
      for (let i = 0; i < activeFlakes; i++) {
        const f = snowFlakes[i];
        f.y += f.speed * dt;
        if (f.y > bounds.b + 10) {
          f.y = bounds.t - 10;
          f.x = bounds.l + Math.random() * bounds.w;
        }
        const swayX = Math.sin(t * f.swaySpeed + f.phase) * f.swayAmp;
        ctx.moveTo(f.x + swayX + f.r, f.y);
        ctx.arc(f.x + swayX, f.y, f.r, 0, Math.PI * 2);
      }
      ctx.fillStyle = `rgba(255, 255, 255, ${0.75 * sw})`;
      ctx.fill();

      // Lớp tuyết đọng lượn sóng nhẹ nhàng dưới đáy bản đồ
      ctx.fillStyle = `rgba(240, 248, 255, ${0.35 * sw})`;
      ctx.beginPath();
      ctx.moveTo(bounds.l, bounds.b);
      const snowSteps = 18;
      const stepW = bounds.w / snowSteps;
      for (let i = 0; i <= snowSteps; i++) {
        const sx = bounds.l + i * stepW;
        const sy = bounds.b - (8 + Math.sin(i * 1.4) * 5 + Math.cos(i * 2.5) * 3);
        ctx.lineTo(sx, sy);
      }
      ctx.lineTo(bounds.r, bounds.b);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 7.7. Quản lý sét đánh ngẫu nhiên khi có giông bão
    if (weights.storm > 0.25) {
      if (t >= nextLightningTime) {
        nextLightningTime = t + 10 + Math.random() * 14;
        triggerLightningStrike(t, bounds, true);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 8. Các phương thức công khai được index.html gọi mỗi khung hình
  // ---------------------------------------------------------------------------

  // Weather.draw(t, out): gọi trước lớp bóng tối darkness
  // Mức hiệu ứng thời tiết (⚙️ Cài đặt, lưu nc_wfx): full = đầy đủ, light = nhẹ (mặc định), off = tắt hẳn hình ảnh.
  // Chỉ giảm phần HÌNH (mưa, sương, tối trời); tên thời tiết trên biểu tượng vẫn theo thời tiết thật.
  const FX_LEVEL = {full: 1, light: 0.4, off: 0};
  function fxMode() { try { const m = localStorage.getItem('nc_wfx'); return FX_LEVEL[m] !== undefined ? m : 'light'; } catch (e) { return 'light'; } }
  function setFxMode(m) { if (FX_LEVEL[m] === undefined) return; try { localStorage.setItem('nc_wfx', m); } catch (e) {} }
  function fxWeights(w) {
    const k = FX_LEVEL[fxMode()];
    if (k === 1) return w;
    const o = {}; let sum = 0;
    for (const key in w) { if (key === 'clear') continue; o[key] = w[key] * k; sum += o[key]; }
    o.clear = Math.max(0, 1 - sum);
    return o;
  }

  function draw(t, out) {
    try {
      if (typeof ctx === 'undefined' || !ctx) return;
      const dt = (lastTimeSeconds > 0 && t > lastTimeSeconds) ? Math.min(0.1, t - lastTimeSeconds) : 0.016;
      lastTimeSeconds = t;

      const now = getNow();
      const raw = getCurrentWeights(now);
      const dominant = getDominantWeather(raw);                 // tên thời tiết thật cho biểu tượng
      const weights = fxWeights(raw);                           // hình ảnh theo mức hiệu ứng đã chọn
      const bounds = getViewBounds();
      const batterySaver = isBatterySaver();

      updateHud(dominant);
      updateWeatherAudio(weights, !!out);

      if (out) {
        drawOutdoorVisuals(t, dt, weights, bounds, batterySaver);
      }
    } catch (e) {
      // Bọc try/catch toàn bộ để không bao giờ phá hỏng vòng lặp game
    }
  }

  // Weather.top(t, out): gọi sau lớp bóng tối darkness (chớp sáng, vệt mưa cửa sổ)
  function top(t, out) {
    try {
      if (typeof ctx === 'undefined' || !ctx) return;
      const bounds = getViewBounds();
      const now = getNow();
      const weights = fxWeights(getCurrentWeights(now));
      const flashAlpha = FX_LEVEL[fxMode()] ? getLightningFlashAlpha(t) * FX_LEVEL[fxMode()] : 0;

      if (out) {
        // Ngoài trời: Chớp sáng rực rỡ và tia sét chói lòa
        if (flashAlpha > 0.01) {
          ctx.save();
          ctx.fillStyle = `rgba(242, 248, 255, ${flashAlpha * 0.65})`;
          ctx.fillRect(bounds.l, bounds.t, bounds.w, bounds.h);

          if (lightningSegments.length > 0) {
            // Viền phát sáng tia sét
            ctx.strokeStyle = `rgba(185, 220, 255, ${flashAlpha * 0.75})`;
            ctx.lineWidth = 7;
            ctx.beginPath();
            for (let i = 0; i < lightningSegments.length; i++) {
              const seg = lightningSegments[i];
              ctx.moveTo(seg.x1, seg.y1);
              ctx.lineTo(seg.x2, seg.y2);
            }
            ctx.stroke();

            // Lõi trắng sáng
            ctx.strokeStyle = `rgba(255, 255, 255, ${flashAlpha * 0.95})`;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            for (let i = 0; i < lightningSegments.length; i++) {
              const seg = lightningSegments[i];
              ctx.moveTo(seg.x1, seg.y1);
              ctx.lineTo(seg.x2, seg.y2);
            }
            ctx.stroke();
          }
          ctx.restore();
        }
      } else {
        // Trong nhà: Vệt mưa chảy trên kính cửa sổ ở mép trên và ánh chớp mờ
        const rainTotalWeight = weights.rain + weights.storm;
        if (rainTotalWeight > 0.05) {
          ctx.save();
          const streakCount = 9;
          for (let i = 0; i < streakCount; i++) {
            const sx = bounds.l + (i + 0.5) * (bounds.w / streakCount) + Math.sin(i * 3.3) * 18;
            const loopTime = 3.5 + (i % 3) * 0.8;
            const progress = ((t + i * 1.7) % loopTime) / loopTime;
            const startY = bounds.t;
            const dropY = startY + progress * 85;

            // Vệt nước chảy
            ctx.strokeStyle = `rgba(185, 215, 245, ${0.22 * rainTotalWeight * (1 - progress * 0.4)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(sx, startY);
            ctx.lineTo(sx, dropY);
            ctx.stroke();

            // Giọt nước đọng
            ctx.fillStyle = `rgba(215, 235, 255, ${0.38 * rainTotalWeight})`;
            ctx.beginPath();
            ctx.arc(sx, dropY, 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }

        // Ánh chớp hắt qua cửa sổ mờ mờ trong nhà
        if (flashAlpha > 0.01) {
          ctx.save();
          ctx.fillStyle = `rgba(235, 245, 255, ${flashAlpha * 0.14})`;
          ctx.fillRect(bounds.l, bounds.t, bounds.w, bounds.h);
          ctx.restore();
        }
      }
    } catch (e) {
      // Không bao giờ ném ngoại lệ
    }
  }

  // Weather.dim(): trả về 0..0.5 độ tối tăng thêm cho khu vực ngoài trời
  function dim() {
    try {
      const now = getNow();
      const weights = fxWeights(getCurrentWeights(now));
      const extraDim = (
        weights.cloudy * WEATHER_INFO.cloudy.dim +
        weights.rain   * WEATHER_INFO.rain.dim +
        weights.storm  * WEATHER_INFO.storm.dim +
        weights.fog    * WEATHER_INFO.fog.dim +
        weights.snow   * WEATHER_INFO.snow.dim
      );
      return Math.min(0.5, Math.max(0, extraDim));
    } catch (e) {
      return 0;
    }
  }

  return {
    draw,
    top,
    dim,
    fxMode,
    setFxMode
  };
})();

// Gắn vào window và module để đảm bảo tương thích toàn cục
if (typeof window !== 'undefined') {
  window.Weather = Weather;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Weather;
}
