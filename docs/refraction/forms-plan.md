# Forms (A3) Implementation Plan

> For agentic workers: use superpowers:executing-plans; steps are checkboxes.

**Goal:** A built-in, always-on Form widget with actions, spam protection, a Submissions admin, and a Login widget. No remote calls except the owner-configured webhook and the optional captcha verification the owner turns on.

**Architecture:** Module `modules/forms` (namespace `Refraction\Modules\Forms`). Pure logic lives in `classes/` with no WordPress dependency so `scripts/test-forms.php` runs standalone. WordPress glue (DB, mail, HTTP, admin) is separate. The server never trusts the browser for form structure: a submit carries `post_id` + `form_id` (widget id) and the server re-reads the saved widget settings from the document, then validates against those.

## Global constraints
- Text domain `refraction`, CSS `refraction-`, icons `rficon-`, registered after `theme-builder` in `core/modules-manager.php`.
- Outbound HTTP only: webhook actions (`wp_safe_remote_post`) and captcha verification when the owner enabled a provider.
- Tables created with `dbDelta`, versioned by option `refraction_forms_db_version`; password fields are never stored, mailed or sent to webhooks.

## Review focus
- Header injection through name/email/subject fields; CSV formula injection; double-extension uploads (`a.php.jpg`); replayed/forged `post_id`/`form_id`; stale nonce on cached pages; webhook to private addresses (blocked unless the owner allows it).

## Tasks
1. **Pure logic + tests first** (`scripts/test-forms.php`): `Form_Definition` (settings -> fields/steps/actions with defaults), `Validator`, `Template_Tags`, `Mail_Builder`, `Csv`, `Upload_Policy`, `Spam_Guard` (honeypot, min time, math, rate limit via injected store), `Webhook_Payload`. Commit.
2. **Storage**: `Schema` (dbDelta), `Submissions_Repository`, retention, privacy exporter/eraser.
3. **Submit pipeline**: `Submit_Handler` (ajax + no-JS POST, PRG), `Actions` (collect, email, email2, redirect, webhook, discord, slack), uploads, captcha verifier.
4. **Widgets**: Form (renderer + controls + styles), Login; frontend JS (ajax, steps, focus, aria-live) and SCSS; build entries.
5. **Admin**: Submissions list/view/bulk/export/settings, menu item.
6. **Browser check** `scripts/check-forms.mjs`, docs `docs/refraction/forms.md`, changelog, final verification.
