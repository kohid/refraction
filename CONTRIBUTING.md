# Contributing to Refraction

Thank you for helping. Refraction is licensed under GPL-3.0-or-later and contributions are accepted under the same license.

## Ground rules

- Do not add code that contacts an external service on its own (accounts, template libraries, telemetry, update or promotion feeds). Anything networked must be explicit, user-initiated, and documented.
- Do not copy code from commercial or license-restricted products. Only contribute code you wrote or code that is compatible with GPL-3.0-or-later, and keep its license notices.
- Keep upstream copyright notices intact; see [NOTICE](NOTICE).

## Setup

1. Install PHP 7.4+, Composer, and Node (see `.nvmrc`).
2. `composer install`
3. `npm ci --ignore-scripts`
4. `npm run build`

Source for the editor and frontend is in `assets/dev`; packages are in `packages`.

## Checks

- PHP syntax: `find . -name '*.php' -not -path './vendor*' -not -path './node_modules*' | xargs -n100 php -l`
- Tests: see `package.json` scripts (`test:php`, `test:jest`, `test:playwright`). Some tests still target upstream behaviour and are being reviewed.

## Pull requests

Use Conventional Commit titles (`feat:`, `fix:`, `docs:`; mark breaking changes with `!`). Describe the problem, the change, and how you checked it, and say what you did not run.
