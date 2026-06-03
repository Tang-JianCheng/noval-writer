from .base import BaseAgent
from .prompts import THEME_AGENT_PROMPT
from ..utils.output_parser import parse_json


class ThemeAgent(BaseAgent):
    def get_system_prompt(self) -> str:
        return THEME_AGENT_PROMPT

    def build_user_prompt(self, input_data: dict) -> str:
        req = input_data.get("user_requirements", "")
        bg = input_data.get("background_info", "")
        return f"创作需求：{req}\n背景资料：{bg}" if bg else f"创作需求：{req}"

    def parse_output(self, raw: str) -> dict:
        return parse_json(raw)
