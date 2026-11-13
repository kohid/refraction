# Floating side panel (0.80.0)

The separate Floating Elements window (0.78.0 to 0.81.0) was removed in 0.82.0: the whole side panel floats and
docks, Elements included.

The whole panel floats and docks like Structure (`assets/dev/js/editor/regions/panel/panel.js`, styles
`assets/dev/scss/editor/panel/_dock.scss`):

- Header buttons: dock left, dock right (pressing the docked side floats it), hide (`panel/close`, preview mode).
- Drag by the header: against the left or right window edge docks it (dashed outline while dragging); pulling a docked
  panel more than 30px sideways floats it. Floating, it resizes from every edge; docked, from its inner edge.
- Body classes `rf-panel--right` / `rf-panel--floating` (docked left: none, the old rules). Storage `panel.dock`
  (`left`, `right` or `''`) and `panel.float` (top, left, height).
- Docked right it sits before a docked Structure; the hide arrow moves to its left edge and points the other way. With
  Editor Preferences > Panel beside the page, it is after the page (`order: 2`). Floating, the page keeps its whole
  width and the arrow is not shown: hide it with its Hide button, Ctrl+P or the top bar's **Panel** button
  (`packages/.../editor-app-bar/src/extensions/panel-toggle`, which listens to `refraction/panel/visibility`).

Check: `node scripts/check-panel-dock.mjs --site DIR --port N`.

## Staying within reach (0.82.0)

`allowedPlace()` in `panel.js` keeps a floating panel's header below the top bar and inside the window, with at least
120px of the panel on screen: while dragging, and in `ensurePosition()` (on load, window resize, and when the panel is
shown again). `followTopBarHeight()` keeps `--editor-v2-top-bar-height` equal to the real top bar (60px, the variable
said 48px), so a docked Structure and the editor wrapper do not go under it.
