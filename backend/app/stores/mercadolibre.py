import httpx
from .base import BaseStoreAdapter
from app.models.product import Product, MetodoPago


class MercadoLibreAdapter(BaseStoreAdapter):
    name = "MercadoLibre"
    base_url = "https://api.mercadolibre.com"

    def build_search_url(self, query: str) -> str:
        return f"{self.base_url}/sites/MPE/search?q={query}&limit=10"

    def parse(self, html: str, source_url: str) -> list[Product]:
        return []

    async def fetch(self, query: str) -> list[Product]:
        url = self.build_search_url(query)
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10)
            data = response.json()

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
