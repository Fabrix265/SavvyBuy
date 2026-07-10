from urllib.parse import quote
from .base import BaseStoreAdapter
from .vtex_common import parse_vtex_state
from app.models.product import Product


class RadioShackAdapter(BaseStoreAdapter):
    name = "RadioShack"
    base_url = "https://www.coolbox.pe"

    def build_search_url(self, query: str) -> str:
        return f"{self.base_url}/{quote(query)}/radioshack?map=ft,marca"

    def parse(self, html: str, source_url: str) -> list[Product]:
        return parse_vtex_state(
            html,
            self.name,
            self.base_url,
            brand_filter="radioshack",
        )