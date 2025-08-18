# Veltris Codex - AI Code Generation Platform

## Prerequisites
- Node.js 18+ and npm
- Python 3.9+ and pip
- OpenAI/Anthropic API keys (optional)
- Ollama (for local models)

## Installation Steps
Clone the repository
### 1. Install Ollama
```bash
curl -fsSL https://ollama.ai/install.sh | sh
ollama serve
ollama pull gpt-oss:latest
```

### 2. Setup Environment Files

**ai-services/.env:**
```bash
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
OLLAMA_BASE_URL=http://localhost:11434
HOST=0.0.0.0
PORT=8000
```

**gateway/.env:**
```bash
AI_SERVICE_URL=http://localhost:8000
PORT=3001
FRONTEND_URL=http://localhost:8080
```

### 3. Run in 3 Terminals

**Terminal 1 - AI Services:**
```bash
cd ai-services
pip install -r requirements.txt
python3 run.py
```

**Terminal 2 - Gateway:**
```bash
cd gateway
npm install
npm run dev
```

**Terminal 3 - Frontend:**
```bash
npm install
npm run dev
```

### 4. Access
- Frontend: http://localhost:8080
- Models: gpt-4o, claude-3.5-sonnet, gpt-oss
