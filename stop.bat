@echo off
cd /d "%~dp0"
set PORT=3000
echo ============================================
echo   Guitar2Piano - stopping...
echo ============================================
set FOUND=0
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%PORT% ^| findstr LISTENING') do (
  echo Killing PID %%a on port %PORT%
  taskkill /F /PID %%a >nul 2>nul
  set FOUND=1
)
if "%FOUND%"=="0" (
  echo [INFO] No server running on port %PORT%.
) else (
  echo [DONE] Server stopped.
)
echo.
pause
