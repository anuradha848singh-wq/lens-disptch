@echo off
setlocal
echo ==========================================
echo   Modern News Platform - Launch Script
echo ==========================================

echo [1/6] Starting Databases (Docker)...
docker compose up -d
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker failed to start. Please ensure Docker Desktop is running.
    pause
    exit /b %ERRORLEVEL%
)

echo [2/6] Waiting 10s for services to stabilize...
timeout /t 10 /nobreak > nul

echo [3/6] Running Database Migrations (Drizzle)...
call npm run db:push
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Migrations failed.
    pause
    exit /b %ERRORLEVEL%
)

echo [4/6] Triggering Initial News Fetch...
npx tsx scripts/trigger-fetch.ts
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Initial news fetch had issues, but continuing...
)

echo [5/6] Starting Background Worker...
start "Modern News Worker" cmd /c "npm run worker:dev & pause"

echo [6/6] Starting Application Server...
start "Modern News App" cmd /c "npm run dev & pause"

echo ==========================================
echo   SUCCESS! The platform is launching...
echo   Backend: http://localhost:5000
echo   Frontend: http://localhost:5173
echo ==========================================

echo Waiting for frontend to be ready...
timeout /t 5 /nobreak > nul
start http://localhost:5173

echo.
echo Leave this window open to monitor the main launch sequence.
echo The application is running in the other "Modern News App" window.
pause
