# yt.sh output

Each command prints plain text, so an agent without the dependencies can write the same output by hand.

## search

One line per hit, at most 8, fields split by a pipe with a space on each side:

```text
<11-char id> | <title> | <channel> | <duration m:ss or h:mm:ss>
```

## channel

One line per upload, newest first, at most `n`:

```text
<11-char id> | <title> | <duration>
```

## fetch

Writes `<out_dir>/<id>.txt` and prints `<path> (<count> caption lines)`. The file holds a header, one blank line, the video's description with each line quoted by `> `, one blank line, then one line per caption:

```text
# <title>
# <channel> | <upload date YYYYMMDD> | <duration>
# <the video's watch-page URL>

> <description line, with its links>
>
> <description line>

[m:ss] <caption text, whitespace collapsed to single spaces>
```

A video with no description has no `>` lines. When the metadata lookup fails, the header is the single line `# <id>` and there is no description. Minutes keep counting past 59, so a caption at one hour five minutes reads `[65:00]`.

## Exit codes

- `0`: success.
- `2`: unknown command; usage goes to stderr.
- `3`: a dependency is missing; stderr names it and the install command.
- Any other non-zero code comes from yt-dlp or the transcript library, such as a video with no captions or a blocked request.

## By hand

Open the video page, choose "Show transcript" under the description, and copy the lines into the same `[m:ss] text` shape under the header above.
