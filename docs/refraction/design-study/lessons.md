# Lessons

What went wrong in practice and what changed because of it. Read this before each practice round.

## 2026-11-10: first practice (taxi home page)

- Step icons `fas fa-1`… do not exist in Font Awesome 5 free: the circles were empty. The guide now says to use meaningful icons, or to write the number as a heading.
- A shape divider is white unless `shape_divider_top_color` matches the section above.
- Box shadows and shape dividers were always dropped by the sanitizer (fixed in 0.64.0), and wrong setting names were dropped silently (they are now reported as "settings left out").
- A grid with `grid_rows_grid` 2 stretches all phone tiles to the same height: set `grid_rows_grid_mobile` to 1 fr.
- Placeholders in URL settings (`[App Store link]`) are not valid links: use `#app` anchors and mention the link in the summary.

## Feature ideas

Patterns seen in references that Refraction cannot build yet, for the owner to decide.
