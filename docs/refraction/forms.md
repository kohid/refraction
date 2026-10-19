# Forms

Module `modules/forms` (namespace `Refraction\Modules\Forms`). Always on, no toggle, no account, no remote service. Roadmap item A3.

## What it does

### Form widget (`refraction-form`)
- Fields (repeater): text, email, textarea, url, tel, number (min/max), select, radio, checkbox, acceptance, date, time, file upload, password, hidden, HTML, step, honeypot. Each has a label, placeholder, required flag, column width (responsive), default value (dynamic tags work), and a custom id used in templates, CSV and webhooks.
- Options: select/radio/checkbox take one option per line (`Label|value`).
- Form settings: name, input size, label position (above, inline, hidden), required mark, button text/size/icon/alignment/width, success/error/invalid messages, column and row gaps.
- Multi-step: add `Step` fields. Progress indicator as numbers, titles, both, or a bar; Previous/Next buttons; each step is validated before moving on. Without JavaScript all steps show one after another.
- Submit: ajax (fetch to admin-ajax) with messages in an `aria-live` region and focus moved to the first error or to the success message. Without JavaScript the form posts normally, the page re-renders with the errors and the typed values, and a good post redirects back (post/redirect/get) with the success message.
- Style controls: form gaps, labels, fields (typography, colours, border, radius, padding, focus colour), buttons (normal/hover, border, radius, shadow, padding), messages, steps.

### Actions after submit (repeater)
- **Collect Submissions** stores the submission in custom tables. Runs first, so the other actions can write to its log.
- **Email** and **Email 2 (auto-responder)**: to, subject, message, from, from name, reply-to, cc, bcc, HTML or plain. Tags: `[field id="..."]`, `[all-fields]`, `[form_name]`, `[site_name]`, `[site_url]`, `[page_url]`, `[date]`, `[time]`. Every address is validated on its own; line breaks are removed from header values; a field used as a recipient must hold exactly one address.
- **Redirect**: URL, tags are URL-encoded. http/https or a site-relative path only.
- **Webhook**: JSON or form-encoded POST from the server to a URL you enter. **Discord** and **Slack** presets send `{content}` / `{text}` built from a message template. Timeout 1-30 s, no redirects followed, uses `wp_safe_remote_post`; localhost and private network addresses are refused unless you turn that on in Submissions > Settings. Failures are written to the action log and never show an error to the visitor.
- Result for the visitor: success if Collect succeeded, or if no email action failed. A failing Email without Collect shows the error message. Redirect, webhook failures do not.
- Password fields are never stored, mailed or sent to a webhook.

### Spam protection
- Honeypot (setting on by default, plus a honeypot field type): a filled trap gets a quiet success and nothing is stored or sent.
- Minimum fill time (default 3 s) with an HMAC-signed timestamp.
- Per-IP rate limit (default 5 attempts per 10 minutes) in transients. The address is `REMOTE_ADDR` (filter `refraction/forms/client_ip` for proxies).
- Math question, answer verified against a signed token. Runs entirely on your site.
- Nonce on every submit.
- Optional reCAPTCHA v2/v3, hCaptcha, Cloudflare Turnstile: see below.

### Submissions screen (Refraction > Submissions)
- List with status views (unread, read, trash), search over values, form filter, date range, bulk actions (read, unread, trash, restore, delete permanently), pagination.
- Single view: all values, uploaded files (download), meta, and the action log.
- CSV export of the current filter. Cells that start with `=`, `+`, `-`, `@`, tab or CR get a leading `'`. Needs `manage_options` and a nonce.
- Settings tab: retention in days (daily clean-up and on save), store IP (off by default), store browser (off by default), mask emails in the list, allow webhooks to private addresses (off), captcha provider and keys.
- WordPress privacy tools: personal data exporter and eraser (matched on the email in an email field or the logged-in user) and suggested policy text.
- Capability: `manage_options`, filter `refraction/forms/capability`.

### Login widget (`refraction-login`)
Username/email and password, remember me, lost password link, redirect after login, logged-in state (message with log out link, or nothing), register link when "Anyone can register" is on. Uses `wp_signon()` with a nonce, one generic error for every failure, a per-IP attempt limit (10 per 15 minutes, filter `refraction/forms/login_attempts`) and validated redirects (off-site URLs fall back to the same page). There is no registration form.

## Storage
- Tables (`dbDelta`, version option `refraction_forms_db_version`): `{prefix}refraction_submissions`, `refraction_submission_values`, `refraction_submission_log`. They are created on the first request after activation or update, and upgraded in place when `Schema::DB_VERSION` is raised. Deactivating or deleting the plugin does not drop them.
- Uploads: `wp-content/uploads/refraction-forms/YYYY/MM/<32 hex>-<name>`, with `.htaccess` (deny), `index.php` and `web.config` in each folder. Files are only handed out through the Submissions screen (capability + nonce, `Content-Disposition: attachment`, `nosniff`).
- Upload rules: extension must be in the field's list and not on the always-blocked list (php variants, html, svg, js, exe, htaccess ...); every dot-separated part of the name is checked (`a.php.png` fails); size limit; files with `<?php` / `<?=` in the first 2 KB are refused.

## External services (only when you turn them on)
- **Webhooks**: your server sends the submission to the URL you typed.
- **reCAPTCHA / hCaptcha / Turnstile**: nothing loads until you choose a provider and enter your own keys in Submissions > Settings and switch captcha on in a form. Then visitors' browsers load the provider's script, and this server sends the visitor's response token (and your secret key) to the provider's verify endpoint. The secret key is stored in the options table in plain text, like most plugins do.

## Security notes
- A submission names only a document id and a widget id. Fields, options, required flags, actions and recipients are read from the saved document on the server and validated there.
- Output is escaped everywhere; input is sanitised per field type. SQL uses `$wpdb->prepare`.
- The rate limit counts attempts, not only successes.

## Limits
- Uploaded files are kept only with the Collect Submissions action; without it the upload is validated and discarded. Emails list the file name, they do not attach the file.
- One file per upload field; no drag and drop.
- Pages served from a full-page cache keep the nonce, time token and math question they were cached with. Nonces last 12-24 hours; exclude form pages from long page caches, or expect "session expired" messages.
- Email delivery is whatever `wp_mail()` does on your server; an SMTP plugin is recommended. Failures are logged in the action log.
- No conditional logic, no calculated fields, no payment fields, no "save and resume".
- reCAPTCHA v3 and the provider widgets are wired and verified server side against a fake endpoint in the checks, but have not been run against the real services.
- Submissions are not shown on a per-post basis, there is no email notification of new submissions beyond the Email action, and the CSV export is not streamed (it is built in memory in batches of 200).

## Tests
- `php scripts/test-forms.php`: validation, tags, mail building, CSV, upload policy, spam guard, rate limiter, webhook payloads, settings.
- `node scripts/check-forms.mjs [--site /tmp/rf-forms-site --port 8821]`: browser check on a real WordPress (see the header of the script).
