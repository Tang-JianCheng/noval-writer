from .base import BaseAgent
from .prompts import NARRATIVE_AGENT_PROMPT
from ..utils.output_parser import parse_json


class NarrativeAgent(BaseAgent):
    def get_system_prompt(self) -> str:
        return NARRATIVE_AGENT_PROMPT

    def build_user_prompt(self, input_data: dict) -> str:
        parts = []
        for key in ["user_requirements", "theme", "characters", "plot_nodes", "scenes"]:
            if input_data.get(key):
                parts.append(f"{key}：{input_data[key]}")
        return "\n".join(parts)

    def parse_output(self, raw: str) -> dict:
        return parse_json(raw)
