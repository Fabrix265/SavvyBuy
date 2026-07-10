import json
import asyncio
from datetime import date
from pathlib import Path
from app.config import settings, SEARCH_APIS

USAGE_FILE = Path(__file__).parent.parent / "usage.json"


class APIRouter:

    def __init__(self):
        self.usage = self._load_usage()

    def _load_usage(self) -> dict:
        if not USAGE_FILE.exists():
            return {"month": str(date.today())[:7], "counts": {}}
        data = json.loads(USAGE_FILE.read_text())
        current_month = str(date.today())[:7]
        if data.get("month") != current_month:
            return {"month": current_month, "counts": {}}
        return data

    def _save_usage(self):
        USAGE_FILE.write_text(json.dumps(self.usage, indent=2))

    def _is_available(self, api: dict) -> bool:
        if api["env_key"] is not None:
            key = getattr(settings, api["env_key"], None)
            if not key:
                return False
        if api["monthly_limit"] is None:
            return True
        used = self.usage["counts"].get(api["name"], 0)
        return used < api["monthly_limit"]

    def _increment_usage(self, api_name: str):
        self.usage["counts"][api_name] = self.usage["counts"].get(api_name, 0) + 1
        self._save_usage()

    async def search(self, query: str) -> list[dict]:
        for api in SEARCH_APIS:
            if not self._is_available(api):
                print(f"[APIRouter] {api['name']} no disponible, pasando al siguiente")
                continue
            try:
                results = await self._call(api["name"], query)
                self._increment_usage(api["name"])
                print(f"[APIRouter] Resultados obtenidos con {api['name']}")
                return results
            except Exception as e:
                print(f"[APIRouter] {api['name']} falló: {e}")
                continue
        raise RuntimeError("Todas las APIs de búsqueda fallaron o agotaron su cupo")

    async def _call(self, api_name: str, query: str) -> list[dict]:
        if api_name == "tavily":
            return await self._call_tavily(query)
        elif api_name == "serpapi":
            return await self._call_serpapi(query)
        elif api_name == "duckduckgo":
            return await self._call_duckduckgo(query)
        raise ValueError(f"API desconocida: {api_name}")

    async def _call_tavily(self, query: str) -> list[dict]:
        from tavily import TavilyClient
        client = TavilyClient(api_key=settings.tavily_api_key)
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None, lambda: client.search(query, max_results=10)
        )
        return [
            {"title": r["title"], "url": r["url"], "snippet": r.get("content", "")}
            for r in response.get("results", [])
        ]

    async def _call_serpapi(self, query: str) -> list[dict]:
        from serpapi import GoogleSearch
        params = {"q": query, "api_key": settings.serpapi_api_key, "gl": "pe", "hl": "es"}
        loop = asyncio.get_event_loop()
        search = await loop.run_in_executor(None, lambda: GoogleSearch(params))
        results = search.get_dict().get("organic_results", [])
        return [
            {"title": r["title"], "url": r["link"], "snippet": r.get("snippet", "")}
            for r in results
        ]

    async def _call_duckduckgo(self, query: str) -> list[dict]:
        from duckduckgo_search import DDGS
        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(
            None, lambda: list(DDGS().text(query, max_results=10, region="pe-es"))
        )
        return [
            {"title": r["title"], "url": r["href"], "snippet": r.get("body", "")}
            for r in results
        ]


api_router = APIRouter()
