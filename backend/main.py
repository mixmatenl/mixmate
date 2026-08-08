import asyncio
import json
import logging
import os
import random
import time

log = logging.getLogger("mixmate")
from contextlib import asynccontextmanager
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlmodel import Session, select

from .database import create_db, get_session, engine
from .models import (
    Glass, GlassCreate, GlassRead, GlassUpdate,
    Category, CategoryCreate, CategoryRead, CategoryUpdate,
    IngredientCategory, IngredientCategoryCreate, IngredientCategoryRead, IngredientCategoryUpdate,
    Ingredient, IngredientCreate, IngredientRead, IngredientUpdate,
    Pump, PumpCreate, PumpRead, PumpUpdate, PumpSimple,
    Recipe, RecipeCreate, RecipeRead, RecipeUpdate,
    RecipeIngredient, RecipeIngredientRead,
    Favorite, Pour, PourCreate, PourRead,
    Session as MachineSession, SessionRead,
)
from datetime import datetime, timedelta
from sqlalchemy import func
from .hardware import loadcell, gpio
from .pouring import pour_recipe, cancel_pour
from .updater import get_version_info, check_updates_available, run_update
from .seed import seed_demo_data


_DB_PATH = Path(__file__).parent.parent / "mixmate.db"
_ENV_PATH = Path(__file__).parent.parent / ".env"

# Sleutels die we persistent opslaan in zowel .env als de database.
_PERSISTENT_KEYS = {"MACHINE_MODEL", "MIXMATE_CLOUD_URL", "ADMIN_PIN"}


def _db_get(key: str) -> str | None:
    """Lees een waarde uit de Config-tabel in de database."""
    try:
        import sqlite3
        if not _DB_PATH.exists():
            return None
        con = sqlite3.connect(str(_DB_PATH))
        # Tabel kan nog niet bestaan op eerste boot vóór create_db()
        con.execute(
            "CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '')"
        )
        row = con.execute("SELECT value FROM config WHERE key=?", (key,)).fetchone()
        con.close()
        return row[0] if row and row[0] else None
    except Exception:
        return None


def _db_set(key: str, value: str):
    """Schrijf een waarde naar de Config-tabel in de database."""
    try:
        import sqlite3
        if not _DB_PATH.exists():
            return
        con = sqlite3.connect(str(_DB_PATH))
        con.execute(
            "CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '')"
        )
        con.execute(
            "INSERT INTO config (key, value) VALUES (?, ?) "
            "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (key, value),
        )
        con.commit()
        con.close()
    except Exception:
        pass


def _env_set(key: str, value: str):
    """Schrijf/update een waarde in het .env bestand."""
    lines = []
    replaced = False
    if _ENV_PATH.exists():
        for line in _ENV_PATH.read_text().splitlines():
            if line.startswith(f"{key}="):
                lines.append(f"{key}={value}")
                replaced = True
            else:
                lines.append(line)
    if not replaced:
        lines.append(f"{key}={value}")
    _ENV_PATH.write_text("\n".join(lines) + "\n")


def _load_env():
    """
    Laad instellingen op bij herstart. Prioriteit per sleutel:
    1. Database (Config-tabel in mixmate.db) — overleeft alles
    2. .env bestand — fallback voor handmatig ingestelde waarden
    Waarden uit .env die nog niet in de database staan worden daarheen gekopieerd.
    """
    # Laad eerst .env in os.environ
    if _ENV_PATH.exists():
        for line in _ENV_PATH.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, val = line.partition("=")
                os.environ.setdefault(key.strip(), val.strip())

    # Database-waarden hebben prioriteit en worden naar .env gespiegeld
    for key in _PERSISTENT_KEYS:
        db_val = _db_get(key)
        if db_val:
            os.environ[key] = db_val
            # Zorg dat .env ook up-to-date is
            env_val = os.environ.get(key)
            if env_val != db_val:
                _env_set(key, db_val)
        elif key in os.environ:
            # Waarde staat in .env maar nog niet in DB → naar DB kopiëren
            _db_set(key, os.environ[key])


_cloud_task: asyncio.Task | None = None

_update_cache: dict = {"updates_available": False, "changelog": [], "compatible": True, "compat_message": None, "checked_at": 0}

async def _update_check_loop():
    """Achtergrondtaak: checkt elke 10 minuten op updates en slaat resultaat op in cache."""
    while True:
        try:
            has_updates, changelog = await check_updates_available()
            compatible = True
            compat_msg = None
            if has_updates:
                machine_model = _get_machine_model()
                if not machine_model:
                    compatible = False
                    compat_msg = "Stel eerst het machine model in."
                elif changelog:
                    target_version = changelog[0].get("version", "")
                    try:
                        compat_path = Path(__file__).parent.parent / "compat.json"
                        if compat_path.exists():
                            import json as _json
                            from packaging.version import Version
                            compat = _json.loads(compat_path.read_text()).get("versions", {})
                            tv = Version(target_version)
                            target_minor = f"{tv.major}.{tv.minor}"
                            for cv, models in compat.items():
                                try:
                                    cv_parsed = Version(cv)
                                    if f"{cv_parsed.major}.{cv_parsed.minor}" == target_minor or cv == target_version:
                                        if machine_model not in models:
                                            compatible = False
                                            compat_msg = f"Versie {target_version} is niet beschikbaar voor {machine_model}."
                                        break
                                except Exception:
                                    continue
                    except Exception:
                        pass
            _update_cache.update({
                "updates_available": has_updates,
                "changelog": changelog,
                "compatible": compatible,
                "compat_message": compat_msg,
                "checked_at": int(time.time()),
            })
        except Exception:
            pass
        await asyncio.sleep(600)  # 10 minuten

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _cloud_task
    create_db()   # eerst tabel aanmaken, dan pas uit DB lezen
    _auto_migrate_sessions()
    _start_new_session()
    _load_env()
    from .cloud_client import cloud_loop
    _cloud_task = asyncio.create_task(cloud_loop())
    asyncio.create_task(_update_check_loop())
    _schedule_major_update_reboot()
    # Herstel cooldowns en account-info uit DB (overleeft herstart)
    _load_cooldown_state()
    _cloud_pair["account_name"]  = _db_get("account_name")  or None
    _cloud_pair["account_email"] = _db_get("account_email") or None
    paired_val = _db_get("paired")
    if paired_val == "1":
        _cloud_pair["paired"] = True
    _start_mdns()
    asyncio.create_task(_bluetooth_loadcell_server())
    # Start installatie-hotspot automatisch als machine in factory state is
    machine_state = _db_get("machine_state") or "factory"
    if machine_state == "factory":
        asyncio.create_task(_ensure_hotspot())
    yield
    if _cloud_task:
        _cloud_task.cancel()
    gpio.cleanup()


async def _bluetooth_loadcell_server():
    """
    Bluetooth RFCOMM server — ontvangt gewichtsdata van Cocktailmachine-Pi
    als WiFi WebSocket niet beschikbaar is. Dezelfde data-interface als /ws/loadcell.
    """
    BT_CHANNEL = int(os.getenv("BT_CHANNEL", "1"))
    try:
        import socket as _sock
        server = _sock.socket(_sock.AF_BLUETOOTH, _sock.SOCK_STREAM, _sock.BTPROTO_RFCOMM)
        server.setsockopt(_sock.SOL_SOCKET, _sock.SO_REUSEADDR, 1)
        server.bind((_sock.BDADDR_ANY, BT_CHANNEL))
        server.listen(1)
        server.setblocking(False)
        log.info("Bluetooth RFCOMM server luistert op kanaal %d", BT_CHANNEL)
    except Exception as e:
        log.debug("Bluetooth server niet gestart: %s", e)
        return

    loop = asyncio.get_event_loop()
    while True:
        try:
            client, addr = await loop.run_in_executor(None, server.accept)
            log.info("Bluetooth loadcell verbonden van %s", addr)
            asyncio.create_task(_handle_bt_loadcell_client(client))
        except Exception as e:
            log.debug("Bluetooth accept fout: %s", e)
            await asyncio.sleep(1)


async def _handle_bt_loadcell_client(client_sock):
    """Leest JSON-regels van Bluetooth RFCOMM client en update de loadcell state."""
    loop = asyncio.get_event_loop()
    buf  = b""
    try:
        while True:
            chunk = await loop.run_in_executor(None, client_sock.recv, 256)
            if not chunk:
                break
            buf += chunk
            while b"\n" in buf:
                line, buf = buf.split(b"\n", 1)
                try:
                    msg = json.loads(line.decode())
                    if msg.get("tare"):
                        loadcell.tare()
                    elif "weight_g" in msg:
                        loadcell.network_update(float(msg["weight_g"]), transport="bluetooth")
                except Exception:
                    pass
    except Exception as e:
        log.debug("Bluetooth client verbroken: %s", e)
    finally:
        loadcell.network_disconnected()
        gpio.deactivate_all()
        log.warning("Bluetooth loadcell verbinding verbroken — pompen gestopt")
        try:
            client_sock.close()
        except Exception:
            pass


def _start_mdns():
    """Registreer de Pompmodule als _mixmate._tcp.local zodat de Cocktailmachine-Pi hem vindt."""
    try:
        import socket as _socket
        import threading
        from zeroconf import Zeroconf, ServiceInfo

        port = int(os.getenv("MIXMATE_PORT", "8000"))
        hostname = _socket.gethostname()
        local_ip = None
        try:
            s = _socket.socket(_socket.AF_INET, _socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
            s.close()
        except Exception:
            local_ip = "127.0.0.1"

        info = ServiceInfo(
            "_mixmate._tcp.local.",
            f"{hostname}._mixmate._tcp.local.",
            addresses=[_socket.inet_aton(local_ip)],
            port=port,
            properties={"role": "pompmodule"},
        )
        zc = Zeroconf()
        zc.register_service(info)
        log.info("mDNS geregistreerd: %s op %s:%d", hostname, local_ip, port)
    except Exception as e:
        log.debug("mDNS registratie mislukt (zeroconf niet geïnstalleerd?): %s", e)


def _schedule_major_update_reboot():
    flag = Path("/tmp/mixmate_major_update")
    if not flag.exists():
        return
    flag.unlink()
    async def _reboot():
        await asyncio.sleep(15)
        log.info("Major update — machine herstart nu")
        await asyncio.create_subprocess_exec("sudo", "reboot")
    asyncio.create_task(_reboot())


app = FastAPI(title="Mixmate", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _loaded_ingredient_ids(session: Session):
    return {
        p.ingredient_id for p in session.exec(select(Pump)).all()
        if p.ingredient_id and p.enabled
    }

def _build_recipe_read(recipe: Recipe, session: Session) -> RecipeRead:
    items = session.exec(
        select(RecipeIngredient).where(RecipeIngredient.recipe_id == recipe.id)
    ).all()
    loaded = _loaded_ingredient_ids(session)
    ingredients_read = []
    for item in sorted(items, key=lambda x: x.order):
        ing = session.get(Ingredient, item.ingredient_id)
        if ing:
            ingredients_read.append(RecipeIngredientRead(
                ingredient_id=ing.id,
                ingredient_name=ing.name,
                amount_ml=item.amount_ml,
                order=item.order,
                has_pump=ing.id in loaded,
            ))
    fully_automatic = len(ingredients_read) > 0 and all(i.has_pump for i in ingredients_read)
    partially_available = any(i.has_pump for i in ingredients_read)
    cat = session.get(Category, recipe.category_id) if recipe.category_id else None
    glass = session.get(Glass, recipe.glass_id) if recipe.glass_id else None
    total_volume_ml = sum(i.amount_ml for i in ingredients_read)
    pour_count = session.exec(
        select(func.count(Pour.id)).where(Pour.recipe_id == recipe.id)
    ).one()
    # Cooldown-blokkering: is een benodigde pomp in cooldown?
    now = time.monotonic()
    cooled_slots = {slot for slot, exp in _cooldown_state.items() if exp > now}
    cooldown_blocked = False
    if cooled_slots:
        pumps_in_cooldown = session.exec(
            select(Pump).where(Pump.slot.in_(list(cooled_slots)))
        ).all()
        blocked_ing_ids = {p.ingredient_id for p in pumps_in_cooldown if p.ingredient_id}
        cooldown_blocked = any(i.ingredient_id in blocked_ing_ids for i in ingredients_read)
    return RecipeRead(
        id=recipe.id, name=recipe.name, description=recipe.description,
        image_url=recipe.image_url, category_id=recipe.category_id,
        category_name=cat.name if cat else None,
        glass_id=recipe.glass_id,
        glass_name=glass.name if glass else None,
        glass_volume_ml=glass.volume_ml if glass else None,
        total_volume_ml=total_volume_ml,
        enabled=recipe.enabled,
        ingredients=ingredients_read,
        fully_automatic=fully_automatic,
        partially_available=partially_available,
        pour_count=pour_count or 0,
        cooldown_blocked=cooldown_blocked,
    )


# ── PIN / auth ─────────────────────────────────────────────────────────────────

_BACKOFFICE_PIN = "0502"  # Altijd vast — nooit instelbaar


def _get_bartender_pin() -> str:
    return _db_get("BARTENDER_PIN") or "2580"


@app.post("/api/auth/verify-pin")
def verify_pin(body: dict):
    if body.get("pin") == _get_bartender_pin():
        return {"ok": True}
    raise HTTPException(403, "Verkeerde PIN")

@app.post("/api/auth/verify-admin-pin")
def verify_admin_pin(body: dict):
    if body.get("pin") == _BACKOFFICE_PIN:
        return {"ok": True}
    raise HTTPException(403, "Verkeerde PIN")

@app.post("/api/auth/set-pin")
def set_pin(body: dict):
    """Wijzig bartender PIN (vereist backoffice PIN ter verificatie)."""
    if body.get("admin_pin") != _BACKOFFICE_PIN:
        raise HTTPException(403, "Niet geautoriseerd")
    new_pin = str(body.get("new_pin", "")).strip()
    if new_pin == "":
        _db_set("BARTENDER_PIN", "")
        return {"ok": True}
    if len(new_pin) < 4 or not new_pin.isdigit():
        raise HTTPException(400, "PIN moet minimaal 4 cijfers zijn")
    _db_set("BARTENDER_PIN", new_pin)
    return {"ok": True}

@app.get("/api/auth/bartender-pin")
def get_bartender_pin_endpoint():
    return {"pin": _get_bartender_pin()}

# Backwards compat
@app.post("/api/backoffice/verify-pin")
def verify_pin_compat(body: dict):
    return verify_pin(body)


# ── Glasses ───────────────────────────────────────────────────────────────────

@app.get("/api/glasses", response_model=List[GlassRead])
def list_glasses(session: Session = Depends(get_session)):
    return session.exec(select(Glass).order_by(Glass.sort_order, Glass.volume_ml)).all()

@app.post("/api/glasses", response_model=GlassRead)
def create_glass(data: GlassCreate, session: Session = Depends(get_session)):
    glass = Glass(**data.model_dump())
    session.add(glass); session.commit(); session.refresh(glass)
    return glass

@app.patch("/api/glasses/{glass_id}", response_model=GlassRead)
def update_glass(glass_id: int, data: GlassUpdate, session: Session = Depends(get_session)):
    glass = session.get(Glass, glass_id)
    if not glass: raise HTTPException(404)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(glass, k, v)
    session.add(glass); session.commit(); session.refresh(glass)
    return glass

@app.delete("/api/glasses/{glass_id}")
def delete_glass(glass_id: int, session: Session = Depends(get_session)):
    glass = session.get(Glass, glass_id)
    if not glass: raise HTTPException(404)
    for r in session.exec(select(Recipe).where(Recipe.glass_id == glass_id)).all():
        r.glass_id = None; session.add(r)
    session.delete(glass); session.commit()
    return {"ok": True}

@app.get("/api/glass-catalog")
async def glass_catalog():
    """Haalt de glazencatalogus op uit de MIXMATE webshop (cloud) en geeft deze terug aan de frontend."""
    import httpx as _httpx
    raw = (os.environ.get("MIXMATE_CLOUD_URL") or "https://mixmate-cloud-production.up.railway.app").rstrip("/")
    cloud_url = raw.replace("wss://", "https://").replace("ws://", "http://")
    try:
        async with _httpx.AsyncClient(timeout=8, verify=False) as client:
            r = await client.get(f"{cloud_url}/api/glass-catalog")
            r.raise_for_status()
            return r.json()
    except Exception as e:
        log.warning(f"glass-catalog fetch mislukt: {e}")
        return []


# ── Categories ────────────────────────────────────────────────────────────────

@app.get("/api/categories", response_model=List[CategoryRead])
def list_categories(session: Session = Depends(get_session)):
    return session.exec(select(Category).order_by(Category.sort_order)).all()

@app.post("/api/categories", response_model=CategoryRead)
def create_category(data: CategoryCreate, session: Session = Depends(get_session)):
    cat = Category(**data.model_dump())
    session.add(cat); session.commit(); session.refresh(cat)
    return cat

@app.patch("/api/categories/{cat_id}", response_model=CategoryRead)
def update_category(cat_id: int, data: CategoryUpdate, session: Session = Depends(get_session)):
    cat = session.get(Category, cat_id)
    if not cat: raise HTTPException(404)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(cat, k, v)
    session.add(cat); session.commit(); session.refresh(cat)
    return cat

@app.delete("/api/categories/{cat_id}")
def delete_category(cat_id: int, session: Session = Depends(get_session)):
    cat = session.get(Category, cat_id)
    if not cat: raise HTTPException(404)
    # Unlink recipes
    for r in session.exec(select(Recipe).where(Recipe.category_id == cat_id)).all():
        r.category_id = None
        session.add(r)
    session.delete(cat); session.commit()
    return {"ok": True}


# ── Ingredients ───────────────────────────────────────────────────────────────

def _ing_read(ing: Ingredient, session: Session) -> IngredientRead:
    cat = session.get(IngredientCategory, ing.ingredient_category_id) if ing.ingredient_category_id else None
    return IngredientRead(
        id=ing.id, name=ing.name, is_carbonated=ing.is_carbonated,
        image_url=ing.image_url or "",
        ingredient_category_id=ing.ingredient_category_id,
        ingredient_category_name=cat.name if cat else None,
    )


@app.get("/api/ingredients", response_model=List[IngredientRead])
def list_ingredients(session: Session = Depends(get_session)):
    return [_ing_read(i, session) for i in session.exec(select(Ingredient)).all()]

@app.post("/api/ingredients", response_model=IngredientRead)
def create_ingredient(data: IngredientCreate, session: Session = Depends(get_session)):
    ing = Ingredient(**data.model_dump())
    session.add(ing); session.commit(); session.refresh(ing)
    return _ing_read(ing, session)

@app.patch("/api/ingredients/{ingredient_id}", response_model=IngredientRead)
def update_ingredient(ingredient_id: int, data: IngredientUpdate, session: Session = Depends(get_session)):
    ing = session.get(Ingredient, ingredient_id)
    if not ing: raise HTTPException(404)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(ing, k, v)
    session.add(ing); session.commit(); session.refresh(ing)
    return _ing_read(ing, session)

@app.post("/api/ingredients/{ingredient_id}/image", response_model=IngredientRead)
async def upload_ingredient_image(ingredient_id: int, file: UploadFile = File(...), session: Session = Depends(get_session)):
    ing = session.get(Ingredient, ingredient_id)
    if not ing: raise HTTPException(404)
    import base64, imghdr
    data = await file.read()
    ext = (imghdr.what(None, h=data) or "jpeg")
    ing.image_url = f"data:image/{ext};base64," + base64.b64encode(data).decode()
    session.add(ing); session.commit(); session.refresh(ing)
    return _ing_read(ing, session)

@app.delete("/api/ingredients/{ingredient_id}")
def delete_ingredient(ingredient_id: int, session: Session = Depends(get_session)):
    ing = session.get(Ingredient, ingredient_id)
    if not ing: raise HTTPException(404)
    session.delete(ing); session.commit()
    return {"ok": True}


# ── Ingrediënt-categorieën ────────────────────────────────────────────────────

@app.get("/api/ingredient-categories", response_model=List[IngredientCategoryRead])
def list_ingredient_categories(session: Session = Depends(get_session)):
    return session.exec(select(IngredientCategory).order_by(IngredientCategory.sort_order)).all()

@app.post("/api/ingredient-categories", response_model=IngredientCategoryRead)
def create_ingredient_category(data: IngredientCategoryCreate, session: Session = Depends(get_session)):
    cat = IngredientCategory(**data.model_dump())
    session.add(cat); session.commit(); session.refresh(cat)
    return cat

@app.patch("/api/ingredient-categories/{cat_id}", response_model=IngredientCategoryRead)
def update_ingredient_category(cat_id: int, data: IngredientCategoryUpdate, session: Session = Depends(get_session)):
    cat = session.get(IngredientCategory, cat_id)
    if not cat: raise HTTPException(404)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(cat, k, v)
    session.add(cat); session.commit(); session.refresh(cat)
    return cat

@app.delete("/api/ingredient-categories/{cat_id}")
def delete_ingredient_category(cat_id: int, session: Session = Depends(get_session)):
    cat = session.get(IngredientCategory, cat_id)
    if not cat: raise HTTPException(404)
    # Ontkoppel ingrediënten die deze categorie hadden
    for ing in session.exec(select(Ingredient).where(Ingredient.ingredient_category_id == cat_id)).all():
        ing.ingredient_category_id = None
        session.add(ing)
    session.delete(cat); session.commit()
    return {"ok": True}


# ── Pumps (full — backoffice only) ────────────────────────────────────────────

@app.get("/api/pumps", response_model=List[PumpRead])
def list_pumps(session: Session = Depends(get_session)):
    pumps = session.exec(select(Pump)).all()
    result = []
    for p in pumps:
        ing = session.get(Ingredient, p.ingredient_id) if p.ingredient_id else None
        ing_read = IngredientRead(id=ing.id, name=ing.name, is_carbonated=ing.is_carbonated, image_url=ing.image_url or "") if ing else None
        result.append(PumpRead(id=p.id, slot=p.slot, pump_type=p.pump_type, gpio_pin=p.gpio_pin,
            ml_per_second=p.ml_per_second, enabled=p.enabled,
            ingredient_id=p.ingredient_id, ingredient=ing_read))
    return result

# Pumps simple — MOET vóór /{pump_id} staan anders matcht FastAPI "simple" als int
@app.get("/api/pumps/simple", response_model=List[PumpSimple])
def list_pumps_simple(session: Session = Depends(get_session)):
    pumps = session.exec(select(Pump)).all()
    result = []
    for p in pumps:
        ing = session.get(Ingredient, p.ingredient_id) if p.ingredient_id else None
        ing_read = IngredientRead(id=ing.id, name=ing.name, is_carbonated=ing.is_carbonated, image_url=ing.image_url or "") if ing else None
        result.append(PumpSimple(id=p.id, slot=p.slot, pump_type=p.pump_type,
            ingredient_id=p.ingredient_id, ingredient=ing_read, enabled=p.enabled))
    return result

@app.post("/api/pumps", response_model=PumpRead)
def create_pump(data: PumpCreate, session: Session = Depends(get_session)):
    pump = Pump(**data.model_dump())
    session.add(pump); session.commit(); session.refresh(pump)
    ing = session.get(Ingredient, pump.ingredient_id) if pump.ingredient_id else None
    ing_read = IngredientRead(id=ing.id, name=ing.name, is_carbonated=ing.is_carbonated) if ing else None
    return PumpRead(**pump.model_dump(), ingredient=ing_read)

@app.patch("/api/pumps/{pump_id}", response_model=PumpRead)
def update_pump(pump_id: int, data: PumpUpdate, session: Session = Depends(get_session)):
    pump = session.get(Pump, pump_id)
    if not pump: raise HTTPException(404)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(pump, k, v)
    session.add(pump); session.commit(); session.refresh(pump)
    ing = session.get(Ingredient, pump.ingredient_id) if pump.ingredient_id else None
    ing_read = IngredientRead(id=ing.id, name=ing.name, is_carbonated=ing.is_carbonated) if ing else None
    return PumpRead(**pump.model_dump(), ingredient=ing_read)

@app.delete("/api/pumps/{pump_id}")
def delete_pump(pump_id: int, session: Session = Depends(get_session)):
    pump = session.get(Pump, pump_id)
    if not pump: raise HTTPException(404)
    session.delete(pump); session.commit()
    return {"ok": True}

@app.patch("/api/pumps/{pump_id}/ingredient")
def assign_ingredient(pump_id: int, body: dict, session: Session = Depends(get_session)):
    pump = session.get(Pump, pump_id)
    if not pump: raise HTTPException(404)
    pump.ingredient_id = body.get("ingredient_id")
    session.add(pump); session.commit()
    return {"ok": True}


# ── Spoelroutine ──────────────────────────────────────────────────────────────
# Simpel ontwerp: één globale dict, polling via GET /api/pumps/flush-status.
# Geen WebSocket nodig — zowel de machine-overlay als het portaal pollen HTTP.

_flush_state: dict = {"active": False}
_cooldown_state: dict = {}   # slot (int) → expiry monotonic time (float)


def _persist_cooldown_state():
    """Sla cooldowns op als wall-clock timestamps zodat ze een herstart overleven."""
    import json
    wall_now  = time.time()
    mono_now  = time.monotonic()
    persisted = {
        str(slot): wall_now + (expiry - mono_now)
        for slot, expiry in _cooldown_state.items()
        if expiry > mono_now
    }
    _db_set("cooldown_state", json.dumps(persisted))


def _load_cooldown_state():
    """Herstel cooldowns uit DB na herstart; verlopen entries worden genegeerd."""
    import json
    raw = _db_get("cooldown_state")
    if not raw:
        return
    try:
        stored   = json.loads(raw)
        wall_now = time.time()
        mono_now = time.monotonic()
        for slot_str, wall_expiry in stored.items():
            remaining = wall_expiry - wall_now
            if remaining > 0:
                _cooldown_state[int(slot_str)] = mono_now + remaining
                log.info("Cooldown hersteld — leiding %s: nog %.0fs", slot_str, remaining)
    except Exception as e:
        log.warning("Cooldown herstel mislukt: %s", e)
_prime_state: dict   = {"active": False}
_prime_control: dict = {"pause": False, "stop": False}
_machine_blocked: bool = False
_demo_mode_active: bool = False
_demo_slideshow_active: bool = False
_demo_data_loaded: bool = False
_current_session_id: Optional[int] = None


def _auto_migrate_sessions():
    """Voeg ontbrekende kolommen toe aan bestaande databases."""
    from sqlalchemy import text
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE pour ADD COLUMN session_id INTEGER REFERENCES session(id)"))
            conn.commit()
        except Exception:
            pass  # kolom bestaat al
        # Zet alle pompen met een onrealistisch lage snelheid (< 5 ml/s) naar 35.0
        try:
            conn.execute(text("UPDATE pump SET ml_per_second = 35.0 WHERE ml_per_second < 5.0"))
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE ingredient ADD COLUMN ingredient_category_id INTEGER REFERENCES ingredientcategory(id)"))
            conn.commit()
        except Exception:
            pass


def _start_new_session():
    global _current_session_id
    from sqlmodel import Session as DBSession
    with DBSession(engine) as db:
        s = MachineSession()
        db.add(s); db.commit(); db.refresh(s)
        _current_session_id = s.id


FLUSH_WEIGHT_LIMIT_G = 2000  # Weegschaal-beveiliging: stop onmiddellijk boven 2 kg

async def _run_flush_task(pumps: list):
    """Achtergrondtaak: bestuurt GPIO en houdt _flush_state bij."""
    global _flush_state
    try:
        for i, p in enumerate(pumps):
            slot     = p["slot"]
            duration = p["duration"]
            gpio_pin = p["gpio_pin"]

            _flush_state.update({
                "done": i, "current_slot": slot,
                "current_duration": duration, "elapsed": 0,
            })

            weight_stop = False
            try:
                gpio.setup_pin(gpio_pin)
                gpio.activate(gpio_pin)
                start = time.monotonic()
                while True:
                    elapsed = time.monotonic() - start
                    if elapsed >= duration:
                        break
                    # Veiligheidsstop: Cocktailmachine-Pi verbinding weg
                    if loadcell.is_network_stale():
                        log.warning("Loadcell verbinding verbroken — pomp %s gestopt (veiligheidsstop)", slot)
                        weight_stop = True
                        break
                    # Weegschaal-beveiliging: > 2 kg → direct stoppen
                    weight_g = loadcell.get_weight_grams()
                    if weight_g > FLUSH_WEIGHT_LIMIT_G:
                        log.warning("Spoelbeveiliging: %.0fg > %dg — leiding %s gestopt", weight_g, FLUSH_WEIGHT_LIMIT_G, slot)
                        weight_stop = True
                        break
                    _flush_state["elapsed"] = round(elapsed, 1)
                    await asyncio.sleep(0.1)
            finally:
                gpio.deactivate(gpio_pin)

            if weight_stop:
                _flush_state = {
                    "active": False, "total": len(pumps), "done": i,
                    "weight_stop": True,
                    "error": f"Gestopt: gewicht boven {FLUSH_WEIGHT_LIMIT_G // 1000} kg (weegschaalbeveiliging)",
                }
                return

            await asyncio.sleep(0.2)

        # Cooldown per gespoelde leiding (1–8 min willekeurig)
        now = time.monotonic()
        for p in pumps:
            secs = random.randint(60, 480)
            _cooldown_state[p["slot"]] = now + secs
            log.info("Leiding %s: cooldown %ds", p["slot"], secs)
        _persist_cooldown_state()
        _flush_state = {"active": False, "total": len(pumps), "done": len(pumps)}
    except Exception as e:
        log.error("Flush taak fout bij leiding %s: %s", _flush_state.get("current_slot"), e)
        _flush_state = {"active": False, "error": str(e)}


@app.get("/api/pumps/flush-status")
def get_flush_status():
    return _flush_state


# ── Cooldown (na spoelen) ─────────────────────────────────────────────────────

@app.get("/api/pumps/cooldown-status")
def get_cooldown_status(session: Session = Depends(get_session)):
    now    = time.monotonic()
    result = []
    # Verwijder verlopen entries
    expired = [s for s, exp in _cooldown_state.items() if exp <= now]
    for s in expired:
        del _cooldown_state[s]
    for slot, expiry in _cooldown_state.items():
        pump = session.exec(select(Pump).where(Pump.slot == slot)).first()
        ing  = session.get(Ingredient, pump.ingredient_id) if pump and pump.ingredient_id else None
        result.append({
            "slot":            slot,
            "remaining_seconds": round(expiry - now),
            "ingredient_name": ing.name if ing else None,
        })
    return result


# ── Doorspoelen (prime) ───────────────────────────────────────────────────────

async def _run_prime_task(gpio_pin: int, slot: int):
    global _prime_state, _prime_control
    try:
        gpio.setup_pin(gpio_pin)
        gpio.activate(gpio_pin)
        elapsed = 0.0
        start   = time.monotonic()
        while True:
            if _prime_control["stop"]:
                break
            if _prime_control["pause"]:
                gpio.deactivate(gpio_pin)
                _prime_state["paused"] = True
                while _prime_control["pause"] and not _prime_control["stop"]:
                    await asyncio.sleep(0.1)
                if _prime_control["stop"]:
                    break
                gpio.activate(gpio_pin)
                _prime_state["paused"] = False
                start = time.monotonic() - elapsed  # hervat zonder elapsed te resetten
            elapsed = time.monotonic() - start
            _prime_state["elapsed"] = round(elapsed, 1)
            await asyncio.sleep(0.1)
    finally:
        gpio.deactivate(gpio_pin)
        _prime_state = {"active": False, "slot": slot, "done": True}


@app.get("/api/pumps/prime-status")
def get_prime_status():
    return _prime_state


@app.post("/api/pumps/{slot}/prime/start")
async def prime_start(slot: int, session: Session = Depends(get_session)):
    global _prime_state, _prime_control
    if _prime_state.get("active"):
        raise HTTPException(409, "Doorspoelen al actief")
    if _flush_state.get("active"):
        raise HTTPException(409, "Spoelroutine actief")
    if slot in _cooldown_state and _cooldown_state[slot] > time.monotonic():
        rem = round(_cooldown_state[slot] - time.monotonic())
        raise HTTPException(423, f"Leiding {slot} is geblokkeerd — nog {rem}s wachten")
    pump = session.exec(select(Pump).where(Pump.slot == slot)).first()
    if not pump or pump.gpio_pin is None:
        raise HTTPException(404, "Pomp niet gevonden of geen GPIO")
    _prime_control = {"pause": False, "stop": False}
    _prime_state   = {"active": True, "slot": slot, "paused": False, "elapsed": 0.0}
    asyncio.create_task(_run_prime_task(pump.gpio_pin, slot))
    return {"ok": True}


@app.post("/api/pumps/{slot}/prime/pause")
def prime_pause(slot: int):
    global _prime_control
    if not _prime_state.get("active") or _prime_state.get("slot") != slot:
        raise HTTPException(409, "Geen actief doorspoelen op dit slot")
    _prime_control["pause"] = True
    return {"ok": True}


@app.post("/api/pumps/{slot}/prime/resume")
def prime_resume(slot: int):
    global _prime_control
    if not _prime_state.get("active") or _prime_state.get("slot") != slot:
        raise HTTPException(409, "Geen actief doorspoelen op dit slot")
    _prime_control["pause"] = False
    return {"ok": True}


@app.post("/api/pumps/{slot}/prime/stop")
def prime_stop(slot: int):
    global _prime_control
    _prime_control["stop"] = True
    return {"ok": True}


@app.post("/api/machine/block")
def block_machine():
    global _machine_blocked
    _machine_blocked = True
    return {"blocked": True}


@app.post("/api/machine/unblock")
def unblock_machine():
    global _machine_blocked
    _machine_blocked = False
    return {"blocked": False}


@app.get("/api/machine/blocked")
def get_blocked():
    return {"blocked": _machine_blocked}


@app.get("/api/pumps/flush-debug")
def flush_debug(session: Session = Depends(get_session)):
    """Diagnose-endpoint: toont of pompen gpio_pins hebben."""
    pumps = session.exec(select(Pump)).all()
    return [{"id": p.id, "slot": p.slot, "gpio_pin": p.gpio_pin, "enabled": p.enabled} for p in pumps]


@app.post("/api/pumps/flush-all")
async def flush_all_pumps(body: dict, session: Session = Depends(get_session)):
    global _flush_state
    if _flush_state.get("active"):
        raise HTTPException(status_code=409, detail="Spoelung al actief")

    pumps_data = sorted(body.get("pumps", []), key=lambda p: p.get("slot", 0))
    if not pumps_data:
        raise HTTPException(status_code=400, detail="Geen leidingen opgegeven")

    # Resolve GPIO pins nu (met DB sessie) zodat de achtergrondtaak geen DB nodig heeft
    resolved = []
    skipped  = []
    for p in pumps_data:
        slot     = p.get("slot")
        duration = float(p.get("duration", 10))
        pump = session.exec(select(Pump).where(Pump.slot == slot)).first()
        if pump and pump.gpio_pin is not None:
            resolved.append({"slot": slot, "duration": duration, "gpio_pin": pump.gpio_pin})
        else:
            skipped.append(slot)

    if skipped:
        log.warning("Leidingen overgeslagen (geen pump/gpio_pin): %s", skipped)
    if not resolved:
        raise HTTPException(
            status_code=404,
            detail=f"Geen geldige leidingen gevonden. Overgeslagen: {skipped}. "
                   f"Controleer of de pompen een gpio_pin hebben ingesteld."
        )

    # Zet active=True VOOR de task zodat de overlay direct kan tonen
    _flush_state = {
        "active": True, "total": len(resolved), "done": 0,
        "current_slot": resolved[0]["slot"], "current_duration": resolved[0]["duration"], "elapsed": 0,
    }
    asyncio.create_task(_run_flush_task(resolved))
    return {"ok": True, "pumps": len(resolved)}


@app.post("/api/pumps/test")
async def pump_test(body: dict):
    """Korte GPIO-puls op één pomp — gebruikt door MonteurWizard voor testen."""
    pump_id      = int(body.get("pump_id", 0))
    duration_ms  = max(100, min(int(body.get("duration_ms", 1000)), 5000))

    from sqlmodel import Session
    with Session(engine) as db:
        from .models import Pump
        pump = db.get(Pump, pump_id)
        if not pump:
            raise HTTPException(404, "Pomp niet gevonden")
        gpio_pin = pump.gpio_pin

    gpio.setup_pin(gpio_pin)
    gpio.activate(gpio_pin)
    await asyncio.sleep(duration_ms / 1000)
    gpio.deactivate(gpio_pin)
    return {"ok": True, "gpio_pin": gpio_pin, "duration_ms": duration_ms}


@app.post("/api/pumps/flush-test")
async def flush_test(body: dict):
    """Simuleert een spoelroutine zonder GPIO — voor testen van de overlay."""
    global _flush_state
    if _flush_state.get("active"):
        raise HTTPException(status_code=409, detail="Spoelung al actief")
    n = max(1, int(body.get("slots", 3)))

    async def _run():
        global _flush_state
        _flush_state = {"active": True, "total": n, "done": 0,
                        "current_slot": 1, "current_duration": 8, "elapsed": 0}
        for i in range(n):
            _flush_state.update({"done": i, "current_slot": i + 1, "current_duration": 8, "elapsed": 0})
            for tick in range(16):  # 8s in 0.5s stappen
                _flush_state["elapsed"] = round(tick * 0.5, 1)
                await asyncio.sleep(0.5)
            await asyncio.sleep(0.5)
        _flush_state = {"active": False, "total": n, "done": n}

    asyncio.create_task(_run())
    return {"ok": True}


# ── Recipes ───────────────────────────────────────────────────────────────────

@app.get("/api/recipes", response_model=List[RecipeRead])
def list_recipes(session: Session = Depends(get_session)):
    recipes = session.exec(select(Recipe)).all()
    built = [_build_recipe_read(r, session) for r in recipes]
    # Meest gemaakt bovenaan, daarna alfabetisch
    built.sort(key=lambda r: (-r.pour_count, r.name.lower()))
    return built

@app.post("/api/recipes", response_model=RecipeRead)
def create_recipe(data: RecipeCreate, session: Session = Depends(get_session)):
    recipe = Recipe(name=data.name, description=data.description,
                    category_id=data.category_id, glass_id=data.glass_id, image_url=data.image_url)
    session.add(recipe); session.commit(); session.refresh(recipe)
    for i, ing_data in enumerate(data.ingredients):
        session.add(RecipeIngredient(recipe_id=recipe.id,
            ingredient_id=ing_data.ingredient_id, amount_ml=ing_data.amount_ml, order=i))
    session.commit()
    return _build_recipe_read(recipe, session)

@app.patch("/api/recipes/{recipe_id}", response_model=RecipeRead)
def update_recipe(recipe_id: int, data: RecipeUpdate, session: Session = Depends(get_session)):
    recipe = session.get(Recipe, recipe_id)
    if not recipe: raise HTTPException(404)
    for k, v in data.model_dump(exclude_unset=True, exclude={"ingredients"}).items():
        setattr(recipe, k, v)
    session.add(recipe); session.commit(); session.refresh(recipe)
    if data.ingredients is not None:
        for item in session.exec(select(RecipeIngredient).where(RecipeIngredient.recipe_id == recipe_id)).all():
            session.delete(item)
        for i, ing_data in enumerate(data.ingredients):
            session.add(RecipeIngredient(recipe_id=recipe.id,
                ingredient_id=ing_data.ingredient_id, amount_ml=ing_data.amount_ml, order=i))
        session.commit()
    return _build_recipe_read(recipe, session)

@app.delete("/api/recipes/{recipe_id}")
def delete_recipe(recipe_id: int, session: Session = Depends(get_session)):
    recipe = session.get(Recipe, recipe_id)
    if not recipe: raise HTTPException(404)
    for item in session.exec(select(RecipeIngredient).where(RecipeIngredient.recipe_id == recipe_id)).all():
        session.delete(item)
    session.delete(recipe); session.commit()
    return {"ok": True}

@app.post("/api/recipes/{recipe_id}/image")
async def upload_recipe_image(recipe_id: int, file: UploadFile = File(...), session: Session = Depends(get_session)):
    recipe = session.get(Recipe, recipe_id)
    if not recipe: raise HTTPException(404)
    uploads_dir = Path(__file__).parent.parent / "uploads"
    uploads_dir.mkdir(exist_ok=True)
    suffix = Path(file.filename).suffix.lower() if file.filename else ".jpg"
    if suffix not in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
        suffix = ".jpg"
    filename = f"recipe_{recipe_id}{suffix}"
    dest = uploads_dir / filename
    content = await file.read()
    if len(content) > 8_000_000:  # max 8MB
        raise HTTPException(413, "Bestand te groot (max 8MB)")
    dest.write_bytes(content)
    recipe.image_url = f"/uploads/{filename}"
    session.add(recipe); session.commit()
    return {"image_url": recipe.image_url}


# ── Favorites ─────────────────────────────────────────────────────────────────

@app.get("/api/favorites")
def list_favorites(session: Session = Depends(get_session)):
    favs = session.exec(select(Favorite)).all()
    return [f.recipe_id for f in favs]

@app.post("/api/favorites/{recipe_id}")
def add_favorite(recipe_id: int, session: Session = Depends(get_session)):
    existing = session.exec(
        select(Favorite).where(Favorite.recipe_id == recipe_id)
    ).first()
    if not existing:
        session.add(Favorite(recipe_id=recipe_id))
        session.commit()
    return {"ok": True}

@app.delete("/api/favorites/{recipe_id}")
def remove_favorite(recipe_id: int, session: Session = Depends(get_session)):
    for f in session.exec(select(Favorite).where(Favorite.recipe_id == recipe_id)).all():
        session.delete(f)
    session.commit()
    return {"ok": True}


# ── Pour history ──────────────────────────────────────────────────────────────

# Statische routes MOETEN vóór /{...} routes — hier geen conflict, maar
# stats staat bewust vóór de generieke GET zodat alles netjes geordend is.
@app.get("/api/pours/stats")
def pour_stats(session: Session = Depends(get_session)):
    total_pours = session.exec(select(func.count(Pour.id))).one()
    start_of_day = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_pours = session.exec(
        select(func.count(Pour.id)).where(Pour.poured_at >= start_of_day)
    ).one()

    top_rows = session.exec(
        select(Pour.recipe_name, func.count(Pour.id).label("cnt"))
        .group_by(Pour.recipe_name)
        .order_by(func.count(Pour.id).desc())
        .limit(5)
    ).all()
    top_recipes = [{"name": name or "Onbekend", "count": cnt} for name, cnt in top_rows]

    # Gietsels per dag (laatste 7 dagen)
    since = datetime.utcnow() - timedelta(days=6)
    since = since.replace(hour=0, minute=0, second=0, microsecond=0)
    recent = session.exec(select(Pour).where(Pour.poured_at >= since)).all()
    counts = {}
    for p in recent:
        d = p.poured_at.date().isoformat()
        counts[d] = counts.get(d, 0) + 1
    pours_per_day = []
    for i in range(7):
        d = (since + timedelta(days=i)).date().isoformat()
        pours_per_day.append({"date": d, "count": counts.get(d, 0)})

    return {
        "total_pours": total_pours,
        "today_pours": today_pours,
        "top_recipes": top_recipes,
        "pours_per_day": pours_per_day,
    }

@app.get("/api/pours", response_model=List[PourRead])
def list_pours(limit: int = 200, date: str = None, session: Session = Depends(get_session)):
    q = select(Pour).order_by(Pour.poured_at.desc())
    if date:
        try:
            from datetime import date as date_type
            d = date_type.fromisoformat(date)
            day_start = datetime.combine(d, datetime.min.time())
            day_end   = datetime.combine(d, datetime.max.time())
            q = q.where(Pour.poured_at >= day_start, Pour.poured_at <= day_end)
        except ValueError:
            pass
    return session.exec(q.limit(limit)).all()

@app.post("/api/pours", response_model=PourRead)
def create_pour(data: PourCreate, session: Session = Depends(get_session)):
    pour = Pour(recipe_id=data.recipe_id, recipe_name=data.recipe_name, scale=data.scale, session_id=_current_session_id)
    session.add(pour); session.commit(); session.refresh(pour)
    return pour


# ── Sessies ────────────────────────────────────────────────────────────────────

@app.get("/api/sessions", response_model=List[SessionRead])
def list_sessions(session: Session = Depends(get_session)):
    return session.exec(
        select(MachineSession).order_by(MachineSession.started_at.desc()).limit(50)
    ).all()

@app.get("/api/sessions/current")
def get_current_session(session: Session = Depends(get_session)):
    if _current_session_id is None:
        return {"id": None, "started_at": None, "ended_at": None, "pour_count": 0}
    s = session.get(MachineSession, _current_session_id)
    count = session.exec(select(func.count(Pour.id)).where(Pour.session_id == _current_session_id)).one()
    return {"id": s.id, "started_at": s.started_at, "ended_at": s.ended_at, "pour_count": count}

@app.post("/api/sessions/end")
def end_session(session: Session = Depends(get_session)):
    global _current_session_id
    if _current_session_id is None:
        return {"ok": True}
    s = session.get(MachineSession, _current_session_id)
    if s and not s.ended_at:
        s.ended_at = datetime.utcnow()
        session.add(s); session.commit()
    _current_session_id = None
    return {"ok": True}

@app.get("/api/sessions/{session_id}/pours", response_model=List[PourRead])
def get_session_pours(session_id: int, session: Session = Depends(get_session)):
    return session.exec(
        select(Pour).where(Pour.session_id == session_id).order_by(Pour.poured_at.desc())
    ).all()


# ── Bluetooth adres endpoint ───────────────────────────────────────────────────

@app.get("/api/system/bluetooth-address")
async def bluetooth_address():
    """Geeft het Bluetooth MAC-adres van de Pompmodule terug."""
    try:
        proc = await asyncio.create_subprocess_exec(
            "hciconfig", "hci0",
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL,
        )
        out, _ = await proc.communicate()
        for line in out.decode().splitlines():
            if "BD Address" in line or "Address" in line:
                parts = line.split()
                for p in parts:
                    if len(p) == 17 and p.count(":") == 5:
                        return {"address": p, "channel": int(os.getenv("BT_CHANNEL", "1"))}
    except Exception:
        pass
    return {"address": None, "channel": 1}


# ── Loadcell WebSocket (Cocktailmachine-Pi → Pompmodule) ──────────────────────

_loadcell_ws: WebSocket | None = None

@app.websocket("/ws/loadcell")
async def loadcell_ws(websocket: WebSocket):
    """
    De Cocktailmachine-Pi (Secondary Pi) verbindt hier en stuurt continu
    gewichtsmetingen: {"weight_g": 123.4, "tare": false}
    Als de verbinding wegvalt stoppen de pompen automatisch (veiligheidsstop).
    """
    global _loadcell_ws
    await websocket.accept()
    _loadcell_ws = websocket
    loadcell.network_disconnected()  # reset tot eerste meting binnenkomt
    log.info("Cocktailmachine-Pi verbonden via /ws/loadcell")
    try:
        async for raw in websocket.iter_text():
            try:
                msg = json.loads(raw)
                if msg.get("tare"):
                    loadcell.tare()
                else:
                    loadcell.network_update(float(msg.get("weight_g", 0)), transport="wifi")
            except Exception:
                pass
    except Exception:
        pass
    finally:
        _loadcell_ws = None
        loadcell.network_disconnected()
        log.warning("Cocktailmachine-Pi verbinding verbroken — pompen worden gestopt")
        gpio.deactivate_all()


@app.get("/api/loadcell/status")
def loadcell_status():
    """Status van de Cocktailmachine-Pi verbinding."""
    return {
        "connected":       loadcell._network_connected,
        "stale":           loadcell.is_network_stale(),
        "mode":            "network" if loadcell.is_network_mode else "local",
        "weight_g":        round(loadcell.get_weight_grams(), 1),
        "connection_type": loadcell._connection_type,
    }


@app.post("/api/system/bluetooth-discoverable")
async def bluetooth_discoverable():
    """Zet de Pompmodule 60 seconden in Bluetooth koppelmodus (just-works, geen PIN)."""
    try:
        cmds = [
            "bluetoothctl power on",
            "bluetoothctl discoverable on",
            "bluetoothctl pairable on",
            "bluetoothctl agent NoInputNoOutput",
            "bluetoothctl default-agent",
        ]
        for cmd in cmds:
            proc = await asyncio.create_subprocess_shell(
                cmd,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL,
            )
            await proc.wait()
        log.info("Bluetooth koppelmodus ingeschakeld (60s)")
        asyncio.create_task(_bt_discoverable_timeout())
        return {"ok": True, "duration_s": 60}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def _bt_discoverable_timeout():
    await asyncio.sleep(60)
    try:
        proc = await asyncio.create_subprocess_shell(
            "bluetoothctl discoverable off",
            stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL,
        )
        await proc.wait()
        log.info("Bluetooth koppelmodus uitgeschakeld")
    except Exception:
        pass


# ── Installatie-hotspot (WiFi AP voor koppeling zonder klantennetwerk) ────────

HOTSPOT_SSID     = "MIXMATE-SETUP"
HOTSPOT_PASSWORD = "mixmate123"
_hotspot_active  = False


async def _run_cmd(cmd: str) -> tuple[int, str]:
    proc = await asyncio.create_subprocess_shell(
        cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )
    out, _ = await proc.communicate()
    return proc.returncode, out.decode().strip()


async def _ensure_hotspot():
    """Start de installatie-hotspot als die nog niet actief is."""
    global _hotspot_active
    try:
        # Check of hotspot al draait
        rc, out = await _run_cmd(f'nmcli con show --active | grep "{HOTSPOT_SSID}"')
        if rc == 0:
            _hotspot_active = True
            log.info("Installatie-hotspot %s al actief", HOTSPOT_SSID)
            return
        log.info("Installatie-hotspot %s starten…", HOTSPOT_SSID)
        # Verwijder oude verbinding als die bestaat
        await _run_cmd(f'nmcli con delete "{HOTSPOT_SSID}" 2>/dev/null || true')
        rc, out = await _run_cmd(
            f'nmcli device wifi hotspot ifname wlan0 '
            f'con-name "{HOTSPOT_SSID}" ssid "{HOTSPOT_SSID}" '
            f'password "{HOTSPOT_PASSWORD}"'
        )
        if rc == 0:
            _hotspot_active = True
            log.info("Installatie-hotspot %s actief — IP 10.42.0.1", HOTSPOT_SSID)
        else:
            log.warning("Hotspot starten mislukt: %s", out)
    except Exception as e:
        log.warning("Hotspot fout: %s", e)


async def _stop_hotspot():
    global _hotspot_active
    try:
        await _run_cmd(f'nmcli con delete "{HOTSPOT_SSID}"')
        _hotspot_active = False
        log.info("Installatie-hotspot gestopt")
    except Exception as e:
        log.warning("Hotspot stoppen mislukt: %s", e)


@app.get("/api/system/hotspot/status")
async def hotspot_status():
    rc, out = await _run_cmd(f'nmcli con show --active | grep "{HOTSPOT_SSID}"')
    active = rc == 0
    return {
        "active":   active,
        "ssid":     HOTSPOT_SSID,
        "password": HOTSPOT_PASSWORD,
        "gateway":  "10.42.0.1",
    }


@app.post("/api/system/hotspot/start")
async def hotspot_start():
    await _ensure_hotspot()
    return {"ok": True, "ssid": HOTSPOT_SSID, "password": HOTSPOT_PASSWORD}


@app.post("/api/system/hotspot/stop")
async def hotspot_stop():
    await _stop_hotspot()
    return {"ok": True}


# ── Weight & pour ─────────────────────────────────────────────────────────────

@app.get("/api/weight")
def get_weight():
    return {"weight_g": round(loadcell.get_weight_grams(), 1)}

@app.post("/api/weight/tare")
def tare_scale():
    loadcell.tare()
    return {"ok": True, "weight_g": round(loadcell.get_weight_grams(), 1)}

@app.post("/api/weight/calibrate")
def calibrate_scale(body: dict):
    known_weight_g = float(body.get("known_weight_g", 0))
    if known_weight_g <= 0:
        raise HTTPException(400, "Voer een geldig gewicht in (> 0 gram)")
    scale = loadcell.calibrate(known_weight_g)
    measured = round(loadcell.get_weight_grams(), 1)
    return {"ok": True, "scale_factor": round(scale, 4), "measured_g": measured}

@app.get("/api/weight/scale-factor")
def get_scale_factor():
    return {"scale_factor": round(loadcell._scale, 4)}

@app.get("/api/system/loadcell-pins")
def get_loadcell_pins():
    return loadcell.get_pins()

@app.post("/api/system/loadcell-pins")
def set_loadcell_pins(body: dict):
    dout = int(body.get("dout_pin", loadcell._dout_pin))
    sck = int(body.get("sck_pin", loadcell._sck_pin))
    loadcell.set_pins(dout, sck)
    return {"ok": True, "dout_pin": dout, "sck_pin": sck, "restart_required": True}

@app.post("/api/pour/cancel")
def cancel():
    cancel_pour()
    return {"ok": True}

@app.websocket("/ws/pour/{recipe_id}")
async def websocket_pour(websocket: WebSocket, recipe_id: int, scale: float = 1.0):
    await websocket.accept()
    if _machine_blocked:
        await websocket.send_json({"type": "error", "message": "Machine is geblokkeerd — spoelroutine actief."})
        await websocket.close()
        return
    if _flush_state.get("active"):
        await websocket.send_json({"type": "error", "message": "Machine is bezig met spoelen — probeer het later opnieuw."})
        await websocket.close()
        return
    with Session(engine) as session:
        recipe = session.get(Recipe, recipe_id)
        if not recipe:
            await websocket.send_json({"type": "error", "message": "Recept niet gevonden"})
            await websocket.close(); return
        items = session.exec(select(RecipeIngredient).where(RecipeIngredient.recipe_id == recipe_id)).all()
        pumps = session.exec(select(Pump)).all()
        pump_by_ingredient = {p.ingredient_id: p for p in pumps if p.ingredient_id}
        steps = []
        for item in sorted(items, key=lambda x: x.order):
            pump = pump_by_ingredient.get(item.ingredient_id)
            if not pump: continue  # manual ingredients are skipped (handled in frontend)
            ing = session.get(Ingredient, item.ingredient_id)
            steps.append({"pin": pump.gpio_pin, "ml": item.amount_ml * scale,
                "ml_per_second": pump.ml_per_second, "name": ing.name if ing else "?"})

    async def send_progress(data: dict):
        try: await websocket.send_json(data)
        except Exception: pass

    try:
        if _demo_mode_active:
            # Nep-gieten: snelle simulatie zonder GPIO, indrukwekkend voor demo
            total_ml = sum(s["ml"] for s in steps)
            DEMO_POUR_SECONDS = 4.0
            elapsed = 0.0
            interval = 0.05
            while elapsed < DEMO_POUR_SECONDS:
                await asyncio.sleep(interval)
                elapsed += interval
                progress = min(elapsed / DEMO_POUR_SECONDS, 1.0)
                step_idx = min(int(progress * len(steps)), len(steps) - 1)
                await send_progress({
                    "type": "progress",
                    "step": step_idx,
                    "step_name": steps[step_idx]["name"],
                    "step_progress": progress,
                    "total_progress": round(progress, 3),
                    "poured_ml": round(progress * total_ml, 1),
                    "target_ml": total_ml,
                    "mode": "demo",
                })
            await send_progress({"type": "done", "total_progress": 1.0})
        else:
            await pour_recipe(steps, send_progress)
    except WebSocketDisconnect:
        cancel_pour()


# ── Machine model ─────────────────────────────────────────────────────────────

MACHINE_MODELS = {
    "MATE.1":     {"has_co2": False, "has_valves": False, "tier": 1},
    "MATE.1 CO2": {"has_co2": True,  "has_valves": True,  "tier": 2},
    "MATE.1 PRO": {"has_co2": True,  "has_valves": True,  "tier": 3},
}

def _get_machine_model() -> str:
    return os.environ.get("MACHINE_MODEL", "")

def _set_machine_model(model: str):
    """Sla machine model op in database én .env zodat het altijd behouden blijft."""
    os.environ["MACHINE_MODEL"] = model
    _db_set("MACHINE_MODEL", model)
    _env_set("MACHINE_MODEL", model)

# ── Cloud koppeling ───────────────────────────────────────────────────────────

_cloud_pair: dict = {
    "code": None, "paired": False, "connected": False,
    "account_name": None, "account_email": None,
    "reset_code": None, "reset_code_email": None,
}

_maintenance_session = None

@app.post("/api/maintenance/session")
def set_maintenance_session(body: dict):
    """Intern endpoint — cloud_client.py schrijft de onderhoudssessie hierheen."""
    global _maintenance_session
    _maintenance_session = {
        "token":         body.get("token"),
        "url":           body.get("url"),
        "expires_hours": body.get("expires_hours", 8),
    }
    return {"ok": True}

@app.get("/api/maintenance/session")
def get_maintenance_session():
    """Frontend leest hieruit de actieve onderhoudssessie (voor QR weergave)."""
    return _maintenance_session or {}

@app.post("/api/maintenance/request")
async def request_maintenance_session():
    """Vraagt een onderhoudssessie-token aan bij de cloud via de WebSocket-verbinding."""
    from .cloud_client import send_to_cloud, _active_ws
    if _active_ws is None:
        raise HTTPException(503, "Niet verbonden met cloud — controleer internetverbinding")
    try:
        await send_to_cloud({"type": "request_maintenance_token"})
    except Exception as e:
        raise HTTPException(503, f"Kon token niet aanvragen: {e}")
    return {"ok": True, "message": "Token aangevraagd — QR verschijnt zo meteen"}

@app.post("/api/cloud/pair-code")
def set_pair_code(body: dict):
    """Intern endpoint — cloud_client.py schrijft de koppelcode en verbindingsstatus hierheen."""
    if "code"             in body: _cloud_pair["code"]             = body.get("code")
    if "paired" in body:
        _cloud_pair["paired"] = body.get("paired")
        _db_set("paired", "1" if body.get("paired") else "0")
    if "connected"        in body: _cloud_pair["connected"]        = body.get("connected")
    if "reset_code"       in body: _cloud_pair["reset_code"]       = body.get("reset_code")
    if "reset_code_email" in body: _cloud_pair["reset_code_email"] = body.get("reset_code_email")
    # Account info ook in DB opslaan zodat het herstart overleeft
    if "account_name" in body:
        _cloud_pair["account_name"] = body.get("account_name")
        _db_set("account_name", body.get("account_name") or "")
    if "account_email" in body:
        _cloud_pair["account_email"] = body.get("account_email")
        _db_set("account_email", body.get("account_email") or "")
    return {"ok": True}

@app.get("/api/cloud/pair-code")
def get_pair_code():
    """Frontend leest hieruit de koppelcode en cloud-status."""
    return _cloud_pair

@app.get("/api/cloud/status")
def get_cloud_status():
    """Diagnostics: verbindingsstatus, laatste fout en cloud URL."""
    from .cloud_client import _cloud_status
    return _cloud_status

@app.post("/api/cloud/unpair")
async def unpair_cloud():
    import httpx
    from .cloud_client import get_machine_id
    _cloud_pair["code"]          = None
    _cloud_pair["paired"]        = False
    _cloud_pair["account_name"]  = None
    _cloud_pair["account_email"] = None
    cloud_url = os.environ.get("MIXMATE_CLOUD_URL", "")
    if cloud_url:
        try:
            machine_id = get_machine_id()
            cloud_http = cloud_url.replace("wss://", "https://").replace("ws://", "http://")
            async with httpx.AsyncClient() as c:
                await c.post(f"{cloud_http}/api/machines/{machine_id}/unpair", timeout=5)
        except Exception:
            pass
    return {"ok": True}


@app.post("/api/cloud/reset")
async def reset_cloud():
    """Reset de volledige cloudverbinding: wis koppelstatus en herstart de WebSocket-client."""
    global _cloud_task
    _cloud_pair["code"]      = None
    _cloud_pair["paired"]    = False
    _cloud_pair["connected"] = False
    if _cloud_task and not _cloud_task.done():
        _cloud_task.cancel()
        try:
            await _cloud_task
        except (asyncio.CancelledError, Exception):
            pass
    from .cloud_client import cloud_loop
    _cloud_task = asyncio.create_task(cloud_loop())
    return {"ok": True}


# ── Schermschaal instellen ────────────────────────────────────────────────────

SWAY_CONFIG = Path("/home/pi/.config/sway/config")
SCALE_FILE  = Path("/home/pi/.display_scale")

def _read_scale() -> float:
    try:
        return float(SCALE_FILE.read_text().strip())
    except Exception:
        return 1.5

def _write_sway_config(scale: float):
    chromium_bin = "chromium" if Path("/usr/bin/chromium").exists() else "chromium-browser"
    SWAY_CONFIG.parent.mkdir(parents=True, exist_ok=True)
    SWAY_CONFIG.write_text(f"""\
output * scale {scale}
default_border none
seat * hide_cursor 1
focus_follows_mouse no
exec {chromium_bin} \\
  --kiosk \\
  --noerrdialogs \\
  --disable-infobars \\
  --no-first-run \\
  --password-store=basic \\
  --disable-translate \\
  --touch-events=enabled \\
  --enable-touch-drag-drop \\
  --disable-pinch \\
  --overscroll-history-navigation=0 \\
  --ozone-platform=wayland \\
  --enable-features=UseOzonePlatform \\
  --disable-features=TranslateUI \\
  http://localhost:8000
""")

@app.get("/api/system/display")
def get_display():
    return {"scale": _read_scale()}

@app.post("/api/system/display")
async def set_display(body: dict):
    scale = float(body.get("scale", 1.5))
    scale = max(0.5, min(3.0, round(scale * 4) / 4))  # stap van 0.25
    SCALE_FILE.write_text(str(scale))
    _write_sway_config(scale)
    # Sway herladen — past scale toe zonder reboot
    try:
        proc = await asyncio.create_subprocess_exec(
            "swaymsg", "reload",
            stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL,
        )
        await asyncio.wait_for(proc.communicate(), timeout=5)
    except Exception:
        pass
    return {"ok": True, "scale": scale}

# ── Systeem beheer ────────────────────────────────────────────────────────────

@app.post("/api/system/restart")
async def system_restart():
    """Herstart de Raspberry Pi."""
    async def _reboot():
        await asyncio.sleep(2)
        await asyncio.create_subprocess_exec("sudo", "reboot")
    asyncio.create_task(_reboot())
    return {"ok": True, "message": "Machine herstart over 2 seconden..."}

async def _ethernet_status() -> dict:
    """Detecteer actieve ethernet verbinding via nmcli."""
    try:
        proc = await asyncio.create_subprocess_exec(
            "nmcli", "-t", "-f", "TYPE,STATE,CONNECTION", "dev",
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL,
        )
        out, _ = await proc.communicate()
        for line in out.decode().splitlines():
            parts = line.split(":")
            if len(parts) >= 2 and parts[0] == "ethernet" and parts[1] == "connected":
                iface_name = parts[2] if len(parts) > 2 else "Ethernet"
                return {"connected": True, "name": iface_name}
    except Exception:
        pass
    # Fallback via /sys
    for iface in Path("/sys/class/net").iterdir():
        if iface.name.startswith("eth") or iface.name.startswith("en"):
            try:
                carrier = (iface / "carrier").read_text().strip()
                if carrier == "1":
                    return {"connected": True, "name": iface.name}
            except Exception:
                pass
    return {"connected": False, "name": ""}


@app.get("/api/system/wifi/status")
async def wifi_status():
    """Huidige WiFi én ethernet verbindingsstatus."""
    ethernet = await _ethernet_status()

    # Probeer nmcli voor WiFi
    try:
        proc = await asyncio.create_subprocess_exec(
            "sudo", "nmcli", "-t", "-f", "ACTIVE,SSID,SIGNAL", "dev", "wifi",
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL,
        )
        out, _ = await proc.communicate()
        for line in out.decode().splitlines():
            parts = line.split(":")
            if parts and parts[0] == "yes":
                return {
                    "connected": True, "ssid": parts[1] if len(parts) > 1 else "",
                    "signal": int(parts[2]) if len(parts) > 2 and parts[2].isdigit() else 0,
                    "ethernet": ethernet,
                }
    except Exception:
        pass
    # Fallback: lees /proc/net/wireless
    try:
        text = Path("/proc/net/wireless").read_text()
        for line in text.splitlines()[2:]:
            parts = line.split()
            if parts:
                iface = parts[0].rstrip(":")
                proc2 = await asyncio.create_subprocess_exec(
                    "wpa_cli", "-i", iface, "status",
                    stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL,
                )
                out2, _ = await proc2.communicate()
                ssid = ""
                for l in out2.decode().splitlines():
                    if l.startswith("ssid="):
                        ssid = l.split("=", 1)[1]
                    if l.startswith("wpa_state=COMPLETED"):
                        return {"connected": True, "ssid": ssid, "signal": 0, "ethernet": ethernet}
    except Exception:
        pass
    return {"connected": False, "ssid": "", "signal": 0, "ethernet": ethernet}

def _parse_nmcli_networks(raw: str) -> list:
    """
    Parseer nmcli terse output. Kolommen: SSID,SIGNAL,SECURITY,IN-USE
    nmcli escaped dubbele punten in waarden als r'\:', wij zetten die terug.
    """
    seen = set()
    result = []
    for line in raw.splitlines():
        # Splits op ':' maar niet op '\:' (escaped door nmcli)
        parts = []
        current = []
        i = 0
        while i < len(line):
            if line[i] == '\\' and i + 1 < len(line) and line[i+1] == ':':
                current.append(':')
                i += 2
            elif line[i] == ':':
                parts.append(''.join(current))
                current = []
                i += 1
            else:
                current.append(line[i])
                i += 1
        parts.append(''.join(current))

        if len(parts) < 4:
            continue
        ssid = parts[0].strip()
        if not ssid or ssid == '--' or ssid in seen:
            continue
        seen.add(ssid)
        try:
            signal = int(parts[1])
        except ValueError:
            signal = 0
        result.append({
            "ssid": ssid,
            "signal": signal,
            "secured": bool(parts[2] and parts[2] not in ('', '--')),
            "active": parts[3].strip() in ('*', 'yes'),
        })
    result.sort(key=lambda x: -x["signal"])
    return result


@app.get("/api/system/wifi/networks")
async def wifi_networks():
    """Beschikbare WiFi netwerken — probeert nmcli met --rescan yes, valt terug op wpa_cli."""
    networks = []

    # Primair: nmcli met --rescan yes (wacht intern tot scan klaar is, max ~10s)
    try:
        proc = await asyncio.create_subprocess_exec(
            "sudo", "nmcli", "-t", "-f", "SSID,SIGNAL,SECURITY,IN-USE",
            "dev", "wifi", "list", "--rescan", "yes",
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL,
        )
        out, _ = await asyncio.wait_for(proc.communicate(), timeout=15)
        if proc.returncode == 0 and out:
            networks = _parse_nmcli_networks(out.decode())
            if networks:
                return {"networks": networks, "method": "nmcli"}
    except Exception:
        pass

    # Fallback: nmcli zonder rescan (cached resultaten)
    try:
        proc = await asyncio.create_subprocess_exec(
            "sudo", "nmcli", "-t", "-f", "SSID,SIGNAL,SECURITY,IN-USE",
            "dev", "wifi", "list",
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL,
        )
        out, _ = await asyncio.wait_for(proc.communicate(), timeout=10)
        if out:
            networks = _parse_nmcli_networks(out.decode())
            if networks:
                return {"networks": networks, "method": "nmcli-cached"}
    except Exception:
        pass

    # Laatste fallback: lees /proc/net/wireless + wpa_cli
    try:
        proc = await asyncio.create_subprocess_exec(
            "wpa_cli", "-i", "wlan0", "scan_results",
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL,
        )
        out, _ = await asyncio.wait_for(proc.communicate(), timeout=10)
        text = out.decode()
        seen = set()
        for line in text.splitlines()[1:]:
            parts = line.split("\t")
            if len(parts) < 5:
                continue
            ssid = parts[4].strip()
            if not ssid or ssid in seen:
                continue
            seen.add(ssid)
            try:
                signal_dbm = int(parts[2])
                signal_pct = max(0, min(100, 2 * (signal_dbm + 100)))
            except Exception:
                signal_pct = 50
            networks.append({
                "ssid": ssid,
                "signal": signal_pct,
                "secured": "WPA" in parts[3] or "WEP" in parts[3],
                "active": False,
            })
        networks.sort(key=lambda x: -x["signal"])
        return {"networks": networks, "method": "wpa_cli"}
    except Exception as e:
        return {"networks": [], "error": str(e)}

@app.post("/api/system/wifi/connect")
async def wifi_connect(body: dict):
    """Verbind met een WiFi netwerk via nmcli of wpa_passphrase."""
    ssid     = str(body.get("ssid", "")).strip()
    password = str(body.get("password", "")).strip()
    if not ssid:
        raise HTTPException(400, "SSID ontbreekt")

    # Verwijder bestaand nmcli-profiel voor dit SSID (voorkomt "connection exists" fout)
    try:
        proc = await asyncio.create_subprocess_exec(
            "sudo", "nmcli", "connection", "delete", ssid,
            stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL,
        )
        await asyncio.wait_for(proc.communicate(), timeout=5)
    except Exception:
        pass

    # Probeer nmcli
    try:
        if password:
            cmd = [
                "sudo", "nmcli", "dev", "wifi", "connect", ssid,
                "password", password,
                "802-11-wireless-security.key-mgmt", "wpa-psk",
            ]
        else:
            cmd = ["sudo", "nmcli", "dev", "wifi", "connect", ssid]
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        out, err = await asyncio.wait_for(proc.communicate(), timeout=30)
        output = (out + err).decode()
        if proc.returncode == 0:
            return {"ok": True, "message": f"Verbonden met {ssid}"}
        # Geef leesbare foutmelding
        if "Secrets were required" in output or "password" in output.lower():
            msg = "Wachtwoord onjuist — controleer en probeer opnieuw"
        elif "No network with SSID" in output:
            msg = f"Netwerk '{ssid}' niet gevonden — scan opnieuw"
        else:
            msg = output.strip() or "Verbinding mislukt"
        return {"ok": False, "message": msg}
    except FileNotFoundError:
        pass
    except asyncio.TimeoutError:
        return {"ok": False, "message": "Verbinding time-out — controleer het wachtwoord"}
    except Exception as e:
        return {"ok": False, "message": str(e)}

    # Fallback: wpa_passphrase + wpa_cli
    try:
        import tempfile, os as _os
        conf_line = f'network={{\n  ssid="{ssid}"\n'
        if password:
            # wpa_passphrase genereert PSK hash
            gen = await asyncio.create_subprocess_exec(
                "wpa_passphrase", ssid, password,
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL,
            )
            gen_out, _ = await asyncio.wait_for(gen.communicate(), timeout=5)
            conf_line = gen_out.decode()
        else:
            conf_line += '  key_mgmt=NONE\n}\n'

        wpa_conf = Path("/etc/wpa_supplicant/wpa_supplicant.conf")
        existing = wpa_conf.read_text() if wpa_conf.exists() else 'ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev\nupdate_config=1\ncountry=NL\n'
        # Verwijder oude entry voor dit SSID
        import re as _re
        existing = _re.sub(
            r'network=\{[^}]*ssid="' + _re.escape(ssid) + r'"[^}]*\}', '', existing
        )
        new_conf = existing.strip() + '\n\n' + conf_line
        wpa_conf.write_text(new_conf)

        proc = await asyncio.create_subprocess_exec(
            "wpa_cli", "-i", "wlan0", "reconfigure",
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL,
        )
        await asyncio.wait_for(proc.communicate(), timeout=10)
        return {"ok": True, "message": f"Verbinding met {ssid} gestart — even geduld"}
    except Exception as e2:
        return {"ok": False, "message": f"Verbinding mislukt: {e2}"}

@app.post("/api/system/wifi/forget")
async def wifi_forget(body: dict):
    """Vergeet een opgeslagen WiFi netwerk (verwijdert nmcli-profiel)."""
    ssid = str(body.get("ssid", "")).strip()
    if not ssid:
        raise HTTPException(400, "SSID ontbreekt")
    try:
        proc = await asyncio.create_subprocess_exec(
            "sudo", "nmcli", "connection", "delete", ssid,
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
        )
        out, err = await asyncio.wait_for(proc.communicate(), timeout=10)
        if proc.returncode == 0:
            return {"ok": True, "message": f"Netwerk '{ssid}' vergeten"}
        output = (out + err).decode()
        if "Error" in output and "not found" in output.lower():
            return {"ok": True, "message": f"Netwerk '{ssid}' was niet opgeslagen"}
        return {"ok": False, "message": output.strip() or "Verwijderen mislukt"}
    except FileNotFoundError:
        return {"ok": False, "message": "nmcli niet beschikbaar"}
    except asyncio.TimeoutError:
        return {"ok": False, "message": "Time-out bij verwijderen"}
    except Exception as e:
        return {"ok": False, "message": str(e)}


# ── Machine instellingen ──────────────────────────────────────────────────────

@app.get("/api/system/machine")
def get_machine():
    model = _get_machine_model()
    caps = MACHINE_MODELS.get(model, {"has_co2": False, "has_valves": False, "tier": 0})
    return {
        "model": model,
        "configured": bool(model),
        "models_available": list(MACHINE_MODELS.keys()),
        **caps,
    }

@app.post("/api/system/machine")
def set_machine(body: dict):
    model = str(body.get("model", "")).strip()
    if model not in MACHINE_MODELS:
        raise HTTPException(400, f"Onbekend model. Kies uit: {list(MACHINE_MODELS.keys())}")
    _set_machine_model(model)
    caps = MACHINE_MODELS[model]
    return {"ok": True, "model": model, **caps}


# ── Calibration ───────────────────────────────────────────────────────────────

@app.websocket("/ws/calibrate/{pump_id}")
async def websocket_calibrate(websocket: WebSocket, pump_id: int):
    await websocket.accept()
    with Session(engine) as session:
        pump = session.get(Pump, pump_id)
        if not pump:
            await websocket.send_json({"type": "error", "message": "Pomp niet gevonden"})
            await websocket.close(); return
        pin = pump.gpio_pin
    try:
        msg = await websocket.receive_json()
        if msg.get("action") != "start":
            await websocket.send_json({"type": "error", "message": "Verwacht {action: start}"}); return
        seconds = max(1.0, min(30.0, float(msg.get("seconds", 5))))
        loadcell.tare()
        await asyncio.sleep(0.3)
        gpio.setup_pin(pin); gpio.activate(pin)
        await websocket.send_json({"type": "running", "seconds": seconds})
        start = time.monotonic()
        while True:
            elapsed = time.monotonic() - start
            if elapsed >= seconds: break
            weight = loadcell.get_weight_grams()
            if not (hasattr(loadcell, '_hx') and loadcell._hx):
                loadcell._mock_add(1.5 * 0.1); weight = loadcell.get_weight_grams()
            await websocket.send_json({"type": "progress", "elapsed": round(elapsed, 1), "weight_g": round(weight, 1)})
            await asyncio.sleep(0.1)
        gpio.deactivate(pin)
        final_weight = loadcell.get_weight_grams()
        await websocket.send_json({"type": "done", "elapsed": seconds,
            "weight_g": round(final_weight, 1), "suggested_ml": round(final_weight, 1)})
        save_msg = await websocket.receive_json()
        if save_msg.get("action") == "save":
            measured_ml = float(save_msg["measured_ml"])
            ml_per_second = round(measured_ml / seconds, 3)
            with Session(engine) as session:
                pump = session.get(Pump, pump_id)
                if not pump:
                    await websocket.send_json({"type": "error", "message": "Pomp niet meer gevonden"})
                    return
                pump.ml_per_second = ml_per_second
                session.add(pump); session.commit()
            await websocket.send_json({"type": "saved", "ml_per_second": ml_per_second})
    except Exception as e:
        gpio.deactivate(pin)
        await websocket.send_json({"type": "error", "message": str(e)})
    finally:
        gpio.deactivate(pin)


# ── Systeem beheer ───────────────────────────────────────────────────────────

@app.post("/api/system/factory-reset")
async def factory_reset():
    """
    Zet de machine terug naar fabrieksinstellingen.
    Fabrieksgegevens blijven ALTIJD bewaard:
      - machine_id, MACHINE_MODEL, MIXMATE_CLOUD_URL
      - LOADCELL_DOUT, LOADCELL_SCK, LOADCELL_SCALE (weegschaal)
      - GPIO-pinnen van pompen (slot/gpio_pin/pump_type blijven)
    Gebruikersinstellingen worden gewist:
      - Glazen, ingrediënten, recepten, categorieën
      - Ingredient-koppeling op pompen (maar de pompen zelf blijven)
      - Cloud-koppeling (account)
      - ADMIN_PIN en MIXMATE_PIN
    """
    import sqlite3

    # Fabriekssleutels die NOOIT gewist worden
    _FACTORY_KEYS = {
        'machine_id', 'MIXMATE_CLOUD_URL', 'MACHINE_MODEL',
        'LOADCELL_DOUT', 'LOADCELL_SCK', 'LOADCELL_SCALE',
    }
    _FACTORY_ENV_PREFIXES = (
        'MACHINE_MODEL=', 'MIXMATE_CLOUD_URL=',
        'LOADCELL_DOUT=', 'LOADCELL_SCK=', 'LOADCELL_SCALE=',
    )

    # 0. Wis in-memory state
    global _cooldown_state, _prime_state, _prime_control
    _cooldown_state.clear()
    _db_set("cooldown_state", "{}")
    _prime_state   = {"active": False}
    _prime_control = {"pause": False, "stop": False}

    # 1. Ontkoppel van cloud
    _cloud_pair["code"]          = None
    _cloud_pair["paired"]        = False
    _cloud_pair["connected"]     = False
    _cloud_pair["account_name"]  = None
    _cloud_pair["account_email"] = None
    cloud_url = os.environ.get("MIXMATE_CLOUD_URL", "")
    if cloud_url:
        try:
            from .cloud_client import get_machine_id
            machine_id = get_machine_id()
            cloud_http = cloud_url.replace("wss://", "https://").replace("ws://", "http://")
            async with httpx.AsyncClient() as c:
                await c.post(f"{cloud_http}/api/machines/{machine_id}/unpair", timeout=5)
        except Exception:
            pass

    # 2. Wis gebruikersdata uit database
    try:
        con = sqlite3.connect(str(_DB_PATH))
        # Verwijder gebruikersdata-tabellen volledig
        for table in ["recipeingredient", "recipe", "pour", "favorite",
                      "ingredient", "glass", "category"]:
            try:
                con.execute(f'DELETE FROM "{table}"')
            except Exception:
                pass
        # Pompen: behoud GPIO/slot/type, wis alleen de ingredient-koppeling
        try:
            con.execute("UPDATE pump SET ingredient_id = NULL, enabled = 1")
        except Exception:
            pass
        # Config: bewaar alleen fabriekssleutels
        placeholders = ",".join("?" * len(_FACTORY_KEYS))
        con.execute(
            f"DELETE FROM config WHERE key NOT IN ({placeholders})",
            list(_FACTORY_KEYS),
        )
        con.commit()
        con.close()
    except Exception:
        pass

    # 3. Wis gebruikers-env-variabelen (bewaar fabriekswaarden)
    if _ENV_PATH.exists():
        lines = [
            line for line in _ENV_PATH.read_text().splitlines()
            if not line or line.startswith("#")
               or any(line.startswith(p) for p in _FACTORY_ENV_PREFIXES)
        ]
        _ENV_PATH.write_text("\n".join(lines) + "\n")
    os.environ.pop("ADMIN_PIN",    None)
    os.environ.pop("MIXMATE_PIN",  None)

    # 4. Zet machine terug naar setup-wizard state
    try:
        con2 = sqlite3.connect(str(_DB_PATH))
        con2.execute(
            "INSERT OR REPLACE INTO config (key, value) VALUES ('machine_state', 'setup')"
        )
        con2.commit()
        con2.close()
    except Exception:
        pass

    # 5. Herstart service na korte vertraging
    async def _restart():
        await asyncio.sleep(2)
        import subprocess
        subprocess.Popen(["sudo", "systemctl", "restart", "mixmate"])
    asyncio.create_task(_restart())

    return {"ok": True}


# ── Machine lifecycle ─────────────────────────────────────────────────────────

@app.get("/api/system/machine-state")
def get_machine_state():
    """
    Geeft de huidige levenscyclusstatus van de machine:
      factory → alleen backoffice zichtbaar (fabrieksinstelling)
      setup   → klantinstallatie-wizard actief
      ready   → volledig operationeel
    Standaard: 'ready' (bestaande installaties)
    """
    val = _db_get("machine_state")
    return {"state": val or "factory"}


@app.post("/api/system/ready-to-pack")
async def ready_to_pack():
    """Markeert machine als klaar voor verzending → activeert setup-wizard voor klant."""
    import sqlite3
    con = sqlite3.connect(str(_DB_PATH))
    con.execute("INSERT OR REPLACE INTO config (key, value) VALUES ('machine_state', 'setup')")
    con.commit()
    con.close()
    return {"ok": True}


@app.post("/api/system/setup-complete")
async def setup_complete():
    """Voltooit de klantinstallatie-wizard → machine is operationeel."""
    import sqlite3
    con = sqlite3.connect(str(_DB_PATH))
    con.execute("INSERT OR REPLACE INTO config (key, value) VALUES ('machine_state', 'ready')")
    con.commit()
    con.close()
    return {"ok": True}


@app.post("/api/system/full-factory-reset")
async def full_factory_reset():
    """
    Volledige fabrieksreset (backoffice):
    Wist ALLES — inclusief pompen — zet machine terug naar 'factory' state.
    Enige uitzondering: WiFi-configuratie (in /etc/wpa_supplicant, niet in DB).
    """
    import sqlite3

    _KEEP_KEYS = {'machine_id', 'MIXMATE_CLOUD_URL', 'LOADCELL_DOUT', 'LOADCELL_SCK', 'LOADCELL_SCALE'}
    _FACTORY_ENV_PREFIXES = (
        'MACHINE_MODEL=', 'MIXMATE_CLOUD_URL=',
        'LOADCELL_DOUT=', 'LOADCELL_SCK=', 'LOADCELL_SCALE=',
    )

    # 0. Wis in-memory state
    global _cooldown_state, _prime_state, _prime_control
    _cooldown_state.clear()
    _db_set("cooldown_state", "{}")
    _prime_state   = {"active": False}
    _prime_control = {"pause": False, "stop": False}

    # 1. Ontkoppel van cloud
    _cloud_pair["code"]          = None
    _cloud_pair["paired"]        = False
    _cloud_pair["connected"]     = False
    _cloud_pair["account_name"]  = None
    _cloud_pair["account_email"] = None
    cloud_url = os.environ.get("MIXMATE_CLOUD_URL", "")
    if cloud_url:
        try:
            from .cloud_client import get_machine_id
            machine_id = get_machine_id()
            cloud_http = cloud_url.replace("wss://", "https://").replace("ws://", "http://")
            async with httpx.AsyncClient() as c:
                await c.post(f"{cloud_http}/api/machines/{machine_id}/unpair", timeout=5)
        except Exception:
            pass

    # 2. Wis ALLES inclusief pompen
    try:
        con = sqlite3.connect(str(_DB_PATH))
        for table in ["recipeingredient", "recipe", "pour", "favorite",
                      "ingredient", "glass", "category", "pump"]:
            try:
                con.execute(f'DELETE FROM "{table}"')
            except Exception:
                pass
        placeholders = ",".join("?" * len(_KEEP_KEYS))
        con.execute(
            f"DELETE FROM config WHERE key NOT IN ({placeholders})",
            list(_KEEP_KEYS),
        )
        con.execute("INSERT OR REPLACE INTO config (key, value) VALUES ('machine_state', 'factory')")
        con.commit()
        con.close()
    except Exception:
        pass

    # 3. Wis env (bewaar hardware-keys)
    if _ENV_PATH.exists():
        lines = [
            line for line in _ENV_PATH.read_text().splitlines()
            if not line or line.startswith("#")
               or any(line.startswith(p) for p in _FACTORY_ENV_PREFIXES)
        ]
        _ENV_PATH.write_text("\n".join(lines) + "\n")
    os.environ.pop("ADMIN_PIN",   None)
    os.environ.pop("MIXMATE_PIN", None)

    # 4. Wis alle WiFi-verbindingen en start installatie-hotspot
    async def _reset_wifi_and_hotspot():
        await asyncio.sleep(1)
        try:
            # Haal alle opgeslagen WiFi-verbindingen op
            rc, out = await _run_cmd("nmcli -t -f NAME,TYPE con show")
            for line in out.splitlines():
                parts = line.split(":")
                if len(parts) >= 2 and parts[1] in ("802-11-wireless", "wifi"):
                    name = parts[0]
                    if name != HOTSPOT_SSID:
                        await _run_cmd(f'nmcli con delete "{name}"')
                        log.info("WiFi-verbinding verwijderd: %s", name)
        except Exception as e:
            log.warning("WiFi wissen mislukt: %s", e)
        # Start installatie-hotspot
        await _ensure_hotspot()

    # 5. WiFi wissen, hotspot starten en volledig herstarten
    async def _reboot_after_reset():
        await asyncio.sleep(0.5)
        await _reset_wifi_and_hotspot()
        await asyncio.sleep(1)
        import subprocess
        subprocess.Popen(["sudo", "reboot"])
    asyncio.create_task(_reboot_after_reset())

    return {"ok": True}


@app.post("/api/system/reboot")
async def reboot_system():
    import subprocess
    subprocess.Popen(["sudo", "reboot"])
    return {"ok": True, "message": "Pi herstart over enkele seconden…"}

@app.post("/api/system/shutdown")
async def shutdown_system():
    import subprocess
    subprocess.Popen(["sudo", "shutdown", "-h", "now"])
    return {"ok": True, "message": "Pi wordt afgesloten…"}


# ── OTA Updates ──────────────────────────────────────────────────────────────

@app.get("/api/system/network-info")
def system_network_info():
    """Lokaal IP-adres en hostnaam van de Pompmodule — gebruikt door MonteurWizard."""
    import socket as _socket
    local_ip = None
    try:
        s = _socket.socket(_socket.AF_INET, _socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
    except Exception:
        local_ip = "127.0.0.1"
    return {
        "local_ip":  local_ip,
        "hostname":  _socket.gethostname(),
        "port":      int(os.getenv("MIXMATE_PORT", "8000")),
        "tablet_url": f"http://{local_ip}:{os.getenv('MIXMATE_PORT', '8000')}",
    }


@app.get("/api/system/version")
async def system_version():
    info = await get_version_info()
    return info


@app.get("/api/system/info")
async def system_info():
    """Uitgebreide machine-informatie: serienummer, netwerk, hardware, opslag."""
    from .cloud_client import get_machine_id
    import socket, time

    info: dict = {}

    # Serienummer / machine-ID
    info["machine_id"] = get_machine_id()

    # Software versie
    try:
        v = await get_version_info()
        info["version"] = v.get("version", "—")
    except Exception:
        info["version"] = "—"

    # Model
    info["model"] = _get_machine_model() or "—"

    # Hostnaam
    try:
        info["hostname"] = socket.gethostname()
    except Exception:
        info["hostname"] = "—"

    # IP-adres (wlan0 of eth0)
    try:
        import socket as _s
        with _s.socket(_s.AF_INET, _s.SOCK_DGRAM) as sock:
            sock.connect(("8.8.8.8", 80))
            info["ip_address"] = sock.getsockname()[0]
    except Exception:
        info["ip_address"] = "—"

    # MAC-adres wlan0
    try:
        mac = Path("/sys/class/net/wlan0/address").read_text().strip()
        info["mac_address"] = mac.upper()
    except Exception:
        try:
            mac = Path("/sys/class/net/eth0/address").read_text().strip()
            info["mac_address"] = mac.upper()
        except Exception:
            info["mac_address"] = "—"

    # Uptime
    try:
        uptime_secs = float(Path("/proc/uptime").read_text().split()[0])
        h, rem = divmod(int(uptime_secs), 3600)
        m = rem // 60
        info["uptime"] = f"{h}u {m}m"
        info["uptime_seconds"] = int(uptime_secs)
    except Exception:
        info["uptime"] = "—"

    # CPU-temperatuur
    try:
        temp_raw = Path("/sys/class/thermal/thermal_zone0/temp").read_text().strip()
        info["cpu_temp"] = round(int(temp_raw) / 1000, 1)
    except Exception:
        info["cpu_temp"] = None

    # Opslag (SD-kaart)
    try:
        proc = await asyncio.create_subprocess_exec(
            "df", "-h", "/",
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL,
        )
        out, _ = await proc.communicate()
        lines = out.decode().splitlines()
        if len(lines) > 1:
            parts = lines[1].split()
            info["disk_total"]  = parts[1] if len(parts) > 1 else "—"
            info["disk_used"]   = parts[2] if len(parts) > 2 else "—"
            info["disk_free"]   = parts[3] if len(parts) > 3 else "—"
            info["disk_pct"]    = parts[4] if len(parts) > 4 else "—"
    except Exception:
        pass

    # RAM
    try:
        mem = Path("/proc/meminfo").read_text()
        meminfo = {}
        for line in mem.splitlines():
            k, v = line.split(":", 1)
            meminfo[k.strip()] = v.strip()
        total_kb = int(meminfo.get("MemTotal", "0").split()[0])
        avail_kb = int(meminfo.get("MemAvailable", "0").split()[0])
        used_kb  = total_kb - avail_kb
        info["ram_total"] = f"{total_kb // 1024} MB"
        info["ram_used"]  = f"{used_kb  // 1024} MB"
        info["ram_free"]  = f"{avail_kb // 1024} MB"
    except Exception:
        pass

    return info

@app.get("/api/system/check-updates")
async def system_check_updates():
    has_updates, changelog = await check_updates_available()
    # Compatibiliteitscheck: mag dit model de nieuwste versie installeren?
    # Logica: compat.json bevat restricties per minor-versie (x.y).
    # Een bugfix (x.y.Z) erft de beperking van zijn minor-lijn (x.y).
    compatible = True
    compat_msg = None
    if has_updates:
        machine_model = _get_machine_model()
        # Geen model ingesteld → update blokkeren tot model geconfigureerd is
        if not machine_model:
            compatible = False
            compat_msg = "Stel eerst het machine model in via Backoffice → Machine voordat je een update installeert."
        elif changelog:
            target_version = changelog[0].get("version", "")
            try:
                compat_path = Path(__file__).parent.parent / "compat.json"
                if compat_path.exists():
                    import json as _json
                    from packaging.version import Version
                    compat = _json.loads(compat_path.read_text()).get("versions", {})
                    tv = Version(target_version)
                    target_minor = f"{tv.major}.{tv.minor}"
                    allowed = None
                    for cv, models in compat.items():
                        try:
                            cv_parsed = Version(cv)
                            cv_minor = f"{cv_parsed.major}.{cv_parsed.minor}"
                        except Exception:
                            continue
                        if cv == target_version or cv_minor == target_minor:
                            allowed = models
                            break
                    if allowed is not None and machine_model not in allowed:
                        compatible = False
                        compat_msg = (
                            f"Versie {target_version} is niet beschikbaar voor "
                            f"{machine_model}. Neem contact op met MIXMATE."
                        )
            except Exception:
                pass
    return {
        "updates_available": has_updates,
        "changelog": changelog,
        "compatible": compatible,
        "compat_message": compat_msg,
    }

@app.get("/api/system/update-status")
async def system_update_status():
    """Geeft de gecachte update-status terug — geen git fetch, altijd snel."""
    return _update_cache

@app.websocket("/ws/system/update")
async def websocket_update(websocket: WebSocket):
    await websocket.accept()
    try:
        async for event in run_update():
            try:
                await websocket.send_json(event)
            except Exception:
                break
            if event["type"] in ("done", "error"):
                # Geef de browser even tijd om het bericht te verwerken
                await asyncio.sleep(0.5)
                break
    except WebSocketDisconnect:
        pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass


# ── Static frontend ───────────────────────────────────────────────────────────

FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
FRONTEND_ASSETS = os.path.join(FRONTEND_DIST, "assets")
FRONTEND_INDEX = os.path.join(FRONTEND_DIST, "index.html")

# Uploads map (recept foto's) — wordt aangemaakt als hij nog niet bestaat
UPLOADS_DIR = Path(__file__).parent.parent / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

if os.path.isdir(FRONTEND_ASSETS):
    app.mount("/assets", StaticFiles(directory=FRONTEND_ASSETS), name="assets")

_BUILDING_HTML = """<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width">
<title>Mixmate</title>
<style>body{background:#000;color:#fff;font-family:system-ui;display:flex;align-items:center;
justify-content:center;height:100vh;flex-direction:column;gap:16px;margin:0}
button{background:#fff;color:#000;border:none;padding:12px 24px;border-radius:12px;font-size:16px;cursor:pointer}
</style></head><body>
<img src="/logo.png" style="width:200px;opacity:.9" onerror="this.style.display='none'">
<p style="color:rgba(255,255,255,.6);font-size:14px">Interface wordt gebouwd...</p>
<button onclick="setTimeout(()=>location.reload(),1000)">Opnieuw proberen</button>
</body></html>"""

@app.post("/api/seed-demo")
def seed_demo(session: Session = Depends(get_session)):
    from sqlmodel import select
    from .models import Recipe
    if session.exec(select(Recipe)).first():
        return {"status": "skipped", "message": "Database bevat al data"}
    seed_demo_data(session)
    return {"status": "ok", "message": "Demo data aangemaakt"}


_DEMO_NUM_SLIDES = 7   # moet overeenkomen met FEATURES.length in de frontend
_DEMO_SLIDE_MS   = 5000

@app.get("/api/demo/status")
def demo_status():
    """Geeft terug of de demo slideshow actief is (voor synchronisatie tussen kiosk en portaal)."""
    import math
    slide_index = int(math.floor(time.time() / (_DEMO_SLIDE_MS / 1000))) % _DEMO_NUM_SLIDES if _demo_slideshow_active else 0
    return {
        "slideshow_active": _demo_slideshow_active,
        "data_loaded": _demo_data_loaded,
        "slide_index": slide_index,
    }


@app.post("/api/demo/exit-slideshow")
def exit_slideshow():
    """Sluit de demo slideshow — stopt ook de demo modus zodat de machine normaal opstart."""
    global _demo_slideshow_active, _demo_mode_active
    _demo_slideshow_active = False
    _demo_mode_active = False
    return {"ok": True}


@app.post("/api/demo/activate")
def activate_demo(session: Session = Depends(get_session)):
    """Wist alles en laadt volledige demo data — voor winkel/beurs opstellingen."""
    global _demo_mode_active, _demo_slideshow_active, _demo_data_loaded
    _demo_mode_active = True
    _demo_slideshow_active = True
    _demo_data_loaded = True
    from sqlmodel import select, delete
    from .models import (
        Recipe, RecipeIngredient, Ingredient, Category, Glass,
        Pour, Favorite, Pump,
    )
    # Wis in juiste volgorde (foreign keys)
    session.exec(delete(Pour))
    session.exec(delete(MachineSession))
    session.exec(delete(Favorite))
    session.exec(delete(RecipeIngredient))
    session.exec(delete(Recipe))
    session.exec(delete(Pump))
    session.exec(delete(Ingredient))
    session.exec(delete(Category))
    session.exec(delete(Glass))
    session.commit()
    seed_demo_data(session)
    return {"status": "ok", "message": "Demo modus geactiveerd"}


@app.post("/api/demo/deactivate")
def deactivate_demo(session: Session = Depends(get_session)):
    """Wist alle demo data zodat de machine klaar is voor echte setup."""
    global _demo_mode_active, _demo_slideshow_active, _demo_data_loaded
    _demo_mode_active = False
    _demo_slideshow_active = False
    _demo_data_loaded = False
    from sqlmodel import delete
    from .models import (
        Recipe, RecipeIngredient, Ingredient, Category, Glass,
        Pour, Favorite, Pump,
    )
    session.exec(delete(Pour))
    session.exec(delete(MachineSession))
    session.exec(delete(Favorite))
    session.exec(delete(RecipeIngredient))
    session.exec(delete(Recipe))
    session.exec(delete(Pump))
    session.exec(delete(Ingredient))
    session.exec(delete(Category))
    session.exec(delete(Glass))
    session.commit()
    return {"status": "ok", "message": "Demo data gewist"}


@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    from fastapi.responses import HTMLResponse
    # Serveer losse bestanden uit dist/ (logo.png, favicon, etc.)
    if full_path:
        candidate = os.path.join(FRONTEND_DIST, full_path)
        if os.path.isfile(candidate):
            return FileResponse(candidate)
        # Fallback: zoek in public/ map (voor dev zonder build)
        public = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", full_path)
        if os.path.isfile(public):
            return FileResponse(public)
    # SPA index.html
    if os.path.isfile(FRONTEND_INDEX):
        return FileResponse(FRONTEND_INDEX)
    return HTMLResponse(_BUILDING_HTML)
