"""Turn a yt.sh fetch file into a Markdown note with properties, rebuild index.md, and print the note's path.

  note.py <fetch file> <notes dir>
  note.py --text <note or fetch file>   print the transcript as one paragraph per minute, "[12m] ..."
  note.py --test
"""
import datetime
import pathlib
import re
import sys


def parse(text):
    head, desc, caps, kind = [], [], [], "auto-generated"
    for line in text.splitlines():
        if line.startswith("[") and re.match(r"\[\d+:\d\d\]", line):
            caps.append(line)
        elif line.startswith("# captions: "):
            kind = line[len("# captions: "):]
        elif line.startswith("> ") or line == ">":
            desc.append(line[2:])
        elif line.startswith("# "):
            head.append(line[2:])
    title = head[0] if head else ""
    channel, date, duration, channel_url = (head[1].split(" | ") + [""] * 4)[:4] if len(head) > 2 else ("", "", "", "")
    url = head[-1] if len(head) > 2 else ""
    if re.fullmatch(r"\d{8}", date):
        date = f"{date[:4]}-{date[4:6]}-{date[6:]}"
    return dict(title=title, channel=channel, published=date, duration=duration, channel_url=channel_url,
                url=url, captions=kind, description="\n".join(desc).strip(), transcript="\n".join(caps))


CHAPTER = re.compile(r"\(?\d{1,2}(:\d\d){1,2}\)?\s")


LIST_ITEM = re.compile(r"([-*+]|\d+\.)\s")


def chapters(desc):
    # Chapter lines ("0:00 Intro", "(0:18) - Rule") become a Markdown ordered list; "1." on every line lets Markdown number them.
    lines = [f"1. {l}" if CHAPTER.match(l) else l for l in desc.splitlines()]
    out = []
    for l in lines:
        # Markdown joins back-to-back plain lines into one paragraph, so split them unless both are list items.
        if out and out[-1].strip() and l.strip() and not (LIST_ITEM.match(out[-1]) and LIST_ITEM.match(l)):
            out.append("")
        out.append(l)
    return "\n".join(out)


def render(v, today):
    props = [
        "---",
        f"source: {v['url']}",
        f"channel: {v['channel']}",
        f"published: {v['published']}",
        f'duration: "{v["duration"]}"',
        f"saved: {today}",
        f"captions: {v['captions']}",
        "tags: [youtube]",
        "---",
        "",
        f"# {v['title']}",
        "",
    ]
    body = []
    if v["description"]:
        body += ["## Description", "", chapters(v["description"]), ""]
    if v["channel_url"]:
        body += [f"- Youtube: {v['channel_url']}", ""]
    body += ["## Transcript", "", prose(v["transcript"]), ""]
    return "\n".join(props + body)


def filename(title):
    # Drop characters file systems or note apps refuse, then collapse spaces.
    name = re.sub(r'[\\/:*?"<>|#^\[\]]', "", title)
    return re.sub(r"\s+", " ", name).strip()[:150] + ".md"


def props(text):
    head = text.split("\n---\n", 1)[0].splitlines()[1:] if text.startswith("---\n") else []
    v = dict(l.split(": ", 1) for l in head if ": " in l)
    v["title"] = next((l[2:] for l in text.splitlines() if l.startswith("# ")), "")
    return v


def index(out_dir):
    # Rebuilt from every note's properties, so edits and deletions never leave it stale.
    rows = []
    for f in pathlib.Path(out_dir).glob("*.md"):
        if f.name == "index.md":
            continue
        v = props(f.read_text())
        title = v["title"].replace("|", "\\|") or f.stem
        rows.append((v.get("saved", ""), f"| {v.get('saved', '')} | [{title}](<{f.name}>) | {v.get('channel', '')} | {v.get('duration', '').strip(chr(34))} |"))
    lines = ["# YouTube notes", "", "| Saved | Title | Channel | Length |", "| --- | --- | --- | --- |"]
    lines += [r for _, r in sorted(rows, key=lambda r: r[0], reverse=True)]
    (pathlib.Path(out_dir) / "index.md").write_text("\n".join(lines) + "\n")


SENTENCE_END = re.compile(r"[.?!][\"')\]]*$")


def prose(text):
    # Timestamps cost about a third of an agent's tokens; one marker per minute keeps rough timing.
    # Reads caption lines ("[1:02:03] text") or saved minute paragraphs ("[62m] text"), so regrouping is idempotent.
    text = text.partition("## Transcript\n\n")[2] or text
    words = []
    for m in re.finditer(r"^\[(?:(?:(\d+):)?(\d+):\d\d|(\d+)m)\] ?(.*)$", text, re.M):
        minute = int(m[3]) if m[3] else int(m[1] or 0) * 60 + int(m[2])
        words += [(w, minute) for w in m[4].split()]
    # Each sentence goes under the minute its first word was said; unpunctuated captions break at the minute after 60 words.
    paras, sentence = {}, []
    for i, (w, minute) in enumerate(words):
        sentence.append(w)
        nxt = words[i + 1][1] if i + 1 < len(words) else None
        if SENTENCE_END.search(w) or nxt is None or (len(sentence) >= 60 and nxt != minute):
            paras.setdefault(words[i + 1 - len(sentence)][1], []).append(" ".join(sentence))
            sentence = []
    return "\n\n".join(f"[{k}m] " + " ".join(v) for k, v in paras.items())


def main(src, out_dir):
    v = parse(pathlib.Path(src).read_text())
    out = pathlib.Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    path = out / filename(v["title"] or pathlib.Path(src).stem)
    path.write_text(render(v, datetime.date.today().isoformat()))
    index(out)
    print(f"{path} ({v['transcript'].count(chr(10)) + 1 if v['transcript'] else 0} caption lines)")


if __name__ == "__main__":
    if sys.argv[1:] == ["--test"]:
        sample = "# Talk: A/B w/ Guest\n# Chan | 20260429 | 29:49 | https://www.youtube.com/@chan\n# https://www.youtube.com/watch?v=96jN2OCOfLs\n\n> Line one\n> 16: Age line\n>\n> 0:00 Intro\n> (1:02:03) - Q&A\n> After\n\n# captions: manual\n[0:00] hi\n[0:02] there\n"
        v = parse(sample)
        note = render(v, "2026-11-16")
        assert v["published"] == "2026-04-29" and v["captions"] == "manual", v
        assert "source: https://www.youtube.com/watch?v=96jN2OCOfLs" in note and 'duration: "29:49"' in note
        assert "## Description\n\nLine one\n\n16: Age line\n\n1. 0:00 Intro\n1. (1:02:03) - Q&A\n\nAfter\n" in note, note
        assert chapters(chapters(v["description"])) == chapters(v["description"]) and "- Youtube: https://www.youtube.com/@chan" in note
        assert note.rstrip().endswith("## Transcript\n\n[0m] hi there"), note
        assert prose(note) == "[0m] hi there"
        assert filename(v["title"]) == "Talk AB w Guest.md", filename(v["title"])
        import tempfile
        with tempfile.TemporaryDirectory() as d:
            (pathlib.Path(d) / "Talk AB w Guest.md").write_text(note)
            index(d)
            idx = (pathlib.Path(d) / "index.md").read_text()
            assert "| 2026-11-16 | [Talk: A/B w/ Guest](<Talk AB w Guest.md>) | Chan | 29:49 |" in idx, idx
            index(d)
            assert idx.count("| [") == (pathlib.Path(d) / "index.md").read_text().count("| [") == 1
        caps = "[0:00] Hi there. This\n[0:59] runs on\n[1:00] past. Next one\n[1:30] here?\n[1:02:03] Late."
        assert prose(caps) == "[0m] Hi there. This runs on past.\n\n[1m] Next one here?\n\n[62m] Late.", prose(caps)
        assert prose(prose(caps)) == prose(caps)
        flat = "[0:00] " + "w " * 70 + "\n[1:00] " + "x " * 5
        assert prose(flat) == "[0m] " + " ".join(["w"] * 70) + "\n\n[1m] x x x x x", prose(flat)
        print("ok")
        sys.exit(0)
    if len(sys.argv) == 3 and sys.argv[1] == "--text":
        print(prose(pathlib.Path(sys.argv[2]).read_text()))
        sys.exit(0)
    if len(sys.argv) != 3:
        print(__doc__, file=sys.stderr)
        sys.exit(64)
    main(sys.argv[1], sys.argv[2])
