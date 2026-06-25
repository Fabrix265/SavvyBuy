# Plan de implementación — Agente Comparador de Productos Perú

Este documento es la guía de desarrollo para agentes o desarrolladores. Cada paso es independiente, tiene entradas claras, salidas verificables y criterios de éxito. Seguir el orden es importante porque cada paso depende del anterior.

---

## Índice

- [Paso 1 — Estructura base del proyecto](#paso-1--estructura-base-del-proyecto)
- [Paso 2 — Configuración y modelos de datos](#paso-2--configuración-y-modelos-de-datos)
- [Paso 3 — API Router con fallback](#paso-3--api-router-con-fallback)
- [Paso 4 — Adaptadores de tiendas](#paso-4--adaptadores-de-tiendas)
- [Paso 5 — Agente de entrevista](#paso-5--agente-de-entrevista)
- [Paso 6 — Agente de análisis](#paso-6--agente-de-análisis)
- [Paso 7 — Backend FastAPI](#paso-7--backend-fastapi)
- [Paso 8 — Frontend React](#paso-8--frontend-react)
- [Paso 9 — Integración y pruebas end-to-end](#paso-9--integración-y-pruebas-end-to-end)

---

## Paso 1 — Estructura base del proyecto

**Objetivo:** Tener el repositorio listo con todos los archivos vacíos en su lugar, dependencias instaladas y entorno funcionando.

### Tareas

1. Crear la estructura de carpetas completa:

```
agente-comparador/
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   │   ├── __init__.py
│   │   │   ├── interviewer.py
│   │   │   └── analyst.py
│   │   ├── stores/
│   │   │   ├── __init__.py
│   │   │   ├── base.py
│   │   │   ├── mercadolibre.py
│   │   │   ├── falabella.py
│   │   │   ├── ripley.py
│   │   │   ├── oechsle.py
│   │   │   ├── sodimac.py
│   │   │   ├── metro.py
│   │   │   ├── tiendamia.py
│   │   │   └── radioshack.py
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   └── api_router.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── product.py
│   │   │   └── search.py
│   │   ├── __init__.py
│   │   ├── config.py
│   │   └── main.py
│   ├── tests/
│   │   └── __init__.py
│   ├── .env
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Chat.jsx
│   │   │   ├── ProductCard.jsx
│   │   │   └── ResultsPanel.jsx
│   │   ├── pages/
│   │   │   └── Home.jsx
│   │   └── main.jsx
│   ├── public/
│   ├── .env
│   └── package.json
├── README.md
└── .gitignore
```

2. Crear `backend/requirements.txt`:

```
fastapi==0.111.0
uvicorn[standard]==0.30.0
httpx==0.27.0
beautifulsoup4==4.12.3
pydantic==2.7.0
pydantic-settings==2.3.0
python-dotenv==1.0.1
duckduckgo-search==6.1.9
tavily-python==0.3.3
google-search-results==2.4.2
```

3. Crear `backend/.env.example`:

```env
# IA — elige el proveedor que uses
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
AI_API_KEY=

# APIs de búsqueda (deja vacías las que no tengas)
TAVILY_API_KEY=
SERPAPI_API_KEY=
```

4. Crear `.gitignore` en la raíz:

```
# Entorno
.env
venv/
__pycache__/
*.pyc
.DS_Store

# Frontend
node_modules/
dist/

# Datos locales del proyecto
backend/app/usage.json
```

5. Inicializar el frontend con Vite:

```bash
cd frontend
npm create vite@latest . -- --template react
npm install
npm install axios
```

### Criterio de éxito

- `cd backend && uvicorn app.main:app` arranca sin errores (aunque main.py esté vacío con solo `from fastapi import FastAPI; app = FastAPI()`)
- `cd frontend && npm run dev` abre la app en el navegador
- No hay ningún secreto real en ningún archivo commiteado

---

## Paso 2 — Configuración y modelos de datos

**Objetivo:** Definir los schemas de datos y la configuración central del proyecto. Todo el sistema depende de estos archivos.

### Tareas

1. Implementar `backend/app/models/product.py` — el formato unificado que devuelven todas las tiendas:

```python
from pydantic import BaseModel
from typing import Optional

class Product(BaseModel):
    tienda: str
    titulo: str
    precio: float
    moneda: str = "PEN"
    url: str
    rating: Optional[float] = None
    num_opiniones: Optional[int] = None
    descripcion: Optional[str] = None
    imagen_url: Optional[str] = None

class ScoredProduct(Product):
    score_total: float
    veredicto: str                  # "Mejor calidad-precio" | "Opción premium" | "Evitar"
    explicacion: str
    trampa: Optional[str] = None    # Lo que el vendedor no dice en el título
    pros: list[str] = []
    contras: list[str] = []
```

2. Implementar `backend/app/models/search.py` — los datos que fluyen entre el frontend y el backend:

```python
from pydantic import BaseModel
from typing import Optional

class ChatMessage(BaseModel):
    role: str       # "user" | "assistant"
    content: str

class SearchRequest(BaseModel):
    messages: list[ChatMessage]
    categoria: Optional[str] = None

class SearchResponse(BaseModel):
    message: str
    productos: list = []
    busqueda_lista: bool = False    # True cuando el agente ya tiene suficiente info para buscar
```

3. Implementar `backend/app/config.py`:

```python
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # IA
    ai_provider: str = "openai"
    ai_model: str = "gpt-4o-mini"
    ai_api_key: str = ""

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
```

### Criterio de éxito

- `from app.models.product import Product, ScoredProduct` no lanza errores
- `from app.config import settings, SEARCH_APIS, ACTIVE_STORES` no lanza errores
- Crear un `Product` con datos de prueba y llamar `.model_dump()` devuelve el dict correcto

---

## Paso 3 — API Router con fallback

**Objetivo:** Implementar el sistema que gestiona las APIs de búsqueda, rotan automáticamente cuando una falla o agota su cupo mensual y persisten el uso en disco.

### Tareas

1. Implementar `backend/app/routers/api_router.py`:

```python
import json
import asyncio
from datetime import datetime, date
from pathlib import Path
from app.config import settings, SEARCH_APIS

USAGE_FILE = Path(__file__).parent.parent / "usage.json"

class APIRouter:

    def __init__(self):
        self.usage = self._load_usage()

    def _load_usage(self) -> dict:
        """Carga el uso del mes actual. Si es un mes nuevo, resetea los contadores."""
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
        """Devuelve True si la API tiene cupo y tiene key configurada."""
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
        """
        Intenta cada API en orden. Devuelve resultados del primero que funcione.
        Cada resultado tiene: title, url, snippet.
        """
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
                print(f"[APIRouter] {api['name']} falló: {e}, pasando al siguiente")
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
```

2. Crear `backend/tests/test_api_router.py`:

```python
import pytest
from app.routers.api_router import APIRouter

@pytest.mark.asyncio
async def test_fallback_cuando_api_no_disponible():
    router = APIRouter()
    # Simula que tavily y serpapi no están disponibles
    router.usage["counts"]["tavily"] = 999999
    router.usage["counts"]["serpapi"] = 999999
    # Debe caer a duckduckgo sin error
    results = await router.search("freidora de aire")
    assert isinstance(results, list)
    assert len(results) > 0

def test_resetea_uso_en_mes_nuevo():
    router = APIRouter()
    router.usage = {"month": "2020-01", "counts": {"tavily": 999}}
    loaded = router._load_usage()
    # Si el mes guardado es distinto al actual, los contadores deben resetearse
    # (este test pasa solo si el mes actual no es 2020-01)
    assert loaded["counts"].get("tavily", 0) == 0
```

### Criterio de éxito

- `await api_router.search("freidora de aire")` devuelve al menos 5 resultados con `title`, `url` y `snippet`
- Si se pone `monthly_limit: 0` a todas las APIs menos DuckDuckGo, la búsqueda igual funciona
- Después de cada búsqueda, `usage.json` se actualiza con el conteo correcto

---

## Paso 4 — Adaptadores de tiendas

**Objetivo:** Implementar la clase base y todos los adaptadores de tienda. Cada adaptador sabe cómo construir la URL de búsqueda de su tienda y cómo extraer los datos del HTML.

### Tareas

1. Implementar `backend/app/stores/base.py` — la interfaz que todas las tiendas deben cumplir:

```python
from abc import ABC, abstractmethod
from app.models.product import Product

class BaseStoreAdapter(ABC):
    name: str = ""
    base_url: str = ""

    @abstractmethod
    def build_search_url(self, query: str) -> str:
        """Construye la URL de búsqueda para esta tienda."""
        pass

    @abstractmethod
    def parse(self, html: str, source_url: str) -> list[Product]:
        """
        Recibe el HTML de la página de resultados y devuelve
        una lista de productos en formato normalizado.
        Si no encuentra productos, devuelve lista vacía.
        """
        pass

    def get_headers(self) -> dict:
        """Headers HTTP para evitar bloqueos básicos."""
        return {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            "Accept-Language": "es-PE,es;q=0.9",
        }
```

2. Implementar `backend/app/stores/mercadolibre.py` — usa API oficial, no scraping:

```python
import httpx
from .base import BaseStoreAdapter
from app.models.product import Product

class MercadoLibreAdapter(BaseStoreAdapter):
    name = "MercadoLibre"
    base_url = "https://api.mercadolibre.com"

    def build_search_url(self, query: str) -> str:
        return f"{self.base_url}/sites/MPE/search?q={query}&limit=10"

    def parse(self, html: str, source_url: str) -> list[Product]:
        # MercadoLibre devuelve JSON, no HTML
        # Este método no se usa directamente — ver fetch() abajo
        return []

    async def fetch(self, query: str) -> list[Product]:
        url = self.build_search_url(query)
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10)
            data = response.json()
        products = []
        for item in data.get("results", []):
            products.append(Product(
                tienda=self.name,
                titulo=item["title"],
                precio=float(item["price"]),
                moneda=item.get("currency_id", "PEN"),
                url=item["permalink"],
                rating=item.get("reviews", {}).get("rating_average"),
                num_opiniones=item.get("reviews", {}).get("total"),
                imagen_url=item.get("thumbnail"),
            ))
        return products
```

3. Implementar el resto de adaptadores siguiendo esta plantilla. El selector CSS cambia por tienda, la estructura es siempre la misma:

```python
# Plantilla para tiendas con scraping
import httpx
from bs4 import BeautifulSoup
from .base import BaseStoreAdapter
from app.models.product import Product

class FalabellaAdapter(BaseStoreAdapter):
    name = "Falabella"
    base_url = "https://www.saga.falabella.com.pe"

    def build_search_url(self, query: str) -> str:
        return f"{self.base_url}/s/{query.replace(' ', '+')}"

    def parse(self, html: str, source_url: str) -> list[Product]:
        soup = BeautifulSoup(html, "html.parser")
        products = []

        # Ajustar estos selectores inspeccionando el HTML real de cada tienda
        for card in soup.select(".pod-subpod")[:10]:
            try:
                titulo_el = card.select_one(".pod-subpod-title")
                precio_el = card.select_one(".copy10.primary.medium")
                url_el = card.select_one("a")
                if not all([titulo_el, precio_el, url_el]):
                    continue
                precio_texto = precio_el.text.strip().replace("S/", "").replace(",", "").strip()
                products.append(Product(
                    tienda=self.name,
                    titulo=titulo_el.text.strip(),
                    precio=float(precio_texto),
                    url=self.base_url + url_el["href"] if url_el["href"].startswith("/") else url_el["href"],
                    descripcion="",
                ))
            except (ValueError, TypeError):
                continue
        return products

# Replicar este patrón para: ripley.py, oechsle.py, sodimac.py,
# metro.py, tiendamia.py, radioshack.py
# Solo cambia: name, base_url, build_search_url y los selectores en parse()
```

4. Crear `backend/app/stores/__init__.py` para auto-cargar los adaptadores activos:

```python
from app.config import ACTIVE_STORES
from app.stores.mercadolibre import MercadoLibreAdapter
from app.stores.falabella import FalabellaAdapter
from app.stores.ripley import RipleyAdapter
from app.stores.oechsle import OechsleAdapter
from app.stores.sodimac import SodimacAdapter
from app.stores.metro import MetroAdapter
from app.stores.tiendamia import TiendaMiaAdapter
from app.stores.radioshack import RadioShackAdapter

ADAPTER_MAP = {
    "mercadolibre": MercadoLibreAdapter,
    "falabella": FalabellaAdapter,
    "ripley": RipleyAdapter,
    "oechsle": OechsleAdapter,
    "sodimac": SodimacAdapter,
    "metro": MetroAdapter,
    "tiendamia": TiendaMiaAdapter,
    "radioshack": RadioShackAdapter,
}

def get_active_adapters() -> list:
    return [ADAPTER_MAP[name]() for name in ACTIVE_STORES if name in ADAPTER_MAP]
```

### Criterio de éxito

- `await MercadoLibreAdapter().fetch("freidora de aire")` devuelve al menos 3 productos con precio en soles
- Cada adaptador de scraping devuelve al menos 1 producto con título y precio numérico válido
- Ningún adaptador lanza excepción no controlada si la tienda cambia su HTML — devuelve lista vacía

---

## Paso 5 — Agente de entrevista

**Objetivo:** Implementar el agente que conversa con el usuario, detecta su nivel de conocimiento y extrae sus necesidades reales sin pedirle especificaciones técnicas.

### Tareas

1. Implementar `backend/app/agents/interviewer.py`:

```python
import httpx
from app.config import settings
from app.models.search import ChatMessage

SYSTEM_PROMPT = """
Eres un asistente experto en comparación de productos para el mercado peruano.
Tu trabajo es ayudar al usuario a encontrar el mejor producto según su necesidad real,
sin que tenga que saber de especificaciones técnicas.

REGLAS:
- Haz preguntas cotidianas, no técnicas. En lugar de "¿cuántos litros necesitas?" pregunta
  "¿para cuántas personas cocinas normalmente?".
- Detecta el nivel de conocimiento del usuario por cómo habla. Si usa términos técnicos,
  puedes usarlos. Si no, habla en lenguaje simple.
- Haz máximo 3 preguntas antes de iniciar la búsqueda. No abrumes.
- Cuando ya tengas suficiente información, responde EXACTAMENTE con este JSON y nada más:

BUSCAR:{"categoria": "freidora de aire", "specs": {"capacidad_litros": "3.5-4.5", "presupuesto_max": 300, "prioridad": "durabilidad"}}

TRADUCCIONES COMUNES:
- "cocino para mí solo" → capacidad: 2-3 litros
- "cocino para mí y mi pareja" → capacidad: 3.5-4.5 litros
- "cocino para familia" → capacidad: 5+ litros
- "no quiero complicarme" → interfaz: manual (perillas), no pantalla táctil
- "quiero lo más completo" → interfaz: digital, con presets
"""

class InterviewerAgent:

    def __init__(self):
        self.client = httpx.AsyncClient()

    async def chat(self, messages: list[ChatMessage]) -> tuple[str, dict | None]:
        """
        Procesa el historial de mensajes y devuelve:
        - (respuesta_texto, None) si necesita más información
        - (respuesta_texto, specs_dict) si ya tiene todo para buscar
        """
        response_text = await self._call_ai(messages)

        if response_text.startswith("BUSCAR:"):
            import json
            specs_raw = response_text.replace("BUSCAR:", "").strip()
            specs = json.loads(specs_raw)
            confirmacion = f"Perfecto, voy a buscar {specs['categoria']} en las tiendas. Dame un momento..."
            return confirmacion, specs

        return response_text, None

    async def _call_ai(self, messages: list[ChatMessage]) -> str:
        formatted = [{"role": m.role, "content": m.content} for m in messages]

        if settings.ai_provider == "openai":
            response = await self.client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.ai_api_key}"},
                json={"model": settings.ai_model, "messages": [{"role": "system", "content": SYSTEM_PROMPT}] + formatted},
                timeout=30,
            )
            return response.json()["choices"][0]["message"]["content"]

        elif settings.ai_provider == "anthropic":
            response = await self.client.post(
                "https://api.anthropic.com/v1/messages",
                headers={"x-api-key": settings.ai_api_key, "anthropic-version": "2023-06-01"},
                json={"model": settings.ai_model, "max_tokens": 1024, "system": SYSTEM_PROMPT, "messages": formatted},
                timeout=30,
            )
            return response.json()["content"][0]["text"]

        elif settings.ai_provider == "gemini":
            contents = [{"role": "user" if m["role"] == "user" else "model", "parts": [{"text": m["content"]}]} for m in formatted]
            response = await self.client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{settings.ai_model}:generateContent?key={settings.ai_api_key}",
                json={"system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]}, "contents": contents},
                timeout=30,
            )
            return response.json()["candidates"][0]["content"]["parts"][0]["text"]

        raise ValueError(f"Proveedor de IA no soportado: {settings.ai_provider}")
```

### Criterio de éxito

- Una conversación de 2-3 mensajes termina con el agente emitiendo el JSON `BUSCAR:{...}`
- El agente adapta su lenguaje: con un usuario técnico usa términos como "vatios", con uno no técnico usa "potencia"
- Funciona con al menos uno de los tres proveedores configurados (OpenAI, Anthropic o Gemini)

---

## Paso 6 — Agente de análisis

**Objetivo:** Implementar el agente que recibe los productos encontrados y genera el scoring con explicación en lenguaje simple.

### Tareas

1. Implementar `backend/app/agents/analyst.py`:

```python
import json
import httpx
from app.config import settings
from app.models.product import Product, ScoredProduct

SCORING_PROMPT = """
Eres un experto en análisis de productos de consumo para el mercado peruano.
Recibirás una lista de productos y debes analizarlos y compararlos.

CRITERIOS DE EVALUACIÓN:

Calidad de materiales (peso: 30%):
- Acero inoxidable, vidrio, materiales certificados = alta puntuación
- Plástico con certificación alimentaria = puntuación media
- Plástico genérico sin certificación = baja puntuación
- Menciones de "olor al calentar" o "se derrite" en opiniones = penalización severa

Durabilidad (peso: 25%):
- Garantía del fabricante de 1+ años = suma puntos
- Más de 50 opiniones positivas = suma puntos
- Quejas de roturas o fallas en menos de 6 meses = resta puntos

Relación precio-valor (peso: 30%):
- ¿Las características extra del más caro justifican la diferencia de precio?
- Funciones que el usuario no necesitará = no suman valor
- Mismas specs a menor precio = mejor puntuación

Reputación de la tienda y marca (peso: 15%):
- Marca reconocida con servicio técnico en Perú = suma puntos
- Marca sin presencia local = penalización

FORMATO DE RESPUESTA:
Responde ÚNICAMENTE con un JSON válido, sin texto antes ni después:

{
  "productos": [
    {
      "url": "url original del producto",
      "score_total": 7.4,
      "veredicto": "Mejor calidad-precio",
      "explicacion": "Explicación en 2-3 oraciones simples de por qué este puntaje",
      "trampa": "Lo que el vendedor no dice en el título (o null si no hay trampa)",
      "pros": ["Pro 1", "Pro 2"],
      "contras": ["Contra 1"]
    }
  ],
  "resumen": "Una oración resumiendo la comparación general"
}

Los veredictos posibles son exactamente: "Mejor calidad-precio", "Opción premium", "Económica segura", "Evitar"
"""

class AnalystAgent:

    def __init__(self):
        self.client = httpx.AsyncClient()

    async def analyze(self, products: list[Product], specs: dict) -> list[ScoredProduct]:
        products_data = [p.model_dump() for p in products]
        user_message = f"""
Necesidades del usuario: {json.dumps(specs, ensure_ascii=False)}

Productos encontrados:
{json.dumps(products_data, ensure_ascii=False, indent=2)}

Analiza y puntúa estos productos según los criterios indicados.
"""
        raw_response = await self._call_ai(user_message)

        try:
            data = json.loads(raw_response)
        except json.JSONDecodeError:
            # Si la IA no devolvió JSON limpio, intentar extraerlo
            import re
            match = re.search(r'\{.*\}', raw_response, re.DOTALL)
            if not match:
                raise ValueError("La IA no devolvió un JSON válido")
            data = json.loads(match.group())

        scored = []
        scores_by_url = {p["url"]: p for p in data["productos"]}
        for product in products:
            score_data = scores_by_url.get(product.url, {})
            if score_data:
                scored.append(ScoredProduct(
                    **product.model_dump(),
                    score_total=score_data.get("score_total", 5.0),
                    veredicto=score_data.get("veredicto", "Sin veredicto"),
                    explicacion=score_data.get("explicacion", ""),
                    trampa=score_data.get("trampa"),
                    pros=score_data.get("pros", []),
                    contras=score_data.get("contras", []),
                ))

        return sorted(scored, key=lambda p: p.score_total, reverse=True)

    async def _call_ai(self, user_message: str) -> str:
        # Mismo patrón multi-proveedor que interviewer.py
        # Replicar el método _call_ai del InterviewerAgent aquí,
        # pasando SCORING_PROMPT como system prompt
        pass
```

### Criterio de éxito

- Con una lista de 5 productos de prueba, el agente devuelve 5 `ScoredProduct` con scores entre 1 y 10
- El campo `trampa` detecta correctamente cuando un producto menciona "plástico" en la descripción pero no en el título
- Los productos están ordenados de mayor a menor score en la respuesta

---

## Paso 7 — Backend FastAPI

**Objetivo:** Conectar todos los módulos anteriores en una API REST con streaming para que el frontend vea el progreso en tiempo real.

### Tareas

1. Implementar `backend/app/main.py`:

```python
import asyncio
import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import json

from app.models.search import SearchRequest, SearchResponse, ChatMessage
from app.agents.interviewer import InterviewerAgent
from app.agents.analyst import AnalystAgent
from app.routers.api_router import api_router
from app.stores import get_active_adapters

app = FastAPI(title="Agente Comparador de Productos Perú")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

interviewer = InterviewerAgent()
analyst = AnalystAgent()

@app.post("/chat")
async def chat(request: SearchRequest):
    """
    Endpoint principal. Maneja tanto la entrevista como la búsqueda.
    Devuelve un stream de eventos SSE para mostrar progreso en tiempo real.
    """
    async def event_stream():
        # Fase 1: El entrevistador responde o pide más info
        response_text, specs = await interviewer.chat(request.messages)

        yield f"data: {json.dumps({'type': 'message', 'content': response_text})}\n\n"

        if specs is None:
            # Aún necesita más información del usuario
            yield f"data: {json.dumps({'type': 'done', 'productos': []})}\n\n"
            return

        # Fase 2: Búsqueda en paralelo en todas las tiendas
        yield f"data: {json.dumps({'type': 'status', 'content': 'Buscando en tiendas...'})}\n\n"

        adapters = get_active_adapters()
        search_query = f"{specs['categoria']} {specs.get('specs', {})}"

        search_results = await api_router.search(search_query)
        all_products = []

        fetch_tasks = []
        for adapter in adapters:
            fetch_tasks.append(_fetch_from_store(adapter, search_results))

        results = await asyncio.gather(*fetch_tasks, return_exceptions=True)
        for result in results:
            if isinstance(result, list):
                all_products.extend(result)

        yield f"data: {json.dumps({'type': 'status', 'content': f'Encontré {len(all_products)} productos. Analizando...'})}\n\n"

        # Fase 3: Análisis
        scored_products = await analyst.analyze(all_products[:15], specs)

        yield f"data: {json.dumps({'type': 'done', 'productos': [p.model_dump() for p in scored_products]})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


async def _fetch_from_store(adapter, search_results: list[dict]):
    """Extrae productos de una tienda filtrando los resultados de búsqueda."""
    store_results = [r for r in search_results if adapter.base_url.replace("https://www.", "") in r["url"]]
    if not store_results:
        return []
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                store_results[0]["url"],
                headers=adapter.get_headers(),
                timeout=15,
                follow_redirects=True,
            )
        return adapter.parse(response.text, store_results[0]["url"])
    except Exception as e:
        print(f"[{adapter.name}] Error: {e}")
        return []

@app.get("/health")
def health():
    return {"status": "ok"}
```

### Criterio de éxito

- `GET /health` devuelve `{"status": "ok"}`
- `POST /chat` con un mensaje "quiero una freidora de aire" inicia el stream y devuelve la primera pregunta del agente
- Al completar la entrevista, el stream devuelve productos con scores

---

## Paso 8 — Frontend React

**Objetivo:** Implementar la interfaz de chat y el panel de resultados con tarjetas de productos.

### Tareas

1. Implementar `frontend/src/components/Chat.jsx` — la interfaz de conversación con streaming:

```jsx
import { useState, useRef, useEffect } from "react"

export default function Chat({ onProductsReady }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hola, soy tu asistente de compras. ¿Qué producto estás buscando?" }
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState("")
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const send = async () => {
    if (!input.trim() || loading) return
    const newMessages = [...messages, { role: "user", content: input }]
    setMessages(newMessages)
    setInput("")
    setLoading(true)

    const response = await fetch("http://localhost:8000/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: newMessages }),
    })

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const lines = decoder.decode(value).split("\n")
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue
        const event = JSON.parse(line.replace("data: ", ""))

        if (event.type === "message") {
          setMessages(prev => [...prev, { role: "assistant", content: event.content }])
        } else if (event.type === "status") {
          setStatus(event.content)
        } else if (event.type === "done") {
          setStatus("")
          setLoading(false)
          if (event.productos.length > 0) onProductsReady(event.productos)
        }
      }
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", background: m.role === "user" ? "#3B82F6" : "#F3F4F6", color: m.role === "user" ? "white" : "black", padding: "0.75rem 1rem", borderRadius: "12px", maxWidth: "75%" }}>
            {m.content}
          </div>
        ))}
        {status && <div style={{ color: "#6B7280", fontSize: "0.875rem" }}>{status}</div>}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: "flex", gap: "0.5rem", padding: "1rem", borderTop: "1px solid #E5E7EB" }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Escribe aquí..."
          disabled={loading}
          style={{ flex: 1, padding: "0.75rem", borderRadius: "8px", border: "1px solid #D1D5DB" }}
        />
        <button onClick={send} disabled={loading} style={{ padding: "0.75rem 1.5rem", background: "#3B82F6", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}>
          {loading ? "..." : "Enviar"}
        </button>
      </div>
    </div>
  )
}
```

2. Implementar `frontend/src/components/ProductCard.jsx`:

```jsx
const VEREDICTO_COLORS = {
  "Mejor calidad-precio": { bg: "#D1FAE5", text: "#065F46" },
  "Opción premium":       { bg: "#DBEAFE", text: "#1E40AF" },
  "Económica segura":     { bg: "#FEF3C7", text: "#92400E" },
  "Evitar":               { bg: "#FEE2E2", text: "#991B1B" },
}

export default function ProductCard({ product }) {
  const colors = VEREDICTO_COLORS[product.veredicto] || { bg: "#F3F4F6", text: "#374151" }

  return (
    <div style={{ border: "1px solid #E5E7EB", borderRadius: "12px", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <span style={{ background: colors.bg, color: colors.text, padding: "0.25rem 0.75rem", borderRadius: "99px", fontSize: "0.8rem", fontWeight: 600, alignSelf: "flex-start" }}>
        {product.veredicto}
      </span>
      <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{product.titulo}</div>
      <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#111827" }}>S/ {product.precio.toFixed(2)}</div>
      <div style={{ fontSize: "0.85rem", color: "#4B5563" }}>{product.tienda}</div>
      <div style={{ fontSize: "0.875rem", color: "#374151" }}>{product.explicacion}</div>
      {product.trampa && (
        <div style={{ background: "#FEF3C7", padding: "0.5rem 0.75rem", borderRadius: "8px", fontSize: "0.8rem", color: "#92400E" }}>
          Ojo: {product.trampa}
        </div>
      )}
      <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.875rem" }}>
        <span style={{ fontWeight: 600 }}>Score:</span>
        <span>{product.score_total}/10</span>
      </div>
      <a href={product.url} target="_blank" rel="noreferrer" style={{ marginTop: "0.5rem", background: "#3B82F6", color: "white", padding: "0.5rem 1rem", borderRadius: "8px", textAlign: "center", textDecoration: "none", fontSize: "0.875rem" }}>
        Ver en {product.tienda}
      </a>
    </div>
  )
}
```

3. Implementar `frontend/src/pages/Home.jsx`:

```jsx
import { useState } from "react"
import Chat from "../components/Chat"
import ProductCard from "../components/ProductCard"

export default function Home() {
  const [productos, setProductos] = useState([])

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "sans-serif" }}>
      <div style={{ width: "420px", borderRight: "1px solid #E5E7EB", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "1rem", borderBottom: "1px solid #E5E7EB", fontWeight: 700, fontSize: "1.1rem" }}>
          Asistente de compras
        </div>
        <Chat onProductsReady={setProductos} />
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
        {productos.length === 0 ? (
          <div style={{ color: "#9CA3AF", textAlign: "center", marginTop: "4rem" }}>
            Los resultados aparecerán aquí
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
            {productos.map((p, i) => <ProductCard key={i} product={p} />)}
          </div>
        )}
      </div>
    </div>
  )
}
```

### Criterio de éxito

- El chat muestra mensajes del usuario y del agente en burbujas diferenciadas
- Los estados intermedios ("Buscando en tiendas...", "Analizando...") aparecen en tiempo real mientras el backend trabaja
- Las tarjetas de producto muestran el veredicto con color, el score, el campo "Ojo:" cuando hay trampa, y el link directo a la tienda

---

## Paso 9 — Integración y pruebas end-to-end

**Objetivo:** Verificar que el sistema completo funciona de punta a punta con datos reales antes de dar el proyecto por terminado.

### Casos de prueba obligatorios

1. **Flujo completo con usuario no técnico:**
   - Input: "quiero una freidora de aire"
   - El agente debe hacer entre 2 y 3 preguntas cotidianas
   - Después de responder, debe iniciar la búsqueda automáticamente
   - El resultado debe incluir al menos 3 productos de tiendas distintas

2. **Flujo completo con usuario técnico:**
   - Input: "busco una air fryer de 5.5 litros, menos de 300 soles, que sea de acero"
   - El agente debe reconocer que ya tiene suficiente información y buscar directamente
   - Los productos deben estar filtrados acorde a las specs dadas

3. **Fallback de APIs:**
   - Poner `monthly_limit: 0` en Tavily y SerpAPI en `config.py`
   - La búsqueda debe completarse igual usando DuckDuckGo
   - El `usage.json` debe reflejar que se usó DuckDuckGo

4. **Tienda nueva en 10 minutos:**
   - Crear `backend/app/stores/linio.py` con la plantilla base
   - Agregar `"linio"` a `ACTIVE_STORES` en `config.py`
   - La tienda debe aparecer en los resultados sin tocar ningún otro archivo

5. **Resiliencia ante tienda caída:**
   - Apagar el wifi brevemente durante una búsqueda
   - El sistema debe devolver los productos de las tiendas que sí respondieron
   - No debe lanzar un error 500 al frontend

### Lista de verificación final

- [ ] El backend arranca sin warnings con `uvicorn app.main:app`
- [ ] El frontend carga sin errores en consola con `npm run dev`
- [ ] El archivo `.env` no está en el repositorio de git
- [ ] `usage.json` no está en el repositorio de git
- [ ] Agregar una tienda nueva no requiere modificar archivos fuera de `stores/` y `config.py`
- [ ] Agregar una API de búsqueda no requiere modificar archivos fuera de `routers/api_router.py` y `config.py`
- [ ] Cambiar de proveedor de IA solo requiere editar `.env`
- [ ] Los precios mostrados están en soles (PEN)
- [ ] Los links de cada producto abren la página correcta de la tienda

---

## Notas para el agente desarrollador

- Implementar los pasos en orden estricto. El paso 4 depende del 2, el 5 depende del 2, el 7 depende de todos los anteriores.
- Los selectores CSS de cada tienda (paso 4) son los que más probablemente necesiten ajuste manual. Inspeccionar el HTML real de cada tienda antes de escribirlos.
- El método `_call_ai` es idéntico en `interviewer.py` y `analyst.py`. Cuando ambos estén funcionando, refactorizarlo a un módulo compartido `app/agents/base.py` para no repetir código.
- MercadoLibre es la tienda más confiable por tener API oficial. Usarla como referencia para validar que el formato `Product` está bien definido antes de implementar los scrapers.
- Si una tienda bloquea el scraping, agregar un delay aleatorio entre requests (`asyncio.sleep(random.uniform(1, 3))`) o rotar el User-Agent.