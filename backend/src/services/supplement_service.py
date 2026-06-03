"""Supplement service — runs 5 module agents in parallel after chapter confirmation."""

import asyncio
from ..llm.base import LLMClient
from ..agents.character import CharacterAgent
from ..agents.plot import PlotAgent
from ..agents.setting import SettingAgent
from ..agents.theme import ThemeAgent
from ..agents.narrative import NarrativeAgent


class SupplementService:
    """Coordinates post-chapter supplement updates for all 5 module agents.
    Information Agent is excluded from supplement phase (search cost)."""

    def __init__(self, llm_client: LLMClient):
        self.llm = llm_client
        self.theme_agent = ThemeAgent(llm_client)
        self.char_agent = CharacterAgent(llm_client)
        self.plot_agent = PlotAgent(llm_client)
        self.setting_agent = SettingAgent(llm_client)
        self.narr_agent = NarrativeAgent(llm_client)

    async def run_supplement(self, chapter_summary: dict, project_context: dict) -> dict:
        """Run all 5 agents in parallel with chapter summary."""
        tasks = [
            self._safe_run(self.char_agent, {"chapter_summary": str(chapter_summary), **project_context}, "character"),
            self._safe_run(self.plot_agent, {"chapter_summary": str(chapter_summary), **project_context}, "plot"),
            self._safe_run(self.setting_agent, {"chapter_summary": str(chapter_summary), **project_context}, "setting"),
            self._safe_run(self.theme_agent, {"chapter_summary": str(chapter_summary), **project_context}, "theme"),
            self._safe_run(self.narr_agent, {"chapter_summary": str(chapter_summary), **project_context}, "narrative"),
        ]
        results = await asyncio.gather(*tasks)
        return {name: result for name, result in results}

    async def _safe_run(self, agent, input_data: dict, agent_name: str) -> tuple[str, dict | None]:
        try:
            result = await agent.run(input_data)
            return agent_name, result
        except Exception as e:
            return agent_name, {"error": str(e)}
