import json
import re


class OutputParseError(Exception):
    pass


def parse_json(text: str) -> dict | list:
    text = text.strip()
    md = re.search(r'```(?:json)?\s*([\s\S]*?)```', text)
    if md:
        text = md.group(1).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    repaired = re.sub(r',\s*([}\]])', r'\1', text)
    try:
        return json.loads(repaired)
    except json.JSONDecodeError:
        pass
    open_b = repaired.count('{') - repaired.count('}')
    open_a = repaired.count('[') - repaired.count(']')
    repaired += ']' * open_a + '}' * open_b
    try:
        return json.loads(repaired)
    except json.JSONDecodeError:
        raise OutputParseError(f"Cannot parse: {text[:200]}")


def extract_section(text: str, start_marker: str, end_marker: str | None) -> str:
    pattern = re.escape(f"[{start_marker}]")
    m = re.search(pattern, text)
    if not m:
        return ""
    start = m.end()
    if end_marker:
        end_p = re.escape(f"[{end_marker}]")
        end_m = re.search(end_p, text[start:])
        return text[start:start + end_m.start()].strip() if end_m else text[start:].strip()
    return text[start:].strip()
