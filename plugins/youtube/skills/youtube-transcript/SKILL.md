---
name: youtube-transcript
description: Finds a YouTube video from a URL, an ID, a title, a channel name or a photo of the player, and saves its timestamped transcript to a file. Use when the user shares a YouTube link or screenshot and wants the transcript, wants a video summarized, or asks what a video said. Triggers include "get the transcript", "transcribe this video", "find this YouTube video", "what did this video say", or a photo of a YouTube page with any ask. Reach for it even when the ask is only "summarize this video", since the summary has to come from the transcript.
license: MIT
compatibility: Requires bash and Python 3 with youtube-transcript-api and yt-dlp (scripts/requirements.txt); the yt-dlp CLI on PATH works in place of its package. Without them, the transcript can be copied by hand from the video page in the shape references/schemas/yt.schema.md gives.
argument-hint: "<url | id | title | screenshot>"
---

# YouTube transcript

`scripts/yt.sh` in this folder does the work. Run it with no arguments to see usage. Its output shapes are in [references/schemas/yt.schema.md](references/schemas/yt.schema.md).

## 0. Dependencies

When the script exits `3`, it names what is missing. Install `scripts/requirements.txt` into a virtual environment when the environment allows, and point `PYTHON` at that interpreter, so nothing lands in the system Python. When nothing can be installed, ask the user to open the video's "Show transcript" panel and paste it, then write it in the schema's shape.

## 1. Identify the video

A URL or an 11-character ID goes straight to step 2.

Otherwise, read every clue off the input: title, channel, duration (from the `9:06 / 9:16` counter), view count and upload age. Then search, and list the channel's newest uploads:

```bash
yt.sh search "<title> <channel>"
yt.sh channel @<handle>
```

Channels A/B test titles, so search may show a different title than the photo. Confirm the pick by channel, duration (within 1s) and upload age instead. `fetch` writes the title into the file header, and a match with the photo settles it.

If two candidates still fit, ask the user in one line that names both, because a summary of the wrong video is worse than a question.

## 2. Fetch

```bash
yt.sh fetch <id|url> <temp dir>/yt-$(date +%s)
```

The file holds a header with title, channel, date and URL, the description quoted with `> ` (its links often point to the talks and tools the video cites), then one `[m:ss] text` line per caption. Don't swap in `yt-dlp --write-auto-subs`: YouTube often blocks it with HTTP 429 or a proof-of-origin token wall. Requests from cloud and datacenter addresses get blocked more often than home connections, so on a block, say where the run came from.

If the video has no captions, say so. Transcribe the audio only when the user asks, because it costs far more than a caption fetch.

## 3. Report

- The title, channel, URL and transcript path.
- A summary built from the file. Don't paste the transcript into chat, because it floods the context and the file already holds it.
- A warning that auto captions garble numbers and names, so check a figure against the video before quoting it.
