# Design notes

PillarFortune looks like a printed almanac rather than a "mystical app": warm paper, black ink and a single vermilion accent. The previous dark theme (starfield, gold gradients, glass panels, pill chips) was the generic look of AI-generated interfaces, and it hid the product's actual point, which is that everything is checkable.

## References

- **Co–Star**: restraint and an editorial calm. Typography carries the brand and ornament stays out of the way.
- **Printed almanacs (黄历) and seals (印)**: black and vermilion on paper. The logo is a seal bearing 卜 (bǔ), the oldest character for divination. A small red seal marks a verified draw.
- **Tarot de Marseille**: flat line work on card stock, with a numeral cartouche at the top and a title cartouche at the bottom. Each major arcanum has exactly one vermilion focal element.
- **Financial papers and technical reports (FT, Economist charts)**: hairline rules instead of boxes, figures with captions, ink-coloured charts with one highlight colour, and key figures set large in a serif.
- **The editor's red pencil**: validator findings appear in red with a left rule, like corrections in a margin.

## Tokens (`src/styles.css`)

| Role | Value |
|---|---|
| Paper · raised · sunk | `#f3efe6` · `#faf7f1` · `#e9e3d6` |
| Ink · secondary · tertiary | `#1b1916` · `#4a453d` · `#6d675a` (≥ 4.5:1 on paper) |
| Rules | `#d8d0c1`, stronger `#bfb5a2`; `ink` for section tops |
| Accent (朱 vermilion) | `#b93a26`; also the "rejected" colour |
| Status text | ok `#2e6b4a`, warn `#8a5a00` |
| Five elements (text) | wood `#2c6b45`, fire `#b3382a`, earth `#8f6a1c`, metal `#5f636a`, water `#2a5690` |

The chart colours in `.viz` were checked with the dataviz palette validator against the paper surface:

- The ordinal ink ramp for 1–4 model calls passes: monotone lightness, and the light end has ≥ 2:1 contrast.
- Status marks are always shown with an icon and a label.
- The confusion-matrix ramp passes the ordinal checks.
- Metal is achromatic by tradition (白), so it fails the chroma floor. Every element mark carries a text label.

## Typography

- **Newsreader** (variable, optical sizes) for everything you read: headings, body, card names, the question itself.
- **IBM Plex Mono** for machinery: labels, buttons, numbers, seeds, code paths, chart ticks.
- **Chinese** uses Noto Serif SC, loaded without blocking render, with fallbacks to Songti, Source Han Serif and SimSun. `font-synthesis-style: none` stops browsers from slanting CJK.

## Rules

1. There are no gradients, glows, glassmorphism or background decoration, and the paper is flat.
2. Sections are separated with rules and whitespace, and a box is used only for something you can pick up: an input, a card, a sheet.
3. Vermilion appears once per view as a focal point: the active nav item, the current card slot, a major arcanum's emblem, a highlighted bar, a rejection. It is never used as a background wash.
4. Uppercase monospace is reserved for labels. Prose, questions and answers are serif, and questions are set in italics.
5. Headings and prose are left-aligned. Only the deck and card layouts are centred, because they are symmetric objects.
6. Motion is limited to the shuffle, the deal and the flip. Everything else is instant or a short rise, and all of it respects `prefers-reduced-motion`.
