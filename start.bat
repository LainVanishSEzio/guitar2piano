@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ============================================
echo   Guitar2Piano - starting...
echo ============================================

set "MAJ="
set "NODEDIR="

rem --- 1) node already on PATH and new enough? ---
for /f "tokens=1 delims=v." %%v in ('node -v 2^>nul') do set "MAJ=%%v"
if defined MAJ if !MAJ! GEQ 18 goto ready

rem --- 2) common install locations ---
call :probe "%ProgramFiles%\nodejs"
if defined NODEDIR goto ready
call :probe "%LocalAppData%\Programs\nodejs"
if defined NODEDIR goto ready
call :probe "C:\nodejs"
if defined NODEDIR goto ready

rem --- 3) bundled runtime ---
for /d %%d in ("%USERPROFILE%\.workbuddy\binaries\node\versions\*") do call :probe "%%~d"

if defined NODEDIR goto ready

echo.
echo [ERROR] Node.js 18+ not found. Detected version: %MAJ%
echo         Install the LTS build from https://nodejs.org/ and run this again.
echo.
pause
exit /b 1

:ready
if not "%NODEDIR%"=="" set "PATH=%NODEDIR%;%PATH%"
for /f "tokens=*" %%v in ('node -v') do set "NV=%%v"
for /f "tokens=*" %%v in ('npm -v') do set "NPMV=%%v"
echo Node %NV%  /  npm %NPMV%

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
exit /b 0

:probe
set "CAND=%~1"
if not exist "%CAND%\node.exe" exit /b 1
set "TMAJ="
for /f "tokens=1 delims=v." %%v in ('"%CAND%\node.exe" -v 2^>nul') do set "TMAJ=%%v"
if not defined TMAJ exit /b 1
if %TMAJ% LSS 18 exit /b 1
set "NODEDIR=%CAND%"
exit /b 0
