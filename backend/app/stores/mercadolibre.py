from .base import BaseStoreAdapter
from app.models.product import Product, MetodoPago
from bs4 import BeautifulSoup
import json
import re


class MercadoLibreAdapter(BaseStoreAdapter):
    name = "MercadoLibre"
    base_url = "https://api.mercadolibre.com"

    def build_search_url(self, query: str) -> str:
        return f"{self.base_url}/sites/MPE/search?q={query}&limit=10"

    def get_headers(self) -> dict:
        return {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/125.0.0.0 Safari/537.36"
            ),
            "Accept": "application/json",
            "Accept-Language": "es-PE,es;q=0.9",
        }

    def parse(self, html: str, source_url: str) -> list[Product]:
        try:
            data = json.loads(html)
        except (json.JSONDecodeError, TypeError):
            return []

        products = []
        for item in data.get("results", []):
            metodos = []
            if item.get("installments"):
                inst = item["installments"]
                metodos.append(MetodoPago(
                    nombre="Tarjeta",
                    detalle=f"{inst['quantity']} cuotas de S/ {inst['amount']:.0f}"
                ))

            products.append(Product(
                tienda=self.name,
                titulo=item["title"],
                precio=float(item["price"]),
                moneda=item.get("currency_id", "PEN"),
                url=item["permalink"],
                rating=item.get("reviews", {}).get("rating_average"),
                num_opiniones=item.get("reviews", {}).get("total"),
                imagen_url=item.get("thumbnail"),
                metodos_pago=metodos,
            ))
        return products