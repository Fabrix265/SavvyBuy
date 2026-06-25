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

## Flujo de experiencia objetivo

Antes de implementar, tener claro qué ve el usuario en cada momento:

```
1. Usuario escribe: "quiero una freidora de aire"
2. Agente hace 2–3 preguntas cotidianas (¿para cuántas personas? ¿presupuesto?)
3. Progreso visible: "Buscando en Falabella, Ripley, Oechsle..."
4. Panel de resultados: 3 tarjetas con veredicto, score, trampa visible, métodos de pago
5. Usuario hace clic en "Ver más detalle" de un producto
6. Vista detallada: specs, opiniones reales, disponibilidad en tienda física, botón directo a compra
7. Botón lleva directo a la página del producto en la tienda (no a la búsqueda general)
```

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
│   │   │   ├── base.py             # Cliente de IA compartido entre agentes
│   │   │   ├── interviewer.py      # Agente de entrevista
│   │   │   └── analyst.py          # Agente de análisis y scoring
│   │   ├── stores/
│   │   │   ├── __init__.py
│   │   │   ├── base.py             # Clase base para todos los adaptadores
│   │   │   ├── mercadolibre.py     # API oficial
│   │   │   ├── falabella.py
│   │   │   ├── ripley.py
│   │   │   ├── oechsle.py
│   │   │   ├── sodimac.py
│   │   │   ├── metro.py
│   │   │   ├── tiendamia.py
│   │   │   └── radioshack.py
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   └── api_router.py       # Fallback entre APIs de búsqueda
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── product.py          # Product, ScoredProduct, ProductDetail
│   │   │   └── search.py           # ChatMessage, SearchRequest, SearchResponse
│   │   ├── __init__.py
│   │   ├── config.py               # Keys, tiendas activas, APIs activas
│   │   └── main.py                 # FastAPI app
│   ├── tests/
│   │   └── __init__.py
│   ├── .env
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Chat.jsx            # Interfaz de conversación con streaming
│   │   │   ├── ProductCard.jsx     # Tarjeta resumen en el panel de resultados
│   │   │   ├── ProductDetail.jsx   # Vista detallada al hacer clic en un producto
│   │   │   └── ResultsPanel.jsx    # Panel lateral con grid de tarjetas
│   │   ├── pages/
│   │   │   └── Home.jsx            # Layout principal: chat + panel de resultados
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

- `cd backend && uvicorn app.main:app` arranca sin errores (aunque `main.py` esté vacío con solo `from fastapi import FastAPI; app = FastAPI()`)
- `cd frontend && npm run dev` abre la app en el navegador
- No hay ningún secreto real en ningún archivo commiteado

---

## Paso 2 — Configuración y modelos de datos

**Objetivo:** Definir los schemas de datos y la configuración central. Todo el sistema depende de estos archivos — implementarlos bien evita refactors posteriores.

### Tareas

1. Implementar `backend/app/models/product.py`:

```python
from pydantic import BaseModel
from typing import Optional

class Opinion(BaseModel):
    texto: str
    estrellas: Optional[int] = None
    fuente: Optional[str] = None      # "Falabella", "MercadoLibre", etc.
    fecha: Optional[str] = None

class MetodoPago(BaseModel):
    nombre: str                        # "Yape", "Plin", "Visa", etc.
    detalle: Optional[str] = None      # "6 cuotas sin interés", "contra entrega"

class TiendaFisica(BaseModel):
    nombre: str                        # "Falabella San Isidro"
    disponible: bool
    direccion: Optional[str] = None

class Product(BaseModel):
    tienda: str
    titulo: str
    precio: float
    moneda: str = "PEN"
    url: str                           # URL directa al producto, no a la búsqueda
    rating: Optional[float] = None
    num_opiniones: Optional[int] = None
    descripcion: Optional[str] = None
    imagen_url: Optional[str] = None
    specs: dict = {}                   # Specs crudas extraídas: {"capacidad": "4L", "potencia": "1500W"}
    metodos_pago: list[MetodoPago] = []
    tiendas_fisicas: list[TiendaFisica] = []
    opiniones_muestra: list[Opinion] = []   # Máximo 3 opiniones representativas

class ScoredProduct(Product):
    score_total: float                 # 1.0 a 10.0
    veredicto: str                     # "Mejor calidad-precio" | "Opción premium" | "Económica segura" | "Evitar"
    explicacion: str                   # 2–3 oraciones en lenguaje simple
    trampa: Optional[str] = None       # Lo que el vendedor oculta en el título
    pros: list[str] = []
    contras: list[str] = []            # Incluye las quejas más repetidas de compradores reales
```

2. Implementar `backend/app/models/search.py`:

```python
from pydantic import BaseModel
from typing import Optional

class ChatMessage(BaseModel):
    role: str       # "user" | "assistant"
    content: str

class SearchRequest(BaseModel):
    messages: list[ChatMessage]
    categoria: Optional[str] = None

class DetailRequest(BaseModel):
    producto_url: str
    tienda: str

class SearchResponse(BaseModel):
    message: str
    productos: list = []
    busqueda_lista: bool = False
```

3. Implementar `backend/app/config.py`:

```python
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    ai_provider: str = "openai"
    ai_model: str = "gpt-4o-mini"
    ai_api_key: str = ""
    tavily_api_key: Optional[str] = None
    serpapi_api_key: Optional[str] = None

    class Config:
        env_file = ".env"

settings = Settings()

# Orden de prioridad del fallback — agregar nuevas APIs aquí
SEARCH_APIS = [
    {"name": "tavily",     "env_key": "tavily_api_key",  "monthly_limit": 1000},
    {"name": "serpapi",    "env_key": "serpapi_api_key",  "monthly_limit": 100},
    {"name": "duckduckgo", "env_key": None,               "monthly_limit": None},
]

# Tiendas activas — comentar las que no se quieran usar
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
- Crear un `ScoredProduct` con todos los campos incluyendo `metodos_pago` y `tiendas_fisicas` y llamar `.model_dump()` devuelve el dict correcto
- `from app.config import settings, SEARCH_APIS, ACTIVE_STORES` no lanza errores

---

## Paso 3 — API Router con fallback

**Objetivo:** Implementar el sistema que gestiona las APIs de búsqueda, rota automáticamente cuando una falla o agota su cupo mensual y persiste el uso en disco.

### Tareas

1. Implementar `backend/app/routers/api_router.py`:

```python
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
        Intenta cada API en orden de prioridad.
        Cada resultado devuelto tiene: title, url, snippet.
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
```

### Criterio de éxito

- `await api_router.search("freidora de aire")` devuelve al menos 5 resultados con `title`, `url` y `snippet`
- Si se pone `monthly_limit: 0` en Tavily y SerpAPI, la búsqueda igual funciona con DuckDuckGo
- Después de cada búsqueda, `usage.json` se actualiza correctamente

---

## Paso 4 — Adaptadores de tiendas

**Objetivo:** Implementar la clase base y todos los adaptadores. Cada adaptador extrae el precio, specs, métodos de pago, disponibilidad física y opiniones de su tienda, y los devuelve en el formato `Product` normalizado.

### Tareas

1. Implementar `backend/app/stores/base.py`:

```python
from abc import ABC, abstractmethod
from app.models.product import Product

class BaseStoreAdapter(ABC):
    name: str = ""
    base_url: str = ""

    @abstractmethod
    def build_search_url(self, query: str) -> str:
        """URL de búsqueda de esta tienda para un query dado."""
        pass

    @abstractmethod
    def parse(self, html: str, source_url: str) -> list[Product]:
        """
        Extrae productos del HTML de resultados.
        Debe intentar extraer: título, precio, URL directa al producto,
        specs visibles, métodos de pago y disponibilidad en tienda física.
        Si no encuentra productos, retorna lista vacía sin lanzar excepción.
        """
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
```

2. Implementar `backend/app/stores/mercadolibre.py` — usa API oficial, no scraping:

```python
import httpx
from .base import BaseStoreAdapter
from app.models.product import Product, MetodoPago

class MercadoLibreAdapter(BaseStoreAdapter):
    name = "MercadoLibre"
    base_url = "https://api.mercadolibre.com"

    def build_search_url(self, query: str) -> str:
        return f"{self.base_url}/sites/MPE/search?q={query}&limit=10"

    def parse(self, html: str, source_url: str) -> list[Product]:
        return []  # MercadoLibre usa fetch() directo con JSON

    async def fetch(self, query: str) -> list[Product]:
        url = self.build_search_url(query)
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10)
            data = response.json()

        products = []
        for item in data.get("results", []):
            # Extraer métodos de pago desde installments si existen
            metodos = []
            if item.get("installments"):
                inst = item["installments"]
                metodos.append(MetodoPago(
                    nombre="Tarjeta",
                    detalle=f"{inst['quantity']} cuotas de S/ {inst['amount']:.0f}"
                ))

            products.append(Product(
                tienda=self.name,
                titulo=item["title"],
                precio=float(item["price"]),
                moneda=item.get("currency_id", "PEN"),
                url=item["permalink"],              # URL directa al producto
                rating=item.get("reviews", {}).get("rating_average"),
                num_opiniones=item.get("reviews", {}).get("total"),
                imagen_url=item.get("thumbnail"),
                metodos_pago=metodos,
            ))
        return products
```

3. Implementar las tiendas con scraping siguiendo esta plantilla. El campo `url` en el `Product` debe ser la URL directa al producto, no a la página de resultados:

```python
# Plantilla para tiendas con scraping
import httpx
from bs4 import BeautifulSoup
from .base import BaseStoreAdapter
from app.models.product import Product, MetodoPago, TiendaFisica

class FalabellaAdapter(BaseStoreAdapter):
    name = "Falabella"
    base_url = "https://www.saga.falabella.com.pe"

    def build_search_url(self, query: str) -> str:
        return f"{self.base_url}/s/{query.replace(' ', '+')}"

    def parse(self, html: str, source_url: str) -> list[Product]:
        soup = BeautifulSoup(html, "html.parser")
        products = []

        # IMPORTANTE: inspeccionar el HTML real de Falabella antes de definir estos selectores
        for card in soup.select(".pod-subpod")[:10]:
            try:
                titulo_el = card.select_one(".pod-subpod-title")
                precio_el = card.select_one(".copy10.primary.medium")
                link_el = card.select_one("a")
                if not all([titulo_el, precio_el, link_el]):
                    continue

                precio_texto = precio_el.text.strip().replace("S/", "").replace(",", "").strip()
                product_url = link_el["href"]
                if product_url.startswith("/"):
                    product_url = self.base_url + product_url

                # Falabella incluye métodos de pago en la página de resultados
                metodos = []
                if card.select_one(".yape-icon"):
                    metodos.append(MetodoPago(nombre="Yape"))
                if card.select_one(".cuotas"):
                    cuotas_text = card.select_one(".cuotas").text.strip()
                    metodos.append(MetodoPago(nombre="Tarjeta", detalle=cuotas_text))

                products.append(Product(
                    tienda=self.name,
                    titulo=titulo_el.text.strip(),
                    precio=float(precio_texto),
                    url=product_url,               # URL directa al producto
                    metodos_pago=metodos,
                ))
            except (ValueError, TypeError, KeyError):
                continue
        return products

# Replicar para: ripley.py, oechsle.py, sodimac.py, metro.py, tiendamia.py, radioshack.py
# Cambiar: name, base_url, build_search_url() y selectores en parse()
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
    "falabella":    FalabellaAdapter,
    "ripley":       RipleyAdapter,
    "oechsle":      OechsleAdapter,
    "sodimac":      SodimacAdapter,
    "metro":        MetroAdapter,
    "tiendamia":    TiendaMiaAdapter,
    "radioshack":   RadioShackAdapter,
}

def get_active_adapters() -> list:
    return [ADAPTER_MAP[name]() for name in ACTIVE_STORES if name in ADAPTER_MAP]
```

### Criterio de éxito

- `await MercadoLibreAdapter().fetch("freidora de aire")` devuelve productos con `url` que abre directamente el producto (no la búsqueda)
- Cada adaptador de scraping devuelve al menos 1 producto con título, precio numérico válido y URL directa
- El campo `metodos_pago` tiene datos cuando la tienda los muestra en sus resultados
- Ningún adaptador lanza excepción si la tienda cambia su HTML — devuelve lista vacía

---

## Paso 5 — Agente de entrevista

**Objetivo:** El agente que conversa con el usuario, detecta su nivel de conocimiento y extrae sus necesidades reales sin pedirle especificaciones técnicas.

### Tareas

1. Implementar `backend/app/agents/base.py` — cliente de IA compartido:

```python
import httpx
from app.config import settings

class BaseAIAgent:

    def __init__(self):
        self.client = httpx.AsyncClient()

    async def _call_ai(self, system_prompt: str, messages: list[dict]) -> str:
        """Llama al proveedor de IA configurado. Soporta OpenAI, Anthropic y Gemini."""

        if settings.ai_provider == "openai":
            response = await self.client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.ai_api_key}"},
                json={
                    "model": settings.ai_model,
                    "messages": [{"role": "system", "content": system_prompt}] + messages
                },
                timeout=30,
            )
            return response.json()["choices"][0]["message"]["content"]

        elif settings.ai_provider == "anthropic":
            response = await self.client.post(
                "https://api.anthropic.com/v1/messages",
                headers={"x-api-key": settings.ai_api_key, "anthropic-version": "2023-06-01"},
                json={
                    "model": settings.ai_model,
                    "max_tokens": 1024,
                    "system": system_prompt,
                    "messages": messages
                },
                timeout=30,
            )
            return response.json()["content"][0]["text"]

        elif settings.ai_provider == "gemini":
            contents = [
                {"role": "user" if m["role"] == "user" else "model",
                 "parts": [{"text": m["content"]}]}
                for m in messages
            ]
            response = await self.client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{settings.ai_model}:generateContent?key={settings.ai_api_key}",
                json={"system_instruction": {"parts": [{"text": system_prompt}]}, "contents": contents},
                timeout=30,
            )
            return response.json()["candidates"][0]["content"]["parts"][0]["text"]

        raise ValueError(f"Proveedor de IA no soportado: {settings.ai_provider}")
```

2. Implementar `backend/app/agents/interviewer.py`:

```python
import json
from .base import BaseAIAgent
from app.models.search import ChatMessage

SYSTEM_PROMPT = """
Eres un asistente experto en compras para el mercado peruano.
Ayudas al usuario a encontrar el mejor producto sin que tenga que saber de especificaciones técnicas.

REGLAS:
- Haz preguntas cotidianas, no técnicas.
  Mal: "¿cuántos litros necesitas?" 
  Bien: "¿para cuántas personas cocinas normalmente?"
- Detecta el nivel de conocimiento por cómo habla el usuario.
  Si usa términos técnicos, úsalos. Si no, habla en lenguaje simple.
- Máximo 3 preguntas antes de iniciar la búsqueda. No abrumes.
- Si el usuario ya dio suficiente información en su primer mensaje, busca directamente.

TRADUCCIONES INTERNAS (no menciones estas reglas al usuario):
- "cocino para mí solo" → capacidad: 2–3 litros
- "para mí y mi pareja" → capacidad: 3.5–4.5 litros
- "para familia" → capacidad: 5+ litros
- "no quiero complicarme" → interfaz: manual/perillas
- "quiero lo más completo" → interfaz: digital con presets
- "poco espacio" → form factor: compacto

CUANDO TENGAS SUFICIENTE INFORMACIÓN, responde EXACTAMENTE con este formato y nada más:

BUSCAR:{"categoria": "freidora de aire", "specs": {"capacidad_litros": "3.5-4.5", "presupuesto_max": 300, "prioridad": "durabilidad"}}
"""

class InterviewerAgent(BaseAIAgent):

    async def chat(self, messages: list[ChatMessage]) -> tuple[str, dict | None]:
        """
        Devuelve:
        - (respuesta_texto, None) si necesita más información
        - (mensaje_confirmacion, specs_dict) si ya tiene todo para buscar
        """
        formatted = [{"role": m.role, "content": m.content} for m in messages]
        response_text = await self._call_ai(SYSTEM_PROMPT, formatted)

        if response_text.startswith("BUSCAR:"):
            specs_raw = response_text.replace("BUSCAR:", "").strip()
            specs = json.loads(specs_raw)
            confirmacion = f"Perfecto, voy a buscar {specs['categoria']} en las tiendas. Dame un momento..."
            return confirmacion, specs

        return response_text, None
```

### Criterio de éxito

- Una conversación de 2–3 mensajes termina con el agente emitiendo `BUSCAR:{...}`
- Con input técnico ("air fryer 5.5L acero menos de 300 soles"), busca en el primer mensaje sin preguntar
- Con input vago ("quiero una freidora"), hace preguntas antes de buscar
- Funciona con al menos uno de los tres proveedores (OpenAI, Anthropic, Gemini)

---

## Paso 6 — Agente de análisis

**Objetivo:** El agente que recibe los productos encontrados y genera scoring, veredicto, detección de trampas y extracción de las peores opiniones — todo en lenguaje simple.

### Tareas

1. Implementar `backend/app/agents/analyst.py`:

```python
import json
import re
from .base import BaseAIAgent
from app.models.product import Product, ScoredProduct, Opinion

SCORING_PROMPT = """
Eres un experto en análisis de productos de consumo para el mercado peruano.
Recibirás productos y debes analizarlos con criterio honesto, no solo positivo.

CRITERIOS DE EVALUACIÓN:

Calidad de materiales (30%):
- Acero inoxidable, vidrio, materiales certificados → alta puntuación
- Plástico con certificación alimentaria → puntuación media
- Plástico genérico sin certificación → baja puntuación
- "olor al calentar", "se derrite" en opiniones → penalización severa

Durabilidad (25%):
- Garantía fabricante 1+ años → suma puntos
- 50+ opiniones positivas → suma puntos
- Quejas de rotura antes de 6 meses → resta puntos proporcional

Relación precio-valor (30%):
- ¿Las características extra del más caro justifican la diferencia?
- Funciones que el usuario típico no usará (Wi-Fi en freidora) → no suman valor
- Mismas specs a menor precio → mejor puntuación

Reputación y soporte (15%):
- Marca con servicio técnico en Perú → suma puntos
- Marca sin presencia local → penalización

PARA EL CAMPO "trampa":
Busca activamente lo que el vendedor oculta: material real vs material del título,
garantía de distribuidor vs fabricante, "incluye" que son accesorios vendidos aparte,
potencia real vs potencia de marketing.

PARA "contras":
Incluye las quejas más repetidas de compradores reales, no solo limitaciones técnicas.
Ejemplo: "El cable es corto (1.2m), varios compradores necesitaron extensión"

RESPONDE ÚNICAMENTE con JSON válido, sin texto antes ni después:

{
  "productos": [
    {
      "url": "url original del producto",
      "score_total": 7.4,
      "veredicto": "Mejor calidad-precio",
      "explicacion": "2-3 oraciones simples explicando el puntaje",
      "trampa": "Lo que el vendedor no dice en el título, o null si no hay trampa",
      "pros": ["Pro concreto 1", "Pro concreto 2"],
      "contras": ["Contra real 1 (basada en opiniones)", "Contra real 2"]
    }
  ],
  "resumen": "Una oración resumiendo la comparación"
}

Veredictos posibles exactamente: "Mejor calidad-precio", "Opción premium", "Económica segura", "Evitar"
"""

class AnalystAgent(BaseAIAgent):

    async def analyze(self, products: list[Product], specs: dict) -> list[ScoredProduct]:
        products_data = [p.model_dump() for p in products]
        user_message = f"""
Necesidades del usuario: {json.dumps(specs, ensure_ascii=False)}

Productos encontrados:
{json.dumps(products_data, ensure_ascii=False, indent=2)}
"""
        raw_response = await self._call_ai(SCORING_PROMPT, [{"role": "user", "content": user_message}])

        # Limpiar respuesta si la IA agregó texto antes o después del JSON
        try:
            data = json.loads(raw_response)
        except json.JSONDecodeError:
            match = re.search(r'\{.*\}', raw_response, re.DOTALL)
            if not match:
                raise ValueError("La IA no devolvió JSON válido")
            data = json.loads(match.group())

        scores_by_url = {p["url"]: p for p in data["productos"]}
        scored = []
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
```

### Criterio de éxito

- Con 5 productos de prueba, devuelve 5 `ScoredProduct` con scores entre 1 y 10 ordenados de mayor a menor
- `trampa` detecta cuando un producto dice "acero" en el título pero "plástico" en la descripción
- `contras` incluye quejas reales de compradores cuando están en las opiniones proporcionadas
- El campo `veredicto` usa exactamente uno de los 4 valores permitidos

---

## Paso 7 — Backend FastAPI

**Objetivo:** Conectar todos los módulos en una API con dos endpoints: `/chat` para el flujo conversacional y `/producto/detalle` para la vista detallada de un producto.

### Tareas

1. Implementar `backend/app/main.py`:

```python
import asyncio
import httpx
import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app.models.search import SearchRequest, DetailRequest
from app.models.product import ScoredProduct
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
    Endpoint principal con streaming SSE.
    Maneja la entrevista y, cuando hay suficiente info, lanza la búsqueda.
    """
    async def event_stream():
        # Fase 1: respuesta del agente entrevistador
        response_text, specs = await interviewer.chat(request.messages)
        yield f"data: {json.dumps({'type': 'message', 'content': response_text})}\n\n"

        if specs is None:
            yield f"data: {json.dumps({'type': 'done', 'productos': []})}\n\n"
            return

        # Fase 2: búsqueda en paralelo
        adapters = get_active_adapters()
        for adapter in adapters:
            yield f"data: {json.dumps({'type': 'status', 'content': f'Buscando en {adapter.name}...'})}\n\n"

        search_query = f"{specs['categoria']} site:peru OR .pe"
        search_results = await api_router.search(search_query)

        fetch_tasks = [_fetch_from_store(adapter, search_results) for adapter in adapters]
        results = await asyncio.gather(*fetch_tasks, return_exceptions=True)

        all_products = []
        for result in results:
            if isinstance(result, list):
                all_products.extend(result)

        yield f"data: {json.dumps({'type': 'status', 'content': f'Encontré {len(all_products)} productos. Analizando...'})}\n\n"

        # Fase 3: análisis y scoring
        scored = await analyst.analyze(all_products[:15], specs)
        yield f"data: {json.dumps({'type': 'done', 'productos': [p.model_dump() for p in scored]})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.post("/producto/detalle")
async def producto_detalle(request: DetailRequest):
    """
    Endpoint para la vista detallada de un producto.
    Recibe la URL directa del producto y devuelve specs completas,
    opiniones, métodos de pago y disponibilidad en tienda física.
    """
    adapters = get_active_adapters()
    adapter = next((a for a in adapters if a.name.lower() == request.tienda.lower()), None)

    if not adapter:
        return {"error": "Tienda no soportada"}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                request.producto_url,
                headers=adapter.get_headers(),
                timeout=15,
                follow_redirects=True,
            )
        # Parsear la página de detalle del producto
        # Nota: cada adaptador puede tener un método parse_detail() además de parse()
        # Si no está implementado, devolver los datos básicos disponibles
        products = adapter.parse(response.text, request.producto_url)
        if products:
            return products[0].model_dump()
        return {"error": "No se pudo extraer el detalle del producto"}
    except Exception as e:
        return {"error": str(e)}


async def _fetch_from_store(adapter, search_results: list[dict]):
    """Filtra resultados de búsqueda por tienda y extrae los productos."""
    domain = adapter.base_url.replace("https://www.", "").replace("https://", "")
    store_results = [r for r in search_results if domain in r["url"]]

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
- `POST /chat` con "quiero una freidora de aire" inicia el stream y devuelve la primera pregunta
- Al completar la entrevista, el stream muestra el progreso por tienda y luego los productos con scores
- `POST /producto/detalle` con la URL de un producto de Falabella devuelve sus datos

---

## Paso 8 — Frontend React

**Objetivo:** Interfaz de chat con streaming + panel de resultados con tarjetas + vista detallada al hacer clic en un producto.

### Tareas

1. Implementar `frontend/src/components/Chat.jsx`:

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
  }, [messages, status])

  const send = async () => {
    if (!input.trim() || loading) return
    const newMessages = [...messages, { role: "user", content: input }]
    setMessages(newMessages)
    setInput("")
    setLoading(true)
    setStatus("")

    const response = await fetch("http://localhost:8000/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: newMessages }),
    })

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop()

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue
        try {
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
        } catch {}
      }
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === "user" ? "flex-end" : "flex-start",
            background: m.role === "user" ? "#534AB7" : "#F3F4F6",
            color: m.role === "user" ? "white" : "#111827",
            padding: "0.75rem 1rem", borderRadius: "12px", maxWidth: "78%",
            fontSize: "14px", lineHeight: "1.6"
          }}>
            {m.content}
          </div>
        ))}
        {status && (
          <div style={{ fontSize: "12px", color: "#6B7280", display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#9CA3AF", display: "inline-block" }} />
            {status}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: "flex", gap: "0.5rem", padding: "1rem", borderTop: "1px solid #E5E7EB" }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Escribe aquí..."
          disabled={loading}
          style={{ flex: 1, padding: "0.75rem", borderRadius: "8px", border: "1px solid #D1D5DB", fontSize: "14px" }}
        />
        <button
          onClick={send}
          disabled={loading}
          style={{ padding: "0.75rem 1.25rem", background: "#534AB7", color: "white", border: "none", borderRadius: "8px", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "..." : "Enviar"}
        </button>
      </div>
    </div>
  )
}
```

2. Implementar `frontend/src/components/ProductCard.jsx` — tarjeta resumen en el panel:

```jsx
const VEREDICTO = {
  "Mejor calidad-precio": { bg: "#E1F5EE", color: "#085041", border: "#1D9E75" },
  "Opción premium":       { bg: "#E6F1FB", color: "#0C447C", border: "transparent" },
  "Económica segura":     { bg: "#FAEEDA", color: "#633806", border: "transparent" },
  "Evitar":               { bg: "#FAECE7", color: "#712B13", border: "transparent" },
}

export default function ProductCard({ product, onVerDetalle }) {
  const v = VEREDICTO[product.veredicto] || { bg: "#F3F4F6", color: "#374151", border: "transparent" }
  const isBest = product.veredicto === "Mejor calidad-precio"

  return (
    <div style={{
      border: `${isBest ? "1.5px" : "0.5px"} solid ${isBest ? v.border : "#E5E7EB"}`,
      borderRadius: "12px", padding: "1rem",
      display: "flex", flexDirection: "column", gap: "8px",
      background: "white"
    }}>
      <span style={{ background: v.bg, color: v.color, padding: "3px 10px", borderRadius: "99px", fontSize: "11px", fontWeight: 500, alignSelf: "flex-start" }}>
        {product.veredicto}
      </span>

      <div style={{ fontSize: "13px", fontWeight: 500, color: "#111827", lineHeight: 1.4 }}>{product.titulo}</div>
      <div style={{ fontSize: "11px", color: "#6B7280" }}>{product.tienda}</div>
      <div style={{ fontSize: "20px", fontWeight: 500, color: "#111827" }}>S/ {product.precio.toFixed(2)}</div>
      <div style={{ fontSize: "11px", color: "#6B7280" }}>Score {product.score_total}/10</div>
      <div style={{ fontSize: "12px", color: "#374151", lineHeight: 1.5 }}>{product.explicacion}</div>

      {product.trampa && (
        <div style={{ background: "#FAEEDA", borderLeft: "2px solid #EF9F27", padding: "6px 8px", fontSize: "11px", color: "#633806" }}>
          Ojo: {product.trampa}
        </div>
      )}

      {product.metodos_pago?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
          {product.metodos_pago.map((m, i) => (
            <span key={i} style={{ fontSize: "10px", padding: "2px 6px", background: "#F3F4F6", color: "#374151", borderRadius: "4px", border: "0.5px solid #E5E7EB" }}>
              {m.nombre}{m.detalle ? ` · ${m.detalle}` : ""}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
        <button
          onClick={() => onVerDetalle(product)}
          style={{ flex: 1, padding: "7px", background: "transparent", color: "#534AB7", border: "1px solid #534AB7", borderRadius: "8px", cursor: "pointer", fontSize: "12px" }}
        >
          Ver detalle
        </button>
        <a
          href={product.url}
          target="_blank"
          rel="noreferrer"
          style={{ flex: 1, padding: "7px", background: "#534AB7", color: "white", borderRadius: "8px", textAlign: "center", textDecoration: "none", fontSize: "12px" }}
        >
          Ir a comprar
        </a>
      </div>
    </div>
  )
}
```

3. Implementar `frontend/src/components/ProductDetail.jsx` — vista detallada al hacer clic en "Ver detalle":

```jsx
export default function ProductDetail({ product, onClose }) {
  if (!product) return null

  const scoreWidth = `${(product.score_total / 10) * 100}%`

  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "white", overflowY: "auto", zIndex: 10, padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

      <button onClick={onClose} style={{ alignSelf: "flex-start", background: "none", border: "none", cursor: "pointer", color: "#6B7280", fontSize: "13px", padding: 0 }}>
        ← Volver a resultados
      </button>

      {/* Header */}
      <div>
        <div style={{ fontSize: "15px", fontWeight: 500, color: "#111827", lineHeight: 1.4 }}>{product.titulo}</div>
        <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "4px" }}>{product.tienda}</div>
        <div style={{ fontSize: "24px", fontWeight: 500, marginTop: "6px" }}>S/ {product.precio.toFixed(2)}</div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
          <span style={{ fontSize: "12px", color: "#6B7280" }}>Score</span>
          <div style={{ flex: 1, height: "6px", background: "#F3F4F6", borderRadius: "99px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: scoreWidth, background: "#1D9E75", borderRadius: "99px" }} />
          </div>
          <span style={{ fontSize: "12px", fontWeight: 500 }}>{product.score_total}/10</span>
        </div>
      </div>

      {/* Trampa */}
      {product.trampa && (
        <div style={{ background: "#FAEEDA", borderLeft: "3px solid #EF9F27", padding: "8px 12px", fontSize: "12px", color: "#633806", borderRadius: "0 6px 6px 0" }}>
          <strong>Ojo:</strong> {product.trampa}
        </div>
      )}

      {/* Pros y contras */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div>
          <div style={{ fontSize: "11px", fontWeight: 500, color: "#0F6E56", marginBottom: "6px" }}>Lo bueno</div>
          {product.pros?.map((p, i) => (
            <div key={i} style={{ fontSize: "12px", color: "#111827", padding: "3px 0", display: "flex", gap: "6px" }}>
              <span style={{ color: "#1D9E75" }}>✓</span>{p}
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: "11px", fontWeight: 500, color: "#993C1D", marginBottom: "6px" }}>Lo que debes saber</div>
          {product.contras?.map((c, i) => (
            <div key={i} style={{ fontSize: "12px", color: "#111827", padding: "3px 0", display: "flex", gap: "6px" }}>
              <span style={{ color: "#D85A30" }}>✗</span>{c}
            </div>
          ))}
        </div>
      </div>

      {/* Specs */}
      {Object.keys(product.specs || {}).length > 0 && (
        <div>
          <div style={{ fontSize: "11px", fontWeight: 500, color: "#6B7280", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Especificaciones</div>
          {Object.entries(product.specs).map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "0.5px solid #F3F4F6", fontSize: "13px" }}>
              <span style={{ color: "#6B7280" }}>{k}</span>
              <span style={{ fontWeight: 500 }}>{v}</span>
            </div>
          ))}
        </div>
      )}

      {/* Opiniones */}
      {product.opiniones_muestra?.length > 0 && (
        <div>
          <div style={{ fontSize: "11px", fontWeight: 500, color: "#6B7280", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Opiniones de compradores</div>
          {product.opiniones_muestra.map((op, i) => (
            <div key={i} style={{ background: "#F9FAFB", borderRadius: "8px", padding: "8px 10px", marginBottom: "6px" }}>
              <div style={{ fontSize: "12px", color: "#111827", lineHeight: 1.5 }}>{op.texto}</div>
              <div style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "3px" }}>
                {"★".repeat(op.estrellas || 0)}{"☆".repeat(5 - (op.estrellas || 0))} · {op.fuente}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Métodos de pago */}
      {product.metodos_pago?.length > 0 && (
        <div>
          <div style={{ fontSize: "11px", fontWeight: 500, color: "#6B7280", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Cómo pagar</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {product.metodos_pago.map((m, i) => (
              <span key={i} style={{ fontSize: "12px", padding: "4px 10px", background: "#F3F4F6", color: "#374151", borderRadius: "6px", border: "0.5px solid #E5E7EB" }}>
                {m.nombre}{m.detalle ? ` · ${m.detalle}` : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tiendas físicas */}
      {product.tiendas_fisicas?.filter(t => t.disponible).length > 0 && (
        <div>
          <div style={{ fontSize: "11px", fontWeight: 500, color: "#6B7280", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Disponible en tienda física</div>
          {product.tiendas_fisicas.filter(t => t.disponible).map((t, i) => (
            <div key={i} style={{ fontSize: "12px", color: "#0F6E56", padding: "3px 0", display: "flex", gap: "6px" }}>
              📍 {t.nombre}{t.direccion ? ` — ${t.direccion}` : ""}
            </div>
          ))}
          <div style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "4px" }}>Puedes ir a verlo antes de comprar o recogerlo el mismo día.</div>
        </div>
      )}

      {/* Botón de compra */}
      <a
        href={product.url}
        target="_blank"
        rel="noreferrer"
        style={{ display: "block", textAlign: "center", background: "#534AB7", color: "white", padding: "12px", borderRadius: "10px", textDecoration: "none", fontSize: "14px", fontWeight: 500, marginTop: "6px" }}
      >
        Ir a comprar en {product.tienda} →
      </a>

    </div>
  )
}
```

4. Implementar `frontend/src/pages/Home.jsx`:

```jsx
import { useState } from "react"
import Chat from "../components/Chat"
import ProductCard from "../components/ProductCard"
import ProductDetail from "../components/ProductDetail"

export default function Home() {
  const [productos, setProductos] = useState([])
  const [productoSeleccionado, setProductoSeleccionado] = useState(null)

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "system-ui, sans-serif" }}>

      {/* Panel izquierdo: chat */}
      <div style={{ width: "400px", borderRight: "1px solid #E5E7EB", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "1rem", borderBottom: "1px solid #E5E7EB", fontWeight: 500, fontSize: "15px", color: "#111827" }}>
          Asistente de compras
        </div>
        <Chat onProductsReady={setProductos} />
      </div>

      {/* Panel derecho: resultados o detalle */}
      <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
        {productos.length === 0 ? (
          <div style={{ color: "#9CA3AF", textAlign: "center", marginTop: "5rem", fontSize: "14px" }}>
            Los resultados aparecerán aquí después de la búsqueda
          </div>
        ) : (
          <div style={{ padding: "1.5rem", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
            {productos.map((p, i) => (
              <ProductCard key={i} product={p} onVerDetalle={setProductoSeleccionado} />
            ))}
          </div>
        )}

        {/* Vista detallada — se superpone sobre el panel cuando el usuario hace clic */}
        {productoSeleccionado && (
          <ProductDetail
            product={productoSeleccionado}
            onClose={() => setProductoSeleccionado(null)}
          />
        )}
      </div>

    </div>
  )
}
```

### Criterio de éxito

- El chat muestra burbujas diferenciadas y el progreso de búsqueda en tiempo real
- Las tarjetas muestran: veredicto con color, precio, score, trampa (si existe), métodos de pago
- El botón "Ver detalle" abre la vista detallada sin salir de la app
- El botón "Ir a comprar" abre directamente la página del producto en la tienda (no la búsqueda general)
- El botón "← Volver a resultados" cierra el detalle y muestra las tarjetas nuevamente

---

## Paso 9 — Integración y pruebas end-to-end

**Objetivo:** Verificar que el sistema completo funciona de punta a punta con datos reales.

### Casos de prueba obligatorios

1. **Flujo completo con usuario no técnico:**
   - Input: "quiero una freidora de aire"
   - El agente hace 2–3 preguntas cotidianas antes de buscar
   - El resultado incluye al menos 3 productos de tiendas distintas
   - Las tarjetas muestran el campo "Ojo:" cuando hay trampa detectada

2. **Flujo completo con usuario técnico:**
   - Input: "busco una air fryer de 5.5 litros, menos de 300 soles, que sea de acero"
   - El agente reconoce que ya tiene suficiente info y busca directamente
   - Los productos están filtrados acorde a las specs dadas

3. **Vista detallada:**
   - Hacer clic en "Ver detalle" de cualquier tarjeta
   - La vista muestra specs, opiniones, métodos de pago y disponibilidad en tienda física
   - El botón "Ir a comprar" lleva directo al producto, no a la búsqueda general

4. **Fallback de APIs:**
   - Poner `monthly_limit: 0` a Tavily y SerpAPI en `config.py`
   - La búsqueda funciona igual usando DuckDuckGo
   - El `usage.json` refleja que se usó DuckDuckGo

5. **Tienda nueva en 10 minutos:**
   - Crear `backend/app/stores/linio.py` con la plantilla base
   - Agregar `"linio"` a `ACTIVE_STORES` en `config.py`
   - La tienda aparece en los resultados sin modificar ningún otro archivo

6. **Resiliencia ante tienda caída:**
   - Simular timeout en una tienda (timeout=0.001)
   - El sistema devuelve productos de las tiendas que sí respondieron
   - No lanza error 500 al frontend

### Lista de verificación final

- [ ] El backend arranca sin warnings con `uvicorn app.main:app`
- [ ] El frontend carga sin errores en consola con `npm run dev`
- [ ] `.env` y `usage.json` no están en el repositorio de git
- [ ] El link de cada producto abre la página específica del producto, no la búsqueda
- [ ] Agregar tienda nueva = solo 2 archivos (`stores/nueva.py` + línea en `config.py`)
- [ ] Agregar API nueva = solo `api_router.py` + línea en `config.py`
- [ ] Cambiar proveedor de IA = solo editar `.env`
- [ ] La vista detallada muestra opiniones reales con estrellas y fuente
- [ ] Los métodos de pago aparecen en tarjeta resumen y en vista detallada
- [ ] Si no hay tiendas físicas disponibles, esa sección no aparece (no muestra vacío)
- [ ] Los precios están en soles (PEN)

---

## Notas para el agente desarrollador

- Implementar en orden estricto. El paso 4 depende del 2, el 5 y 6 dependen del 2 y del `base.py`, el 7 depende de todos.
- `agents/base.py` es el punto más importante: si el cliente de IA falla aquí, fallan ambos agentes. Probarlo aislado antes de continuar.
- Los selectores CSS de cada tienda (paso 4) son los que más probablemente necesiten ajuste manual. Inspeccionar el HTML real de cada tienda en el navegador antes de escribirlos.
- MercadoLibre es la tienda más confiable por tener API oficial. Usarla primero para validar que el modelo `Product` está bien definido antes de implementar los scrapers.
- El campo `url` en `Product` es crítico: debe ser la URL del producto individual, no de la página de búsqueda. Verificarlo manualmente abriendo el link antes de dar el paso 4 por terminado.
- Si una tienda bloquea el scraping, agregar delay aleatorio (`asyncio.sleep(random.uniform(1, 3))`) o rotar el User-Agent en `get_headers()`.
- La vista detallada (`ProductDetail.jsx`) usa los datos que ya están en el `ScoredProduct`. El endpoint `/producto/detalle` es para cuando se necesite refrescar o ampliar datos — no es obligatorio en la primera versión.