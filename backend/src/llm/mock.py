from .base import LLMClient, LLMResponse


class MockLLM(LLMClient):
    def __init__(self, default_response: str = "", responses: list[str] | None = None):
        self.default_response = default_response
        self._responses = responses or []
        self._index = 0
        self.calls: list[str] = []

    async def chat(self, prompt: str, system_prompt: str = "") -> LLMResponse:
        self.calls.append(prompt)
        content = self._responses[self._index] if self._index < len(self._responses) else self.default_response
        self._index += 1
        return LLMResponse(content=content, model="mock", tokens_used=len(content))
