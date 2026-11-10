# What Refraction can do (capability atlas)

The study's map of Refraction's features that make a page memorable, with the settings Ask Claude uses and what each is good for. Read it before designing; the design guide (`modules/ask-claude/classes/design-guide.php`) carries the short version into every prompt. Everything here is built in and works offline.

## Whole-page experiences (Ask Claude: `page_settings` of a whole-page answer, since 0.65.0)

| Feature | Settings | Good for |
| --- | --- | --- |
| Pages side by side | `rf_hp` `slide` (pages slide in from the right, with parallax depth, arrows, a big page number and a progress line) or `book` (pages turn over like a book); `rf_hp_speed`, `rf_hp_counter` (number, fraction, none), `rf_hp_counter_prefix` (`*`), `rf_hp_loop`, `rf_hp_phone` (rotate, stack, ask), `rf_hp_accent` | Portfolios, tours, menus, annual reports: each top-level container becomes a full screen |
| Loading screen | `rf_loader` `yes`, `rf_loader_style` (bar, spinner, counter), `rf_loader_exit` (fade, slide, split), `rf_loader_logo` (site, text, image), colours `rf_loader_bg` / `_color` / `_accent` / `_accent_2` | Launches and landing pages with heavy imagery |
| Canvas template | `template` `refraction_canvas` | Landing pages without the theme's header and footer |
| Page transitions, site cursor | Site Settings > Motion & Cursor (not set by Ask Claude) | Whole sites |

## Section showpieces

| Feature | Where | Good for |
| --- | --- | --- |
| Scroll doors | Container `rf_door`: left, right, push, slide, book, zoom, zoom-out; `rf_door_angle`, `rf_door_shade`, `rf_door_phones` | One full-screen statement that opens onto the next section |
| 3D Build Scene | `build-scene` widget (sample house or an uploaded .glb), stages with captions, pinned while scrolling | Architecture, products, vehicles, "how it is made" |
| Scroll Sequence | `scroll-sequence` (a video or frames played by the scroll) | Product turntables, journeys |
| Timed Slides | `refraction-timed-slides` with many transitions and cards of the next slides | Destinations, tours, collections |
| Phone Showcase | `refraction-phone-showcase`: steps beside a phone that changes screen, floating cards, store buttons | Apps, booking flows |
| Nested Carousel stack | `refraction-nested-carousel`, effect Stack: cards open in place with bars above and below | Itineraries, FAQs, timelines |
| Card stack | Image / Image Box `rf_stack`: fan, deck, carousel, shuffle, with `rf_stack_images`, glow, reflection | Places, products, rooms to browse |
| Marquee | `refraction-marquee`: text, icons or logos, tilt, two rows, speeds up with the scroll | Services, places, client logos |
| Hotspot, Flip Box, Animated Headline, Lottie, Text Path | The widgets of the same names | Explaining a picture, reveals, playful headings |
| Floating gallery | Images with `_position` absolute, `_offset_x/_y` in %, `rf_mouse_track`, `rf_scroll_preset` around a centred heading | A hero that feels alive without video |
| Typographic index | Link rows (container `html_tag` a) with big light headings and a hairline under each | Lists of projects, tours, rooms, services |
| Dashboard | `refraction-chart`, `refraction-data-table`, `refraction-stat-card` with Dynamic Tags | Reports, impact pages, members' areas |

## Element motion and interaction (any widget or container, Advanced tab)

- **Reveal**: `rf_reveal` (fade-up, zoom-in, blur, rise, wipes...), `rf_reveal_text` lines / words / chars with an effect (mask), `rf_reveal_children` one after another, `rf_reveal_trigger` scroll (scrubbed with the scroll).
- **Parallax and scroll effects**: `rf_scroll_preset` far, mid, near, float, drift-left, drift-right, depth, or each effect on its own; `rf_scroll_devices` to keep it off phones.
- **Mouse**: `rf_mouse_track`, `rf_mouse_tilt`; **Magnetic** `rf_magnetic`; **Cursor word** `rf_cursor_label`.
- **Sticky**: `rf_sticky` top with `rf_sticky_parent` for a column that stays while its neighbour scrolls.
- **Two-tone headings**: `rf_dual` with marks (marker, underline, round, block) that draw in, or a gradient fill.
- **Icon animations** (Icon Box): `icons_animation` pulse, float, bounce... on loop, hover or view.

## Content that stays live

- **Dynamic Tags** on texts, numbers, links and images (site statistics, post fields, ACF-like fields).
- **Posts / Loop Grid / Loop Carousel**: the latest posts or any query, with a Loop Item template.
- **Forms**: multi-step forms with choice cards, signatures, payments; **Events**: calendar, lists, tickets.
- **Popups, Off-Canvas, Mega Menu**: triggered layers for offers, menus and details.

## Combinations that surprise

- **Story pages**: `rf_hp` slide + a `rf_reveal_text` heading on each page + a page number prefix `*`: a magazine-like story without a single line of code.
- **Opening act**: a loading screen (counter, split) that reveals a floating gallery hero.
- **Door to detail**: a scroll door (book) with one statement, opening onto a typographic index of the things it promised.
- **App moment**: a phone showcase whose steps use real screenshots, followed by a marquee of what the app does.
- **Live proof**: stat cards fed by Dynamic Tags (site statistics) next to a chart of the same numbers.
