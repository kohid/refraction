---
description: Watch a Refraction site's Ask Claude queue and build each request (Claude Code mode)
---

Build the pages people queue in Refraction's Ask Claude panel ("Claude Code" mode). This session's Claude plan does the work; the site never calls Claude. Full description: `docs/refraction/ask-claude.md`, section "Claude Code".

1. Check `REFRACTION_REST_URL` is set (and `REFRACTION_REST_USER` / `REFRACTION_REST_PASSWORD`, unless a proxy adds the credential). Run `node scripts/claude/ask-claude-queue.mjs list` once; on 401/403 tell the person the account or Application Password is wrong and stop.
2. Start a Monitor on `node scripts/claude/ask-claude-queue.mjs watch` (it runs 29 minutes, inside the Monitor's 30-minute limit; re-arm it when it ends, for as long as the person wants). It prints one JSON line per newly waiting request: `{"id", "mode", "title", "post_id"}`. While it runs, the panel shows "Claude Code is watching".
3. For every announced request, without asking:
   - `node scripts/claude/ask-claude-queue.mjs start <id>` (the panel shows "Claude is building").
   - `node scripts/claude/ask-claude-queue.mjs brief <id>` and read the whole brief file it names. It holds the person's request, the page or selected element, the widget catalog, every allowed setting, the library images, the site styles and the answer format.
   - Design the result as the brief says: real copy (no invented facts; bracketed placeholders), a deliberate layout, only the listed widgets, settings and option values, `_mobile` copies where layouts need them, library image ids only. Write the answer object `{"elements": [...], "summary": "..."}` as JSON to a scratch file.
   - `node scripts/claude/ask-claude-queue.mjs result <id> --file <file>`. If it is refused (invalid JSON, nothing usable, or not exactly one element for a "Change selected" request), fix the file and send it again. If it reports settings that were left out, correct them when they matter and resend.
   - If the request cannot be built with Refraction's widgets (or should not be built), `node scripts/claude/ask-claude-queue.mjs decline <id> --note "why, and what to ask instead"`.
4. The person inserts the result from the panel. Report briefly what you built for each request.
