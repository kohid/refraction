=== Refraction ===
Contributors: kohid
Tags: page builder, drag-and-drop, editor, landing page
Requires at least: 6.8
Tested up to: 6.8
Requires PHP: 7.4
Stable tag: 0.4.0
License: GPLv3
License URI: https://www.gnu.org/licenses/gpl-3.0.html

Refraction is a drag-and-drop page builder for WordPress that runs on your own server. Its only network request is an optional update check against its GitHub releases.

== Description ==

Refraction is a drag-and-drop page builder for WordPress, developed independently. It has no accounts, cloud libraries, telemetry or upsell services. The one thing it contacts on its own is GitHub, to look for new Refraction releases (see External services below).

== Credits ==

Refraction is based on Elementor by Elementor.com (GPL-3.0-or-later). See NOTICE and license.txt for the upstream notices.

Refraction is not affiliated with or endorsed by the authors of that code base.

== External services ==

Refraction makes one external request on its own, to check for plugin updates.

* Service: the GitHub REST API (https://api.github.com/repos/kohid/refraction/releases/latest). Terms: https://docs.github.com/en/site-policy/github-terms/github-terms-of-service. Privacy: https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement.
* What is sent: an unauthenticated GET request. As with any HTTP request, GitHub sees your server's IP address and a User-Agent of the form `Refraction/<version>; <your site URL>`. No other data, no account, no licence key.
* When: when WordPress checks for plugin updates (about every 12 hours). The result is cached in the `refraction_update_release` site transient for 12 hours (1 hour after a failed lookup). Clicking "Check again" on the Dashboard > Updates screen forces a fresh lookup.
* Downloading an update: if a newer release exists and you update from the Plugins screen, WordPress downloads `refraction.zip` from that release on github.com.

To turn the update check off completely, add this to wp-config.php:

`define( 'REFRACTION_DISABLE_UPDATE_CHECK', true );`

To read releases from a different repository (for example your own fork), define `REFRACTION_UPDATE_REPOSITORY` as `owner/repo` or use the `refraction/updater/repository` filter.

Forms contact a service only when you set it up yourself: a Webhook action sends the submission from your server to the URL you enter, and the optional reCAPTCHA, hCaptcha or Cloudflare Turnstile setting (Refraction > Submissions > Settings) loads the provider's script in visitors' browsers and sends the visitor's response token to the provider to verify it. Both are off until you configure them.
Embeds you add yourself. These are not requested unless you place the widget on a page and enter an address; the visitor's browser then contacts the service (its own terms and privacy policy apply). Refraction adds no SDK script or tracking pixel for any of them.

* Facebook widgets (Button, Comments, Embed, Page): a lazy-loaded iframe to https://www.facebook.com/plugins/. Sent: the address you entered and what a browser sends with any request (IP address, cookies Facebook already has). Terms: https://www.facebook.com/terms. Privacy: https://www.facebook.com/privacy/policy.
* Video Playlist and the Media Carousel's video slides: YouTube (the privacy-enhanced youtube-nocookie.com address) or Vimeo (do-not-track mode) are contacted only after a visitor presses play. Video files from your own site make no external request. YouTube terms: https://www.youtube.com/t/terms. Vimeo terms: https://vimeo.com/terms.
* Lottie, when you choose "External URL": the visitor's browser fetches the animation JSON from the address you entered when the animation comes near the screen. Files from your Media Library stay on your site. The Lottie player itself (lottie-web, MIT license) is bundled in the plugin.

Other things you may notice that are not Refraction's own services: the editor loads Google Fonts when you pick a Google font, and some documentation "learn more" links point to third-party websites. They are only requested when you use them.

== Changelog ==

= 0.4.0 =
* New: Theme tab in Settings (Automatic, Daylight, Graphite, Ember, Blueprint, Contrast). The choice applies to your account and re-skins Refraction's admin screens and the editor panel, top bar, navigator, library and finder; your site and the page preview are never changed. Automatic keeps today's look. Admins can set a default theme for people who have not chosen.

* New: Popups. A Popup template type (Refraction > Theme Builder > Popups) designed in the normal editor on a popup canvas with overlay, box and close button. Settings for width, height, position, overlay colour, opacity and blur, border, shadow, padding, close button, entrance and exit animation, Escape, overlay click, scroll lock and auto close.
* New: popup triggers: page load with delay, scroll (percentage or element), scroll back up, click on any element, exit intent (mouse, and back button or fast scroll up on touch screens), inactivity, after N page views, links made with the Popup dynamic tag, the refraction:popup:open event and window.refractionPopup.
* New: popup rules: only once, every N visits, once per session or per day, do not show again after a form or a marked button, logged in, logged out and roles, devices, referrer, URL parameter, schedule and priority queue, plus the Theme Builder display conditions.
* New: Forms actions Open popup and Close popup. Popup content loads on first open; popups are accessible dialogs with a focus trap and focus return, and skip animations for reduced motion.
* New: Custom CSS for every element (Advanced tab, with a `selector` keyword and live preview), every page (Page Settings) and the whole site (Site Settings). Risky constructs (`</style>`, `@import`, `expression()`, `javascript:` URLs, `behavior`, `-moz-binding`) are removed.
* New: Refraction > Custom Code: HTML, JavaScript and CSS snippets in the head, after the opening body tag or in the footer, with Theme Builder display conditions, priority, an Active switch and a code editor with syntax hints. Administrators only; `REFRACTION_DISABLE_CUSTOM_CODE` and `?refraction-disable-code=1` switch snippets off.
* New: Display Conditions on every element (logged in, role, user, post type, page, term, author, date range, time of day, day of week, URL parameter, cookie, referrer, device, browser language) with AND/OR. Hidden elements are not in the HTML. The editor shows a badge and a "Show elements with conditions" switch.
* New: Custom Attributes on every element (`key|value` lines, event handlers and `javascript:` links removed).
* New: Motion Effects on every container, section, column and widget (Advanced tab): scrolling effects (vertical and horizontal scroll, transparency, blur, rotate, scale with direction, speed, viewport range, per-device switch, relative to viewport or page) and mouse effects (mouse track, 3D tilt). Off for visitors who prefer reduced motion.
* New: Sticky (top or bottom) with offset, Sticky On devices, stay in column, effects offset and shrink / transparent-to-solid styles; works with Theme Builder headers and the admin bar.
* New: Custom Fonts (Refraction > Custom Fonts): upload woff2, woff, ttf or otf fonts with weights and styles, font-display and preload; they appear under "Custom Fonts" in every typography font list.
* New: Custom Icons (Refraction > Custom Icons): upload a ZIP of SVG icons or an IcoMoon or Fontello icon font; each set is a tab in the icon picker.
* New: Off-Canvas widget: a panel holding any widgets that slides in from the left, right, top or bottom, opens centered, or pushes the page aside. Opens from a built-in button, any element (CSS selector) or a #refraction-offcanvas:ID link; closes with its button, the overlay or Escape; focus is trapped and returned, page scroll is locked.
* New: Mega Menu widget: menu items that are links or open a dropdown made of a container with any widgets. Horizontal or vertical, menu-width, full-width or custom-width dropdowns, open on hover (with delays) or click, full keyboard support, and a mobile layout (stacked list or slide-in panel) from the breakpoint you choose.
* New: Nested Carousel widget: slides are containers with any widgets. Slides per view per device, spacing, slide or fade, vertical, autoplay with pause button, loop, arrows, bullets, fraction or progress, keyboard and screen reader support; works inside tabs, dropdowns and panels.

= 0.3.0 =
* New: Theme Builder templates for Single (posts, pages, custom post types), Archive (category, tag, custom taxonomy, author, date, posts page, post type archives), Search Results and Error 404. Each shows between your header and footer, on classic and block themes; when nothing matches your theme renders normally.
* New: Preview Settings in the template settings: design a Single, Archive, Search Results, 404, Header or Footer template against a real post, page, custom post type item, term, author, month, search word or the 404 page.
* New: Theme Elements widgets: Site Logo, Site Title, Site Tagline, Page Title, Post Title, Post Content, Post Excerpt, Featured Image, Post Info, Author Box, Post Comments, Post Navigation, Breadcrumbs, Archive Title, Sitemap and Search Form.
* Tweak: Refraction > Theme Builder has tabs for Single, Archive, Search Results and Error 404.
* Tweak: header and footer templates are previewed against a real page in the editor instead of a blank canvas.
* New: dynamic content. The database icon on text, link, image, gallery, number, color and date controls now offers tags: post (title, excerpt, content, dates, featured image, URL, ID, terms, comments, custom fields), author (name, bio, avatar, meta, URL), site (title, tagline, URL, logo, date, request parameter, shortcode, page title, visitor), archive, contact links (email, phone, SMS, WhatsApp, Skype), internal URL, lightbox and a popup link placeholder. With Advanced Custom Fields active, ACF text, number, URL, image, gallery, color and date tags appear too. Every tag has Before, After and Fallback.
* New: Loop Builder. Loop Item template type (Refraction > Theme Builder > Loop Items) and the widgets Posts, Archive Posts, Portfolio, Loop Grid, Loop Carousel and Taxonomy Filter, with a reusable Query control (post type, manual selection, related posts, terms, authors, exclude, order, offset, avoid duplicates), numbered / previous-next / load more / infinite pagination and ajax filtering. Only published posts without a password are ever listed.
* New: Forms. A Form widget with text, email, textarea, URL, tel, number, select, radio, checkbox, acceptance, date, time, file upload, password, hidden, HTML, step and honeypot fields, multi-step forms with a progress indicator, per-field width and required marks, and ajax submit that falls back to a normal post without JavaScript.
* New: form actions after submit: Collect Submissions, Email and Email 2 (auto-responder) with `[field id="..."]` and `[all-fields]` tags, Redirect, and Webhook with Discord and Slack presets. A webhook is the only data a form sends out, and only to the address you enter.
* New: spam protection with a honeypot, a minimum fill time, a per-IP rate limit and a local math question; optional reCAPTCHA, hCaptcha or Turnstile that load only after you choose a provider and enter your keys.
* New: Refraction > Submissions with search and filters, read/unread/trash, bulk actions, a per-submission action log, CSV export, retention (auto delete), IP and browser storage off by default, and WordPress privacy export and erase support.
* New: Login widget (remember me, lost password link, redirect, logged-in state, register link when registration is open).
* New: an "Advanced" widget category with 12 built-in widgets: Nav Menu (horizontal, vertical or dropdown, accessible hamburger, hover effects), Slides, Price List, Price Table, Flip Box, Call to Action, Animated Headline, Countdown (due date or per-visitor timer; hide, message or redirect when it ends), Share Buttons (plain links, copy link, print), Blockquote (with a tweet link), Progress Tracker and Table of Contents (automatic, numbered, collapsible, sticky).
* New: 11 more widgets in the Advanced category: Media Carousel (images and videos, coverflow, thumbnail slideshow, lightbox), Testimonial Carousel, Reviews (star ratings you type in, grid or carousel), Hotspot (click, hover or always-on tooltips), Code Highlight (JS, PHP, CSS, HTML, JSON, Bash, Python; line numbers, copy button, themes), Lottie (bundled player, Media Library or URL), Video Playlist (YouTube, Vimeo and video files, loaded on click), Gallery (grid, masonry, justified, filter buttons, lightbox) and four Facebook embeds (Button, Comments, Embed, Page; plain iframes, no SDK).
* New: Lottie `.json` files can be uploaded to the Media Library; only real Lottie animations are accepted.
* Fix: typing in the editor's widget search no longer raises JavaScript errors.

= 0.2.0 =
* New: complete rebrand. The editor, loading screens, toolbar and onboarding logos and the icon font are Refraction's own artwork (icon classes now use the `rficon-` prefix); documentation links point to this project; the kit export no longer lists removed features; the old changelog moved to docs/refraction/upstream-changelog.txt.
* New: Theme Builder. Build your site's Header and Footer with Refraction and choose where each one appears. Refraction > Theme Builder lists them with their conditions; "Add New" opens the template type dialog with Header or Footer preselected.
* New: Display Conditions in the template settings of the editor. Include or exclude the entire site, the front page, all singular pages, a post type, one page or post (with search), posts by an author or in a category/tag/custom term, child pages, archives (post type, category, tag, custom taxonomy, author, date, search results), the 404 page, and visitor rules (logged in, logged out, user role). Excludes always win, the most specific template wins, and ties go to the most recently modified template.
* New: works with classic themes (header.php and footer.php are replaced when a template matches) and block themes (the header and footer template parts are replaced). When nothing matches, your theme renders normally. Themes can opt in explicitly with `add_theme_support( 'refraction-theme-builder' )` and `refraction_theme_builder_header()` / `refraction_theme_builder_footer()`.
* Tweak: Floating Elements are now shown or hidden by the same conditions engine (rules are stored in the same place as before).
* Tweak: the editor previews a header or footer template on a blank canvas, not on a copy of your site.

= 0.1.2 =
* Fix: "Create new page" on the Refraction home screen opened the WordPress block editor; it now opens the Refraction editor.
* Fix: the editor's local template library did not open, its REST endpoint hit a PHP fatal, and inserting or saving a template crashed. Saved templates now list, insert and save locally.
* Fix: Element Manager and Tools > Website Templates (export and import a site kit as a zip) returned "not allowed" or crashed; both work again.
* Fix: a leftover "flexbox changes" dialog appeared on every editor open.
* Fix: JavaScript errors on the Settings and Tools pages (removed telemetry code) and a PHP warning for templates without an author.
* New: an "Edit with Refraction" row action in the Pages and Posts lists for every editable post, and a "Settings saved." notice.
* Fix: the release workflow failed on `npm ci` (package-lock.json was out of sync for npm 11.12.1), so no downloadable zip was published. The lock file is regenerated, npm is pinned in the workflow, and the workflow can be re-run for an existing tag and updates a release created by hand.
* New: "Check for updates" link on the Refraction row of the Plugins screen. It bypasses the cache and says plainly whether Refraction is up to date, an update is available, or why the check failed (no release, no zip asset, GitHub rate limit, GitHub unreachable).
* New: "View details" window with the GitHub release notes, and the standard "Enable auto-updates" toggle now works for Refraction.
* New: `REFRACTION_UPDATE_API_BASE` constant (and `refraction/updater/api_base` filter) to point the update check at another API host; defaults to https://api.github.com.
* Tweak: added an `Update URI` plugin header so WordPress never asks WordPress.org about a plugin named "refraction".

= 0.1.1 =
* Fix: the Refraction menu was missing from the WordPress admin sidebar. It is now a visible top-level menu (Home, Settings, Tools, Saved Templates, Floating Elements, Role Manager, System Info) that respects user capabilities; editors see Home and Saved Templates.
* New: local Refraction home screen with quick links.
* Fix: the Settings link on the Plugins screen opens the Refraction settings page.
* Tweak: removed the duplicate in-page navigation sidebar, which also carried an upgrade prompt.

= 0.1.0 =
* Initial fork of the GPL-3.0-or-later code base credited in NOTICE (upstream version 4.4.0).
* Removed the Atomic Editor.
* Removed all calls to the upstream project's servers and its upsell prompts.
* Added a self-hosted update check against GitHub releases (can be disabled with REFRACTION_DISABLE_UPDATE_CHECK).
