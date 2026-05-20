@echo off
chcp 65001 >nul
title Data Agents - Tüm Serverlar

echo ============================================================
echo 🚀 DATA AGENTS - TÜM SERVERLARI BAŞLAT
echo ============================================================
echo.

cd /d "%~dp0"

echo Backend ve Frontend serverlari başlatılıyor...
echo.
echo ⚠️  İki ayrı terminal penceresi açılacak:
echo    1. Backend Server (Port 5000)
echo    2. Frontend Server (Port 5500)
echo.
echo Her iki pencereyi de açık tutun!
echo.

timeout /t 2 >nul

echo [1/2] Backend server başlatılıyor...
start "Data Agents - Backend" cmd /k "%~dp0start_backend.bat"

timeout /t 2 >nul

echo [2/2] Frontend server başlatılıyor...
start "Data Agents - Frontend" cmd /k "%~dp0start_frontend.bat"

echo.
echo ============================================================
echo ✅ HER İKİ SERVER DA BAŞLATILDI!
echo ============================================================
echo.
echo Backend:  http://127.0.0.1:5000
echo Frontend: http://127.0.0.1:5500
echo.
echo Oyunu başlatmak için browser'da şu adresi açın:
echo http://127.0.0.1:5500
echo.
echo Serverlari durdurmak için her iki pencerede Ctrl+C basın.
echo.

pause
