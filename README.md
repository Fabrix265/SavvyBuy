# SavvyBuy
# Agente Comparador de Productos — Perú

Agente conversacional que ayuda a comprar con inteligencia. Hace preguntas simples, busca en tiendas peruanas en tiempo real y explica por qué un producto vale más que otro.

---

## Índice

- [¿Cómo funciona?](#cómo-funciona)
- [Stack tecnológico](#stack-tecnológico)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Agregar una API de búsqueda](#agregar-una-api-de-búsqueda)
- [Agregar una tienda nueva](#agregar-una-tienda-nueva)
- [Tiendas soportadas](#tiendas-soportadas)
- [APIs de búsqueda soportadas](#apis-de-búsqueda-soportadas)

---

## ¿Cómo funciona?

El agente pasa por tres fases en cada búsqueda:

**Fase 1 — Entrevista:** El agente hace preguntas cotidianas para entender qué necesitas sin que tengas que saber de especificaciones técnicas. Si le dices "cocino para mí y mi pareja", él traduce eso internamente a los parámetros de búsqueda correctos.

**Fase 2 — Búsqueda:** Con las necesidades claras, el sistema busca en paralelo en todas las tiendas activas usando el stack de APIs configurado. Si una API alcanza su límite mensual, pasa automáticamente a la siguiente.

**Fase 3 — Análisis:** La IA recibe todos los productos encontrados, los compara por calidad de materiales, opiniones reales de compradores y relación precio-valor, y genera un veredicto en lenguaje simple explicando las diferencias reales entre productos que parecen iguales.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Backend | FastAPI (Python 3.11+) |
| IA | Configurable — ver `backend/app/config.py` |
| Búsqueda | Tavily → SerpAPI → DuckDuckGo (fallback automático) |
| Tienda con API oficial | MercadoLibre |
| Tiendas con scraping | Falabella, Ripley, Oechsle, Sodimac, Metro, Tienda Mia, Radio Shack |
| Frontend | React + Vite |
| Comunicación en tiempo real | Server-Sent Events (SSE) |
| Validación de datos | Pydantic v2 |

---

## Estructura del proyecto

```
agente-comparador/
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   │   ├── interviewer.py      # Agente de entrevista — chat con el usuario
│   │   │   └── analyst.py          # Agente de análisis — compara y puntúa productos
│   │   ├── stores/
│   │   │   ├── base.py             # Clase base que heredan todos los adaptadores
│   │   │   ├── mercadolibre.py     # API oficial de MercadoLibre (sin scraping)
│   │   │   ├── falabella.py
│   │   │   ├── ripley.py
│   │   │   ├── oechsle.py
│   │   │   ├── sodimac.py
│   │   │   ├── metro.py
│   │   │   ├── tiendamia.py
│   │   │   └── radioshack.py
│   │   ├── routers/
│   │   │   └── api_router.py       # Lógica de fallback entre APIs de búsqueda
│   │   ├── models/
│   │   │   ├── product.py          # Schema Pydantic del producto normalizado
│   │   │   └── search.py           # Schema de request/response del agente
│   │   ├── config.py               # 👈 Aquí agregas APIs y activas/desactivas tiendas
│   │   └── main.py                 # FastAPI app — punto de entrada del backend
│   ├── tests/
│   ├── .env                        # API keys reales (no se sube a git)
│   ├── .env.example                # Plantilla de variables de entorno
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Chat.jsx             # Interfaz de chat con el agente
    │   │   ├── ProductCard.jsx      # Tarjeta de resultado por producto
    │   │   └── ResultsPanel.jsx     # Panel lateral con los resultados
    │   ├── pages/
    │   │   └── Home.jsx
    │   └── main.jsx
    ├── public/
    ├── .env
    └── package.json
```

---

## Instalación

### Requisitos previos

- Python 3.11 o superior
- Node.js 18 o superior

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # En Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # Luego edita .env con tus keys
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

El backend corre en `http://localhost:8000` y el frontend en `http://localhost:5173`.

---

## Configuración

Copia `.env.example` a `.env` y completa tus valores:

```env
# IA — elige el proveedor que quieras usar
AI_PROVIDER=openai                  # openai | anthropic | gemini | ollama
AI_MODEL=gpt-4o-mini
AI_API_KEY=sk-...

# APIs de búsqueda — agrega las que tengas, deja vacías las que no
TAVILY_API_KEY=tvly-...
SERPAPI_API_KEY=...
# DuckDuckGo no necesita key
```

> **Nota:** El archivo `.env` está en `.gitignore`. Nunca lo subas a GitHub.

---

## Agregar una API de búsqueda

Abre `backend/app/config.py` y agrega tu API al listado en el orden de prioridad que quieras. El sistema las intenta en ese orden y pasa a la siguiente automáticamente si una falla o agota su cupo mensual.

```python
# backend/app/config.py

SEARCH_APIS = [
    {
        "name": "tavily",
        "env_key": "TAVILY_API_KEY",
        "monthly_limit": 1000,
    },
    {
        "name": "serpapi",
        "env_key": "SERPAPI_API_KEY",
        "monthly_limit": 100,
    },
    {
        "name": "mi_nueva_api",        # 👈 Agrega aquí
        "env_key": "MI_NUEVA_API_KEY",
        "monthly_limit": 500,
    },
    {
        "name": "duckduckgo",
        "env_key": None,               # Sin key, siempre disponible
        "monthly_limit": None,
    },
]
```

Luego crea el cliente en `backend/app/routers/api_router.py` siguiendo el mismo patrón que los existentes. El router llama a `_call(api_name, query)` y espera una lista de dicts con `title`, `url` y `snippet`.

---

## Agregar una tienda nueva

**Paso 1** — Crea el adaptador en `backend/app/stores/nueva_tienda.py`:

```python
from .base import BaseStoreAdapter

class NuevaTiendaAdapter(BaseStoreAdapter):
    name = "Nueva Tienda"
    base_url = "https://www.nuevatienda.com.pe"

    def build_search_url(self, query: str) -> str:
        # Construye la URL de búsqueda de esa tienda
        return f"{self.base_url}/buscar?q={query.replace(' ', '+')}"

    def parse(self, html: str) -> list[dict]:
        # Extrae los datos del HTML y devuelve siempre este formato
        return [
            {
                "tienda": self.name,
                "titulo": "...",
                "precio": 299.90,
                "moneda": "PEN",
                "url": "https://...",
                "rating": 4.2,
                "num_opiniones": 87,
                "descripcion": "...",
            }
        ]
```

**Paso 2** — Actívala en `backend/app/config.py`:

```python
ACTIVE_STORES = [
    "falabella",
    "ripley",
    "oechsle",
    "sodimac",
    "metro",
    "tiendamia",
    "radioshack",
    "mercadolibre",
    "nueva_tienda",     # 👈 Solo agrega esta línea
]
```

Listo. El sistema la detecta automáticamente en el siguiente reinicio.

---

## Tiendas soportadas

| Tienda | Método | URL |
|---|---|---|
| MercadoLibre | API oficial | mercadolibre.com.pe |
| Falabella | Scraping | saga.falabella.com.pe |
| Ripley | Scraping | ripley.com.pe |
| Oechsle | Scraping | oechsle.pe |
| Sodimac | Scraping | sodimac.com.pe |
| Metro | Scraping | metro.pe |
| Tienda Mia | Scraping | tiendamia.com |
| Radio Shack | Scraping | radioshack.com.pe |

> Los adaptadores de scraping pueden necesitar actualizarse si las tiendas cambian su HTML. Solo edita el archivo correspondiente en `stores/` — el resto del sistema no se toca.

---

## APIs de búsqueda soportadas

| API | Free tier | Requiere key | Notas |
|---|---|---|---|
| Tavily Search | 1,000 búsquedas/mes | Sí | Diseñada para agentes IA, resultados limpios |
| SerpAPI | 100 búsquedas/mes | Sí | Resultados de Google, buena cobertura local |
| DuckDuckGo | Sin límite oficial | No | Último recurso, puede ser inestable |

El uso mensual de cada API se guarda localmente en `backend/app/usage.json`. Se resetea automáticamente al inicio de cada mes.

---

## Flujo técnico resumido

```
Usuario (chat)
    ↓
Interviewer Agent         — hace preguntas, traduce respuestas a specs
    ↓
API Router                — busca con Tavily → SerpAPI → DuckDuckGo
    ↓
Store Adapters            — extraen precio y datos de cada tienda
    ↓
Analyst Agent             — puntúa y compara con la IA configurada
    ↓
Frontend                  — muestra tarjetas con veredicto y links de compra
```