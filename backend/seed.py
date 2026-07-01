from datetime import datetime, timedelta
import random
from sqlmodel import Session
from .models import Ingredient, Category, Glass, Recipe, RecipeIngredient, Pour, Session as MachineSession


def seed_demo_data(db: Session):
    # ── Ingrediënten ──────────────────────────────────────────────────────
    ingredients = {}
    for name, carbonated in [
        ("Wodka",          False),
        ("Rum",            False),
        ("Gin",            False),
        ("Tequila",        False),
        ("Amaretto",       False),
        ("Peach Schnapps", False),
        ("Cola",           True),
        ("Tonic",          True),
        ("Sprite",         True),
        ("Sinaasappelsap", False),
        ("Cranberrysap",   False),
        ("Ananassap",      False),
        ("Limoenlikeur",   False),
        ("Grenadine",      False),
        ("Blue Curaçao",   False),
    ]:
        ing = Ingredient(name=name, is_carbonated=carbonated)
        db.add(ing)
        db.flush()
        ingredients[name] = ing

    # ── Categorieën ───────────────────────────────────────────────────────
    categories = {}
    for i, (name, icon) in enumerate([
        ("Klassiekers", "🍸"),
        ("Fruity",      "🍊"),
        ("Shots",       "🥃"),
        ("Zomer",       "🌴"),
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
    ]):
        glass = Glass(name=name, volume_ml=volume, sort_order=i)
        db.add(glass)
        db.flush()
        glasses[name] = glass

    # ── Recepten ──────────────────────────────────────────────────────────
    recipes_data = [
        # Klassiekers
        {"name": "Gin Tonic",        "cat": "Klassiekers", "glass": "Longdrink",
         "ings": [("Gin", 50), ("Tonic", 200)]},
        {"name": "Wodka Cola",       "cat": "Klassiekers", "glass": "Standaard",
         "ings": [("Wodka", 50), ("Cola", 150)]},
        {"name": "Rum & Cola",       "cat": "Klassiekers", "glass": "Standaard",
         "ings": [("Rum", 50), ("Cola", 150)]},
        {"name": "Tequila Sunrise",  "cat": "Klassiekers", "glass": "Longdrink",
         "ings": [("Tequila", 50), ("Sinaasappelsap", 150), ("Grenadine", 20)]},
        # Fruity
        {"name": "Sex on the Beach", "cat": "Fruity", "glass": "Groot",
         "ings": [("Wodka", 40), ("Peach Schnapps", 20), ("Sinaasappelsap", 80), ("Cranberrysap", 60)]},
        {"name": "Daiquiri",         "cat": "Fruity", "glass": "Standaard",
         "ings": [("Rum", 50), ("Limoenlikeur", 30), ("Sinaasappelsap", 70)]},
        {"name": "Bay Breeze",       "cat": "Fruity", "glass": "Groot",
         "ings": [("Wodka", 50), ("Cranberrysap", 100), ("Ananassap", 100)]},
        {"name": "Blue Lagoon",      "cat": "Fruity", "glass": "Longdrink",
         "ings": [("Wodka", 50), ("Blue Curaçao", 30), ("Sprite", 150)]},
        # Shots
        {"name": "Tequila Shot",     "cat": "Shots", "glass": "Shotglas",
         "ings": [("Tequila", 40)]},
        {"name": "Wodka Shot",       "cat": "Shots", "glass": "Shotglas",
         "ings": [("Wodka", 40)]},
        # Zomer
        {"name": "Tropical Punch",   "cat": "Zomer", "glass": "Groot",
         "ings": [("Rum", 40), ("Ananassap", 100), ("Sinaasappelsap", 80), ("Grenadine", 20)]},
        {"name": "Amaretto Sour",    "cat": "Zomer", "glass": "Standaard",
         "ings": [("Amaretto", 50), ("Sinaasappelsap", 100), ("Grenadine", 10)]},
    ]

    recipe_objs = []
    for rd in recipes_data:
        recipe = Recipe(
            name=rd["name"],
            category_id=categories[rd["cat"]].id,
            glass_id=glasses[rd["glass"]].id,
            enabled=True,
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

    # ── Demo sessies + pours (afgelopen 7 dagen) ──────────────────────────
    rng = random.Random(42)
    now = datetime.utcnow()

    # Populariteit per recept (zodat de ranglijst realistisch is)
    weights = [8, 6, 5, 7, 9, 4, 3, 5, 2, 2, 3, 4]

    for day_offset in range(7):
        day_start = now - timedelta(days=day_offset, hours=now.hour,
                                    minutes=now.minute, seconds=now.second)
        # 1-3 diensten per dag
        n_sessions = rng.randint(1, 3)
        for s_idx in range(n_sessions):
            session_start = day_start + timedelta(hours=rng.randint(11, 22))
            session_end   = session_start + timedelta(hours=rng.randint(2, 5))
            if session_end > now:
                session_end = None  # lopende sessie

            sess = MachineSession(started_at=session_start, ended_at=session_end)
            db.add(sess)
            db.flush()

            # 5-25 pours per sessie
            n_pours = rng.randint(5, 25)
            for _ in range(n_pours):
                recipe = rng.choices(recipe_objs, weights=weights[:len(recipe_objs)], k=1)[0]
                pour_time = session_start + timedelta(
                    minutes=rng.randint(5, max(6, int((session_end or now - session_start).seconds / 60 - 5) if session_end else 200))
                )
                db.add(Pour(
                    recipe_id=recipe.id,
                    recipe_name=recipe.name,
                    scale=1.0,
                    session_id=sess.id,
                    poured_at=pour_time,
                ))

    db.commit()
