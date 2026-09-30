# Design notes

PillarFortune looks like a tarot parlour after dark. The reference is the table of a real reading: midnight velvet, a celestial chart embroidered in gold, a gold-edged box, and the Rider–Waite–Smith deck laid out on the cloth. The technical parts (traces, validator findings, figures) use the same materials, so the checkable parts of the system read as part of the product rather than an appendix.

It replaces two earlier attempts:
- The first was a generic dark theme with a purple gradient, glass panels, pill chips and abstract icon cards. It looked like a template.
- The second was a light "printed almanac" theme. It was clean but had none of the atmosphere a tarot reading needs.

## References

- **Reading cloths and tarot shops.** Navy velvet with a gold zodiac wheel, constellations and sun-and-moon line art. The same motifs appear on card boxes and pouches. The background wheel, corner stars and double gold rules come from here.
- **Gold-foil tarot editions.** Rider–Waite–Smith art inside a gold border. Card faces use a foil gradient frame and a slightly antique finish.
- **The 1909 Rider–Waite–Smith deck.** Pamela Colman Smith's illustrations, in the public domain. They are what people picture when they think of tarot, so the deck is the real thing rather than an imitation.
- **Astrolabes and star charts.** Degree ticks, a hexagram, a {12/5} star polygon and zodiac names set along the ring.

What is deliberately left out: purple as the base colour, glassmorphism, gradient blobs, pill chips, emoji, and uniform twinkling "screensaver" stars.

## Tokens (`src/styles.css`)

| Role | Value |
|---|---|
| Night · surface · raised | `#0a0f1f` · `#111a30` · `#18233f` (navy, not purple) |
| Parchment text | `#f0e8d6`, secondary `#c9c1ad`, muted `#8f97ab` (≥ 4.5:1 on every surface) |
| Antique gold | `#d6b370`, bright `#f0dcaa`, deep `#a8843f`; hairlines are gold at 16% and 34% |
| Status text | ok `#8fd1ab`, warn `#e9bd6a`, bad `#ee8d78` |
| Five elements (text) | wood `#86c79f`, fire `#f08c6e`, earth `#e0bb6c`, metal `#d3d7de`, water `#86b7ec` |

Chart colours in `.viz` were checked with the dataviz palette validator against the `#111a30` surface:
- The ordinal gold ramp for 1–4 model calls passes. So does the confusion-matrix ramp: one hue, monotone lightness, and ≥ 2:1 contrast at the faint end.
- Status marks sit in the 6–8 CVD band, so they always come with an icon, a label and a 2 px gap.
- Metal is achromatic by tradition, so it fails the chroma floor. Every element mark is labelled.

## Typography

- **Cinzel** (Roman inscriptional capitals) for the wordmark, labels, buttons and card names: the voice of the cards.
- **Newsreader** for everything you read: headings, the question, the reading, the answers. One word per hero is set in gold-foil italics.
- **IBM Plex Mono** for machinery: seeds, router readouts, traces, tick labels.
- **Chinese** uses Noto Serif SC, loaded without blocking render, with fallbacks to Songti, Source Han Serif and SimSun. Synthetic italics are disabled so CJK is never slanted.

## The sky

- `CelestialBackdrop` draws the star field on a single canvas at about 30 fps:
  - About 40% of the stars breathe slowly.
  - Every 0.7–2.2 s one bright star glints with a four-ray flare.
  - A meteor crosses every 14–28 s.
  - It pauses when the tab is hidden, and under `prefers-reduced-motion` it is a still image.
- The zodiac wheel is inline SVG at 30% opacity and turns once every six minutes.
- A vignette and a 6% grain give the velvet depth.

## Rules

1. The base is navy. Purple appears nowhere.
2. Gold is line work first: rules, rings, stars and foil text. Filled gold is reserved for the primary action and the card borders.
3. No boxes. Sections are separated by space, ornamental dividers, hairlines and soft gold light. Inputs are underlines on the cloth. There are no glass cards or pills.
4. The reading pages are centred and symmetric, like cards on a cloth. The technical report (Lab) is left-aligned inside a centred frame.
5. Motion is limited to the sky, the shuffle, the deal and the flip.
