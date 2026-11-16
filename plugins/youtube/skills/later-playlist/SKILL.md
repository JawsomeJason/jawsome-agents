---
name: later-playlist
description: Lists the videos in the user's own YouTube playlist named "Later" (a playlist they made, not the built-in Watch Later), and finds one video in it from a few words to fetch its transcript. Use when the user asks what is on their Later list, wants to see the videos they saved, or names a saved video ("the Obsidian one on my Later list", "that TV operating system video I saved") and wants it summarized or transcribed. Triggers include "/later-playlist", "show my Later playlist", "what's in Later", "what did I save to watch", or "summarize the X video from Later". Reach for it even when the ask only says "my saved videos" or "that video I saved", since the Later playlist is where they save them.
license: MIT
compatibility: Requires bash, Python 3 and the gog CLI with a YouTube read-only token. The account is the gog alias `youtube` (set once with `gog auth alias set youtube <email>`), or LATER_ACCOUNT.
argument-hint: "[words from the video's title or channel]"
---

# Later playlist

`scripts/later.sh` does every lookup, read-only. Run it with no arguments to see usage; output shapes and exit codes are in [references/schemas/later.schema.md](references/schemas/later.schema.md). Rows are tab-separated: position, video id, title, channel, date added. Deleted and private videos are left out.

## No arguments: show the list

```bash
scripts/later.sh list
```

Show the rows as a short numbered list of title and channel, in playlist order. Leave out the ids unless asked. The list is the whole answer; don't summarize or rank the videos unless the user asks, because that costs tokens they didn't ask to spend.

## Words given: find the video, then get its transcript

```bash
scripts/later.sh find "<words>"
```

It prints up to 5 rows, best match first, ranked by how many of the words appear in the title or channel.

- One row clearly fits: hand its video id to the `youtube-transcript` skill and follow that skill from its fetch step. Do the summary or whatever else the user asked from the transcript file it writes.
- Two or more fit about equally: ask in one line that names each by title and channel.
- `(no match)`: run `later.sh list` and pick by meaning, since the words may describe the topic rather than quote the title. Ask if none fits.

## Errors

- Exit 2: the token expired. Run the `gog auth add` command the script prints, with the account's email, in the background; it opens a sign-in tab in the browser. Tell the user to approve it, then rerun.
- Exit 4: no playlist has that title. Say so; LATER_TITLE points the script at another title.
