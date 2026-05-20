@echo off
chcp 65001 >nul
title Data Agents - Backend Server

echo ============================================================
echo 🚀 DATA AGENTS BACKEND SERVER
echo ============================================================
echo.

cd /d "%~dp0backend"

echo [1/3] Sanal ortamı kontrol ediliyor...
if not exist "venv\" (
    echo ❌ Sanal ortam bulunamadı!
    echo Sanal ortam oluşturuluyor...
    python -m venv venv
    echo ✅ Sanal ortam oluşturuldu
)

echo.
echo [2/3] Sanal ortam aktifleştiriliyor...
call venv\Scripts\activate.bat

echo.
echo [3/3] Backend server başlatılıyor...
echo.
echo ============================================================
echo Backend URL: http://127.0.0.1:5000
echo ============================================================
echo.

python app.py

pause
