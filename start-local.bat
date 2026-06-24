@echo off
echo.
echo  ================================
echo   The Lens Dispatch - Local Startup
echo  ================================
echo.

REM Check Docker is running
docker info > nul 2>&1
if errorlevel 1 (
    echo  ERROR: Docker Desktop is not running.
    echo  Open Docker Desktop and wait for green icon in taskbar.
    echo  Then run this script again.
    echo.
    pause
    exit /b 1
)
echo  Docker is running.

REM Start databases
echo.
echo  [1/7] Starting PostgreSQL and Redis...
docker-compose -f docker-compose.dev.yml up -d --remove-orphans
echo  Containers started.

REM Wait for PostgreSQL to be ready
echo.
echo  [2/7] Waiting for PostgreSQL to be ready...
:wait_loop
docker-compose -f docker-compose.dev.yml exec -T postgres pg_isready -U admin -d postgres > nul 2>&1
if errorlevel 1 (
    echo  Still waiting...
    timeout /t 2 /nobreak > nul
    goto wait_loop
)
echo  PostgreSQL is ready.

REM Create database if not exists
docker-compose -f docker-compose.dev.yml exec -T postgres psql -U admin -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='thelensdispatch';" | findstr "1" > nul
if errorlevel 1 (
    echo  Database "thelensdispatch" does not exist. Creating it...
    docker-compose -f docker-compose.dev.yml exec -T postgres psql -U admin -d postgres -c "CREATE DATABASE thelensdispatch;" > nul 2>&1
)

REM Enable pgvector extension
echo.
echo  [3/7] Enabling pgvector + pushing schema...
docker-compose -f docker-compose.dev.yml exec -T postgres psql -U admin -d thelensdispatch -c "CREATE EXTENSION IF NOT EXISTS vector;" > nul 2>&1
call npm run db:push
if errorlevel 1 (
    echo.
    echo  ERROR: db:push failed. See error above.
    pause
    exit /b 1
)

REM Seed system user
call npx tsx server/seed.ts

REM RSS Worker disabled — Node.js news-fetcher.ts handles all RSS fetching
REM The Python worker duplicated the same sources causing 403 rate-limit bans
echo  [4/7] RSS worker skipped (Node fetcher handles all sources).

REM Kill anything already on port 5000
echo.
echo  Clearing port 5000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)
timeout /t 2 /nobreak >nul

REM Kill ALL existing node processes before starting
echo.
echo  Killing any existing Node processes...
taskkill /F /IM node.exe /T >nul 2>&1
timeout /t 3 /nobreak >nul
echo  Node processes cleared.

REM Check for updated Pipeline API Keys
echo.
echo  [5/7] Checking API Keys (Jina ^& Groq)...
findstr /R /C:"^GROQ_API_KEY=." .env > nul 2>&1
if errorlevel 1 (
    echo  [WARNING] GROQ_API_KEY not found in .env ^(LLM summaries may fail^)
)
findstr /R /C:"^JINA_API_KEY=." .env > nul 2>&1
if errorlevel 1 (
    echo  [WARNING] JINA_API_KEY not found in .env ^(Embeddings may fail^)
)

REM Start Node Worker
echo.
echo  [6/6] Starting Node Background Worker (BullMQ) in a new window...
start cmd /k "title Node Worker && npm run worker:dev"

REM Start Node server
echo.
echo  Starting server at http://localhost:5000
echo  Press Ctrl+C to stop.
echo.
call npm run dev