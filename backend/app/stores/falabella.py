import httpx
from bs4 import BeautifulSoup
from .base import BaseStoreAdapter
from app.models.product import Product, MetodoPago, TiendaFisica


class FalabellaAdapter(BaseStoreAdapter):
    name = "Falabella"
    base_url = "https://www.saga.falabella.com.pe"

    def build_search_url(self, query: str) -> str:
        return f"{self.base_url}/s/{query.replace(' ', '+')}"

    def parse(self, html: str, source_url: str) -> list[Product]:
        soup = BeautifulSoup(html, "html.parser")
        products = []

        for card in soup.select(".pod-subpod")[:10]:
            try:
                titulo_el = card.select_one(".pod-subpod-title")
                precio_el = card.select_one(".copy10.primary.medium")
                link_el = card.select_one("a")
                if not all([titulo_el, precio_el, link_el]):
                    continue

                precio_texto = precio_el.text.strip().replace("S/", "").replace(",", "").strip()
                product_url = link_el["href"]
                if product_url.startswith("/"):
                    product_url = self.base_url + product_url

                metodos = []
                if card.select_one(".yape-icon"):
                    metodos.append(MetodoPago(nombre="Yape"))
                if card.select_one(".cuotas"):
                    cuotas_text = card.select_one(".cuotas").text.strip()
                    metodos.append(MetodoPago(nombre="Tarjeta", detalle=cuotas_text))

                products.append(Product(
                    tienda=self.name,
                    titulo=titulo_el.text.strip(),
                    precio=float(precio_texto),
                    url=product_url,
                    metodos_pago=metodos,
                ))
            except (ValueError, TypeError, KeyError):
                continue
        return products
