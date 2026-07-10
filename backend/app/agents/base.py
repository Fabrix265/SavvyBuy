import httpx
from app.config import settings


class BaseAIAgent:

    def __init__(self, client: httpx.AsyncClient):
        self.client = client

    async def _call_ai(self, system_prompt: str, messages: list[dict]) -> str:
        try:
            if settings.ai_provider == "openai":
                return await self._call_openai(system_prompt, messages)
            elif settings.ai_provider == "anthropic":
                return await self._call_anthropic(system_prompt, messages)
            elif settings.ai_provider == "gemini":
                return await self._call_gemini(system_prompt, messages)
            raise ValueError(f"Proveedor de IA no soportado: {settings.ai_provider}")
        except httpx.HTTPStatusError as e:
            raise ValueError(
                f"Error HTTP del proveedor de IA ({e.response.status_code}): "
                f"{e.response.text[:200]}"
            )
        except httpx.RequestError as e:
            raise ValueError(f"Error de conexión con el proveedor de IA: {e}")
        except (KeyError, IndexError) as e:
            raise ValueError(
                f"Respuesta inesperada del proveedor de IA: {e}"
            )

    async def _call_openai(self, system_prompt: str, messages: list[dict]) -> str:
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
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]

    async def _call_anthropic(self, system_prompt: str, messages: list[dict]) -> str:
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
        response.raise_for_status()
        return response.json()["content"][0]["text"]

    async def _call_gemini(self, system_prompt: str, messages: list[dict]) -> str:
        contents = [
            {"role": "user" if m["role"] == "user" else "model",
             "parts": [{"text": m["content"]}]}
            for m in messages if m["role"] != "system"
        ]
        response = await self.client.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{settings.ai_model}:generateContent?key={settings.ai_api_key}",
            json={"system_instruction": {"parts": [{"text": system_prompt}]}, "contents": contents},
            timeout=30,
        )
        response.raise_for_status()
        return response.json()["candidates"][0]["content"]["parts"][0]["text"]
