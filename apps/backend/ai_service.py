"""
Srevox AI Microservice — Python FastAPI
On-demand pod crash diagnosis using LLM providers.
Supports: OpenAI, Anthropic, Ollama (local/air-gapped)
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import httpx
import json
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Srevox AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SYSTEM_PROMPT = """You are a senior Kubernetes Site Reliability Engineer with 10+ years of experience.
Analyze the pod crash incident and return ONLY a valid JSON object with these exact keys:
{
  "root_cause": "Clear 1-2 sentence explanation of the exact cause of the crash",
  "severity_assessment": "Why this severity level is appropriate for this crash",
  "fix_steps": [
    "Specific actionable step 1",
    "Specific actionable step 2",
    "Specific actionable step 3"
  ],
  "kubectl_commands": [
    "kubectl describe pod POD_NAME -n NAMESPACE",
    "kubectl logs POD_NAME -n NAMESPACE --previous"
  ],
  "prevention": "Concrete recommendation to prevent this crash in future",
  "estimated_fix_time": "e.g. 5-10 minutes",
  "related_docs": "Relevant Kubernetes documentation link"
}
Use the actual pod name and namespace from the incident in kubectl commands.
Return ONLY valid JSON. No markdown code blocks, no explanations."""


async def get_db_connection():
    return await asyncpg.connect(
        host=os.getenv("POSTGRES_HOST", "localhost"),
        port=int(os.getenv("POSTGRES_PORT", 5432)),
        database=os.getenv("POSTGRES_DB", "srevox"),
        user=os.getenv("POSTGRES_USER", "srevox"),
        password=os.getenv("POSTGRES_PASSWORD", "srevox_dev"),
    )


async def call_openai(prompt: str) -> dict:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {_ai_config['api_key']}"} if _ai_config['api_key'] else {},
            json={
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.3,
            },
        )
        data = resp.json()
        if "error" in data:
            raise Exception(data["error"]["message"])
        return json.loads(data["choices"][0]["message"]["content"])


async def call_anthropic(prompt: str) -> dict:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": os.getenv("ANTHROPIC_API_KEY", ""),
                "anthropic-version": "2023-06-01",
            },
            json={
                "model": "claude-haiku-4-5-20251001",
                "max_tokens": 1500,
                "system": SYSTEM_PROMPT,
                "messages": [{"role": "user", "content": prompt}],
            },
        )
        data = resp.json()
        return json.loads(data["content"][0]["text"])


async def call_ollama(prompt: str) -> dict:
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            f"{_ai_config.get('ollama_url') or os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')}/api/generate",
            json={
                "model": "tinyllama",
                "prompt": f"{SYSTEM_PROMPT}\n\nIncident:\n{prompt}",
                "stream": False,
                "format": "json",
            },
        )
        raw = resp.json().get("response", "{}")
        return json.loads(raw) if isinstance(raw, str) else raw



async def call_groq(prompt: str) -> dict:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {_ai_config['api_key']}"} if _ai_config['api_key'] else {},
            json={
                "model": "llama-3.1-8b-instant",
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.3,
            },
        )
        data = resp.json()
        return json.loads(data["choices"][0]["message"]["content"])

async def call_ai(prompt: str) -> dict:
    provider = _ai_config.get("provider", os.getenv("AI_PROVIDER", "groq")).lower()
    if provider == "anthropic":
        return await call_anthropic(prompt)
    elif provider == "ollama":
        return await call_ollama(prompt)
    elif provider == "groq":
        return await call_groq(prompt)
    else:
        return await call_openai(prompt)



# Dynamic config — loaded from API/DB
_ai_config = {
    "provider": os.getenv("AI_PROVIDER", "groq"),
    "model": os.getenv("AI_MODEL", "llama-3.1-8b-instant"),
    "api_key": os.getenv("GROQ_API_KEY") or os.getenv("OPENAI_API_KEY") or os.getenv("ANTHROPIC_API_KEY") or "",
    "ollama_url": os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
}

@app.post("/api/config")
async def update_config(body: dict):
    global _ai_config
    _ai_config.update({k: v for k, v in body.items() if v})
    return {"success": True}

@app.get("/api/config")
async def get_config():
    return {"provider": _ai_config["provider"], "model": _ai_config["model"]}

class DiagnoseRequest(BaseModel):
    provider:   str = ""
    model:      str = ""
    api_key:    str = ""
    ollama_url: str = ""

@app.post("/api/diagnose/{incident_id}")
async def diagnose_incident(incident_id: str, config: DiagnoseRequest = None):
    # Override global config with per-request config
    if config and config.provider:
        _ai_config["provider"]   = config.provider
    if config and config.model:
        _ai_config["model"]      = config.model
    if config and config.api_key:
        _ai_config["api_key"]    = config.api_key
    if config and config.ollama_url:
        _ai_config["ollama_url"] = config.ollama_url
    db = await get_db_connection()
    try:
        incident = await db.fetchrow(
            "SELECT * FROM incidents WHERE id = $1", incident_id
        )
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")

        # Return cached diagnosis
        if incident["ai_diagnosis"]:
            cached = incident["ai_diagnosis"]
            if isinstance(cached, str):
                cached = json.loads(cached)
            return {"diagnosis": cached, "cached": True}

        # Build detailed prompt
        prompt = f"""
Pod crash incident requiring diagnosis:

Pod Name: {incident['pod_name']}
Namespace: {incident['namespace']}
Container: {incident['container_name'] or 'unknown'}
Crash Reason: {incident['crash_reason']}
Restart Count: {incident['restart_count']}
Severity: {incident['severity']}
Exit Code: {incident.get('exit_code', 'unknown')}
Pod Labels: {incident["pod_labels"] or "{}"}

Please diagnose this crash and provide specific fix steps.
"""

        diagnosis = await call_ai(prompt)

        # Cache in DB
        await db.execute(
            """UPDATE incidents
               SET ai_diagnosis = $1, ai_diagnosed_at = now()
               WHERE id = $2""",
            json.dumps(diagnosis),
            incident_id,
        )

        return {"diagnosis": diagnosis, "cached": False}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")
    finally:
        await db.close()


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "srevox-ai",
        "provider": os.getenv("AI_PROVIDER", "openai"),
    }
