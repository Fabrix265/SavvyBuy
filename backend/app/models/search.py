from pydantic import BaseModel
from typing import Optional


class ChatMessage(BaseModel):
    role: str
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
