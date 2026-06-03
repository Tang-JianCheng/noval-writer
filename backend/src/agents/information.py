from .base import BaseAgent
from .prompts import INFORMATION_AGENT_PROMPT
from ..utils.output_parser import parse_json


class InformationAgent(BaseAgent):
    def get_system_prompt(self) -> str:
        return INFORMATION_AGENT_PROMPT

    def build_user_prompt(self, input_data: dict) -> str:
        requirements = input_data.get("user_requirements", "")
        return f"创作需求：{requirements}"

    def parse_output(self, raw: str) -> dict:
        return parse_json(raw)
