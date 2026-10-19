# Theme Builder

Header, Footer, Single, Archive, Search Results and Error 404 templates with display conditions, built in and always on (module `modules/theme-builder`, namespace
`Refraction\Modules\ThemeBuilder`). Original code; nothing is copied from any external Pro plugin. Plans:
[theme-builder-plan.md](theme-builder-plan.md) (header and footer), [theme-builder-2-plan.md](theme-builder-2-plan.md) (the rest).

## Using it

1. Refraction > Theme Builder, tab Headers, Footers, Single, Archive, Search Results or Error 404, **Add New**. The template type dialog opens with the type
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

## Single, Archive, Search Results and Error 404

These templates replace the main content of a page; the site header and footer stay around them.

| Type | Serves | Typical rule |
|---|---|---|
| Single | any single post, page or custom post type item (also a static front page) | `include/singular`, `include/singular/post`, `include/singular/book` |
| Archive | category, tag, custom taxonomy, author, date, post type archives, the posts page, posts as front page | `include/archive`, `include/archive/tax/category`, `include/archive/type/post` |
| Search Results | the search results page, with or without results | `include/archive/search` |
| Error 404 | the not found page (the 404 status is kept) | `include/404` |

**Location guard.** The rules decide *which* template of a type wins, but a type only ever serves its own kind of request
(`Location_Scope`). A Single template with "entire site" never takes over an archive, a search or a 404; an Archive
template never takes over search results (they have their own type). So the same rule names work for every type.

**Rendering.** When a body template matches, `template_include` (priority 15) swaps the theme's page template for
`modules/theme-builder/templates/body.php`: header, `<main class="refraction-location-{type}">` with the template, footer.
Classic themes call `get_header()` / `get_footer()` (so a matching header/footer template replaces them through the
existing takeover and the theme's own header/footer print otherwise). Block themes print the `header` and `footer`
template parts inside `wp-site-blocks`, which the existing `pre_render_block` logic swaps for matching Refraction
templates. A page that picked the Refraction Canvas or Header-Footer page template, and Refraction library templates
opened on their own, are left alone.

**Preview Settings** (document settings > Preview Settings, every Theme Builder template). Choose what the template is
designed against: a post, page or custom post type item (search by title; empty = the latest), a category / tag /
custom term archive, an author, a month (`2025-03`), a post type archive, the blog, a search word, or the 404 page.
Header and footer templates can preview as any of these too (default: a page). **Apply & Preview** stores the choice in
the template's page settings (`refraction_preview_target`) and re-renders the preview. Behind it, the editor's widget
render request replaces the global query with a `WP_Query` for that target (`Preview_Context`, hooked on the new action
`refraction/widgets/ajax_render/query`), so every Theme Elements widget and template tag behaves as on the site. The
choice only affects the editor.

## Theme Elements widgets

Category **Theme Elements**. Widgets marked (T) are offered in the panel only while editing a Theme Builder template;
the others work in any page.

Site Logo (the Customizer logo or a chosen image), Site Title, Site Tagline, Page Title (post, archive, search or 404
heading), Post Title, Post Content (T), Post Excerpt (T), Featured Image, Post Info (T: author, date, time,
comments, terms, custom text; each with link, prefix and icon), Author Box (T), Post Comments (T, the theme's comments
template), Post Navigation (T, previous / next, optionally in the same term), Breadcrumbs (home, parents, current),
Archive Title (T, optional prefix removal), Sitemap (pages, posts, custom post types and term lists, columns, depth),
Search Form (classic or minimal, optional post type restriction).

All are dynamic: never cached, never written into the saved post content, text escaped. In the editor they are
rendered by the server, like every other server widget.

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

* The editor preview shows the template only, not the surrounding site header and footer (Preview Settings changes the
  content the widgets show, not the frame around it).
* Body templates: one template per request (the best match). There are no template parts or conditions per widget.
* A page that selected the Refraction Canvas / Header-Footer page template keeps it instead of a matching Single template.
* Block themes: the body page prints the theme's template parts named `header` and `footer`; a block theme without those
  names prints no header/footer there (a matching Refraction header/footer template still prints).
* Breadcrumbs are built from WordPress data only (no SEO plugin integration). Post Comments needs the theme's comments
  template (a core fallback is used when it has none). Sitemap lists at most 500 items per non-hierarchical type.
* Archive Posts (the loop of an archive) is not part of this module (the Loop Builder work).
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
* `php scripts/test-theme-builder-templates.php` the location guard and Preview Settings logic; no WordPress needed.
* `node scripts/check-theme-builder-2.mjs --site <dir> --port <port>` Single / Archive / Search / 404 templates, widgets and
  Preview Settings on two classic themes and a block theme, admin tabs, editor.
* `node scripts/check-theme-builder.mjs --site <dir> --port <port>` real WordPress, classic and block themes, admin, the
  editor UI, endpoint security, preview, opt-in and Floating Elements. Needs a test site from
  `scripts/setup-menu-test-site.sh`.
