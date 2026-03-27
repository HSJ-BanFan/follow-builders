@echo off
chcp 65001 >nul
echo [INFO] ========== Daily Data Sync ==========
echo [INFO] 时间: %date% %time%
echo [INFO] 当前目录: %~dp0
cd /d "%~dp0"

echo [INFO] 检查 Git...
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] 未找到 Git！请确保 Git 已安装
    pause
    exit /b 1
)

echo [INFO] 正在执行 git pull...
git pull origin main
if %errorlevel% neq 0 (
    echo [ERROR] 同步失败！错误码: %errorlevel%
    echo [INFO] 请检查网络连接和仓库配置
    pause
    exit /b %errorlevel%
)

echo.
echo [SUCCESS] 同步完成！
echo [INFO] ====================================
pause
