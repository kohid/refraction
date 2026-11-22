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

Check: `node scripts/check-pin-board.mjs --site DIR --port N`.
