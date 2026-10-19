# Loop Builder

Query controls, the **Loop Item** template type and six widgets that list posts. Built in and always on (module
`modules/loop-builder`, namespace `Refraction\Modules\LoopBuilder`). Original code; nothing is copied from any external
Pro plugin. Plan: [loop-builder-plan.md](loop-builder-plan.md). Dynamic tags: [dynamic-tags.md](dynamic-tags.md).

## Widgets (category "Posts and Loops")

| Widget | What it does |
|---|---|
| Posts | Grid of posts. Skins: Classic, Cards, Full content. Columns per device, image, title, meta, excerpt, read more. |
| Archive Posts | Posts with the query of the page being viewed (category, tag, author, date, search, post type archive, blog page). Elsewhere it shows the latest posts. |
| Portfolio | Image tiles in a grid or masonry layout with a filter bar built from a taxonomy (filters the tiles on the page). |
| Loop Grid | Prints a chosen **Loop Item** template for every post of a query, in a grid. |
| Loop Carousel | The same in a Swiper carousel (the existing carousel handler). |
| Taxonomy Filter | Buttons for the terms of a taxonomy; filters a Loop Grid or Posts widget of the same page without reloading. |

Pagination (Posts, Archive Posts, Portfolio, Loop Grid): none, numbers, previous/next, numbers + previous/next, load more
button, infinite load. Links are real links (`?rpage-<widget id>=2`); with JavaScript they load through the REST
endpoint without leaving the page.

## Loop Item template

Refraction > Theme Builder > **Loop Items** (or Saved Templates > Add New > Loop Item). Build one card with any widgets and
dynamic tags. In the document settings, **Preview > Preview with this post** chooses the post the tags describe while you
design (default: the latest post). The Loop Grid and Loop Carousel have **Edit the template** and **Create a template**
buttons; Create makes an empty published Loop Item, opens it in a new tab and selects it.

A template that is not published, or that is the template already being printed (a Loop Grid inside its own Loop
Item), prints nothing.

## Query controls

`Group_Control_Query` (type `refraction-query`, usually named `query`) is reusable: `$this->add_group_control(
Group_Control_Query::get_type(), [ 'name' => 'query' ] )`. Turn the settings into WP_Query arguments with
`Query_Runner::args_from_settings( $settings, 'query_', $page )`.

Fields: source (any public post type, **Manual selection**, **Related posts**), search-and-select posts, related by
taxonomy, only these terms, only these authors, leave out posts / terms / authors / the current post, avoid duplicates
(leave out posts that earlier widgets on the page printed), ignore sticky posts, order by, order, offset, posts per page.
The autocomplete control `refraction_autocomplete` (search box with chips) fetches matches from the lookup endpoint.

## Security

* Every query asks for `post_status = publish` and `has_password = false`, whatever the settings: drafts, scheduled,
  private and password protected posts are never listed for anyone. (A visitor sees nothing the post itself would hide.)
* Lookup endpoint `admin-ajax.php?action=refraction_query_lookup`: needs a valid nonce **and** `edit_posts`; returns
  published posts the user may read, public taxonomy terms, and authors who have published.
* REST endpoint `POST refraction/v1/loop-page`: needs the `X-Refraction-Nonce` header and a signed token (HMAC of the
  document, widget, current post and archive variables). The client only chooses a page number (clamped) and one term
  of a public taxonomy; the widget is rebuilt from the saved, published document, so settings sent by the client are
  ignored. Draft and password protected documents are not served.
* All output is escaped (`esc_html`, `esc_url`, `wp_kses_post` for titles and excerpts); loop item markup is the normal
  builder output.

## Limits

* The REST nonce and token are printed in the page. A full page cache that serves a page for longer than the nonce
  life (12 to 24 hours) makes load more and the filter fail (HTTP 403); the pagination links keep working as links.
* "Avoid duplicates" only knows posts printed earlier in the same request; it does not carry over to load more or REST
  pages.
* Archive Posts pagination uses its own `rpage-<id>` parameter, not WordPress `paged`, so it does not change the
  theme's own pagination; it shows the first N posts of the archive and pages through all of them.
* The Taxonomy Filter filters Loop Grid and Posts widgets (not the Portfolio, which filters client side, and not the
  carousel). A grid is addressed by its CSS ID (Advanced tab); empty means the first filterable list of the page.
* The Portfolio filter acts on the tiles that are already on the page; combine it with a high posts-per-page.
* In "Related posts" the current post comes from a singular page or from a loop item; on archives it finds nothing.
* Dynamic CSS inside a Loop Item uses the template's preview post (see dynamic-tags.md).
* The loop widgets are never cached by the element cache (their output depends on the database).
* Tested on SQLite with a classic theme (Twenty Twenty-One) and a block theme (Twenty Twenty-Five); not tested on MySQL,
  multisite, or RTL.

## Tests

* `php scripts/test-loop-builder.php` pure query arguments, pagination arithmetic, signed token.
* `node scripts/check-loop-builder.mjs --site <dir> --port <port>` real WordPress, both theme kinds, REST security,
  browser behaviour, editor and admin.
