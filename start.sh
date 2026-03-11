#!/bin/bash
# LLM_BRAIN.exe - YouTube Poop Generator
# Start both backend and frontend

echo "🧠 Starting LLM_BRAIN.exe..."
echo ""
echo "Prerequisites:"
echo "  - LM Studio running on localhost:1234 (optional - fallback script available)"
echo "  - Python 3.10+ with venv"
echo "  - Node.js 18+"
echo ""

# Start backend
echo "⚡ Starting Python backend on port 8420..."
cd backend
source venv/bin/activate
python main.py &
BACKEND_PID=$!
cd ..

# Start frontend
echo "🎮 Starting frontend on port 5173..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ LLM_BRAIN.exe is running!"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:8420"
echo ""
echo "Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
