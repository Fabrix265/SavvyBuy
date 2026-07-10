from pydantic import BaseModel
from typing import Optional


class Opinion(BaseModel):
    texto: str
    estrellas: Optional[int] = None
    fuente: Optional[str] = None
    fecha: Optional[str] = None


class MetodoPago(BaseModel):
    nombre: str
    detalle: Optional[str] = None


class TiendaFisica(BaseModel):
    nombre: str
    disponible: bool
    direccion: Optional[str] = None


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
    specs: dict = {}
    metodos_pago: list[MetodoPago] = []
    tiendas_fisicas: list[TiendaFisica] = []
    opiniones_muestra: list[Opinion] = []


class ScoredProduct(Product):
    score_total: float
    veredicto: str
    explicacion: str
    trampa: Optional[str] = None
    pros: list[str] = []
    contras: list[str] = []
