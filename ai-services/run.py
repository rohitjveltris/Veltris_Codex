#!/usr/bin/env python3
"""Entry point for the AI services application."""

import sys
import os
from pathlib import Path

# Add the current directory to Python path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

# Now we can import from src
from src.main import app
import uvicorn

if __name__ == "__main__":
    print(f"""
🐍 Veltris Codex AI Services Starting!

📡 Server:     http://0.0.0.0:8000
🔧 Health:     http://0.0.0.0:8000/api/health
🤖 Models:     http://0.0.0.0:8000/api/models
💬 Chat:       http://0.0.0.0:8000/api/chat
📚 Docs:       http://0.0.0.0:8000/docs

🌍 Environment: {os.getenv('ENVIRONMENT', 'development')}
    """)
    
    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )