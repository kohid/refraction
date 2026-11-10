# Ask Claude

A panel in the editor (top bar: **Ask Claude**, and **Ask Claude to change this** in an element's right-click menu) that builds with Refraction's own widgets from a prompt: a **whole page**, a **new section** (after the selected element, or at the end), or a **new version of the selected element**. What Claude builds arrives as ordinary, editable elements, and one **Undo** removes it. Added in 0.19.0; module `modules/ask-claude`.

Tests: `php scripts/test-ask-claude.php` (layout checker, sending turns back, reading pasted chat answers), browser check `node scripts/check-ask-claude.mjs --site DIR --port N` (against a fake Anthropic API in `scripts/fixtures/fake-anthropic.mjs`, so it costs nothing).

## Two ways to reach Claude

The panel's first switch picks one of three (remembered per browser; a site with a key starts on API key, otherwise on Claude Code):

- **Claude Code** (on the person's Claude Pro or Max plan, like Sprint Illustrations' piece requests): see the next section.

- **API key**: the site calls Anthropic's API with its own key and builds in one step. Paid as API credit on console.anthropic.com, which a Claude.ai plan does not include.
- **Claude.ai chat**: for people with a Claude.ai Pro or Max plan and no API credit. **Copy prompt for Claude.ai** puts one self-contained prompt on the clipboard (or saves `refraction-prompt.txt` when the browser has no clipboard access): the task, the description, the page or selected element as JSON, the widget catalog, **every control** of the container and of each widget (the settings every widget shares are listed once), the library images (id, title, alt), the site styles and the answer format (one `json` code block with `elements` and `summary`). About 30,000 tokens for a full page brief, which counts against the plan's usage. The person pastes it into a new chat (attaching reference images there), then pastes Claude's reply into **Claude's answer** and presses **Insert into the page**. The REST route `chat-import` finds the JSON (the longest `json` block, or the text from the first bracket to the last; an answer cut off halfway is refused with a message) and checks it with the same `Layout_Sanitizer` as the API mode. **The site calls nobody in this mode**, it needs no key and no PHP 8.1 (the SDK is not loaded), and there is no hourly limit. Prompts are built by `Classes\Prompt_Builder`, shared with the API mode.

## Claude Code

No API key or credit: the request waits on the site and a Claude Code session (claude.ai/code, the desktop app or the CLI, all included in Claude Pro and Max) builds it.

1. **Send to Claude Code** queues the request (`POST refraction/v1/ask-claude/jobs`: the description, mode, page or selected element as JSON, site styles switch and, for "Change selected", the element's id). Stored as the private post type `refraction_ai_job` (author = who asked, parent = the page, meta `_refraction_job`); at most 5 waiting per person and 20 an hour.
2. The session runs `/ask-claude-watch` (`.claude/commands/ask-claude-watch.md`), which keeps a Monitor on `node scripts/claude/ask-claude-queue.mjs watch`. Every 5 s the watcher calls `POST …/jobs/watch`: that beats the heartbeat (option `refraction_ask_claude_watcher`; the panel shows "Claude Code is watching" while it is under 30 s old), puts requests stuck in "building" for 30 minutes back in the queue, and lists what waits; the script prints one JSON line per newly waiting request.
3. For each one the session runs `start <id>` (the panel shows "Claude is building"), `brief <id>` (`GET …/jobs/<id>/brief`: the same self-contained prompt as the Claude.ai chat mode, built for that page), writes the answer to a file and sends it with `result <id> --file F`. The answer is read and checked by `Layout_Sanitizer` before it is stored; when nothing usable is left (or not exactly one element for "Change selected") it is refused with the reason and the request stays open, so the session fixes it and resends. `decline <id> --note …` explains what can not be built.
   Before sending, the session looks at its answer: `preview <id> --file F [--shots DIR]` (`POST …/jobs/<id>/preview`) checks the answer like a result, saves it into a hidden draft copy of the page (the whole page, the page plus the new section, or the page with the selected element replaced; the page's template and background are copied) and returns a secret preview link (`Draft_Preview`); `--shots` saves full-page screenshots at 1440px and 390px after scrolling through, and reports a page wider than the phone. The person's page is never touched. The draft is deleted when the result or a decline is sent, or the request is removed. The workflow (`.claude/commands/ask-claude-watch.md`) asks for at least two rounds of preview and review before the result.
4. The panel polls every 5 s while it is open. A ready request shows Claude's summary with **Insert into the page** (one Undo step; "Whole page" asks before replacing) and **Discard**; a waiting one can be cancelled; a declined one shows the note.

The rules (states queued → building → ready, declined; requeue after 30 minutes; the 30 s watching window) are pure in `Classes\Job_Rules`; storage is `Classes\Job_Queue`, the routes `Classes\Queue_Rest`.

**Set up** (an administrator; the panel shows the same steps while nobody watches): create a user with the role **Claude Code builder (Refraction)** (`refraction_claude_builder`: only `read` and `refraction_claude_build`, so its Application Password can't do anything else), add an Application Password to it, and start Claude Code on this repository with `REFRACTION_REST_URL` (the site, https), `REFRACTION_REST_USER` and `REFRACTION_REST_PASSWORD`. In a Claude Code cloud environment, allow the site's host in the network policy (or let the proxy add the credential, in which case the user and password can be left out). Then type `/ask-claude-watch`. Administrators can also watch with their own Application Password.

## Design guide (0.64.0)

`classes/design-guide.php` (`Design_Guide`) is added to every prompt (API key, Claude.ai chat, Claude Code brief, MCP `get_format`) after the content rules:

- **DESIGN DIRECTION**: decide the page's idea and mood first; a palette of ink, paper, accent and tint; a type scale with numbers (hero 64-88px, phone 38-42); an 8px spacing rhythm with section paddings; varied section shapes; one signature moment; restrained motion; user-friendly rules (one main action, 48px buttons, tappable contact links); icons and phone rules.
- **SIGNATURE FEATURES**: what makes Refraction pages stand out, with the exact settings: text reveals, two-tone headings, animated headlines, marquee bands, parallax presets and mouse tilt, sticky columns, magnetic buttons and cursor labels, scroll doors, gradient and slideshow backgrounds, shape dividers, bento grids, and the experience widgets.
- **SECTION RECIPES**: five sections as element JSON (split hero, marquee band, bento, sticky story, closing call). `scripts/check-ask-claude.mjs` runs each one through the `Layout_Sanitizer` and fails if any setting or value would be left out.
- **REVIEW BEFORE ANSWERING**: a seven-point checklist (specific to the subject, hierarchy, one signature moment, rhythm, phones, contrast, no invented facts).

The sanitizer also reports the settings it leaves out (`ignored_settings`: unknown names, or `name (value)` when the value does not fit) to Claude, in the `preview`, `result` and MCP `save_draft` answers. The person's panel still lists only left-out widgets. Box and text shadows and visual-choice controls (shape dividers) are now accepted; before 0.64.0 they were always dropped.

## Page settings (0.65.0)

A whole-page answer may hold `"page_settings": {...}` next to `"elements"`. Only the settings `Widget_Specs::page_controls()` allows are kept (`/^(template$|rf_hp|rf_loader|background_)/`: the template, pages side by side, the loading screen, the page background), each cleaned like an element setting; anything else is named back to Claude as `page: <name>`. The chat prompt and the Claude Code brief list them in a PAGE SETTINGS part (whole-page requests only); MCP `get_format` lists those of the front page, and `save_draft` and `propose_to_page` take `page_settings`. Insert in the editor applies them to the document in the same undo step as the elements. The API-key mode does not set page settings yet.

## MCP server

Refraction is also an MCP server (Model Context Protocol, Streamable HTTP, stateless JSON) at `/wp-json/refraction/v1/mcp` (or `/?rest_route=/refraction/v1/mcp`), so Claude Code can work on the site directly instead of answering in one go: read the widgets and pages, build a **draft page**, open its preview in a browser, compare it with a reference and save again until it matches. `Classes\Mcp_Server` (JSON-RPC: `initialize`, `ping`, `tools/list`, `tools/call`; notifications get 202; GET gets 405) and `Classes\Mcp_Tools`:

| Tool | Does |
| --- | --- |
| `get_format`, `get_site`, `list_widgets`, `get_widget_controls` | the element format and content rules, version, global colors and fonts, the widget catalog, and compact settings of chosen widgets (`*` = has tablet/mobile copies) |
| `list_media`, `upload_media` | library files (images, video, .glb) with ids; add a file from a URL or base64 (normal upload checks) |
| `list_pages`, `get_page` | pages and a page's saved element tree |
| `save_draft` | creates or replaces a draft page made through MCP (never publishes, never touches other pages), checked by `Layout_Sanitizer`; returns a **secret preview link** (`?page_id=ID&rf_preview=KEY`, `Classes\Draft_Preview`: works without login, renewed on every save, noindex, no-store) and what was left out |
| `propose_to_page` | offers elements to an existing page as a ready request in that page's Ask Claude panel (Claude Code), for whoever edits the page to insert |
| `list_requests`, `get_request`, `answer_request`, `decline_request` | the Claude Code queue |

It runs as the user of the Application Password. The **Claude Code builder (Refraction)** role now also holds `edit_pages` (its own drafts) and `upload_files`, still no publishing and no other people's pages. Media settings now accept the file types a control asks for (a .glb for the 3D Build Scene, video for the Scroll Sequence), not only images. `upload_media` with a `url` is the only outbound request, made when the connected client asks for it.

**Connect Claude Code**: `claude mcp add --transport http refraction https://SITE/wp-json/refraction/v1/mcp --header "Authorization: Basic BASE64"` where BASE64 is `user:application-password` in base64 (`printf '%s' 'claude-builder:xxxx xxxx xxxx xxxx xxxx xxxx' | base64`). Sessions that can not add an MCP server use the same tools through `node scripts/claude/refraction-mcp.mjs tools | call <tool> '<json>'` with `REFRACTION_REST_URL`, `REFRACTION_REST_USER` and `REFRACTION_REST_PASSWORD`. Claude.ai's own connectors need OAuth, which this server does not offer.

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
3. `Classes\Layout_Sanitizer` checks everything before it reaches the editor: only containers and widgets that exist and that the user may use (raw HTML, shortcodes and legacy WordPress widgets are never generated, not even for administrators; form fields only on a Form page); only settings that are real controls of that element, each cleaned for its type (options from the control, numbers within limits, colors, units from the control, links to pages/anchors/mail/phone only, icons from the bundled libraries, repeater items with their own fields, `__globals__` only to existing global colors and fonts); media only as images already in the library, with the URL taken from the library; at most 600 elements and 8 levels; fresh ids. Dropped items are listed in the panel. If nothing usable is left, Claude gets one chance to correct it.
4. Errors from Anthropic are shown as plain messages: no credit on the key's account (error code `refraction_ask_claude_no_credit`: the message says a Claude plan does not pay for API calls and the panel offers **Use Claude Code** and **Use Claude.ai chat**, which keep the description; or add credit at console.anthropic.com, Settings > Billing), a refused key, rate limits, Claude busy (500/503/529), or Anthropic's own one-line message for anything else (`Claude_Builder::explain()`).
5. The editor inserts the elements with its own commands inside one history step (`document/history/start-log`), so Undo restores the page as it was.

Content rules given to Claude: write real copy for the subject; never invent facts about the business (prices, addresses, phone numbers, clients, testimonials, ratings, awards, statistics) and use bracketed placeholders like `[Phone number]` instead, named in the summary; one h1, headings in order, alt text, readable contrast; use the 3D Build Scene and Scroll Sequence only when asked for that kind of experience.

## The bundled SDK

Anthropic's official PHP SDK (`anthropic-ai/sdk` 1.3, MIT) and Nyholm PSR-7 are installed from `scripts/claude-sdk/composer.json` (locked) and copied with every namespace under `Refraction\Vendor\` by Strauss (`node scripts/build-claude-sdk.mjs`, run by the release build; it takes several minutes and is skipped while the lock file is unchanged). So they never clash with another plugin that bundles the same libraries. The SDK sends requests through `Classes\Wp_Http_Client`, a PSR-18 client on WordPress's HTTP API (the site's proxy and certificates apply), found by the SDK's discovery through `Classes\Discovery_Strategy`. The SDK adds about 4 MB to the plugin zip.

Tests point the SDK at a local fake API with the constant `REFRACTION_CLAUDE_BASE_URL` (defined by the browser check in a must-use plugin); sites never set it.

## Not yet

- Seedance video through Claude (roadmap B9): Claude would generate hero or background videos with the site's Seedance key and put them in the media library for the Scroll Sequence and video backgrounds.
- Streaming progress (the panel shows elapsed time while the request runs; a whole page can take a few minutes).
- Generating images (Claude uses library images or leaves image settings empty and says which to add).
