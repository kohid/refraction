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
