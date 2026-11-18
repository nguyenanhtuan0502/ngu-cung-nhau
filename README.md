# 🌙 Thành Phố Mộng Mơ

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/nguyenanhtuan0502/ngu-cung-nhau)

Game 2D nhiều người chơi: vào chung phòng, bật TV, mở nhạc, tắt đèn và cùng nhau đi ngủ.
Chơi được trên điện thoại và máy tính (chỉ cần trình duyệt).

## Chạy
```
python -m pip install -r requirements.txt
python server.py
```
Rồi mở http://localhost:8080 (hoặc bấm đúp `run.bat`).

Điện thoại dùng chung wifi: mở `http://<IP máy tính>:8080` (xem IP bằng `ipconfig`).
Lần đầu Windows hỏi tường lửa thì bấm **Allow**.

## Bản đồ thế giới
```
                       📚 Phòng học
 🛏️ Ký túc xá ──── 🌳 CÔNG VIÊN ──── 🎬 Rạp phim
         ┌──────────────┼──────────────┐
   🎣 Hồ câu cá    🛍️ Khu mua sắm    🎪 Khu vui chơi · 📈 Chứng khoán · 💞 Hẹn hò
                  🚪 Cổng vào (người mới xuất hiện ở đây)

 KHU RIÊNG của từng người: 🏠 Nhà của bạn · 🌾 Nông trại của bạn
```
**Đi lại bằng bản đồ:** không đi bộ xuyên cửa giữa các khu nữa. Mỗi khu có **một lối ra** (cửa / cổng);
đi tới đó, bấm 🗺️ hoặc phím **M** để mở bản đồ, chạm ghim nào là tới thẳng khu đó (mờ dần 0.4 giây).
Ghim hiện số người đang online.

**Ba loại khu:**
- **Khu chung** (công viên, phòng học, rạp phim, khu mua sắm, hồ câu cá, khu vui chơi, chứng khoán, hẹn hò): chia **kênh**, mỗi kênh tối đa 25 người,
  đầy thì tự mở kênh mới. Chạm ô 📍 trên cùng để đổi kênh. Link "Mời bạn" đưa bạn bè vào đúng kênh của bạn.
- **Ký túc xá**: vào theo **mã phòng** để ngủ cùng nhóm bạn (8 giường).
- **Khu riêng** (nhà riêng, nông trại): mỗi người một bản, gắn với tài khoản (đi thăm nhà bạn: bản sau).

**Tài khoản:** lần đầu vào game server tạo cho bạn một `playerId` + mã bí mật, trình duyệt chỉ giữ token đăng nhập.
Xu, chỉ số, túi đồ, tủ đồ, nông trại, nhà riêng đều lưu ở server (file `game.db`), đổi máy/xóa cache thì
dùng cùng trình duyệt để giữ token. Dữ liệu bản cũ trong trình duyệt được tự chuyển lên server ở lần vào đầu tiên.
- 🌾 **Nông trại**: 8 ô ruộng (cà rốt, cà chua, bắp, hướng dương, dưa hấu). Chạm ô đất để gieo → 💧 tưới →
  chờ lớn (thời gian thật) → thu hoạch. Bán cho 🧑‍🌾 Bác Năm. Có nhà kho, cối xay gió, giếng, gà, bò
- 🎣 **Hồ câu cá**: ngồi ghế đẩu bên bờ → 🎣 Câu cá → chọn mồi → thấy ❗ thì bấm KÉO thật nhanh.
  9 loại (có cá koi, cá nóc, rùa vàng hiếm). Mua mồi + bán cá ở quầy cô Lan
- 🛍️ **Khu mua sắm**: 5 cửa hàng (thời trang, phụ kiện, thú cưng, salon tóc, nội thất), mua vĩnh viễn hoặc
  thuê theo ngày; quầy thu ngân bán 🎫 vé số
- 🏠 **Nhà riêng** (ghim "Nhà của bạn" trên bản đồ): nhà của riêng bạn. 🛋️ Bày đồ nội thất,
  lật/cất đồ; server lưu theo tài khoản nên lần sau vào vẫn còn (nhà cũ theo mã phòng trong `homes.json`
  được chép sang nhà của bạn ở lần đầu vào nhà)
- 👗 **Tủ đồ**: tóc, màu tóc, áo, mũ, kính, phụ kiện cổ, cánh/lưng. Mọi người trong phòng đều thấy bạn mặc gì
- 🧑 **NPC**: Cụ Ba và Bé Na đi dạo công viên, Cô Mai (phòng học), Anh Kenji (quầy bắp), Bác Năm, Cô Lan, Chị Thu.
  Chạm vào để trò chuyện / mở quầy
- 🎉 **Sự kiện theo mùa** (sửa trong `SEASONS` ở data.js): Tết, Trung thu, Halloween, mùa thu, Giáng sinh.
  Thử nhanh: thêm `&season=xmas` vào link
- 🌳 **Công viên**: quảng trường có đài phun nước, 4 lối đi, ghế đá, hồ nhỏ, xe kem (phát nhạc),
  cây anh đào, cổng vào có bảng bản đồ; trời sáng/chiều/tối theo giờ trong game (đêm có đom đóm)
- 🛏️ **Ký túc xá**: 8 giường mỗi giường một họa tiết, thú bông, đèn ngủ nấm/trăng, rèm đầu giường,
  lò sưởi + ghế bành + bàn trà, cửa sổ có tuyết/mưa, dây đèn vàng; tắt đèn thì nhạc nhỏ và trầm dần,
  có tiếng lửa lách tách + đồng hồ tích tắc
- 📚 **Phòng học**: giá sách, bảng trắng, 3 dãy bàn x 2 hàng, góc đọc sách, Pomodoro chung,
  "đang học gì", bảng xếp hạng thời gian ngồi học
- 🎬 **Rạp phim kiểu Nhật**: phòng chiếu (màn lớn, ghế đánh số, luồng sáng máy chiếu, EXIT) +
  sảnh (poster, bảng giờ chiếu, máy bán vé, tờ rơi, quầy bắp, đồ lưu niệm, máy gắp thú, máy bán nước).
  Bật phim thì đèn tự tắt. TV/YouTube chỉ có ở đây.

- 🎪 **Khu vui chơi** (hội chợ ngoài trời, cổng bóng đèn, ngựa gỗ, vòng quay lớn):
  - 🎲 **Bầu cua tôm cá** (Anh Tí, bàn giữa): bàn chung cả kênh, đặt cược 20 giây → lắc bát → mở bát.
    Ô ra k con thì nhận lại cược + k lần cược. Cược 5–200 xu/phiên.
  - 🧸 **Máy gắp gấu** (trái): móc tự lắc, bấm GẮP đúng lúc. Gấu hạng C/B/A/S/S+ (bảng tỉ lệ công khai),
    trượt nhiều lần thì móc chặt hơn một chút. Gấu bán cho 🧸 Bác Gấu hoặc mang về nhà trang trí.
    Gắp được S/S+ thì cả kênh được thông báo.
  - 🎡 **Chị Hoa**: vòng quay miễn phí mỗi ngày + 🎫 xổ số 3 số, quay lúc **18:30 giờ VN** mỗi ngày.
  - 🍵 Thua tối đa 500 xu mỗi ngày; ở lâu 30 phút thì game nhắc nghỉ tay.
- 📈 **Khu chứng khoán ảo** (Cô Phương, Ông Tư, Anh phóng viên): 12 mã cổ phiếu hư cấu, giá đổi mỗi 5 giây
  theo tin tức trong game. Bảng điện khổng lồ, ngồi bàn giao dịch hoặc bấm 📈 Giao dịch: lệnh mua/bán ngay,
  lệnh chờ giá, danh mục lãi/lỗ, xếp hạng theo % lãi. Phí 0,15%, vốn tối đa theo cấp, không vay, không bán khống.
  **Chỉ là mô phỏng để học, không phải lời khuyên đầu tư thật.**
- 💞 **Khu hẹn hò** (phố đêm, hồ đèn hoa đăng, cầu đôi, cây anh đào, quán cà phê, tiệm hoa, photobooth):
  - 🛡️ An toàn trước: lần đầu vào phải chọn độ tuổi (chỉ 1 lần). **Dưới 16 tuổi không vào được**;
    chỉ ghép đôi cùng nhóm tuổi (16–17 với nhau, 18+ với nhau). Số điện thoại, email, link, Zalo/FB
    trong hồ sơ và chat ở khu này bị che thành ***. Có 🚫 Chặn và ⚠️ Báo cáo. Không chuyển xu qua hẹn hò.
  - Cô Duyên: tạo hồ sơ (bật/tắt, giới thiệu, sở thích) → xem người cùng kênh → ❤️ thả tim / 👋 chào.
    Cả hai cùng thả tim là **kết đôi** (tên hiện 💞).
  - Có đôi: 🌹 tặng hoa (15 xu), 🏮 thả đèn hoa đăng (5 xu, cả khu thấy), 📸 photobooth tải ảnh đôi.

## Cách chơi
- 🔍 **Độ gần camera** (⚙️ Cài đặt hoặc phím **+ / −**): Gần (mặc định, nhân vật to như game điện thoại) · Vừa · Xa (thấy nhiều cảnh)
Game chơi ở **màn hình ngang** cho cả điện thoại và máy tính (điện thoại cầm dọc sẽ hiện nhắc xoay ngang).

| Hành động | Điện thoại | Máy tính |
|---|---|---|
| Đi lại | cần ảo góc dưới trái, hoặc chạm sàn | ←→↑↓ / WASD, hoặc nhấp chuột |
| Tương tác vật gần nhất (ngồi, NPC, quầy…) | nút **E** góc dưới phải | phím **E** |
| Bản đồ | nút 🗺️ hoặc đi tới lối ra | phím **M** |
| Chat / biểu cảm | nút 💬 / 😊 | **Enter** / phím **1-6** |
| Đóng bảng | chạm ngoài bảng | **Esc** |
| Toàn màn hình | nút ⛶ (iPhone: "Thêm vào màn hình chính") | nút ⛶ |

- Chạm sàn để đi, chạm giường để ngủ, chạm sàn lần nữa để dậy
- Chạm TV / radio / công tắc đèn trên tường (hoặc dùng các nút bên dưới)
- TV, nhạc và đèn được đồng bộ cho cả phòng; âm lượng thì mỗi máy chỉnh riêng
- **YouTube**: mở 📺 TV hoặc 🎵 Nhạc → dán link YouTube → Phát. Cả phòng xem/nghe cùng lúc,
  ai tạm dừng thì mọi người cùng dừng. TV có nút "Xem to". Nếu điện thoại chặn tự phát,
  bấm nút "🔊 Chạm để phát cùng mọi người"
- **Thú cưng**: chọn mèo / chó / thỏ ở sảnh, nó đi theo bạn và ngủ cuối giường khi bạn ngủ.
  Phòng nào cũng có mèo Mun đi dạo, ngồi cạnh mọi người và leo lên giường ngủ cùng.
  Chạm vào thú cưng để vuốt ve (thả tim + kêu meo/gâu)
- Khi mọi người đều ngủ và đèn tắt sẽ hiện đồng hồ "ngủ cùng nhau"

## Cuộc sống ảo: chỉ số, xu, giờ trong game
- Thanh trên cùng: ⭐ cấp · 💰 xu · ⚡ năng lượng · 😊 vui vẻ · 📖 kiến thức. Chạm vào để xem chi tiết, túi đồ, đặt lại dữ liệu (gõ YES)
- 🕐 Giờ trong game = **giờ thật Việt Nam** (UTC+7, theo đồng hồ server): sáng từ 5:00, trưa 11:00, chiều 16:00, tối 18:30.
  Ngoài trời tự sáng/tối theo giờ thật. Thanh trên hiện giờ + thứ (vd `11:17 T4`) và % pin (máy hỗ trợ). Thử giờ khác: thêm `&gio=21:30` vào link
- 🪫 Tiết kiệm pin: pin ≤15% không sạc thì tự bật (30 FPS, bớt hiệu ứng), chỉnh trong ⚙️ Cài đặt
- 😴 Ngủ ở ký túc xá hồi năng lượng · 📚 ngồi học tăng kiến thức, tốn năng lượng · 🍿 xem phim, 🍦 ăn kem tăng vui vẻ
- 🌳 Công viên: chạm xe kem → mua kem/trà sữa/bắp nướng/bóng bay, 🎡 vòng quay may mắn (miễn phí 1 lần/ngày)
- 📚 Phòng học: 📝 bài kiểm tra trắc nghiệm 5 câu, đúng được xu + kiến thức
- 🎬 Rạp phim: mua vé mới ngồi ghế được; quầy bắp nước, máy bán nước, đồ lưu niệm, máy gắp thú đều dùng xu
- 🎁 Mỗi ngày (theo giờ Việt Nam) vào game +50 xu. Tiến trình lưu ở server theo tài khoản, tên kèm cấp độ hiện trên đầu cho mọi người
- 🔒 **Xu và đồ do server quản lý:** mọi lần mua/bán/thưởng đều do server kiểm tra (đủ xu, món có thật, đang ở đúng khu);
  kết quả may rủi (vòng quay, gắp thú, vé số, câu cá, thu hoạch) do server tung, đáp án bài kiểm tra chỉ server biết.
  Ngồi học được 1 xu/phút (cộng khi đứng dậy). Muốn đổi giá/phần thưởng: sửa `catalog.json` rồi khởi động lại server
- Chat tối đa 60 ký tự, server tự che từ cấm

## Đưa lên mạng (chơi với bạn ở xa)
Deploy lên Render.com / Railway / Fly.io dưới dạng Python web service:
- Build: `pip install -r requirements.txt`
- Start: `python server.py` (server tự đọc biến `PORT`)
- ⚠️ Dữ liệu người chơi nằm trong file `game.db`. Gói **free** của Render **xóa ổ đĩa mỗi lần khởi động lại/deploy**,
  nên tài khoản sẽ mất. Muốn giữ lâu dài: gắn ổ đĩa bền (Render Disk / Railway Volume / Fly Volume) và đặt biến
  môi trường `GAME_DB` trỏ vào ổ đó, ví dụ `GAME_DB=/data/game.db`

## Cấu trúc
- `server.py`: server WebSocket (tài khoản, kênh khu chung, phòng ký túc xá, khu riêng, giường, TV, nhạc, đèn, chat)
- `store.py`: lưu trữ SQLite (`game.db`): tài khoản, dữ liệu nhân vật, nhà riêng
- `economy.py`: kinh tế ở server (mua bán, thưởng, ruộng, câu cá, tủ đồ, rương)
- `catalog.json`: **bảng giá + phần thưởng + câu hỏi** (server dùng để kiểm tra; trình duyệt nhận qua `/static/catalog.js`, không kèm đáp án)
- `static/index.html`: toàn bộ game (canvas + nhạc tạo bằng WebAudio, không cần file âm thanh)
- `static/data.js`: dữ liệu hiển thị (giờ trong game, tốc độ tăng/giảm chỉ số, NPC, mùa lễ, tab tủ đồ)
- `static/life.js`: chỉ số nhân vật, giờ trong game, giao diện quầy hàng/kiểm tra/vé phim (gọi server qua `Life.eco`)
- `static/areas.js`: 4 khu mới, avatar ghép lớp, NPC, nông trại, câu cá, cửa hàng, tủ đồ, nhà riêng, sự kiện mùa
- `static/zones.js`: 3 khu vui chơi / chứng khoán / hẹn hò (cảnh vẽ, bảng bầu cua, máy gắp, xổ số, sàn giao dịch, hồ sơ hẹn hò, photobooth)
- `arcade.py`, `stock.py`, `dating.py`: luật chơi của 3 khu đó ở server (server tung xúc xắc, tính giá, kiểm tra tuổi, che thông tin cá nhân)
