# 🌙 Ngủ Cùng Nhau

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

## Bản đồ thế giới (công viên ở trung tâm)
```
                       📚 Phòng học
 🛏️ Ký túc xá ──── 🌳 CÔNG VIÊN ──── 🎬 Rạp phim
         ┌──────────────┼──────────────┐
   🌾 Nông trại    🎣 Hồ câu cá    🛍️ Khu mua sắm ── 🏠 Nhà riêng
                  🚪 Cổng vào (người mới xuất hiện ở đây)
```
- 🌾 **Nông trại**: 8 ô ruộng (cà rốt, cà chua, bắp, hướng dương, dưa hấu). Chạm ô đất để gieo → 💧 tưới →
  chờ lớn (thời gian thật) → thu hoạch. Bán cho 🧑‍🌾 Bác Năm. Có nhà kho, cối xay gió, giếng, gà, bò
- 🎣 **Hồ câu cá**: ngồi ghế đẩu bên bờ → 🎣 Câu cá → chọn mồi → thấy ❗ thì bấm KÉO thật nhanh.
  9 loại (có cá koi, cá nóc, rùa vàng hiếm). Mua mồi + bán cá ở quầy cô Lan
- 🛍️ **Khu mua sắm**: 5 cửa hàng (thời trang, phụ kiện, thú cưng, salon tóc, nội thất), mua vĩnh viễn hoặc
  thuê theo ngày; quầy thu ngân bán 🎫 vé số
- 🏠 **Nhà riêng** (cửa trái khu mua sắm): nhà chung của cả nhóm cùng mã phòng. 🛋️ Bày đồ nội thất,
  lật/cất đồ; server lưu lại vào `homes.json` nên lần sau vào vẫn còn
- 👗 **Tủ đồ**: tóc, màu tóc, áo, mũ, kính, phụ kiện cổ, cánh/lưng. Mọi người trong phòng đều thấy bạn mặc gì
- 🧑 **NPC**: Cụ Ba và Bé Na đi dạo công viên, Cô Mai (phòng học), Anh Kenji (quầy bắp), Bác Năm, Cô Lan, Chị Thu.
  Chạm vào để trò chuyện / mở quầy
- 🎉 **Sự kiện theo mùa** (sửa trong `SEASONS` ở data.js): Tết, Trung thu, Halloween, mùa thu, Giáng sinh.
  Thử nhanh: thêm `&season=xmas` vào link
Các khu không nối thẳng với nhau, muốn đi đâu cũng phải qua công viên. Bấm 🗺️ để mở bản đồ và tự đi tới khu bất kỳ.
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

## Cách chơi
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
- 🕐 Giờ trong game: 1 ngày = 24 phút thật, cả phòng chung một giờ. Công viên tự sáng/chiều/tối theo giờ
- 😴 Ngủ ở ký túc xá hồi năng lượng · 📚 ngồi học tăng kiến thức, tốn năng lượng · 🍿 xem phim, 🍦 ăn kem tăng vui vẻ
- 🌳 Công viên: chạm xe kem → mua kem/trà sữa/bắp nướng/bóng bay, 🎡 vòng quay may mắn (miễn phí 1 lần/ngày)
- 📚 Phòng học: 📝 bài kiểm tra trắc nghiệm 5 câu, đúng được xu + kiến thức
- 🎬 Rạp phim: mua vé mới ngồi ghế được; quầy bắp nước, máy bán nước, đồ lưu niệm, máy gắp thú đều dùng xu
- 🎁 Mỗi ngày vào game +50 xu. Tiến trình lưu trên máy (localStorage), tên kèm cấp độ hiện trên đầu cho cả phòng
- Chat tối đa 60 ký tự, server tự che từ cấm

## Đưa lên mạng (chơi với bạn ở xa)
Deploy lên Render.com / Railway / Fly.io dưới dạng Python web service:
- Build: `pip install -r requirements.txt`
- Start: `python server.py` (server tự đọc biến `PORT`)

## Cấu trúc
- `server.py`: server WebSocket (phòng, giường, TV, nhạc, đèn, chat)
- `static/index.html`: toàn bộ game (canvas + nhạc tạo bằng WebAudio, không cần file âm thanh)
- `static/data.js`: dữ liệu (giá đồ, câu hỏi kiểm tra, vòng quay, tốc độ tăng/giảm chỉ số, giờ trong game)
- `static/life.js`: hệ thống chỉ số, xu, giờ trong game, lưu game, rương đồ, kiểm tra, vé phim
- `static/areas.js`: 4 khu mới, avatar ghép lớp, NPC, nông trại, câu cá, cửa hàng, tủ đồ, nhà riêng, sự kiện mùa
