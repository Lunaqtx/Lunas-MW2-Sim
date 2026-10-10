@echo off
title Rust Simulator
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js isn't installed yet.
  echo  1. Download the LTS version from https://nodejs.org and install it.
  echo  2. Run start.bat again.
  echo.
  pause
  exit /b
)
start "Rust Simulator server" cmd /k node server.js
timeout /t 2 >nul
start "" http://localhost:8080
where cloudflared >nul 2>nul
if errorlevel 1 (
  echo.
  echo  The server is running and the game opened in your browser.
  echo.
  echo  To let friends join over the internet, install the free Cloudflare tunnel once:
  echo      winget install --id Cloudflare.cloudflared
  echo  then close this window and run start.bat again.
  echo.
  pause
  exit /b
)
echo.
echo  Starting the internet tunnel. In the new window, look for a line like
echo      https://something-random.trycloudflare.com
echo  and send that link to your friends. It changes every time you start it.
echo.
start "Rust Simulator tunnel (share the trycloudflare.com link)" cmd /k cloudflared tunnel --url http://localhost:8080
pause
