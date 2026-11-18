# AVATAR LIFE GAME – V6: KHU LÀM TÓC (TIỆM SALON)

> File bổ sung. Chỉ làm khu mới này, KHÔNG tạo lại những gì V1–V5 đã có.
> Dữ liệu: `salon/hair_catalog.json` (kiểu tóc + màu nhuộm + giá). Hình NPC: `salon/npc_*.svg`.
> Kiểu tóc dùng đúng tham số `hs`, màu tóc dùng `hair`/`hl` của generator avatar (xem PROMPT_DUNG_NHAN_VAT.md).
> Mọi giá nằm trong JSON/config, KHÔNG viết cứng trong code.

## 1. Vị trí trên bản đồ
- Khu **chung** (có kênh, nhiều người cùng vào), đặt trên MapPanel cùng nhóm Khu mua sắm: tên "Tiệm Làm Tóc", pin có số người online.
- Chỉ vào qua bản đồ (không có cửa đi bộ), đúng quy tắc di chuyển V1.
- Giờ mở cửa: cả ngày, đóng 00:00–00:05 (giờ Việt Nam) khi reset ngày.

## 2. Mô tả cảnh (side-view, 1280x720, dùng nền đã có sẵn của bạn)
- Tường màu pastel hồng/tím, gương lớn nhiều đèn viền, ghế salon xoay (3 ghế), kệ để sản phẩm, máy sấy tóc.
- Góc trái là quầy lễ tân của **Chị Gương**. Giữa phòng là khu ghế để người chơi ngồi vào **thử tóc**.
- Người chơi bước tới ghế → bấm nút "Ngồi vào ghế" → màn hình chuyển sang giao diện **Gương** (mục 4).
- Âm thanh: nhạc nhẹ, tiếng kéo cắt, máy sấy khi tạo kiểu xong.
- Chi tiết sống động: thợ tóc **Anh Tóc** làm tóc cho NPC khách, tiếng kéo cắt lách cách, hơi nước từ máy sấy.

## 3. NPC (đã có file hình)
| NPC | Vai trò | Hình |
|---|---|---|
| Anh Tóc | Thợ làm tóc, giới thiệu kiểu tóc, nhuộm | `salon/npc_stylist_m.svg` |
| Chị Gương | Quản lý, lễ tân, hướng dẫn người mới | `salon/npc_stylist_f.svg` |

Mỗi NPC tự nói 1 câu vui mỗi 10–15 giây (xáo túi, không lặp liên tiếp). Gợi ý:
- Anh Tóc: "Đổi tóc là đổi vận, thử một kiểu mới đi!" · "Mái này mà nhuộm hồng thì hết sảy luôn." · "Tóc xoăn bồng đang hot lắm nha." · "Đừng lo, tóc hỏng mình cắt lại được."
- Chị Gương: "Lần đầu tới? Thử tóc miễn phí, thoải mái chọn nhé!" · "Hôm nay màu pastel đang giảm giá đó." · "Ghế trống rồi, mời bạn ngồi!" · "Nhớ lưu kiểu tóc ưng ý lại nha."

## 4. Giao diện "Gương"
- Hiện nhân vật to ở giữa, bên trái: danh sách **kiểu tóc** (thẻ có viền màu theo bậc), bên phải: **bảng màu nhuộm** + thanh chỉnh độ sáng nhẹ.
- **Thử tóc luôn miễn phí và không giới hạn**; chỉ tốn xu khi bấm "Chốt kiểu này".
- Nút "So sánh trước/sau" (giữ nhấn để xem tóc cũ).
- Nút xoay nhẹ trái/phải (nhân vật quay nhìn sang trái/phải).
- Chỉ hiện nút Chốt khi đủ xu, nếu thiếu hiển thị rõ còn thiếu bao nhiêu.
- Kiểu tóc chưa mua có biểu tượng khoá; đã mua thì có dấu tích và dùng lại miễn phí.

## 5. Giá & bậc (đầy đủ trong `hair_catalog.json`)

### Kiểu tóc (mua 1 lần, mở khoá vĩnh viễn trong Tủ đồ)
| Bậc | Kiểu tóc | Giá |
|---|---|---|
| C | Bob, Ngắn gọn, Rẽ ngôi, Đuôi ngựa, Hai bím | 500 – 1.200 xu |
| B | Dài thẳng, Dài gợn sóng, Búi cao, Tóc nấm, Xoăn ngắn | 3.000 – 5.000 xu |
| A | Hai búi, Tóc tết, Tóc nhọn, Vuốt ngược | 12.000 – 22.000 xu |
| S | Xoăn bồng, Mohican | 50.000 – 60.000 xu |

### Nhuộm màu (trả phí mỗi lần đổi màu)
| Nhóm | Số màu | Giá mỗi lần |
|---|---|---|
| Cơ bản (đen, nâu, vàng, đỏ rượu, xám...) | 6 | 300 xu |
| Pastel (hồng, xanh, tím, mint, cam đào) | 5 | 1.500 xu |
| Độc (hồng neon, xanh neon, bạc ánh kim, trắng tuyết) | 4 | 8.000 xu |

- **Lần đầu tạo nhân vật**: chọn kiểu tóc và màu cơ bản miễn phí.
- Có thể đổi màu tóc mà không đổi kiểu, và ngược lại. Màu nhuộm không mở khoá vĩnh viễn (mỗi lần đổi tính phí lại), để tạo vòng tiêu xu hợp lý.

## 6. Hoạt động thêm (tuỳ chọn, làm sau)
- **Nhiệm vụ**: "Đổi kiểu tóc đầu tiên", "Thử 5 kiểu khác nhau", "Nhuộm màu pastel".
- **Check-in**: ghé tiệm hằng ngày nhận 1 phiếu **thử màu miễn phí**.
- **Cuộc thi tóc đẹp** (sự kiện cuối tuần): người chơi bình chọn, nhận danh hiệu và vật phẩm trang trí. Chống gian lận: mỗi người 1 phiếu, không bình cho chính mình, không thưởng xu lớn.
- **Việc làm thêm** (nối với V4): "Phụ tiệm tóc", mini-game xếp màu nhuộm, nhận xu có trần ngày.
- Mua **sản phẩm chăm tóc** làm quà tặng bạn bè (không tặng xu, theo quy tắc quà tặng V2).

## 7. Server & dữ liệu
```sql
CREATE TABLE player_hairstyles(player_id INT, hair_id TEXT, unlocked_at INT, PRIMARY KEY(player_id, hair_id));
CREATE TABLE salon_log(id INTEGER PRIMARY KEY, player_id INT, kind TEXT, hair_id TEXT, hair_color TEXT, price INT, at INT);
```
- API: `GET /api/salon/catalog` · `POST /api/salon/apply {hair_id, hair, hl}` (server trừ xu, ghi mở khoá, cập nhật cấu hình nhân vật) · `GET /api/salon/mine`.
- Server kiểm tra: `hair_id` có trong catalog, màu đúng `#rrggbb` **và** thuộc danh sách màu hợp lệ của catalog (không cho màu tuỳ ý để bán đúng giá), đủ xu, kiểu tóc đã mở khoá hoặc thanh toán cùng lúc.
- Mọi giao dịch là 1 transaction DB (trừ xu + mở khoá + đổi cấu hình).
- Thử tóc chạy hoàn toàn ở client, không gọi server.

## 8. Phases
- V6.1: khu Tiệm Làm Tóc trên bản đồ + 2 NPC + câu nói.
- V6.2: giao diện Gương (thử tóc miễn phí, xem trước, so sánh).
- V6.3: mua kiểu tóc + nhuộm màu (server, xu, mở khoá).
- V6.4: nhiệm vụ, check-in, phiếu thử màu.
- V6.5: cuộc thi tóc đẹp + việc làm thêm.

## 9. Checklist
- [ ] Thử tóc miễn phí, không giới hạn, không gọi server
- [ ] Giá và màu đọc từ `hair_catalog.json`
- [ ] Server kiểm tra màu hợp lệ + đủ xu + transaction
- [ ] Kiểu tóc đã mua dùng lại miễn phí
- [ ] Lần đầu tạo nhân vật miễn phí
- [ ] NPC tự nói 10–15 giây, không lặp liên tiếp
- [ ] Không thanh toán tiền thật

## 10. PROMPT cho AI code
```
Đọc AVATAR_LIFE_GAME_V6_SALON.md và salon/hair_catalog.json. Chỉ làm khu "Tiệm Làm Tóc" (V6), KHÔNG làm lại V1-V5.
Dùng đúng hình NPC trong salon/ và generator avatar có sẵn để xem trước kiểu tóc/màu realtime.
Mọi giá đọc từ JSON. Thử tóc ở client, chỉ gọi server khi chốt. Làm lần lượt V6.1 → V6.5, xong mỗi bước chạy thử rồi mới báo.
```
