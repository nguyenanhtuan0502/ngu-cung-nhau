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

## Một căn nhà, 3 khu thông nhau
Mỗi mã phòng là một căn nhà có **🛏️ phòng ngủ**, **📚 phòng học** và **🌳 công viên**.
Mỗi khu có 2 cửa (góc trái dưới / phải dưới) dẫn sang 2 khu còn lại.
Mỗi khu có TV, nhạc, đèn, hẹn giờ riêng.
- 🛏️ **Phòng ngủ**: giường, tắt đèn, ngủ cùng nhau
- 📚 **Phòng học**: bàn học có đèn + laptop, Pomodoro chung (25/5, 50/10…),
  ghi "đang học gì", bảng xếp hạng thời gian ngồi học
- 🌳 **Công viên**: ghế đá, hồ có vịt, màn chiếu phim ngoài trời (YouTube/kênh có sẵn),
  loa trên bàn picnic, nút ☀️/🌙 đổi ngày đêm (ban đêm có đom đóm, đèn đường)

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
