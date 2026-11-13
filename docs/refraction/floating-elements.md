# Floating Elements (0.78.0)

The widgets list in a window of its own, like Structure: the panel stays on an element's settings while widgets are
dragged in from the window.

- **Show and hide**: top bar button *Floating Elements* (next to Structure), the window's close button, or
  **Ctrl/Cmd+Shift+K** (listed under Keyboard Shortcuts). Hidden by default. In preview mode it hides and comes back.
- **Move and resize**: drag it by its title; resize from any edge while floating, from the inner edge while docked.
- **Dock**: the header buttons dock it to the **left** (against the panel) or the **right** (against the window edge, or
  just before a docked Structure); pressing the docked side again floats it. Dragging it against the panel or past the
  right edge docks it too (a dashed outline shows where); pulling a docked window away floats it again. Docked, the
  page makes room: on the right the page is narrower by its width; on the left the page starts after the panel and the
  window (beside-the-page panel: after the window).
- **Contents**: the same categories and tiles as the panel's Elements page, built by the panel's own rules
  (`PanelElementsLayoutView.initElementsCollection` / `initCategoriesCollection`), so the same widgets are listed. A tile
  is added by clicking (after the selected element, or into the page) or by dragging it into the page. The search is
  the window's own and does not filter the panel; open/closed categories are shared with the panel. Globals (empty in
  Refraction) is not repeated.
- **Remembered** in the browser (`refractionCommon.storage` key `elementsFloat`): shown or hidden, docked side, floating
  place, height and width.

Code: `assets/dev/js/editor/regions/elements-float/` (region, `$e` component `elements-float` with commands `open`,
`close`, `toggle`, `dock {side}`, and the layout view), template `includes/editor-templates/elements-float.php`, styles
`assets/dev/scss/editor/elements-float/elements-float.scss`, top bar button
`packages/packages/core/editor-app-bar/src/extensions/elements-float/`. Docking sets body classes
`rf-ef-docked--left|right` and `--rf-ef-width`; `#refraction-preview` subtracts `--rf-ef-reserve` and shifts by
`--rf-ef-shift`.

The region also keeps `--editor-v2-top-bar-height` equal to the real top bar height (Refraction's bar is 60px, the
variable said 48px), which put the top of a docked Structure, and now this window, under the bar and let the editor
run 12px below the window.

Check: `node scripts/check-elements-float.mjs --site DIR --port N`.
