from .base import BaseAgent
from .prompts import CHARACTER_AGENT_PROMPT
from ..utils.output_parser import parse_json


class CharacterAgent(BaseAgent):
    def get_system_prompt(self) -> str:
        return CHARACTER_AGENT_PROMPT

    def build_user_prompt(self, input_data: dict) -> str:
        parts = []
        if input_data.get("user_requirements"):
            parts.append(f"创作需求：{input_data['user_requirements']}")
        if input_data.get("theme"):
            parts.append(f"主题：{input_data['theme']}")
        return "\n".join(parts)

    def parse_output(self, raw: str) -> dict:
        return parse_json(raw)
