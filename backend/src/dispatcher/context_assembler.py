from dataclasses import dataclass
from ..utils.token_counter import estimate_tokens


@dataclass
class AssembledContext:
    prompt: str
    estimated_tokens: int
    trimmed: bool = False


class ContextAssembler:
    def __init__(self, max_tokens: int = 32000):
        self.max_tokens = int(max_tokens * 0.8)

    def assemble(
        self,
        chapter_number: int,
        plot_nodes: list[dict],
        characters: list[dict],
        scenes: list[dict],
        narrative_rules: dict,
        hot_chapters: list[str],
        warm_summaries: list[str],
        background_info: str,
    ) -> AssembledContext:
        sections = [
            ("[SYSTEM]", self._build_system(narrative_rules)),
            ("[BACKGROUND]", self._build_background(background_info)),
            ("[CHARACTERS]", self._build_characters(characters)),
            ("[PLOT]", self._build_plot(plot_nodes)),
            ("[SCENES]", self._build_scenes(scenes)),
            ("[CONTEXT]", self._build_context(warm_summaries)),
            ("[RECENT]", self._build_recent(hot_chapters)),
            ("[INSTRUCTION]", self._build_instruction(chapter_number)),
        ]

        prompt = "\n\n".join(f"{label}\n{content}" for label, content in sections)
        tokens = estimate_tokens(prompt)
        trimmed = False

        if tokens > self.max_tokens:
            trimmed = True
            while tokens > self.max_tokens:
                prompt = prompt[:len(prompt) // 2]
                if not prompt:
                    break
                tokens = estimate_tokens(prompt)

        return AssembledContext(prompt=prompt, estimated_tokens=tokens, trimmed=trimmed)

    def _build_system(self, rules: dict) -> str:
        pov = rules.get("pov", "第三人称")
        return f"你是一位专业小说作家。请根据以下信息撰写章节。\n叙事视角: {pov}"

    def _build_background(self, info: str) -> str:
        return info or "无特定背景资料"

    def _build_characters(self, characters: list[dict]) -> str:
        lines = []
        for c in characters:
            state = c.get("current_state", {})
            location = state.get("location", "未知")
            mood = state.get("mood", "")
            lines.append(f"姓名: {c['name']}, 位置: {location}" + (f", 情绪: {mood}" if mood else ""))
        return "\n".join(lines)

    def _build_plot(self, nodes: list[dict]) -> str:
        return "\n".join(n.get("title", "") + ": " + n.get("description", "") for n in nodes)

    def _build_scenes(self, scenes: list[dict]) -> str:
        return "\n".join(f"{s.get('name', '')} — {s.get('atmosphere', '')}" for s in scenes)

    def _build_context(self, summaries: list[str]) -> str:
        return "\n\n".join(summaries) if summaries else "（这是第一章，无前情提要）"

    def _build_recent(self, chapters: list[str]) -> str:
        return "\n\n---\n\n".join(chapters) if chapters else "（这是第一章，无前文）"

    def _build_instruction(self, chapter_number: int) -> str:
        return f"请撰写第{chapter_number}章。字数3000-10000字。保持角色一致性。结尾留下悬念或自然过渡。"
