#!/bin/bash
# ─────────────────────────────────────────────
# setup_and_run.sh
# One-command setup for Road Accident Severity System
# Usage: bash setup_and_run.sh
# ─────────────────────────────────────────────

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   AccidentAI — Setup & Launch Script         ║"
echo "║   Road Accident Severity & Hospital System   ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Check Python
if ! command -v python3 &>/dev/null; then
  echo "❌ Python3 not found. Install from https://python.org"
  exit 1
fi
echo "✓ Python3 found: $(python3 --version)"

# Check Node
if ! command -v node &>/dev/null; then
  echo "❌ Node.js not found. Install from https://nodejs.org"
  exit 1
fi
echo "✓ Node.js found: $(node --version)"

echo ""
echo "── Setting up Backend ──"
cd backend

# Virtual environment
if [ ! -d "venv" ]; then
  echo "Creating virtual environment..."
  python3 -m venv venv
fi

source venv/bin/activate
echo "Installing Python packages..."
pip install -r requirements.txt -q
mkdir -p models
echo "✓ Backend ready"

# Start backend in background
echo "Starting FastAPI backend on port 8000..."
uvicorn main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
echo "✓ Backend PID: $BACKEND_PID"

cd ../frontend
echo ""
echo "── Setting up Frontend ──"
if [ ! -d "node_modules" ]; then
  echo "Installing Node packages (this may take a minute)..."
  npm install --silent
fi
echo "✓ Frontend ready"

echo ""
echo "Starting React frontend on port 5173..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  ✅  System is running!                      ║"
echo "║                                              ║"
echo "║  Frontend:  http://localhost:5173            ║"
echo "║  Backend:   http://localhost:8000            ║"
echo "║  API Docs:  http://localhost:8000/docs       ║"
echo "║                                              ║"
echo "║  Login: admin / admin123                     ║"
echo "║                                              ║"
echo "║  Press Ctrl+C to stop both servers           ║"
echo "╚══════════════════════════════════════════════╝"

# Wait and cleanup on exit
trap "echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
