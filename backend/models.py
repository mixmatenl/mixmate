from datetime import datetime
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship


class Config(SQLModel, table=True):
    """Key-value store voor persistente machine-instellingen (buiten .env)."""
    key: str = Field(primary_key=True)
    value: str = ""


class Glass(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    volume_ml: float
    sort_order: int = 0
    recipes: List["Recipe"] = Relationship(back_populates="glass_rel")


class Category(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    sort_order: int = 0
    recipes: List["Recipe"] = Relationship(back_populates="category_rel")


class Ingredient(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    is_carbonated: bool = False
    image_url: str = ""
    pumps: List["Pump"] = Relationship(back_populates="ingredient")


class Pump(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    slot: int
    pump_type: str = "peristaltic"   # peristaltic | valve
    gpio_pin: int
    ml_per_second: float = 35.0
    enabled: bool = True
    ingredient_id: Optional[int] = Field(default=None, foreign_key="ingredient.id")
    ingredient: Optional[Ingredient] = Relationship(back_populates="pumps")


class RecipeIngredient(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    recipe_id: int = Field(foreign_key="recipe.id")
    ingredient_id: int = Field(foreign_key="ingredient.id")
    amount_ml: float
    order: int = 0


class Recipe(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: str = ""
    image_url: str = ""
    category_id: Optional[int] = Field(default=None, foreign_key="category.id")
    category_rel: Optional[Category] = Relationship(back_populates="recipes")
    glass_id: Optional[int] = Field(default=None, foreign_key="glass.id")
    glass_rel: Optional[Glass] = Relationship(back_populates="recipes")
    enabled: bool = True


class Favorite(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    recipe_id: int = Field(foreign_key="recipe.id", index=True)


class Session(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    started_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = None

class Pour(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    recipe_id: Optional[int] = Field(default=None, foreign_key="recipe.id")
    recipe_name: str = ""
    poured_at: datetime = Field(default_factory=datetime.utcnow)
    scale: float = 1.0
    session_id: Optional[int] = Field(default=None, foreign_key="session.id")


# ── Schemas ────────────────────────────────────────────────────────────────────

class GlassRead(SQLModel):
    id: int
    name: str
    volume_ml: float
    sort_order: int

class GlassCreate(SQLModel):
    name: str
    volume_ml: float
    sort_order: int = 0

class GlassUpdate(SQLModel):
    name: Optional[str] = None
    volume_ml: Optional[float] = None
    sort_order: Optional[int] = None


class CategoryRead(SQLModel):
    id: int
    name: str
    sort_order: int

class CategoryCreate(SQLModel):
    name: str
    sort_order: int = 0

class CategoryUpdate(SQLModel):
    name: Optional[str] = None
    sort_order: Optional[int] = None


class IngredientRead(SQLModel):
    id: int
    name: str
    is_carbonated: bool
    image_url: str = ""

class IngredientCreate(SQLModel):
    name: str
    is_carbonated: bool = False
    image_url: str = ""

class IngredientUpdate(SQLModel):
    name: Optional[str] = None
    is_carbonated: Optional[bool] = None
    image_url: Optional[str] = None


class PumpRead(SQLModel):
    id: int
    slot: int
    pump_type: str
    gpio_pin: int
    ml_per_second: float
    enabled: bool
    ingredient_id: Optional[int]
    ingredient: Optional[IngredientRead]

class PumpCreate(SQLModel):
    slot: int
    pump_type: str = "peristaltic"
    gpio_pin: int
    ml_per_second: float = 1.0
    enabled: bool = True
    ingredient_id: Optional[int] = None

class PumpUpdate(SQLModel):
    slot: Optional[int] = None
    pump_type: Optional[str] = None
    gpio_pin: Optional[int] = None
    ml_per_second: Optional[float] = None
    enabled: Optional[bool] = None
    ingredient_id: Optional[int] = None

# Bartender-safe pump view (no GPIO details)
class PumpSimple(SQLModel):
    id: int
    slot: int
    ingredient_id: Optional[int]
    ingredient: Optional[IngredientRead]
    enabled: bool


class RecipeIngredientCreate(SQLModel):
    ingredient_id: int
    amount_ml: float
    order: int = 0

class RecipeIngredientRead(SQLModel):
    ingredient_id: int
    ingredient_name: str
    amount_ml: float
    order: int
    has_pump: bool = False   # True if ingredient is loaded in machine

class RecipeCreate(SQLModel):
    name: str
    description: str = ""
    category_id: Optional[int] = None
    glass_id: Optional[int] = None
    image_url: str = ""
    ingredients: List[RecipeIngredientCreate] = []

class RecipeUpdate(SQLModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    glass_id: Optional[int] = None
    image_url: Optional[str] = None
    enabled: Optional[bool] = None
    ingredients: Optional[List[RecipeIngredientCreate]] = None

class RecipeRead(SQLModel):
    id: int
    name: str
    description: str
    image_url: str
    category_id: Optional[int]
    category_name: Optional[str]
    glass_id: Optional[int]
    glass_name: Optional[str]
    glass_volume_ml: Optional[float]
    total_volume_ml: float
    enabled: bool
    ingredients: List[RecipeIngredientRead] = []
    fully_automatic: bool = False
    partially_available: bool = False
    pour_count: int = 0


class PourCreate(SQLModel):
    recipe_id: Optional[int] = None
    recipe_name: str = ""
    scale: float = 1.0

class PourRead(SQLModel):
    id: int
    recipe_id: Optional[int]
    recipe_name: str
    poured_at: datetime
    scale: float
    session_id: Optional[int] = None

class SessionRead(SQLModel):
    id: int
    started_at: datetime
    ended_at: Optional[datetime] = None
