# Icons

Refraction's own brand icons are the `rficon-` font (assets/lib/rficons). For new UI (admin screens, editor controls, module screens) use Material Symbols, bundled as inline SVG.

- Browse names at https://kohid.github.io/icons/ (Material Symbols Light; Apache-2.0, attribution in `NOTICE`).
- Add icons: `node scripts/fetch-icons.mjs [--style outline-rounded] name [name ...]`. Files go to `assets/icons/material/<name>.svg` (normalised to path data painted with `currentColor`) and the chosen style is listed in `assets/icons/material/index.json`. The script falls back to GitHub raw when the CDN refuses a file. Run it during development only; commit the SVGs.
- PHP: `\Refraction\Core\Utils\Icons::svg( 'palette', [ 'size' => 20, 'class' => 'x', 'label' => 'Theme' ] )` prints the inline SVG (decorative unless you pass `label`); `Icons::url( 'palette' )` gives the file URL for a CSS `mask-image`. Unknown or tampered files print nothing.
- Never load icons from the CDN or Google Fonts at runtime: the plugin works offline.
- Test: `php scripts/test-icons.php`.
