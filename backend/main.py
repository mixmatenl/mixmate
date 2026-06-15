import asyncio
import os
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
    Ingredient, IngredientCreate, IngredientRead,
    Pump, PumpCreate, PumpRead, PumpUpdate, PumpSimple,
    Recipe, RecipeCreate, RecipeRead, RecipeUpdate,
    RecipeIngredient, RecipeIngredientRead,
    Favorite, Pour, PourCreate, PourRead,
)
from datetime import datetime, timedelta
from sqlalchemy import func
from .hardware import loadcell, gpio
from .pouring import pour_recipe, cancel_pour
from .updater import get_version_info, check_updates_available, run_update
from .seed import seed_demo_data


def _load_env():
    """Laad .env bestand zodat PIN-wijzigingen na herstart behouden blijven."""
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, val = line.partition("=")
                os.environ[key.strip()] = val.strip()


@asynccontextmanager
async def lifespan(app: FastAPI):
    _load_env()
    create_db()
    from .cloud_client import cloud_loop
    cloud_task = asyncio.create_task(cloud_loop())
    yield
    cloud_task.cancel()
    gpio.cleanup()


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
    )


# ── PIN / auth ─────────────────────────────────────────────────────────────────

@app.post("/api/auth/verify-pin")
def verify_pin(body: dict):
    pin = os.environ.get("MIXMATE_PIN", "2580")
    if body.get("pin") == pin:
        return {"ok": True}
    raise HTTPException(403, "Verkeerde PIN")

@app.post("/api/auth/verify-admin-pin")
def verify_admin_pin(body: dict):
    pin = os.environ.get("MIXMATE_ADMIN_PIN", "0000")
    if body.get("pin") == pin:
        return {"ok": True}
    raise HTTPException(403, "Verkeerde PIN")

@app.post("/api/auth/set-pin")
def set_pin(body: dict):
    """Change bartender PIN at runtime (stores in env for this process)."""
    admin_pin = os.environ.get("MIXMATE_ADMIN_PIN", "0000")
    if body.get("admin_pin") != admin_pin:
        raise HTTPException(403, "Niet geautoriseerd")
    new_pin = str(body.get("new_pin", "")).strip()
    if len(new_pin) < 4 or not new_pin.isdigit():
        raise HTTPException(400, "PIN moet minimaal 4 cijfers zijn")
    os.environ["MIXMATE_PIN"] = new_pin
    # Persist to .env file next to the backend
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    lines = []
    replaced = False
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if line.startswith("MIXMATE_PIN="):
                    lines.append(f"MIXMATE_PIN={new_pin}\n")
                    replaced = True
                else:
                    lines.append(line)
    if not replaced:
        lines.append(f"MIXMATE_PIN={new_pin}\n")
    with open(env_path, "w") as f:
        f.writelines(lines)
    return {"ok": True}

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

@app.get("/api/ingredients", response_model=List[IngredientRead])
def list_ingredients(session: Session = Depends(get_session)):
    return session.exec(select(Ingredient)).all()

@app.post("/api/ingredients", response_model=IngredientRead)
def create_ingredient(data: IngredientCreate, session: Session = Depends(get_session)):
    ing = Ingredient(**data.model_dump())
    session.add(ing); session.commit(); session.refresh(ing)
    return ing

@app.delete("/api/ingredients/{ingredient_id}")
def delete_ingredient(ingredient_id: int, session: Session = Depends(get_session)):
    ing = session.get(Ingredient, ingredient_id)
    if not ing: raise HTTPException(404)
    session.delete(ing); session.commit()
    return {"ok": True}


# ── Pumps (full — backoffice only) ────────────────────────────────────────────

@app.get("/api/pumps", response_model=List[PumpRead])
def list_pumps(session: Session = Depends(get_session)):
    pumps = session.exec(select(Pump)).all()
    result = []
    for p in pumps:
        ing = session.get(Ingredient, p.ingredient_id) if p.ingredient_id else None
        ing_read = IngredientRead(id=ing.id, name=ing.name, is_carbonated=ing.is_carbonated) if ing else None
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
        ing_read = IngredientRead(id=ing.id, name=ing.name, is_carbonated=ing.is_carbonated) if ing else None
        result.append(PumpSimple(id=p.id, slot=p.slot, ingredient_id=p.ingredient_id,
            ingredient=ing_read, enabled=p.enabled))
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


# ── Recipes ───────────────────────────────────────────────────────────────────

@app.get("/api/recipes", response_model=List[RecipeRead])
def list_recipes(session: Session = Depends(get_session)):
    recipes = session.exec(select(Recipe)).all()
    return [_build_recipe_read(r, session) for r in recipes]

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
def list_pours(limit: int = 50, session: Session = Depends(get_session)):
    return session.exec(
        select(Pour).order_by(Pour.poured_at.desc()).limit(limit)
    ).all()

@app.post("/api/pours", response_model=PourRead)
def create_pour(data: PourCreate, session: Session = Depends(get_session)):
    pour = Pour(recipe_id=data.recipe_id, recipe_name=data.recipe_name, scale=data.scale)
    session.add(pour); session.commit(); session.refresh(pour)
    return pour


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
    """Sla machine model op in .env en os.environ."""
    os.environ["MACHINE_MODEL"] = model
    env_path = Path(__file__).parent.parent / ".env"
    lines = []
    replaced = False
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("MACHINE_MODEL="):
                lines.append(f"MACHINE_MODEL={model}")
                replaced = True
            else:
                lines.append(line)
    if not replaced:
        lines.append(f"MACHINE_MODEL={model}")
    env_path.write_text("\n".join(lines) + "\n")

# ── Cloud koppeling ───────────────────────────────────────────────────────────

_cloud_pair: dict = {"code": None, "paired": False}

@app.post("/api/cloud/pair-code")
def set_pair_code(body: dict):
    """Intern endpoint — cloud_client.py schrijft de koppelcode hierheen."""
    _cloud_pair["code"]   = body.get("code")
    _cloud_pair["paired"] = body.get("paired", False)
    return {"ok": True}

@app.get("/api/cloud/pair-code")
def get_pair_code():
    """Frontend leest hieruit de koppelcode om op het standby-scherm te tonen."""
    return _cloud_pair


# ── Systeem beheer ────────────────────────────────────────────────────────────

@app.post("/api/system/restart")
async def system_restart():
    """Herstart de Raspberry Pi."""
    async def _reboot():
        await asyncio.sleep(2)
        await asyncio.create_subprocess_exec("sudo", "reboot")
    asyncio.create_task(_reboot())
    return {"ok": True, "message": "Machine herstart over 2 seconden..."}

@app.get("/api/system/wifi/status")
async def wifi_status():
    """Huidige WiFi verbinding."""
    # Probeer nmcli
    try:
        proc = await asyncio.create_subprocess_exec(
            "nmcli", "-t", "-f", "ACTIVE,SSID,SIGNAL", "dev", "wifi",
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL,
        )
        out, _ = await proc.communicate()
        for line in out.decode().splitlines():
            parts = line.split(":")
            if parts and parts[0] == "yes":
                return {"connected": True, "ssid": parts[1] if len(parts) > 1 else "", "signal": int(parts[2]) if len(parts) > 2 and parts[2].isdigit() else 0}
    except Exception:
        pass
    # Fallback: lees /proc/net/wireless
    try:
        text = Path("/proc/net/wireless").read_text()
        for line in text.splitlines()[2:]:
            parts = line.split()
            if parts:
                iface = parts[0].rstrip(":")
                # Lees SSID via wpa_cli
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
                        return {"connected": True, "ssid": ssid, "signal": 0}
    except Exception:
        pass
    return {"connected": False, "ssid": "", "signal": 0}

@app.get("/api/system/wifi/networks")
async def wifi_networks():
    """Beschikbare WiFi netwerken — probeert nmcli, valt terug op iwlist."""
    networks = []

    # Probeer nmcli (NetworkManager)
    try:
        await asyncio.create_subprocess_exec(
            "nmcli", "dev", "wifi", "rescan",
            stderr=asyncio.subprocess.DEVNULL,
        )
        await asyncio.sleep(2)
        proc = await asyncio.create_subprocess_exec(
            "nmcli", "-t", "-f", "SSID,SIGNAL,SECURITY,IN-USE", "dev", "wifi",
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
        )
        out, err = await proc.communicate()
        if proc.returncode == 0 and out:
            seen = set()
            for line in out.decode().splitlines():
                parts = line.split(":")
                if len(parts) < 4:
                    continue
                ssid = parts[0].strip()
                if not ssid or ssid in seen:
                    continue
                seen.add(ssid)
                networks.append({
                    "ssid": ssid,
                    "signal": int(parts[1]) if parts[1].isdigit() else 0,
                    "secured": bool(parts[2]),
                    "active": parts[3].strip() == "*",
                })
            networks.sort(key=lambda x: -x["signal"])
            return {"networks": networks, "method": "nmcli"}
    except Exception:
        pass

    # Fallback: nmcli zonder rescan (soms werkt rescan niet maar list wel)
    try:
        proc = await asyncio.create_subprocess_exec(
            "nmcli", "--terse", "--fields", "SSID,SIGNAL,SECURITY,ACTIVE",
            "device", "wifi", "list",
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL,
        )
        out, _ = await asyncio.wait_for(proc.communicate(), timeout=10)
        if out:
            seen = set()
            for line in out.decode().splitlines():
                parts = line.split(":")
                if len(parts) < 4:
                    continue
                ssid = parts[0].strip()
                if not ssid or ssid == "--" or ssid in seen:
                    continue
                seen.add(ssid)
                networks.append({
                    "ssid": ssid,
                    "signal": int(parts[1]) if parts[1].isdigit() else 50,
                    "secured": bool(parts[2] and parts[2] != "--"),
                    "active": parts[3].strip() == "yes",
                })
            if networks:
                networks.sort(key=lambda x: -x["signal"])
                return {"networks": networks, "method": "nmcli-list"}
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

    # Probeer nmcli
    try:
        cmd = ["nmcli", "dev", "wifi", "connect", ssid]
        if password:
            cmd += ["password", password]
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        out, err = await asyncio.wait_for(proc.communicate(), timeout=25)
        output = (out + err).decode()
        if proc.returncode == 0:
            return {"ok": True, "message": f"Verbonden met {ssid}"}
        # nmcli beschikbaar maar verbinding mislukt
        return {"ok": False, "message": output.strip() or "Verbinding mislukt — controleer het wachtwoord"}
    except FileNotFoundError:
        pass
    except asyncio.TimeoutError:
        return {"ok": False, "message": "Verbinding time-out — controleer het wachtwoord"}
    except Exception as e:
        return {"ok": False, "message": str(e)}

    # Fallback: wpa_passphrase + wpa_cli
    try:
        iface = "wlan0"
        conf_line = f'network={{
    ssid="{ssid}"
    psk="{password}"
    key_mgmt=WPA-PSK
}}'
        wpa_conf = f"/tmp/wpa_{ssid.replace(' ','_')}.conf"
        Path(wpa_conf).write_text(conf_line)

        proc = await asyncio.create_subprocess_exec(
            "sudo", "wpa_cli", "-i", iface, "reconfigure",
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL,
        )
        await asyncio.wait_for(proc.communicate(), timeout=10)
        return {"ok": True, "message": f"Verbinding met {ssid} gestart — even geduld"}
    except Exception as e2:
        return {"ok": False, "message": f"Verbinding mislukt: {e2}"}

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
        start = asyncio.get_event_loop().time()
        while True:
            elapsed = asyncio.get_event_loop().time() - start
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

@app.get("/api/system/version")
async def system_version():
    info = await get_version_info()
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
