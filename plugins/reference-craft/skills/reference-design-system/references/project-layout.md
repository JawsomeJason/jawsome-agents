# Project layout

Keep sources and outputs in separate trees, so a reader can tell what to edit and what to rebuild, and a sync can copy outputs without dragging sources along.

```text
design-system/
  tools/                 every source and generator; the only files anyone edits
    build_tokens.*       the token table and the generator for tokens.json and tokens.css
    components.css       component styles, written against tokens only
    runtime.js           the interaction driver (classic script, no dependencies)
    content_*.*          component README and preview sources, one module per group
    fetch_fonts.*        fetches missing font files and their licences
    build.*              runs every generator in order; --render adds screenshots
    docs.*               writes reference docs from the built project
  project/               generated; never edited by hand
    tokens.json          the machine-readable contract
    tokens.css           every token as a custom property, one block per theme, @font-face rules
    components/bundle.css, components/bundle.js
    components/<Name>/README.md, components/<Name>/preview.html
    fonts/               font files with a LICENSE file per family
    assets/              this system's own glyphs and marks
  out/                   screenshots and render reports; never shipped
```

## Why each split exists

- **`tools/` vs `project/`.** A generated file edited by hand is overwritten by the next build, so the edit is lost silently. Keeping generated files in their own tree makes that mistake visible.
- **`out/` outside `project/`.** Screenshots are evidence for one run, not part of the system. Shipping them bloats every copy and goes stale on the next change.
- **One build entry point.** `build` runs fetch, tokens, components and copies in a fixed order, so nobody runs the stages out of order and ships a stylesheet built against old tokens.
- **Classic-script runtime.** A script with no module system and no dependencies loads in any page, including a bare preview opened from disk.

## Cascade layers

Put every component rule inside a named cascade layer, with sub-layers for base, primitives and compositions. Unlayered app CSS then always wins over the system, so a consumer can override a component without a specificity fight, and the system's own layers apply in a declared order rather than in source order.

## Prefixes

Give component classes and component-local custom properties one short prefix (`.xx-button`, `--xx-card-width`), distinct from token names. A component variable that shares a token's name shadows the token inside that component, which shows up as a colour that is right everywhere except one place.
