# Phone Showcase (0.53.0)

Widget `refraction-phone-showcase` (module `modules/interactions`: `widgets/phone-showcase.php`,
`assets/js/phone-showcase.js`, styles in `assets/scss/frontend.scss`). An interactive walk-through of an app: steps on
one side, a phone (or tablet) on the other showing the screen of the current step, floating cards around it.

## Settings

- **Steps** (up to 20; the panel stops adding at 20 and the page shows at most 20): icon, title, description, a
  **Screen** image (a screenshot; without one a placeholder with the step's number and title shows) and its
  background. **Text Above The Steps** with an icon, **Step Number** (on the current step in place of its icon, on
  every step, or never), and a **Button Under The Steps**.
- **Phone**: the **Device** library, 13 frames drawn in CSS and scaling as one piece (container query units):
  a phone with a camera island, with a notch, with a centered or a corner camera hole, edge-to-edge, rounded with even
  bezels, compact, classic with a home button, a foldable (open), a clay mockup, an outline, a tablet upright and
  sideways; in 9 colors or your own. Or **My own frame image**: a device picture with a see-through screen, and where
  the screen is (top, right, bottom, left in % of the picture, and its corners); the screen sits under the picture.
  **Status Bar** (dark, light, none) and its time, **Screenshots** (fill from the top, full width scrolling inside the
  phone, or whole), **Screen Change** (slide in like an app, fade, zoom, at once), **Tap The Phone For The Next
  Step**, **Play By Itself** with the time per step, **Phone Floats Gently**.
- **Floating Cards** (up to 8): icon, title, text, stars (a rating card), position across and down in % of the
  phone (outside it with less than 0 or more than 100), **Shown On Step** (0: always; a number: it pops in with that
  step). Cards Float; Cards On Phones.
- **Layout**: phone on the left or right, on small screens steps first or phone first, phone width, steps width,
  spaces. Style: steps (normal and current: background, border, title, description, icon/number colors; typography,
  padding, corners; timing line color), the text above, the phone (screen background, shadow, a glow behind it),
  the cards and the button.

## Behaviour

The steps are tabs (`role="tablist"`, each `role="tab"` with `aria-selected`, the screen is their `tabpanel`): click,
or the arrow keys, Home and End. A tap inside the phone shows the next step (after the last, the first). Screens
before the current one get `is-past` (they slide out to the left). Playing by itself, the current step shows a line
timing it; it pauses while hovered or focused, off screen and in a hidden tab, and never runs for reduced motion
(which also stops the floating). It works the same in the editor's preview.

Check: `node scripts/check-phone-showcase.mjs --site DIR --port N`.

## Heading, description and a second button (0.59.0)

- **Content > Steps**: under **Text Above The Steps** (and its icon) come a **Heading** (multi-line; its line breaks are kept; **Heading HTML Tag**, H2 by default) and a **Description**. Each is left out when empty. With the text above the steps, they sit in `.rf-showcase__intro`, before the steps.
- **Second Button** with its own link, beside the first in `.rf-showcase__buttons` (they wrap onto a second line when they don't fit). The first is `.rf-showcase__button--primary`, filled in the accent. The second is `--secondary`, an outline in the accent by default.
- **Style > Steps**: Heading Color and Typography, Description Color and Typography, Space Under The Heading And Description.
- **Style > Buttons** (shown when either button has text): Space Between The Buttons. Each button has its own colors (the second also has a border and hover text color), and both share padding and corners. The first button's existing settings carry over.
- `scripts/check-phone-showcase.mjs` checks the order (text above the steps, heading, description, steps, buttons), the heading tag and line break, and the two buttons side by side with their own links.

## Button icons, store badges and image buttons (0.60.0)

- Each button (Content > Steps) has **Show**:
  - **Text and icon**: an **Icon** in place of the arrow (empty keeps the arrow), and **Icon Position** (before or after the text; not set: a chosen icon before, the arrow after; 0.65.1 offers it without an icon too and moves the arrow with it), and an optional **Small Text Above** (`.rf-showcase__button-small` over `.rf-showcase__button-text`), which makes store badges: "GET IT ON" over "Google Play" with `fab fa-google-play`, "Download on the" over "App Store" with `fab fa-apple`.
  - **Image only**: the **Button Image** is the whole button (`.rf-showcase__button--image`: no background, border or padding), with an **Image Height**. The button text becomes the image's alt text. Use it for the official store badges.
- Style > Buttons > Both Buttons: **Icon Size**, **Space Between Icon And Text**, **Small Text Typography** and **Border Width**; plus **First Button Border Color**.
- `scripts/check-phone-showcase.mjs` checks a badge (icon before the text, the small line above it, no arrow) and an image button (the image only, its alt text, no background or padding).


## Button hover (0.71.0)

Style > Buttons: per button Hover Background, Hover Text Color, Hover Border Color and Hover Animation (the standard
`refraction-animation-*` classes, their CSS loaded with the setting); for both, Box Shadow, Hover Shadow, Hover
Transition (`--rf-showcase-btn-t`) and Lift On Hover (`rf-showcase-lift-yes`, default on: rises 3px with a soft shadow,
skipped for a button with a Hover Animation and for reduced motion; written with `:where()` so a Hover Shadow wins).
Highlight Words has a box per part (see highlight-words.md).


## Cards and progress bar (0.72.0)

Up to 100 floating cards (`MAX_CARDS`). The cards repeater has Content / Style tabs; the Style tab's controls use
`{{CURRENT_ITEM}}.rf-showcase__card` and win over Style > Floating Cards. Icon Size / Icon Padding / Icon Corners
(shared and per card, `card_icon_controls()`) set `--rf-card-icon-size` (default 16px) and `--rf-card-icon-pad`
(default 10px) on `.rf-showcase__card-icon` (content-box, so 16 + 2 x 10 = the old 36px box). Progress bar (Style >
Steps, with autoplay): `progress_show` (prefix class `rf-showcase-progress-yes`, default on; without it the bar is
hidden), `progress_color` (now only the bar's background), `progress_height`, `progress_radius`, `progress_inset`,
`progress_offset` (`--rf-showcase-timer-gap`) and `progress_position` (`rf-showcase-progress-at-top`).

## Icon settings (0.74.0)

`includes/widgets/traits/icon-box-style.php` (`Icon_Box_Style::controls()`) gives any icon box Icon Size, Icon Padding
(the box then fits the icon), Icon Corners and optionally Icon Color / Background. Used for the step icons
(`step_icon_box_*`, plus `step_number_size`), the button icons (`button_icon_box_*`), the pill label's badge
(`label_pill_icon_*`, plus `label_pill_typography`), the Heading's Pill Label badge (`rf_pill_badge_icon_*`, plus
`rf_pill_typography`) and the Nested Carousel's title icons.

Editor fix: `controls-css-parser.js` used the element's `__globals__` for repeater items too, so a Global Color picked
on an item (a floating card...) did nothing in the preview; items now use their own `__globals__`. Global values also
keep a declaration's `!important`.

## Placing the floating cards (0.84.0)

Each card: **Horizontal Orientation** (`card_h`: from the left / right of the phone) with **Offset** (`card_offset_x` /
`card_offset_x_end`), **Vertical Orientation** (`card_v`: from the top / bottom) with **Offset** (`card_offset_y` /
`card_offset_y_end`); responsive, px / % / em / vw (% of the phone). They set `--rf-card-left|right|top|bottom` and drop
the centering shift (`--rf-card-tx|ty: 0%`). Until they are set, a card stays where Across / Down (`x`, `y`, the middle
in % of the phone, before 0.84) put it: those settings are kept, hidden (`rf-legacy-control`), so their CSS is still
printed; new cards start there too.

**Drag to place** (editor preview, `editDrag()` in `phone-showcase.js`): a card follows the pointer (inline
`--rf-card-*`, the phone's scale accounted for); let go, the Offsets of its orientation are written for the device shown
(`card_offset_x_mobile`, ...) through `$e` `document/elements/settings` (undoable), in % of the phone, or px when the
setting already is in px.

## Style tab, organised (0.87.0)

One section per part, in the order they show: Highlighted Text (Highlight Words), **Pill** (`section_style_label`:
Text, Pill, Icon), **Heading** (`section_style_heading`: Text), **Description** (`section_style_description`: Text,
Spacing), **Steps** (tabs Normal / Hover / Active; Normal: Colors, Text, Box, Icon; Hover and Active: Colors; then the
Progress Bar), **Phone** (Colors, Box, Place, Size And Tilt), **Floating Cards** (Normal: Colors, Text, Box, Icon;
Hover: Colors, Box) and **Buttons** (Normal: First Button, Second Button, Both Buttons, Icon; Hover: First, Second,
Both). The category names are headings made by `category()` (class `rf-panel-category`, a quieter heading); in a long
section they also become the section's group tabs (`groupSection()`, 0.86). Setting ids did not change, so saved
pages keep their look. New: `step_*_hover` colors, `card_bg_hover`, `card_title_color_hover`, `card_icon_bg_hover`,
`card_shadow_hover`.

This is the pattern for organising other widgets: sections per part, state tabs where a part changes, categories inside.
