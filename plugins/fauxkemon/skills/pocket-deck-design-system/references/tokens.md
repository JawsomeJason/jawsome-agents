# Token reference

Generated from `assets/design-system/project/tokens.json` by `tools/docs.py`. Use tokens only as `var(--name)`. Colour and shadow tokens list light and dark values. Everything else is theme-independent. `card-*` and `disc-*` colours are the same in both themes because a card is a printed object.

## Colour

### Ground, surfaces and board

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `ground` | `#e4eaf4` | `#0d141b` | App background behind panels: the pale blue-lavender page wash. Hero screens lay `gradient-wall` or a section colour over it. |
| `surface` | `#f0f4f8` | `#16202a` | Panels, pills, list rows, the filter panel, secondary buttons. |
| `surface-raised` | `#fcfcfc` | `#1d2934` | Dialogs, sheets, speech bubbles and round icon buttons; always with `shadow-2` or `shadow-3`. |
| `surface-sunken` | `#dde3ef` | `#0a1015` | Wells: search fields, the empty-dex slot, the deck-list gutter. |
| `scrim` | `#0c1620a8` | `#000000b3` | Behind dialogs, the card inspector and pack opening; the original also blurs what's behind. |
| `field` | `#78adea` | `#173a66` | Background outside the board circle on your side of the centre line. |
| `field-opp` | `#d0d8f8` | `#2b3052` | Background outside the board circle on the opponent's side. |
| `board` | `#7cb3e9` | `#22507f` | Your half of the mat inside the board circle. Text on it uses `ink`; Energy badges and slots sit on it. |
| `board-opp` | `#d8defd` | `#3a3f63` | The opponent's half of the mat inside the circle. |
| `board-band` | `#c9e4fc` | `#2b4360` | The lighter band along the centre line of the mat. |
| `board-rim` | `#ffffff` | `#9fb3c8` | The board circle's rim (about 1.5% of screen height thick). |
| `slot` | `#d8d9fc` | `#5c6a9a` | Empty Active and Bench slots: a translucent-white rounded rectangle on the mat (this is the flattened value). |
| `slot-edge` | `#eef1ff` | `#7f8db8` | Hairline edge of an empty slot. |
| `glow` | `#4deffc` | `#4deffc` | Selection and valid-target glow around cards, slots and the Energy stand: a soft outer blur, never a hard border. |

### Ink and lines

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `ink` | `#343c4c` | `#eef3f7` | Primary text on `surface`, `ground`, `surface-sunken`, `board`, `board-opp` and every `type-*-tint`. The original's dark slate. |
| `ink-muted` | `#4f5c72` | `#b7c4cf` | Secondary text, the UI slate: pill labels, captions, outline icons. On `surface`, `ground`, `surface-sunken` and tints. |
| `ink-subtle` | `#56637a` | `#93a3b2` | Tertiary text (set codes, timestamps) on `surface` and `ground`. Never on tints. |
| `ink-inverse` | `#ffffff` | `#0d141b` | Text on `ink`-coloured fills: tooltips, the owned-count tab, the player strips. |
| `hp-ink` | `#3c4a66` | `#eef3f7` | Floating HP numerals on the board (28px bold, so 3:1 applies), with a 2px `board-rim` stroke. |
| `line` | `#d4dbe6` | `#2b3946` | Hairline dividers between rows and under dialog titles. Decorative only. |
| `line-strong` | `#71808d` | `#71859a` | Control borders where one is needed (inputs). 3:1 on `surface` and `ground`. |
| `focus-ring` | `#0a5a8a` | `#8fdcf5` | The 2px focus outline on every focusable element. 3:1 on all surfaces and the mat. |

### Brand, teal and status

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `brand` | `#58d4f4` | `#45b8dc` | Primary action fill (Open, OK, Battle!, Next) and the active Energy orb's ring. Text on it is `on-brand`. |
| `brand-strong` | `#38c2e6` | `#2d9bbd` | Pressed primary fill. |
| `on-brand` | `#0f2a33` | `#04202a` | Text and icons on `brand` and `brand-strong`. |
| `brand-ink` | `#0a6a8c` | `#7fd0ea` | Cyan-coloured text and icons on `surface` and `ground`: links, quiet buttons, the Opening Results rule. |
| `brand-tint` | `#d9f1f9` | `#0f3341` | Selected rows, active filters, drop-target wash, tutorial callout borders. |
| `progress` | `#24d0c0` | `#24d0c0` | EXP and mission progress bars, completed-mission gradients. Decorative: a number sits beside it. |
| `toggle-on` | `#0a8e82` | `#2fd3c2` | ON track of switches (Auto, Dex view). The original's `#00c4b4` fails 3:1 on `ground`; this one holds it. The knob is `ink-inverse`. |
| `hp` | `#15e5b0` | `#15e5b0` | The HP bar on board cards, on a `board-rim` track. |
| `strip` | `#4c5c74` | `#9fb3c8` | Player name strips (slanted), battle icon buttons, filled tab icons. Text on it is `ink-inverse`. |
| `notice` | `#ff3b30` | `#ff6b61` | Notification dots on tabs and tiles. |
| `danger` | `#b42a20` | `#ff8a7a` | Destructive actions, KO banners, low HP. Always with a word or icon. |
| `on-danger` | `#ffffff` | `#2a0703` | Text on `danger`. |
| `success` | `#1e6e8a` | `#6fd0c0` | Valid deck, completed missions as text. Kept off the red-green axis; always with a word or icon. |
| `on-success` | `#ffffff` | `#062a24` | Text on `success`. |
| `hero-battle` | `#3884f8` | `#2b5fb3` | Battle section banner (diagonal lower edge, white title). |
| `hero-social` | `#3cc96a` | `#2a9a50` | Social Hub section banner. |
| `hero-set` | `#c0a8fc` | `#6a5aa8` | Default expansion panel tint on the pack screen; each set may override it. |

### Reward and points

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `reward` | `#fce870` | `#fce870` | Points coins, Pack Points, rare pulls, New badges. Fill with `on-reward` text. |
| `on-reward` | `#2a1b00` | `#2a1b00` | Text and icons on `reward`. |
| `reward-ink` | `#7a4f00` | `#f6c65a` | Gold-coloured text on `surface` and `ground` (Pack Points, rarity names). |
| `reward-tint` | `#fdf1d4` | `#3a2c0c` | Background of reward callouts and the rare-pull summary row. |
| `coin-ink` | `#348cfc` | `#348cfc` | The italic numeral on an earned point coin (13pt disc). Decorative: the score is in the tracker's label. |
| `point-empty` | `#384450` | `#6b7a8c` | Unearned point discs in the player strip. |

### Rarity (UI)

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `rarity-diamond` | `#4f6476` | `#b9c8d6` | ◊ marks in lists. 3:1 on `surface` and every `type-*-tint`. |
| `rarity-star` | `#8f6400` | `#f4c34d` | ☆ marks in lists. 3:1 on `surface` and every `type-*-tint`. |
| `rarity-crown` | `#7a5200` | `#ffd76e` | ♕ marks in lists. 3:1 on `surface` and every `type-*-tint`. |
| `rarity-shiny` | `#b0245f` | `#ff8cc0` | ✵ marks in lists. 3:1 on `surface` and every `type-*-tint`. |

### Card face

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `card-frame` | `#dedede` | `#dedede` | Silver card border base (◊, ◊◊ and Trainers). |
| `card-frame-highlight` | `#f6f6f6` | `#f6f6f6` | Brushed highlight streaks on the silver border. |
| `card-frame-shade` | `#c8c8c8` | `#c8c8c8` | Brushed shadow streaks on the silver border. |
| `card-frame-rare` | `#9f98ad` | `#9f98ad` | ◊◊◊ border: lavender-steel base under a low-saturation rainbow sheen. |
| `card-frame-ex` | `#4a4446` | `#4a4446` | ◊◊◊◊ ex border: dark silver base under a strong rainbow holo. |
| `card-frame-immersive` | `#424242` | `#424242` | ☆☆☆ Immersive border: charcoal, with a white window stroke. |
| `card-frame-shiny` | `#99f3f5` | `#99f3f5` | ✵ and ✵✵ border: cyan-mint holo base. |
| `card-frame-crown` | `#fcd518` | `#fcd518` | ♕ Crown border and symbols base: gold, holo cycling toward teal. |
| `card-ink` | `#201a0b` | `#201a0b` | Name, HP, attack names, damage and effect text on every card body except Darkness. |
| `card-ink-light` | `#f2f4f1` | `#f2f4f1` | Text on the Darkness card body and on full-art plates. |
| `card-label` | `#707070` | `#707070` | Small grey labels on cards: stage, weakness, retreat, dex line. Sits on `card-pill` and the dex bar at the original's 4.2:1; keep it at or above 2.1% of card width. |
| `card-pill` | `#e1e4e2` | `#e1e4e2` | Stage pill and footer capsules, light stop. |
| `card-pill-deep` | `#d4d9da` | `#d4d9da` | Stage pill and footer capsules, deep stop. |
| `card-dex-bar` | `#e6e6e6` | `#e6e6e6` | The dex line strip under the art on ◊–◊◊◊◊ Pokémon. |
| `card-ability` | `#b4101a` | `#b4101a` | Ability pill fill (gradient `#df2b37` → `#7c0411` around it), outline `card-ability-outline`. |
| `card-ability-outline` | `#6c1111` | `#6c1111` | Ability pill outline. |
| `card-ability-ink` | `#901f0c` | `#901f0c` | Ability name text. |
| `card-ex-gold-1` | `#fff573` | `#fff573` | ex rule box gradient, top. |
| `card-ex-gold-2` | `#e9c649` | `#e9c649` | ex rule box gradient, middle; also the ex logotype fill. |
| `card-ex-gold-3` | `#bca435` | `#bca435` | ex rule box gradient, bottom. |
| `card-ex-tab` | `#180a07` | `#180a07` | The black tab on the ex rule box; its text is `card-ex-tab-ink`. |
| `card-ex-tab-ink` | `#c7a734` | `#c7a734` | Text on the ex rule-box tab. |
| `card-rule-ink` | `#574406` | `#574406` | Rule text inside the gold ex box. |
| `card-ex-outline` | `#5c4325` | `#5c4325` | Outline of the ex logotype. |
| `card-trainer-body` | `#f1f2f4` | `#f1f2f4` | Trainer card body. |
| `card-trainer-band` | `#e4e4e4` | `#e4e4e4` | Trainer header band. |
| `card-trainer-word` | `#646464` | `#646464` | The TRAINER word, with a white stroke. |
| `card-item` | `#3d86bc` | `#3d86bc` | Item label; Item rule box runs `card-item-box` → `card-item-box-deep`. |
| `card-item-box` | `#c1e4f1` | `#c1e4f1` | Item rule box, light stop. |
| `card-item-box-deep` | `#75bbde` | `#75bbde` | Item rule box, deep stop. |
| `card-supporter` | `#e58c50` | `#e58c50` | Supporter label; Supporter rule box runs `card-supporter-box` → `card-supporter-box-deep`. |
| `card-supporter-box` | `#ebd9bb` | `#ebd9bb` | Supporter rule box, light stop. |
| `card-supporter-box-deep` | `#f0ba81` | `#f0ba81` | Supporter rule box, deep stop. |
| `card-fullart-ink` | `#d9dedc` | `#d9dedc` | Text fill on full-art cards, stroked with `card-fullart-outline`. |
| `card-fullart-outline` | `#1a1515` | `#1a1515` | Text outline on full-art cards. |
| `card-evolves-band` | `#1e1e28` | `#1e1e28` | Evolves-from band over the art at 60% alpha, white text. |
| `card-rarity-diamond` | `#2e3c0f` | `#2e3c0f` | ◊ symbol stroke printed on the card (the fill is a silver gradient). |
| `card-rarity-star` | `#3d4889` | `#3d4889` | ☆ symbol printed on the card. |
| `card-rarity-shiny` | `#a3c838` | `#a3c838` | ✵ symbol printed on the card. |
| `card-rarity-crown` | `#a9882c` | `#a9882c` | ♕ symbol printed on the card; also the Crown body's symbol colour. |
| `card-crown-body-1` | `#f3da5c` | `#f3da5c` | Crown card body gradient, top. |
| `card-crown-body-2` | `#fae26c` | `#fae26c` | Crown card body gradient, bottom. |
| `card-grass` | `#a0ca38` | `#a0ca38` | Grass card body, centre of the radial gradient (measured from an official render). Text on it uses `card-ink`. |
| `card-grass-edge` | `#96c33e` | `#96c33e` | Grass card body, edge of the radial gradient. |
| `card-fire` | `#ec6832` | `#ec6832` | Fire card body, centre of the radial gradient (measured from an official render). Text on it uses `card-ink`. |
| `card-fire-edge` | `#e94e30` | `#e94e30` | Fire card body, edge of the radial gradient. |
| `card-water` | `#25ade4` | `#25ade4` | Water card body, centre of the radial gradient (measured from an official render). Text on it uses `card-ink`. |
| `card-water-edge` | `#5ec0ec` | `#5ec0ec` | Water card body, edge of the radial gradient. |
| `card-lightning` | `#fedd00` | `#fedd00` | Lightning card body, centre of the radial gradient (measured from an official render). Text on it uses `card-ink`. |
| `card-lightning-edge` | `#fdd901` | `#fdd901` | Lightning card body, edge of the radial gradient. |
| `card-psychic` | `#a863a4` | `#a863a4` | Psychic card body, centre of the radial gradient (measured from an official render). Text on it uses `card-ink`. |
| `card-psychic-edge` | `#9a68a7` | `#9a68a7` | Psychic card body, edge of the radial gradient. |
| `card-fighting` | `#da890d` | `#da890d` | Fighting card body, centre of the radial gradient (measured from an official render). Text on it uses `card-ink`. |
| `card-fighting-edge` | `#da8d0d` | `#da8d0d` | Fighting card body, edge of the radial gradient. |
| `card-darkness` | `#012e2b` | `#012e2b` | Darkness card body, centre of the radial gradient (measured from an official render). Text on it uses `card-ink-light`. |
| `card-darkness-edge` | `#0a4f56` | `#0a4f56` | Darkness card body, edge of the radial gradient. |
| `card-metal` | `#ced4d4` | `#ced4d4` | Metal card body, centre of the radial gradient (measured from an official render). Text on it uses `card-ink`. |
| `card-metal-edge` | `#dbdbdb` | `#dbdbdb` | Metal card body, edge of the radial gradient. |
| `card-dragon` | `#b59d34` | `#b59d34` | Dragon card body, centre of the radial gradient (measured from an official render). Text on it uses `card-ink`. |
| `card-dragon-edge` | `#a28929` | `#a28929` | Dragon card body, edge of the radial gradient. |
| `card-colorless` | `#e7e7ea` | `#e7e7ea` | Colorless card body, centre of the radial gradient (measured from an official render). Text on it uses `card-ink`. |
| `card-colorless-edge` | `#f1efec` | `#f1efec` | Colorless card body, edge of the radial gradient. |

### Types (UI)

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `type-grass` | `#2f7d34` | `#5cbf5f` | Grass identity: Energy badges, cost pips, the card frame's type band. Glyphs on it use `on-type-grass`. |
| `on-type-grass` | `#ffffff` | `#07210a` | Glyphs and short labels on `type-grass`. |
| `type-grass-tint` | `#e3f2df` | `#182a1a` | Grass filter chips and Grass-themed UI washes. Text on it uses `ink`. |
| `type-fire` | `#c8401c` | `#ff7a52` | Fire identity: Energy badges, cost pips, the card frame's type band. Glyphs on it use `on-type-fire`. |
| `on-type-fire` | `#ffffff` | `#2b0b02` | Glyphs and short labels on `type-fire`. |
| `type-fire-tint` | `#fbe6dd` | `#33190f` | Fire filter chips and Fire-themed UI washes. Text on it uses `ink`. |
| `type-water` | `#1f6fc2` | `#5fa8f5` | Water identity: Energy badges, cost pips, the card frame's type band. Glyphs on it use `on-type-water`. |
| `on-type-water` | `#ffffff` | `#03192f` | Glyphs and short labels on `type-water`. |
| `type-water-tint` | `#e0edfb` | `#132538` | Water filter chips and Water-themed UI washes. Text on it uses `ink`. |
| `type-lightning` | `#f2c318` | `#f5cf3c` | Lightning identity: Energy badges, cost pips, the card frame's type band. Glyphs on it use `on-type-lightning`. |
| `on-type-lightning` | `#2b2200` | `#2b2200` | Glyphs and short labels on `type-lightning`. |
| `type-lightning-tint` | `#fbf3cf` | `#2f2a0d` | Lightning filter chips and Lightning-themed UI washes. Text on it uses `ink`. |
| `type-psychic` | `#8a46b8` | `#c08ae6` | Psychic identity: Energy badges, cost pips, the card frame's type band. Glyphs on it use `on-type-psychic`. |
| `on-type-psychic` | `#ffffff` | `#200a30` | Glyphs and short labels on `type-psychic`. |
| `type-psychic-tint` | `#efe5f8` | `#271b33` | Psychic filter chips and Psychic-themed UI washes. Text on it uses `ink`. |
| `type-fighting` | `#a8541c` | `#e08a4c` | Fighting identity: Energy badges, cost pips, the card frame's type band. Glyphs on it use `on-type-fighting`. |
| `on-type-fighting` | `#ffffff` | `#2a1204` | Glyphs and short labels on `type-fighting`. |
| `type-fighting-tint` | `#f6e7da` | `#2e1f14` | Fighting filter chips and Fighting-themed UI washes. Text on it uses `ink`. |
| `type-darkness` | `#36404d` | `#8b98aa` | Darkness identity: Energy badges, cost pips, the card frame's type band. Glyphs on it use `on-type-darkness`. |
| `on-type-darkness` | `#ffffff` | `#0d1218` | Glyphs and short labels on `type-darkness`. |
| `type-darkness-tint` | `#e2e6eb` | `#1c232c` | Darkness filter chips and Darkness-themed UI washes. Text on it uses `ink`. |
| `type-metal` | `#8794a1` | `#a7b3bf` | Metal identity: Energy badges, cost pips, the card frame's type band. Glyphs on it use `on-type-metal`. |
| `on-type-metal` | `#111b24` | `#111b24` | Glyphs and short labels on `type-metal`. |
| `type-metal-tint` | `#eaeef2` | `#212a33` | Metal filter chips and Metal-themed UI washes. Text on it uses `ink`. |
| `type-dragon` | `#a3841c` | `#d6b54a` | Dragon identity: Energy badges, cost pips, the card frame's type band. Glyphs on it use `on-type-dragon`. |
| `on-type-dragon` | `#1c1600` | `#1c1600` | Glyphs and short labels on `type-dragon`. |
| `type-dragon-tint` | `#f3ecd5` | `#2c2611` | Dragon filter chips and Dragon-themed UI washes. Text on it uses `ink`. |
| `type-colorless` | `#e4e9ee` | `#cfd8e0` | Colorless identity: Energy badges, cost pips, the card frame's type band. Glyphs on it use `on-type-colorless`. |
| `on-type-colorless` | `#1a2632` | `#1a2632` | Glyphs and short labels on `type-colorless`. |
| `type-colorless-tint` | `#f4f6f8` | `#222b34` | Colorless filter chips and Colorless-themed UI washes. Text on it uses `ink`. |

### Energy discs

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `disc-grass` | `#7ab944` | `#7ab944` | Grass type disc on cards and Energy pips: base. |
| `disc-grass-hi` | `#cadd95` | `#cadd95` | Grass type disc: rim-light highlight at 35% 30%. |
| `disc-grass-shade` | `#3e9c2c` | `#3e9c2c` | Grass type disc: shade. |
| `disc-fire` | `#dc633f` | `#dc633f` | Fire type disc on cards and Energy pips: base. |
| `disc-fire-hi` | `#f7b092` | `#f7b092` | Fire type disc: rim-light highlight at 35% 30%. |
| `disc-fire-shade` | `#be3823` | `#be3823` | Fire type disc: shade. |
| `disc-water` | `#43b1e1` | `#43b1e1` | Water type disc on cards and Energy pips: base. |
| `disc-water-hi` | `#b7e0fa` | `#b7e0fa` | Water type disc: rim-light highlight at 35% 30%. |
| `disc-water-shade` | `#0894c8` | `#0894c8` | Water type disc: shade. |
| `disc-lightning` | `#f5cd2e` | `#f5cd2e` | Lightning type disc on cards and Energy pips: base. |
| `disc-lightning-hi` | `#ffee8c` | `#ffee8c` | Lightning type disc: rim-light highlight at 35% 30%. |
| `disc-lightning-shade` | `#ddb404` | `#ddb404` | Lightning type disc: shade. |
| `disc-psychic` | `#b083ab` | `#b083ab` | Psychic type disc on cards and Energy pips: base. |
| `disc-psychic-hi` | `#dab8d4` | `#dab8d4` | Psychic type disc: rim-light highlight at 35% 30%. |
| `disc-psychic-shade` | `#925f8c` | `#925f8c` | Psychic type disc: shade. |
| `disc-fighting` | `#ce7621` | `#ce7621` | Fighting type disc on cards and Energy pips: base. |
| `disc-fighting-hi` | `#efb97e` | `#efb97e` | Fighting type disc: rim-light highlight at 35% 30%. |
| `disc-fighting-shade` | `#b25707` | `#b25707` | Fighting type disc: shade. |
| `disc-darkness` | `#568398` | `#568398` | Darkness type disc on cards and Energy pips: base. |
| `disc-darkness-hi` | `#afc8d4` | `#afc8d4` | Darkness type disc: rim-light highlight at 35% 30%. |
| `disc-darkness-shade` | `#2d6978` | `#2d6978` | Darkness type disc: shade. |
| `disc-metal` | `#bfbcb0` | `#bfbcb0` | Metal type disc on cards and Energy pips: base. |
| `disc-metal-hi` | `#e6e4de` | `#e6e4de` | Metal type disc: rim-light highlight at 35% 30%. |
| `disc-metal-shade` | `#98968c` | `#98968c` | Metal type disc: shade. |
| `disc-dragon` | `#b4a833` | `#b4a833` | Dragon type disc on cards and Energy pips: base. |
| `disc-dragon-hi` | `#e7e08b` | `#e7e08b` | Dragon type disc: rim-light highlight at 35% 30%. |
| `disc-dragon-shade` | `#968b1a` | `#968b1a` | Dragon type disc: shade. |
| `disc-colorless` | `#d7d5d1` | `#d7d5d1` | Colorless type disc on cards and Energy pips: base. |
| `disc-colorless-hi` | `#f6f4f0` | `#f6f4f0` | Colorless type disc: rim-light highlight at 35% 30%. |
| `disc-colorless-shade` | `#b4b2ae` | `#b4b2ae` | Colorless type disc: shade. |

## Type

### Families

| Variable | Stack |
| --- | --- |
| `--font-display` | `Cabin, "Gill Sans", "Gill Sans Nova", Calibri, ui-sans-serif, system-ui, sans-serif` |
| `--font-text` | `Cabin, "Gill Sans", "Gill Sans Nova", Calibri, ui-sans-serif, system-ui, sans-serif` |
| `--font-numeral` | `Jost, Futura, "Century Gothic", ui-sans-serif, system-ui, sans-serif` |

### Font files

| Family | File                                | Weights | Style  |
| ------ | ----------------------------------- | ------- | ------ |
| Cabin  | `fonts/Cabin-Variable.woff2`        | 400 700 | normal |
| Cabin  | `fonts/Cabin-Variable-Italic.woff2` | 400 700 | italic |
| Jost   | `fonts/Jost-Variable.woff2`         | 100 900 | normal |
| Jost   | `fonts/Jost-Variable-Italic.woff2`  | 100 900 | italic |

### Display

| Style | Size | Line | Weight | Tracking | Use |
| --- | --- | --- | --- | --- | --- |
| `display-xl` | 44px | 48px | 700 | -0.01em | Full-screen moments (Got it!, Ranked up!, win and loss): white on a diagonal section colour with a soft slate shadow. |
| `display-l` | 36px | 40px | 700 | 0 | Section hero titles; turn banners. |
| `display-m` | 28px | 32px | 700 | 0 | Set names on the pack screen. |
| `title` | 21px | 26px | 700 | 0 | Screen titles (centred, with `gradient-rainbow` under them), dialog titles at 18px. |

### Numerals

| Style | Size | Line | Weight | Tracking | Use |
| --- | --- | --- | --- | --- | --- |
| `numeral-xl` | 28px | 30px | 800 | -0.01em | Floating HP numerals on board cards, in `hp-ink` with a 2px `board-rim` stroke. |
| `numeral-l` | 22px | 24px | 800 | 0 | Counts in panels (cards owned, 20/20), damage pop-ups (scaled up). |
| `numeral-m` | 15px | 18px | 700 | 0 | Pack Points, stamina timers, owned-count tabs. |

### Text

| Style | Size | Line | Weight | Tracking | Use |
| --- | --- | --- | --- | --- | --- |
| `body` | 15px | 22px | 500 | 0 | Default UI and dialog body text (the original's 13pt reads as 15px on the web). |
| `body-strong` | 15px | 22px | 700 | 0 | Emphasis inside body text, list-row primary lines. |
| `label` | 15px | 20px | 600 | 0.005em | Pill buttons (13–16px by size), tabs, chips, form labels, the player strip. |
| `caption` | 12px | 16px | 600 | 0.01em | Tile labels under icon tiles, set codes, counters. Never for anything the player must read to act. |

### Card (at 300px card width)

| Style | Size | Line | Weight | Tracking | Use |
| --- | --- | --- | --- | --- | --- |
| `card-name` | 20px | 22px | 700 | -0.005em | Card name: 6.6% of card width, cap top at 4.6% of card height, starting 18% in from the left edge. |
| `card-hp` | 21px | 22px | 800 | -0.01em | HP number on cards: 6.9% of card width, right-aligned at 87.2%, with a 3.2% 'HP' label before it. |
| `attack-name` | 15px | 18px | 700 | 0 | Attack names at 4.9% and Ability names at 5.0% of card width, starting at 30.5%. |
| `attack-damage` | 19px | 22px | 800 | 0 | Attack damage: 6.2% of card width, right-aligned at 93.3%. |
| `card-text` | 11.4px | 14px | 500 | 0 | Effect and rule text: 3.8% of card width, line height 1.22, in `card-ink`. Hidden below 220px wide. |
| `card-label` | 6.6px | 8px | 600 | 0.02em | Stage pill, Weakness and Retreat labels, dex line: 2.1–2.2% of card width in `card-label`. |

## Spacing

| Token | Value | Use |
| --- | --- | --- |
| `space-1` | `4px` | Gaps between Energy pips and inside chips. |
| `space-2` | `8px` | Icon-to-label gap; padding inside compact controls. |
| `space-3` | `12px` | Padding inside list rows and chips; gap between hand cards when not fanned. |
| `space-4` | `16px` | Default panel padding and the phone screen gutter. |
| `space-5` | `20px` | Gap between Bench slots on phone. |
| `space-6` | `24px` | Section spacing inside a screen; tablet gutter. |
| `space-8` | `32px` | Gap between the two Active Spots; desktop gutter. |
| `space-12` | `48px` | Separation between major screen regions. |
| `space-16` | `64px` | Top padding of hero moments (pack picker, win screen). |

## Radius

| Token | Value | Use |
| --- | --- | --- |
| `radius-xs` | `4px` | Energy cost pips inside attack rows, focus-ring corners on pips. |
| `radius-sm` | `8px` | Chips, inputs, small buttons. |
| `radius-md` | `12px` | Buttons, list rows, board slots. |
| `radius-lg` | `18px` | Panels and sheets. |
| `radius-xl` | `28px` | Dialogs and the booster pack wrapper. |
| `radius-card` | `4.6%` | Card corners as a share of card width (≈14px on a 300px card), so corners scale with the card. |
| `radius-pill` | `999px` | Pill buttons, the tab bar, point pips, Energy badges. |

## Size

| Token | Value | Use |
| --- | --- | --- |
| `size-tap` | `44px` | Minimum touch target for any control. |
| `size-card-hand` | `88px` | Card width in the hand fan and on your Bench: 22.6% of a 390px phone. |
| `size-card-board` | `126px` | Your Active card width on phone (32% of 390px). The opponent's Active is 0.95× and foreshortened; their Bench cards 0.82×. |
| `size-card-inspect` | `320px` | Card width in the inspector on phone. |
| `card-aspect` | `63 / 88` | Every card face and slot. Matches a standard trading card. |
| `size-energy-badge` | `26px` | Attached-Energy badge diameter on board cards (about 7% of phone width); 20px inside attack rows. |
| `size-energy-stand` | `59px` | The Energy Zone stand (15% of phone width); its next-type badge is 20px. |
| `size-icon-button` | `53px` | Round icon buttons (back, close) on menu screens; 35px for the battle menu button. |
| `size-tabbar` | `49px` | Visual height of the bottom tab bar, before the home-indicator padding. |

## Duration

| Token | Value | Use |
| --- | --- | --- |
| `dur-instant` | `90ms` | Press feedback (scale-down on tap). |
| `dur-fast` | `150ms` | Hover, selection, chip toggles, tab changes. |
| `dur-base` | `240ms` | Cards moving between zones, sheets opening. |
| `dur-slow` | `380ms` | Card flips, the Energy attach arc, screen transitions. |
| `dur-reveal` | `620ms` | A rare-card reveal beat; the pack cut. |

## Easing

| Token | Value | Use |
| --- | --- | --- |
| `ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | Anything entering or responding to the player: the default. |
| `ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | Things moving from one place on screen to another (card to Bench). |
| `ease-pop` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Small overshoot for badges, points and damage numbers appearing. Never on large surfaces. |
| `ease-in` | `cubic-bezier(0.55, 0, 1, 0.45)` | Exits only: a KO'd card leaving, a dismissed toast. |

## Stacking

| Token      | Value | Use                             |
| ---------- | ----- | ------------------------------- |
| `z-board`  | `0`   | Board and slots.                |
| `z-hand`   | `10`  | The hand fan.                   |
| `z-tabbar` | `20`  | Bottom navigation.              |
| `z-drag`   | `50`  | A card or Energy being dragged. |
| `z-sheet`  | `100` | Sheets and the card inspector.  |
| `z-dialog` | `200` | Dialogs and pack opening.       |
| `z-toast`  | `300` | Turn and KO banners.            |

## Gradient

| Token | Value | Use |
| --- | --- | --- |
| `gradient-rainbow` | `linear-gradient(90deg, #c8ee28, #e8f00b, #f8af50, #fa898e, #f681ae, #ec84d2)` | The 2px rule under screen titles (My Cards, Wonder Pick) and the thin Opening Results rule. |
| `gradient-wall` | `linear-gradient(100deg, #acd4f8, #5880e0)` | The upper 'wall' of the pack screen; it meets a `surface` 'floor' on a slightly diagonal line at about 42% of screen height. |
| `gradient-sky` | `linear-gradient(180deg, #d4e8fc, #f0f4f8)` | Wonder Pick, the pack tear screen and Opening Results backgrounds. |
| `gradient-end-turn` | `linear-gradient(90deg, #7f98ec, #4deffc)` | The 2px hairline border of the End Turn pill. |
| `gradient-attack` | `linear-gradient(100deg, #e8362a, #ff8a3c)` | The diagonal attack-name banner (an estimate; the original is red to orange). |
| `gradient-complete` | `linear-gradient(90deg, #00dcb8, #80e4a8)` | Completed-mission rows. |

## Shadow

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `shadow-1` | `0 1px 2px rgba(20, 32, 43, 0.08), 0 1px 1px rgba(20, 32, 43, 0.04)` | `0 1px 2px rgba(0, 0, 0, 0.40)` | Resting panels and list rows on `ground`. |
| `shadow-2` | `0 6px 16px rgba(20, 32, 43, 0.12), 0 1px 3px rgba(20, 32, 43, 0.08)` | `0 6px 16px rgba(0, 0, 0, 0.45), 0 1px 3px rgba(0, 0, 0, 0.40)` | Menus, popovers, the tab bar. |
| `shadow-3` | `0 18px 40px rgba(20, 32, 43, 0.20), 0 4px 10px rgba(20, 32, 43, 0.10)` | `0 18px 40px rgba(0, 0, 0, 0.55), 0 4px 10px rgba(0, 0, 0, 0.45)` | Dialogs, the card being dragged, the inspected card. |
| `shadow-card` | `0 2px 6px rgba(20, 32, 43, 0.16), 0 0 0 1px rgba(20, 32, 43, 0.06)` | `0 2px 6px rgba(0, 0, 0, 0.50), 0 0 0 1px rgba(255, 255, 255, 0.06)` | Every card at rest: in hand, on the board, in the binder. |
