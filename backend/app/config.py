from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # IA
    ai_provider: str = "openai"
    ai_model: str = "gpt-4o-mini"
    ai_api_key: str = ""
    ai_base_url: Optional[str] = None

    # APIs de búsqueda
    tavily_api_key: Optional[str] = None
    serpapi_api_key: Optional[str] = None

    class Config:
        env_file = ".env"


settings = Settings()

# Orden de prioridad del fallback — el sistema las intenta de arriba a abajo
SEARCH_APIS = [
    {
        "name": "tavily",
        "env_key": "tavily_api_key",
        "monthly_limit": 1000,
    },
    {
        "name": "serpapi",
        "env_key": "serpapi_api_key",
        "monthly_limit": 100,
    },
    {
        "name": "duckduckgo",
        "env_key": None,
        "monthly_limit": None,
    },
]

# Tiendas activas — comenta las que no quieras usar
ACTIVE_STORES = [
    "mercadolibre",
    "falabella",
    "ripley",
    "oechsle",
    "sodimac",
    "metro",
    "tiendamia",
    "radioshack",
]
