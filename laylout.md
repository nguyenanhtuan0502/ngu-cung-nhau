# AVATAR LIFE GAME – BỐ CỤC TỔNG HỢP (LAYOUT)

> File tổng hợp riêng phần **bố cục màn hình, camera, độ sâu, tỉ lệ nhân vật, giao diện**.
> Gộp các quyết định từ V1–V6. Khi có mâu thuẫn, **file này ưu tiên cho phần bố cục**.
> Không tạo lại những tính năng đã có; chỉ áp dụng quy tắc bố cục vào chúng.

---

## 1. Góc nhìn & khung hình

- **Góc nhìn ngang 2D (side view)**, camera nhìn thẳng vào "mặt cắt căn phòng" như hộp nhà búp bê. KHÔNG phải góc từ trên xuống.
- Nền là một tấm phông ngang phía sau, nhân vật đi trên **dải sàn** phía dưới.
- **Màn hình ngang 16:9**, độ phân giải thiết kế **1280x720**, scale kiểu **FIT** (giữ tỉ lệ, căn giữa).
- Phần nền thừa hai bên (bleed): nền vẽ rộng hơn khung (ví dụ 1600x720), phần ngoài 1280 chỉ để lấp đầy màn hình tỉ lệ khác (21:9, 18:9).
- **Màn dọc**: hiện lớp "Vui lòng xoay ngang", dừng game đến khi xoay.
- **Vùng an toàn (safe area)**: UI cách mép ≥ **24 px**; thiết bị có tai thỏ dùng `env(safe-area-inset-*)`.

## 2. Công nghệ bố cục

- **Thế giới** (nền, nhân vật, NPC, thú cưng, va chạm, camera): Phaser 3.
- **Giao diện** (HUD, nút, bảng, chat, bản đồ, đăng nhập): **HTML + CSS đặt đè lên canvas**, không vẽ UI phức tạp bằng canvas.
- Font hỗ trợ tiếng Việt có dấu (Nunito hoặc Quicksand).
- Chữ tối thiểu 14 px trên thiết kế 1280x720; nút bấm tối thiểu **44x44 px**.

## 3. Các lớp (từ dưới lên)

1. Phông nền xa (trời, đồi, toà nhà mờ)
2. Phông giữa (cây, tường, cửa sổ)
3. Sàn / mặt đất
4. Vật thể và nhân vật (**y-sorting**, xem mục 5)
5. Hiệu ứng (cánh hoa, ánh sáng, mưa, tuyết theo thời tiết)
6. Lớp màu theo giờ/thời tiết/theme (tối dần buổi tối)
7. **HUD HTML/CSS** (trên cùng)

## 4. Bố cục HUD trên màn hình 1280x720

```
┌────────────────────────────────────────────────────────────┐
│ [Avatar][Tên]  xu ⚡        [🕒 giờ VN][🔋 pin][🏆 Top giàu] │  ← hàng trên
│                                                    [▼ thu gọn]│
│                                              (👗)(🎒)(🏆)     │  ← thanh nút tròn
│                                              (🗺️)(👥)(⚙️)     │     (xổ ra/thu lại)
│                                                              │
│                  (khu vực chơi / nhân vật)                    │
│                                                              │
│ (Joystick ảo)   [Hộp chat / nút chat]          [Nút hành động]│  ← hàng dưới
└────────────────────────────────────────────────────────────┘
```

| Vị trí    | Thành phần                                                                                                                 |
| --------- | -------------------------------------------------------------------------------------------------------------------------- |
| Trên trái | Ảnh đại diện nhỏ, tên, xu, năng lượng ⚡                                                                                   |
| Trên phải | Đồng hồ giờ Việt Nam (UTC+7), pin thiết bị (ẩn nếu không hỗ trợ), chip "Top giàu"                                          |
| Phải      | Nút mũi tên thu gọn/mở rộng; dưới nó là thanh nút tròn: 👗 Tủ đồ, 🎒 Túi đồ, 🏆 Xếp hạng, 🗺️ Bản đồ, 👥 Bạn bè, ⚙️ Cài đặt |
| Dưới trái | Joystick ảo (chỉ hiện trên cảm ứng)                                                                                        |
| Dưới giữa | Hộp chat (thu gọn thành 1 dòng, bấm mở rộng)                                                                               |
| Dưới phải | Nút hành động: Tương tác, Ngồi/Nằm, Emote                                                                                  |

Quy tắc:

- Thanh nút tròn **mặc định mở trên PC, thu gọn trên mobile**; phím tắt B bật/tắt.
- Không để HUD che quá 25% chiều cao màn hình; hàng giữa dành cho nhân vật.
- Bong bóng chat, tên người chơi vẽ ở lớp UI, **không dính vào ảnh nhân vật**.
- Pin: dùng Battery Status API; không hỗ trợ thì ẩn. Pin thấp → bật chế độ tiết kiệm (bỏ hiệu ứng).

## 5. Dải đi & chiều sâu (2.5D giả)

- Mỗi cảnh có `walkBand {yMin, yMax}` (mặc định **560–690**). Nhân vật bị chặn ngoài dải.
- **Y-sorting**: depth = y của chân. Vật nào y lớn hơn thì vẽ đè lên.
- Vật thể mà nhân vật có thể đi ra sau (cây, bàn, ghế rạp, giường) phải là **sprite riêng**, không vẽ liền vào phông.
- **Scale theo y**: `scale = lerp(0.9, 1.05, (y - yMin) / (yMax - yMin))`; bóng, tên, bong bóng chat scale theo.
- Va chạm chỉ cần ô dưới chân (~60x20 px).
- Chạm/click để đi: nhân vật đi thẳng tới điểm chạm (đã kẹp vào dải), không cần tìm đường phức tạp.

## 6. Tỉ lệ nhân vật

- Phong cách: **chibi lớn 3,5–4 đầu** (đỡ trẻ con hơn chibi 2–3 đầu của Avatar gốc, vẫn dễ thương).
- Chiều cao trên màn hình khoảng **200 px** (khung 720). Không nhỏ hơn 150 px.
- Neo nhân vật: giữa đáy chân. Nhìn trái/phải: lật `scaleX(-1)`.
- Thú cưng: cao khoảng 40–55% nhân vật, đi theo sau 1–2 bước.
- NPC cao bằng người chơi (±10%), khách ngồi/nằm có thể nhỏ hơn.
- Nếu dùng generator SVG hiện có (400x600): scale 0.33–0.37 là khoảng 200 px.

## 7. Cấu trúc các khu vực

- **Khu riêng** (theo từng người chơi): Nhà riêng, Nông trại.
- **Khu chung** (có kênh): Công viên, Rạp chiếu phim, Phòng học, Khu mua sắm, Hồ câu cá, Khu vui chơi, Khu chứng khoán, Khu hẹn hò, **Tiệm làm tóc**.
- **Ký túc xá**: vào bằng mã phòng, 8 giường.
- **Di chuyển giữa khu**: CHỈ qua **MapPanel** (bản đồ có pin + số người online); không có cửa đi bộ nối giữa khu.
- Trong một khu: tối đa vài chục người/kênh; hết chỗ tự sang kênh khác.

## 8. Quy ước từng cảnh (file cấu hình)

Mỗi cảnh một file cấu hình (JSON):

```json
{
  "id": "cinema",
  "name": "Rạp chiếu phim",
  "background": ["far", "mid", "floor"],
  "walkBand": { "yMin": 560, "yMax": 690 },
  "spawn": { "x": 300, "y": 620 },
  "npcs": [{ "id": "cinema_usher", "x": 220, "y": 600 }],
  "props": [{ "id": "seat_row1", "x": 600, "y": 560, "ySort": true }],
  "portals": [],
  "themeLayers": true
}
```

- Mỗi cảnh = 1 Phaser Scene, đọc cấu hình này, không viết cứng toạ độ trong code.
- NPC mỗi khu ≥ 1, tự nói câu vui mỗi 10–15 giây (xáo túi, không lặp liên tiếp).

## 9. Điều khiển

- **Cảm ứng**: joystick ảo hoặc chạm vào điểm cần đến; chạm NPC/vật để tương tác.
- **Bàn phím**: WASD hoặc phím mũi tên để đi, E tương tác, Enter mở chat, B bật/tắt thanh nút, M mở bản đồ.
- Không giữ phím/ngón tay thì nhân vật đứng yên, animation thở nhẹ + nháy mắt.

## 10. Thời gian, thời tiết, theme

- Giờ trong game = **giờ thật Việt Nam (UTC+7)** từ server; reset ngày 00:00.
- Màu cảnh đổi theo giờ (sáng, chiều, tối) bằng lớp phủ, không vẽ lại nền.
- Theme theo mùa/sự kiện đọc từ file cấu hình (thêm theme không sửa code).

## 11. Hiệu năng (mobile)

- SVG nhân vật vẽ **một lần** ra texture offscreen rồi dùng làm sprite; vẽ lại khi đổi đồ.
- Giới hạn số nhân vật hiển thị cùng lúc (ví dụ 30); xa quá thì ẩn tên/bong bóng.
- Pin thấp hoặc máy yếu: tắt hiệu ứng nền (cánh hoa, mưa), giảm FPS animation.

## 12. Checklist bố cục

- [ ] Khung 1280x720 FIT, căn giữa, có bleed
- [ ] Màn dọc hiện lớp xoay ngang
- [ ] Safe area ≥ 24 px, hỗ trợ tai thỏ
- [ ] HUD đúng vị trí mục 4, nút ≥ 44 px
- [ ] Thanh nút tròn thu gọn/mở được, mặc định theo thiết bị
- [ ] `walkBand` + y-sorting + scale theo y
- [ ] Vật đi ra sau là sprite riêng
- [ ] Nhân vật ~200 px, tỉ lệ 3,5–4 đầu
- [ ] Đi giữa khu chỉ qua MapPanel
- [ ] Mỗi cảnh một file cấu hình
- [ ] Tên/chat không dính vào ảnh nhân vật

## 13. PROMPT cho AI code

```
Đọc AVATAR_LIFE_GAME_LAYOUT.md. Chỉ làm bố cục (khung hình, HUD, walkBand, y-sorting, scale, điều khiển, cấu hình cảnh).
Chưa làm tính năng khác. Dùng Phaser 3 cho thế giới, HTML/CSS cho HUD. Làm từng bước, mỗi bước chạy thử rồi mới báo.
Bước 1: khung 1280x720 FIT + màn dọc + safe area. Bước 2: HUD đúng mục 4. Bước 3: một cảnh với walkBand, y-sorting, scale theo y.
```
