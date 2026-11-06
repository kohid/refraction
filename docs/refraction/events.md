# Events

Module `modules/events` (0.33.0): events as pages you build in the editor, and an Event Calendar, an Events List and an
Event Details widget (panel category **Events**). Browser check: `scripts/check-events.mjs`.

## Events

- **Post type** `refraction_event` (public, `/events/<name>/`, archive `/events/`), with **Event Categories**
  (`refraction_event_cat`, `/event-category/<name>/`). A category has a **color** (term meta `_rfe_color`, set on its
  edit screen); a category without one gets a color from a fixed palette by its name. An event's first category gives
  it its color everywhere.
- **Admin**: Refraction > **Events** is the events table (When and Venue columns, sorted by date) with **New event in
  the editor** and **Categories and colors** above it. The WordPress edit screen has an **Event details** box.
- **Event page** (document type `refraction-event`, `Documents\Event`): built in the editor like any page. A new,
  empty event opens with its title (Heading with the Post Title tag), an Event Details box and a text. The page
  settings (the cog) have **Event details**: starts, ends, all day, categories, venue, address, price, tickets link
  and button text, organizer.
- **Details** are post meta `_rfe_<key>` (`Classes\Event_Data::FIELDS`). Dates are the site's wall-clock time as
  `Y-m-d H:i` text, so they sort and compare as text and show as typed. An empty end is the start; an all-day event
  runs 00:00 to 23:59. Saving in the editor writes the details (`Event::save()`); the admin box writes them and the
  page settings (`Event::sync_to_settings()`), so both always show the same.
- **On the site**: schema.org `Event` JSON-LD on an event's page (start and end with the site's time zone, place,
  organizer, tickets). An event written in the WordPress editor (not built in the page editor) shows the details box
  above its text.

## Widgets

- **Event Calendar** (`refraction-event-calendar`), adapted from the owner's Community Business Directory calendar:
  - search (on submit and while typing);
  - List, Month and Day buttons; previous, next and Today;
  - the title opens a month picker;
  - a **month** grid of whole weeks, with the days of the other months muted and today marked. Events are in their
    category's color, all-day and multi-day events come first, and an event over several days is joined across them.
    Busy days show a number of events, then "+ N more";
  - a **list** of the month by day, and a **day** timeline;
  - hovering or focusing an event shows a **preview card**: image, date and time, venue, text, **View event** and
    **Add to calendar** (Google Calendar, an `.ics` file, Outlook 365, Outlook.com).

  Settings: the view it opens on, which buttons show, only some categories, weeks from Monday or Sunday, events per day,
  start times, search texts, the card and its button. Style: colors (main, accent, events without a category, text,
  lines, days, other months, toolbar), day height, corners, the toolbar as a card, typography, and the card (width,
  background, title, shadow).

  The first view is printed with the page. Moving around fetches `GET /wp-json/refraction/v1/events/calendar` (`date`,
  `search`, `categories`, `week_start`, `per_day`, `times`; published events only, no login). The route returns the
  three views as HTML from `Classes\Calendar`, the same code the widget uses. The newest request wins. Script:
  `assets/js/frontend/handlers/event-calendar.js`. The card sits in `<body>` (`.rf-cal-pop[data-for=<widget id>]`) and
  copies the calendar's colors.
- **Events List** (`refraction-events-list`): the next events (an event happening now counts) or the past ones, newest
  first. Each shows as a card or a row with a date badge in its category color. Settings: how many, categories, cards
  or rows and columns, image, time, venue, text, category, button text, empty text. Style: gap, background, corners,
  shadow, image height, title, quiet text, badge and button colors.
- **Event Details** (`refraction-event-details`): on an event's page it shows that event; anywhere else, the event you
  pick. Rows: date, time, venue and address (with a map link), price and organizer, each of which can be hidden. It
  also has a tickets button and an **Add to calendar** menu (a `<details>` element, so it needs no script). Layout: one
  under another, or in a row. Style: box, rows (icon, label, text) and buttons.

## Event types and event forms (0.34.0)

An **event type** is a Form Builder form (a Form page built in the editor) that holds event fields. You design its
form; your staff use it to make events of that type. `Classes\Event_Types`; check: `scripts/check-event-types.mjs`.

- **Refraction > Event types** lists the types with who may use each form, their number of events, the shortcode and
  **Design the form** / **Use the form**. To make one, type its name and press **New event type**: this makes a Form
  page holding every event field and opens it in the editor. The name gives the type its key (`workshop`), which stays
  the same when the form is renamed, because events point to it.
- **Event Form** fields (panel category `refraction-event-fields`, on Form pages only):
  - Event name, Start date and time, End date and time, All day, Category, Venue, Address, Price, Ticket limit, Tickets
    per person, Total amount, Organizer, Event image, Description;
  - **Event button**, which is for a *Ticket link*, a *Payment* link or *Submit*. A ticket or payment button asks for
    the address in the form, and the event page shows a button with the text set here. Submit sends the form and is not
    a field.

  Each event field is a Form Builder field widget (same Content, Style and Advanced tabs, same checks) with a fixed key,
  `event_<role>` (`Base\Event_Field`). A form with a Start field is an event type. **Category** offers the Event
  Categories (all of them, or the ones picked), as a dropdown or as checkboxes. Its choices are read again every time
  the form is used (filter `refraction/form_builder/definition`), so a new category appears in the form at once.
  **Total amount** uses the form's currency.
- **Page settings > Events** of the form:
  - **Who can use this event form**: staff (people who can write posts, the default), anyone logged in, or anyone;
  - **New events are**: published, waiting for review, or drafts;
  - **Event page design**: the standard page (title, picture, Event Details, the description through the Post Excerpt
    tag), or a copy of the page of an event you built.
- **Sending the form**: the Form Builder checks and saves the submission as usual (a record of the collection). Then
  the event is made (`refraction/form_builder/submitted`):
  - its details, type (`_rfe_type`), category and author (the person who sent it);
  - the picture, copied from the private upload into the media library as the featured image;
  - the description as content and excerpt;
  - the record and the event point to each other (`_rfe_record`, `_rfe_event`).

  The success message links to the event (or to its preview while it waits for review). Someone who may not use the
  form sees "This form is only for the site's staff" or the log-in prompt (filter `refraction/form_builder/availability`).
- **Event details** gained a payment link and its button text, ticket limit, tickets per person, total amount and the
  type, in the page settings, the admin box and the Event Details widget (Tickets row, Total amount row, Pay button).
  Ticket limit and tickets per person are shown on the event; selling the tickets happens wherever the ticket or
  payment link leads.
- **Event Calendar** and **Events List** have **Only these types of event**: the types, plus "Made in the editor (no
  type)". The events table has a Type column and can be filtered by type (`?rfe_type=`).

## Type addresses, templates and Event tags (0.35.0)

- **Addresses**: an event of a type lives at `/<address>/<event>/` and `/<address>/` lists the type's events. The
  address is the form's page settings > Events > **Address of its events**, else the type's key (`/workshop/`).
  `/events/<event>/` keeps working. Rewrite rules are added for each type (`Event_Types::add_rewrites`, flushed when
  the addresses change). The links come from `post_type_link` and `term_link`. Keep an address different from your
  pages' addresses: the type's address wins.
- **Event Types taxonomy** (`refraction_event_type`, no admin screen): every event of a type is in that type's term
  (`Event_Types::assign_term`, from `Event_Data::save`). Terms are named after the types and renamed with them. The
  type archive is that term's archive, and Theme Builder conditions use it: "In Event Types: Workshop" (singular) and
  "Event Types: Workshop" (archive).
- **Refraction > Event types** links each type's address, plus:
  - **Design the event page**: a Theme Builder **Single** template with the condition
    `include/singular/in_refraction_event_type/<term>`;
  - **Design the archive**: an **Archive** template with `include/archive/tax/refraction_event_type/<term>`.

  Each is made the first time and opened again after. Starters: the title (Post Title), date and time (Event Detail),
  picture (Featured Image), Event Details, Event Button (payment), Event Gallery and description (Post Excerpt). The
  archive starter has the archive title and an Events List set to "The archive being shown". An event follows a
  Single template that matches it even when it has a page template of its own (filter
  `refraction/theme_builder/keep_own_page_template`).
- **Event tags** (dynamic tags, group Event; `modules/events/tags/`):
  - **Event Detail** (text): date and time, date, time, start or end with a format, venue, address, price, ticket
    limit, tickets per person, total amount, organizer, categories, type;
  - **Event Link** (URL): tickets, payment, map, event page, add to Google Calendar, Outlook 365 or Outlook.com;
  - **Event Form Field** (text): any answer of the event form that made the event, including fields you added
    yourself, read from its record;
  - **Event Gallery** (gallery);
  - **Event Start** (date and time, for a Countdown).
- **New widgets**:
  - **Event Button**: Tickets, Payment, map, event page or add to a calendar. It shows only when the event has that
    link, and takes the text set on the form ("Pay now"), else its own.
  - **Event Gallery**: the event's gallery as a grid that opens in the lightbox, with columns, shape, gap, corners
    and zoom.
- **New event form field**: **Image gallery** (2 to 10 pictures, copied into the media library as the event's gallery).
  An event's gallery can also be set in its page settings (Gallery).
- The form's Event button is named "Event button (tickets, payment, submit)", so searching "payment" finds it.
- Theme Builder pages on block themes now render the header and footer template parts before `wp_head()`. Before,
  the Navigation block's script modules were missing from the import map.

## Book now, payment, gallery layouts and the editor's sample event (0.36.0)

- **Book now (pay in cash)** (`Classes\Bookings`):
  - Turned on by the event form's Event button set to *Book now (pay in cash)*, which marks every event the form
    makes; or per event in its page settings (**Book now**, with its button text). The button is a "Book now"
    `<details>` with a form: name, email, phone, tickets.
  - Bookings keep to the **Ticket limit** (places left) and **Tickets per person** (counted by email). They are
    refused once the event has ended. The visitor and the site's admin email get the details and the amount to pay
    in cash (the total amount, else the price).
  - A booking is a private `refraction_booking` post: **Refraction > Events > Bookings**, filterable by event
    (`?rfe_event=`), with "Mark: Paid / To pay / Cancelled". The events table has a **Booked** column (booked / limit).
    Event Details shows "N left" or "fully booked".
  - The form has no nonce, because event pages are often cached; it uses a hidden field, a minimum time, a signed
    event id and 10 bookings an hour per visitor.
- **Payment = the total amount**: the Pay button reads "Pay now · £1,250.00" (`Event_Data::payment_text`). A payment
  link may contain `{amount}`, replaced by the total amount as a plain number (`https://paypal.me/name/{amount}`,
  `Event_Data::payment_url`). This applies to Event Details, the Event Button and the Event Link tag.
- **Event Gallery** layout **Main picture with thumbnails**: a big picture (lightbox) with the thumbnails under it.
  Clicking a thumbnail shows it (`assets/js/frontend/handlers/event-gallery.js`). Settings: thumbnail size and
  alignment, the chosen thumbnail's border, and the main picture's shape (also 2/3).
- **Dates** read "November 5, 2026" (`Event_Data::DATE_FORMAT`) everywhere, whatever the site's date format. The Event
  Detail tag has **Start date**, **Start time**, **End date** and **End time** (each with an optional format). The
  Event Form Field tag writes date and time answers out instead of `2026-11-05T19:00`.
- **The editor shows an event**: on a page, the event widgets without a chosen event show the newest event while you
  edit. An event template shows an event of its type, even when its Preview Settings point to a blog post: dynamic
  tags through `refraction/dynamic_tags/context_post_id`, widgets through `Event_Details::current_event()`. New
  templates from "Design the event page" / "Design the archive" preview an event of the type / the type's archive.

## Pay online without a payment link, backfill and fallbacks (0.37.0)

- **Pay form** (`Classes\Bookings::form( $id, $class, $text, 'online' )`): `Event_Data::payment_mode()` is `link` when
  the event has a payment link (the Pay button opens it, `{amount}` replaced), `form` when it has only a total amount,
  and `''` otherwise. In `form` mode, the Pay button of Event Details, the Event Button (payment) and the Event Link tag
  (`#rfe-pay-ID` on the event page) open a form with the total amount, the **payment instructions**
  (`_rfe_payment_note`) and the **payment QR code** (`_rfe_payment_qr`, an image id), asking for name, email, phone,
  tickets and a required payment reference. It is saved as a booking with method `online`, its reference and the
  amount, keeps to the ticket limit and tickets per person, is emailed, and is listed as **To check** until marked
  paid. Set the instructions and QR code on the event form's Event button (kind Payment) or in the event's page
  settings.
- **Backfill**: the first time an event made by an event form is read (`Event_Data::get`, marker `_rfe_backfill`),
  `Event_Types::backfill()` fills empty details from the form's answers: the total amount from the first currency field
  (else a number/text field named total or amount), the payment link from a URL field named pay/gcash/checkout, and the
  gallery from image files in the form's other file fields.
- **Gallery fallback**: `Event_Data::gallery()` returns the featured image when the event has no gallery.
- Editor hints name the event and say what is missing and where to set it.
