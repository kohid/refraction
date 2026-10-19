# Theme Builder

Header and Footer templates with display conditions, built in and always on (module `modules/theme-builder`, namespace
`Refraction\Modules\ThemeBuilder`). Original code; nothing is copied from any external Pro plugin. Plan:
[theme-builder-plan.md](theme-builder-plan.md).

## Using it

1. Refraction > Theme Builder, tab Headers or Footers, **Add New**. The template type dialog opens with the type
   preselected. (Saved Templates > Add New also lists Header and Footer.)
2. Build the template in the normal editor.
3. Open the document settings (gear icon) > **Display Conditions**, add rules, **Publish**.
4. A template that is not published, or has no Include rule, is never displayed ("Not displayed anywhere" hint in the
   editor and in the list).

Editing conditions needs `manage_options`. Users who only have `edit_posts` can see the list, build templates and see
the conditions read-only; their saves never change the rules.

## Rules

Stored as strings `{include|exclude}/{name}[/{arg}...]` in post meta `_refraction_conditions` (source of truth in the
editor is the document setting `refraction_display_conditions`, written to the meta on save) and mirrored in the option
`refraction_pro_theme_builder_conditions` as `[ type ][ post_id ] = [ rules ]`. The option format is shared with
Floating Elements (`floating_buttons` bucket); the headers use `header` and footers `footer`.

| Rule | Matches | Specificity |
|---|---|---|
| `general` | the entire site | 10 |
| `singular` / `archive` | every single post or page / every archive, the posts page and search results | 20 |
| `singular/{post_type}`, `archive/type/{post_type}`, `archive/tax/{taxonomy}`, `archive/author`, `archive/date`, `archive/search` | a family | 30 |
| `404` | the not found page | 40 |
| `front_page` | the front page (static page or posts) | 50 |
| `singular/author/{id}`, `singular/in_{taxonomy}/{term}`, `singular/child_of/{id}`, `singular/direct_child_of/{id}`, `singular/has_parent`, `archive/tax/{taxonomy}/{term}`, `archive/author/{id}` | narrow groups | 60 |
| `singular/{post_type}/{id}` | one post or page | 100 |
| `visitor/logged_in`, `visitor/logged_out`, `visitor/role/{role}` | audience filter | see below |

* **Exclude always wins.** Any matching Exclude rule removes the template, whatever else matches.
* **Most specific wins.** The best matching Include rule gives the template its score; the highest score wins one
  location. Ties go to the most recently modified template, then to the highest ID.
* **Visitor rules are an audience filter.** With visitor Includes the template must also match at least one of them
  (they combine with the location rules by AND). With only visitor Includes the location is the entire site. A
  template with an audience filter gains 0.5, so it beats an unrestricted template with the same location rule.
* Rule strings are validated by `Rule::parse()` (unknown names, non numeric IDs, path tricks and markup are dropped) on
  save, on read and in the admin list.
* Reserved words in `singular/{x}`: `author`, `child_of`, `direct_child_of`, `has_parent` and anything starting with
  `in_` are never treated as post type names.

Code: `Rule`, `Conditions\*` (one class per rule family, `Conditions_Manager::register()` adds more), `Conditions_Manager`
(matching, readable text), `Resolver` (picks the winner), `Environment` / `Wp_Environment` (the request).
Results per request are cached by `Locations_Manager`.

## Where it is shown

`Locations_Manager` knows `header` and `footer`. It resolves the winner on first use after the `wp` action and only on
public front end requests: not in wp-admin, admin-ajax, feeds, embeds, the editor, the preview or the front end view of
a header/footer template itself (those show only the template, on the Refraction canvas template). Previews of other
pages show the matching header and footer.

* **Classic themes**: `get_header` / `get_footer` fire early. Refraction prints the document skeleton (doctype, `wp_head`,
  `body_class`, `wp_body_open`) and the template inside `<header class="refraction-location-header"
  data-refraction-location="header">`, or the template, `wp_footer()` and the closing tags for the footer in
  `<footer class="refraction-location-footer">`. The theme's `header.php` / `footer.php` is then loaded once into a
  discarded buffer, which marks it as loaded so WordPress does not print it. The template's CSS is enqueued in `<head>`.
* **Block themes**: `core/template-part` blocks of the header and footer areas (the `area` attribute, or the area of the
  template part from `theme.json`/the template part definition) are replaced through `pre_render_block`.
* **No match, or only one of the two**: the theme renders its own header/footer.
* **Explicit opt-in**: a classic theme can call `refraction_theme_builder_header()` / `refraction_theme_builder_footer()`
  (they return `true` when a template was printed) or fire `do_action( 'refraction/theme_builder/render_header' )`, and
  declare `add_theme_support( 'refraction-theme-builder' )` so no automatic takeover happens.

Filters: `refraction/theme_builder/is_active_request`, `refraction/theme_builder/location_template_id`.

## Limits and known issues

* v1 preview: the editor shows the template on a blank canvas. It does not preview it inside the site's latest page or
  as a chosen "preview as" page/post.
* The automatic classic theme takeover replaces the whole `header.php` / `footer.php`. Wrapper elements those files
  open or close (for example `<div id="content">`) are not reproduced; themes that rely on them for layout should use the
  opt-in functions. If only a header template matches, the theme's `footer.php` still closes wrappers its `header.php`
  opened, which browsers tolerate.
* `get_header( 'name' )` variants are all replaced by the template, and the second call of `get_header()` in a request
  prints nothing.
* Themes that print their header without `get_header()` (page builders, custom frameworks) are not detected; use the
  opt-in.
* Only the first header-area template part is replaced in a block theme; extra header-area parts print nothing.
* The rules are a setting of the template, so a template export contains them, but the post meta and the option mirror
  are rebuilt only when the template is saved in the editor. An imported template stays "Not displayed anywhere" until
  it is opened and saved (not tested).
* Not covered: multisite network behaviour, sites on MySQL (tested on SQLite), caching plugins (cached pages are
  per-URL, but visitor rules are per user, so pages with visitor rules should not be page-cached across roles).

## Tests

* `php scripts/test-theme-builder-engine.php` pure logic (parsing, specificity, exclude wins, tie-breaks, text); no
  WordPress needed.
* `tests/phpunit/refraction/modules/theme-builder/test-conditions.php` the same engine against real queries (needs the
  WordPress PHPUnit suite).
* `node scripts/check-theme-builder.mjs --site <dir> --port <port>` real WordPress, classic and block themes, admin, the
  editor UI, endpoint security, preview, opt-in and Floating Elements. Needs a test site from
  `scripts/setup-menu-test-site.sh`.
