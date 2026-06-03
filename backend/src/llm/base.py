from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class LLMResponse:
    content: str
    model: str = ""
    tokens_used: int = 0


class LLMClient(ABC):
    @abstractmethod
    async def chat(self, prompt: str, system_prompt: str = "") -> LLMResponse: ...
