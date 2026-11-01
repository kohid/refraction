# Ask Claude

A panel in the editor (top bar: **Ask Claude**, and **Ask Claude to change this** in an element's right-click menu) that builds with Refraction's own widgets from a prompt: a **whole page**, a **new section** (after the selected element, or at the end), or a **new version of the selected element**. What Claude builds arrives as ordinary, editable elements, and one **Undo** removes it. Added in 0.19.0; module `modules/ask-claude`.

Tests: `php scripts/test-ask-claude.php` (layout checker, sending turns back), browser check `node scripts/check-ask-claude.mjs --site DIR --port N` (against a fake Anthropic API in `scripts/fixtures/fake-anthropic.mjs`, so it costs nothing).

## Remote calls (owner-approved exception)

Refraction otherwise makes no remote calls besides the update check. Ask Claude calls Anthropic's API (`api.anthropic.com`), **only when someone presses Generate**, with the site's own API key. Nothing is sent at any other time.

What is sent: the prompt, the chosen reference images (library images, scaled to 1568 px JPEG), the page or the selected element as JSON (for "Add a section" and "Change selected"), the list of widgets, their controls (looked up by Claude), the site's global colors and fonts, and the titles/alt texts of library images (looked up by Claude).

## Setup and permissions

- **API key**: an administrator pastes it in the panel (or its settings button). It is encrypted at rest with libsodium (a key derived from the site's `SECURE_AUTH` salt; changing the salts makes it unreadable, so it must be pasted again), never sent to the browser (only `sk-ant-…wxyz`), and can be replaced or removed.
- **Who may generate**: anyone who can edit the page (`edit_posts` and `edit_post` for that page). Only administrators (`manage_options`) see and change the key and the default model.
- **Limit**: 40 generations per person per hour (each spends credits on the key). A description can be up to 60,000 characters (a full brief with sections, copy and stages, about 15,000 tokens); the box shows a live count and can be pulled taller, and a longer description is refused with a message, never cut.
- **Look**: the panel and its model menu take every color from the editor palette (`--e-a-*`), so they follow the interface theme (Settings > Theme) and, under Automatic, the editor's light or dark mode (`assets/scss/editor.scss`).
- **Model**: Claude Opus 5.5 by default (best design); Sonnet 5.5 and Haiku 5.5 can be chosen per request or as the site default. Effort is `high`; thinking is adaptive (always on for Opus 5.5). On Opus 5.5 and Sonnet 5.5 the request turns on Anthropic's **server-side fallback** (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`), so a request a safety classifier declines can be finished by another model instead of failing; a request that is still declined shows "Claude declined this request".
- **Requirements**: PHP 8.1+ with the sodium extension (Anthropic's official PHP SDK needs PHP 8.1). On older PHP the panel says so and nothing is called; the rest of Refraction works on PHP 7.4.

## How a request works

1. The REST route `refraction/v1/ask-claude/generate` (cookie nonce, permission check, hourly limit) loads the bundled SDK (`vendor-prefixed/claude-sdk/autoload.php`) and calls the beta Messages API with three tools: `get_widget_controls` (the real controls of the widgets Claude wants to use, from `Classes\Widget_Specs`), `list_images` (library images) and `submit_elements` (the result). The instructions (format, workflow, content and design rules, the widget catalog and the site styles) are prompt-cached.
2. Claude looks up controls and images (a few turns; thinking blocks are sent back unchanged; after a server-side fallback only text from before the marker is sent back), then submits the elements and a short summary.
3. `Classes\Layout_Sanitizer` checks everything before it reaches the editor: only containers and widgets that exist and that the user may use (raw HTML, shortcodes and legacy WordPress widgets are never generated, not even for administrators; form fields only on a Form page); only settings that are real controls of that element, each cleaned for its type (options from the control, numbers within limits, colors, units from the control, links to pages/anchors/mail/phone only, icons from the bundled libraries, repeater items with their own fields, `__globals__` only to existing global colors and fonts); media only as images already in the library, with the URL taken from the library; at most 250 elements and 8 levels; fresh ids. Dropped items are listed in the panel. If nothing usable is left, Claude gets one chance to correct it.
4. The editor inserts the elements with its own commands inside one history step (`document/history/start-log`), so Undo restores the page as it was.

Content rules given to Claude: write real copy for the subject; never invent facts about the business (prices, addresses, phone numbers, clients, testimonials, ratings, awards, statistics) and use bracketed placeholders like `[Phone number]` instead, named in the summary; one h1, headings in order, alt text, readable contrast; use the 3D Build Scene and Scroll Sequence only when asked for that kind of experience.

## The bundled SDK

Anthropic's official PHP SDK (`anthropic-ai/sdk` 1.3, MIT) and Nyholm PSR-7 are installed from `scripts/claude-sdk/composer.json` (locked) and copied with every namespace under `Refraction\Vendor\` by Strauss (`node scripts/build-claude-sdk.mjs`, run by the release build; it takes several minutes and is skipped while the lock file is unchanged). So they never clash with another plugin that bundles the same libraries. The SDK sends requests through `Classes\Wp_Http_Client`, a PSR-18 client on WordPress's HTTP API (the site's proxy and certificates apply), found by the SDK's discovery through `Classes\Discovery_Strategy`. The SDK adds about 4 MB to the plugin zip.

Tests point the SDK at a local fake API with the constant `REFRACTION_CLAUDE_BASE_URL` (defined by the browser check in a must-use plugin); sites never set it.

## Not yet

- Seedance video through Claude (roadmap B9): Claude would generate hero or background videos with the site's Seedance key and put them in the media library for the Scroll Sequence and video backgrounds.
- Streaming progress (the panel shows elapsed time while the request runs; a whole page can take a few minutes).
- Generating images (Claude uses library images or leaves image settings empty and says which to add).
