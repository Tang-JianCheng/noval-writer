from ..llm.base import LLMClient
from ..llm.mock import MockLLM
from .state_machine import StateMachine, DispatcherState, InvalidTransitionError
from .context_assembler import ContextAssembler
from ..agents.information import InformationAgent
from ..agents.theme import ThemeAgent
from ..agents.character import CharacterAgent
from ..agents.plot import PlotAgent
from ..agents.setting import SettingAgent
from ..agents.narrative import NarrativeAgent
from ..agents.writing import WritingAgent


class OutlineOrchestrator:
    """Coordinates the 6-agent serial pipeline for outline building."""

    def __init__(self, llm_client: LLMClient):
        self.llm = llm_client
        self.sm = StateMachine()
        self.info_agent = InformationAgent(llm_client)
        self.theme_agent = ThemeAgent(llm_client)
        self.char_agent = CharacterAgent(llm_client)
        self.plot_agent = PlotAgent(llm_client)
        self.setting_agent = SettingAgent(llm_client)
        self.narr_agent = NarrativeAgent(llm_client)

    async def build_outline(self, user_requirements: str) -> dict:
        self.sm.transition(DispatcherState.BUILDING_OUTLINE)

        # Step 1: Information Agent
        info_result = await self.info_agent.run({"user_requirements": user_requirements})
        bg_text = self._flatten_info(info_result)

        # Step 2: Theme Agent
        theme_result = await self.theme_agent.run({
            "user_requirements": user_requirements,
            "background_info": bg_text[:2000]
        })

        # Step 3: Character Agent
        char_result = await self.char_agent.run({
            "user_requirements": user_requirements,
            "theme": str(theme_result)
        })

        # Step 4: Plot Agent
        plot_result = await self.plot_agent.run({
            "user_requirements": user_requirements,
            "theme": str(theme_result),
            "characters": str(char_result)
        })

        # Step 5: Setting Agent
        setting_result = await self.setting_agent.run({
            "user_requirements": user_requirements,
            "plot_nodes": str(plot_result)
        })

        # Step 6: Narrative Agent
        narr_result = await self.narr_agent.run({
            "user_requirements": user_requirements,
            "theme": str(theme_result),
            "characters": str(char_result),
            "plot_nodes": str(plot_result),
            "scenes": str(setting_result)
        })

        self.sm.transition(DispatcherState.AWAITING_OUTLINE_CONFIRM)

        return {
            "information": info_result,
            "theme": theme_result,
            "characters": char_result,
            "plot_nodes": plot_result,
            "setting": setting_result,
            "narrative": narr_result,
        }

    def _flatten_info(self, info: dict) -> str:
        parts = []
        for category, entries in info.items():
            if isinstance(entries, list):
                for e in entries:
                    if isinstance(e, dict):
                        parts.append(f"[{category}] {e.get('title','')}: {e.get('content','')}")
        return "\n".join(parts)
