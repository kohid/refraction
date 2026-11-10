# Lessons

What went wrong in practice and what changed because of it. Read this before each practice round.

## 2026-11-10: first practice (taxi home page)

- Step icons `fas fa-1`… do not exist in Font Awesome 5 free: the circles were empty. The guide now says to use meaningful icons, or to write the number as a heading.
- A shape divider is white unless `shape_divider_top_color` matches the section above.
- Box shadows and shape dividers were always dropped by the sanitizer (fixed in 0.64.0), and wrong setting names were dropped silently (they are now reported as "settings left out").
- A grid with `grid_rows_grid` 2 stretches all phone tiles to the same height: set `grid_rows_grid_mobile` to 1 fr.
- Placeholders in URL settings (`[App Store link]`) are not valid links: use `#app` anchors and mention the link in the summary.

## 2026-11-10: Inverness Taxis home page (live staging, MCP)

- A container with container_type grid has two rows by default: a one-row grid of cards left a tall empty band under the numbers, the tours and the fleet. Set grid_rows_grid to 1 fr (added to the guide).
- Icon widgets need the full class, "fas fa-phone": "fa-phone" alone is left out.
- The counter's thousand separator is already a comma: thousand_separator_char "," is not an option.
- A gradient overlay at angle 180 that starts transparent leaves white text unreadable over bright parts of a photo: start it at about 0.2 and reach 0.94 by 70%.
- An animated headline's rotating words must fit on the line, or the clip animation shows half a word on a new line.
- Parallax (rf_scroll_preset) on a picture right above a heading can push it over the heading on phones: limit it with rf_scroll_devices desktop and tablet.
- Sites on Refraction before 0.64.0 drop box shadows and shape dividers: check the site's version (get_site) and design without them.
- Validate on a local practice site first (Prompt_Builder::clean with REST_REQUEST defined) to see every left-out setting, because older sites do not report them.

## 2026-11-10: the owner's review of the first taxi redesign

- **The owner wants pages enriched, not cut.** The first redesign kept 4 of 10 tours, shortened every service text, dropped the fleet descriptions, the welcome text, the app section, the About facts and the blog. Version 2 keeps all of it in the business's own words and adds more: 1M+ passengers a year, who the company serves, safety technology, the Fringe partnership, national coverage, an app phone showcase, the latest posts, an FAQ from real facts, both offices with a map. The guide now says "rich, never thin", and the checklist starts with "is every real fact, item and link still there?".
- A rich page passed the old 250-element limit (302 elements), so the end of the page was cut off. Cards now use one image-box or icon-box widget each (218 elements for the whole page), and the limit is now 600.
- The phone showcase built for an earlier request (saved JSON) could be reused as it was, with only the copy and store links changed.
- A gradient overlay that is clear on one side does not work on phones, where the text covers the whole banner: keep the light end at about 0.35 alpha.
- The site's cookie plugin adds a hidden settings panel that is wider than the phone: check that overflow comes from the page itself before you fix anything.

## 2026-11-10: surprises

- Page-level features (pages side by side, loading screen, canvas template) were out of Ask Claude's reach: an answer could only hold elements. Whole-page answers can now carry `page_settings` (0.65.0).
- The card stack vanished on phones inside a column that centres its items: its width is a % of a widget that had shrunk to nothing. Fixed in Refraction (a widget holding a stack spans its column).
- Full-page screenshots do not show what comes after a scroll door: check those sections by scrolling in the browser, not from the full-page picture.
- The loading screen removes itself after the reveal: test for it in the page source, not in the DOM after load.

## Feature ideas

- A typographic index row that shows its picture next to the cursor on hover (Locomotive, Basement): a hover image on link rows.

- A booking bar that embeds the SafeKab online booker as a native widget (an iframe widget limited to allowed booking domains), so Ask Claude can place it without raw HTML.

Patterns seen in references that Refraction cannot build yet, for the owner to decide.
