@echo off
chcp 65001 >nul
title Data Agents - Game Server (Ngrok)

echo ============================================================
echo 🌐 DATA AGENTS GAME SERVER (NGROK ENABLED)
echo ============================================================
echo.

cd /d "%~dp0backend"

echo [1/4] Sanal ortamı kontrol ediliyor...
if not exist "venv\" (
    echo ❌ Sanal ortam bulunamadı!
    echo Sanal ortam oluşturuluyor...
    python -m venv venv
    echo ✅ Sanal ortam oluşturuldu
)

echo.
echo [2/4] Sanal ortam aktifleştiriliyor...
call venv\Scripts\activate.bat

echo.
echo [3/4] .env dosyası kontrol ediliyor...
if not exist ".env" (
    echo ❌ .env dosyası bulunamadı!
    echo .env.example kopyalanıyor...
    copy .env.example .env
    echo ✅ .env dosyası oluşturuldu
    echo.
    echo ⚠️  .env dosyasını düzenleyip NGROK_AUTH_TOKEN ekleyin!
    pause
    exit /b
)

echo.
echo [4/4] Game server başlatılıyor (Ngrok ile)...
echo.
echo ⚠️  Ngrok public URL console'da gösterilecek!
echo ⚠️  Bu URL ile hem oyuna hem de API'ye erişebilirsiniz.
echo.
echo ============================================================
echo Local URL:  http://127.0.0.1:5000
echo Public URL: Ngrok tarafından sağlanacak
echo ============================================================
echo.

set USE_NGROK=true
python app.py

pause
