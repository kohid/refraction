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

## 0.44.0

- The box titles have `margin-block: 0` of their own (`icon-box.scss`, `image-box.scss`), so a theme's heading margin
  does not show; Title Spacing and Margin still set it.
- **Icon Layout** (Icon Box, Content): *In a row* or *Arrange freely*. The icons sit in one inline
  `.refraction-icon-box-icons-area` (it follows the box alignment). Arranged freely, the area is
  `--rf-icons-area-w` × `--rf-icons-area-h` (Style > Icon > Area Width / Height) and each icon is centered on its point:
  `--x` / `--y` (Across / Down, %), turned by `--r` (`rotate`) and layered by `--z`; the main icon's are under Style >
  Icon > Main Icon, each More Icon's in its own item. `translate` and `rotate` leave `transform` to the animations.
- **Button and description display** (Image Box and Icon Box, `Box_Extras_Trait` in
  `includes/widgets/traits/box-extras-trait.php`, styles `assets/dev/scss/frontend/partials/_box-extras.scss`):
  *Show The Description* as text, cut to a number of lines (`--rf-box-lines`, with *Full Text In A Tooltip*), or as a
  tooltip (`.refraction-box-tooltip`, shown on hover or keyboard focus, above or under the box); a Button (text, link,
  icon, filled / outline / text link) with Style > Button and Style > Tooltip sections.

## 0.45.0

- **Each icon's own style.** `add_own_icon_controls()` in `includes/widgets/icon-box.php` gives one icon: *Normal* /
  *Hover* tabs (icon color, duotone second color, background, border color; Hover applies while the box is hovered or
  has keyboard focus), size, padding, border width (solid), border radius, rotate (`rotate` on the inner `i` / `svg`,
  so it does not fight the free arrangement's turn or the animations), opacity, box shadow, and an animation with its
  duration and delay. It is used twice: in the More Icons repeater (names without a prefix, so the 0.43 `color`,
  `background`, `duo` and `size` values keep working) and in the new **Style > Main Icon** section (`main_icon_*`; the
  main icon carries `refraction-icon--main`). The main icon's Across / Down / Turn / Layer moved there too.
- Selectors are `{{WRAPPER}}.refraction-widget-icon-box .refraction-icon-box-icon <icon>`, more specific than Style >
  Icon (also its hover), so an icon's own setting always wins and an empty one leaves Style > Icon in charge.
- **Per-icon animation**: the box's animation is now set as variables on each icon (`--rf-ib-box-anim`,
  `--rf-ib-box-count`, `--rf-ib-box-wait`) and the Play rules use `var(--rf-ib-anim, var(--rf-ib-box-anim, none))`;
  an icon's own choice sets `--rf-ib-anim` / `--rf-ib-count` / `--rf-ib-wait` ("None" stops it). Play, Duration and
  Delay Between Icons are always shown, since they also serve icons with their own animation. Fade in and Zoom in end
  on the icon's own opacity (`--rf-ib-opacity`).

## 0.46.0

- The description display moved into `Text_Display_Trait` (see `text-display.md`), shared with Text Editor and other widgets; cut text gains a Show more / Show less toggle. Saved settings keep working (same control names).
