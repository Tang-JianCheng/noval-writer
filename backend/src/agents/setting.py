from .base import BaseAgent
from .prompts import SETTING_AGENT_PROMPT
from ..utils.output_parser import parse_json


class SettingAgent(BaseAgent):
    def get_system_prompt(self) -> str:
        return SETTING_AGENT_PROMPT

    def build_user_prompt(self, input_data: dict) -> str:
        parts = []
        if input_data.get("user_requirements"):
            parts.append(f"创作需求：{input_data['user_requirements']}")
        if input_data.get("plot_nodes"):
            parts.append(f"情节节点：{input_data['plot_nodes']}")
        return "\n".join(parts)

    def parse_output(self, raw: str) -> dict:
        return parse_json(raw)
