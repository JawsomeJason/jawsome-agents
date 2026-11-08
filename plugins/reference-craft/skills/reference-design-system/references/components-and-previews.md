# Components and previews

Every component ships three things generated from one source: its CSS (in the shared stylesheet), a README that is its contract, and a preview that is its working markup. The render loop then proves the three agree.

## Sources

Keep component content as data in the tools tree: one entry per component, holding its README text and its preview markup, grouped by layer. A build step writes `components/<Name>/README.md` and `components/<Name>/preview.html` from it, and concatenates the CSS sources into one `bundle.css`.

Two groups keep components reusable:

- **Primitives** know nothing about product state: button, toggle, chip, badge, meter, panel, bubble.
- **Compositions** assemble primitives for one surface: a card face, a board, a tab bar, a collection tile.

New screens compose existing components; they do not fork one, because a fork stops receiving fixes.

## The README contract

Each README holds, in this order:

1. One paragraph: what it is and the measured facts its CSS encodes (sizes, positions, colours by token name).
2. **Use it for:** each variant and when to pick it.
3. **The consumer provides:** the element, the class, required attributes, accessible name, and which behaviour comes from the app's own accessible primitives (focus, dialogs, drag) rather than from the system.
4. **Attributes:** a table of `data-*` attributes and their values.
5. **Rules:** constraints, each with its reason, including every departure from the reference and why it stays.

## The preview

A preview is a bare HTML fragment that uses only the system's classes and tokens. Its first line is a directive comment the build and the docs read, for example `<!-- @preview group="Primitives" height=260 subtitle="variants · sizes · disabled" -->`. It shows every variant, every size step, every state that changes appearance (disabled, selected, pressed), and the empty and overflowing cases.

## The render loop

Wrap each preview in a harness page that loads `tokens.css`, `bundle.css` and the runtime script, sets `data-theme` on the root, and paints the page with the surface token. Then, for each preview and each theme:

1. Load the page in a headless browser at a fixed viewport and device scale.
2. Collect console errors and uncaught page errors.
3. Wait a short beat for fonts and the runtime, then take a full-page screenshot into `out/<Name>-<theme>.png`.

The run fails when any page logged an error. Then inspect every screenshot. Fix what is wrong at the source, rebuild, render again, and repeat until every image is clean and the error list is empty, because a pass that only checks for errors misses every bug that renders without complaint.

Without a headless browser, open each harness page in any browser, switch `data-theme` by hand, read the console, and record which pages and themes you checked.

## What the loop catches

Each of these passed review in source and showed at once in a screenshot:

| Bug class | What it looks like | Usual fix |
| --- | --- | --- |
| Overflow from missing `box-sizing` | A pill or field wider than its row by its padding; text cut at the right edge | `box-sizing: border-box` on the part, or in the base layer |
| Wrong-theme placeholders | A placeholder or swatch that stays light in the dark theme because it used a literal colour or a light-only token | Use a themed token; add a dark value |
| Colour precedence collisions | A variant's colour ignored because a later rule, a component variable named like a token, or an unlayered rule won the cascade | Rename component variables with the prefix; move the rule into the right layer |
| Overlapping absolutely positioned parts | Two measured parts on top of each other at one size step, such as a name running into a number | Re-measure; add a size step that hides one; set a max inline size |
| Missing fonts | Fallback metrics shifting every line | Fetch the fonts before rendering; check the `@font-face` paths relative to `tokens.css` |
| Runtime errors | A driver that throws on a preview without the element it expects | Guard at the driver's entry point; the error list names the page |

## Accessibility in components

Every focusable part shows a focus ring from the focus token at 2px. Every control keeps the minimum touch target as its hit area. Status carries a word or an icon, never colour alone. Motion respects reduced motion (see [interaction-physics.md](interaction-physics.md)). Check these in the screenshots too: a focus ring the preview never shows is untested.
