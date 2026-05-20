@echo off
chcp 65001 >nul
title Data Agents - Frontend Server

echo ============================================================
echo 🎮 DATA AGENTS FRONTEND SERVER
echo ============================================================
echo.

cd /d "%~dp0"

echo [1/1] Frontend server başlatılıyor...
echo.
echo ============================================================
echo Frontend URL: http://127.0.0.1:5500
echo ============================================================
echo.
echo Oyunu başlatmak için browser'da şu adresi açın:
echo http://127.0.0.1:5500
echo.
echo Server'ı durdurmak için Ctrl+C tuşlarına basın.
echo.

python -m http.server 5500

pause
