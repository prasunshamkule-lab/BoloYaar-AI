@echo off
REM BoloYaar AI — All-in-one startup script (Windows)
REM Fully portable — works from any folder on any PC
setlocal enabledelayedexpansion

set ROOT=%~dp0
set CF=%ROOT%cloudflared.exe
set CFDIR=%ROOT%cloudflare

REM Locate Ollama binary
where ollama >nul 2>nul
if %errorlevel% equ 0 (
    set OLLAMA_CMD=ollama serve
) else if exist "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" (
    set OLLAMA_CMD="%LOCALAPPDATA%\Programs\Ollama\ollama.exe" serve
) else (
    set OLLAMA_CMD=ollama serve
)

echo.
echo  ==========================================
echo   BoloYaar AI — Starting All Services
echo  ==========================================
echo.

REM [1] Start Ollama LLM
echo [1/4] Starting Ollama LLM (llama3.2)...
start "BoloYaar - Ollama" /min cmd /c "%OLLAMA_CMD%"
timeout /t 3 /nobreak >nul

REM [2] Start Flask AI Microservice
echo [2/4] Starting Flask AI (Whisper STT + TTS) on port 5000...
start "BoloYaar - Flask AI" cmd /k "cd /d %ROOT%backend\flask_ai && python app.py"
timeout /t 3 /nobreak >nul

REM [3] Start Django Backend
echo [3/4] Starting Django (API + Frontend) on port 8000...
start "BoloYaar - Django" cmd /k "cd /d %ROOT%backend\django_app && python manage.py runserver 0.0.0.0:8000"
timeout /t 4 /nobreak >nul

REM [4] Start Cloudflare Tunnel (if configured)
if exist "%CF%" (
    if exist "%CFDIR%\config.yml" (
        echo [4/4] Starting Cloudflare Tunnel...
        start "BoloYaar - Tunnel" cmd /k "%CF% tunnel --config %CFDIR%\config.yml run boloyaarai"
    )
) else (
    where cloudflared >nul 2>nul
    if %errorlevel% equ 0 (
        if exist "%CFDIR%\config.yml" (
            echo [4/4] Starting Cloudflare Tunnel...
            start "BoloYaar - Tunnel" cmd /k "cloudflared tunnel --config %CFDIR%\config.yml run boloyaarai"
        )
    )
)

echo.
echo  ==========================================
echo   All Services Running!
echo  ==========================================
echo.
echo   Local Web App:  http://localhost:8000
echo   Public Domain:  https://boloyaar.someshtech.world (if tunnel active)
echo.
echo   To stop all services, close each opened terminal window.
echo.
pause
