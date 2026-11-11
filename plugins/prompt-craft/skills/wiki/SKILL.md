---
name: wiki
description: Builds and maintains a knowledge base inside a folder of markdown notes: sources land in a raw folder the agent never edits, and the agent compiles a wiki of summary pages, concept pages, backlinks and an index from them. Commands are ingest, ask (answer from the wiki, then file the answer back as a page) and lint (contradictions, stale pages, orphans, broken links, gaps, candidate concept pages). Use when the user saves a source worth keeping, asks a question their saved material should answer, or wants the wiki checked. Triggers include "/wiki", "ingest this", "add this to the wiki", "what does my wiki say about", "lint the wiki", "health check my notes", or a note vault with a raw folder. Reach for it even when the vault is small, since an index and summaries keep later questions cheap. Prefer it over searching the raw notes each time, and over a vector store for a wiki of a few hundred pages.
license: MIT
compatibility: Requires Node for the lint and index script. Without it, do the same checks by hand from references/schemas/wiki.schema.md.
argument-hint: "<ingest <source> | ask <question> | lint>"
---

# Wiki

The agent keeps a wiki the way a compiler keeps its output: sources in, pages out, rebuilt when a source changes. The reader's own folders stay untouched, and the wiki folder is the agent's to write. Page shapes and the script's output are in [references/schemas/wiki.schema.md](references/schemas/wiki.schema.md).

## 0. Find the folders

Read `.wiki.json` at the vault root: `{"raw": "<folder>", "wiki": "<folder>"}`, paths relative to the vault. When it is missing, read the vault's agent instructions file for where reference material and agent-written notes go, propose the two folders, and write the file after the user agrees. Then read the instructions file's write rules, and follow them over this skill.

Example: a vault whose rules say agents never summarize inside the folder of saved reference material and write freely in an agent folder sets `raw` to the reference folder and `wiki` to a folder inside the agent one. The wiki then holds every summary, and the reference folder holds none.

## 1. Ingest

For one new source in `raw`:

1. Never edit the source. If it is not yet a markdown file in `raw`, save it there unchanged, with its origin and the save date in its frontmatter.
2. Write a summary page, named `<source name> (summary)`, with `type: source`, a one-line `summary`, `sources` pointing at the raw note, the claims that matter and quotes marked as quotes. A summary can be wrong, so each claim keeps a link back to the raw note for checking.
3. Update or create the concept pages the source touches (`type: concept`). Put each fact on one page and link to it from the others. A new claim that contradicts a page stays on both pages with a link between them and a line saying so, not a silent overwrite.
4. Link both ways: a summary links to its concepts and each concept links to its summaries.
5. Run `node scripts/wiki.mjs index <vault>` to rebuild the index.

Do ingest in small batches and run lint after each, because a mistake copied into twenty pages is expensive to find.

## 2. Ask

1. Read the index, then only the pages it points to. Read a raw note only to check a claim the wiki makes.
2. Answer with links to the pages used, and say what the wiki does not cover. Do not fill the gap from memory without saying so.
3. File the answer as a page (`type: answer`, with the question in `summary`) and link it from the concepts it uses, so the next question starts from it. Then rebuild the index. Skip filing when the user says the answer is throwaway.

## 3. Lint

Run `node scripts/wiki.mjs lint <vault>`. It reports broken links, orphan pages, one-way links, pages older than a source they cite, raw notes no page cites and names linked from two or more pages that have no page of their own.

Then read for what a script cannot see: contradictions between pages, claims a later source replaced, gaps a question exposed and connections worth a new concept page. Propose each fix and apply the ones the user accepts. Do not fix silently, because the user needs to see which claims changed.

## 4. Lessons

When the user corrects a page or a ruling, decide whether it is a one-time fix or a rule for every ingest. Add a rule to the vault's agent instructions file, or to `lint` if a script could catch it.
