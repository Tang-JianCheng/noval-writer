from .base import BaseAgent
from .prompts import WRITING_AGENT_SYSTEM
from ..utils.output_parser import parse_json, extract_section


class WritingAgent(BaseAgent):
    def get_system_prompt(self) -> str:
        return WRITING_AGENT_SYSTEM

    def build_user_prompt(self, input_data: dict) -> str:
        return input_data.get("assembled_context", "")

    def parse_output(self, raw: str) -> dict:
        summary_text = extract_section(raw, "SUMMARY_JSON", None)
        try:
            return parse_json(summary_text) if summary_text else {"raw": raw}
        except Exception:
            return {"raw": raw, "summary_text": summary_text}
