from pydantic import BaseModel
from typing import Optional


class Product(BaseModel):
    tienda: str
    titulo: str
    precio: float
    moneda: str = "PEN"
    url: str
    rating: Optional[float] = None
    num_opiniones: Optional[int] = None
    descripcion: Optional[str] = None
    imagen_url: Optional[str] = None


class ScoredProduct(Product):
    score_total: float
    veredicto: str
    explicacion: str
    trampa: Optional[str] = None
    pros: list[str] = []
    contras: list[str] = []
