# Screen reference

How the original's screens are laid out, measured from its own screenshots, and which Pocket Deck components and tokens build each one. Positions are % of a 390×844 design box (9:19.5) unless marked px. A value tagged _(estimate)_ was inferred from written descriptions, not measured. Tune it by eye. Everything else was measured on an official screenshot. The numbers for the battle screen also live as data in [`../assets/battle-layout.json`](../assets/battle-layout.json). Motion timings in [`../assets/motion.json`](../assets/motion.json).

## Contents

1. Global UI language
2. Home and pack screens
3. Wonder Pick
4. Pack opening, step by step
5. Battle screen
6. Collection (My Cards)
7. Deck builder
8. Tablet and desktop rule

## 1. Global UI language

**Character.** Bright, pearly, near-white "soft-neumorphic" chrome: pale blue-grey panels with soft outer shadows and lighter inner top edges, pill buttons, slate line icons, one saturated cyan accent for primary actions, gold only for earned things. Everything is portrait. Section screens open with a full-bleed hero banner with a diagonal lower edge in a section colour (`hero-battle` blue, `hero-social` green) and a big white title. My Cards and Wonder Pick use a plain pale header with a RainbowRule instead.

**Palette by token.**

| Token | Where |
| --- | --- |
| `ground` | page wash behind everything |
| `surface` | panels, pills, filter panel, secondary buttons, tab bar |
| `surface-raised` | bottom sheets, dialogs, End Turn fill |
| `gradient-wall` | the upper "wall" of the pack screen, meeting a `surface` floor on a slightly diagonal line at about 42% of height |
| `gradient-sky` | Wonder Pick, the tear screen and Opening Results backgrounds |
| `hero-set` | expansion panel tint (each set may override it with a lighter diagonal sheen: Panel `data-tone="set"`) |
| `brand`, `on-brand` | primary pills. The original's white text fails contrast, so text is `on-brand` |
| `toggle-on`, `progress`, `gradient-complete` | on states, EXP and mission bars, completed missions |
| `strip` | player strips, battle menu circle, filled tab icons, selected Energy pills |
| `reward`, `coin-ink`, `point-empty` | point coins and empty point discs |
| `notice` | the red notification dot |
| `glow` | the cyan selection glow on the board |

**Panels, radii, shadows.** Panels: 24px radius, soft down-right shadow, 1px lighter inner top edge, sometimes a diagonal lighter sheen across the upper half (`data-sheen`). Bottom sheets: `surface-raised`, 20px top radius (`data-sheet`). Icon tiles (Binders, Display Boards and Decks, or Guide, Decks and Missions): about 64×64px rounded squares, 16px radius, `surface` fill, slate line icon, 11px label beneath. Speech bubble: 20px radius, centred 24×12px tail, inset lighter inner frame (SpeechBubble).

**Buttons.** Primary: glossy cyan pill, 49px tall for hero actions (Share, Open), 44px otherwise. Secondary: `surface` pill about 133×35px (Offering Rates, Cancel, Next, Change, Edit). "Select other booster packs" is a two-line pill with a chevron that bleeds off the right edge. End Turn: 101×33px with a 2px indigo-to-cyan hairline. Round icon buttons: 53px white circles (back, close) on menu screens. A 35px slate circle (menu) in battle. `?` is an outlined circle. Disabled: `surface-sunken` fill, `ink-subtle` text. Floating badge button (Pack Points): a 50px circle icon with a grey-blue pill label ("40 pts") beneath.

**Type sizes.** Section title 20–22px bold (`title`). Tile labels 11px. Pill labels 13–15px. End Turn 16px. Strip name 13px. Dialog title 18px bold, body 13px. Marketing display ("Got it!", "Ranked up!", section heroes) 36–44px white bold with a soft slate shadow, set on a slight diagonal (`display-l`, `display-xl`). Battle HP numerals 28–30px heavy geometric with a 2px white stroke (`numeral-xl`, Jost). Humanist sans for text (Cabin), geometric heavy for numerals (Jost).

**Iconography.** Slate outline icons with a slight double-line depth, 1.5–2px strokes, rounded joins. The active tab icon is filled. Vocabulary: house (Home), card and binder (My Cards), three people in a ring (Social Hub), two cards with a burst (Battle), three lines (Menu), clipboard with check (Missions), `?` (Help), bookmark-star (favourites), magnifier, pencil, trash, heart (wishlist), thumbs-up, hourglass items. Energy-type badges are the card-style glossy discs with a dark ring (EnergyBadge). The system ships its own drawings of all of these. Never the original's.

**Tab bar.** Five icon-only items, evenly spaced: Home · My Cards · Social Hub · Battle · Menu. Centres at 12.4%, 31%, 50%, 68.6%, 87.2% of the width. Glyphs about 24–26px. Visual bar 49px plus the home-indicator area. `ground` fill with no top border. Red dot top-right of an icon. No text labels. On tablet the same icons spread across the full width at the same relative positions (TabBar).

**Dialogs, sheets, toasts.** Modal dialog: centred `surface` card, 24px radius, bold title, thin divider, body text, one cyan OK pill. The screen behind dims and blurs (Panel `data-elevation="3"` over `scrim`). Full-height sheet: title bar with divider, content, cyan OK, close circle at the bottom (`data-sheet`). Prompt pill ("Please choose the booster pack you want.", "Pick a card"): a wide white pill centred at about 25–27% of height. The "You can open a booster pack" variant has a 2px gold ring and a pack icon above. Tutorial callouts: white bubble with a cyan border and cyan corner brackets around the target. Toasts ("Lv. 19 EXP +25", "Pack points"): translucent rounded pills sliding in at the top-right over the title.

## 2. Home and pack screens

**Home** _(estimate: reconstructed from written descriptions)_: profile avatar (36px) with name and level at the top-left. Pinned favourite binders or boards beneath it. An icon column top-right (Pass, News, Gifts, `?`). The three current packs centred at about 48% of height with the front pack about 42% of the width. A cooldown timer pill directly under the packs when none is ready. Wonder Pick tile bottom-left and Shop tile bottom-right at about 78%. A floating round Missions button (52px, red dot when claimable) above the tab bar at the right.

**Booster-pack screen** (measured): top bar at 13–17% of height with a round stamina icon, a stamina pill (110×37px, two pack icons for 2/2 with a teal "MAX" tag hanging below, or clock timers while recharging), an hourglass tile with a count, `?`, and a bookmark-star below it. Highlight SpeechBubble at x 14–86% (71% wide), y 29–39%, tail tip at 40%. Its strip shows card thumbnails about 12.8% of the width each. Pack carousel: centre pack 42.6% wide (aspect 0.51) from y 42% to 81%. Side packs 72% of the centre size, overlapped behind and yawed 25–35° toward the centre. A faint mirrored reflection beneath on the floor. Swipe to rotate. Tap the centre pack for the single-pack view. Pack Points badge: 50px circle at (88%, 79.6%) with a "40 pts" pill. Bottom row centred at 89.8%: Offering Rates pill (x 4–35%), back circle (44–56%), "Select other booster packs" pill with `>` bleeding off the right. Single-pack view: expansion-tinted panel on the upper 42% with a diagonal lower edge. One pack about 44% × 45% centred. Cyan Open pill (145×41px) under it. The same bottom row. Tab bar. "Select other booster packs" opens a popup of expansion rows, each a tinted panel with its three packs and two stamina timers plus an hourglass count.

## 3. Wonder Pick

Header "Wonder Pick" centred with a stamina row (five stamina icons and `+`) under it, `?` at the right, RainbowRule. A scrolling list of white rounded cards: timer Chip top-left ("00 hr 58 min 48 sec"), avatar and player name, expansion logo top-right, an inner light panel with the five cards in a 3 + 2 layout (cards about 24% of the width), a binder marker on owned cards, a heart for wishlisted, and a cost Chip (stamina × n) centred at the bottom. Friends' picks list first. Expired picks sink to the bottom. The detail sheet reads "Picks remaining 1 / Probability rate for each is 1/5" with the cost and a cyan Recover pill when short of stamina. Then five card backs swirl into a pile (skip button bottom-right), a "Pick a card" prompt pill over five face-down cards in 3 + 2, and "Got it!" with the card at about 80% of the width and a star-flair badge. All five are revealed: the chosen card first, the other four together.

## 4. Pack opening, step by step

1. **Choose.** Pack screen → tap the centre pack → single-pack view → Open. Out of stamina: a dialog to spend hourglasses.
2. **Ring carousel.** Identical packs stand in a ring on a pale stage with reflections. The prompt pill sits at about 26% of height. The centre pack is about 45% wide with a neighbour visible each side at about 33%, yawed 35°. Swipe to spin. Tap to lock in (no undo). The pack can be flipped to open from the back so cards come out face-down. All packs look the same. The carousel never changes the odds. Snap: `packCarouselSnap`.
3. **Tear screen.** All chrome disappears. `gradient-sky` background. The pack is huge, about 68% wide with its top edge at 47% of height and its body running off the bottom. The cut line is the lower edge of the header band, 8.5% of the pack's height from the top, with a faint glowing streak before it's touched. Hint text appears after a few seconds (`packHintText`).
4. **Cut.** A horizontal swipe along the top: the tear follows the finger (direct manipulation, BoosterPack `--pd-cut`), ending slightly diagonal. On release past about 85%, the detached strip (about 40% of the screen width × 7% of height) flies up and right while rotating 15–25° (`packStripFlyOff`), the cut edge glows cyan-white, and a prismatic burst erupts from the mouth (`packLightBurst`). Sound and a short vibration mimic a real pack.
5. **Cards rise.** The five cards slide up out of the pack as a stack, front card showing (face-down if the pack was flipped), with a small overshoot (`cardsEmerge`). Order is pack order: slots 1–3 are commons, slots 4 and 5 hold the higher rarities, highest at the back.
6. **Swipe aside.** Each swipe sends the front card off sideways (`cardRevealSwipe`) and the next settles with a slight scale overshoot (`cardRevealNext`). A rare card may be preceded by a colour shift of the background and a glow (`rareBuildupHold`), but not always. Moving or tilting a card shows its finish. After the last card the five fan out (`fanOutFive`).
7. **Swipe up to register.** Swiping up adds the cards to the Dex (`swipeUpRegister`). New cards get a New Chip (`newBadgePop`), and a new card gets one extra screen.
8. **Opening Results.** Title at about 15% of height with a `brand` RainbowRule. EXP and Pack Points toasts top-right. The five cards in a 3 + 2 grid (each about 24% wide, rows at about 35–51% and 54–70%). A Next pill (about 36% wide) at about 90%.
9. **Skipping.** A long press skips the current animation. There is no menu option. A Rare Pack (all five cards ☆ or better, 1 in 2,000) has no pre-opening tell. The player only knows when rare cards appear from the first reveal. ☆☆☆ Immersive cards play their scene when pulled (`immersiveScene`), the one real pause.

## 5. Battle screen

Portrait phone. The Board component encodes this. The board circle (Ø 73% of height, 159% of width, white `board-rim` about 1.5% of height thick) is centred on the centre line at 46.6%. The opponent's half is lavender, yours blue, with a lighter band at the line and a faint button motif at the centre. Outside the circle: `field-opp` above, `field` below. Playmats can recolour the mat per turn.

| Zone | Position (% of the box) |
| --- | --- |
| Opponent strip | top-right, y 7–10% _(estimate)_ |
| Opponent hand | y 10–17%, card backs 14.7% wide, fanned ±8°, clipped at the top |
| Opponent Energy Zone | Ø 11% W at (19%, 15%). Next badge Ø 4% W at its lower-left |
| Opponent discard | x 1–17%, y 22–32% |
| Opponent deck | x −6–16% (half off-screen), y 32–44% |
| Opponent Bench (3) | y 18–27.6%. Slots at x 21–38%, 41–60%, 61.5–81% |
| Opponent Active | x 35–65.5% (30.5% W), y 28.4–45%. Foreshortened to about 0.84 aspect |
| Centre line | y 46.6% |
| Auto toggle | x 80.7–97%, y 39.3–42.4% |
| End Turn | x 70.5–96.5% (26% W), y 45–49% |
| Your Active | x 34–66% (32% W), y 47.7–66.7%. Cyan glow when selectable |
| Your deck | x 86% to off-screen, y 50–61% |
| Your discard | x 87.5% to off-screen, y 63–74.5% |
| Your Bench (3) | y 67.7–82.3%. Cards at x 14.7–37%, 39.5–61.5%, 64–86% (22.6% W, 2.3% gaps) |
| Menu button | Ø 9% W at (7.9%, 78.6%) |
| Your Energy Zone | Ø 15.2% W at (88.8%, 86%). Next badge Ø 5.1% W at (93.7%, 87.2%) |
| Your hand | cards 22.6% W, top edge at 83%, lower 40% off-screen, fanned ±5–8° |
| Your strip | x 0–44%, y 93.5–96.6%, right end slanted about 20° |

The far side is drawn in perspective: horizontal scale about 0.85, vertical about 0.8 (a plane tilted 20–25°, or per-row scale factors). Empty slots are translucent white rounded rectangles (`slot`, 10px radius). Valid targets pulse with a cyan `glow` 8–10px blur and no hard border. Unavailable spots grey out. Dropping on a grey spot prompts. HP floats above each card's top-right as a stroked numeral with a mint bar on a white track (HpMeter). Attached Energy stacks along the card's bottom-left as 26px badges overlapping by 2–3px. A condition icon sits under the HP, alternating when there are several.

Interactions: drag the orb from the Energy Zone onto a Pokémon (valid targets pulse). Pull a card upward out of the hand onto a slot or onto the Pokémon it evolves. Tap your Active to enlarge it to 85–90% of the width with its attacks tappable, then a diagonal red-orange Banner shows the attack name and the attacker while the card lunges (`attackBanner`, `attackLunge`). Attacking ends the turn. End Turn pill. Auto toggle. Menu circle (concede needs two confirmations). Timers: 90 s per turn (45 s after a timeout in Ranked), a 20-minute clock per player. Show remaining time in the strip _(estimate)_. Points: three discs in the strip. An earned point becomes a gold coin with a blue numeral. An ex KO gives two. Pre-battle: a VS screen with diagonal red (opponent, top) and blue (you, bottom) bands and avatars. Place Active and Bench, then Start Battle. Post-battle: results, then a Thanks prompt.

## 6. Collection (My Cards)

Header "My Cards" centred (21px bold), `?` at the right, RainbowRule. Filter Panel at x 4.3–95.7% (91% wide), y 28–36.5%: three icon tiles (Binders, Display Boards, Decks) on a lavender-tinted upper half, then a count Chip (card icon + "1,025"), a Toggle between Owned and Dex, with a binder icon, a divider and a magnifier. Toggle off shows owned cards. On (teal) shows the full Dex with missing cards as pale numbered slots and per-rarity counters (◊ 183/226, ☆ 22, ♕ 1) above the grid. Grid: five columns, tiles 17.4% wide (aspect 0.71), pitch 18.4%, gutters 1%, side margins 4.4%, row gap 10px, grid top at 38.6% of height (DexTile in `.pd-dex-grid`). The zoomed-in view is three columns (tiles 28%) with a slate owned-count tab at each tile's bottom-left. Pinch changes the size and plays a cascading flip when unsorted. A sort button bottom-right (expansion order, number, type, rarity, date added, duplicates) and a floating round binder button. New cards carry a New Chip top-left _(estimate)_.

Binders: a two-column list of binder tiles (cover thumbnail, name, hashtag, "24/30"), a Create New tile with `+`, "2/15" count. The editor has the cover at top, a name field, a three-column slot grid of rounded squares with `+`, Cancel and Save pills. A Select Cover sheet. An Add picker with search and a three-column grid plus a cyan Add. Up to 30 cards, 15 binders. Display Boards: two-column tiles, "7/15", a two-column frame picker, and an editor with a full-bleed themed backdrop, the single card at about 60% of the width, Private and tag chips top-left, "1/1" top-right.

## 7. Deck builder

My Decks: header, count "12/15", a two-column grid of deck tiles, each a 3D deck box plus two feature cards on a type-coloured header with a big numbered tab (01, 02…) and the name beneath. The first tile is Build New with `+`. Deck edit: a deck-name pill with a pencil, trash and bookmark at the top. A type-tinted hero area with the deck box and a Change pill. Three tiles (Energy with the chosen type badges, Accessories, Highlight cards). Then the card-list Panel with a "20/20" counter, an Edit pill and a three-column card grid. Energy selector: a modal "Energy: You can select the Energy that generates in battle" with a 2×4 grid of type pills (Grass, Fire, Water, Lightning, Psychic, Fighting, Darkness, Metal, as Chips with EnergyBadges). Selected pills take the `strip` fill with white text. All types the deck's attacks need are selected by default. Decks: exactly 20 cards, at most two of a name, no Energy cards, up to 15 decks. Validation _(estimate)_: Save disabled until 20/20, the counter turns `danger` when over, copy like "A deck needs 20 cards." Deck select for battle shows a deck tile and a cyan Battle! pill.

## 8. Tablet and desktop rule

The original does not letterbox. On a 4:3 tablet the same portrait UI stretches to the full screen: the background is full-bleed, the tab bar spans the width with its five icons at the same relative x, the My Cards grid stays five columns with wider tiles, the pack carousel reveals more of the side packs, and dialogs stay centred at a fixed maximum width. In battle on 4:3 the board circle is fully visible and fits the width (Ø about 100% W, 75% H). Decks and discards are fully on-screen (yours at about 87% W, 57% H). End Turn sits at (87.5%, 45%), Auto at (92%, 37.5%), the Energy Zone at (83%, 92%). Your Active is about 25% of the width. Cards scale with height more than width and HUD controls stay anchored to the right edge with margins.

Rule for the replica: lay every screen out in a 9:19.5 design box (390×844 at phone size), scale the box to fit the viewport height, centre it, and let the background, the board circle and edge-anchored HUD bleed to the edges. Portrait only. On desktop centre the box (max about 480px wide) on a full-bleed `gradient-wall` or field and let the circle overflow as it does on phones.
