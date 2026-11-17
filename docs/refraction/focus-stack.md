# Focus Stack

Widget **Focus Stack** (`refraction-focus-stack`, module `modules/focus-stack`, 0.110.0), in the Pro widgets category.
A stack of slides where the slide in focus is a whole card and the others wait around it as slim cards showing only
their header or footer. The motion follows a reference the owner chose (a stack of health-app cards, Pinterest pin
901564419162885729): the waiting card opens into the current one, its content fading in once there is room, while
the old one folds into its own slim card on the other side. Check: `scripts/check-focus-stack.mjs`.

## Slides

- Every slide is a container under the widget (any number; Add Slide in the list). Inside it, the **first**
  container is its **header**, the **last** its **footer**, the ones between its **content**. A new widget starts
  with three slides, each holding Header, Content and Footer containers with an example inside.
- A slide with one container shows that container whether waiting or not.

## Layout (Content tab)

- **Stack**: up and down, or side by side (`orientation`, wrapper class `rf-fs-o-horizontal`).
- **Moves** (the "vice versa"): up and down, *Down* (the next slide waits above, the reference's way) or *Up* (it
  waits below); side by side, *Left* (the next slide waits on the right) or *Right* (on the left).
- **The next slides show** / **The previous slides show**: their header or their footer (defaults: header / footer).
- **Waiting slides on each side**: none, one, or two (the second smaller and fainter).
- **Go round**: after the last slide comes the first (on by default).
- **Height** (side by side), **Current slide at least** (up and down), **Turn the waiting slides' text** (side by
  side: the header or footer of a slim side card reads top to bottom).

## Motion

- **Duration**, **Easing** (smooth, snappy, gentle, springy, even), **Fade the content in**.
- **Play by itself** with **Each slide stays** and **Wait while the pointer is on it** (also while focus is inside).
- **Clicking a waiting slide opens it**. The arrow keys (towards the next card shows it) and a swipe always move it.
- `prefers-reduced-motion`: it moves at once, without animating.

## Style tab

- **Current slide**: background, border, corners, shadow.
- **Waiting slides**: space between cards; up and down: width next to the current one (88%) and two away (76%), a
  height (empty: the height of its header or footer); side by side: width (64px), height next to it (88%) and two away
  (76%); opacity next to it (1) and two away (0.45); background, border, corners, shadow.
- A slide container's own settings (its background, border...) still apply; the parts are ordinary containers, styled
  like any other.

## How it works

- Markup: `.rf-fs` (region, `aria-roledescription="carousel"`, focusable, settings in `data-rf-fs`) >
  `.rf-fs__slides` > the slide containers (`.rf-fs__slide`, `role="group"`, `aria-roledescription="slide"`).
- Script `assets/js/frontend/handlers/focus-stack.js` (registered as `refraction-focus-stack.default`): marks every
  slide `is-active`, `is-waiting` + `is-near`/`is-far` + `is-before`/`is-after`, or `is-hidden`, gives it a CSS
  `order`, marks its parts (`rf-fs__part--header`, `--footer`, `is-shown`). Moving: each changed card's old box is
  measured, the new places applied and measured, then each card animates its width and height from the old size to
  the new one (Web Animations API) while the stack flows around it; the card holds its kept part in sight
  (`justify-content` start for a header, end for a footer); entering cards grow from nothing, leaving ones shrink to
  nothing; the parts of the card that opens fade in after 45% of the motion, those of the card that folds fade out in
  the first 40%. Event `rf-focus-stack:change` (`detail.index`).
- **Edit Mode**: the preview is the same stack (the handler runs there; the JS-read settings are
  `frontend_available`). It does not play by itself, follows the slide picked in the panel (with the motion), rebuilds
  when slides or their parts are added, removed or re-rendered, and when a layout or motion setting changes. A click on
  a waiting card selects what is in it rather than opening it.
- Styles: `assets/scss/frontend.scss` (`widget-focus-stack.css`). Editor model and view:
  `assets/js/editor/` (entry `focus-stack` in `scripts/vite/shared/entries.mjs`).
