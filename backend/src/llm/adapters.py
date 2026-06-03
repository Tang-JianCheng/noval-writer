import httpx
from .base import LLMClient, LLMResponse
from .mock import MockLLM


class DeepSeekAdapter(LLMClient):
    def __init__(self, api_key: str, base_url: str = "https://api.deepseek.com/v1"):
        self.api_key = api_key
        self.base_url = base_url
        self.model_name = "deepseek-chat"

    async def chat(self, prompt: str, system_prompt: str = "") -> LLMResponse:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{self.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={"model": self.model_name, "messages": messages}
            )
            resp.raise_for_status()
            data = resp.json()
        choice = data["choices"][0]["message"]
        return LLMResponse(
            content=choice["content"],
            model=data.get("model", self.model_name),
            tokens_used=data.get("usage", {}).get("total_tokens", 0)
        )


class QwenAdapter(LLMClient):
    def __init__(self, api_key: str, base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"):
        self.api_key = api_key
        self.base_url = base_url
        self.model_name = "qwen-plus"

    async def chat(self, prompt: str, system_prompt: str = "") -> LLMResponse:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{self.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={"model": self.model_name, "messages": messages}
            )
            resp.raise_for_status()
            data = resp.json()
        choice = data["choices"][0]["message"]
        return LLMResponse(
            content=choice["content"],
            model=data.get("model", self.model_name),
            tokens_used=data.get("usage", {}).get("total_tokens", 0)
        )


def create_llm_client(provider: str = "deepseek", **kwargs) -> LLMClient:
    if provider == "mock":
        return MockLLM(**kwargs)
    elif provider == "deepseek":
        return DeepSeekAdapter(api_key=kwargs.get("api_key", ""))
    elif provider == "qwen":
        return QwenAdapter(api_key=kwargs.get("api_key", ""))
    raise ValueError(f"Unknown provider: {provider}")
