# AI Talking Face

A real-time conversational AI with an ASCII talking face rendered in WebGL. Talk to an AI face that listens, thinks, and speaks back — all in a retro 1970s terminal aesthetic.

## Features

- **Live voice conversation** — Speak naturally, the AI listens and responds with voice
- **Automatic silence detection** — No buttons needed after starting, auto-detects when you stop talking
- **3 voice/face modes** — Masculine, Feminine, and Robotic, each with a unique ASCII face design
- **Multilingual** — Detects your language via Whisper and responds in the same language (10+ languages supported)
- **Retro terminal visuals** — Matrix rain, CRT overlay, 1970s gradient backgrounds, abstract shapes
- **Procedural ambient music** — Synthesized drone and arpeggio background music
- **Video recording** — Record your conversation session as a video file

## Tech Stack

- **Frontend**: React + Vite, React Three Fiber (WebGL), Zustand, Web Audio API
- **Backend**: Python FastAPI
- **Speech-to-Text**: OpenAI Whisper (local, `base` model)
- **Text-to-Speech**: Edge TTS (multiple voices per language)
- **LLM**: LM Studio (local, OpenAI-compatible API on port 1234)

## Prerequisites

- [Node.js](https://nodejs.org/) (18+)
- [Python](https://www.python.org/) (3.10+)
- [LM Studio](https://lmstudio.ai/) running with a model loaded on port 1234

## Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install fastapi uvicorn edge-tts openai python-multipart aiofiles openai-whisper torch
python main.py
```

The backend starts on port **8420**.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend starts on port **5173**.

### Quick Start

```bash
chmod +x start.sh
./start.sh
```

## Usage

1. Make sure **LM Studio** is running with a model loaded
2. Start both backend and frontend
3. Open **http://localhost:5173**
4. Select a voice type (Masculine / Feminine / Robotic)
5. Click **TALK TO ME**
6. Speak naturally — the AI will respond after detecting 1.5s of silence
7. The conversation loops automatically

## Supported Languages

English, Spanish, French, German, Portuguese, Italian, Japanese, Chinese, Korean, Russian — with matching TTS voices for each.

## License

MIT
