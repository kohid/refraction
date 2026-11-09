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
