# Solar icons and duotone (module `solar-icons`, 0.42.0)

The icon library offers the **Solar** icon set by 480 Design (CC BY 4.0, credited in `NOTICE` and
`assets/lib/solar/LICENSE.txt`): 8,859 icons in six styles, one tab each: Bold Duotone, Line Duotone, Bold, Linear,
Outline, Broken.

- **Built** by `node scripts/build-solar-icons.mjs [icons.json]` from the `@iconify-json/solar` package (fetched with
  `npm pack` when no path is given) into `assets/lib/solar/`: per style `<style>.json` (names, the picker's
  `fetchJson`), `<style>-svg.json` (SVG inner markup, the picker and the editor) and `<style>.php` (the same for the
  site, kept in memory by opcache). Re-run it to update the set.
- **Values**: library `solar-<style>`, value `rf-solar rf-solar-<name>`.
- **Drawing**: inline SVG (`width`/`height` 1em, `fill`/`stroke` currentColor) in a `.rf-solar` element; on the site by
  the tab's `render_callback` (registered as an *additional* tab, so it also works when Font Awesome is drawn as inline
  SVG); in the editor by `refraction.helpers.renderIcon()` and the picker's `Icon` component through
  `assets/dev/js/editor/utils/icon-svg-bodies.js` (fetches a style's SVG file once). `assets/lib/solar/solar.css` sizes it.
- **Duotone**: the build marks the second layer of the duotone icons (Solar's `opacity=".5"` parts) with `rf-duo-f`
  (painted with fill) or `rf-duo-s` (painted with stroke). They take `--rf-icon-duo` (color, default the icon's color)
  and `--rf-icon-duo-opacity` (default .5). The Icon, Icon Box, Icon List, Button and Social Icons widgets have
  **Duotone > Second Color** and **Second Layer Opacity** in their icon style section, which set those variables.
- **Font Awesome**: still loaded and drawn for the icons already chosen (and widgets' default icons), but its tabs are
  `hidden` in the icon library unless Settings > Advanced > *Font Awesome in the icon library* is *Shown*
  (option `refraction_icons_font_awesome`).

Check: `node scripts/check-solar-icons.mjs --site DIR --port N`.
