=== Refraction ===
Contributors: kohid
Tags: page builder, drag-and-drop, editor, landing page
Requires at least: 6.8
Tested up to: 6.8
Requires PHP: 7.4
Stable tag: 0.2.0
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

Embeds you add yourself. These are not requested unless you place the widget on a page and enter an address; the visitor's browser then contacts the service (its own terms and privacy policy apply). Refraction adds no SDK script or tracking pixel for any of them.

* Facebook widgets (Button, Comments, Embed, Page): a lazy-loaded iframe to https://www.facebook.com/plugins/. Sent: the address you entered and what a browser sends with any request (IP address, cookies Facebook already has). Terms: https://www.facebook.com/terms. Privacy: https://www.facebook.com/privacy/policy.
* Video Playlist and the Media Carousel's video slides: YouTube (the privacy-enhanced youtube-nocookie.com address) or Vimeo (do-not-track mode) are contacted only after a visitor presses play. Video files from your own site make no external request. YouTube terms: https://www.youtube.com/t/terms. Vimeo terms: https://vimeo.com/terms.
* Lottie, when you choose "External URL": the visitor's browser fetches the animation JSON from the address you entered when the animation comes near the screen. Files from your Media Library stay on your site. The Lottie player itself (lottie-web, MIT license) is bundled in the plugin.

Other things you may notice that are not Refraction's own services: the editor loads Google Fonts when you pick a Google font, and some documentation "learn more" links point to third-party websites. They are only requested when you use them.

== Changelog ==

= 0.3.0 =
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
