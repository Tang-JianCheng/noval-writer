from .base import BaseAgent
from .prompts import PLOT_AGENT_PROMPT
from ..utils.output_parser import parse_json


class PlotAgent(BaseAgent):
    def get_system_prompt(self) -> str:
        return PLOT_AGENT_PROMPT

    def build_user_prompt(self, input_data: dict) -> str:
        parts = []
        if input_data.get("user_requirements"):
            parts.append(f"创作需求：{input_data['user_requirements']}")
        if input_data.get("theme"):
            parts.append(f"主题：{input_data['theme']}")
        if input_data.get("characters"):
            parts.append(f"角色：{input_data['characters']}")
        return "\n".join(parts)

    def parse_output(self, raw: str) -> dict:
        return parse_json(raw)
