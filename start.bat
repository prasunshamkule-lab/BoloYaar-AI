@echo off
REM BoloYaar AI — Local Dev Start Script (Windows)
setlocal enabledelayedexpansion

set ROOT=%~dp0

echo.
echo  ================================
echo   BoloYaar AI — Starting Local Dev
echo  ================================
echo.

REM Locate Ollama
where ollama >nul 2>nul
if %errorlevel% equ 0 (
    set OLLAMA_CMD=ollama serve
) else if exist "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" (
    set OLLAMA_CMD="%LOCALAPPDATA%\Programs\Ollama\ollama.exe" serve
) else (
    set OLLAMA_CMD=ollama serve
)

echo [1/3] Starting Ollama...
start "BoloYaar - Ollama" /min cmd /c "%OLLAMA_CMD%"
timeout /t 2 /nobreak >nul

echo [2/3] Starting Flask AI Microservice on port 5000...
start "BoloYaar - Flask AI" cmd /k "cd /d %ROOT%backend\flask_ai && python app.py"
timeout /t 3 /nobreak >nul

echo [3/3] Starting Django Backend on port 8000...
start "BoloYaar - Django" cmd /k "cd /d %ROOT%backend\django_app && python manage.py runserver 0.0.0.0:8000"
timeout /t 3 /nobreak >nul

echo.
echo  All services started!
echo.
echo  App URL:    http://localhost:8000
echo  Flask AI:   http://localhost:5000
echo.
echo  Press any key to open the app in your browser...
pause >nul
start http://localhost:8000
