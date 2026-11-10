# References

Sites studied for the design study, with patterns noted in our own words and how to build them in Refraction. Inspiration only: nothing here is copied.

## 2026-11-10: taxis, chauffeurs and travel

### Blacklane (blacklane.com)
- A full-bleed photo hero with a short emotional line and the booking bar sitting on its bottom edge. Refraction: a full-width container with background image and gradient overlay, flex_justify_content flex-end, and a white rounded row of three link containers as the bar.
- Photo cards with a small caption panel. Refraction: container with background image, html_tag a.

### Addison Lee (addisonlee.com)
- Dark, confident sections alternating full-bleed photos and a single accent color for labels and buttons. Refraction: ink sections, one accent used only for actions and small labels.

### Bolt (bolt.eu)
- Clean centred headline over a wide photo; services as tall cards with the action inside the card. Refraction: grid of photo cards, rf_reveal_children.

### Lyft (lyft.com)
- Ride options as a strip of small equal cards (icon, name, one-line spec). Refraction: grid_columns_grid 5 (2 on phones) of light cards with an icon widget, heading and text; grid_rows_grid 1.

### VisitScotland (visitscotland.com)
- Section heading on the left with the introduction on the right; destination photos with the title over the image; a big feature banner card. Refraction: a row container with space-between; banner container with min_height and gradient overlay.

### Wheely (wheely.com)
- Stacked full-width rounded image cards with a short centred caption: one idea per screen. Refraction: rounded containers with background images, generous min_height.

## 2026-11-10: product storytelling and studios

### Apple AirPods (apple.com)
- One product, one sentence, then big feature moments with a single short claim each; paired figures ("2x more", "4x more") with a small caption. Refraction: counters in a two-column grid; a full-width section per feature.

### Basement (basement.studio)
- A huge sentence as the hero, a dense logo wall in a hairline grid, project rows with a big image on the left and short text on the right. Refraction: grid of image widgets with borders; image + text rows.

### Cosmos (cosmos.so)
- Small images floating around a centred headline and search: the hero feels alive without a video. Refraction: images with `_position` absolute and % offsets, `rf_mouse_track` and `rf_scroll_preset` (recipe "floating gallery hero").

### Linear (linear.app)
- Product screenshot as the hero; each section has a short title on the left and its explanation on the right; quiet dark palette with one light. Refraction: row container, title 40%, text 60%; image of the real product.

### Locomotive (locomotive.ca)
- A typographic index: project names in a large light serif, one per row with hairlines, the list as the main navigation. Refraction: link rows (recipe "typographic index").

### Stripe (stripe.com)
- A bento of product cards, each with its own UI picture; a full-width coloured band of four big figures. Refraction: grid with spanning tiles; counters on a coloured container.

<!-- Add entries newest first:
## YYYY-MM-DD: field
### Site name (address)
- Pattern: what it does and why it works. Refraction: the widgets and settings.
-->
