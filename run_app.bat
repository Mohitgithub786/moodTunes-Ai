@echo off
title MoodTunes AI Launcher
echo ========================================================
echo        Starting MoodTunes AI (Backend + Frontend)
echo ========================================================

echo Starting Backend on http://localhost:8000...
start "MoodTunes Backend" cmd /k "cd /d "%~dp0backend" && .venv\Scripts\python.exe main.py"

echo Starting Frontend on http://localhost:5173...
start "MoodTunes Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Both servers started!
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:8000
echo ========================================================
