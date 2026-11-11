# Wiki shapes

## Config

`<vault>/.wiki.json`, paths relative to the vault:

```json
{ "raw": "Reference", "wiki": "Agent/Wiki" }
```

## Pages

Every page in the wiki folder is markdown with this frontmatter. `sources` is required on `source` pages and optional elsewhere.

```yaml
---
type: source | concept | answer
summary: <one line, shown in the index>
sources: ["[[Raw note name]]"]
---
```

- A source page is named `<raw note name> (summary)`, so its link never matches the raw note's name.
- Links are `[[Name]]`, `[[Name|alias]]` or `[[Name#Heading]]`. A link resolves by file name anywhere in the vault.
- `index.md` in the wiki folder is written by `wiki.mjs index`. Do not edit it by hand.

## `wiki.mjs lint --json`

```json
{
  "pages": 0,
  "broken": [{ "page": "<path>", "link": "<target with no file>" }],
  "orphans": ["<page no other page links to>"],
  "oneWay": [{ "from": "<page>", "to": "<page that does not link back>" }],
  "stale": [
    { "page": "<path>", "source": "<raw note changed after the page>" }
  ],
  "unsummarized": ["<raw note no page links to>"],
  "candidates": [{ "name": "<link target>", "pages": 2 }]
}
```

It exits `1` when `broken` is not empty, `2` on a usage error or a missing config, `0` otherwise. `oneWay` and `orphans` count wiki pages only, and the index is not a page.

## `wiki.mjs index`

Writes `index.md` and prints `{ "index": "<path>", "pages": 0 }`. The file lists each page under its `type` with its `summary`.
