"""
MIXMATE Cloud Client
Maakt een permanente WebSocket verbinding met de MIXMATE cloud server.
Draait als achtergrondtaak naast de normale backend.
"""

import asyncio
import json
import logging
import os
import socket
import uuid
from pathlib import Path

import httpx
import websockets

log = logging.getLogger("cloud_client")

# Actieve onderhoudssessie — ingesteld door cloud, uitgelezen door /api/maintenance/session
_maintenance_session = None

# Actieve WebSocket verbinding — beschikbaar voor andere modules om berichten te sturen
_active_ws = None


async def send_to_cloud(payload: dict) -> None:
    """Stuur een bericht naar de cloud via de actieve WebSocket verbinding."""
    if _active_ws is None:
        raise RuntimeError("Geen actieve cloud verbinding")
    await _active_ws.send(json.dumps(payload))

# Fallback ingebakken in de code — machine werkt ook zonder .env of database-entry
_CLOUD_URL_DEFAULT = "wss://mixmate-cloud-production.up.railway.app"
CLOUD_URL = os.getenv("MIXMATE_CLOUD_URL", "") or _CLOUD_URL_DEFAULT
LOCAL     = "https://localhost:8000"

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

_active_pour_task: asyncio.Task | None = None


async def _stream_pour(cloud_ws, recipe_id: int, scale: float):
    import websockets as _ws
    global _active_pour_task
    scale_param = f"?scale={scale:.4f}" if scale != 1.0 else ""
    uri = f"ws://localhost:8000/ws/pour/{recipe_id}{scale_param}"
    try:
        async with _ws.connect(uri) as pour_ws:
            async for raw in pour_ws:
                msg = json.loads(raw)
                msg_type = msg.get("type", "")
                await cloud_ws.send(json.dumps({"type": f"pour_{msg_type}", **msg}))
                if msg_type in ("done", "error", "cancelled"):
                    break
    except Exception as e:
        try:
            await cloud_ws.send(json.dumps({"type": "pour_error", "message": str(e)}))
        except Exception:
            pass
    finally:
        _active_pour_task = None


async def handle_message(message: dict, cloud_ws=None) -> dict | None:
    msg_type = message.get("type")
    req_id   = message.get("req_id")

    try:
        async with httpx.AsyncClient(timeout=15.0, verify=False) as c:

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

            elif msg_type == "update_ingredient":
                r = await c.patch(f"{LOCAL}/api/ingredients/{message['id']}", json=message.get("data", {}))
                return {"req_id": req_id, **r.json()}

            elif msg_type == "delete_ingredient":
                r = await c.delete(f"{LOCAL}/api/ingredients/{message['id']}")
                return {"req_id": req_id, "ok": r.status_code < 300}

            elif msg_type == "upload_ingredient_image":
                import base64 as _b64
                raw   = _b64.b64decode(message["image_b64"])
                files = {"file": ("photo.jpg", raw, "image/jpeg")}
                r     = await c.post(f"{LOCAL}/api/ingredients/{message['id']}/image", files=files)
                return {"req_id": req_id, **r.json()}

            elif msg_type == "get_ingredient_categories":
                r = await c.get(f"{LOCAL}/api/ingredient-categories")
                return {"req_id": req_id, "items": r.json()}

            elif msg_type == "create_ingredient_category":
                r = await c.post(f"{LOCAL}/api/ingredient-categories", json=message.get("data", {}))
                return {"req_id": req_id, **r.json()}

            elif msg_type == "update_ingredient_category":
                r = await c.patch(f"{LOCAL}/api/ingredient-categories/{message['id']}", json=message.get("data", {}))
                return {"req_id": req_id, **r.json()}

            elif msg_type == "delete_ingredient_category":
                r = await c.delete(f"{LOCAL}/api/ingredient-categories/{message['id']}")
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
                r = await c.patch(f"{LOCAL}/api/pumps/{message['id']}", json=message.get("data", {}))
                return {"req_id": req_id, "ok": r.status_code < 300}

            # ── Instellingen ─────────────────────────────────────────────────
            elif msg_type == "get_settings":
                r = await c.get(f"{LOCAL}/api/system/machine")
                return {"req_id": req_id, **r.json()}

            elif msg_type == "update_settings":
                r = await c.post(f"{LOCAL}/api/system/machine", json=message.get("data", {}))
                return {"req_id": req_id, "ok": r.status_code < 300}

            # ── Machine info ──────────────────────────────────────────────────
            elif msg_type == "get_info":
                r = await c.get(f"{LOCAL}/api/system/info")
                return {"req_id": req_id, **r.json()}

            elif msg_type == "flush_pumps":
                # flush-all start een achtergrondtaak en geeft direct terug
                pumps = message.get("pumps", [])
                r = await c.post(f"{LOCAL}/api/pumps/flush-all", json={"pumps": pumps}, timeout=10)
                return {"req_id": req_id, "ok": r.status_code < 300}

            elif msg_type == "get_flush_status":
                r = await c.get(f"{LOCAL}/api/pumps/flush-status", timeout=3)
                return {"req_id": req_id, **r.json()}

            elif msg_type == "get_cooldown_status":
                r = await c.get(f"{LOCAL}/api/pumps/cooldown-status", timeout=3)
                result = r.json()
                return {"req_id": req_id, "items": result} if isinstance(result, list) else {"req_id": req_id, **result}

            elif msg_type == "block_machine":
                r = await c.post(f"{LOCAL}/api/machine/block", timeout=3)
                return {"req_id": req_id, **r.json()}

            elif msg_type == "unblock_machine":
                r = await c.post(f"{LOCAL}/api/machine/unblock", timeout=3)
                return {"req_id": req_id, **r.json()}

            elif msg_type == "get_block_status":
                r = await c.get(f"{LOCAL}/api/machine/blocked", timeout=3)
                return {"req_id": req_id, **r.json()}

            elif msg_type == "get_demo_status":
                r = await c.get(f"{LOCAL}/api/demo/status", timeout=3)
                return {"req_id": req_id, **r.json()}

            elif msg_type == "exit_demo_slideshow":
                r = await c.post(f"{LOCAL}/api/demo/exit-slideshow", timeout=3)
                return {"req_id": req_id, **r.json()}

            elif msg_type == "activate_demo":
                r = await c.post(f"{LOCAL}/api/demo/activate", timeout=25)
                return {"req_id": req_id, **r.json()}

            elif msg_type == "deactivate_demo":
                r = await c.post(f"{LOCAL}/api/demo/deactivate", timeout=10)
                return {"req_id": req_id, **r.json()}

            elif msg_type == "get_pours":
                date_param = message.get("date", "")
                url = f"{LOCAL}/api/pours?limit=200"
                if date_param:
                    url += f"&date={date_param}"
                r = await c.get(url, timeout=5)
                return {"req_id": req_id, "pours": r.json() if r.status_code == 200 else []}

            elif msg_type == "get_pour_stats":
                r = await c.get(f"{LOCAL}/api/pours/stats", timeout=5)
                return {"req_id": req_id, **(r.json() if r.status_code == 200 else {})}

            elif msg_type == "trigger_update":
                asyncio.create_task(_run_ota_update())
                return {"req_id": req_id, "ok": True}

            # ── Machineapp (tablet UI via cloud) ─────────────────────────────
            elif msg_type == "verify_pin":
                r = await c.post(f"{LOCAL}/api/auth/verify-pin", json={"pin": message.get("pin")}, timeout=5)
                return {"req_id": req_id, "ok": r.status_code == 200}

            elif msg_type == "set_bartender_pin":
                # Accepteert zowel 'pin' als 'new_pin' voor achterwaartse compatibiliteit
                new_pin = message.get("pin") or message.get("new_pin")
                r = await c.post(f"{LOCAL}/api/auth/set-pin", json={
                    "admin_pin": message.get("admin_pin"),
                    "new_pin":   new_pin,
                }, timeout=5)
                if r.status_code >= 400:
                    err = r.json().get("detail", "Fout")
                    return {"req_id": req_id, "ok": False, "error": err}
                return {"req_id": req_id, "ok": True}

            elif msg_type == "remove_bartender_pin":
                r = await c.post(f"{LOCAL}/api/auth/set-pin", json={
                    "admin_pin": message.get("admin_pin"),
                    "new_pin":   "",
                }, timeout=5)
                if r.status_code >= 400:
                    err = r.json().get("detail", "Fout")
                    return {"req_id": req_id, "ok": False, "error": err}
                return {"req_id": req_id, "ok": True}

            elif msg_type == "get_bartender_pin":
                r = await c.get(f"{LOCAL}/api/auth/bartender-pin", timeout=5)
                return {"req_id": req_id, **r.json()}

            elif msg_type == "restart":
                import subprocess
                subprocess.Popen(["sudo", "systemctl", "restart", "mixmate"])
                return {"req_id": req_id, "ok": True}

            elif msg_type == "unpaired":
                # Portaal heeft machine ontkoppeld — wis lokale koppeling
                r = await c.post(f"{LOCAL}/api/cloud/unpair", timeout=5)
                return {"req_id": req_id, "ok": r.status_code < 300}

            elif msg_type == "cancel_pour":
                r = await c.post(f"{LOCAL}/api/pour/cancel", timeout=5)
                return {"req_id": req_id, "ok": r.status_code < 300}

            elif msg_type == "create_pour":
                r = await c.post(f"{LOCAL}/api/pours", json=message.get("data", {}), timeout=5)
                return {"req_id": req_id, **(r.json() if r.status_code < 300 else {})}

            elif msg_type == "get_favorites":
                r = await c.get(f"{LOCAL}/api/favorites", timeout=5)
                return {"req_id": req_id, "items": r.json() if r.status_code == 200 else []}

            elif msg_type == "add_favorite":
                r = await c.post(f"{LOCAL}/api/favorites/{message.get('id')}", timeout=5)
                return {"req_id": req_id, "ok": r.status_code < 300}

            elif msg_type == "remove_favorite":
                r = await c.delete(f"{LOCAL}/api/favorites/{message.get('id')}", timeout=5)
                return {"req_id": req_id, "ok": r.status_code < 300}

            elif msg_type == "start_pour":
                global _active_pour_task
                if cloud_ws and not _active_pour_task:
                    _active_pour_task = asyncio.create_task(
                        _stream_pour(cloud_ws, message.get("recipe_id"), message.get("scale", 1.0))
                    )
                return {"req_id": req_id, "ok": True}

            elif msg_type == "http_proxy":
                method  = message.get("method", "GET")
                path    = message.get("path", "/")
                body    = message.get("body")
                params  = message.get("params") or {}
                url     = f"{LOCAL}{path}"
                kwargs: dict = {"params": params, "timeout": 15.0}
                if body is not None:
                    kwargs["json"] = body
                r = await c.request(method, url, **kwargs)
                try:
                    data = r.json()
                except Exception:
                    data = None
                return {"req_id": req_id, "status": r.status_code, "data": data}

    except Exception as e:
        log.error("Fout bij verwerken commando %s: %s", msg_type, e)
        if req_id:
            return {"req_id": req_id, "type": "error", "detail": str(e)}

    return None

async def _run_ota_update():
    import subprocess, sys
    log.info("OTA update gestart via portaal")
    try:
        await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: subprocess.run(
                [sys.executable, "-m", "backend.updater", "--run"],
                cwd="/home/pi/mixmate",
            )
        )
    except Exception as e:
        log.error("OTA update mislukt: %s", e)


async def cloud_loop():
    # Herlees CLOUD_URL uit omgeving — kan zijn bijgewerkt via _load_env() na import
    cloud_url = os.getenv("MIXMATE_CLOUD_URL", "") or _CLOUD_URL_DEFAULT
    if not cloud_url:
        log.info("MIXMATE_CLOUD_URL niet ingesteld — cloud verbinding uitgeschakeld")
        return

    # Sla op in database zodat hij bewaard blijft na herinstallatie
    try:
        import sqlite3
        db_path = Path(__file__).parent.parent / "mixmate.db"
        if db_path.exists():
            con = sqlite3.connect(str(db_path))
            con.execute(
                "INSERT INTO config (key, value) VALUES ('MIXMATE_CLOUD_URL', ?) "
                "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                (cloud_url,)
            )
            con.commit()
            con.close()
    except Exception:
        pass

    machine_id = get_machine_id()
    ws_url = f"{cloud_url}/ws/machine/{machine_id}"
    log.info("Verbinden met cloud: %s", ws_url)

    for _ in range(30):
        try:
            async with httpx.AsyncClient(verify=False) as c:
                await c.get(f"{LOCAL}/api/system/version", timeout=2)
            break
        except Exception:
            await asyncio.sleep(2)

    backoff = 5
    while True:
        try:
            async with websockets.connect(ws_url, ping_interval=30, ping_timeout=10) as ws:
                global _active_ws
                _active_ws = ws
                backoff = 5  # reset na succesvolle verbinding
                log.info("Cloud verbonden")
                try:
                    async with httpx.AsyncClient(verify=False) as c:
                        await c.post(f"{LOCAL}/api/cloud/pair-code", json={"connected": True}, timeout=3)
                except Exception:
                    pass

                try:
                    async with httpx.AsyncClient(verify=False) as c:
                        v = await c.get(f"{LOCAL}/api/system/version", timeout=3)
                        m = await c.get(f"{LOCAL}/api/system/machine", timeout=3)
                    version = v.json().get("version", "")
                    model   = m.json().get("model", "")
                except Exception:
                    version = model = ""

                # Stuur het hardware-serienummer mee zodat de cloud het kan opslaan en vergrendelen
                raw_serial = machine_id.replace("pi-", "").upper() if machine_id.startswith("pi-") else machine_id
                try:
                    _s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                    _s.connect(("8.8.8.8", 80))
                    local_ip = _s.getsockname()[0]
                    _s.close()
                except Exception:
                    local_ip = None

                await ws.send(json.dumps({
                    "type": "heartbeat",
                    "version": version,
                    "model": model,
                    "serial_number": raw_serial,
                    "local_ip": local_ip,
                    "local_port": int(os.getenv("MIXMATE_PORT", "8000")),
                    "ssl": os.path.exists("/home/pi/mixmate/certs/cert.pem"),
                    "pairing_mode": True,
                }))

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
                                async with httpx.AsyncClient(verify=False) as c:
                                    await c.post(
                                        f"{LOCAL}/api/cloud/pair-code",
                                        json={
                                            "code":          message.get("code"),
                                            "paired":        message.get("paired"),
                                            "account_name":  message.get("account_name"),
                                            "account_email": message.get("account_email"),
                                        },
                                        timeout=3,
                                    )
                            except Exception:
                                pass
                            continue

                        if msg_type == "paired":
                            try:
                                async with httpx.AsyncClient(verify=False) as c:
                                    await c.post(
                                        f"{LOCAL}/api/cloud/pair-code",
                                        json={
                                            "paired":        True,
                                            "account_name":  message.get("account_name"),
                                            "account_email": message.get("account_email"),
                                        },
                                        timeout=3,
                                    )
                            except Exception:
                                pass
                            continue

                        if msg_type == "reset_code":
                            try:
                                async with httpx.AsyncClient(verify=False) as c:
                                    await c.post(
                                        f"{LOCAL}/api/cloud/pair-code",
                                        json={
                                            "reset_code":       message.get("code"),
                                            "reset_code_email": message.get("email"),
                                        },
                                        timeout=3,
                                    )
                            except Exception:
                                pass
                            continue

                        if msg_type == "heartbeat_ack":
                            continue

                        if msg_type == "maintenance_token":
                            global _maintenance_session
                            _maintenance_session = {
                                "token":         message.get("token"),
                                "url":           message.get("url"),
                                "expires_hours": message.get("expires_hours", 8),
                            }
                            try:
                                async with httpx.AsyncClient(verify=False) as c:
                                    await c.post(
                                        f"{LOCAL}/api/maintenance/session",
                                        json=_maintenance_session,
                                        timeout=3,
                                    )
                            except Exception:
                                pass
                            continue

                        # Verwerk commando met timeout zodat één traag verzoek de loop niet blokkeert
                        try:
                            response = await asyncio.wait_for(handle_message(message, ws), timeout=20)
                        except asyncio.TimeoutError:
                            req_id = message.get("req_id")
                            log.warning("Timeout bij verwerken commando %s", msg_type)
                            response = {"req_id": req_id, "type": "error", "detail": "timeout"} if req_id else None
                        if response:
                            await ws.send(json.dumps(response))
                finally:
                    hb_task.cancel()

        except Exception as e:
            log.warning("Cloud verbinding verbroken: %s — herverbinden in %ds", e, backoff)
        finally:
            _active_ws = None

        try:
            async with httpx.AsyncClient(verify=False) as c:
                await c.post(f"{LOCAL}/api/cloud/pair-code", json={"connected": False}, timeout=3)
        except Exception:
            pass

        await asyncio.sleep(backoff)
        backoff = min(backoff * 2, 120)  # 5 → 10 → 20 → 40 → 80 → 120s max
