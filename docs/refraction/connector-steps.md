# Connector: steps with arrows (0.142.0)

`modules/connector-steps`: a nested widget (like Timeline). Steps in order, each a container to design (four to start:
a white card with its number, a title and a line of text), with an arrow from each step to the next.

- **Layout**, per screen size: in a row (arrows pointing right) or one under another (arrows pointing down; the phone
  default). Space For The Arrows (the gap between steps, where the arrow is drawn), Arrow Along The Step (%), Step
  Height (all as tall as the tallest, or their own).
- **Arrows**: Line (dotted, dashed, solid, none), Head (chevron, triangle, double chevron, arrow in a circle, dot, an
  icon, none), Animation (the line flowing towards the next step, the head nudging forward; not for reduced motion).
- **Style > Arrows**: colour, line thickness, head size, space from the steps (per screen size), circle colours.

Markup: `.rf-cs > .rf-cs__step` (the step's container, then `.rf-cs__arrow` for every step but the last). The arrow is
absolutely placed in the middle of the gap after its step: the Layout writes `--rf-cs-cx`, `--rf-cs-cy` and
`--rf-cs-rot` for each screen size, so it needs no script and Edit Mode shows it at once. The line is a background
(dots or dashes as gradients), which the flow animation moves.

The earlier arrow between any two elements (0.140.0, `modules/connector`) is called **Arrow Link** in the panel.

Check: `node scripts/check-connector-steps.mjs --site DIR --port N`.
