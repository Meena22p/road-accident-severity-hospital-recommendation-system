@echo off
echo.
echo ================================================
echo   AccidentAI - Setup and Launch (Windows)
echo   Road Accident Severity and Hospital System
echo ================================================
echo.

REM Check Python
python --version >nul 2>&1
IF ERRORLEVEL 1 (
    echo ERROR: Python not found. Install from https://python.org
    pause
    exit /b 1
)
echo [OK] Python found

REM Check Node
node --version >nul 2>&1
IF ERRORLEVEL 1 (
    echo ERROR: Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)
echo [OK] Node.js found

echo.
echo -- Setting up Backend --
cd backend

IF NOT EXIST "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

call venv\Scripts\activate
echo Installing Python packages...
pip install -r requirements.txt -q
IF NOT EXIST "models" mkdir models
echo [OK] Backend ready

echo Starting FastAPI backend on port 8000...
start "AccidentAI Backend" cmd /k "venv\Scripts\activate && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

cd ..\frontend
echo.
echo -- Setting up Frontend --

IF NOT EXIST "node_modules" (
    echo Installing Node packages...
    npm install
)

echo Starting React frontend on port 5173...
start "AccidentAI Frontend" cmd /k "npm run dev"

echo.
echo ================================================
echo   System is starting!
echo.
echo   Frontend:  http://localhost:5173
echo   Backend:   http://localhost:8000
echo   API Docs:  http://localhost:8000/docs
echo.
echo   Login: admin / admin123
echo ================================================
echo.
pause


@REM forntend - npm run dev 
@REM backend - uvicorn main:app --reload --port 8000
@REM activate virtual environment - cd accident_project\backend
@REM  venv\Scripts\activate
