@echo off
echo Setting up Python environment...

cd /d %~dp0workers

if exist ".venv" (
    echo Python venv already exists, skipping creation.
) else (
    echo Creating virtual environment...
    python -m venv .venv
)

echo Installing dependencies...
.venv\Scripts\pip install -r requirements.txt

echo.
echo Python setup complete.
pause
