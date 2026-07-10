import json
import re
import httpx
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

    def __init__(self, client: httpx.AsyncClient):
        super().__init__(client)

    async def analyze(self, products: list[Product], specs: dict) -> list[ScoredProduct]:
        products_data = [p.model_dump() for p in products]
        user_message = f"""
Necesidades del usuario: {json.dumps(specs, ensure_ascii=False)}

Productos encontrados:
{json.dumps(products_data, ensure_ascii=False, indent=2)}
"""
        raw_response = await self._call_ai(SCORING_PROMPT, [{"role": "user", "content": user_message}])

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
