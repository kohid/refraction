# Refraction

Refraction is a drag-and-drop website builder plugin for WordPress.

It started as a fork of the open-source Elementor 4.4.0 plugin and is being developed as an independent project. It runs entirely on your own server: there are no accounts, template or kit libraries, cloud services, telemetry or upsell prompts. The only request it makes on its own is an optional update check against the GitHub releases of this repository (see [Updates](#updates)).

## Status

Early development. The source tree is being renamed and rebuilt, and the editor is being brought up to work without the services that were removed. See [docs/refraction](docs/refraction) for the current work lists.

What differs from upstream so far:

- The Atomic Editor and everything built on it has been removed.
- All calls to Elementor's servers (account Connect, template and kit libraries, cloud library, AI, telemetry, notifications and upsell prompts) have been removed.
- Site-building features that upstream sells separately are planned as built-in, always-on modules, with no separate add-on and no on/off switch.

## Updates

Refraction updates itself from the GitHub releases of [kohid/refraction](https://github.com/kohid/refraction), so you can upload the zip once and update later from the WordPress Plugins page.

- It calls one URL, `https://api.github.com/repos/kohid/refraction/releases/latest` (unauthenticated), at most about every 12 hours; the answer is cached in a site transient. Only your server's IP address and a `Refraction/<version>; <site url>` User-Agent are sent.
- It looks for a release asset named `refraction.zip` (top-level folder `refraction/`) and compares the release tag (`v0.2.0` -> `0.2.0`) with `REFRACTION_VERSION`.
- Turn it off with `define( 'REFRACTION_DISABLE_UPDATE_CHECK', true );` in `wp-config.php`. Use another repository with `define( 'REFRACTION_UPDATE_REPOSITORY', 'owner/repo' );` or the `refraction/updater/repository` filter.
- Release packages are built by `scripts/build-release.mjs` and attached automatically by `.github/workflows/release.yml` when a `v*` tag is pushed.

## Requirements

- WordPress 6.8 or later
- PHP 7.4 or later

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License and attribution

Refraction is free software, released under the GNU General Public License, version 3 or later. See [license.txt](license.txt) and [NOTICE](NOTICE).

It contains code originally written by the Elementor team. That code is used under the GPL, and its copyright notices are kept. Refraction is not affiliated with, endorsed by, or sponsored by Elementor Ltd. "Elementor" is a trademark of its owner.
