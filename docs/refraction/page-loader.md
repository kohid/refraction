# Loading screen

Page Settings > **Loading screen** (pages, posts, landing pages; module `modules/page-loader`, added in 0.27.0) covers the page while it loads and then reveals it. Off by default.

- **Style**: logo and progress line, logo and spinning ring, or a large percentage. **Logo**: the site logo (or the site title), text, or an image. A caption ("Loading") and the percentage can be shown.
- **Reveal**: fade, slide up, or split open. **Colors**: background, text and two accents (defaults: the navy, white, cyan and coral of the Refraction homepage).
- **Show at least** (600 ms) and **Reveal anyway after** (8 s): the page is revealed on the window `load` event, never before the minimum, and always at the limit, even when an image or script never arrives. **Only on the first page view of a visit** remembers it in `sessionStorage`.

How it works: everything is printed inline (styles and a small script in `wp_head`, the overlay and its script at `wp_body_open`), so it paints before the page's own stylesheets and scripts. The overlay only shows when the inline script has set `rf-loading` on `<html>`, so without JavaScript nothing covers the page, and that script also lifts it by itself after the limit. Progress is the share of the page's images that have loaded (lazy images that are not requested count as not loaded until `load`), eased so it never jumps. Reduced motion gets a plain fade. Not shown in the editor or its preview. The theme must call `wp_body_open()`: the Canvas template does, and so do the Just Refraction theme and most current themes.

Settings rules: `Classes\Pure_Loader_Settings` (colors are validated, choices and times clamped). Tests: `php scripts/test-page-loader.php`, browser check `node scripts/check-page-loader.mjs --site DIR --port N`.
