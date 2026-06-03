from src.agents.prompts import (
    INFORMATION_AGENT_PROMPT, THEME_AGENT_PROMPT, CHARACTER_AGENT_PROMPT,
    PLOT_AGENT_PROMPT, SETTING_AGENT_PROMPT, NARRATIVE_AGENT_PROMPT, WRITING_AGENT_SYSTEM,
)

def test_information_agent_prompt_has_all_categories():
    for cat in ["时代背景", "官方描述", "野史记载", "地理风貌", "风俗习惯", "传说故事", "民间演绎"]:
        assert cat in INFORMATION_AGENT_PROMPT

def test_theme_agent_prompt_has_json_format():
    assert "statement" in THEME_AGENT_PROMPT
    assert "keywords" in THEME_AGENT_PROMPT

def test_character_agent_prompt_has_fields():
    for field in ["name", "role_type", "card", "personality", "motivation"]:
        assert field in CHARACTER_AGENT_PROMPT

def test_all_prompts_non_empty():
    prompts = [INFORMATION_AGENT_PROMPT, THEME_AGENT_PROMPT, CHARACTER_AGENT_PROMPT,
               PLOT_AGENT_PROMPT, SETTING_AGENT_PROMPT, NARRATIVE_AGENT_PROMPT, WRITING_AGENT_SYSTEM]
    for p in prompts:
        assert len(p) > 50
