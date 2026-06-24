@echo off
echo Stopping The Lens Dispatch...
docker-compose -f docker-compose.dev.yml down --remove-orphans
echo Done.
pause
