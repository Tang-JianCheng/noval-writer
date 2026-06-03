import pytest
from src.llm.mock import MockLLM
from src.dispatcher.orchestrator import OutlineOrchestrator
from src.dispatcher.state_machine import DispatcherState

INFO_JSON = '{"时代背景":[{"title":"科举制度","content":"明代科举..."}],"官方描述":[],"野史记载":[],"地理风貌":[],"风俗习惯":[],"传说故事":[],"民间演绎":[]}'
THEME_JSON = '{"statement":"逆境中成长","keywords":["成长"],"tone":"热血","taboos":[]}'
CHAR_JSON = '{"characters":[{"name":"林风","role_type":"protagonist","card":{"appearance":"清秀","personality":"坚韧","motivation":"变强","arc":"成长","speech_style":"少言"},"initial_state":{"location":"新手村","mood":"平静","goal":"修炼"}}],"relationships":[]}'
PLOT_JSON = '{"plot_nodes":[{"title":"觉醒","description":"发现天赋","chapter_estimate":"1-3","importance":"main","sort_order":0,"children":[]}]}'
SETTING_JSON = '{"world_overview":"修真大陆","scenes":[{"name":"青云宗","description":"修仙门派","atmosphere":"庄严","details":{}}]}'
NARR_JSON = '{"pov":"第三人称","tense":"过去时","chapter_template":"开场-冲突-收尾","dialogue_style":"古风","description_density":"中","rhythm_notes":"张弛有度"}'

async def test_full_outline_pipeline():
    """6 agents run in serial order, each receiving previous output."""
    mock = MockLLM(responses=[INFO_JSON, THEME_JSON, CHAR_JSON, PLOT_JSON, SETTING_JSON, NARR_JSON])
    orch = OutlineOrchestrator(mock)

    result = await orch.build_outline("明代科举修仙小说")

    assert "information" in result
    assert "theme" in result
    assert "characters" in result
    assert "plot_nodes" in result
    assert "setting" in result
    assert "narrative" in result
    assert orch.sm.current_state == DispatcherState.AWAITING_OUTLINE_CONFIRM
    assert result["theme"]["statement"] == "逆境中成长"
    assert len(result["characters"]["characters"]) == 1
    assert len(mock.calls) == 6
