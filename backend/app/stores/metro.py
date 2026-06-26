import httpx
from bs4 import BeautifulSoup
from .base import BaseStoreAdapter
from app.models.product import Product, MetodoPago


class MetroAdapter(BaseStoreAdapter):
    name = "Metro"
    base_url = "https://www.metro.pe"

    def build_search_url(self, query: str) -> str:
        return f"{self.base_url}/search?q={query.replace(' ', '+')}"

    def parse(self, html: str, source_url: str) -> list[Product]:
        soup = BeautifulSoup(html, "html.parser")
        products = []

        for card in soup.select(".product-card")[:10]:
            try:
                titulo_el = card.select_one(".product-card__title")
                precio_el = card.select_one(".product-card__price--discount")
                link_el = card.select_one("a.product-card__link")
                if not all([titulo_el, precio_el, link_el]):
                    continue

                precio_texto = precio_el.text.strip().replace("S/", "").replace(",", "").strip()
                product_url = link_el["href"]
                if product_url.startswith("/"):
                    product_url = self.base_url + product_url

                products.append(Product(
                    tienda=self.name,
                    titulo=titulo_el.text.strip(),
                    precio=float(precio_texto),
                    url=product_url,
                ))
            except (ValueError, TypeError, KeyError):
                continue
        return products
