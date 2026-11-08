---
name: pocket-deck-playbook
description: Project playbook for a private, offline-capable, non-monetized card game in the style of the original mobile pocket card game that runs on phone, tablet and desktop. Covers the default stack, repo layout, milestones, which bundled skill to use for each kind of work, and the definition of done. Use at the start of any session on this project, when planning or scaffolding, when choosing a library or architecture, when unsure which skill applies, and before calling a feature finished.
---

# Pocket Deck playbook

## Build a fair, faithful replica that works everywhere

A faithful-feeling replica of the original mobile pocket card game for one player: the battles, the pack opening and the collecting, without paid currency, stamina timers, or anything that rigs outcomes to sell something. It runs as an installable web app (PWA) on phone, tablet and desktop, and works offline.

Three things are fixed. Everything else is a default you can change.

1. **Fair.** Published odds are the real odds. No purchases, no pay-gated cards, no timers that gate play. Pack results are reproducible from a logged seed.
2. **Faithful in feel, original in look.** Rules and flow match the original. Art, frames, logos, symbols and UI artwork are our own. The glyphs and fonts come from `pocket-deck-glyphs`.
3. **Works everywhere.** Touch, mouse and keyboard, portrait phone to desktop, reduced motion, offline.

## Default stack

| Layer | Default | Why |
| --- | --- | --- |
| Build | Vite + TypeScript (strict) | Fast dev loop. One toolchain for engine, data scripts and UI. |
| Engine | A plain TS package with no DOM imports | Pure reducer, shared by UI, AI worker and tests |
| UI | React + React Aria Components | Accessible drag and drop with keyboard and screen-reader support built in. Focus management for dialogs and menus. |
| Styling | Plain CSS with the design system's tokens, cascade layers and container queries | CSS-first. Tokens are the contract. |
| Cards and effects | DOM + CSS 3D transforms, CSS and WAAPI animation | Crisp text, accessible, cheap. Use a canvas library only for heavy particles. |
| AI | Engine search in a Web Worker | Keeps the UI at 60 fps during AI turns |
| Storage | IndexedDB with versioned schema | Collection, decks, pack log, saved games |
| Offline | Service worker via a Vite PWA plugin | Installable, works without a network |
| Tests | Vitest (engine, data), Playwright (devices, flows) | Rules are tested as rules. Screens are checked at real sizes. |

[references/stack-and-layout.md](references/stack-and-layout.md) gives the tradeoffs, the alternatives and the repo layout.

## Which skill for which job

The first four ship in this plugin. The rest are third-party skills installed once per machine with the skills CLI. Their install slugs and licences are in [assets/third-party-skills.json](assets/third-party-skills.json), so the list can change without editing this file.

| Job | Skill |
| --- | --- |
| Any rule, ruling, card behaviour, deck validation or engine question | `pocket-card-rules` (this plugin) |
| Energy-type and rarity symbols, fonts | `pocket-deck-glyphs` (this plugin) |
| Sounds, music, haptics and audio fixes | `pocket-deck-sound` (this plugin) |
| Planning, stack choices, definition of done | `pocket-deck-playbook` (this plugin) |
| Card-game engine patterns (zones, effect-as-data, seeded shuffle) | `card-game`, with the overrides listed in `pocket-card-rules` |
| Making impacts feel punchy (KO, big hits, rare pulls) | `game-feel`. Its code targets game engines, so port the ideas to CSS and the Web Animations API. |
| Opponent decision-making | `game-ai` |
| Saving collection, decks and games | `save-systems`, with its file patterns ported to IndexedDB |
| Building one animation (pack cut, card flip, attach Energy) | `animate` |
| Several things moving together (pack reveal, KO sequence) | `choreograph` |
| Jank or dropped frames | `animation-performance` |
| Reviewing motion before merging | `review-animations` |
| Making the web app feel native on phones (notch, viewport height, tap delay, overscroll) | `mobile-native` |
| Accessibility audit | `accessibility` |
| UI review against interface guidelines | `web-design-guidelines` |
| Writing engine and data tests | `vitest` |
| Checking screens at phone, tablet and desktop sizes, and scripted flows | `playwright-cli` |

## Milestones

Ship in this order. Each milestone ends with something playable or usable.

1. **Data**: import the first set's card data, with validation and an effect-coverage report.
2. **Engine**: full rules for the first set with rule tests, card tests, property tests and replay tests.
3. **Battle UI**: board, hand, Energy Zone, attack and retreat, against the beginner AI, on a phone.
4. **Packs and collection**: the first set's boosters with published odds, reveal sequence, Dex, Pack Points, pack history.
5. **Deck builder**: 20-card validation, Energy types, rental and starter decks, deck codes.
6. **PWA and polish**: offline, install, haptics, reduced motion, tablet and desktop layouts.
7. **More sets**, in release order, each gated on its mechanics and full card coverage.

## Definition of done (every feature)

- [ ] Works by touch, mouse and keyboard. Every drag has a tap or keyboard alternative.
- [ ] Checked at 390×844 (phone), 820×1180 (tablet portrait), 1180×820 (tablet landscape) and 1440×900 (desktop).
- [ ] Respects `prefers-reduced-motion` and `prefers-color-scheme`.
- [ ] Uses design-system tokens only: no raw hex, px spacing or ad-hoc shadows in feature CSS.
- [ ] Holds 60 fps on a mid-range phone for its animations (check with the performance skill's method).
- [ ] Engine changes have tests named after the rule they enforce.
- [ ] Works offline after first load.
- [ ] Nothing in it sells, gates or nudges toward spending.
