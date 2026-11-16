"""Turn a yt.sh fetch file into a Markdown note with properties, rebuild index.md, and print the note's path.

  note.py <fetch file> <notes dir>
  note.py --source <note> <dir> <phrase> <url> <author|found> <confirmed by>   add a link to the note's linked copy in dir
  note.py --relink <note> <dir>   rebuild the linked copy from the note and the copy's own link table
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


MD_LINK = re.compile(r"\[[^\]]*\]\([^)]*\)")


def add_link(note, phrase, url, kind):
    # Wraps words already spoken, never adds or rewords any; the title records where the URL came from.
    if kind not in ("author", "found") or not re.fullmatch(r"https?://[^\s()\"]+", url) or "[" in phrase or "]" in phrase:
        raise ValueError(f"bad link: {phrase!r} {url!r} {kind!r}")
    head, sep, tr = note.partition("## Transcript\n\n")
    taken = [m.span() for m in MD_LINK.finditer(tr)]
    for m in re.finditer(re.escape(phrase), tr):
        if not any(a < m.end() and m.start() < b for a, b in taken):
            return head + sep + tr[:m.start()] + f'[{phrase}]({url} "{kind}")' + tr[m.end():]
    raise LookupError(f"no unlinked mention of {phrase!r} in the transcript")


ROW = re.compile(r"^\| \[[\d:]+\]\([^)]*\) \| (.*?) \| \[[^\]]*\]\(([^)]*)\) \| (author|found) \| (.*) \|$", re.M)


def cell(text):
    return text.replace("|", "\\|").replace("\n", " ")


def linked_copy(note, stem, links, today):
    # Agent links live only in this copy; the note keeps the source as scripts made it.
    body = "## Transcript\n\n" + note.partition("## Transcript\n\n")[2]
    rows = []
    for phrase, url, kind, why in links:
        body = add_link(body, phrase, url, kind)
        para = next(l for l in body.splitlines() if f"[{phrase}]({url} " in l)
        rows.append((seconds(re.match(r"\[([\d:]+)\]", para)[1]), f"| {para.split(' ', 1)[0]} | {cell(phrase)} | [{url.split('/')[2]}]({url}) | {kind} | {cell(why)} |"))
    title = re.search(r"^# (.+)$", note, re.M)[1]
    return "\n".join([
        "---", f'source: "[[{stem}]]"', f"video: {re.search(r'^source: (.+)$', note, re.M)[1]}", f"linked: {today}", "tags: [youtube, sources]", "---", "",
        f"# {title} (linked)", "",
        f"Agent-made: an agent chose every link below, and any of them may be wrong. The transcript words are copied unchanged from [[{stem}|the original note]].", "",
        "## Links", "", "| Time | Words | Link | Kind | Confirmed by |", "| --- | --- | --- | --- | --- |",
        *[r for _, r in sorted(rows, key=lambda r: r[0])], "", body.rstrip("\n"), ""])


def write_copy(note_path, out_dir, new=None):
    note_path, out = pathlib.Path(note_path), pathlib.Path(out_dir)
    copy = out / f"{note_path.stem} (linked).md"
    links = [(m[1].replace("\\|", "|"), m[2], m[3], m[4].replace("\\|", "|")) for m in ROW.finditer(copy.read_text())] if copy.exists() else []
    if new:
        if any(l[0] == new[0] and l[1] == new[1] for l in links):
            raise ValueError(f"already linked: {new[0]!r}")
        links.append(new)
    note = note_path.read_text()
    text = linked_copy(note, note_path.stem, links, datetime.date.today().isoformat())
    out.mkdir(parents=True, exist_ok=True)
    copy.write_text(text)
    # The note only gains a property pointing at the copy.
    head, sep, rest = note.partition("\n---\n")
    if note.startswith("---\n") and sep and "\nlinked: " not in head:
        note_path.write_text(head + f'\nlinked: "[[{copy.stem}]]"' + sep + rest)
    return copy


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
        talk = "## Transcript\n\n[0:00](https://youtu.be/96jN2OCOfLs?t=0) I went to the AI Code Summit. It was the AI Code Summit"
        one = add_link(talk, "AI Code Summit", "https://example.com/summit", "found")
        assert one.endswith('I went to the [AI Code Summit](https://example.com/summit "found"). It was the AI Code Summit'), one
        two = add_link(one, "AI Code Summit", "https://example.com/summit", "author")
        assert two.endswith('It was the [AI Code Summit](https://example.com/summit "author")') and two.count("](https://example.com") == 2
        assert prose(two, "96jN2OCOfLs") == two.partition("## Transcript\n\n")[2]
        for bad in [("Nope", "https://x.y", "found"), ("AI Code Summit", "javascript:x", "found"), ("AI Code Summit", "https://x.y", "guess")]:
            try:
                add_link(two if bad[0] == "AI Code Summit" else talk, *bad)
                raise AssertionError(bad)
            except (ValueError, LookupError):
                pass
        with tempfile.TemporaryDirectory() as d:
            n = pathlib.Path(d) / "Talk.md"
            n.write_text("---\nsource: https://www.youtube.com/watch?v=96jN2OCOfLs\ntags: [youtube]\n---\n\n# Talk\n\n" + talk + "\n\n[1:05](https://youtu.be/96jN2OCOfLs?t=65) Boris Cherny said so.\n")
            before = n.read_text().partition("\n---\n")[2]
            c = write_copy(n, d, ("Boris Cherny", "https://borischerny.com/about/", "found", "His site | says so"))
            write_copy(n, d, ("AI Code Summit", "https://example.com/summit", "author", "In the description"))
            text = c.read_text()
            assert c.name == "Talk (linked).md" and 'source: "[[Talk]]"' in text, text
            assert text.index("| [0:00](") < text.index("| [1:05](") and "His site \\| says so" in text, text
            assert '[Boris Cherny](https://borischerny.com/about/ "found")' in text and '[AI Code Summit](https://example.com/summit "author")' in text
            assert n.read_text().partition("\n---\n")[2] == before and '\nlinked: "[[Talk (linked)]]"\n' in n.read_text()
            assert write_copy(n, d).read_text() == text
            for bad in [("Nope", "https://x.y", "found", "x"), ("Boris Cherny", "https://borischerny.com/about/", "found", "again")]:
                try:
                    write_copy(n, d, bad)
                    raise AssertionError(bad)
                except (ValueError, LookupError):
                    pass
            assert c.read_text() == text
        print("ok")
        sys.exit(0)
    if len(sys.argv) in (4, 8) and sys.argv[1] in ("--source", "--relink"):
        try:
            copy = write_copy(sys.argv[2], sys.argv[3], tuple(sys.argv[4:8]) if sys.argv[1] == "--source" else None)
        except (ValueError, LookupError) as e:
            print(e, file=sys.stderr)
            sys.exit(1)
        print(copy)
        sys.exit(0)
    if len(sys.argv) == 3 and sys.argv[1] == "--text":
        text = pathlib.Path(sys.argv[2]).read_text()
        print(prose(text, video_id(text)))
        sys.exit(0)
    if len(sys.argv) != 3:
        print(__doc__, file=sys.stderr)
        sys.exit(64)
    main(sys.argv[1], sys.argv[2])
