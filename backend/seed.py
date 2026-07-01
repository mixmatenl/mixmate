from datetime import datetime, timedelta
import random
import urllib.request
import json as _json
from sqlmodel import Session
from .models import Ingredient, Category, Glass, Recipe, RecipeIngredient, Pour, Session as MachineSession

_COCKTAILDB = "https://www.thecocktaildb.com/api/json/v1/1/search.php?s="

# Handmatige mapping voor recepten waarvan de naam afwijkt van TheCocktailDB
_NAME_MAP = {
    "Wodka Cola":        "Vodka Cola",
    "Rum & Cola":        "Rum and Cola",
    "Whiskey Cola":      "Whiskey and Cola",
    "Woo Woo":           "Woo Woo",
    "Passion Star":      "Passion Star Martini",
    "Mango Tango":       None,
    "Rosé Lemonade":     None,
    "Cucumber Cooler":   None,
    "Coconut Kiss":      None,
    "Caribbean Breeze":  None,
    "Malibu Sunset":     None,
    "Bay Breeze":        "Bay Breeze",
    "Blue Motorcycle":   None,
    "Jungle Juice":      None,
    "Sangria Punch":     "Sangria",
    "Vodka Redbull":     "Vodka Red Bull",
    "Grapefruit Gin":    None,
    "Tropical Punch":    None,
    "Bahama Mama":       "Bahama Mama",
    "Appletini":         "Appletini",
    "Campari Orange":    None,
    "Cognac Sour":       None,
    "Whiskey Ginger":    "Whiskey Highball",
    "Gin Gimlet":        "Gimlet",
    "Dark & Stormy":     "Dark and Stormy",
    "Rosé Lemonade":     None,
}

def _fetch_image(name: str) -> str:
    """Zoek cocktailafbeelding op TheCocktailDB. Geeft lege string bij mislukking."""
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
    # ── Ingrediënten ──────────────────────────────────────────────────────
    ingredients = {}
    for name, carbonated in [
        # Sterke drank
        ("Wodka",               False),
        ("Rum",                 False),
        ("Witte Rum",           False),
        ("Donkere Rum",         False),
        ("Gin",                 False),
        ("Tequila",             False),
        ("Whiskey",             False),
        ("Bourbon",             False),
        ("Cognac",              False),
        ("Champagne",           True),
        ("Prosecco",            True),
        # Likeuren
        ("Amaretto",            False),
        ("Peach Schnapps",      False),
        ("Blue Curaçao",        False),
        ("Triple Sec",          False),
        ("Limoenlikeur",        False),
        ("Kahlúa",              False),
        ("Baileys",             False),
        ("Grenadine",           False),
        ("Passoa",              False),
        ("Malibu",              False),
        ("Midori",              False),
        ("Sambuca",             False),
        ("Aperol",              False),
        ("Campari",             False),
        # Sappen
        ("Sinaasappelsap",      False),
        ("Cranberrysap",        False),
        ("Ananassap",           False),
        ("Limoen­sap",          False),
        ("Citroensap",          False),
        ("Grapefruits­ap",      False),
        ("Mango­sap",           False),
        ("Appelsap",            False),
        ("Kokosnootcrème",      False),
        # Frisdrank
        ("Cola",                True),
        ("Tonic",               True),
        ("Sprite",              True),
        ("Ginger Beer",         True),
        ("Soda",                True),
        ("Energy Drink",        True),
        # Overig
        ("Suikerstroop",        False),
        ("Agave Siroop",        False),
        ("Munt Siroop",         False),
        ("Passievrucht Siroop", False),
        ("Vanille Siroop",      False),
    ]:
        ing = Ingredient(name=name, is_carbonated=carbonated)
        db.add(ing)
        db.flush()
        ingredients[name] = ing

    # ── Categorieën ───────────────────────────────────────────────────────
    categories = {}
    for i, name in enumerate([
        "Klassiekers", "Fruity", "Tropisch", "Shots", "Bubbels", "Zomer", "Party", "Sterk",
    ]):
        cat = Category(name=name, sort_order=i)
        db.add(cat)
        db.flush()
        categories[name] = cat

    # ── Glazen ────────────────────────────────────────────────────────────
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

    # ── Recepten ──────────────────────────────────────────────────────────
    recipes_data = [
        # KLASSIEKERS
        {"name": "Gin Tonic",           "cat": "Klassiekers", "glass": "Longdrink",
         "ings": [("Gin", 50), ("Tonic", 200), ("Limoen­sap", 10)]},
        {"name": "Wodka Cola",          "cat": "Klassiekers", "glass": "Longdrink",
         "ings": [("Wodka", 50), ("Cola", 200)]},
        {"name": "Rum & Cola",          "cat": "Klassiekers", "glass": "Longdrink",
         "ings": [("Rum", 50), ("Cola", 200)]},
        {"name": "Whiskey Cola",        "cat": "Klassiekers", "glass": "Longdrink",
         "ings": [("Whiskey", 50), ("Cola", 200)]},
        {"name": "Tequila Sunrise",     "cat": "Klassiekers", "glass": "Highball",
         "ings": [("Tequila", 50), ("Sinaasappelsap", 180), ("Grenadine", 20)]},
        {"name": "Screwdriver",         "cat": "Klassiekers", "glass": "Standaard",
         "ings": [("Wodka", 50), ("Sinaasappelsap", 150)]},
        {"name": "Harvey Wallbanger",   "cat": "Klassiekers", "glass": "Highball",
         "ings": [("Wodka", 50), ("Sinaasappelsap", 150), ("Amaretto", 20)]},
        {"name": "Bourbon Sour",        "cat": "Klassiekers", "glass": "Standaard",
         "ings": [("Bourbon", 60), ("Citroensap", 30), ("Suikerstroop", 15)]},
        {"name": "Moscow Mule",         "cat": "Klassiekers", "glass": "Highball",
         "ings": [("Wodka", 50), ("Ginger Beer", 180), ("Limoen­sap", 20)]},
        {"name": "Dark & Stormy",       "cat": "Klassiekers", "glass": "Highball",
         "ings": [("Donkere Rum", 50), ("Ginger Beer", 180), ("Limoen­sap", 15)]},
        # FRUITY
        {"name": "Sex on the Beach",    "cat": "Fruity", "glass": "Groot",
         "ings": [("Wodka", 40), ("Peach Schnapps", 20), ("Sinaasappelsap", 80), ("Cranberrysap", 60)]},
        {"name": "Daiquiri",            "cat": "Fruity", "glass": "Standaard",
         "ings": [("Witte Rum", 50), ("Limoen­sap", 25), ("Suikerstroop", 15)]},
        {"name": "Cosmopolitan",        "cat": "Fruity", "glass": "Standaard",
         "ings": [("Wodka", 40), ("Triple Sec", 20), ("Cranberrysap", 60), ("Limoen­sap", 15)]},
        {"name": "Bay Breeze",          "cat": "Fruity", "glass": "Groot",
         "ings": [("Wodka", 50), ("Cranberrysap", 100), ("Ananassap", 100)]},
        {"name": "Blue Lagoon",         "cat": "Fruity", "glass": "Highball",
         "ings": [("Wodka", 50), ("Blue Curaçao", 30), ("Citroensap", 20), ("Sprite", 130)]},
        {"name": "Midori Sour",         "cat": "Fruity", "glass": "Standaard",
         "ings": [("Midori", 45), ("Citroensap", 30), ("Suikerstroop", 15)]},
        {"name": "Passion Star",        "cat": "Fruity", "glass": "Standaard",
         "ings": [("Wodka", 40), ("Passoa", 20), ("Passievrucht Siroop", 20), ("Citroensap", 15)]},
        {"name": "Woo Woo",             "cat": "Fruity", "glass": "Standaard",
         "ings": [("Wodka", 40), ("Peach Schnapps", 20), ("Cranberrysap", 100)]},
        {"name": "Mango Tango",         "cat": "Fruity", "glass": "Groot",
         "ings": [("Wodka", 40), ("Mango­sap", 120), ("Grenadine", 20), ("Sprite", 80)]},
        {"name": "Appletini",           "cat": "Fruity", "glass": "Standaard",
         "ings": [("Wodka", 40), ("Triple Sec", 20), ("Appelsap", 60), ("Citroensap", 10)]},
        # TROPISCH
        {"name": "Piña Colada",         "cat": "Tropisch", "glass": "Groot",
         "ings": [("Witte Rum", 50), ("Kokosnootcrème", 30), ("Ananassap", 120)]},
        {"name": "Malibu Sunset",       "cat": "Tropisch", "glass": "Groot",
         "ings": [("Malibu", 50), ("Ananassap", 100), ("Grenadine", 20), ("Sinaasappelsap", 60)]},
        {"name": "Tropical Punch",      "cat": "Tropisch", "glass": "Groot",
         "ings": [("Witte Rum", 40), ("Ananassap", 100), ("Mango­sap", 80), ("Grenadine", 20)]},
        {"name": "Coconut Kiss",        "cat": "Tropisch", "glass": "Standaard",
         "ings": [("Malibu", 50), ("Kokosnootcrème", 20), ("Ananassap", 100)]},
        {"name": "Caribbean Breeze",    "cat": "Tropisch", "glass": "Highball",
         "ings": [("Donkere Rum", 50), ("Ananassap", 80), ("Cranberrysap", 60), ("Grenadine", 15)]},
        {"name": "Bahama Mama",         "cat": "Tropisch", "glass": "Groot",
         "ings": [("Donkere Rum", 30), ("Malibu", 20), ("Ananassap", 80), ("Sinaasappelsap", 60), ("Grenadine", 10)]},
        # ZOMER
        {"name": "Aperol Spritz",       "cat": "Zomer", "glass": "Groot",
         "ings": [("Aperol", 60), ("Prosecco", 90), ("Soda", 30)]},
        {"name": "Amaretto Sour",       "cat": "Zomer", "glass": "Standaard",
         "ings": [("Amaretto", 50), ("Citroensap", 30), ("Suikerstroop", 10)]},
        {"name": "Campari Orange",      "cat": "Zomer", "glass": "Longdrink",
         "ings": [("Campari", 50), ("Sinaasappelsap", 150)]},
        {"name": "Rosé Lemonade",       "cat": "Zomer", "glass": "Highball",
         "ings": [("Prosecco", 80), ("Cranberrysap", 60), ("Citroensap", 20), ("Suikerstroop", 10), ("Sprite", 80)]},
        {"name": "Grapefruit Gin",      "cat": "Zomer", "glass": "Longdrink",
         "ings": [("Gin", 50), ("Grapefruits­ap", 150), ("Suikerstroop", 10)]},
        {"name": "Cucumber Cooler",     "cat": "Zomer", "glass": "Highball",
         "ings": [("Gin", 50), ("Citroensap", 20), ("Munt Siroop", 15), ("Soda", 150)]},
        # BUBBELS
        {"name": "Kir Royal",           "cat": "Bubbels", "glass": "Champagne",
         "ings": [("Champagne", 120), ("Cranberrysap", 20)]},
        {"name": "Bellini",             "cat": "Bubbels", "glass": "Champagne",
         "ings": [("Prosecco", 100), ("Passievrucht Siroop", 30)]},
        {"name": "Mimosa",              "cat": "Bubbels", "glass": "Champagne",
         "ings": [("Champagne", 90), ("Sinaasappelsap", 60)]},
        {"name": "French 75",           "cat": "Bubbels", "glass": "Champagne",
         "ings": [("Gin", 30), ("Citroensap", 20), ("Suikerstroop", 10), ("Champagne", 80)]},
        # SHOTS
        {"name": "Tequila Shot",        "cat": "Shots", "glass": "Shotglas",
         "ings": [("Tequila", 40)]},
        {"name": "Wodka Shot",          "cat": "Shots", "glass": "Shotglas",
         "ings": [("Wodka", 40)]},
        {"name": "Sambuca Shot",        "cat": "Shots", "glass": "Shotglas",
         "ings": [("Sambuca", 40)]},
        {"name": "B-52",                "cat": "Shots", "glass": "Shotglas",
         "ings": [("Kahlúa", 20), ("Baileys", 20)]},
        {"name": "Kamikaze",            "cat": "Shots", "glass": "Shotglas",
         "ings": [("Wodka", 20), ("Triple Sec", 10), ("Limoen­sap", 10)]},
        # PARTY
        {"name": "Long Island Iced Tea","cat": "Party", "glass": "Highball",
         "ings": [("Wodka", 15), ("Rum", 15), ("Gin", 15), ("Tequila", 15), ("Triple Sec", 15), ("Cola", 100)]},
        {"name": "Blue Motorcycle",     "cat": "Party", "glass": "Highball",
         "ings": [("Wodka", 20), ("Rum", 20), ("Gin", 20), ("Blue Curaçao", 20), ("Sprite", 100)]},
        {"name": "Jungle Juice",        "cat": "Party", "glass": "Groot",
         "ings": [("Wodka", 50), ("Ananassap", 80), ("Cranberrysap", 60), ("Grenadine", 20)]},
        {"name": "Sangria Punch",       "cat": "Party", "glass": "Groot",
         "ings": [("Cognac", 30), ("Triple Sec", 20), ("Sinaasappelsap", 80), ("Cranberrysap", 80), ("Sprite", 60)]},
        {"name": "Vodka Redbull",       "cat": "Party", "glass": "Longdrink",
         "ings": [("Wodka", 50), ("Energy Drink", 200)]},
        # STERK
        {"name": "Old Fashioned",       "cat": "Sterk", "glass": "Standaard",
         "ings": [("Bourbon", 60), ("Suikerstroop", 10), ("Sinaasappelsap", 5)]},
        {"name": "Cognac Sour",         "cat": "Sterk", "glass": "Standaard",
         "ings": [("Cognac", 50), ("Citroensap", 25), ("Suikerstroop", 10)]},
        {"name": "Whiskey Ginger",      "cat": "Sterk", "glass": "Longdrink",
         "ings": [("Whiskey", 50), ("Ginger Beer", 180)]},
        {"name": "Gin Gimlet",          "cat": "Sterk", "glass": "Standaard",
         "ings": [("Gin", 60), ("Limoen­sap", 20), ("Suikerstroop", 10)]},
        {"name": "Negroni",             "cat": "Sterk", "glass": "Standaard",
         "ings": [("Gin", 30), ("Campari", 30), ("Cognac", 30)]},
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

    # ── Demo sessies + pours (afgelopen 30 dagen) ─────────────────────────
    rng = random.Random(42)
    now = datetime.utcnow()

    # Populariteit per recept (hogere index = populairder)
    weights = [rng.randint(2, 20) for _ in recipe_objs]
    # Top 5 erg populair maken
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
