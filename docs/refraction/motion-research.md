# Motion research: what makes a site feel made, not generated (0.47.0)

The question: what can Refraction's widgets offer so a site built with them does not look like a generated one,
mostly through motion. Written with the frontend-design and fullstack guidance: decide by what moves and why, not by
how much moves.

## What reads as "generated"

- The same fade-and-slide-up entrance on every section and a hover lift on every card. Motion with no reason, spread
  evenly, is the strongest tell.
- Motion that plays at the visitor instead of answering them: everything animates on load, nothing reacts to the
  pointer, the scroll or a click.
- Identical rhythm everywhere: one duration, one easing, one distance.

What reads as made: **one orchestrated moment** per page (a hero reveal, a band of words), motion that **answers the
visitor** (the pointer, the scroll speed, a click, following a link), and pieces that carry the brand's own words
and pictures.

## What Refraction already had (before 0.47)

| Area | Features |
| --- | --- |
| Entrances | Entrance Animation; **Reveal** (whole element, text line / word / letter, children one after another, once / every time / with the scroll) |
| Scroll | Scrolling Effects (move, fade, blur, turn, scale) with parallax presets; Sticky with shrink; Page scrolling (one section per scroll, smooth, snap); Scroll Sequence; 3D Build Scene; Progress Tracker |
| Pointer | Mouse Track, 3D Tilt, hover animations, Hotspot |
| Pieces | Animated Headline, Lottie, Card stack (fan, deck, carousel, shuffle), Timed cards, Flip Box, Countdown, Counter, Shapes and Text Path, Loading screen, Popups with animations |

## Gaps found

1. **Marquee / ticker**: a band of words or logos that keeps running. It is on most hand-made studio and brand sites,
   and nothing in Refraction did it.
2. **Motion that answers the pointer at the level of the whole site**: a cursor of the site's own, that changes over
   links and says what a click will do ("View", "Play", "Drag").
3. **Magnetic buttons**: the button leans towards the pointer before it is reached.
4. **Page transitions**: going from page to page feels like one site instead of a reload.
5. **Image and section wipes** (uncovered by a clip, not faded) and **text that lights up as it is read** with the
   scroll: Reveal only faded, moved, zoomed and blurred.
6. Later (not in 0.47): a container that scrolls **sideways while pinned**, **cards that stack** as the page scrolls,
   a **list whose items show a picture under the pointer**, **scrambled text** that decodes, a **moving gradient or
   grain** background, cursor trails of images.

## Built in 0.47.0

| Feature | Where | Why it helps |
| --- | --- | --- |
| **Marquee** widget | Widgets panel (Pro) | Words, icons or logos running on; two rows going opposite ways; solid and outlined words; speeds up with the scroll (or turns with its direction); tilt into a ribbon; faded edges; turning separator; gray logos that take their color under the pointer; pauses on hover and keyboard focus |
| **Site cursor** | Site Settings > Motion & Cursor | Dot and trailing ring, ring, dot or an inverting disc; grows over links and buttons; shows an element's **Cursor Word**; steps aside where asked |
| **Magnetic** | Advanced > Interactions (every element) | Pull and reach; for buttons, icons and small cards |
| **Page transitions** | Site Settings > Motion & Cursor | Cross-fade, rise in, wipe up, step back; browser View Transitions, no script |
| **Reveal: wipes and light up** | Advanced > Reveal | Wipe up / down / from either side; text that goes from faint to full word by word (best "with the scroll") |

Rules kept for all of them: local only, no library; nothing for touch where it would not help (cursor, magnetic);
off or still for reduced motion (the marquee wraps instead of running); screen readers get each item once; scripts
load only on pages that use them.

## Next batch (proposed)

1. **Scroll sideways** (container): pins the container and moves its children across as the page scrolls.
2. **Stacking cards** (container): its children stick one over another, the earlier ones shrinking back.
3. **Hover image list** (widget): links in large type; the hovered one's image follows the pointer.
4. **Scramble text** (Reveal text effect): letters cycle through characters before settling.
5. **Moving background** (container): slow gradient drift and film grain, paused off screen.

See [interactions.md](interactions.md) for how the 0.47 pieces work.
