=== Refraction ===
Contributors: kohid
Tags: page builder, drag-and-drop, editor, landing page
Requires at least: 6.8
Tested up to: 6.8
Requires PHP: 7.4
Stable tag: 0.1.2
License: GPLv3
License URI: https://www.gnu.org/licenses/gpl-3.0.html

Refraction is a drag-and-drop page builder for WordPress that runs on your own server. Its only network request is an optional update check against its GitHub releases.

== Description ==

Refraction is a drag-and-drop page builder for WordPress, forked from the open-source Elementor plugin and developed independently. It has no accounts, cloud libraries, telemetry or upsell services. The one thing it contacts on its own is GitHub, to look for new Refraction releases (see External services below).

Refraction is not affiliated with or endorsed by Elementor Ltd.

== External services ==

Refraction makes one external request on its own, to check for plugin updates.

* Service: the GitHub REST API (https://api.github.com/repos/kohid/refraction/releases/latest). Terms: https://docs.github.com/en/site-policy/github-terms/github-terms-of-service. Privacy: https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement.
* What is sent: an unauthenticated GET request. As with any HTTP request, GitHub sees your server's IP address and a User-Agent of the form `Refraction/<version>; <your site URL>`. No other data, no account, no licence key.
* When: when WordPress checks for plugin updates (about every 12 hours). The result is cached in the `refraction_update_release` site transient for 12 hours (1 hour after a failed lookup). Clicking "Check again" on the Dashboard > Updates screen forces a fresh lookup.
* Downloading an update: if a newer release exists and you update from the Plugins screen, WordPress downloads `refraction.zip` from that release on github.com.

To turn the update check off completely, add this to wp-config.php:

`define( 'REFRACTION_DISABLE_UPDATE_CHECK', true );`

To read releases from a different repository (for example your own fork), define `REFRACTION_UPDATE_REPOSITORY` as `owner/repo` or use the `refraction/updater/repository` filter.

Other things you may notice that are not Refraction's own services: the editor loads Google Fonts when you pick a Google font, and some documentation "learn more" links point to third-party websites. They are only requested when you use them.

== Changelog ==

= 0.1.2 =
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
* Initial fork from Elementor 4.4.0 (GPL-3.0-or-later).
* Removed the Atomic Editor.
* Removed all calls to Elementor's servers and upsell prompts.
* Added a self-hosted update check against GitHub releases (can be disabled with REFRACTION_DISABLE_UPDATE_CHECK).
