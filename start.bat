@echo off
cd /d "%~dp0"
echo ============================================
echo   Guitar2Piano - starting...
echo ============================================
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js not found. Install from https://nodejs.org/
  pause
  exit /b 1
)
if not exist "node_modules" (
  echo [INFO] Installing dependencies, please wait...
  call npm install
)
echo.
echo Server: http://localhost:3000
echo Close this window to stop the server.
echo.
start "" http://localhost:3000
call npm run dev
pause
