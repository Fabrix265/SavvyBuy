from abc import ABC, abstractmethod
from app.models.product import Product


class BaseStoreAdapter(ABC):
    name: str = ""
    base_url: str = ""

    @abstractmethod
    def build_search_url(self, query: str) -> str:
        pass

    @abstractmethod
    def parse(self, html: str, source_url: str) -> list[Product]:
        pass

    def get_headers(self) -> dict:
        return {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            "Accept-Language": "es-PE,es;q=0.9",
        }
