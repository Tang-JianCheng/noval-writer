from src.services.summary_service import SummaryService


def test_generate_aggregate_summary():
    summaries = [
        {"summary": "第一章内容", "key_events": ["觉醒天赋"]},
        {"summary": "第二章内容", "key_events": ["进入宗门"]},
    ]
    result = SummaryService.generate_aggregate_summary(summaries, 1, 2)
    assert "第1-2章" in result["range"]
    assert result["chapters_covered"] == 2
    assert len(result["key_events"]) == 2


def test_should_aggregate_at_chapter_10():
    assert SummaryService.should_aggregate(10) is True
    assert SummaryService.should_aggregate(20) is True
    assert SummaryService.should_aggregate(30) is True


def test_should_not_aggregate_at_chapter_5():
    assert SummaryService.should_aggregate(5) is False
    assert SummaryService.should_aggregate(0) is False
    assert SummaryService.should_aggregate(11) is False
