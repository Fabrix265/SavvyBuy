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
        formatted = [{"role": m.role, "content": m.content} for m in messages]
        response_text = await self._call_ai(SYSTEM_PROMPT, formatted)

        if response_text.startswith("BUSCAR:"):
            specs_raw = response_text.replace("BUSCAR:", "").strip()
            specs = json.loads(specs_raw)
            confirmacion = f"Perfecto, voy a buscar {specs['categoria']} en las tiendas. Dame un momento..."
            return confirmacion, specs

        return response_text, None
