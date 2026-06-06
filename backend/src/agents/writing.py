import re
from .base import BaseAgent
from .prompts import WRITING_AGENT_SYSTEM
from ..utils.output_parser import parse_json


class WritingAgent(BaseAgent):
    def get_system_prompt(self) -> str:
        return WRITING_AGENT_SYSTEM

    def build_user_prompt(self, input_data: dict) -> str:
        return input_data.get("assembled_context", "")

    def parse_output(self, raw: str) -> dict:
        # Extract body text (everything before SUMMARY_JSON or [SUMMARY_JSON])
        body = raw
        summary_data = {}

        # Try to find and parse the summary section
        # Match both "SUMMARY_JSON" (bare) and "[SUMMARY_JSON]"
        match = re.search(r'\[?SUMMARY_JSON\]?\s*(\{[\s\S]*\})', raw)
        if match:
            body = raw[:match.start()].strip()
            try:
                summary_data = parse_json(match.group(1))
            except Exception:
                summary_data = {"raw_summary": match.group(1)}

        return {"raw": body, **summary_data}
