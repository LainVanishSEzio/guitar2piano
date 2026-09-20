@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================
echo   Guitar2Piano  启动中...
echo ============================================

where node >nul 2>nul
if errorlevel 1 (
    echo [错误] 没找到 Node.js，请先安装：https://nodejs.org/
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [提示] 首次运行，正在安装依赖（约需几分钟，请耐心等待）...
    call npm install
)

echo.
echo 启动开发服务器，浏览器会自动打开 http://localhost:3000
echo 关闭此黑窗口 = 停止服务
echo.

start "" http://localhost:3000
call npm run dev
pause
