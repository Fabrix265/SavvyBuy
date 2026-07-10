from .base import BaseStoreAdapter
from .vtex_common import build_vtex_search_url, parse_vtex_state
from app.models.product import Product


class MetroAdapter(BaseStoreAdapter):
    name = "Metro"
    base_url = "https://www.metro.pe"

    def build_search_url(self, query: str) -> str:
        return build_vtex_search_url(self.base_url, query)

    def parse(self, html: str, source_url: str) -> list[Product]:
        return parse_vtex_state(html, self.name, self.base_url)