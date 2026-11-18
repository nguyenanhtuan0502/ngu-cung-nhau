# AVATAR LIFE – Game cuộc sống ảo 2D cho cộng đồng

> File đặc tả để AI (Claude) vibe code. Hãy đọc hết file, sau đó làm TỪNG GIAI ĐOẠN ở mục 9. Xong mỗi giai đoạn thì dừng lại, hướng dẫn mình chạy thử, đợi mình xác nhận rồi mới làm tiếp.

---

## 0. Quy tắc làm việc dành cho AI
- Mình là người mới, hãy giải thích ngắn gọn bằng tiếng Việt, code có comment tiếng Việt.
- Không viết toàn bộ game trong một lần. Làm đúng giai đoạn được yêu cầu.
- Chưa có ảnh thật: mọi hình ảnh dùng **placeholder vẽ bằng code** (hình khối, màu, emoji) nhưng phải đặt đúng vị trí, đúng kích thước, đúng tên để sau này thay bằng sprite mà không sửa logic.
- Giữ code gọn, chia file rõ ràng, dữ liệu (đồ vật, quần áo, vị trí) để trong file `data/`, không viết cứng trong scene.
- Không dùng tên, hình ảnh, âm thanh gốc của game Avatar của TeaMobi hay bất kỳ game có bản quyền nào. Mọi thứ phải là nội dung gốc.
- Sau mỗi giai đoạn: liệt kê file đã tạo/sửa, cách chạy, danh sách kiểm tra "chạy được chưa".

---

## 1. Tổng quan
- Thể loại: game xã hội cộng đồng "cuộc sống ảo" 2D, lấy cảm hứng từ các game avatar chibi kiểu cũ.
- Góc nhìn: **side-view 2D**. Mỗi khu vực là một "căn phòng cắt ngang" như nhà búp bê: nền phía sau, nhân vật đi trái-phải trên một đường sàn phẳng, đồ vật đặt ở nền sau và hai bên.
- Nền tảng: chạy trên trình duyệt, dùng được cả máy tính và điện thoại, nhẹ, cấu hình thấp vẫn chơi được.
- Phong cách: hoạt hình dễ thương (chibi), nét viền mềm, màu pastel ấm, bóng nhẹ. Không khí thân thiện, thư giãn.
- Cộng đồng: nhiều người chơi cùng xuất hiện trong một khu, chat bằng bong bóng, kết bạn, đến nhà nhau. (Online ở Giai đoạn 8, các giai đoạn trước chạy offline một người với NPC giả lập.)

---

## 2. Công nghệ
- Ngôn ngữ: JavaScript (ES modules).
- Engine: **Phaser 3** (bản mới nhất ổn định, tải qua npm hoặc CDN).
- Build: **Vite** nếu dùng npm (khuyến nghị), hoặc mở thẳng `index.html` với Live Server nếu dùng CDN. AI hãy chọn cách đơn giản nhất cho người mới và nói rõ lệnh chạy.
- Lưu dữ liệu offline: `localStorage`.
- Online (Giai đoạn 8): Node.js + Express + Socket.IO. Database: SQLite hoặc JSON file lúc đầu.
- Độ phân giải thiết kế: **1280 x 720**, scale kiểu FIT, canh giữa, hỗ trợ cảm ứng.

---

## 3. Cấu trúc thư mục
```
avatar-life/
├─ index.html
├─ package.json
├─ src/
│  ├─ main.js                 # khởi tạo Phaser, danh sách scene
│  ├─ config.js               # hằng số: kích thước, tốc độ, sàn, giờ trong game
│  ├─ scenes/
│  │  ├─ BootScene.js         # tạo placeholder texture, tải asset
│  │  ├─ ParkScene.js
│  │  ├─ DormScene.js         # phòng ngủ chung
│  │  ├─ ClassroomScene.js
│  │  ├─ CinemaLobbyScene.js
│  │  ├─ CinemaHallScene.js
│  │  ├─ FarmScene.js
│  │  ├─ FishingScene.js
│  │  ├─ MallScene.js
│  │  ├─ HomeScene.js         # nhà riêng
│  │  └─ UIScene.js           # HUD chạy chồng lên mọi scene
│  ├─ entities/
│  │  ├─ Avatar.js            # nhân vật, lớp ghép đồ
│  │  ├─ Npc.js
│  │  └─ Interactable.js      # vật thể tương tác được
│  ├─ systems/
│  │  ├─ TimeSystem.js        # đồng hồ, sáng/chiều/tối
│  │  ├─ LightingSystem.js    # lớp ánh sáng, bật/tắt đèn
│  │  ├─ AudioSystem.js       # nhạc nền mỗi khu
│  │  ├─ ChatSystem.js        # bong bóng chat, emote
│  │  ├─ InventorySystem.js   # rương đồ
│  │  ├─ SaveSystem.js        # localStorage
│  │  └─ SceneTransition.js   # cửa, hiệu ứng mờ dần
│  ├─ ui/
│  │  ├─ Hud.js, Dialog.js, Menu.js, WardrobePanel.js, ShopPanel.js, MapPanel.js
│  └─ data/
│     ├─ scenes.js            # layout từng khu: đồ vật, cửa, NPC
│     ├─ items.js             # danh mục đồ (quần áo, trang trí, mồi câu, hạt giống)
│     ├─ movies.js            # phim giả lập
│     └─ crops.js, fish.js
├─ public/assets/             # ảnh, âm thanh (để trống lúc đầu)
└─ server/                    # Giai đoạn 8
```

---

## 4. Bản đồ thế giới
Công viên là trung tâm. Các khu nối ra xung quanh qua cửa/biển chỉ đường. Các khu không nối trực tiếp nhau, muốn đi từ khu này sang khu kia phải qua công viên (để công viên luôn đông người).

```
                 [ PHÒNG HỌC ]
                       │
 [ KÝ TÚC XÁ ] ── [ CÔNG VIÊN ] ── [ RẠP CHIẾU PHIM ]
                       │
        ┌──────────────┼──────────────┐
   [ NÔNG TRẠI ]  [ HỒ CÂU CÁ ]  [ KHU MUA SẮM ]
                       │
                  [ CỔNG VÀO ]  (người chơi mới xuất hiện)
```

- Nhà riêng (HomeScene): vào từ menu bản đồ hoặc từ cửa nhà trong khu mua sắm/công viên, mỗi người chơi có một nhà.
- Bản đồ mini (MapPanel): nút trên HUD, bấm vào khu nào thì dịch chuyển đến cổng của khu đó (có hiệu ứng mờ).
- Mọi chuyển cảnh: mờ dần 0.4s, avatar xuất hiện ở cửa tương ứng.

---

## 5. Avatar
### Ngoại hình
- Chibi: đầu to, thân nhỏ, mắt to. Chiều cao khoảng 120px trong khung 1280x720.
- Nam/nữ, tùy chỉnh: kiểu tóc, màu tóc, màu da, mắt, mặt, miệng, lông mày.
- Ghép lớp (layer) theo thứ tự từ dưới lên: thân → quần/váy → giày → áo → mặt → tóc → mũ → kính → phụ kiện cổ → cánh. Mỗi lớp là một texture riêng để dễ thay đồ.
- Thú cưng đi theo sau avatar (lớp riêng, có animation đơn giản).
- Trên đầu: tên avatar + cấp độ. Khi chat: bong bóng chữ hiện 4 giây rồi mờ dần.

### Hoạt ảnh (animation)
`idle`, `walk` (trái/phải, dùng flip), `sit`, `sleep`, `wave`, `laugh`, `cry`, `surprise`, `dance`. Placeholder: nhấp nhô/xoay nhẹ bằng tween.

### Di chuyển
- Phím mũi tên/A-D để đi trái-phải, nhấp/chạm vào sàn để đi đến vị trí đó.
- Đường sàn của mỗi khu cố định (ví dụ y = 580), avatar chỉ đi trái-phải.
- Đi gần cửa hoặc vật thể thì hiện gợi ý "Nhấn E" / nút cảm ứng.

---

## 6. Mô tả chi tiết từng khu vực (nội dung và quang cảnh)

Chung cho mọi khu: bố cục theo trục ngang, nền sau (background) → đồ vật giữa → sàn (floor) → đồ vật mặt tiền (foreground). Ánh sáng và nền trời đổi theo giờ trong game (xem mục 7). Mỗi khu có nhạc nền riêng và âm thanh môi trường.

### 6.1 Công viên (ParkScene) – trung tâm
- Nền trời xanh có mây trôi chậm, đồi xa mờ, hàng cây phía sau.
- Sàn: bãi cỏ xen lối đi lát đá uốn lượn.
- Giữa màn hình: đài phun nước tròn, nước bắn lấp lánh (particle).
- Hai bên: ghế đá, ghế gỗ, bàn picnic, thùng rác hình thú, đèn đường cổ điển, bụi hoa nhiều màu.
- Phía sau: hồ nhỏ có vịt bơi và cầu gỗ cong, sân chơi (xích đu, cầu trượt, bập bênh), sân khấu ngoài trời nhỏ có dây đèn.
- Dọc đường: xe kem, xe trà sữa, quầy bắp nướng, mỗi quầy có mái sọc màu và đèn lồng.
- Hiệu ứng: cánh hoa/lá bay, chim và bướm bay ngang, đàn cá koi dưới hồ.
- Cửa/biển chỉ đường: mép trái → Ký túc xá, mép phải → Rạp phim, mép trên (cổng/nền) → Phòng học, mép dưới → Cổng vào, các lối phụ → Nông trại, Hồ câu cá, Khu mua sắm.
- Ban đêm: đèn đường và đèn dây bật, đom đóm, trời sao.

### 6.2 Ký túc xá / Phòng ngủ chung (DormScene)
- Căn phòng ấm cúng như homestay gác mái. Tường ốp gỗ nửa dưới, nửa trên sơn kem hoặc hồng đất. Sàn gỗ màu mật ong, thảm len hình tròn và chữ nhật. Trần thấp có xà gỗ, dây đèn vàng nhỏ treo dọc trần.
- **8 giường** xếp hàng ngang (4 giường trên sàn + 4 giường ở tầng trên, hoặc 8 giường ngang tùy bố cục). Mỗi giường: khung gỗ, nệm dày, chăn gối một màu và họa tiết riêng (sao, mây, trăng, gấu, mèo, hoa, chấm bi, sọc), thú bông, tủ đầu giường có đèn ngủ hình nấm/mặt trăng, ly nước, sách. Rèm vải mỏng ở đầu giường.
- Giữa phòng: lò sưởi giả lửa (lửa cam nhấp nháy), hai ghế bành len, bàn trà nhỏ với ấm trà bốc khói.
- Khác: kệ sách thấp, cây xanh trong chậu, nến thơm, đèn muối cam, đài radio/đĩa than, poster, ảnh polaroid ghim dây, đèn lồng giấy, thú nhỏ (mèo/chó) ngủ trên thảm.
- Cửa sổ vòm lớn nhìn ra bầu trời đêm có trăng sao, thỉnh thoảng mưa hoặc tuyết nhẹ, bệ cửa có đệm ngồi.
- **Công tắc đèn** cạnh cửa:
  - Bật: đèn trần vàng ấm, đèn ngủ từng giường, ánh lửa lò sưởi.
  - Tắt: phòng tối xanh lam đêm, chỉ còn ánh trăng, dây đèn mờ, đèn ngủ nhỏ. Nhạc chuyển chậm, trầm, nhỏ dần.
- Avatar đang ngủ: nằm trên giường, chăn nhấp nhô theo nhịp thở, "Zzz" nổi lên chậm. Mỗi giường chỉ một người, giường có người thì hiện tên và không cho nằm thêm.
- **Âm thanh**: nhạc lo-fi/piano/nhạc hộp ru ngủ phát nhỏ liên tục, thêm lửa tí tách, mưa nhẹ, tiếng gió, đồng hồ tích tắc.

### 6.3 Phòng học (ClassroomScene)
- Lớp sáng sủa, tường vàng nhạt và xanh mint, trần cao có đèn treo.
- Nền sau: bảng xanh lớn có chữ và hình vẽ phấn, màn hình trình chiếu, bàn giáo viên (quả địa cầu, bình hoa, chồng vở), bản đồ thế giới, bảng chữ cái, nội quy, đồng hồ treo tường, bảng vinh danh.
- Giữa: 10-12 bộ bàn ghế học sinh xếp hàng ngang, trên bàn có sách và bút.
- Cuối lớp: góc đọc sách với kệ cao, ghế bành, thảm tròn, đèn đứng.
- Cửa sổ lớn nhìn ra sân trường, rèm nhẹ, nắng chiếu xiên tạo vệt sáng trên sàn. Cây xanh trên bệ cửa. Tủ sách ở góc lớp.
- NPC: giáo viên đứng cạnh bảng.

### 6.4 Rạp chiếu phim phong cách Nhật
**CinemaLobbyScene (sảnh)**
- Mặt tiền: biển neon dọc và ngang nhiều màu, poster phim lớn (phim hư cấu tự đặt tên), rèm noren ngắn, đèn lồng giấy đỏ, chậu cây, một cây anh đào cạnh lối vào. Ban đêm biển neon sáng rực, mặt đường ướt nhẹ phản chiếu ánh đèn.
- Sảnh: sàn gạch bóng hoặc thảm tối họa tiết, bảng giờ chiếu điện tử, hàng máy bán vé tự động, quầy vé có nhân viên NPC cúi chào, kệ tờ rơi phim (mỗi phim một ngăn), ghế chờ da dài, máy gắp thú, máy bán nước tự động phát sáng.
- Quầy bắp nước: menu bảng đèn (bắp mặn, caramel, bơ, trà xanh), combo cốc in hình phim. Kệ đồ lưu niệm: móc khóa, standee, áp phích, mô hình mini, hộp bánh theo phim. Góc chụp ảnh với phông nền phim và biển đếm ngược ngày công chiếu.

**CinemaHallScene (phòng chiếu)**
- Tường bọc vải tối/nhung đỏ đậm hoặc tím, sàn thảm xanh đen họa tiết nhỏ, đèn lối đi nhỏ ở bậc thang.
- Màn hình khổng lồ ở nền sau, rèm gấp hai bên.
- Hơn 40 ghế êm xếp bậc thang, mỗi ghế có số hàng/số ghế, giá để cốc; hàng cuối có ghế đôi.
- Luồng sáng từ phòng máy chiếu xuyên qua bóng tối, hạt bụi lấp lánh. Biển EXIT xanh lục hai bên.
- Trước giờ chiếu: quảng cáo phim sắp chiếu rồi đèn tắt dần. Khi chiếu: phòng chuyển ánh xanh lam nhấp nháy theo màn hình, avatar ngồi thành bóng nhỏ trước ánh sáng. Hết phim đèn sáng dần.
- Nhạc nền sảnh: nhạc phim nhẹ, chuông báo giờ chiếu.

### 6.5 Nông trại (FarmScene)
- Nền trời trong, đồng quê xa mờ, cối xay gió nhỏ quay chậm.
- Sàn đất nâu, các ô luống đất 6-8 ô xếp hàng ngang, hàng rào gỗ trắng, nhà kho đỏ, giếng nước, bù nhìn rơm, thùng gỗ, xe cút kít.
- Cây trồng nhiều giai đoạn (hạt → mầm → lớn → chín): cà rốt, cà chua, bắp, dưa hấu, hoa hướng dương.
- Chuồng gà, chuồng bò, gà con đi lại, bướm bay.

### 6.6 Hồ câu cá (FishingScene)
- Bờ hồ có cầu gỗ dài, mặt hồ phản chiếu bầu trời, hoàng hôn cam hồng, lau sậy, hoa sen, chuồn chuồn.
- Dưới nước: đàn cá nhiều loại bơi qua lại (placeholder hình bầu dục màu khác nhau), vòng sóng khi thả mồi.
- Có cần câu, xô cá, ghế xếp, quầy bán mồi nhỏ.

### 6.7 Khu mua sắm (MallScene)
- Trung tâm thương mại sáng đèn, sàn bóng, biển hiệu cửa hàng: quần áo, phụ kiện, thú cưng, tiệm cắt tóc, đồ trang trí nhà.
- Kệ trưng bày sáng đèn, ma-nơ-canh mặc đồ, quầy thu ngân NPC.

### 6.8 Nhà riêng (HomeScene)
- Một căn phòng trống ban đầu (tường kem, sàn gỗ), người chơi tự đặt: giường, sofa, bàn, tranh, cây, thảm, đèn, tủ.
- Chủ nhà có thể cho bạn bè vào thăm. Có cửa ra công viên.
- Lưu vị trí từng món đồ vào dữ liệu người chơi.

---

## 7. Hệ thống thời gian và ánh sáng
- Đồng hồ trong game chạy nhanh: 1 ngày game = 24 phút thật (có thể chỉnh trong `config.js`). Hoặc dùng giờ thật của máy.
- 4 giai đoạn: **sáng** (nắng vàng nhạt), **trưa** (sáng trong), **chiều** (cam hồng), **tối** (xanh thẫm, trăng sao). Chuyển mượt bằng cách đổi màu overlay và màu nền trời.
- `LightingSystem`: phủ một lớp tối lên màn hình, các nguồn sáng (đèn đường, đèn ngủ, lò sưởi, đèn neon) "khoét" vùng sáng quanh chúng. Phòng trong nhà có công tắc riêng bật/tắt.
- Sự kiện theo mùa (Tết, Trung thu, Giáng sinh, Halloween): đổi trang trí công viên và sảnh rạp qua file cấu hình, không sửa code scene.

---

## 8. Hệ thống phụ trợ
### 8.1 HUD (UIScene, chạy chồng lên mọi scene)
- Góc trên trái: ảnh đại diện nhỏ, tên, cấp độ, tiền (xu).
- Góc trên phải: đồng hồ trong game + biểu tượng sáng/tối, nút bản đồ, nút tủ đồ, nút rương, nút bạn bè, nút cài đặt (âm lượng).
- Dưới: ô chat (nhập chữ) + nút emote.
- Trên điện thoại: nút di chuyển ảo (trái/phải), nút tương tác "E".

### 8.2 Chat và cảm xúc
- Gõ chữ → bong bóng trên đầu avatar 4 giây. Giới hạn 60 ký tự, lọc từ cấm cơ bản.
- Bảng emote: cười, khóc, ngạc nhiên, vẫy tay, nhảy múa.

### 8.3 Tủ đồ thời trang (WardrobePanel)
- Tab: tóc, mặt, áo, quần/váy, giày, mũ, kính, cánh, thú cưng.
- Xem trước trên avatar ngay khi chọn. Đồ có loại **theo ngày** và **vĩnh viễn**.

### 8.4 Rương đồ (InventorySystem)
- Chia tab: đồ mặc, đồ trang trí, mồi câu, hạt giống, vé số. Mồi và vé số xếp chồng theo số lượng.
- Xóa đồ vĩnh viễn phải gõ chữ "YES" để xác nhận.

### 8.5 Kinh tế
- Đơn vị tiền: xu. Kiếm từ bán nông sản, bán cá, nhiệm vụ ngày, vòng quay may mắn.
- Tiêu: mua đồ thời trang, đồ trang trí nhà, mồi, hạt giống, vé phim, bắp nước.
- Giá và danh mục để trong `data/items.js`.

### 8.6 Mini-hoạt động (mỗi khu một vài tương tác)
- Ký túc xá: nằm ngủ (hồi năng lượng), tắt/bật đèn.
- Công viên: ngồi ghế, trò chuyện NPC, mua kem/trà sữa, vòng quay may mắn.
- Phòng học: học bài bằng câu hỏi trắc nghiệm đơn giản, nhận điểm kiến thức và xu.
- Rạp phim: mua vé (trừ xu), chọn ghế đúng số, ngồi xem phim (đoạn chiếu giả lập), mua bắp nước.
- Nông trại: gieo hạt, tưới, thu hoạch theo thời gian thực.
- Hồ câu cá: thả mồi, chờ cá cắn, bấm đúng lúc để kéo cá.
- Mua sắm: mua đồ, thử đồ.
- Nhà riêng: đặt/xoay/cất đồ trang trí, mời bạn.

### 8.7 Chỉ số nhân vật (đơn giản)
Năng lượng, Vui vẻ, Kiến thức, Xu. Thanh hiển thị trên HUD, hành động làm thay đổi chỉ số. Ngủ hồi năng lượng, học tốn năng lượng nhưng tăng kiến thức, xem phim tốn xu nhưng tăng vui vẻ.

### 8.8 Lưu dữ liệu (SaveSystem)
Lưu vào `localStorage`: ngoại hình, đồ đang có, tiền, chỉ số, nhà riêng, tiến độ nông trại, vị trí/scene hiện tại. Có nút "Đặt lại dữ liệu".

---

## 9. Lộ trình làm theo giai đoạn (BẮT BUỘC làm lần lượt)

**Giai đoạn 1 – Khung dự án + Avatar + Công viên**
- Dựng dự án Phaser, BootScene tạo placeholder texture, ParkScene với nền, sàn, đài phun nước, ghế đá.
- Avatar placeholder đi trái-phải bằng phím và chạm, animation idle/walk, camera theo avatar nếu phòng rộng hơn màn hình.
- Tiêu chí hoàn thành: mở trình duyệt thấy công viên, điều khiển được avatar, chạy mượt.

**Giai đoạn 2 – Chuyển cảnh và Ký túc xá**
- SceneTransition (mờ dần), cửa/biển chỉ đường, DormScene với 8 giường.
- Nằm ngủ trên giường, công tắc đèn bật/tắt (LightingSystem), nhạc nền ru ngủ.
- Tiêu chí: đi từ công viên vào phòng ngủ, ngủ được, tắt đèn thấy phòng tối xanh.

**Giai đoạn 3 – Phòng học và Rạp chiếu phim**
- ClassroomScene, CinemaLobbyScene, CinemaHallScene theo mô tả mục 6.3-6.4.
- Mua vé, chọn ghế, xem đoạn phim giả lập, ánh sáng đổi khi chiếu.

**Giai đoạn 4 – HUD, thời gian, lưu game**
- UIScene, TimeSystem, bản đồ mini, chat bong bóng, emote, SaveSystem.

**Giai đoạn 5 – Thời trang và rương đồ**
- WardrobePanel, hệ thống layer avatar, InventorySystem, ShopPanel, MallScene.

**Giai đoạn 6 – Nông trại và Hồ câu cá**
- FarmScene (gieo, tưới, thu hoạch), FishingScene, bán nông sản/cá lấy xu.

**Giai đoạn 7 – Nhà riêng, NPC, sự kiện mùa**
- HomeScene đặt đồ trang trí, NPC đi lại, trang trí theo mùa.

**Giai đoạn 8 – Online cho cộng đồng**
- Server Node + Socket.IO: đăng nhập tên, đồng bộ vị trí avatar trong mỗi khu, chat chung, danh sách bạn, đến thăm nhà bạn, mỗi giường ký túc xá chỉ một người.
- Lưu tài khoản vào database, chống spam chat, lọc từ cấm, báo cáo người chơi.

**Giai đoạn 9 – Hoàn thiện**
- Thay placeholder bằng sprite thật, thêm âm thanh, tối ưu hiệu năng trên điện thoại, dọn code, viết README hướng dẫn chạy.

---

## 10. Yêu cầu chất lượng
- 60 FPS trên máy yếu, tránh quá nhiều particle (giới hạn ~50 mỗi khu).
- Tất cả vị trí đồ vật lấy từ `data/scenes.js`, đổi layout không cần sửa scene.
- Mỗi scene có hàm `shutdown()` dọn tween, timer, listener để không rò bộ nhớ.
- Giao diện chữ hỗ trợ tiếng Việt có dấu (font hỗ trợ Unicode).
- Chat và tên người chơi phải được lọc/escape để tránh chèn mã.

---

## 11. Bắt đầu
Hãy bắt đầu từ **Giai đoạn 1**: nói rõ lệnh cài đặt và chạy, liệt kê file sẽ tạo, viết code đầy đủ, rồi hướng dẫn mình kiểm tra theo "Tiêu chí hoàn thành".