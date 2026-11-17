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
                 [BẮC] 📚 Phòng học
[TÂY] 🛏️ Ký túc xá ── 🌳 CÔNG VIÊN ── 🎬 Rạp phim [ĐÔNG]
                 [NAM] 🚪 Cổng vào (người mới xuất hiện ở đây)
```
Các khu không nối thẳng với nhau, muốn đi đâu cũng phải qua công viên. Bấm 🗺️ để mở bản đồ và tự đi tới khu bất kỳ.
- 🌳 **Công viên**: quảng trường có đài phun nước, 4 lối đi, ghế đá, hồ nhỏ, xe kem (phát nhạc),
  cây anh đào, cổng vào có bảng bản đồ; chạm mặt trời/mặt trăng đổi ngày đêm (đêm có đom đóm)
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

## Đưa lên mạng (chơi với bạn ở xa)
Deploy lên Render.com / Railway / Fly.io dưới dạng Python web service:
- Build: `pip install -r requirements.txt`
- Start: `python server.py` (server tự đọc biến `PORT`)

## Cấu trúc
- `server.py`: server WebSocket (phòng, giường, TV, nhạc, đèn, chat)
- `static/index.html`: toàn bộ game (canvas + nhạc tạo bằng WebAudio, không cần file âm thanh)
