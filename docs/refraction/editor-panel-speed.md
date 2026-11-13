# Editor panel speed (0.75.0)

Refraction has eight screen sizes (desktop, tablet, mobile extra, mobile and the four phone sizes), and every
responsive control is copied once per size (`editor-base.js`, the responsive duplication). The panel used to build a
view for every copy of every control in the open section and hide the other sizes with CSS, so a section full of
responsive controls was slow: Advanced > Layout built 184 views (169 of them copies) on every element; on a slower
computer opening the Advanced tab took over two seconds.

`assets/dev/js/editor/views/controls-stack.js`: `filter()` now skips another screen size's copy
(`isOtherDeviceCopy()`: the control's `responsive.max || responsive.min` is a device other than the current one).
Copies that start or end a popover (`popover.start` / `popover.end`, such as the last copy of a typography group) are
always built, or the popover would not close. `onDeviceModeChange()` builds the new size's copies by rendering the
children again. Measured on the test machine: Advanced 220-250 ms -> about 30 ms, 184 -> 44 views.

Check: `node scripts/check-panel-speed.mjs --site DIR --port N` (speed; mobile copies built, shown and saved to the
mobile setting; typography popover on mobile; back to desktop).

## What else had to change

- `controls/base-data.js`: a responsive control's views looked up their other screen sizes' copies (to refresh their
  inherited placeholders, `getResponsiveChildrenViews()`), and one that was not built made the change handler fail
  before the preview's CSS was redrawn. Missing copies are now skipped. When a copy's parent has no view (editing
  mobile while the desktop copy is not built), the inherited placeholder is worked out from the saved settings
  (`preparePlaceholderFromSettings()`, same cleaning as the views: only the parts that are set and differ from the
  default), so the greyed values still show.
- The check also proves: a responsive setting changed with its section open reaches the preview at once, and the
  mobile copy shows the desktop margin as its placeholder.


## Sections, colours, fonts, lists (0.76.0)

Measured per section across a container, Heading, Button, Image, Icon Box and Phone Showcase: the slow ones built
many settings that were hidden (83 of 114 in Phone Showcase > Style > Steps; 68 of 89 in Advanced > Background) and
spent most of their time creating colour pickers (Pickr) and font lists (select2).

- `regions/panel/pages/editor.js`: `filter()` also skips controls whose conditions fail (`isActiveControl`);
  popover start / end controls are always built. A settings change runs `syncShownControls()` on the next frame,
  which builds the views of controls that now apply and inserts them in place (`insertControl()`: before the next
  built control or after the previous one, inside or outside its popover, closed under a hidden inner tab). The views
  already built are never destroyed by this, because the change can come from a click whose code is still running.
- `controls/color.js`: a swatch with the picker button's look until the control is pointed at, focused or clicked
  (`showSwatch()`, `ensurePicker()`; `activate()` builds it too). Dynamic tags move their switcher into the picker
  on `picker:ready`.
- `controls/font.js`: the select2 font list is built on first pointer, focus or press (`buildFontSelect()`).
- `controls/repeater-row.js` / `repeater.js`: a row builds its fields when it is opened (`buildFields()`) or a field
  of it is asked for.
- Guards for views that are not built or already destroyed: `component-base.js` (activateControl),
  `utils/font-variables.js`, `controls/select2.js` and `box-shadow.js` (destroy), and
  `core/kits/assets/js/globals/global-select-behavior.js` (a global value arriving after its view was drawn again).

Results on the test machine: Phone Showcase > Style > Steps 233 -> 143 ms, Floating Cards 180 ms -> fast, Button >
Style 126 -> 49 ms, Advanced > Background 121 ms -> fast; median section 15 -> 8 ms. Checked by
`scripts/check-panel-speed.mjs` (conditions, typography popover, gradient, typing that reveals a field, list rows,
lazy colour picker and font list).
