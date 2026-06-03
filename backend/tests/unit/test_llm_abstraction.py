import pytest
from src.llm.base import LLMClient, LLMResponse
from src.llm.mock import MockLLM


def test_llm_client_is_abstract():
    with pytest.raises(TypeError):
        LLMClient()


async def test_mock_llm_returns_configured_response():
    mock = MockLLM(default_response="预定义响应")
    response = await mock.chat("提示词")
    assert response.content == "预定义响应"


async def test_mock_llm_sequence():
    mock = MockLLM(responses=["第1", "第2", "第3"])
    r1 = await mock.chat("a")
    r2 = await mock.chat("b")
    r3 = await mock.chat("c")
    assert r1.content == "第1"
    assert r2.content == "第2"
    assert r3.content == "第3"


async def test_mock_llm_records_calls():
    mock = MockLLM(default_response="x")
    await mock.chat("A")
    await mock.chat("B")
    assert mock.calls == ["A", "B"]
