"""Turn a yt.sh fetch file into a Markdown note with properties, and print the note's path.

  note.py <fetch file> <notes dir>
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
        body += ["## Description", "", v["description"], ""]
    if v["channel_url"]:
        body += [f"- Youtube: {v['channel_url']}", ""]
    body += ["## Transcript", "", v["transcript"], ""]
    return "\n".join(props + body)


def filename(title):
    # Drop characters file systems or note apps refuse, then collapse spaces.
    name = re.sub(r'[\\/:*?"<>|#^\[\]]', "", title)
    return re.sub(r"\s+", " ", name).strip()[:150] + ".md"


def main(src, out_dir):
    v = parse(pathlib.Path(src).read_text())
    out = pathlib.Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    path = out / filename(v["title"] or pathlib.Path(src).stem)
    path.write_text(render(v, datetime.date.today().isoformat()))
    print(f"{path} ({v['transcript'].count(chr(10)) + 1 if v['transcript'] else 0} caption lines)")


if __name__ == "__main__":
    if sys.argv[1:] == ["--test"]:
        sample = "# Talk: A/B w/ Guest\n# Chan | 20260429 | 29:49 | https://www.youtube.com/@chan\n# https://www.youtube.com/watch?v=96jN2OCOfLs\n\n> Line one\n>\n> Line two\n\n# captions: manual\n[0:00] hi\n[0:02] there\n"
        v = parse(sample)
        note = render(v, "2026-11-16")
        assert v["published"] == "2026-04-29" and v["captions"] == "manual", v
        assert "source: https://www.youtube.com/watch?v=96jN2OCOfLs" in note and 'duration: "29:49"' in note
        assert "## Description\n\nLine one\n\nLine two\n" in note and "- Youtube: https://www.youtube.com/@chan" in note
        assert note.rstrip().endswith("[0:02] there"), note
        assert filename(v["title"]) == "Talk AB w Guest.md", filename(v["title"])
        print("ok")
        sys.exit(0)
    if len(sys.argv) != 3:
        print(__doc__, file=sys.stderr)
        sys.exit(64)
    main(sys.argv[1], sys.argv[2])
