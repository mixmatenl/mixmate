from sqlmodel import Session
from .models import Ingredient, Category, Glass, Recipe, RecipeIngredient


def seed_demo_data(session: Session):
    # Ingrediënten
    ingredients = {}
    for name, carbonated in [
        ("Wodka", False),
        ("Rum", False),
        ("Cola", True),
        ("Sinaasappelsap", False),
        ("Limoenlikeur", False),
        ("Tonic", True),
        ("Gin", False),
        ("Cranberrysap", False),
    ]:
        ing = Ingredient(name=name, is_carbonated=carbonated)
        session.add(ing)
        session.flush()
        ingredients[name] = ing

    # Categorieën
    categories = {}
    for i, name in enumerate(["Klassiekers", "Fruity"]):
        cat = Category(name=name, sort_order=i)
        session.add(cat)
        session.flush()
        categories[name] = cat

    # Glazen
    glasses = {}
    for i, (name, volume) in enumerate([("Standaard", 250), ("Groot", 350)]):
        glass = Glass(name=name, volume_ml=volume, sort_order=i)
        session.add(glass)
        session.flush()
        glasses[name] = glass

    # Recepten
    recipes_data = [
        {
            "name": "Wodka Cola",
            "category": "Klassiekers",
            "glass": "Standaard",
            "ingredients": [("Wodka", 50), ("Cola", 150)],
        },
        {
            "name": "Gin Tonic",
            "category": "Klassiekers",
            "glass": "Standaard",
            "ingredients": [("Gin", 50), ("Tonic", 150)],
        },
        {
            "name": "Sex on the Beach",
            "category": "Fruity",
            "glass": "Groot",
            "ingredients": [("Wodka", 40), ("Sinaasappelsap", 100), ("Cranberrysap", 60)],
        },
        {
            "name": "Daiquiri",
            "category": "Fruity",
            "glass": "Standaard",
            "ingredients": [("Rum", 50), ("Limoenlikeur", 30), ("Sinaasappelsap", 70)],
        },
    ]

    for recipe_data in recipes_data:
        recipe = Recipe(
            name=recipe_data["name"],
            category_id=categories[recipe_data["category"]].id,
            glass_id=glasses[recipe_data["glass"]].id,
            enabled=True,
        )
        session.add(recipe)
        session.flush()

        for order, (ing_name, amount_ml) in enumerate(recipe_data["ingredients"]):
            ri = RecipeIngredient(
                recipe_id=recipe.id,
                ingredient_id=ingredients[ing_name].id,
                amount_ml=amount_ml,
                order=order,
            )
            session.add(ri)

    session.commit()
