---
name: youtube-transcript
description: Finds a YouTube video from a URL, an ID, a title, a channel name or a photo of the player, and saves its timestamped transcript to a file. Use when the user shares a YouTube link or screenshot and wants the transcript, wants a video summarized, or asks what a video said. Triggers include "get the transcript", "transcribe this video", "find this YouTube video", "what did this video say", or a photo of a YouTube page with any ask. Reach for it even when the ask is only "summarize this video", since the summary has to come from the transcript.
license: MIT
compatibility: Requires bash and Python 3. The script installs youtube-transcript-api and yt-dlp (scripts/requirements.txt) into a private venv on first use; a yt-dlp CLI on PATH is used when present. Without network access, the transcript can be copied by hand in the shape references/schemas/yt.schema.md gives.
argument-hint: "<url | id | title | screenshot>"
---

# YouTube transcript

`scripts/yt.sh` does the work. Output shapes and exit codes: [references/schemas/yt.schema.md](references/schemas/yt.schema.md).

1. A URL or 11-character ID: go to step 3.
2. Anything else: read every clue (title, channel, duration from the `9:06 / 9:16` counter, upload age), then run `yt.sh search "<title> <channel>"` and, if needed, `yt.sh channel @<handle>`. Channels A/B test titles, so confirm by channel and duration (within 1s), not title. If two candidates still fit, ask in one line naming both.
3. When `YT_NOTES_DIR` is set, run `yt.sh save <id|url>`: it writes a Markdown note there and rebuilds the folder's `index.md`, or prints the existing note's path without fetching again. Otherwise run `yt.sh fetch <id|url>`. Either prints the file's path and caption count.
4. Report the title, channel, URL and file path, and answer from the file. A saved note holds the transcript as one paragraph per minute, each opening with the exact time its first sentence starts, linked to that moment in the video; give those links when citing a moment. For a fetched `.txt` file, read `yt.sh text <file>` instead of the file: the same paragraphs, far fewer tokens. Never write a summary into a saved note; it holds only the source. Don't paste the transcript into chat. Warn that auto captions garble numbers and names.

On exit 4 (no transcript or a blocked request), say so in one line; blocks hit cloud addresses more than home ones. Transcribe audio only when asked, since it costs far more. On exit 3, the one-time install failed: ask the user to paste the video's "Show transcript" panel instead.
