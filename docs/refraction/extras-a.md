# Extras A: Custom CSS, Custom Code, Display Conditions, Custom Attributes

Original code, always on, no remote calls. Modules `custom-css`, `custom-code`, `display-conditions`, `custom-attributes`
(namespace `Refraction\Modules\...`). Plan: [extras-a-plan.md](extras-a-plan.md). Pure-logic tests: `php scripts/test-extras-a.php`;
browser check: `node scripts/check-extras-a.mjs --site DIR --port N`.

## Custom CSS
* Element: Advanced > Custom CSS (every widget, container, section, column). `selector` is replaced by the element's own selector
  (`.refraction-ID .refraction-element-ELEMENTID`). Page: Page Settings > Advanced > Custom CSS (`selector` = `body.refraction-page-ID`).
  Site: Site Settings > Custom CSS (`selector` = `body.refraction-kit-ID`). Printed through the normal post CSS file (page and kit share the
  `refraction/css-file/post/parse` hook), so it is cached and minified with the document.
* `Css_Sanitizer::sanitize()` always runs when printing: removes markup (`<...>`), `@import`, `expression()`, `javascript:`, `vbscript:`,
  `data:text/html`, `behavior`, `-moz-binding`, comments and null bytes; CSS escapes and whitespace tricks are decoded before checking.
  Users without `unfiltered_html` also get it applied when saving (page, site and element CSS). Their kses pass encodes `>`; it is decoded again.
* Editor: the `editor/style/styleText` filter (elements) and a style tag in the preview head (page, site).

## Custom Code (Refraction > Custom Code)
* Snippets are the post type `refraction_snippet` (title, code in the content, meta location/type/priority) with rules stored by the Theme
  Builder `Conditions_Store` (bucket `custom_code`). Matching uses `Conditions_Manager::match()`: at least one Include, no Exclude may match.
  The conditions picker is a small admin script with the same rule groups as the editor control (`Module::get_conditions_config()`); it is
  a separate implementation of the same UI, not the Marionette control.
* Locations: head (`wp_head` 99), body start (`wp_body_open`, needs a theme that calls it), body end (`wp_footer` 99). CSS and JS are wrapped in
  `<style>`/`<script>` and can not close their tag; HTML prints as written. Ordered by priority, then ID.
* Snippets run on the front end for ALL visitors of matching pages. Never in wp-admin, the editor, its preview, the customizer, feeds or AJAX.
* Only users who have both `manage_options` and `unfiltered_html` can open the screen, create, edit, toggle or delete (editors have
  `unfiltered_html` on single sites but not `manage_options`). The post type maps all its capabilities to `unfiltered_html`, has no UI and no REST.
* Recovery: `define( 'REFRACTION_DISABLE_CUSTOM_CODE', true );` or add `?refraction-disable-code=1` to a front end URL while logged in as an admin.
  (`?refraction-safe-mode` already belongs to the editor safe mode.)
* Code editor: WordPress CodeMirror (`wp_enqueue_code_editor`) for HTML, JS and CSS with its lint hints; with syntax highlighting off in the
  profile a plain textarea is used.

## Display Conditions
* Advanced > Display Conditions: "Show/Hide this element when", AND/OR, and a repeater. Types: logged in, role, user (ID or login), post type,
  page/post ID, term (`taxonomy:slug` or id), author ID, date range, time of day (may cross midnight), day of week, URL parameter
  (`name` or `name=value`), cookie (`name` or `name=substring`), referrer contains, device, browser language. Each row is "True" or "Not true".
  Rows left empty are skipped; no rows = always shown.
* Evaluated by `Condition_Evaluator` through the new core filter `refraction/frontend/should_print_element` (called in `print_element()`),
  so a hidden element and its children are not in the HTML. Times use the site timezone (`wp_timezone()`); tests can replace the clock with
  the filter `refraction/display_conditions/now`; `refraction/display_conditions/device` overrides the device.
* Device uses the `Sec-CH-UA-Mobile` hint and User-Agent patterns: approximate. Prefer the Responsive visibility switches for layout.
* Cache: an element with conditions counts as dynamic (`refraction/element/is_dynamic_content`), so with the element cache on it is a shortcode
  rendered per request. A full-page cache plugin in front of WordPress can still serve one visitor's HTML to another: exclude those pages
  or vary the cache by cookie.
* Editor: nothing is hidden. Elements with conditions get a violet badge; Page Settings > Advanced > "Show elements with conditions" hides
  them in the preview.

## Custom Attributes
Advanced > Attributes: lines `key|value` or `key`. Dynamic tags work (the text is resolved first); a tag replaces the whole text, so use its Before field for `key|`. Dropped: `on*`, `srcdoc`, `formaction`, `action`,
Refraction's own `data-id`, `data-element_type`, `data-e-type`, `data-settings`, odd keys, `javascript:`/`vbscript:`/`data:text/html` in URL
attributes. `style` goes through the CSS sanitiser, tags are stripped, values are cut at 500 characters, 20 attributes at most.
