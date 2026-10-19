# Dynamic content

Dynamic tags put data from the site into the controls of any widget: the title of the current post, a custom field, the
site logo, a `mailto:` link built from a field, and so on. Built in and always on (module `modules/dynamic-tags`,
namespace `Refraction\Modules\DynamicTags`). Original code; nothing is copied from any external Pro plugin. Plan:
[loop-builder-plan.md](loop-builder-plan.md).

## Using it

Every control that can take dynamic content shows a small database icon on hover. Click it, pick a tag, and open the
tag's settings (the wrench) for its options. All tags have an **Advanced** section with **Before**, **After** (added only
when the tag has a value) and **Fallback** (shown when the tag is empty).

Controls that offer the switcher in the core widgets are the ones with `'dynamic' => [ 'active' => true ]` (heading,
text editor, image, button, counter, video, icon box and many more). A widget author turns it on for any control of
these types: text, textarea, WYSIWYG, URL, media (image), gallery, number, color, date/time.

## Tags

| Group | Tags |
|---|---|
| Post | Post Title, Excerpt, Content, Date, Modified Date, Time, Featured Image, URL, ID, Terms, Comments Number, Custom Field, Custom Field (URL / Color / Image / Gallery) |
| Author | Name, Bio, Avatar, Meta, URL (archive or website) |
| Site | Site Title, Tagline, URL, Logo, Current Date Time, Request Parameter (GET or POST), Shortcode, Page Title, Visitor Info |
| Archive | Title, Description, URL, Meta (term field) |
| Actions and URLs | Contact URL (email, phone, SMS, WhatsApp, Skype), Internal URL (post, term archive, author archive), Lightbox (image or video), Popup (see below) |
| Advanced Custom Fields | ACF Text, Number, URL, Image, Gallery, Color, Date; present only while the ACF plugin is active |

## Which post a tag talks about

`Context::get_post()` answers, in this order: the post of the **loop item** being printed (Loop Grid, Loop Carousel,
Posts), then the `refraction/dynamic_tags/context_post_id` filter (a Loop Item template shows its **preview post**
while it is edited), then the global post, then the queried object. Author tags use the author of that post, or the
author of an author archive. Archive tags use the queried term. Hidden posts (drafts, private posts the visitor
cannot read) print nothing.

## Safety

* Custom field names that start with an underscore are private and never read. User meta that looks like a password,
  token, key, capability or secret is never read either (`Value::allowed_key`, `Value::allowed_user_key`).
* Colour tags only output hex, `rgb()` or `hsl()` values, so a field cannot inject CSS. URL tags go through `esc_url_raw`.
  Text output is run through `wp_kses_post` or `esc_html`.
* Request Parameter only accepts names made of letters, digits, `_` and `-`, strips tags and escapes the value.
* Contact URL validates e-mail addresses (no header injection) and keeps only digits and a leading `+` of phone numbers.
* Shortcode runs the shortcode as written by the page author, with the same trust as post content.

## Limits

* The **Popup** tag only prints the action link `#refraction-action...popup:open`; the Popups module (not built yet)
  will react to it. Without it the link does nothing.
* A dynamic setting whose tag is not registered is dropped when the document is saved (same as every dynamic tag
  system). Saving a page while ACF is deactivated therefore removes its ACF tags.
* Dynamic CSS (a tag in a style control such as a colour) is generated per document, not per loop item: inside a Loop
  Item template the CSS shows the value of the template's preview post for every item. Use tags in content controls
  (text, link, image) for per item values.
* Request Parameter and Visitor Info vary per visitor; do not full page cache pages that use them.
* Not covered: ACF repeater and flexible fields, ACF options pages, tags for WooCommerce data.

## Tests

* `php scripts/test-dynamic-tags.php` pure helpers (Contact URLs, value conversion, key allow lists, loop stack).
* `node scripts/check-loop-builder.mjs --site <dir> --port <port>` real WordPress: tags on pages and posts, the
  editor switcher on every control type, tag settings, ACF stand in.
