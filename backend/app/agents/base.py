import httpx
from app.config import settings


class BaseAIAgent:

    def __init__(self):
        self.client = httpx.AsyncClient()

    async def _call_ai(self, system_prompt: str, messages: list[dict]) -> str:
        if settings.ai_provider == "openai":
            base_url = settings.ai_base_url or "https://api.openai.com/v1"
            response = await self.client.post(
                f"{base_url}/chat/completions",
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
