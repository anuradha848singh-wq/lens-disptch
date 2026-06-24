@echo off
setlocal
echo ==========================================
echo   Modern News Platform - SINGLE SERVER
echo ==========================================

echo [1/3] Preparing Zero-Config Environment...
:: Force Demo Mode by clearing DB/Redis env vars for this session
set DATABASE_URL=
set REDIS_URL=

echo [2/3] Starting Background Worker...
start "Modern News Worker" cmd /c "npm run worker:dev & pause"

echo [3/3] Starting Application Server...
echo (This will automatically seed and begin fetching news)
start "Modern News Single Server" cmd /c "npm run dev & pause"

echo ==========================================
echo   SUCCESS! The platform is launching...
echo   URL: http://localhost:5173
echo ==========================================

echo Waiting for frontend to be ready...
timeout /t 8 /nobreak > nul
start http://localhost:5173

echo.
echo Leave this window open. 
echo The application and news fetcher are running in the other window.
pause
