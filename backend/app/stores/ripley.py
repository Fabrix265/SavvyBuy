import httpx
from bs4 import BeautifulSoup
from .base import BaseStoreAdapter
from app.models.product import Product, MetodoPago


class RipleyAdapter(BaseStoreAdapter):
    name = "Ripley"
    base_url = "https://simple.ripley.pe"

    def build_search_url(self, query: str) -> str:
        return f"{self.base_url}/search?q={query.replace(' ', '+')}"

    def parse(self, html: str, source_url: str) -> list[Product]:
        soup = BeautifulSoup(html, "html.parser")
        products = []

        for card in soup.select(".catalog-product-item")[:10]:
            try:
                titulo_el = card.select_one(".catalog-product-item__title")
                precio_el = card.select_one(".catalog-product-item__price--discount")
                link_el = card.select_one("a.catalog-product-item__link")
                if not all([titulo_el, precio_el, link_el]):
                    continue

                precio_texto = precio_el.text.strip().replace("S/", "").replace(",", "").strip()
                product_url = link_el["href"]
                if product_url.startswith("/"):
                    product_url = "https://ripley.pe" + product_url

                metodos = []
                cuotas_el = card.select_one(".catalog-product-item__card")
                if cuotas_el:
                    metodos.append(MetodoPago(nombre="Tarjeta", detalle=cuotas_el.text.strip()))

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
