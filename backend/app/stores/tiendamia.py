import httpx
from bs4 import BeautifulSoup
from .base import BaseStoreAdapter
from app.models.product import Product, MetodoPago


class TiendaMiaAdapter(BaseStoreAdapter):
    name = "TiendaMia"
    base_url = "https://www.tiendamia.com"

    def build_search_url(self, query: str) -> str:
        return f"{self.base_url}/search?q={query.replace(' ', '+')}&country=pe"

    def parse(self, html: str, source_url: str) -> list[Product]:
        soup = BeautifulSoup(html, "html.parser")
        products = []

        for card in soup.select(".product-card")[:10]:
            try:
                titulo_el = card.select_one(".product-card__title")
                precio_el = card.select_one(".product-card__price")
                link_el = card.select_one("a.product-card__link")
                if not all([titulo_el, precio_el, link_el]):
                    continue

                precio_raw = precio_el.text.strip()
                moneda = "USD" if "USD" in precio_raw else "PEN"
                precio_texto = precio_raw.replace("S/", "").replace("USD", "").replace(",", "").strip()

                product_url = link_el["href"]
                if product_url.startswith("/"):
                    product_url = self.base_url + product_url

                products.append(Product(
                    tienda=self.name,
                    titulo=titulo_el.text.strip(),
                    precio=float(precio_texto),
                    moneda=moneda, 
                    url=product_url,
                ))
            except (ValueError, TypeError, KeyError):
                continue
        return products
