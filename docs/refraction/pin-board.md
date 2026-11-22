# Pin Board (0.143.0)

`modules/pin-board`: notes pinned to a board, a nested widget (like Timeline and Connector). Each note is a white card
(`.rf-pb__note`, the slot) with a pin, holding the note's own container (a pastel panel to start: its number, a title,
a few words). Notes tilt a little (each its own Tilt, or -5, 4, -3, 5, -4, 3 degrees in turn) and take a pin colour
(their own, or orange, blue and purple in turn).

## Settings

- **Notes**: Title, Pin Color, Tilt, Side (zigzag: in turn, left, middle, right).
- **Layout** (per screen size): Zigzag (one note per row, left and right in turn; Note Width %, Overlap px: how far a
  note rises beside the one before) or Grid (Columns); Space Between Notes; Tilt % (phones 60%); On Hover (lift,
  straighten and lift); Board Padding.
- **Pins And Lines**: Pin (pushpin, flat pin, tape, none) and its place; Lines Between The Notes (in the zigzag; in the
  zigzag and the grid; none), dashed / dotted / solid, ending at the next note's side or its pin.
- **Style > Board**: Paper (lined, grid, dots, plain), background, lines colour and spacing, corners.
- **Style > Notes**: card colour, padding, corners, shadow; pin size; line colour and width.

## How it works

The layout writes custom properties for each screen size (`--rf-pb-display`, `--rf-pb-note-w`, `--rf-pb-odd`,
`--rf-pb-even`, `--rf-pb-mt`, `--rf-pb-zigzag`...); each note carries `--rf-pb-r` and `--rf-pb-pin-color`.
`assets/js/frontend/handlers/pin-board.js` draws a cubic curve from each note to the next in `svg.rf-pb__links`
(behind the notes): out of the side facing the next note (or the bottom when it is below), into its facing side or its
pin. It draws again when the board or a note changes size, and in Edit Mode on any setting change.

## 0.144.0

- **Board**: Style > Board has a container's background group (colour, gradient, image), border group, shadow, min
  height, corners; the paper is a layer of its own (`.rf-pb::before`) over the background. The widget's Advanced tab
  (margin, padding, position, motion, responsive, CSS) is the usual one.
- **Heading and Footer** (Content > Heading And Footer, before Notes): each switch adds or removes a row with a role
  (`role` = heading / footer) first or last in the Notes list (`pin-board.js` `toggleRole()`, Edit Mode); its
  container starts with `get_default_role_elements()` content (the nested-repeater insert hook takes a role's content
  and puts the container where the row went, `options.at`). Heading and footer rows are `.rf-pb__part`, across the
  board; notes keep their number, tilt and colour among the notes only.
- **Free layout**: the notes share one grid cell (row 2; the heading row 1, the footer row 3), each moved by margins
  from its own From The Left (%), From The Top (px) and Width (%), per screen size (repeater responsive controls
  `pos_x`, `pos_y`, `note_w` on `{{CURRENT_ITEM}}`); a note not yet placed stands left and right in turn, Starting Step
  Down apart. In Edit Mode `pin-board.js` drags a note (its frame or pin; its container's widgets stay editable) or
  its right-edge handle, then saves the place for the screen size shown (`{name}_{device}`) in one history step;
  from the zigzag or the grid it first turns that screen size to Free with every note where it is.
- **Reveal**: `reveal` (drop, fade-up, zoom, swing), `reveal_lines`, `reveal_parts`, duration, stagger, repeat. Each
  row starts `.is-pending`; an IntersectionObserver reveals those coming into view one after another, and the line
  into a note draws through a mask (`stroke-dashoffset` of a solid path the line's length), so dashed lines keep their
  dashes. Not for reduced motion; Edit Mode plays it again when a Reveal setting changes.
- **Lines**: `link_shape` (curve, s-curve, loose, straight, elbow), `link_curve`, `link_style` (+ long, dash-dot),
  `link_marker` (arrow, dots, dot-arrow; SVG markers), `link_flow` (dashes moving).

Check: `node scripts/check-pin-board.mjs --site DIR --port N`.
