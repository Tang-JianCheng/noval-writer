import pytest
from src.utils.output_parser import parse_json, extract_section, OutputParseError


def test_parse_valid_json():
    assert parse_json('{"name":"林风"}') == {"name": "林风"}


def test_fix_trailing_comma():
    assert parse_json('{"name":"林风",}') == {"name": "林风"}


def test_fix_unclosed_bracket():
    assert parse_json('{"items":["sword","pill"') == {"items": ["sword", "pill"]}


def test_extract_from_markdown_block():
    assert parse_json('```json\n{"k":"v"}\n```') == {"k": "v"}


def test_unfixable_raises():
    with pytest.raises(OutputParseError):
        parse_json('{{{bad')


def test_extract_section():
    text = "[CHARACTERS]\n林风\n[PLOT]\n大比"
    assert "林风" in extract_section(text, "CHARACTERS", "PLOT")
    assert "大比" in extract_section(text, "PLOT", None)


def test_extract_section_not_found():
    assert extract_section("没有标签", "CHARACTERS", "PLOT") == ""
