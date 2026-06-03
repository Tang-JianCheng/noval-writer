from abc import ABC, abstractmethod
from ..llm.base import LLMClient, LLMResponse


class BaseAgent(ABC):
    def __init__(self, llm_client: LLMClient):
        self.llm = llm_client

    @abstractmethod
    def get_system_prompt(self) -> str:
        """Return the system prompt for this agent."""
        ...

    @abstractmethod
    def build_user_prompt(self, input_data: dict) -> str:
        """Build the user prompt from input data."""
        ...

    async def run(self, input_data: dict) -> dict:
        """Execute the agent: build prompt, call LLM, parse response."""
        system = self.get_system_prompt()
        user = self.build_user_prompt(input_data)
        response = await self.llm.chat(prompt=user, system_prompt=system)
        return self.parse_output(response.content)

    @abstractmethod
    def parse_output(self, raw: str) -> dict:
        """Parse LLM output into structured data."""
        ...
