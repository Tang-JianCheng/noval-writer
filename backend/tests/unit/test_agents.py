import pytest
from src.llm.mock import MockLLM
from src.agents.information import InformationAgent
from src.agents.theme import ThemeAgent
from src.agents.character import CharacterAgent
from src.agents.plot import PlotAgent
from src.agents.setting import SettingAgent
from src.agents.narrative import NarrativeAgent
from src.agents.writing import WritingAgent

INFO_JSON_RESPONSE = '{"时代背景":[{"title":"科举制度","content":"明代科举..."}],"官方描述":[],"野史记载":[],"地理风貌":[],"风俗习惯":[],"传说故事":[],"民间演绎":[]}'
THEME_JSON = '{"statement":"逆境中成长","keywords":["成长","逆袭"],"tone":"热血","taboos":[]}'
CHARACTER_JSON = '{"characters":[{"name":"林风","role_type":"protagonist","card":{"appearance":"清秀","personality":"坚韧","motivation":"变强","arc":"成长","speech_style":"少言"},"initial_state":{"location":"新手村","mood":"平静","goal":"修炼"}}],"relationships":[]}'
PLOT_JSON = '{"plot_nodes":[{"title":"觉醒","description":"发现天赋","chapter_estimate":"1-3","importance":"main","sort_order":0,"children":[]}]}'
SETTING_JSON = '{"world_overview":"修真大陆","scenes":[{"name":"青云宗","description":"修仙门派","atmosphere":"庄严","details":{}}]}'
NARRATIVE_JSON = '{"pov":"第三人称","tense":"过去时","chapter_template":"开场-冲突-收尾","dialogue_style":"古风","description_density":"中","rhythm_notes":"张弛有度"}'

async def test_information_agent_parses_response():
    agent = InformationAgent(MockLLM(default_response=INFO_JSON_RESPONSE))
    result = await agent.run({"user_requirements": "明代科举修仙小说"})
    assert "时代背景" in result

async def test_theme_agent_parses_response():
    agent = ThemeAgent(MockLLM(default_response=THEME_JSON))
    result = await agent.run({"user_requirements": "修仙小说"})
    assert result["statement"] == "逆境中成长"
    assert "成长" in result["keywords"]

async def test_character_agent_parses_response():
    agent = CharacterAgent(MockLLM(default_response=CHARACTER_JSON))
    result = await agent.run({"user_requirements": "修仙", "theme": "逆境成长"})
    assert len(result["characters"]) == 1
    assert result["characters"][0]["name"] == "林风"

async def test_plot_agent_parses_response():
    agent = PlotAgent(MockLLM(default_response=PLOT_JSON))
    result = await agent.run({"user_requirements": "修仙"})
    assert len(result["plot_nodes"]) == 1

async def test_setting_agent_parses_response():
    agent = SettingAgent(MockLLM(default_response=SETTING_JSON))
    result = await agent.run({"user_requirements": "修仙"})
    assert len(result["scenes"]) == 1

async def test_narrative_agent_parses_response():
    agent = NarrativeAgent(MockLLM(default_response=NARRATIVE_JSON))
    result = await agent.run({"user_requirements": "修仙"})
    assert result["pov"] == "第三人称"

async def test_writing_agent_parses_summary():
    text = "第一章正文内容...\nSUMMARY_JSON\n" + '{"summary":"本章摘要","plot_progress":"推进","character_changes":"无","key_events":[],"new_elements":[]}'
    agent = WritingAgent(MockLLM(default_response=text))
    result = await agent.run({"assembled_context": "请写第一章"})
    assert result["summary"] == "本章摘要"
