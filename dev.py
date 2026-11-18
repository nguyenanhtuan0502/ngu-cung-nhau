"""Chạy game ở CHẾ ĐỘ PHÁT TRIỂN: sửa code là thấy ngay trên trình duyệt.

- Sửa file trong static/ (giao diện)      → trình duyệt tự tải lại, tự vào lại đúng khu đang đứng.
- Sửa file .py hoặc catalog.json (server)  → server tự khởi động lại, trình duyệt tự nối lại và tải bản mới.

Chạy:  python dev.py   (hoặc bấm đúp run.bat)
Lên mạng (Render) vẫn chạy server.py như cũ, không có chế độ này.
"""
import glob
import os
import subprocess
import sys
import time

ROOT = os.path.dirname(os.path.abspath(__file__))
ENV = dict(os.environ, DEV="1", PYTHONIOENCODING="utf-8")


def watched():
    files = glob.glob(os.path.join(ROOT, "*.py")) + [os.path.join(ROOT, "catalog.json"),
                                                     os.path.join(ROOT, "salon", "hair_catalog.json")]
    out = {}
    for f in files:
        try:
            out[f] = os.path.getmtime(f)
        except OSError:
            pass
    return out


def main():
    while True:
        started = time.time()
        proc = subprocess.Popen([sys.executable, "server.py"], cwd=ROOT, env=ENV)
        snap = watched()
        try:
            while True:
                time.sleep(0.5)
                if watched() != snap:
                    print("\n🔁 Server vừa được sửa → khởi động lại…\n", flush=True)
                    proc.terminate()
                    proc.wait()
                    break
                if proc.poll() is not None:                   # server tự dừng (thường do lỗi code)
                    if time.time() - started < 3:
                        time.sleep(1)                         # có thể cổng chưa nhả: thử lại
                        break
                    print("\n⚠️ Server bị lỗi và đã dừng. Sửa xong file là nó tự chạy lại.\n", flush=True)
                    while watched() == snap:
                        time.sleep(0.5)
                    break
        except KeyboardInterrupt:
            proc.terminate()
            return


if __name__ == "__main__":
    main()
