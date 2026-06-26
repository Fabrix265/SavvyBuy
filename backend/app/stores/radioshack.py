import httpx
from bs4 import BeautifulSoup
from .base import BaseStoreAdapter
from app.models.product import Product, MetodoPago


class RadioShackAdapter(BaseStoreAdapter):
    name = "RadioShack"
    base_url = "https://www.radioshack.com.pe"

    def build_search_url(self, query: str) -> str:
        return f"{self.base_url}/search?q={query.replace(' ', '+')}"

    def parse(self, html: str, source_url: str) -> list[Product]:
        soup = BeautifulSoup(html, "html.parser")
        products = []

        for card in soup.select(".product-item")[:10]:
            try:
                titulo_el = card.select_one(".product-item__title")
                precio_el = card.select_one(".product-item__price--discount")
                link_el = card.select_one("a.product-item__link")
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
