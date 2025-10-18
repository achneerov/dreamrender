# DreamRender

An AI-powered dynamic website generator that creates infinite, navigable websites on-the-fly using Cerebras AI.

## Project Structure

```
dreamrender/
├── .gitignore         # Git ignore rules
├── README.md          # This file
├── backend/           # Node.js API server
│   ├── .env          # API keys (not committed)
│   ├── server.js     # Express + Cerebras integration
│   ├── keywords.json # Keywords for variety
│   ├── package.json
│   └── README.md
└── frontend/          # Static HTML/JS (no build needed!)
    ├── index.html    # Main page
    ├── app.js        # Vanilla JavaScript
    └── README.md
```

## Quick Start

### 1. Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env`:
```
CEREBRAS_API_KEY=your_api_key_here
PORT=3000
```

Start backend:
```bash
npm start
```

### 2. Frontend Setup

The frontend is just plain HTML and JavaScript - no build step needed!

**Option A: Just open the file**
```bash
cd frontend
open index.html
```

**Option B: Use a local server** (recommended to avoid CORS issues)
```bash
cd frontend
python3 -m http.server 8080
# Then visit http://localhost:8080
```

## How It Works

1. **Backend** (`backend/server.js`):
   - Receives generation requests from frontend
   - Calls Cerebras AI with context-aware prompts
   - Streams HTML responses back to client
   - Manages sessions and context

2. **Frontend** (`frontend/app.js`):
   - Displays AI-generated HTML
   - Intercepts all clicks on links/buttons
   - Sends click context to backend
   - Renders new pages seamlessly

3. **The Magic**:
   - Every click generates a new page
   - Each page maintains the website's design style
   - Infinite navigation possibilities
   - No pre-defined structure - it's all AI-generated!

## Features

- **Infinite Navigation**: Click any link to generate a new contextual page
- **Design Consistency**: AI maintains color schemes, fonts, and styling across pages
- **Random Themes**: Each initial load creates a unique website based on random keywords
- **Fast Generation**: Powered by Cerebras for ultra-fast inference
- **Streaming Responses**: See content appear in real-time

## Configuration

Edit `backend/server.js` to change:
- AI model (currently `qwen-3-235b-a22b-instruct-2507`)
- Temperature (creativity level)
- Max tokens (response length)
- System prompts (design requirements)

## Development

```bash
# Terminal 1 - Backend
cd backend && npm start

# Terminal 2 - Frontend (optional, just serves static files)
cd frontend && python3 -m http.server 8080
```

## License

MIT
