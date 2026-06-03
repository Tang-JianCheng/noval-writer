"""Summary generation and aggregation service."""


class SummaryService:
    @staticmethod
    def generate_aggregate_summary(summaries: list[dict], start_chapter: int, end_chapter: int) -> dict:
        """Aggregate N chapter summaries into 1 compressed summary."""
        combined = " ".join(s.get("summary", "") for s in summaries)
        events = []
        for s in summaries:
            events.extend(s.get("key_events", []))

        return {
            "range": f"第{start_chapter}-{end_chapter}章",
            "summary": combined[:500],
            "key_events": events[:20],
            "chapters_covered": end_chapter - start_chapter + 1,
        }

    @staticmethod
    def should_aggregate(chapter_number: int) -> bool:
        """Check if aggregation should trigger (every 10 chapters)."""
        return chapter_number > 0 and chapter_number % 10 == 0
