import pytest
from src.llm.mock import MockLLM
from src.services.supplement_service import SupplementService

CHAR_RESP = '{"characters":[]}'
PLOT_RESP = '{"plot_nodes":[]}'
SETTING_RESP = '{"world_overview":"updated"}'
THEME_RESP = '{"statement":"ok"}'
NARR_RESP = '{"pov":"same"}'


async def test_supplement_runs_five_agents_in_parallel():
    mock = MockLLM(responses=[CHAR_RESP, PLOT_RESP, SETTING_RESP, THEME_RESP, NARR_RESP])
    svc = SupplementService(mock)
    results = await svc.run_supplement(
        {"summary": "本章测试", "key_events": []},
        {"project_id": "test"}
    )
    assert "character" in results
    assert "plot" in results
    assert "setting" in results
    assert "theme" in results
    assert "narrative" in results
    assert len(mock.calls) == 5
