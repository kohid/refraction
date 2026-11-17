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
- **Add Slide** (0.111.0) gives the new slide its Header, Content and Footer containers with the example inside, like
  the first three (`new_items_like_defaults()`, see `docs/refraction/editor-panel-speed.md`).
- Each slide in the list (0.114.0) chooses **Waiting as a next slide, it shows** and **Waiting as a previous slide, it
  shows** (*As set for every slide*, *Its header* or *Its footer*: `slide_next`, `slide_prev`) and **In focus, it
  shows** (*As set for every slide* or one of the choices of "The slide in focus shows": `slide_focus`), labelled **In
  focus on the site, it shows** since 0.116.0, and **In focus in Edit Mode, it shows** (`slide_focus_edit`: *As on the
  site* or one of those choices; read only in Edit Mode, from the model, so the site's `data-rf-fs` does not carry it). On the site
  they are in `data-rf-fs` as `own: [{next, prev, focus}]`; `''` falls back to the Layout settings.
- 0.111.0's **When waiting, it shows** (`waiting_part`, both sides) still counts where a slide set it and its next /
  previous choice is "as set for every slide"; the control shows only on those slides ("Set before"), so it can be
  cleared.

## Layout (Content tab)

- **Stack**: up and down, or side by side (`orientation`, wrapper class `rf-fs-o-horizontal`).
- **Moves** (the "vice versa"): up and down, *Down* (the next slide waits above, the reference's way) or *Up* (it
  waits below); side by side, *Left* (the next slide waits on the right) or *Right* (on the left).
- **The next slides show** / **The previous slides show**: their header or their footer (defaults: header / footer),
  for every slide that does not choose its own.
- **The slide in focus shows** (0.112.0): everything (header, content and footer), its content only, its header and
  content, or its content and footer (`focus_shows`). The parts left out get `is-off` in focus and are hidden; they
  still show while the slide waits, if that is the part it shows. Moving on, a part coming into sight grows from
  nothing and one going shrinks to nothing (its height), so nothing jumps at the end.
- **Waiting slides on each side**: none, one, or two (the second smaller and fainter).
- **Go round**: after the last slide comes the first (on by default).
- **Height** (side by side), **Current slide at least** (up and down), **Turn the waiting slides' text** (side by
  side: the header or footer of a slim side card reads top to bottom).

## Motion

- **Duration**, **Easing**, **Fade the content in**. The easings (0.116.0, shared with Showcase Wheel): smooth, snappy,
  gentle, soft, glide, speed up, sharp, springy, anticipate, bounce at the end, elastic, even. Labels:
  `modules/pro-widgets/classes/motion-easings.php`; curves: `assets/dev/js/frontend/utils/motion-easings.js` (bounce and
  elastic are `linear()` curves, springy where a browser lacks `linear()`).
- **Play by itself** with **Each slide stays** and **Wait while the pointer is on it** (also while focus is inside).
- **Clicking a waiting slide opens it**. The arrow keys (towards the next card shows it) and a swipe always move it.
  In Edit Mode a click selects what is in the card; when this is off, selecting a widget inside a waiting slide edits it
  where it is (0.114.0). Otherwise the editor's nested-widget hook (`nested-repeater-focus-current-edited-container`)
  picks the slide holding the selection and the stack brings it into focus. The hook asks the widget's view
  (`keepsItemInPlace( index )`) whether to leave an item where it is.
- `prefers-reduced-motion`: it moves at once, without animating.

## Style tab

- **Current slide**: background, border, corners, shadow.
- **Waiting slides**: space between cards; up and down: width next to the current one (88%) and two away (76%), a
  height (empty: the height of its header or footer); side by side: width (64px), height next to it (88%) and two away
  (76%); opacity next to it (1) and two away (0.45); background, border, corners, shadow.
- **Waiting slides layout** (0.112.0), with a **Next** and a **Previous** tab: padding, direction, justify content,
  align items and gap of the header or footer a waiting slide shows. They set the container's own layout variables
  (`--padding-*`, `--flex-direction`, `--justify-content`, `--align-items`, `--row-gap`/`--column-gap`) on
  `.rf-fs__slide.is-next` / `.is-prev` `:not(.is-moving) .rf-fs__part.is-shown`; empty keeps that container's own
  layout, and in focus each container is laid out its own way again. The waiting part is no longer centred by the
  widget (it was `justify-content: center`); its own layout or these settings decide.
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
- **Edit Mode** (0.111.0): the settings the script reads have `render_type: none` (the widget is not drawn again; the
  handler rebuilds the stack from `onElementChange`), Stack and Turn have `ui`. A change applies in about 0.1 s (it took
  about 1.8 s).
- **Edit Mode**: the preview is the same stack (the handler runs there; the JS-read settings are
  `frontend_available`). It does not play by itself, follows the slide picked in the panel (with the motion), rebuilds
  when slides or their parts are added, removed or re-rendered, and when a layout or motion setting changes. A click on
  a waiting card selects what is in it rather than opening it.
- Styles: `assets/scss/frontend.scss` (`widget-focus-stack.css`). Editor model and view:
  `assets/js/editor/` (entry `focus-stack` in `scripts/vite/shared/entries.mjs`).

## Reveal inside a waiting card

A widget with Reveal that moves while hidden (fade up 40px, zoom...) can be moved right out of a slim waiting card,
which clips its content. The browser's IntersectionObserver then never sees it and it stayed invisible (0.113.0 and
before, also on the site). Since 0.114.0 Reveal (`modules/motion-effects/assets/js/reveal.js`) also watches the
element's parent, which does not move: when the parent comes into sight and the element, where it stands without the
move, is on screen, it plays.

