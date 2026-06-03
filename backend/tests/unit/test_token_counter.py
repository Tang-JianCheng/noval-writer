from src.utils.token_counter import estimate_tokens

def test_chinese_characters_estimated():
    text = "宗门比武台上，林风握紧了手中的丹炉"
    tokens = estimate_tokens(text)
    assert 10 <= tokens <= 30

def test_empty_string_is_zero():
    assert estimate_tokens("") == 0

def test_mixed_chinese_english():
    text = "林风使用ChatGPT-style炼丹术"
    tokens = estimate_tokens(text)
    assert tokens > 0
