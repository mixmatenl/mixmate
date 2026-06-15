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

CLOUD_URL = os.getenv("MIXMATE_CLOUD_URL", "")
LOCAL     = "http://localhost:8000"

# Persistent machine ID — stored outside the git repo so it survives re-clones.
# On a Raspberry Pi we prefer the hardware CPU serial (truly permanent).
_MACHINE_ID_FILE = Path("/etc/mixmate_id")

def get_machine_id() -> str:
    # 1. Prefer Raspberry Pi hardware serial (immutable, survives reinstalls)
    try:
        cpuinfo = Path("/proc/cpuinfo").read_text()
        for line in cpuinfo.splitlines():
            if line.startswith("Serial"):
                serial = line.split(":")[-1].strip().lstrip("0")
                if serial:
                    return f"pi-{serial}"
    except Exception:
        pass

    # 2. Fall back to a UUID persisted in /etc/mixmate_id (outside repo)
    if _MACHINE_ID_FILE.exists():
        mid = _MACHINE_ID_FILE.read_text().strip()
        if mid:
            return mid
    machine_id = str(uuid.uuid4())
    try:
        _MACHINE_ID_FILE.write_text(machine_id)
    except PermissionError:
        # Running in dev without root — use a temp file next to this script
        fallback = Path(__file__).parent.parent / ".machine_id"
        if not fallback.exists():
            fallback.write_text(machine_id)
        else:
            return fallback.read_text().strip()
    return machine_id

async def handle_message(message: dict) -> dict | None:
    msg_type = message.get("type")
    req_id   = message.get("req_id")

    try:
        async with httpx.AsyncClient() as c:

            # ── Recepten ──────────────────────────────────────────────────────
            if msg_type == "get_recipes":
                r = await c.get(f"{LOCAL}/api/recipes")
                return {"req_id": req_id, "items": r.json()}

            elif msg_type == "create_recipe":
                r = await c.post(f"{LOCAL}/api/recipes", json=message.get("data", {}))
                return {"req_id": req_id, **r.json()}

            elif msg_type == "update_recipe":
                r = await c.patch(f"{LOCAL}/api/recipes/{message['id']}", json=message.get("data", {}))
                return {"req_id": req_id, **r.json()}

            elif msg_type == "delete_recipe":
                r = await c.delete(f"{LOCAL}/api/recipes/{message['id']}")
                return {"req_id": req_id, "ok": r.status_code < 300}

            # ── Ingrediënten ─────────────────────────────────────────────────
            elif msg_type == "get_ingredients":
                r = await c.get(f"{LOCAL}/api/ingredients")
                return {"req_id": req_id, "items": r.json()}

            elif msg_type == "create_ingredient":
                r = await c.post(f"{LOCAL}/api/ingredients", json=message.get("data", {}))
                return {"req_id": req_id, **r.json()}

            elif msg_type == "delete_ingredient":
                r = await c.delete(f"{LOCAL}/api/ingredients/{message['id']}")
                return {"req_id": req_id, "ok": r.status_code < 300}

            # ── Glazen ───────────────────────────────────────────────────────
            elif msg_type == "get_glasses":
                r = await c.get(f"{LOCAL}/api/glasses")
                return {"req_id": req_id, "items": r.json()}

            elif msg_type == "create_glass":
                r = await c.post(f"{LOCAL}/api/glasses", json=message.get("data", {}))
                return {"req_id": req_id, **r.json()}

            elif msg_type == "update_glass":
                r = await c.patch(f"{LOCAL}/api/glasses/{message['id']}", json=message.get("data", {}))
                return {"req_id": req_id, **r.json()}

            elif msg_type == "delete_glass":
                r = await c.delete(f"{LOCAL}/api/glasses/{message['id']}")
                return {"req_id": req_id, "ok": r.status_code < 300}

            # ── Categorieën ──────────────────────────────────────────────────
            elif msg_type == "get_categories":
                r = await c.get(f"{LOCAL}/api/categories")
                return {"req_id": req_id, "items": r.json()}

            elif msg_type == "create_category":
                r = await c.post(f"{LOCAL}/api/categories", json=message.get("data", {}))
                return {"req_id": req_id, **r.json()}

            elif msg_type == "update_category":
                r = await c.patch(f"{LOCAL}/api/categories/{message['id']}", json=message.get("data", {}))
                return {"req_id": req_id, **r.json()}

            elif msg_type == "delete_category":
                r = await c.delete(f"{LOCAL}/api/categories/{message['id']}")
                return {"req_id": req_id, "ok": r.status_code < 300}

            # ── Pompen ───────────────────────────────────────────────────────
            elif msg_type == "get_pumps":
                r = await c.get(f"{LOCAL}/api/pumps/simple")
                return {"req_id": req_id, "items": r.json()}

            elif msg_type == "update_pump":
                r = await c.patch(f"{LOCAL}/api/pumps/{message['id']}/ingredient", json=message.get("data", {}))
                return {"req_id": req_id, "ok": r.status_code < 300}

            # ── Instellingen ─────────────────────────────────────────────────
            elif msg_type == "get_settings":
                r = await c.get(f"{LOCAL}/api/system/machine")
                return {"req_id": req_id, **r.json()}

            elif msg_type == "update_settings":
                r = await c.post(f"{LOCAL}/api/system/machine", json=message.get("data", {}))
                return {"req_id": req_id, "ok": r.status_code < 300}

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

    for _ in range(30):
        try:
            async with httpx.AsyncClient() as c:
                await c.get(f"{LOCAL}/api/system/version", timeout=2)
            break
        except Exception:
            await asyncio.sleep(2)

    while True:
        try:
            async with websockets.connect(ws_url, ping_interval=30, ping_timeout=10) as ws:
                log.info("Cloud verbonden")

                try:
                    async with httpx.AsyncClient() as c:
                        v = await c.get(f"{LOCAL}/api/system/version", timeout=3)
                        m = await c.get(f"{LOCAL}/api/system/machine", timeout=3)
                    version = v.json().get("version", "")
                    model   = m.json().get("model", "")
                except Exception:
                    version = model = ""

                await ws.send(json.dumps({"type": "heartbeat", "version": version, "model": model}))

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

                        if msg_type == "pair_code":
                            try:
                                async with httpx.AsyncClient() as c:
                                    await c.post(
                                        f"{LOCAL}/api/cloud/pair-code",
                                        json={"code": message.get("code"), "paired": message.get("paired")},
                                        timeout=3,
                                    )
                            except Exception:
                                pass
                            continue

                        if msg_type in ("paired", "heartbeat_ack"):
                            continue

                        response = await handle_message(message)
                        if response:
                            await ws.send(json.dumps(response))
                finally:
                    hb_task.cancel()

        except Exception as e:
            log.warning("Cloud verbinding verbroken: %s — herverbinden in 10s", e)
            await asyncio.sleep(10)
