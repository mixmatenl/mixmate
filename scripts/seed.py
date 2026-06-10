#!/usr/bin/env python3
"""
Mixmate seed script — voegt testdata toe via de API.
Gebruik: python3 scripts/seed.py [http://localhost:8000]
"""
import sys
import json
import urllib.request
import urllib.error

HOST = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
ERRORS = []

def post(path, data):
    body = json.dumps(data).encode()
    req = urllib.request.Request(
        f"{HOST}{path}", data=body,
        headers={"Content-Type": "application/json"}, method="POST",
    )
    try:
        with urllib.request.urlopen(req) as r:
            result = json.loads(r.read())
            name = result.get("name") or result.get("id") or "ok"
            print(f"  ✓ {name}")
            return result
    except urllib.error.HTTPError as e:
        msg = f"HTTP {e.code} op {path}: {e.read().decode()}"
        print(f"  ✗ FOUT: {msg}")
        ERRORS.append(msg)
        return None
    except Exception as e:
        msg = f"Verbindingsfout op {path}: {e}"
        print(f"  ✗ FOUT: {msg}")
        ERRORS.append(msg)
        return None

def get(path):
    try:
        with urllib.request.urlopen(f"{HOST}{path}") as r:
            return json.loads(r.read())
    except Exception as e:
        print(f"  ✗ GET {path} mislukt: {e}")
        return []

# ── Check bestaande data ───────────────────────────────────────────────────
print(f"\n🍹 Mixmate seed — {HOST}\n")
print("📋 Bestaande data controleren...")
existing_recipes = get("/api/recipes")
existing_glasses = get("/api/glasses")
existing_cats = get("/api/categories")
existing_ings = get("/api/ingredients")
print(f"  Gevonden: {len(existing_recipes)} recepten, {len(existing_glasses)} glazen, "
      f"{len(existing_cats)} categorieën, {len(existing_ings)} ingrediënten")

if existing_recipes:
    print(f"  ⚠️  Er zijn al {len(existing_recipes)} recepten — script voegt nieuwe toe bovenop bestaande data.")

# ── 1. Glazen ──────────────────────────────────────────────────────────────
print("\n📦 Glazen aanmaken...")
glasses_to_add = [
    {"name": "Shot",         "volume_ml": 40,  "sort_order": 1},
    {"name": "Tumbler S",    "volume_ml": 200, "sort_order": 2},
    {"name": "Tumbler L",    "volume_ml": 300, "sort_order": 3},
    {"name": "Cocktailglas", "volume_ml": 180, "sort_order": 4},
    {"name": "Highball",     "volume_ml": 350, "sort_order": 5},
    {"name": "Longdrink",    "volume_ml": 400, "sort_order": 6},
]
# Gebruik bestaande als ze al bestaan
glass_ids = {g["name"]: g["id"] for g in existing_glasses}
for g in glasses_to_add:
    if g["name"] not in glass_ids:
        r = post("/api/glasses", g)
        if r:
            glass_ids[r["name"]] = r["id"]
    else:
        print(f"  → {g['name']} bestaat al (id={glass_ids[g['name']]})")

# ── 2. Categorieën ─────────────────────────────────────────────────────────
print("\n📂 Categorieën aanmaken...")
cats_to_add = [
    {"name": "Klassiekers",  "sort_order": 1},
    {"name": "Tropisch",     "sort_order": 2},
    {"name": "Fris & Licht", "sort_order": 3},
    {"name": "Shots",        "sort_order": 4},
]
cat_ids = {c["name"]: c["id"] for c in existing_cats}
for c in cats_to_add:
    if c["name"] not in cat_ids:
        r = post("/api/categories", c)
        if r:
            cat_ids[r["name"]] = r["id"]
    else:
        print(f"  → {c['name']} bestaat al (id={cat_ids[c['name']]})")

# ── 3. Ingrediënten ────────────────────────────────────────────────────────
print("\n🧪 Ingrediënten aanmaken...")
ings_to_add = [
    "Vodka", "Witte rum", "Donkere rum", "Gin", "Tequila",
    "Triple sec", "Blauwe curacao",
    "Sinaasappelsap", "Ananassap", "Cranberrysap", "Limoensap",
    "Citroenlimonade", "Cola", "Sprite", "Tonic",
    "Grenadine", "Suikerstroop", "Kokoscrème",
]
ing_ids = {i["name"]: i["id"] for i in existing_ings}
for name in ings_to_add:
    if name not in ing_ids:
        r = post("/api/ingredients", {"name": name, "unit": "ml"})
        if r:
            ing_ids[r["name"]] = r["id"]
    else:
        print(f"  → {name} bestaat al (id={ing_ids[name]})")

# ── 4. Pompen ──────────────────────────────────────────────────────────────
print("\n⚙️  Pompen aanmaken...")
existing_pumps = get("/api/pumps")
existing_slots = {p["slot"] for p in existing_pumps}
pump_assignments = [
    (1,  4,  "Vodka"),
    (2,  5,  "Witte rum"),
    (3,  6,  "Gin"),
    (4,  12, "Tequila"),
    (5,  13, "Triple sec"),
    (6,  16, "Blauwe curacao"),
    (7,  17, "Sinaasappelsap"),
    (8,  18, "Ananassap"),
    (9,  19, "Cranberrysap"),
    (10, 20, "Limoensap"),
    (11, 21, "Grenadine"),
    (12, 22, "Kokoscrème"),
]
for slot, gpio, ingredient in pump_assignments:
    if slot in existing_slots:
        print(f"  → Slot {slot} bestaat al")
        continue
    if ingredient not in ing_ids:
        print(f"  ✗ Ingrediënt '{ingredient}' niet gevonden, pomp {slot} overgeslagen")
        continue
    post("/api/pumps", {
        "slot": slot, "gpio_pin": gpio,
        "pump_type": "peristaltic", "ml_per_second": 1.5,
        "enabled": True, "ingredient_id": ing_ids[ingredient],
    })

# ── 5. Recepten ────────────────────────────────────────────────────────────
print("\n🍸 Recepten aanmaken...")

def recipe(name, category, glass, description, steps):
    missing_ings = [ing for ing, _ in steps if ing not in ing_ids]
    if missing_ings:
        print(f"  ✗ '{name}' overgeslagen — ontbrekende ingrediënten: {missing_ings}")
        return
    cat_id = cat_ids.get(category)
    glass_id = glass_ids.get(glass)
    if not cat_id:
        print(f"  ✗ '{name}' overgeslagen — categorie '{category}' niet gevonden")
        return
    post("/api/recipes", {
        "name": name,
        "description": description,
        "category_id": cat_id,
        "glass_id": glass_id,
        "image_url": "",
        "ingredients": [
            {"ingredient_id": ing_ids[ing], "amount_ml": ml, "order": i + 1}
            for i, (ing, ml) in enumerate(steps)
        ],
    })

# Klassiekers
recipe("Sex on the Beach", "Klassiekers", "Highball",
    "Fruitige klassieker met vodka en sinaasappel",
    [("Vodka", 40), ("Cranberrysap", 80), ("Sinaasappelsap", 80), ("Grenadine", 20)])

recipe("Screwdriver", "Klassiekers", "Highball",
    "Simpel en verfrissend — vodka met sinaasappelsap",
    [("Vodka", 50), ("Sinaasappelsap", 150)])

recipe("Gin & Tonic", "Klassiekers", "Highball",
    "De Britse klassieker",
    [("Gin", 50), ("Tonic", 150)])

recipe("Tequila Sunrise", "Klassiekers", "Highball",
    "Mooi gelaagd met grenadine onderin",
    [("Tequila", 45), ("Sinaasappelsap", 120), ("Grenadine", 15)])

recipe("Cape Cod", "Klassiekers", "Tumbler L",
    "Vodka cranberry — fris en eenvoudig",
    [("Vodka", 50), ("Cranberrysap", 150)])

# Tropisch
recipe("Piña Colada", "Tropisch", "Highball",
    "Romig, zoet en tropisch",
    [("Witte rum", 50), ("Kokoscrème", 30), ("Ananassap", 120)])

recipe("Blue Lagoon", "Tropisch", "Highball",
    "Knalblauwe tropische cocktail",
    [("Vodka", 40), ("Blauwe curacao", 20), ("Citroenlimonade", 120)])

recipe("Malibu Sunrise", "Tropisch", "Highball",
    "Zoet en tropisch met ananassap",
    [("Witte rum", 40), ("Kokoscrème", 20), ("Ananassap", 100), ("Grenadine", 20)])

recipe("Rum Punch", "Tropisch", "Tumbler L",
    "Feestelijke punch met meerdere sappen",
    [("Witte rum", 40), ("Sinaasappelsap", 60), ("Ananassap", 60), ("Grenadine", 20)])

# Fris & Licht
recipe("Vodka Sprite", "Fris & Licht", "Longdrink",
    "Licht en bruisend",
    [("Vodka", 40), ("Sprite", 200)])

recipe("Cuba Libre", "Fris & Licht", "Longdrink",
    "Rum cola met een vleugje limoen",
    [("Witte rum", 50), ("Cola", 150), ("Limoensap", 15)])

recipe("Cranberry Fizz", "Fris & Licht", "Longdrink",
    "Fris en licht bruisend",
    [("Vodka", 30), ("Cranberrysap", 100), ("Sprite", 100)])

# Shots
recipe("Tequila Shot", "Shots", "Shot",
    "Klassieke tequila shot",
    [("Tequila", 40)])

recipe("Kamikaze", "Shots", "Shot",
    "Scherpe shot met limoen",
    [("Vodka", 20), ("Triple sec", 10), ("Limoensap", 10)])

recipe("Blue Bomber", "Shots", "Shot",
    "Zoete blauwe shot",
    [("Vodka", 20), ("Blauwe curacao", 20)])

# ── Samenvatting ───────────────────────────────────────────────────────────
print("\n" + "─" * 40)
if ERRORS:
    print(f"⚠️  Klaar met {len(ERRORS)} fout(en):")
    for e in ERRORS:
        print(f"   • {e}")
else:
    final = get("/api/recipes")
    print(f"✅ Klaar! {len(final)} recepten in de database.")
    print("   Ververs de app om alles te zien.\n")
