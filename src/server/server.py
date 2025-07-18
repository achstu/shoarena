from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import subprocess
from pathlib import Path
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["POST"],
)

class BotRequest(BaseModel):
    game_state: str


@app.post("/run-bot")
async def run_bot(request: BotRequest):
    game_state = request.game_state

    print('Starting with: ', game_state)
    bot_path = Path('bots/rust-shobu')
    
    if not bot_path.exists():
        raise HTTPException(404, f"Bot not found")
    
    try:
        # Run bot with timeout (5 seconds)
        result = subprocess.run(
            [str(bot_path.resolve())],
            input=game_state,
            text=True,
            capture_output=True,
            timeout=5
        )
        
        if result.returncode != 0:
            raise HTTPException(500, f"Bot error: {result.stderr.strip()}")
            
        return {"move": result.stdout.strip()}
        
    except subprocess.TimeoutExpired:
        raise HTTPException(408, "Bot timed out")
    except Exception as e:
        raise HTTPException(500, f"Server error: {str(e)}")