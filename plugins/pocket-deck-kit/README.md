# pocket-deck-kit

Skills for building a private, non-monetized pocket trading-card game that plays like the original mobile card game on phone, tablet and desktop, with its own logo, symbols and card art.

The kit holds only work that is the project's own: a neutral paraphrase of the rules, an engine design, original glyphs, open-licence fonts, a sound design and a project playbook. It holds no measured look of the original, no official names and no image, audio or video of the original.

| Skill | Contents |
| --- | --- |
| `pocket-card-rules` | The battle rules in neutral terms, an engine design with a test plan, and the fairness rules for packs. Changeable rule values live in `assets/rules-config.default.json`. |
| `pocket-deck-glyphs` | Original Energy-type and rarity glyphs as SVG files and CSS masks, the Cabin and Jost fonts with their licences, and the tools that rebuild them. |
| `pocket-deck-sound` | The sound design: how the original's audio behaves (adaptive music, pack and battle cues, haptics), a 35-cue catalogue with free, licence-checked sources, a Web Audio architecture with ducking and synthesis fallbacks, and a manifest the app loads. |
| `pocket-deck-playbook` | The project playbook: default stack, repo layout, milestones, which skill to use for which job, and the definition of done. Third-party skills it leans on are listed by install slug in `assets/third-party-skills.json`. |

## Install

In Claude Code, add the marketplace and install the plugin:

```text
/plugin marketplace add JawsomeJason/jawsome-agents
/plugin install pocket-deck-kit@jawsome-agents
```

In any other harness, install the four skills with the skills CLI:

```text
npx skills add JawsomeJason/jawsome-agents --skill pocket-card-rules --skill pocket-deck-glyphs --skill pocket-deck-playbook --skill pocket-deck-sound
```

Install the third-party skills once per machine with the skills CLI. None is vendored here, so each keeps its own licence.

## Licence

The fonts are under the SIL Open Font License. The rest of the plugin is MIT.
