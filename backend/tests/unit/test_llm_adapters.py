from unittest.mock import AsyncMock, patch
from src.llm.adapters import DeepSeekAdapter, QwenAdapter, create_llm_client
from src.llm.mock import MockLLM


def test_create_llm_client_mock():
    assert isinstance(create_llm_client(provider="mock"), MockLLM)


def test_create_llm_client_deepseek():
    assert isinstance(create_llm_client(provider="deepseek", api_key="sk-test"), DeepSeekAdapter)


def test_deepseek_adapter_model_name():
    adapter = DeepSeekAdapter(api_key="test")
    assert adapter.model_name == "deepseek-chat"
