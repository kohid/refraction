# Records Dashboard (0.129.0)

Widgets for building a page where people work with Form Builder records (bookings, orders, enquiries): a menu on the
left, a table of records in the middle, and the chosen record's details on the right. They live in their own
**Records** category in the editor panel. Module: `modules/records-dashboard`.

Records come from a collection made in **Refraction > Builder** (or from a Form page). A plugin that keeps its
bookings in its own tables (for example a separate booking plugin) is not read by these widgets.

## Sidebar Panel (`refraction-sidebar-panel`)

A nested widget holding one container, like Off-Canvas. Put a menu, a logo, links or any widgets in it.

| Setting | What it does |
| --- | --- |
| Side | Left or right edge. |
| Placement | **Docked**: fixed, full height, against the edge. **Floating**: fixed, a card `Space from the edge` away from it, rounded, with a shadow. **In the page**: stays where it is placed and sticks while the page scrolls (`Full screen height` makes it as tall as the window). |
| Move the page aside | Docked and floating panels give `<body>` a padding on their side (the panel width, plus twice the space for floating) so nothing is covered. The widest panel on each side wins. |
| Width, Space from the edge, Space at the top | Per screen size. The top space leaves room for a fixed header; the WordPress admin bar is added on its own. |
| Small screens > Fold into a button on | Never, phones, tablets and phones, or every screen. Folded, a **Menu** button (fixed in the top corner, or where the widget is) opens the panel as a drawer from its side over an overlay; Escape, the overlay or the close button closes it, and the page is not moved. |
| Keep the drawer open in Edit Mode | In the editor's tablet/phone preview the folded drawer stays open so its content can be edited. |
| Style | Background (colour or gradient; dark navy by default), text colour, padding, border, radius, shadow, stack order; button typography and colours; overlay colour. |

Script: `assets/js/frontend/handlers/sidebar-panel.js` (screen-size checks use the site's breakpoints; the same code
runs in the editor preview). Styles: `assets/scss/frontend.scss`.

## Records Table (`refraction-records-table`)

| Setting | What it does |
| --- | --- |
| Collection | Which Builder collection. |
| Who can see the records | Administrators, editors and administrators, or anyone signed in. Records are never public; others see **Message for others**. |
| Title, count, rows per page, sort by, order, "when nothing matches" | |
| Columns (drag to reorder) | Each column: heading, what it shows, its field, a second line, a width in px and the alignment, and whether its heading sorts. |
| Viewers can drag the headings to reorder | Kept in the viewer's browser (`localStorage`, per widget and set of columns). **Reset columns** brings the set order back. |
| Rows as cards on phones | Below 768px each row is a card, every cell with its heading. |
| Toolbar | Search, status filter, from/to dates (the day a record was made), Refresh, Export CSV. |
| A row opens this Off-Canvas | The Panel ID of an Off-Canvas (opening from the right) holding a Record Details widget. |

Column types:

- **Text**: a field, with an optional second line from another field.
- **Reference and date booked**: the record title (or a field) in bold, the date it was made below (or another field).
- **Person**: initials in a circle, the name, and a second line (phone, email...).
- **Journey**: From (A), stops, To (B). Stops can be a repeater field (each row is a stop) or a text field with one
  stop per line (also `;` or `|`). Markers: A, 1, 2... B.
- **Badge**: the status in its colour, or any field as a grey badge.
- **Amount**: in the collection's currency (any number field can be shown as an amount).
- **Date booked**.

The record parts every collection has are offered beside the fields: title (reference), date booked, last changed and
status. The field lists show every collection's fields, since the panel cannot know which collection was just picked.

Choosing a row (click, Enter or Space) marks it, sends `refraction:record-select` (`{ collection, id }`) on `document`,
and opens the Off-Canvas when one is named (not in Edit Mode, where the Off-Canvas is shown in the page). The table
loads again on `refraction:record-changed` for its collection.

Export CSV writes the table's columns as plain text for every record matching the filters (up to 5000), with a
byte-order mark for spreadsheets; a cell starting with `=`, `+`, `-` or `@` gets a leading `'`.

### Reference and field choices (0.147.0)

- Field `_reference` ("Reference number", record meta `_rfb_reference`): a Reference column with no field shows it, or the record title when the form gives no reference. A reference typed in the search (`IT-251113-4821`) finds its record.
- Once the Collection is chosen, `assets/js/editor/collection-fields.js` narrows every field select of Records Table and Record Details to that collection's fields, by their own label (`window.refractionRecordsFields`, from `Records_View::fields_by_collection()`).

## Record Details (`refraction-record-details`)

| Setting | What it does |
| --- | --- |
| Collection, Who can see the records | As above. Only editors and administrators can change a status. |
| Title, Show the date booked, Words before the date | The header: `ICT-1013` / `Booked 13 June 2026`. |
| Link to the record in the Builder | For administrators, an "Open in the Builder" link under the details. |
| Before a record is chosen | The text shown until a row is chosen. |
| Sections (drag to reorder) | **A field** (label above, bold, label and value in a row, an amount in a row, a total with a line above, or a badge; full or half width), **Heading**, **Journey**, **Person with Call / Email** (name, phone and email fields; the buttons are `tel:` and `mailto:` links), **Status buttons** (one per status, the current one filled; pressing another changes the status), **Divider**. |
| Style | Accent colour, title, headings, labels, values, space between sections, button radius. |

It shows the record a table chose, or the one in `?record=ID` (when the viewer may see it). Edit Mode shows the newest
record so the layout can be styled; its status buttons change nothing there. After a status change it sends
`refraction:record-changed`, and the action `refraction/records_dashboard/status_changed` (`$id, $status, $definition`)
runs on the server.

## How the scripts ask for records

One admin-ajax action, `refraction_records`, registered for signed-in people only (no `nopriv`). Each request carries
a nonce and the widget's settings as they were drawn, signed with an HMAC of the site's salt
(`Records_View::sign/verify`), so they cannot be changed in the browser; the access level in them is checked again on
every request. Operations: `rows`, `csv`, `record`, `status`. Rows and details come back as HTML written by
`classes/records-view.php`, the same code that draws the first page and the editor preview.

`Records::query()` (Form Builder) takes `from` / `to` (`Y-m-d`) for the day a record was made.

## Check

`node scripts/check-records-dashboard.mjs --site DIR --port N`: the docked, floating, right and in-page panels and the
phone drawer; the table's rows, cells, pages, search, status and date filters, sorting, Export CSV, dragging and
resetting columns and phone cards; a row opening Record Details in an Off-Canvas and a status change; signed-out and
changed-config requests refused; and in Edit Mode the Records category, a new panel's container, Placement / Side /
Width shown at once, the table's rows and a column moved in the panel, Record Details' newest record and a changed
section look, and the folded phone preview.
