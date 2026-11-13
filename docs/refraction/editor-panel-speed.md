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

## Section groups (0.86.0)

`groupSection()` in `assets/dev/js/editor/regions/panel/pages/editor.js` (after each render of the section and after
lazily built settings are added): a section with 12 or more top-level settings whose HEADING controls (not inside
inner tabs or popovers) divide it into at least two groups gets a row of tabs (`.rf-section-groups`) under its title:
General (before the first heading) and one per heading (the heading itself hides, the tab names it). The other groups'
settings get `.rf-group-off` (display none, with their popover). The tab is kept per element type and section for the
editing session (`shownGroups`). No widget had to change: giving a long section headings is enough.

## Categories in every widget (0.88.0)

Every widget was audited (`node scripts/audit-widget-panels.mjs --port N --all [--min 12] [--flagged out.txt]`: for each
Content and Style section, the settings it can show, its category headings and state tabs). Each section of 12 or more
settings without categories got them:

- **Module `panel-categories`** (`modules/panel-categories/module.php`): a map of `element/section` (or `*/section`, or
  `*` for any section) to `[ first setting id => category label ]`. Once an element's controls are registered
  (`refraction/element/after_register_controls`, fired at the end of `Controls_Stack::init_controls()`), it injects a
  heading (`rfcat_<id>`, class `rf-panel-category`) before each first setting. The heading takes that setting's
  condition, so it hides with it, unless the map gives one. Widget files and saved settings are untouched. Shared
  blocks: Highlighted Text (Text, Mark Behind, Drawing), Long Text and Tooltip, Card Stack, Query, Card.
- **Reordered in their own files** (settings in a mixed order, hover colors next to normal ones): Nav Menu > Submenu
  (Effect, Panel, Items, Colors with Normal / Hover / Current Page), Hamburger Button (Icon, Box, Colors with Normal /
  Hover, Animation), Mobile Menu (Button, Opened Menu, In The Panel); Nested Carousel > Arrows (Size And Place, Box,
  Colors with Normal / Hover); Timed Slides > Arrows, line and number (Place, Arrows, Progress Line, Numbers). Only the
  order, labels inside state tabs and separators changed; every id is the same.

With the section groups above, a long section shows its categories as tabs. Check:
`node scripts/check-panel-categories.mjs --site DIR --port N` (runs the audit, the Nav Menu and Nested Carousel tabs,
the shared Highlighted Text categories, a category hiding with its settings, and saved colors still on the page).

## Shadow colors from the Global Colors (0.86.0)

Box Shadow and Text Shadow (`controls/box-shadow.js`) have their own picker; a globe in it lists `globals/colors`, and
picking one saves the shadow's color as `var(--e-global-color-ID)`, so it follows the kit. The picker shows the resolved
color with a ring (`.rf-shadow-global`); a color picked by hand unlinks it.

Check: `node scripts/check-section-groups.mjs --site DIR --port N`.
