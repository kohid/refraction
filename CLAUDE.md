# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working rule (set by the owner)

Always use the installed skills whenever one applies to the task, and invoke it before starting the work. Do not skip a skill because the task looks small. Examples that apply here:

- Bugs or unexpected behaviour: `superpowers:systematic-debugging` (root cause before any fix).
- Adding or changing behaviour: `superpowers:brainstorming`, then `superpowers:test-driven-development`.
- Before saying work is done, fixed or ready to release: `superpowers:verification-before-completion`.
- Larger multi-step work: `superpowers:writing-plans` / `superpowers:executing-plans`, and `feature-dev:feature-dev`.
- UI work: `frontend-design:frontend-design`; WordPress/PHP/JS full-stack work: `anthropic-skills:fullstack-developer`.
- Reviews: `code-review`, `simplify`, `security-review`.

## Project

Refraction is a GPL-3.0-or-later WordPress page-builder plugin forked from Elementor 4.4.0 (see NOTICE). It must work offline. The only allowed external call is the update check against this repository's GitHub releases (see readme.txt).

- Do not reintroduce calls to Elementor's services, the Atomic Editor, or upsell/Pro-gating code.
- Pro-style features are built in as always-on modules, with no toggle.
- Rename script: `scripts/rename-to-refraction.mjs`. Release: `scripts/build-release.mjs` produces `dist/refraction.zip`; pushing a `v*` tag runs `.github/workflows/release.yml`.
- Known problems and leftovers are listed in `docs/refraction/*.md`.
- Verify changes by booting WordPress (SQLite test site is fine) and checking the real admin and editor, not only `php -l`.
