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

_MACHINE_ID_FILE = Path("/etc/mixmate_id")


def _derive_hardware_id() -> str | None:
    """Lees het CPU-serienummer van de Raspberry Pi."""
    try:
        for line in Path("/proc/cpuinfo").read_text().splitlines():
            if line.startswith("Serial"):
                serial = line.split(":")[-1].strip().lstrip("0")
                if serial:
                    return f"pi-{serial}"
    except Exception:
        pass
    return None


def get_machine_id() -> str:
    """
    Geeft de permanente machine-ID terug. Prioriteit:
    1. Database (mixmate.db → config tabel) — overleeft alles
    2. Raspberry Pi CPU-serienummer
    3. /etc/mixmate_id (buiten repo)
    4. Nieuw UUID (wordt opgeslagen in DB én /etc/mixmate_id)
    """
    # 1. Database — meest betrouwbaar, wordt bij eerste gebruik gevuld
    try:
        import sqlite3
        db_path = Path(__file__).parent.parent / "mixmate.db"
        if db_path.exists():
            con = sqlite3.connect(str(db_path))
            row = con.execute("SELECT value FROM config WHERE key='machine_id'").fetchone()
            con.close()
            if row and row[0]:
                return row[0]
    except Exception:
        pass

    # 2. Raspberry Pi hardware serial
    mid = _derive_hardware_id()

    # 3. /etc/mixmate_id
    if not mid:
        try:
            stored = _MACHINE_ID_FILE.read_text().strip()
            if stored:
                mid = stored
        except Exception:
            pass

    # 4. Genereer nieuw UUID
    if not mid:
        mid = str(uuid.uuid4())
        try:
            _MACHINE_ID_FILE.write_text(mid)
        except Exception:
            pass

    # Sla altijd op in de database zodat het volgende keer direct gevonden wordt
    try:
        db_path = Path(__file__).parent.parent / "mixmate.db"
        if db_path.exists():
            con = sqlite3.connect(str(db_path))
            con.execute(
                "INSERT INTO config (key, value) VALUES ('machine_id', ?) "
                "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                (mid,)
            )
            con.commit()
            con.close()
    except Exception:
        pass

    return mid

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
