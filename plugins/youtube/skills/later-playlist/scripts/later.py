"""Turn gog's JSON pages (one document per stdin line) into compact rows.

  later.py playlist <title>   print the id of the playlist with that exact title (case-insensitive)
  later.py list               n, id, title, channel, added (tab-separated)
  later.py find "<words>"     the 5 rows that best match the words, best first
"""
import json
import re
import sys


def items(stdin):
    for line in stdin:
        if line.strip():
            doc = json.loads(line)
            yield from doc.get("items") or doc.get("playlists") or doc.get("results") or []


def field(item, *paths):
    for path in paths:
        value = item
        for key in path.split("."):
            value = value.get(key) if isinstance(value, dict) else None
        if value:
            return str(value)
    return ""


def row(n, item):
    vid = field(item, "contentDetails.videoId", "snippet.resourceId.videoId", "videoId", "video_id")
    title = field(item, "snippet.title", "title")
    channel = field(item, "snippet.videoOwnerChannelTitle", "videoOwnerChannelTitle", "channel", "channelTitle")
    added = field(item, "snippet.publishedAt", "publishedAt", "addedAt")[:10]
    return "\t".join([str(n), vid, title.replace("\t", " "), channel.replace("\t", " "), added])


def words(text):
    return set(re.findall(r"[a-z0-9]+", text.lower()))


def main(argv, stdin):
    cmd = argv[1] if len(argv) > 1 else ""
    if cmd == "playlist":
        want = argv[2].casefold()
        for p in items(stdin):
            if field(p, "snippet.title", "title").casefold() == want:
                print(field(p, "id"))
                return 0
        return 0
    # Deleted and private videos stay in a playlist with no channel; drop them.
    rows = [row(n, it) for n, it in enumerate(items(stdin), 1) if row(n, it).split("\t")[3]]
    if cmd == "list":
        print("\n".join(rows) if rows else "(empty)")
        return 0
    if cmd == "find":
        query = words(argv[2])
        scored = [(len(query & words(" ".join(r.split("\t")[2:4]))), r) for r in rows]
        best = sorted((s for s in scored if s[0]), key=lambda s: -s[0])[:5]
        print("\n".join(r for _, r in best) if best else "(no match)")
        return 0
    print(__doc__, file=sys.stderr)
    return 64


if __name__ == "__main__":
    # Self-check on a fake page: python3 later.py --test
    if sys.argv[1:] == ["--test"]:
        import io
        page = json.dumps({"items": [
            {"snippet": {"title": "Rust in 100 Seconds", "videoOwnerChannelTitle": "Fireship",
                         "publishedAt": "2026-11-01T00:00:00Z"}, "contentDetails": {"videoId": "5C_HPTJg5ek"}},
            {"snippet": {"title": "Deleted video", "publishedAt": "2026-11-02T00:00:00Z"},
             "contentDetails": {"videoId": "xxxxxxxxxxx"}},
            {"snippet": {"title": "CSS has-selector deep dive", "videoOwnerChannelTitle": "Kevin Powell",
                         "publishedAt": "2026-11-03T00:00:00Z"}, "contentDetails": {"videoId": "OGJvhpoE8b4"}},
        ]})
        out = io.StringIO()
        sys.stdout, real = out, sys.stdout
        main(["", "list"], io.StringIO(page))
        main(["", "find", "the kevin powell css one"], io.StringIO(page))
        sys.stdout = real
        lines = out.getvalue().splitlines()
        assert lines[0] == "1\t5C_HPTJg5ek\tRust in 100 Seconds\tFireship\t2026-11-01", lines
        assert len(lines) == 3 and lines[2].startswith("3\tOGJvhpoE8b4"), lines
        print("ok")
        sys.exit(0)
    sys.exit(main(sys.argv, sys.stdin))
