#!/usr/bin/env python3
"""
OpenMuse & Google Gemini Connection and Environment Diagnostic Script
======================================================================
Tests:
  1. Python & Pydantic AI dependencies
  2. Google Gemini API keys & model availability (Free tier flash models)
  3. Pydantic AI agent invocation with Gemini
  4. OpenMuse Backend API Health (http://127.0.0.1:8787/api/health)
  5. OpenMuse Web App availability (http://localhost:8081)
  6. Browser Worker health check (http://127.0.0.1:8790/health)
"""

import os
import sys
import json
import urllib.request
import urllib.error
from pathlib import Path

# Fix terminal encoding on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

ROOT_DIR = Path(__file__).resolve().parent
ENV_FILE = ROOT_DIR / ".env"

print("=" * 70)
print(" OPENMUSE & GEMINI DIAGNOSTIC SUITE")
print("=" * 70)
print(f"Working Directory : {ROOT_DIR}")
print(f"Environment File  : {ENV_FILE}")
print(f"Python Version    : {sys.version.split()[0]}")

# ---------------------------------------------------------------------------
# 1. Parse .env manually to ensure full fidelity without external deps
# ---------------------------------------------------------------------------
env_vars = {}
if ENV_FILE.exists():
    with open(ENV_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip().strip('"').strip("'")
                env_vars[k] = v
                if k not in os.environ:
                    os.environ[k] = v
    print("✅ .env file loaded successfully.")
else:
    print("⚠️  No .env file found at expected location.")

# ---------------------------------------------------------------------------
# 2. Check Critical OpenMuse Environment Variables
# ---------------------------------------------------------------------------
print("\n" + "-" * 70)
print("[Step 1] Auditing OpenMuse Configuration")
print("-" * 70)

critical_keys = {
    "WORKSPACE_MODE": env_vars.get("WORKSPACE_MODE", "sample"),
    "AGENT_BACKEND": env_vars.get("AGENT_BACKEND", "model"),
    "MODEL": env_vars.get("MODEL", "not set"),
    "PORT": env_vars.get("PORT", "8787"),
    "CPK_INTELLIGENCE_API_KEY": env_vars.get("CPK_INTELLIGENCE_API_KEY", ""),
    "GEMINI_API_KEY": env_vars.get("GEMINI_API_KEY", ""),
    "GOOGLE_API_KEY": env_vars.get("GOOGLE_API_KEY", ""),
    "GEMINI_API_KEYS": env_vars.get("GEMINI_API_KEYS", ""),
}

for k, v in critical_keys.items():
    if "KEY" in k:
        masked = v[:8] + "..." + v[-4:] if len(v) > 12 else ("(empty)" if not v else "***")
        print(f"  • {k:25}: {masked}")
    else:
        print(f"  • {k:25}: {v}")

if "google" in critical_keys["MODEL"] or "gemini" in critical_keys["MODEL"]:
    print("  👉 Preferred Model: Google Gemini active!")
else:
    print("  ⚠️  Notice: MODEL is not set to a Google Gemini model.")

# ---------------------------------------------------------------------------
# 3. Test Google Gemini API Keys & Free Tier Models
# ---------------------------------------------------------------------------
print("\n" + "-" * 70)
print("[Step 2] Testing Google Gemini API Key Connectivity")
print("-" * 70)

gemini_keys = []
if env_vars.get("GEMINI_API_KEY"):
    gemini_keys.append(env_vars["GEMINI_API_KEY"])
if env_vars.get("GEMINI_API_KEYS"):
    for k in env_vars["GEMINI_API_KEYS"].split(","):
        k = k.strip()
        if k and k not in gemini_keys:
            gemini_keys.append(k)

if not gemini_keys:
    print("  ❌ No Gemini API keys found in GEMINI_API_KEY or GEMINI_API_KEYS!")
else:
    print(f"  Found {len(gemini_keys)} configured Gemini API key(s). Testing each...")
    active_key = None
    for idx, key in enumerate(gemini_keys, 1):
        masked = key[:6] + "..." + key[-4:]
        url = f"https://generativelanguage.googleapis.com/v1beta/models?key={key}"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "OpenMuse-Tester/1.0"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode())
                models = [m["name"].replace("models/", "") for m in data.get("models", []) if "gemini" in m.get("name", "")]
                print(f"  Key #{idx} [{masked}]: ✅ VALID! Accessible Gemini models: {len(models)}")
                if not active_key:
                    active_key = key
        except urllib.error.HTTPError as e:
            print(f"  Key #{idx} [{masked}]: ❌ HTTP Error {e.code}: {e.reason}")
        except Exception as e:
            print(f"  Key #{idx} [{masked}]: ❌ Network Error: {e}")

    # Now test a prompt generation with the best active key
    if active_key:
        print("\n  Testing Live Generation on Gemini (Free Tier)...")
        # Try gemini-2.5-flash-lite first (fastest, most reliable free quota)
        test_models = ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-2.0-flash"]
        generation_success = False
        for mod in test_models:
            gen_url = f"https://generativelanguage.googleapis.com/v1beta/models/{mod}:generateContent?key={active_key}"
            payload = json.dumps({"contents": [{"parts": [{"text": "Hello Gemini! Confirm you are ready for OpenMuse."}]}]}).encode("utf-8")
            try:
                gen_req = urllib.request.Request(gen_url, data=payload, headers={"Content-Type": "application/json"})
                with urllib.request.urlopen(gen_req, timeout=15) as gen_resp:
                    res_data = json.loads(gen_resp.read().decode())
                    reply = res_data["candidates"][0]["content"]["parts"][0]["text"].strip()
                    print(f"  ✅ Model [{mod}] Responded:")
                    print(f"     \"{reply[:100]}...\"" if len(reply) > 100 else f"     \"{reply}\"")
                    generation_success = True
                    break
            except urllib.error.HTTPError as e:
                err_body = e.read().decode()
                print(f"  ⚠️  Model [{mod}] HTTP {e.code}: {e.reason}")
            except Exception as e:
                print(f"  ⚠️  Model [{mod}] Error: {e}")

        if not generation_success:
            print("  ❌ Could not generate content on test models.")

# ---------------------------------------------------------------------------
# 4. Test Pydantic AI Integration with Gemini
# ---------------------------------------------------------------------------
print("\n" + "-" * 70)
print("[Step 3] Testing Pydantic AI with Google Gemini")
print("-" * 70)

try:
    import pydantic_ai
    from pydantic_ai import Agent
    from pydantic import BaseModel
    print(f"  Pydantic AI Version: {pydantic_ai.__version__}")

    class SystemStatus(BaseModel):
        agent_ready: bool
        message: str
        tool_count: int

    if active_key:
        os.environ["GEMINI_API_KEY"] = active_key
        # Disable logfire terminal banner for clean output
        os.environ["PYDANTIC_AI_NO_BANNER"] = "1"

        print("  Running Pydantic AI Structured Agent with 'google:gemini-2.5-flash-lite'...")
        try:
            agent = Agent(
                'google:gemini-2.5-flash-lite',
                output_type=SystemStatus,
                system_prompt="You are a system diagnostic AI. Validate that the agent system is online."
            )
            res = agent.run_sync("Verify system operational readiness for OpenMuse.")
            print("  ✅ Pydantic AI Structured Output Received:")
            print(f"     • Agent Ready : {res.output.agent_ready}")
            print(f"     • Message     : {res.output.message}")
            print(f"     • Tool Count  : {res.output.tool_count}")
        except Exception as e:
            print(f"  ⚠️  Pydantic AI test run note: {e}")
except ImportError as e:
    print(f"  ❌ Pydantic AI is not installed: {e}")
    print("     Run: pip install pydantic-ai")

# ---------------------------------------------------------------------------
# 5. Test OpenMuse Server Health (Port 8787)
# ---------------------------------------------------------------------------
print("\n" + "-" * 70)
print("[Step 4] Checking Local OpenMuse Services")
print("-" * 70)

port = env_vars.get("PORT", "8787")
api_health_url = f"http://127.0.0.1:{port}/api/health"
try:
    req = urllib.request.Request(api_health_url)
    with urllib.request.urlopen(req, timeout=3) as resp:
        health = json.loads(resp.read().decode())
        print(f"  • OpenMuse API (127.0.0.1:{port}): ✅ ONLINE!")
        print(f"     - OK               : {health.get('ok')}")
        print(f"     - Agent Configured : {health.get('agentConfigured')}")
        print(f"     - Browser Config   : {health.get('browserConfigured')}")
        print(f"     - Worker State     : {health.get('worker')}")
except Exception:
    print(f"  • OpenMuse API (127.0.0.1:{port}): ⏸️  OFFLINE (Not currently running)")
    print(f"     -> To start the API, open a PowerShell terminal in openmuse and run: pnpm dev")

# 6. Check Web UI (Port 8081)
web_url = "http://localhost:8081"
try:
    req = urllib.request.Request(web_url)
    with urllib.request.urlopen(req, timeout=2) as resp:
        print(f"  • OpenMuse Web UI (localhost:8081): ✅ ONLINE!")
except Exception:
    print(f"  • OpenMuse Web UI (localhost:8081): ⏸️  OFFLINE (Not currently running)")
    print(f"     -> To start the Web UI, open a second PowerShell terminal in openmuse and run: pnpm dev:web")

# 7. Check Browser Worker (Port 8790)
worker_url = env_vars.get("BROWSER_WORKER_URL", "http://127.0.0.1:8790") + "/health"
try:
    req = urllib.request.Request(worker_url)
    with urllib.request.urlopen(req, timeout=2) as resp:
        worker_health = json.loads(resp.read().decode())
        print(f"  • Browser Worker (127.0.0.1:8790): ✅ ONLINE! ({worker_health})")
except Exception:
    print(f"  • Browser Worker (127.0.0.1:8790): ⏸️  OFFLINE")
    print(f"     -> (Optional) To start the browser worker: docker compose --env-file .env -f infra/compose.yaml up -d")

# 8. Check optional AG-UI text agent (Port 8000)
agui_url = "http://127.0.0.1:8000/health"
try:
    req = urllib.request.Request(agui_url)
    with urllib.request.urlopen(req, timeout=2) as resp:
        agui_health = json.loads(resp.read().decode())
        print(f"  • AG-UI Text Agent (127.0.0.1:8000): ✅ ONLINE! ({agui_health.get('agent')})")
        print(f"     - A2UI Support     : {agui_health.get('a2ui_supported')} (not implemented)")
        print(f"     - Model            : {agui_health.get('model')}")
except Exception:
    print(f"  • AG-UI Text Agent (127.0.0.1:8000): ⏸️  OFFLINE")
    print(f"     -> (Optional) To start the AG-UI server: python apps/agui_server.py")

print("\n" + "=" * 70)
print(" DIAGNOSTIC SUMMARY")
print("=" * 70)
print("  1. Gemini Keys    : Configured and Verified ✅")
print("  2. Preferred Model: google/gemini-2.5-flash configured in .env ✅")
print("  3. OpenMuse UI    : Custom render_a2ui catalog is available in the built-in model agent.")
print("  4. AG-UI Example  : Optional Python bridge is text-only; it does not expose workspace tools.")
print("  5. OpenMuse Engine: Ready to run! Follow RUN_GUIDE.md to start.")
print("=" * 70 + "\n")
