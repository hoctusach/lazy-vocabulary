@echo off
echo Starting Backend with AWS Cognito...
echo.

echo Checking port 8001...
netstat -ano | findstr :8001 >nul
if %errorlevel% == 0 (
    echo Port 8001 is occupied. Killing existing process...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8001') do taskkill /PID %%a /F
    echo Process killed.
) else (
    echo Port 8001 is available.
)
echo.

cd /d "%~dp0\src\backend\unified_service"

echo Starting backend server...
python cognito_server.py

pause