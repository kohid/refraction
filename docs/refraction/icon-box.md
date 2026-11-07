# Icon Box and Image Box additions (0.43.0)

- **Title Margin** (Style > Content > Title, Icon Box and Image Box): the title's margin on every side, per device.
  Set to 0 it removes the margin a theme gives headings (Title Spacing only set the space under it). Once set it takes
  over Title Spacing.
- **More Icons** (Icon Box, Content): a repeater of icons shown after the main one, in the same `.refraction-icon-box-icon`
  holder, each a `.refraction-icon` (so Style > Icon applies: view, colors, size, padding, border, rotation, hover
  animation). Each can have a link (with a label for screen readers), its own icon color, background (stacked and
  framed views), duotone second color and size. Laid out inline so the row follows the box's alignment; Style > Icon >
  *Space Between Icons* (`--rf-icon-box-icons-gap`).
- **Icon Animation** (Style > Icon): pulse, float, bounce, spin, swing, shake, heartbeat (looping), fade in, zoom in
  (once); *Play* all the time, while the box is hovered, or once when it comes into view (the `icon-box` frontend
  handler adds `is-visible` with an IntersectionObserver); *Duration* and *Delay Between Icons* (each icon has
  `--i`, its place in the row). Off with reduced motion. Classes on the widget: `refraction-icons-anim-<name>`,
  `refraction-icons-anim-on-<loop|hover|view>`; keyframes `rf-ib-*` in `icon-box.scss`.
- Fixed with it: the editor's image details request no longer warns for an image given by its address only.

Check: `node scripts/check-iconbox-navpanel.mjs --site DIR --port N`.
