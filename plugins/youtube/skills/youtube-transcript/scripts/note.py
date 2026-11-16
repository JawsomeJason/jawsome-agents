"""Turn a yt.sh fetch file into a Markdown note with properties, rebuild index.md, and print the note's path.

  note.py <fetch file> <notes dir>
  note.py --text <note or fetch file>   print the transcript as one paragraph per minute, "[12:04] ..."
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


SEPARATOR = re.compile(r"\s*([-_*=~━─═—–])(\s*\1){2,}\s*\\?$")


def kind(line):
    return "separator" if SEPARATOR.match(line) else "list" if LIST_ITEM.match(line) else "text"


def seconds(stamp):
    *h, m, s = (int(x) for x in stamp.split(":"))
    return (h[0] if h else 0) * 3600 + m * 60 + s


def link(stamp, vid):
    return f"[{stamp}](https://youtu.be/{vid}?t={seconds(stamp)})" if vid else f"[{stamp}]"


def video_id(text):
    m = re.search(r"watch\?v=([\w-]{11})", text)
    return m[1] if m else None


def chapter(line, vid):
    # "0:00 Intro" or "1. (0:18) - Rule" -> "1. [0:00](link) Intro"; a line already linked no longer matches.
    m = re.match(r"(?:1\. )?(\(?)(\d{1,2}(?::\d\d){1,2})(\)?)(\s.*)$", line)
    if not m or not (CHAPTER.match(line) or line.startswith("1. ")):
        return line
    return f"1. {m[1]}{link(m[2], vid) if vid else m[2]}{m[3]}{m[4]}"


def chapters(desc, vid=None):
    # Chapter lines ("0:00 Intro", "(0:18) - Rule") become a Markdown ordered list; "1." on every line lets Markdown number them.
    # With a video id, each chapter time links to that moment.
    lines = [chapter(l, vid) for l in desc.splitlines()]
    out = []
    for l in lines:
        prev = out[-1] if out else ""
        # Markdown joins back-to-back lines into one paragraph: a trailing "\\" breaks between plain lines.
        # A list next to plain text needs a blank line or it swallows the text, and a separator needs one
        # on each side or it turns the line above into a heading.
        if prev.strip() and l.strip():
            a, b = kind(prev), kind(l)
            if a == b == "text":
                out[-1] = prev.rstrip().rstrip("\\") + "\\"
            elif not a == b == "list":
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
        body += ["## Description", "", chapters(v["description"], video_id(v["url"])), ""]
    if v["channel_url"]:
        body += [f"- Youtube: {v['channel_url']}", ""]
    body += ["## Transcript", "", prose(v["transcript"], video_id(v["url"])), ""]
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


def stamp(sec):
    h, m, s = sec // 3600, sec // 60 % 60, sec % 60
    return f"{h}:{m:02}:{s:02}" if h else f"{m}:{s:02}"


def prose(text, vid=None):
    # Timestamps cost about a third of an agent's tokens; one per paragraph keeps the time a reader can jump to.
    # Saved paragraphs parse as caption lines too, so regrouping a note is idempotent.
    text = text.partition("## Transcript\n\n")[2] or text
    words = []
    for m in re.finditer(r"^\[(?:(\d+):)?(\d+):(\d\d)\](?:\([^)]*\))? ?(.*)$", text, re.M):
        sec = int(m[1] or 0) * 3600 + int(m[2]) * 60 + int(m[3])
        words += [(w, sec) for w in m[4].split()]
    # A paragraph holds the sentences whose first word was said in the same minute; it opens with that first word's time.
    # Unpunctuated captions break at the minute after 60 words.
    paras, sentence = {}, []
    for i, (w, sec) in enumerate(words):
        sentence.append(w)
        nxt = words[i + 1][1] // 60 if i + 1 < len(words) else None
        if SENTENCE_END.search(w) or nxt is None or (len(sentence) >= 60 and nxt != sec // 60):
            first = words[i + 1 - len(sentence)][1]
            paras.setdefault(first // 60, [first, []])[1].append(" ".join(sentence))
            sentence = []
    return "\n\n".join(f"{link(stamp(t), vid)} " + " ".join(v) for t, v in paras.values())


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
        sample = "# Talk: A/B w/ Guest\n# Chan | 20260429 | 29:49 | https://www.youtube.com/@chan\n# https://www.youtube.com/watch?v=96jN2OCOfLs\n\n> Line one\n> 16: Age line\n>\n> 0:00 Intro\n> (1:02:03) - Q&A\n> After\n> --------\n> FOR YOU:\n> --------\n> --------\n\n# captions: manual\n[0:00] hi\n[0:02] there\n"
        v = parse(sample)
        note = render(v, "2026-11-16")
        assert v["published"] == "2026-04-29" and v["captions"] == "manual", v
        assert "source: https://www.youtube.com/watch?v=96jN2OCOfLs" in note and 'duration: "29:49"' in note
        assert "## Description\n\nLine one\\\n16: Age line\n\n1. [0:00](https://youtu.be/96jN2OCOfLs?t=0) Intro\n1. ([1:02:03](https://youtu.be/96jN2OCOfLs?t=3723)) - Q&A\n\nAfter\n\n--------\n\nFOR YOU:\n\n--------\n\n--------\n" in note, note
        assert chapters(chapters(v["description"])) == chapters(v["description"]) and "- Youtube: https://www.youtube.com/@chan" in note
        assert note.rstrip().endswith("## Transcript\n\n[0:00](https://youtu.be/96jN2OCOfLs?t=0) hi there"), note
        assert prose(note, video_id(note)) == "[0:00](https://youtu.be/96jN2OCOfLs?t=0) hi there"
        assert filename(v["title"]) == "Talk AB w Guest.md", filename(v["title"])
        import tempfile
        with tempfile.TemporaryDirectory() as d:
            (pathlib.Path(d) / "Talk AB w Guest.md").write_text(note)
            index(d)
            idx = (pathlib.Path(d) / "index.md").read_text()
            assert "| 2026-11-16 | [Talk: A/B w/ Guest](<Talk AB w Guest.md>) | Chan | 29:49 |" in idx, idx
            index(d)
            assert idx.count("| [") == (pathlib.Path(d) / "index.md").read_text().count("| [") == 1
        caps = "[0:04] Hi there. This\n[0:59] runs on\n[1:00] past. Next one\n[1:30] here?\n[1:02:03] Late."
        assert prose(caps) == "[0:04] Hi there. This runs on past.\n\n[1:00] Next one here?\n\n[1:02:03] Late.", prose(caps)
        assert prose(prose(caps)) == prose(caps)
        flat = "[0:00] " + "w " * 70 + "\n[1:00] " + "x " * 5
        linked = prose(caps, "96jN2OCOfLs")
        assert linked.startswith("[0:04](https://youtu.be/96jN2OCOfLs?t=4) Hi there.") and "[1:02:03](https://youtu.be/96jN2OCOfLs?t=3723) Late." in linked, linked
        assert prose(linked, "96jN2OCOfLs") == linked and prose(linked) == prose(caps)
        desc = "Intro text\n0:35 Why now?\n(1:02:03) - Q&A"
        once = chapters(desc, "96jN2OCOfLs")
        assert once == "Intro text\n\n1. [0:35](https://youtu.be/96jN2OCOfLs?t=35) Why now?\n1. ([1:02:03](https://youtu.be/96jN2OCOfLs?t=3723)) - Q&A", once
        assert chapters(once, "96jN2OCOfLs") == once
        assert prose(flat) == "[0:00] " + " ".join(["w"] * 70) + "\n\n[1:00] x x x x x", prose(flat)
        print("ok")
        sys.exit(0)
    if len(sys.argv) == 3 and sys.argv[1] == "--text":
        text = pathlib.Path(sys.argv[2]).read_text()
        print(prose(text, video_id(text)))
        sys.exit(0)
    if len(sys.argv) != 3:
        print(__doc__, file=sys.stderr)
        sys.exit(64)
    main(sys.argv[1], sys.argv[2])
