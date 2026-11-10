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

## Feature ideas

- A booking bar that embeds the SafeKab online booker as a native widget (an iframe widget limited to allowed booking domains), so Ask Claude can place it without raw HTML.

Patterns seen in references that Refraction cannot build yet, for the owner to decide.
