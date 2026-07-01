from datetime import datetime, timedelta
import random
import urllib.request
import json as _json
from sqlmodel import Session
from .models import Ingredient, Category, Glass, Recipe, RecipeIngredient, Pour, Session as MachineSession, Pump

_COCKTAILDB = "https://www.thecocktaildb.com/api/json/v1/1/search.php?s="

_NAME_MAP = {
    # Naam in seed          → zoekterm TheCocktailDB (None = geen afbeelding)
    "Wodka Cola":           "Vodka Cola",
    "Rum & Cola":           "Rum and Cola",
    "Whiskey Cola":         "Whiskey and Cola",
    "Woo Woo":              "Woo Woo",
    "Passion Star":         "Passion Star Martini",
    "Mango Tango":          None,
    "Rosé Lemonade":        None,
    "Cucumber Cooler":      None,
    "Coconut Kiss":         None,
    "Caribbean Breeze":     None,
    "Malibu Sunset":        None,
    "Bay Breeze":           "Bay Breeze",
    "Blue Motorcycle":      None,
    "Jungle Juice":         None,
    "Sangria Punch":        "Sangria",
    "Vodka Redbull":        "Vodka Red Bull",
    "Grapefruit Gin":       None,
    "Tropical Punch":       None,
    "Bahama Mama":          "Bahama Mama",
    "Appletini":            "Appletini",
    "Campari Orange":       None,
    "Cognac Sour":          None,
    "Whiskey Ginger":       "Whiskey Highball",
    "Gin Gimlet":           "Gimlet",
    "Dark & Stormy":        "Dark and Stormy",
    "Midori Sour":          "Midori Sour",
    "Kir Royal":            "Kir Royale",
    "French 75":            "French 75",
    "B-52":                 "B-52",
    "Kamikaze":             "Kamikaze",
    "Long Island Iced Tea": "Long Island Tea",
    "Piña Colada":          "Pina Colada",
    "Tequila Sunrise":      "Tequila Sunrise",
    "Mojito":               "Mojito",
    "Margarita":            "Margarita",
    "Negroni":              "Negroni",
    "Old Fashioned":        "Old Fashioned",
    "Whiskey Sour":         "Whiskey Sour",
    "Bloody Mary":          "Bloody Mary",
    "Espresso Martini":     "Espresso Martini",
    "White Russian":        "White Russian",
    "Caipirinha":           "Caipirinha",
    "Strawberry Daiquiri":  "Strawberry Daiquiri",
    "Harvey Wallbanger":    "Harvey Wallbanger",
    "Mimosa":               "Mimosa",
    "Bellini":              "Bellini",
    "Amaretto Sour":        "Amaretto Sour",
    "Aperol Spritz":        "Aperol Spritz",
    "Screwdriver":          "Screwdriver",
    "Moscow Mule":          "Moscow Mule",
    "Cosmopolitan":         "Cosmopolitan",
    "Sex on the Beach":     "Sex on the Beach",
    "Blue Lagoon":          "Blue Lagoon",
    "Daiquiri":             "Daiquiri",
    "Tequila Shot":         "Tequila Slammer",
    "Wodka Shot":           None,
    "Sambuca Shot":         None,
}

def _fetch_image(name: str) -> str:
    try:
        search = _NAME_MAP.get(name, name)
        if search is None:
            return ""
        url = _COCKTAILDB + urllib.request.quote(search)
        with urllib.request.urlopen(url, timeout=5) as r:
            data = _json.loads(r.read())
        drinks = data.get("drinks") or []
        if drinks:
            return drinks[0].get("strDrinkThumb", "")
        return ""
    except Exception:
        return ""


def seed_demo_data(db: Session):
    # ── Ingrediënten ──────────────────────────────────────────────────────────
    ingredients = {}
    for name, carbonated in [
        # Sterke drank
        ("Wodka",                False),
        ("Witte Rum",            False),
        ("Donkere Rum",          False),
        ("Gin",                  False),
        ("Tequila",              False),
        ("Whiskey",              False),
        ("Bourbon",              False),
        ("Cognac",               False),
        ("Champagne",            True),
        ("Prosecco",             True),
        # Likeuren
        ("Amaretto",             False),
        ("Peach Schnapps",       False),
        ("Blue Curaçao",         False),
        ("Triple Sec",           False),
        ("Kahlúa",               False),
        ("Baileys",              False),
        ("Grenadine",            False),
        ("Passoa",               False),
        ("Malibu",               False),
        ("Midori",               False),
        ("Aperol",               False),
        ("Campari",              False),
        ("Sambuca",              False),
        # Sappen
        ("Sinaasappelsap",       False),
        ("Cranberrysap",         False),
        ("Ananassap",            False),
        ("Limoensap",            False),
        ("Citroensap",           False),
        ("Mangosap",             False),
        ("Grapefruitap",         False),
        ("Appelsap",             False),
        ("Tomatensap",           False),
        ("Kokosnootcrème",       False),
        # Frisdrank
        ("Cola",                 True),
        ("Tonic",                True),
        ("Sprite",               True),
        ("Ginger Beer",          True),
        ("Soda",                 True),
        ("Energy Drink",         True),
        # Siropen / overig
        ("Suikerstroop",         False),
        ("Agave Siroop",         False),
        ("Munt Siroop",          False),
        ("Passievrucht Siroop",  False),
        ("Vanille Siroop",       False),
        ("Worcestershire Sauce", False),
        ("Tabasco",              False),
        ("Espresso",             False),
        ("Slagroom",             False),
    ]:
        ing = Ingredient(name=name, is_carbonated=carbonated)
        db.add(ing)
        db.flush()
        ingredients[name] = ing

    # ── 32 pompen — Mate.1 Pro configuratie ───────────────────────────────────
    # GPIO-nummers zijn dummy-waarden voor demo (echte hardware gebruikt shift registers)
    DEMO_PUMP_SLOTS = [
        # slot  ingredient            gpio
        (1,  "Wodka",               4),
        (2,  "Witte Rum",           5),
        (3,  "Donkere Rum",         6),
        (4,  "Gin",                12),
        (5,  "Tequila",            13),
        (6,  "Whiskey",            16),
        (7,  "Bourbon",            17),
        (8,  "Prosecco",           18),
        (9,  "Triple Sec",         19),
        (10, "Amaretto",           20),
        (11, "Peach Schnapps",     21),
        (12, "Blue Curaçao",       22),
        (13, "Kahlúa",             23),
        (14, "Baileys",            24),
        (15, "Grenadine",          25),
        (16, "Passoa",             26),
        (17, "Malibu",             27),
        (18, "Midori",              0),
        (19, "Aperol",              1),
        (20, "Campari",             2),
        (21, "Sinaasappelsap",      3),
        (22, "Cranberrysap",        7),
        (23, "Ananassap",           8),
        (24, "Limoensap",           9),
        (25, "Citroensap",         10),
        (26, "Mangosap",           11),
        (27, "Grapefruitap",       14),
        (28, "Appelsap",           15),
        (29, "Cola",               28),
        (30, "Tonic",              29),
        (31, "Ginger Beer",        30),
        (32, "Sprite",             31),
    ]
    for slot, ing_name, gpio_pin in DEMO_PUMP_SLOTS:
        ing = ingredients.get(ing_name)
        if ing:
            pump = Pump(slot=slot, gpio_pin=gpio_pin, ingredient_id=ing.id, enabled=True, ml_per_second=25.0)
            db.add(pump)
    db.flush()

    # ── Categorieën ───────────────────────────────────────────────────────────
    categories = {}
    for i, name in enumerate([
        "Klassiekers", "Fruity", "Tropisch", "Shots", "Bubbels", "Zomer", "Party", "Sterk",
    ]):
        cat = Category(name=name, sort_order=i)
        db.add(cat)
        db.flush()
        categories[name] = cat

    # ── Glazen ────────────────────────────────────────────────────────────────
    glasses = {}
    for i, (name, volume) in enumerate([
        ("Shotglas",   60),
        ("Standaard", 250),
        ("Groot",     350),
        ("Longdrink", 300),
        ("Champagne", 150),
        ("Highball",  330),
    ]):
        glass = Glass(name=name, volume_ml=volume, sort_order=i)
        db.add(glass)
        db.flush()
        glasses[name] = glass

    # ── Recepten ──────────────────────────────────────────────────────────────
    # Ingrediënten op pompen 1-32: Wodka, Witte Rum, Donkere Rum, Gin, Tequila,
    # Whiskey, Bourbon, Prosecco, Triple Sec, Amaretto, Peach Schnapps, Blue Curaçao,
    # Kahlúa, Baileys, Grenadine, Passoa, Malibu, Midori, Aperol, Campari,
    # Sinaasappelsap, Cranberrysap, Ananassap, Limoensap, Citroensap, Mangosap,
    # Grapefruitap, Appelsap, Cola, Tonic, Ginger Beer, Sprite
    #
    # Recepten waarbij ALLE ingrediënten op een pomp zitten = volledig automatisch
    # Recepten waarbij SOMMIGE ingrediënten op een pomp zitten = handmatig
    # Recepten waarbij GEEN ingrediënten op een pomp zitten = niet mogelijk
    recipes_data = [
        # ── VOLLEDIG AUTOMATISCH ─────────────────────────────────────────────
        # Klassiekers
        {"name": "Gin Tonic",           "cat": "Klassiekers", "glass": "Longdrink",
         "ings": [("Gin", 50), ("Tonic", 200), ("Limoensap", 10)]},
        {"name": "Wodka Cola",          "cat": "Klassiekers", "glass": "Longdrink",
         "ings": [("Wodka", 50), ("Cola", 200)]},
        {"name": "Rum & Cola",          "cat": "Klassiekers", "glass": "Longdrink",
         "ings": [("Witte Rum", 50), ("Cola", 200)]},
        {"name": "Tequila Sunrise",     "cat": "Klassiekers", "glass": "Highball",
         "ings": [("Tequila", 50), ("Sinaasappelsap", 180), ("Grenadine", 20)]},
        {"name": "Screwdriver",         "cat": "Klassiekers", "glass": "Standaard",
         "ings": [("Wodka", 50), ("Sinaasappelsap", 150)]},
        {"name": "Harvey Wallbanger",   "cat": "Klassiekers", "glass": "Highball",
         "ings": [("Wodka", 50), ("Sinaasappelsap", 150), ("Amaretto", 20)]},
        {"name": "Moscow Mule",         "cat": "Klassiekers", "glass": "Highball",
         "ings": [("Wodka", 50), ("Ginger Beer", 180), ("Limoensap", 20)]},
        {"name": "Dark & Stormy",       "cat": "Klassiekers", "glass": "Highball",
         "ings": [("Donkere Rum", 50), ("Ginger Beer", 180), ("Limoensap", 15)]},
        {"name": "Whiskey Cola",        "cat": "Klassiekers", "glass": "Longdrink",
         "ings": [("Whiskey", 50), ("Cola", 200)]},
        {"name": "Whiskey Ginger",      "cat": "Klassiekers", "glass": "Longdrink",
         "ings": [("Whiskey", 50), ("Ginger Beer", 180)]},
        {"name": "Gin Gimlet",          "cat": "Klassiekers", "glass": "Standaard",
         "ings": [("Gin", 60), ("Limoensap", 30)]},
        # Fruity
        {"name": "Sex on the Beach",    "cat": "Fruity", "glass": "Groot",
         "ings": [("Wodka", 40), ("Peach Schnapps", 20), ("Sinaasappelsap", 80), ("Cranberrysap", 60)]},
        {"name": "Cosmopolitan",        "cat": "Fruity", "glass": "Standaard",
         "ings": [("Wodka", 40), ("Triple Sec", 20), ("Cranberrysap", 60), ("Citroensap", 15)]},
        {"name": "Bay Breeze",          "cat": "Fruity", "glass": "Groot",
         "ings": [("Wodka", 50), ("Cranberrysap", 100), ("Ananassap", 100)]},
        {"name": "Blue Lagoon",         "cat": "Fruity", "glass": "Highball",
         "ings": [("Wodka", 50), ("Blue Curaçao", 30), ("Citroensap", 20), ("Sprite", 130)]},
        {"name": "Midori Sour",         "cat": "Fruity", "glass": "Standaard",
         "ings": [("Midori", 45), ("Citroensap", 30)]},
        {"name": "Passion Star",        "cat": "Fruity", "glass": "Standaard",
         "ings": [("Wodka", 40), ("Passoa", 30), ("Citroensap", 20)]},
        {"name": "Woo Woo",             "cat": "Fruity", "glass": "Standaard",
         "ings": [("Wodka", 40), ("Peach Schnapps", 20), ("Cranberrysap", 100)]},
        {"name": "Mango Tango",         "cat": "Fruity", "glass": "Groot",
         "ings": [("Wodka", 40), ("Mangosap", 120), ("Grenadine", 20), ("Sprite", 80)]},
        {"name": "Appletini",           "cat": "Fruity", "glass": "Standaard",
         "ings": [("Wodka", 40), ("Triple Sec", 20), ("Appelsap", 60), ("Citroensap", 10)]},
        {"name": "Grapefruit Gin",      "cat": "Fruity", "glass": "Longdrink",
         "ings": [("Gin", 50), ("Grapefruitap", 150)]},
        {"name": "Strawberry Daiquiri", "cat": "Fruity", "glass": "Standaard",
         "ings": [("Witte Rum", 50), ("Limoensap", 25), ("Grenadine", 20)]},
        # Tropisch
        {"name": "Malibu Sunset",       "cat": "Tropisch", "glass": "Groot",
         "ings": [("Malibu", 50), ("Ananassap", 100), ("Grenadine", 20), ("Sinaasappelsap", 60)]},
        {"name": "Tropical Punch",      "cat": "Tropisch", "glass": "Groot",
         "ings": [("Witte Rum", 40), ("Ananassap", 100), ("Mangosap", 80), ("Grenadine", 20)]},
        {"name": "Caribbean Breeze",    "cat": "Tropisch", "glass": "Highball",
         "ings": [("Donkere Rum", 50), ("Ananassap", 80), ("Cranberrysap", 60), ("Grenadine", 15)]},
        {"name": "Bahama Mama",         "cat": "Tropisch", "glass": "Groot",
         "ings": [("Donkere Rum", 30), ("Malibu", 20), ("Ananassap", 80), ("Sinaasappelsap", 60), ("Grenadine", 10)]},
        # Zomer
        {"name": "Aperol Spritz",       "cat": "Zomer", "glass": "Groot",
         "ings": [("Aperol", 60), ("Prosecco", 90), ("Sprite", 30)]},
        {"name": "Campari Orange",      "cat": "Zomer", "glass": "Longdrink",
         "ings": [("Campari", 50), ("Sinaasappelsap", 150)]},
        {"name": "Rosé Lemonade",       "cat": "Zomer", "glass": "Highball",
         "ings": [("Prosecco", 80), ("Cranberrysap", 60), ("Citroensap", 20), ("Sprite", 80)]},
        {"name": "Cucumber Cooler",     "cat": "Zomer", "glass": "Highball",
         "ings": [("Gin", 50), ("Citroensap", 20), ("Sprite", 150)]},
        # Bubbels
        {"name": "Kir Royal",           "cat": "Bubbels", "glass": "Champagne",
         "ings": [("Prosecco", 120), ("Cranberrysap", 20)]},
        {"name": "Bellini",             "cat": "Bubbels", "glass": "Champagne",
         "ings": [("Prosecco", 100), ("Peach Schnapps", 30)]},
        {"name": "Mimosa",              "cat": "Bubbels", "glass": "Champagne",
         "ings": [("Prosecco", 90), ("Sinaasappelsap", 60)]},
        {"name": "French 75",           "cat": "Bubbels", "glass": "Champagne",
         "ings": [("Gin", 30), ("Citroensap", 20), ("Prosecco", 80)]},
        # Shots
        {"name": "B-52",                "cat": "Shots", "glass": "Shotglas",
         "ings": [("Kahlúa", 20), ("Baileys", 20)]},
        {"name": "Kamikaze",            "cat": "Shots", "glass": "Shotglas",
         "ings": [("Wodka", 20), ("Triple Sec", 10), ("Limoensap", 10)]},
        {"name": "Tequila Shot",        "cat": "Shots", "glass": "Shotglas",
         "ings": [("Tequila", 40)]},
        {"name": "Wodka Shot",          "cat": "Shots", "glass": "Shotglas",
         "ings": [("Wodka", 40)]},
        # Party
        {"name": "Long Island Iced Tea","cat": "Party", "glass": "Highball",
         "ings": [("Wodka", 15), ("Witte Rum", 15), ("Gin", 15), ("Tequila", 15), ("Triple Sec", 15), ("Cola", 100)]},
        {"name": "Blue Motorcycle",     "cat": "Party", "glass": "Highball",
         "ings": [("Wodka", 20), ("Witte Rum", 20), ("Gin", 20), ("Blue Curaçao", 20), ("Sprite", 100)]},
        {"name": "Jungle Juice",        "cat": "Party", "glass": "Groot",
         "ings": [("Wodka", 50), ("Ananassap", 80), ("Cranberrysap", 60), ("Grenadine", 20)]},
        # Sterk
        {"name": "Negroni",             "cat": "Sterk", "glass": "Standaard",
         "ings": [("Gin", 30), ("Campari", 30), ("Aperol", 20)]},

        # ── HANDMATIG (sommige ingrediënten niet op pomp) ────────────────────
        {"name": "Mojito",              "cat": "Klassiekers", "glass": "Highball",
         "ings": [("Witte Rum", 50), ("Limoensap", 25), ("Suikerstroop", 15), ("Soda", 100), ("Munt Siroop", 10)]},
        {"name": "Daiquiri",            "cat": "Fruity", "glass": "Standaard",
         "ings": [("Witte Rum", 50), ("Limoensap", 25), ("Suikerstroop", 15)]},
        {"name": "Amaretto Sour",       "cat": "Zomer", "glass": "Standaard",
         "ings": [("Amaretto", 50), ("Citroensap", 30), ("Suikerstroop", 10)]},
        {"name": "Whiskey Sour",        "cat": "Sterk", "glass": "Standaard",
         "ings": [("Whiskey", 50), ("Citroensap", 25), ("Suikerstroop", 15)]},
        {"name": "Old Fashioned",       "cat": "Sterk", "glass": "Standaard",
         "ings": [("Bourbon", 60), ("Suikerstroop", 10), ("Sinaasappelsap", 5)]},
        {"name": "Piña Colada",         "cat": "Tropisch", "glass": "Groot",
         "ings": [("Witte Rum", 50), ("Kokosnootcrème", 30), ("Ananassap", 120)]},
        {"name": "Coconut Kiss",        "cat": "Tropisch", "glass": "Standaard",
         "ings": [("Malibu", 50), ("Kokosnootcrème", 20), ("Ananassap", 100)]},
        {"name": "Sangria Punch",       "cat": "Party", "glass": "Groot",
         "ings": [("Cognac", 30), ("Triple Sec", 20), ("Sinaasappelsap", 80), ("Cranberrysap", 80), ("Sprite", 60)]},
        {"name": "Margarita",           "cat": "Klassiekers", "glass": "Standaard",
         "ings": [("Tequila", 50), ("Triple Sec", 25), ("Limoensap", 25), ("Agave Siroop", 10)]},

        # ── NIET MOGELIJK (ingrediënten niet beschikbaar op machine) ─────────
        {"name": "Bloody Mary",         "cat": "Klassiekers", "glass": "Highball",
         "ings": [("Wodka", 50), ("Tomatensap", 150), ("Citroensap", 15), ("Worcestershire Sauce", 5), ("Tabasco", 2)]},
        {"name": "Espresso Martini",    "cat": "Sterk", "glass": "Standaard",
         "ings": [("Wodka", 40), ("Kahlúa", 20), ("Espresso", 60)]},
        {"name": "White Russian",       "cat": "Sterk", "glass": "Standaard",
         "ings": [("Wodka", 50), ("Kahlúa", 20), ("Slagroom", 30)]},
        {"name": "Caipirinha",          "cat": "Klassiekers", "glass": "Standaard",
         "ings": [("Cognac", 60), ("Limoensap", 30), ("Suikerstroop", 20)]},
    ]

    recipe_objs = []
    for rd in recipes_data:
        image_url = _fetch_image(rd["name"])
        recipe = Recipe(
            name=rd["name"],
            category_id=categories[rd["cat"]].id,
            glass_id=glasses[rd["glass"]].id,
            enabled=True,
            image_url=image_url,
        )
        db.add(recipe)
        db.flush()
        for order, (ing_name, amount_ml) in enumerate(rd["ings"]):
            db.add(RecipeIngredient(
                recipe_id=recipe.id,
                ingredient_id=ingredients[ing_name].id,
                amount_ml=amount_ml,
                order=order,
            ))
        recipe_objs.append(recipe)

    # ── Demo sessies + pours (afgelopen 30 dagen) ─────────────────────────────
    rng = random.Random(42)
    now = datetime.utcnow()

    weights = [rng.randint(2, 20) for _ in recipe_objs]
    for i in [0, 1, 4, 10, 20]:
        if i < len(weights):
            weights[i] = 30

    for day_offset in range(30):
        day_start = now - timedelta(
            days=day_offset,
            hours=now.hour, minutes=now.minute, seconds=now.second
        )
        n_sessions = rng.randint(1, 4)
        for _ in range(n_sessions):
            session_start = day_start + timedelta(hours=rng.randint(16, 23))
            duration_h    = rng.randint(2, 6)
            session_end   = session_start + timedelta(hours=duration_h)
            if session_end > now:
                session_end = None

            sess = MachineSession(started_at=session_start, ended_at=session_end)
            db.add(sess)
            db.flush()

            n_pours = rng.randint(10, 60)
            for _ in range(n_pours):
                recipe = rng.choices(recipe_objs, weights=weights, k=1)[0]
                max_min = int(duration_h * 60) - 5
                pour_time = session_start + timedelta(minutes=rng.randint(5, max(6, max_min)))
                db.add(Pour(
                    recipe_id=recipe.id,
                    recipe_name=recipe.name,
                    scale=1.0,
                    session_id=sess.id,
                    poured_at=pour_time,
                ))

    db.commit()
