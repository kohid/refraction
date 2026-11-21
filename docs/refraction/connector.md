# Connector (0.140.0)

`modules/connector`: a widget that draws an arrow from one element to another.

## Use

Put a Connector in a container. By default it goes **from** the container holding it **to** the container after it
(the next element at the same level). Either end can also be the container before it, or any element by its CSS ID
(Advanced > CSS ID). The widget takes no room: it sits at its container's top left corner with no size, and the arrow
overflows it. In Edit Mode a small "Connector" chip there selects it (and Structure lists it).

## Settings

- **Connect**: From and To (holding container, next, previous, CSS ID); for each end its Side (facing the other one,
  right, bottom, left, top) and Place Along The Side (%), per screen size.
- **Path**: straight, elbow (right angles) or curved, per screen size; Rounded Corners (elbow); Curve (%); Gap At The
  Ends; Layer (over the page, behind the elements).
- **Arrow Ends**: at the end and at the start: arrow, open arrow, thin arrow, dot, diamond, square, none.
- **Animation**: flowing dashes, drawn when it comes into view (solid while drawing, its own dashes after), a dot
  travelling along; Duration. None of them for visitors who ask for less motion.
- **Style > Line**: colour, width (per screen size), style (solid, dashed, dotted), ends size (per screen size),
  travelling dot colour.

## Like a diagram tool (0.141.0)

- **Pick on the page** (each end): the preview shows a crosshair and outlines the element under the pointer; a click
  links that end to it (`{end}` = `element`, `{end}_element` = its element id), instead of selecting it. Esc or a click
  in the panel cancels. `assets/js/editor.js` (built to `connector-editor`).
- **Sides** are chosen on a little box with a handle on that side (four light handles: facing the other one); **end
  shapes** as pictures of a line with that end.
- **Swap start and end** exchanges every from_ setting with its to_ one (every screen size's side and place, CSS ID,
  picked element), in one undoable step: the end shapes stay at the start and the end, so the head moves to the other
  element and the arrow (and its animation) runs the other way.
- **Opacity** of the whole arrow.
- With a Connector selected, its start is outlined dashed and its end solid (`connector.js`, Edit Mode only).

## How it works

`assets/js/frontend/handlers/connector.js` finds the two elements, reads the widget's custom properties (each screen
size's own values: `--rf-cn-path`, `--rf-cn-from-side`, `--rf-cn-gap`, `--rf-cn-w`, `--rf-cn-head`...) and draws an SVG
inside the widget, in coordinates from its corner. "Facing the other one" picks left/right when the two are side by
side (or further apart sideways), top/bottom otherwise, so an arrow between containers that stack on phones turns
down. Heads are SVG markers (`orient="auto-start-reverse"`), filled or stroked in the line's colour. It draws again
when either element, the holding container or the page changes size (ResizeObserver), on window resize and load, and
in Edit Mode when a setting changes.

## Check

`node scripts/check-connector.mjs --site DIR --port N`.
