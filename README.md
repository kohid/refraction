# Refraction

Refraction is a drag-and-drop website builder plugin for WordPress.

It started as a fork of the open-source Elementor 4.4.0 plugin and is being developed as an independent project. It works fully offline: it does not connect to any external account, template library, cloud service, telemetry endpoint or upsell service.

## Status

Early development. The source tree is being renamed and rebuilt, and the editor is being brought up to work without the services that were removed. See [docs/refraction](docs/refraction) for the current work lists.

What differs from upstream so far:

- The Atomic Editor and everything built on it has been removed.
- All calls to Elementor's servers (account Connect, template and kit libraries, cloud library, AI, telemetry, notifications and upsell prompts) have been removed.
- Site-building features that upstream sells separately are planned as built-in, always-on modules, with no separate add-on and no on/off switch.

## Requirements

- WordPress 6.8 or later
- PHP 7.4 or later

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License and attribution

Refraction is free software, released under the GNU General Public License, version 3 or later. See [license.txt](license.txt) and [NOTICE](NOTICE).

It contains code originally written by the Elementor team. That code is used under the GPL, and its copyright notices are kept. Refraction is not affiliated with, endorsed by, or sponsored by Elementor Ltd. "Elementor" is a trademark of its owner.
