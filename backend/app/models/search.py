from pydantic import BaseModel
from typing import Literal, Optional


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class SearchRequest(BaseModel):
    messages: list[ChatMessage]


class DetailRequest(BaseModel):
    producto_url: str
    tienda: str


class SearchResponse(BaseModel):
    message: str
    productos: list = []
    busqueda_lista: bool = False
