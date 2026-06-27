import asyncio
from collections.abc import AsyncIterable
from contextlib import asynccontextmanager
from typing import Annotated

import httpx
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.sse import EventSourceResponse, ServerSentEvent

from app.agents.analyst import AnalystAgent
from app.agents.interviewer import InterviewerAgent
from app.config import get_settings
from app.models.product import Product
from app.models.search import DetailRequest, SearchRequest
from app.routers.api_router import api_router
from app.stores import get_active_adapters


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with httpx.AsyncClient() as client:
        app.state.http_client = client
        yield


app = FastAPI(title="Agente Comparador de Productos Perú", lifespan=lifespan)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_http_client(request: Request) -> httpx.AsyncClient:
    return request.app.state.http_client


HttpClientDep = Annotated[httpx.AsyncClient, Depends(get_http_client)]


def get_interviewer(client: HttpClientDep) -> InterviewerAgent:
    return InterviewerAgent(client)


def get_analyst(client: HttpClientDep) -> AnalystAgent:
    return AnalystAgent(client)


InterviewerDep = Annotated[InterviewerAgent, Depends(get_interviewer)]
AnalystDep = Annotated[AnalystAgent, Depends(get_analyst)]


@app.post("/chat", response_class=EventSourceResponse)
async def chat(
    request: SearchRequest,
    interviewer: InterviewerDep,
    analyst: AnalystDep,
    client: HttpClientDep,
) -> AsyncIterable[ServerSentEvent]:
    response_text, specs = await interviewer.chat(request.messages)
    yield ServerSentEvent(data={"type": "message", "content": response_text}, event="message")

    if specs is None:
        yield ServerSentEvent(data={"type": "done", "productos": []}, event="done")
        return

    adapters = get_active_adapters()
    for adapter in adapters:
        yield ServerSentEvent(
            data={"type": "status", "content": f"Buscando en {adapter.name}..."},
            event="status",
        )

    search_query = f"{specs['categoria']} site:peru OR .pe"
    try:
        search_results = await api_router.search(search_query)
    except Exception as e:
        yield ServerSentEvent(
            data={"type": "error", "content": f"Error en la búsqueda: {e}"},
            event="error",
        )
        yield ServerSentEvent(data={"type": "done", "productos": []}, event="done")
        return

    fetch_tasks = [
        _fetch_from_store(adapter, search_query, client)
        for adapter in adapters
    ]
    results = await asyncio.gather(*fetch_tasks, return_exceptions=True)

    all_products: list[Product] = []
    for result in results:
        if isinstance(result, list):
            all_products.extend(result)

    yield ServerSentEvent(
        data={"type": "status", "content": f"Encontré {len(all_products)} productos. Analizando..."},
        event="status",
    )

    scored = await analyst.analyze(all_products[:15], specs)
    yield ServerSentEvent(
        data={"type": "done", "productos": [p.model_dump() for p in scored]},
        event="done",
    )


@app.post("/producto/detalle")
async def producto_detalle(
    request: DetailRequest,
    client: HttpClientDep,
) -> Product | dict:
    adapters = get_active_adapters()
    adapter = next((a for a in adapters if a.name.lower() == request.tienda.lower()), None)

    if not adapter:
        raise HTTPException(status_code=400, detail="Tienda no soportada")

    try:
        response = await client.get(
            request.producto_url,
            headers=adapter.get_headers(),
            timeout=15,
            follow_redirects=True,
        )
        products = adapter.parse(response.text, request.producto_url)
        if products:
            return products[0]
        raise HTTPException(status_code=404, detail="No se pudo extraer el detalle del producto")
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Error al conectar con la tienda: {e}")


async def _fetch_from_store(
    adapter: object, query: str, client: httpx.AsyncClient
) -> list[Product]:
    try:
        search_url = adapter.build_search_url(query)
        response = await client.get(
            search_url,
            headers=adapter.get_headers(),
            timeout=15,
            follow_redirects=True,
        )
        return adapter.parse(response.text, search_url)
    except Exception as e:
        print(f"[{adapter.name}] Error: {e}")
        return []


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
