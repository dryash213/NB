#!/usr/bin/env python3
"""
OpenMuse AG-UI external agent example (FastAPI + Pydantic AI)
=============================================================
Implements a minimal AG-UI SSE chat endpoint at POST /run.

This example is text-only. It does not connect to OpenMuse's Gmail/calendar tools,
and it does not emit A2UI surfaces or perform mailbox actions.

Usage:
  python apps/agui_server.py
  (Runs on http://127.0.0.1:8000)

In OpenMuse .env:
  AGENT_BACKEND=agui
  AGENT_URL=http://127.0.0.1:8000/run
"""

import os
import sys
import json
import uuid
import time
import asyncio
from pathlib import Path
from typing import Any, AsyncGenerator, Dict, List, Optional
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, Field

# Ensure terminal encoding on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

# Load environment from .env in openmuse root
ROOT_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT_DIR / ".env"

if ENV_FILE.exists():
    with open(ENV_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip().strip('"').strip("'")
                if k not in os.environ:
                    os.environ[k] = v

os.environ["PYDANTIC_AI_NO_BANNER"] = "1"

# Prefer Gemini Flash models
GEMINI_KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
if not GEMINI_KEY and os.environ.get("GEMINI_API_KEYS"):
    GEMINI_KEY = os.environ["GEMINI_API_KEYS"].split(",")[0].strip()
    os.environ["GEMINI_API_KEY"] = GEMINI_KEY
    os.environ["GOOGLE_API_KEY"] = GEMINI_KEY

app = FastAPI(title="OpenMuse AG-UI & A2UI Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# AG-UI Input Schema (Flexible for CopilotKit & AG-UI protocol variants)
# ---------------------------------------------------------------------------
class AgentMessage(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: Optional[str] = None
    role: str
    content: Optional[Any] = None

class RunAgentInput(BaseModel):
    model_config = ConfigDict(extra="allow")
    threadId: Optional[str] = None
    runId: Optional[str] = None
    parentRunId: Optional[str] = None
    messages: List[AgentMessage] = Field(default_factory=list)
    tools: Optional[Any] = None
    context: Optional[Any] = None
    state: Optional[Any] = None
    forwardedProps: Optional[Any] = None
    resume: Optional[Any] = None

# ---------------------------------------------------------------------------
# Helper: Format SSE Event
# ---------------------------------------------------------------------------
def format_sse(data: Dict[str, Any]) -> str:
    if "timestamp" not in data:
        data["timestamp"] = int(time.time() * 1000)
    return f"data: {json.dumps(data)}\n\n"

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "agent": "Pydantic AI AG-UI Bridge",
        "a2ui_supported": False,
        "model": "google:gemini-2.5-flash-lite",
        "gemini_configured": bool(GEMINI_KEY),
    }

@app.post("/run")
async def run_agent(payload: RunAgentInput):
    run_id = payload.runId or str(uuid.uuid4())
    thread_id = payload.threadId or str(uuid.uuid4())

    # Extract latest user message
    user_prompt = "Hello"
    for msg in reversed(payload.messages):
        if msg.role == "user":
            if isinstance(msg.content, str):
                user_prompt = msg.content
            elif isinstance(msg.content, list):
                # Multimodal or part array
                for part in msg.content:
                    if isinstance(part, dict) and part.get("type") == "text":
                        user_prompt = part.get("text", "")
                        break
            break

    async def event_generator() -> AsyncGenerator[str, None]:
        # 1. RUN_STARTED
        yield format_sse({
            "type": "RUN_STARTED",
            "runId": run_id,
            "threadId": thread_id,
        })

        message_id = str(uuid.uuid4())

        # 2. TEXT_MESSAGE_START
        yield format_sse({
            "type": "TEXT_MESSAGE_START",
            "messageId": message_id,
            "role": "assistant",
        })

        try:
            from pydantic_ai import Agent

            system_instructions = (
                "You are a helpful OpenMuse assistant. "
                "Keep responses helpful, concise, and structured. "
            )

            # Process AG-UI context if provided
            if payload.context:
                if isinstance(payload.context, list):
                    system_instructions += "\n## Application Context:\n"
                    for item in payload.context:
                        if isinstance(item, dict):
                            desc = item.get("description", "Context")
                            val = item.get("value", "")
                            system_instructions += f"- {desc}: {val}\n"
                elif isinstance(payload.context, dict):
                    system_instructions += f"\n## Application Context:\n{json.dumps(payload.context, indent=2)}\n"

            # Process AG-UI state if provided
            if payload.state:
                system_instructions += f"\n## Application State:\n{json.dumps(payload.state, indent=2)}\n"

            agent = Agent(
                "google:gemini-2.5-flash-lite",
                system_prompt=system_instructions
            )

            # Stream model output
            async with agent.run_stream(user_prompt) as result:
                last_len = 0
                async for text in result.stream_text():
                    delta = text[last_len:]
                    last_len = len(text)
                    if delta:
                        yield format_sse({
                            "type": "TEXT_MESSAGE_CONTENT",
                            "messageId": message_id,
                            "delta": delta,
                        })

        except Exception as e:
            print(f"AG-UI agent run failed: {type(e).__name__}: {e}", file=sys.stderr)
            yield format_sse({
                "type": "TEXT_MESSAGE_END",
                "messageId": message_id,
            })
            yield format_sse({
                "type": "RUN_ERROR",
                "runId": run_id,
                "threadId": thread_id,
                "message": "The external agent could not complete this request. Check the agent server logs.",
            })
            return

        # 3. TEXT_MESSAGE_END
        yield format_sse({
            "type": "TEXT_MESSAGE_END",
            "messageId": message_id,
        })

        # RUN_FINISHED
        yield format_sse({
            "type": "RUN_FINISHED",
            "runId": run_id,
            "threadId": thread_id,
        })

    return StreamingResponse(event_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    print("\n" + "=" * 65)
    print(" OPENMUSE AG-UI EXTERNAL AGENT SERVER (TEXT ONLY)")
    print("=" * 65)
    print(" Listening on : http://127.0.0.1:8000")
    print(" AG-UI Endpoint: http://127.0.0.1:8000/run")
    print(" Model        : Google Gemini 2.5 Flash Lite")
    print(" To connect in OpenMuse (.env):")
    print("   AGENT_BACKEND=agui")
    print("   AGENT_URL=http://127.0.0.1:8000/run")
    print("=" * 65 + "\n")
    uvicorn.run(app, host="127.0.0.1", port=8000)

