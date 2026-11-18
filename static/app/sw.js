// Service worker tối giản để game cài được như app.
// Không lưu bộ nhớ đệm (game luôn cần server), chỉ hiện trang báo khi mất mạng.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => {
  if (e.request.mode !== "navigate") return;
  e.respondWith(fetch(e.request).catch(() => new Response(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width">' +
    '<body style="background:#0d0b1e;color:#f3eefe;font-family:sans-serif;display:flex;align-items:center;' +
    'justify-content:center;height:100vh;margin:0;text-align:center"><div><h2>🌙 Mất kết nối mạng</h2>' +
    '<p>Kiểm tra wifi/4G rồi bấm thử lại.</p><button onclick="location.reload()" style="font-size:18px;' +
    'padding:10px 24px;border-radius:12px;border:0;background:#ffd27a">Thử lại</button></div>',
    { headers: { "Content-Type": "text/html; charset=utf-8" } })));
});
