@echo off
REM BoloYaar AI — Cloudflare Tunnel Setup Script
REM Run this ONCE to create and configure your tunnel.
REM Requirements: cloudflared.exe must be in C:\Boloyaarai\

setlocal enabledelayedexpansion

echo.
echo  ==========================================
echo   BoloYaar AI — Cloudflare Tunnel Setup
echo  ==========================================
echo.
echo  Domain: boloyaar.someshtech.world
echo.

set CF=C:\Boloyaarai\cloudflared.exe
set CFDIR=C:\Boloyaarai\cloudflare
set TUNNEL_NAME=boloyaarai

REM Step 1: Login to Cloudflare (opens browser)
echo [Step 1/4] Logging in to Cloudflare...
echo  A browser window will open. Click "Authorize" for someshtech.world.
echo.
%CF% tunnel login
if errorlevel 1 (
    echo ERROR: Login failed. Please try again.
    pause
    exit /b 1
)
echo.
echo  Login successful!
echo.

REM Step 2: Create the tunnel
echo [Step 2/4] Creating tunnel "%TUNNEL_NAME%"...
%CF% tunnel create %TUNNEL_NAME%
if errorlevel 1 (
    echo  Tunnel may already exist, continuing...
)
echo.

REM Step 3: Get tunnel ID and update config.yml
echo [Step 3/4] Configuring tunnel...
for /f "tokens=*" %%i in ('"%CF%" tunnel list --output json 2^>nul ^| python -c "import sys,json; tunnels=json.load(sys.stdin); [print(t[\"id\"]) for t in tunnels if t[\"name\"]==\"boloyaarai\"]" 2^>nul') do set TUNNEL_ID=%%i

if "%TUNNEL_ID%"=="" (
    echo Could not auto-detect tunnel ID. Please check %CFDIR%\config.yml manually.
) else (
    echo  Tunnel ID: %TUNNEL_ID%
    set CRED_PATH=%USERPROFILE%\.cloudflared\%TUNNEL_ID%.json
    python -c "import re; content=open(r'%CFDIR%\config.yml').read(); content=content.replace('CREDENTIALS_PATH_PLACEHOLDER', r'%USERPROFILE%\.cloudflared\%TUNNEL_ID%.json'); open(r'%CFDIR%\config.yml','w').write(content)"
    echo  Config updated with credentials path.
)
echo.

REM Step 4: Create DNS record
echo [Step 4/4] Creating DNS record boloyaar.someshtech.world...
%CF% tunnel route dns %TUNNEL_NAME% boloyaar.someshtech.world
echo.

echo  ==========================================
echo   Setup Complete!
echo  ==========================================
echo.
echo  Your tunnel is ready. Now run:
echo   start_with_tunnel.bat
echo.
echo  Your friends can access BoloYaar AI at:
echo   https://boloyaar.someshtech.world
echo.
pause
