"""
MIXMATE Cloud Client
Maakt een permanente WebSocket verbinding met de MIXMATE cloud server.
Draait als achtergrondtaak naast de normale backend.
"""

import asyncio
import json
import logging
import os
import uuid
from pathlib import Path

import httpx
import websockets

log = logging.getLogger("cloud_client")

CLOUD_URL   = os.getenv("MIXMATE_CLOUD_URL", "")   # bijv. wss://mixmate-cloud.railway.app
MACHINE_ID_FILE = Path(__file__).parent.parent / ".machine_id"

def get_machine_id() -> str:
    if MACHINE_ID_FILE.exists():
        return MACHINE_ID_FILE.read_text().strip()
    machine_id = str(uuid.uuid4())
    MACHINE_ID_FILE.write_text(machine_id)
    return machine_id

async def handle_message(message: dict) -> dict | None:
    """Verwerk een commando van de cloud server en stuur een antwoord terug."""
    msg_type = message.get("type")
    req_id   = message.get("req_id")

    try:
        async with httpx.AsyncClient() as client:
            if msg_type == "get_recipes":
                r = await client.get("http://localhost:8000/api/recipes")
                return {"req_id": req_id, "type": "response", "items": r.json()}

            elif msg_type == "get_pumps":
                r = await client.get("http://localhost:8000/api/pumps/simple")
                return {"req_id": req_id, "type": "response", "items": r.json()}

            elif msg_type == "get_settings":
                r = await client.get("http://localhost:8000/api/system/machine")
                return {"req_id": req_id, "type": "response", **r.json()}

            elif msg_type == "update_settings":
                data = message.get("data", {})
                r = await client.post("http://localhost:8000/api/system/machine", json=data)
                return {"req_id": req_id, "type": "response", "ok": r.status_code < 300}

    except Exception as e:
        log.error("Fout bij verwerken commando %s: %s", msg_type, e)
        if req_id:
            return {"req_id": req_id, "type": "error", "detail": str(e)}

    return None

async def cloud_loop():
    if not CLOUD_URL:
        log.info("MIXMATE_CLOUD_URL niet ingesteld — cloud verbinding uitgeschakeld")
        return

    machine_id = get_machine_id()
    ws_url = f"{CLOUD_URL}/ws/machine/{machine_id}"
    log.info("Verbinden met cloud: %s", ws_url)

    # Wacht eerst tot de lokale backend klaar is
    for _ in range(30):
        try:
            async with httpx.AsyncClient() as c:
                await c.get("http://localhost:8000/api/system/version", timeout=2)
            break
        except Exception:
            await asyncio.sleep(2)

    while True:
        try:
            async with websockets.connect(ws_url, ping_interval=30, ping_timeout=10) as ws:
                log.info("Cloud verbonden")

                # Stuur versie + model info mee als eerste heartbeat
                try:
                    async with httpx.AsyncClient() as c:
                        v = await c.get("http://localhost:8000/api/system/version", timeout=3)
                        m = await c.get("http://localhost:8000/api/system/machine", timeout=3)
                    version = v.json().get("version", "")
                    model   = m.json().get("model", "")
                except Exception:
                    version = model = ""

                await ws.send(json.dumps({
                    "type": "heartbeat",
                    "version": version,
                    "model": model,
                }))

                # Heartbeat elke 30 seconden
                async def heartbeat():
                    while True:
                        await asyncio.sleep(30)
                        try:
                            await ws.send(json.dumps({"type": "heartbeat"}))
                        except Exception:
                            break

                hb_task = asyncio.create_task(heartbeat())

                try:
                    async for raw in ws:
                        message = json.loads(raw)
                        msg_type = message.get("type")

                        if msg_type in ("pair_code", "paired", "heartbeat_ack"):
                            # Stuur koppelcode naar lokale backend zodat machine hem kan tonen
                            if msg_type == "pair_code":
                                try:
                                    async with httpx.AsyncClient() as c:
                                        await c.post(
                                            "http://localhost:8000/api/cloud/pair-code",
                                            json={"code": message.get("code"), "paired": message.get("paired")},
                                            timeout=3,
                                        )
                                except Exception:
                                    pass
                            continue

                        # Verwerk commando en stuur antwoord
                        response = await handle_message(message)
                        if response:
                            await ws.send(json.dumps(response))
                finally:
                    hb_task.cancel()

        except Exception as e:
            log.warning("Cloud verbinding verbroken: %s — herverbinden in 10s", e)
            await asyncio.sleep(10)
