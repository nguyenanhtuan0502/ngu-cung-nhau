@echo off
cd /d %~dp0
python -m pip install -r requirements.txt --quiet
echo.
echo  Mo tren may tinh:  http://localhost:8080
echo  Mo tren dien thoai (cung wifi):  http://IP-may-tinh:8080
ipconfig | findstr /i "IPv4"
echo.
python server.py
pause
