# Banner

A diagonal announcement band over the board: turn changes, attacks, KOs, points, wins, rare pulls. Measured from the attack banner: a diagonal band with the attack name in big white italic display type and the Pokémon's name beneath, on a red-to-orange gradient.

## The consumer provides

`<div class="pd-banner" role="status" data-tone="…"><span class="pd-banner__title">Your Turn</span><span class="pd-banner__detail">Turn 3</span></div>`, centred over the board, removed after about 1 s (turn) or on tap (results).

## Attributes

| Attribute | Use |
| --- | --- |
| default (`hero-battle` blue) | turn changes |
| `data-tone="attack"` | an attack: title is the attack name, detail the attacker |
| `data-tone="danger"` | your Pokémon Knocked Out, defeat |
| `data-tone="reward"` | points earned, victory, rare pulls |
| `data-tone="neutral"` | coin results, draws |

## Rules

- One banner at a time. Queue the rest in event order. Titles are two or three words in `display-l` italic.
- Enter over `dur-base` with `ease-pop` from the left. Under reduced motion it fades.
- A long press skips the current animation, never the information: the engine state is already final.
