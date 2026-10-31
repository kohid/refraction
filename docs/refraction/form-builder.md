# Builder (Form Builder)

Refraction > Builder lets the site owner design their own record types ("collections") such as Bookings, Listings or Transactions, manage the records in an admin table, and optionally take submissions or show records on the site. Added in 0.6.0. Pure-logic tests: `php scripts/test-form-builder.php`; browser check: `node scripts/check-form-builder.mjs --site DIR --port N`.

## Design reference

The screens follow the layout language of the Metronic 8 admin demo (cards with a header, solid light inputs, soft colored badges, round initials, dashed table rows, pill pagination). Metronic is a paid ThemeForest template, so **no Metronic file, CSS, JavaScript, font or markup is copied or shipped**; the styles in `modules/form-builder/assets/scss/` are written from scratch (`--rfb-*`, `.rfb-*`).

## What it does

- **Collections** (Builder overview): start from Bookings, Listings, Transactions or a blank one, then edit freely. Each has fields, statuses (label and color), a title field, a default status and optional public switches. Stored in the option `refraction_form_builder_collections`.
- **Fields** (15 types): text, long text, number, amount, email, phone, link, date, time, date and time, dropdown, single choice, multiple choice, yes/no switch, rating. Per field: required, width (full, half, third), placeholder, help, default, options, number limits, "show in table", "add a filter", "show publicly". Every value is validated and cleaned by `Classes\Schema`; invalid input shows an error under the field and keeps what was typed.
- **Records** are posts of the private type `refraction_fb_record` (meta: collection, status, JSON values, one meta key per field for sorting and filtering). The table has status tabs with counts, search, dropdown filters, sortable columns, pagination (20 per page), bulk status change, bulk delete, and CSV export (cells that start with `=`, `+`, `-` or `@` get a leading apostrophe).
- **Public form**: `[refraction_form collection="bookings"]`, only when the collection has "Accept submissions from visitors" on. Protected by a nonce, a hidden honeypot, a 3 second minimum fill time and 10 submissions per hour per visitor. A saved submission has the collection's default status. Hook: `refraction/form_builder/submitted` ( $id, $definition, $values ).
- **Public list**: `[refraction_records collection="listings" status="published" view="cards|table" per_page="12"]`, only when "Show records publicly" is on; it shows only the status named in the shortcode and only fields marked "Show publicly". An administrator who mistypes a shortcode sees a hint; visitors see nothing.
- Deleting a collection needs its name typed and removes its records. Only users who can `manage_options` can use the admin screens; every action has a nonce.

## Limits

- No file or image upload field; use a link field.
- No email notification on a new submission (use the Forms widget actions for mail, or the hook above).
- No relations between collections, no per-record history, no import.
- Public form pages should not be fully page-cached (the nonce and minimum-time token are per page load); exclude them from caching plugins.
- Sorting and filtering rely on post meta, which is fine for thousands of records, not millions.
- Tested in Chromium on a classic and a block theme, SQLite test site; not on MySQL.
