# fauxkemon

Skills for building Fauxkemon: a private, non-monetized pocket trading-card game that plays like the mobile original on phone, tablet and desktop, with its own logo, symbols and card art.

| Skill | What it holds |
| --- | --- |
| `tcg-pocket-rules` | The complete battle rules, card kinds and tags, what each set introduced, booster odds and rarity tiers, the economy and which parts of it the replica drops, game modes, screen behaviour, card-data sources, and an engine design with a test plan. Dates and odds live in `assets/*.json`. |
| `pocket-deck-design-system` | The Pocket Deck design system: tokens in light and dark themes, bundled fonts, original Energy and rarity glyphs, and CSS components for cards, board slots, the Energy Zone, hand, packs, odds tables and app chrome, with a generator that rebuilds and screenshots everything. |
| `fauxkemon-sound` | The sound design: how the original's audio behaves (adaptive music, pack and battle cues, haptics), a 35-cue catalogue with free, licence-checked sources, a Web Audio architecture with ducking and synthesis fallbacks, and a manifest the app loads. |
| `fauxkemon-playbook` | The project playbook: default stack, repo layout, milestones, which skill to use for which job, and the definition of done. Third-party skills it leans on are listed by install slug in `assets/third-party-skills.json`. |

Install the third-party skills once per machine with the skills CLI; none is vendored here, so each keeps its own licence.

The design system's fonts are under the SIL Open Font License; the rest of the plugin is MIT.
