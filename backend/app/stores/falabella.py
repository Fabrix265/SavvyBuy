import json
import re
from .base import BaseStoreAdapter
from app.models.product import Product, MetodoPago


class FalabellaAdapter(BaseStoreAdapter):
    name = "Falabella"
    base_url = "https://www.falabella.com.pe"
    store_path = "/falabella-pe"

    def build_search_url(self, query: str) -> str:
        return f"{self.base_url}{self.store_path}/search?Ntt={query.replace(' ', '+')}"

    def _extract_precio(self, prices: list[dict]) -> float:
        preferidos = ["internetPrice", "eventPrice", "cmrPrice"]
        por_tipo = {p["type"]: p for p in prices if p.get("price")}

        for tipo in preferidos:
            if tipo in por_tipo:
                return float(por_tipo[tipo]["price"][0])

        no_tachados = [p for p in prices if p.get("price") and not p.get("crossed")]
        if no_tachados:
            return float(min(no_tachados, key=lambda p: float(p["price"][0]))["price"][0])

        return 0.0

    def parse(self, html: str, source_url: str) -> list[Product]:
        match = re.search(
            r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>',
            html,
            re.S,
        )
        if not match:
            return []

        try:
            data = json.loads(match.group(1))
            results = data["props"]["pageProps"]["results"]
        except (json.JSONDecodeError, KeyError, TypeError):
            return []

        products = []
        for item in results[:15]:
            try:
                titulo = item.get("displayName")
                url = item.get("url")
                prices = item.get("prices", [])
                if not titulo or not url or not prices:
                    continue

                precio = self._extract_precio(prices)
                if precio <= 0:
                    continue

                metodos = []
                if item.get("brand"):
                    metodos.append(MetodoPago(nombre="Marca", detalle=item["brand"]))

                products.append(Product(
                    tienda=self.name,
                    titulo=titulo,
                    precio=precio,
                    url=url,
                    metodos_pago=metodos,
                ))
            except (ValueError, TypeError, KeyError):
                continue
        return products