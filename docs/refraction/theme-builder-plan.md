# Theme Builder Implementation Plan

> Written with superpowers:writing-plans. Execution: native, task by task, test first.

**Goal:** Build Header and Footer templates with display conditions into Refraction, always on, offline, original code.

**Architecture:** New module `modules/theme-builder` (namespace `Refraction\Modules\ThemeBuilder`). A pure rules layer (`Rule`, `Condition_Base` + concrete conditions, `Conditions_Manager`) decides which templates match a request and how specific the match is. `Resolver` picks one winner per location. `Locations_Manager` + `Theme_Integration` print the winner for classic themes (`get_header` / `get_footer`) and block themes (`pre_render_block` on `core/template-part`). Rules live in post meta `_refraction_conditions` and are mirrored in the option `refraction_pro_theme_builder_conditions` (format `[ type ][ post_id ] = [ rules ]`, shared with Floating Elements). A custom editor control edits the rules; an admin page lists them.

**Tech stack:** PHP 8 / WordPress 6.x, Marionette/Backbone editor control built by `scripts/vite` (`BASE_ENTRIES`), Playwright for the browser check.

## Rule grammar

`{include|exclude}/{name}[/{arg}...]`

| Rule | Meaning | Specificity |
|---|---|---|
| `general` | entire site | 10 |
| `singular`, `archive` | all singular / all archives | 20 |
| `singular/{post_type}`, `archive/type/{pt}`, `archive/tax/{tax}`, `archive/author`, `archive/date`, `archive/search` | a family | 30 |
| `404` | not found page | 40 |
| `front_page` | the front page | 50 |
| `singular/author/{id}`, `singular/in_{tax}/{term}`, `singular/child_of/{id}`, `singular/direct_child_of/{id}`, `singular/has_parent`, `archive/tax/{tax}/{term}`, `archive/author/{id}` | narrow groups | 60 |
| `singular/{post_type}/{id}` | one post | 100 |
| `visitor/logged_in`, `visitor/logged_out`, `visitor/role/{role}` | audience filter (AND with location rules); a template with an audience include wins ties (+0.5) | - |

Excludes always win. Most specific matching include wins, ties go to the newest `post_modified_gmt`, then the highest ID.

## Tasks

1. **Engine tests + engine** (`scripts/test-theme-builder-engine.php`, `tests/phpunit/refraction/modules/theme-builder/`): write the standalone test with stubbed WordPress functions first, watch it fail, then implement `Rule`, conditions, `Conditions_Manager`, `Resolver`. Commit.
2. **Module, documents, cache**: `Module`, `Header`/`Footer` documents (extend `Library_Document`), `Conditions_Store` (meta + option mirror, cleanup on trash/delete/status change). Registered in `core/modules-manager.php`. Floating Elements renders through the engine.
3. **Frontend**: `Locations_Manager`, `Theme_Integration` (classic + block), `refraction_theme_builder_header()/footer()`, CSS enqueue. Never in wp-admin or the editor/preview of a template.
4. **Admin page** (`Editor_One_Theme_Builder_Menu`, `Admin_Page`): tabs Headers/Footers, readable conditions, status, Add New via the template type dialog, Edit/Delete. Update `scripts/check-admin-menu.mjs`.
5. **Editor UI**: control `refraction_conditions`, document setting section, `Conditions_Ajax` search endpoint (nonce + capability), JS built by the `theme-builder-editor` entry, SCSS.
6. **Browser check** `scripts/check-theme-builder.mjs`, release zip, reinstall, run all checks.
7. **Docs**: `docs/refraction/theme-builder.md`, `readme.txt` 0.2.0 changelog.

## Review focus (inputs the spec implies)

- Template with only exclude rules is never displayed.
- Trashed / draft / deleted templates disappear from the resolver at once.
- Preview and editor of a template never swap in another header/footer.
- Rule strings from the browser are untrusted: unknown names, bad ids and path tricks are dropped.
- Only a header (or only a footer) matches: the other falls back to the theme.
