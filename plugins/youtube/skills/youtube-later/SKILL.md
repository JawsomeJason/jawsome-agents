---
name: youtube-later
description: Lists the user's own YouTube playlist named "Later" (not the built-in Watch Later), or finds one saved video in it from a few words and fetches its transcript. Use when the user asks what is on their Later list or names a video they saved and wants it summarized or transcribed. Triggers include "/youtube-later", "show my Later playlist", "what did I save to watch", or "summarize the X video from Later". Reach for it even when the ask only says "my saved videos" or "that video I saved".
license: MIT
compatibility: Requires bash, Python 3 and the gog CLI with a YouTube read-only token. The account is the gog alias `youtube` (`gog auth alias set youtube <email>`), or LATER_ACCOUNT.
argument-hint: "[words from the video's title or channel]"
---

# Later playlist

`scripts/later.sh` does every lookup, read-only. Output shapes and exit codes: [references/schemas/later.schema.md](references/schemas/later.schema.md).

1. No words given: run `scripts/later.sh list` and show a numbered list of title and channel. Stop there; summarizing unasked spends tokens.
2. Words given: run `scripts/later.sh find "<words>"`. It prints up to 5 rows, best match first.
3. Pick the video:
   - One clear fit: go to step 4.
   - Several fit equally: ask in one line naming each by title and channel.
   - `(no match)`: run `list`, pick by meaning, and ask if none fits.
4. Hand its video id to the `youtube-transcript` skill, from its fetch step, and answer from the file it writes.

On exit 2, run the `gog auth add` command the script prints in the background, ask the user to approve the browser sign-in, then rerun. On exit 4, say no playlist has that title.
