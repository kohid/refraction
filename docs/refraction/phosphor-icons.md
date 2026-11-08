# Phosphor icons (0.48.0)

Module `modules/phosphor-icons`: the [Phosphor](https://phosphoricons.com) icon set (MIT, `assets/lib/phosphor/LICENSE.txt`)
as six tabs of the icon library, after the Solar tabs: Regular, Bold, Fill, Duotone, Light, Thin, 1,512 icons each.

## Why not `@phosphor-icons/react`

The React package draws icons as React components, which only exist inside React. Refraction draws icons on the page
in PHP (and in the editor with its own templates), so it uses the same icons as SVG from `@phosphor-icons/core`, the
package the React one is built from. Nothing is added to `package.json`: like Solar, the build script fetches the
package with `npm pack` and writes plain files.

## Files

`node scripts/build-phosphor-icons.mjs [path/to/@phosphor-icons/core]` writes, per weight:

- `<weight>.json` – the picker's list of names (`fetchJson`);
- `<weight>-svg.json` – `{ bodies: { name: inner SVG } }` for the picker and the editor (`svgJson`);
- `<weight>.php` – the same for the site, loaded only when an icon of that weight is drawn;
- `phosphor.css` – sizing like a font icon; the Duotone weight's faint layer (`rf-duo-f`) takes `--rf-icon-duo` and
  `--rf-icon-duo-opacity` (default 0.2, Phosphor's own) from the widgets' Duotone controls.

Bodies are wrapped in `<g fill="currentColor">`, so icons take the widget's icon color. Values look like
`rf-ph rf-ph-car` with the library `phosphor-<weight>`; the viewBox is 0 0 256 256 (the library config's `viewBox`,
which the editor's SVG helper reads; Solar's is 24).

Font Awesome stays hidden from the icon library unless Settings > Advanced > Font Awesome in the icon library is on.
