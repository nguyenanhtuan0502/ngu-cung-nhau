# PROMPT CHO AI: LÀM GAME + LÀM HÌNH ĐẸP

## A. PROMPT CHO AI CODE (Claude/Cursor/Antigravity...)

```
Bạn là lập trình viên game web 2D giàu kinh nghiệm. Mình đang làm game "cuộc sống ảo" 2D nhìn ngang
(phong cách Avatar), chơi trên mobile và PC (màn ngang 16:9). Spec nằm trong các file:
AVATAR_LIFE_GAME.md (V1), _V2_UPDATE.md, _V3_LOGIN.md, _V4_FEATURES.md, _V5_PETS.md.
Hãy ĐỌC hết các file đó trước, và chỉ làm phần mình yêu cầu ở mỗi lượt, không làm lại phần đã có.

CÔNG NGHỆ BẮT BUỘC
- Thế giới game (nền, nhân vật, NPC, thú cưng, va chạm, camera): Phaser 3.
- Giao diện (HUD, nút tròn, bảng xếp hạng, túi đồ, tủ đồ, chat, bản đồ, màn hình đăng nhập):
  HTML + CSS đặt đè lên canvas (Tailwind CSS hoặc CSS thuần). KHÔNG vẽ UI phức tạp bằng canvas.
- Hoạt ảnh UI nhỏ (mở trứng, pháo hoa): Lottie hoặc CSS animation.
- Server: theo spec V1/V3 (Python hoặc Node + WebSocket + SQLite). Giữ code hiện có, đừng viết lại từ đầu.

BỐ CỤC & HIỂN THỊ
- Độ phân giải thiết kế 1280x720, scale kiểu FIT, tự căn giữa, có phần "bleed" của nền ra ngoài khung.
- Vùng an toàn cho UI (safe area) cách mép ≥ 24px; thiết bị có tai thỏ phải dùng env(safe-area-inset-*).
- Màn dọc: hiện lớp "Vui lòng xoay ngang".
- Nút trên màn hình tối thiểu 44x44 px, điều khiển bằng cảm ứng (joystick ảo + nút) và bàn phím (WASD/phím mũi tên).
- HUD theo V2: thanh nút tròn có nút thu gọn, đồng hồ giờ Việt Nam, pin, chip "Top giàu".
- Mọi chữ hiển thị là tiếng Việt, font hỗ trợ dấu (ví dụ Nunito hoặc Quicksand).

NHÂN VẬT, NPC, THÚ CƯNG
- Nhân vật người chơi và NPC: dùng generator avatar (file avatar_lib.py → port sang avatar.js) hoặc bộ
  hình mới sau này; cấu hình lưu dạng JSON (xem PROMPT_DUNG_NHAN_VAT.md). Không tự vẽ lại bằng hình khác.
- Thú cưng: dùng pets/pets.json và pets/pet_<id>.svg theo V5.
- Với SVG: render một lần ra texture (canvas offscreen) rồi dùng làm sprite Phaser để chạy nhanh.
- Di chuyển: đi bộ bằng cách nhấp nhô lên xuống + lắc tay (không cần vẽ từng khung hình).

CẤU TRÚC MÃ
- Mỗi khu vực là 1 Phaser Scene riêng (park, cinema, bedroom, classroom, ...), dữ liệu khu vực
  đọc từ file cấu hình (vị trí NPC, điểm đặt, kênh).
- Tách file: scenes/, ui/, net/, data/, assets/. Không dồn hết vào 1 file.
- Server là nguồn sự thật cho xu, vật phẩm, RNG; client chỉ hiển thị và gửi yêu cầu.

CÁCH LÀM VIỆC
- Làm từng bước nhỏ, mỗi bước chạy thử được. Sau mỗi bước báo: file đã sửa, cách chạy, cách kiểm tra.
- Có lỗi thì tự đọc console/log và sửa, đừng bảo mình tự sửa.
- Nếu thiếu hình, dùng hình tạm (hình chữ nhật có nhãn) và ghi rõ tên file hình cần thay, đừng tự bịa hình khác.
- Chưa chắc yêu cầu nào thì hỏi 1 câu ngắn, đừng đoán mò rồi làm lớn.

BƯỚC ĐẦU TIÊN: dựng khung Phaser 3 + lớp HUD HTML/CSS đè lên canvas theo mục BỐ CỤC, hiển thị 1 cảnh công viên
với 1 nhân vật di chuyển được bằng bàn phím và cảm ứng. Chưa làm các tính năng khác.
```

## B. PROMPT VẼ NHÂN VẬT KIỂU TEEN (dán vào Leonardo AI / Dreamina / ...)

### Style prefix (dán đầu mọi prompt)

```
2D game character art, full body, front view, standing pose, clean cel-shaded illustration, soft gradient shading,
subtle rim light, smooth vector-like lineart, young teenager proportions (about 6 heads tall), slim body,
small refined anime eyes, natural face, trendy modern casual fashion, vibrant but harmonious colors,
isolated on solid pure white background, centered, full body visible from head to shoes, game asset
```

### Negative prompt

```
chibi, big head, baby face, toddler, childish, cartoon mascot, text, watermark, logo, signature, cropped,
cut off, extra limbs, extra fingers, deformed hands, blurry, low quality, realistic photo, 3D render,
background scene, shadow on ground, multiple characters, copyrighted character
```

### Nhân vật mẫu (thay phần cuối của prompt)

- Nữ 1: `[STYLE PREFIX], teen girl, long black hair with side bangs, white t-shirt, light blue high-waist shorts, white sneakers, friendly smile`
- Nữ 2: `[STYLE PREFIX], teen girl, brown wavy shoulder-length hair, pastel pink hoodie, black skirt, boots, cute small hair clip`
- Nữ 3: `[STYLE PREFIX], teen girl, Vietnamese traditional ao dai in red with white pants, hair in a neat low bun, elegant`
- Nam 1: `[STYLE PREFIX], teen boy, short black hair, oversized grey hoodie, black jeans, white sneakers`
- Nam 2: `[STYLE PREFIX], teen boy, messy brown hair, school uniform with white shirt and navy trousers, backpack`
- Nam 3: `[STYLE PREFIX], teen boy, sportswear orange jersey number 10, shorts, sports shoes, headband`

### Mẹo để thay đồ được trong game

1. Cố định pose, cố định kích thước ảnh (ví dụ 768x1152), mọi nhân vật cùng một tư thế đứng thẳng.
2. Sinh **thân + đầu trần** trước (tóc tối giản).
3. Sinh từng món đồ trên **nền trong suốt** (tóc, áo, quần, giày, mũ) bằng cùng style prefix + `isolated clothing item only, no body`.
4. Cắt/xoá nền bằng công cụ xoá nền, căn lại cho khớp, đặt thành các lớp PNG; code ghép lớp theo thứ tự: tóc sau → thân → quần → áo → giày → đầu → tóc trước → phụ kiện.

### Nền (cảnh)

```
2D side-view game background, soft gradient shading, clean cel-shaded illustration, warm daylight, wide 16:9,
no characters, no text, empty walkable ground at the bottom, [mô tả cảnh: city park with fountain and cherry trees],
layered depth with distant buildings, harmonious pastel colors
```

## C. Gợi ý thứ tự làm

1. Gửi **prompt A** cho AI code để dựng khung Phaser + HUD.
2. Dùng **prompt B** tạo 1-2 nhân vật thử, chọn phong cách ưng ý rồi mới sinh cả bộ.
3. Khi có hình, nhờ AI code nạp vào game theo đúng tên file; chưa có hình thì dùng hình tạm.
