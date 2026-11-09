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
  - **Text and icon**: an **Icon** before or after the text, in place of the arrow (empty keeps the arrow), and an optional **Small Text Above** (`.rf-showcase__button-small` over `.rf-showcase__button-text`), which makes store badges: "GET IT ON" over "Google Play" with `fab fa-google-play`, "Download on the" over "App Store" with `fab fa-apple`.
  - **Image only**: the **Button Image** is the whole button (`.rf-showcase__button--image`: no background, border or padding), with an **Image Height**. The button text becomes the image's alt text. Use it for the official store badges.
- Style > Buttons > Both Buttons: **Icon Size**, **Space Between Icon And Text**, **Small Text Typography** and **Border Width**; plus **First Button Border Color**.
- `scripts/check-phone-showcase.mjs` checks a badge (icon before the text, the small line above it, no arrow) and an image button (the image only, its alt text, no background or padding).
