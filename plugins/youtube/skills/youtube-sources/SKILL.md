---
name: youtube-sources
description: Links the talks, posts, videos, people and tools a speaker names in a saved YouTube transcript note, in a separate agent-made copy of the note, so the original keeps only what scripts made. Use after youtube-transcript saves a new note, and when the user asks to link the sources of a saved video. Triggers include "link the sources for X", "what did they mention in that video", "find the talk he referenced", or a saved note path with that intent. Reach for it even when the ask names one mention, since every link goes through the same copy.
license: MIT
compatibility: Requires the youtube-transcript skill's scripts/yt.sh beside this skill, YT_SOURCES_DIR (or a dir argument) for the linked copies, and web search for found links.
argument-hint: "<note path or title> [--no-search]"
---

# YouTube sources

Links go in a linked copy, `$YT_SOURCES_DIR/<note name> (linked).md`, never in the note itself: an agent chooses each link and can be wrong, and the note holds only what scripts made. `../youtube-transcript/scripts/yt.sh source` writes every link; the note only gains a `linked:` property pointing at the copy. Shapes: the source and relink section of youtube-transcript's `references/schemas/yt.schema.md`.

1. Resolve the note: a path, or a title matched against `$YT_NOTES_DIR/*.md`. Ask in one line if two fit.
2. Hand the note's path to one subagent on a fast, cheap model with steps 3 and 4, so the transcript stays out of your context. For several notes, run one subagent per note, at most 5 at once.
3. The subagent reads the whole note, in parts when a reader cuts it short, and lists, on first mention, each specific talk, video, post, paper, repo or event the speaker names, and each person and tool or product. Named products count as tools, including the AI products the video is about. It skips the video's own creator, a bare company or product-family name with no specific product, and first names with no surname. It adds only links the copy does not already have. For each:
   - **author link**: the description holds its URL. Kind `author`.
   - **found link**: no URL in the description, and the user did not pass `--no-search`. Search the web and open the page. Link it only when the page itself confirms it: the same talk or event name, a person's own profile showing the name and role, or a tool's official docs. Kind `found`. When nothing confirms, skip it: a wrong link is worse than none.
4. For each, run `yt.sh source "<note>" "<words exactly as in the transcript>" <url> <kind>`. Auto captions garble names, so use the transcript's spelling. On exit 1, fix the phrase from the message or skip.
5. Report one line per link (words → URL, kind) and one line per skip with its reason, then the copy's path.

After a note is re-saved, `yt.sh relink "<note>"` rebuilds its copy from the copy's own inline links, with no new search.
