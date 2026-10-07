import json

import pytest

from app.services.errors import UnprocessableError, UnsupportedMediaError
from app.services.transcript_parser import detect_format, parse_transcript


def test_detect_format():
    assert detect_format("Meeting.VTT") == "vtt"
    with pytest.raises(UnsupportedMediaError):
        detect_format("notes.docx")


def test_txt_timestamp_forms_and_continuations():
    segs = parse_transcript("[1:30] Bob Ray: Mid.\nmore of the same turn\n[01:02:03] Ann: Late start.", "txt")
    assert [s.start_ms for s in segs] == [90_000, 3_723_000]
    assert segs[0].text == "Mid. more of the same turn" and segs[0].speaker == "Bob Ray"


def test_txt_out_of_order_timestamps_keep_file_order_without_overlap():
    segs = parse_transcript("[01:00] Ann: Later first.\n[00:05] Bob: Earlier second.", "txt")
    assert [s.speaker for s in segs] == ["Ann", "Bob"]
    assert segs[0].end_ms <= segs[1].start_ms


def test_txt_without_timestamps_is_estimated_deterministically():
    text = "Ann: one two three four five six.\nBob: seven eight nine ten.\nAnn: eleven twelve."
    a, b = parse_transcript(text, "txt"), parse_transcript(text, "txt")
    assert a == b
    assert all(s.end_ms > s.start_ms for s in a)
    assert all(x.end_ms <= y.start_ms for x, y in zip(a, a[1:]))


def test_txt_partial_timestamps_fill_the_gaps():
    segs = parse_transcript("[00:10] Ann: Hello there.\nBob: No stamp here at all.\n[01:00] Ann: Back again.", "txt")
    assert segs[0].start_ms == 10_000 and segs[2].start_ms == 60_000
    assert segs[0].end_ms <= segs[1].start_ms < segs[1].end_ms <= segs[2].start_ms


def test_vtt_voice_tags_prefixes_and_markup():
    vtt = (
        "WEBVTT\n\nSTYLE\n::cue { color: red }\n\n"
        "cue-1\n00:01.000 --> 00:03.000\n<v.loud Ann>Hello <b>there</b> &amp; welcome</v>\n\n"
        "00:00:04.000 --> 00:00:06.250\nBob: Hi\nthere\n\n"
        "00:00:07,000 --> 00:00:08,000\nNo speaker here\n"
    )
    s = parse_transcript(vtt, "vtt")
    assert [(x.speaker, x.start_ms, x.end_ms, x.text) for x in s] == [
        ("Ann", 1000, 3000, "Hello there & welcome"),
        ("Bob", 4000, 6250, "Hi there"),
        ("Unknown Speaker", 7000, 8000, "No speaker here"),
    ]


def test_json_detects_seconds_and_milliseconds():
    sec = parse_transcript(json.dumps([{"speaker": "A", "start": 1.5, "end": 4, "text": "hi"}]), "json")
    assert (sec[0].start_ms, sec[0].end_ms) == (1500, 4000)
    whole_sec = parse_transcript(json.dumps([{"speaker": "A", "start": 10, "end": 40, "text": "hi"}]), "json")
    assert (whole_sec[0].start_ms, whole_sec[0].end_ms) == (10_000, 40_000)
    ms = parse_transcript(json.dumps([{"speaker": "A", "start": 1000, "end": 4500, "text": "hi"}]), "json")
    assert (ms[0].start_ms, ms[0].end_ms) == (1000, 4500)
    big = parse_transcript(json.dumps([{"speaker": "A", "start": 600000, "end": 650000, "text": "hi"}]), "json")
    assert big[0].start_ms == 600_000
    wrapped = parse_transcript(json.dumps({"segments": [{"speaker": "A", "start": 0, "text": "x y"}]}), "json")
    assert wrapped[0].end_ms > 0  # missing end is estimated


def test_overlaps_are_clamped():
    data = [{"speaker": "A", "start": 0, "end": 10, "text": "a"}, {"speaker": "B", "start": 4, "end": 6, "text": "b"}]
    s = parse_transcript(json.dumps(data), "json")
    assert s[0].end_ms == 4000 and s[1].start_ms == 4000


@pytest.mark.parametrize(
    ("content", "fmt"),
    [
        ("", "txt"), ("   ", "vtt"), ("no labels at all", "txt"), ("hello", "vtt"), ("WEBVTT\n\nbad\n00:00 --> x\ntext", "vtt"),
        ("WEBVTT\n", "vtt"), ("{", "json"), ("[]", "json"), ('{"a":1}', "json"), ('[1]', "json"),
        ('[{"text":"x"}]', "json"), ('[{"start":0,"text":""}]', "json"), ('[{"start":5,"end":1,"text":"x"}]', "json"),
        ('[{"start":"1","text":"x"}]', "json"),
    ],
)
def test_unparseable_input_is_rejected_with_a_message(content, fmt):
    with pytest.raises(UnprocessableError) as exc:
        parse_transcript(content, fmt)
    assert exc.value.detail
