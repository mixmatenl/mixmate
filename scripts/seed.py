#!/usr/bin/env python3
"""
Mixmate seed script — voegt testdata toe via de API.
Gebruik: python3 scripts/seed.py [--host http://localhost:8000]
"""
import sys
import json
import urllib.request
import urllib.error

HOST = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"

def post(path, data):
    body = json.dumps(data).encode()
    req = urllib.request.Request(
        f"{HOST}{path}",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as r:
            result = json.loads(r.read())
            print(f"  ✓ {path} → {result.get('name') or result.get('id') or result}")
            return result
    except urllib.error.HTTPError as e:
        print(f"  ✗ {path} → HTTP {e.code}: {e.read().decode()}")
        return None

def get(path):
    with urllib.request.urlopen(f"{HOST}{path}") as r:
        return json.loads(r.read())

print(f"\n🍹 Mixmate seed — {HOST}\n")

# ── 1. Glazen ──────────────────────────────────────────────────────────────
print("📦 Glazen...")
glasses = [
    {"name": "Shot",         "volume_ml": 40,  "sort_order": 1},
    {"name": "Tumbler S",    "volume_ml": 200, "sort_order": 2},
    {"name": "Tumbler L",    "volume_ml": 300, "sort_order": 3},
    {"name": "Cocktailglas", "volume_ml": 180, "sort_order": 4},
    {"name": "Highball",     "volume_ml": 350, "sort_order": 5},
    {"name": "Longdrink",    "volume_ml": 400, "sort_order": 6},
]
glass_ids = {}
for g in glasses:
    r = post("/api/glasses", g)
    if r:
        glass_ids[g["name"]] = r["id"]

# ── 2. Categorieën ─────────────────────────────────────────────────────────
print("\n📂 Categorieën...")
categories = [
    {"name": "Klassiekers",  "sort_order": 1},
    {"name": "Tropisch",     "sort_order": 2},
    {"name": "Fris & Licht", "sort_order": 3},
    {"name": "Shots",        "sort_order": 4},
]
cat_ids = {}
for c in categories:
    r = post("/api/categories", c)
    if r:
        cat_ids[c["name"]] = r["id"]

# ── 3. Ingrediënten ────────────────────────────────────────────────────────
print("\n🧪 Ingrediënten...")
ingredients_data = [
    # Sterke drank
    {"name": "Vodka",             "unit": "ml"},
    {"name": "Witte rum",         "unit": "ml"},
    {"name": "Donkere rum",       "unit": "ml"},
    {"name": "Gin",               "unit": "ml"},
    {"name": "Tequila",           "unit": "ml"},
    {"name": "Triple sec",        "unit": "ml"},
    {"name": "Blauwe curacao",    "unit": "ml"},
    # Mixers
    {"name": "Sinaasappelsap",    "unit": "ml"},
    {"name": "Ananassap",         "unit": "ml"},
    {"name": "Cranberrysap",      "unit": "ml"},
    {"name": "Limoensap",         "unit": "ml"},
    {"name": "Citroenlimonade",   "unit": "ml"},
    {"name": "Cola",              "unit": "ml"},
    {"name": "Sprite",            "unit": "ml"},
    {"name": "Tonic",             "unit": "ml"},
    # Syrups
    {"name": "Grenadine",         "unit": "ml"},
    {"name": "Suikerstroop",      "unit": "ml"},
    {"name": "Kokoscrème",        "unit": "ml"},
]
ing_ids = {}
for i in ingredients_data:
    r = post("/api/ingredients", i)
    if r:
        ing_ids[i["name"]] = r["id"]

# ── 4. Pompen ──────────────────────────────────────────────────────────────
print("\n⚙️  Pompen...")
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
    post("/api/pumps", {
        "slot": slot,
        "gpio_pin": gpio,
        "pump_type": "peristaltic",
        "ml_per_second": 1.5,
        "enabled": True,
        "ingredient_id": ing_ids.get(ingredient),
    })

# ── 5. Recepten ────────────────────────────────────────────────────────────
print("\n🍸 Recepten...")

def recipe(name, category, glass, description, steps):
    """Maak een recept aan met ingrediënten."""
    post("/api/recipes", {
        "name": name,
        "description": description,
        "category_id": cat_ids.get(category),
        "glass_id": glass_ids.get(glass),
        "ingredients": [
            {"ingredient_id": ing_ids[ing], "amount_ml": ml, "order": i + 1}
            for i, (ing, ml) in enumerate(steps)
            if ing in ing_ids
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

print("\n✅ Klaar! Ververs de app om de testdata te zien.\n")
