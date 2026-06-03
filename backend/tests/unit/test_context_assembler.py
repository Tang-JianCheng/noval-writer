from src.dispatcher.context_assembler import ContextAssembler, AssembledContext


def test_assemble_first_chapter_no_hot_data():
    assembler = ContextAssembler(max_tokens=32000)
    context = assembler.assemble(
        chapter_number=1,
        plot_nodes=[{"title": "觉醒", "description": "主角发现天赋"}],
        characters=[{"name": "林风", "current_state": {"location": "新手村"}}],
        scenes=[{"name": "新手村广场", "atmosphere": "平静"}],
        narrative_rules={"pov": "第三人称"},
        hot_chapters=[],
        warm_summaries=[],
        background_info=""
    )
    assert isinstance(context, AssembledContext)
    assert "林风" in context.prompt
    assert "觉醒" in context.prompt
    assert context.estimated_tokens > 0


def test_assemble_with_hot_chapters():
    assembler = ContextAssembler(max_tokens=32000)
    context = assembler.assemble(
        chapter_number=5,
        plot_nodes=[{"title": "宗门大比"}],
        characters=[{"name": "林风", "current_state": {}}],
        scenes=[{"name": "比武台", "atmosphere": "紧张"}],
        narrative_rules={},
        hot_chapters=["第3章内容...", "第4章内容..."],
        warm_summaries=["第1-2章摘要..."],
        background_info=""
    )
    assert "第3章内容" in context.prompt
    assert "第4章内容" in context.prompt


def test_token_budget_trims_when_exceeded():
    small = ContextAssembler(max_tokens=100)
    long_text = "林风" * 500
    context = small.assemble(10, [{"title":"x"}], [{"name":"x"*200,"current_state":{}}], [], {}, [long_text], [long_text], "")
    assert context.estimated_tokens <= 100
    assert context.trimmed is True


def test_prompt_structure_has_all_sections():
    assembler = ContextAssembler(max_tokens=32000)
    context = assembler.assemble(1, [{"title":"测试"}], [{"name":"主角","current_state":{}}], [{"name":"场景","atmosphere":"测试"}], {"pov":"第三人称"}, [], [], "明代科举制度...")
    prompt = context.prompt
    for section in ["[SYSTEM]", "[BACKGROUND]", "[CHARACTERS]", "[PLOT]", "[SCENES]", "[CONTEXT]", "[RECENT]", "[INSTRUCTION]"]:
        assert section in prompt
    assert "明代科举制度" in prompt
