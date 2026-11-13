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
