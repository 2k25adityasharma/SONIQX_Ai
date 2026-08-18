@echo off
echo ==========================================================
echo   Starting SONIQX — Precision Audiology Platform ^& Email Server
echo ==========================================================
cd /d "%~dp0"
echo Opening browser at http://localhost:5000 ...
start "" "http://localhost:5000"
node server.cjs
if errorlevel 1 (
    echo.
    echo Node server.cjs failed, trying static serve fallback...
    cd /d "%~dp0dist"
    npx -y serve -s . -p 5000
    if errorlevel 1 (
        python -m http.server 5000
    )
)
pause
