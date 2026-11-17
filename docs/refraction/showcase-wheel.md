# Showcase Wheel

Widget **Showcase Wheel** (`refraction-showcase-wheel`, module `modules/showcase-wheel`, 0.113.0), in the Pro widgets
category. A product slider after a reference the owner chose (Pinterest pin 847802698619661911, "Landing page |
Carousel design animation") and the owner's sketch. Check: `scripts/check-showcase-wheel.mjs`.

## The reference

A frosted card over a blurred picture of the current product; the title, text and button on the left, the product
(a bowl seen from above) on the right; thumbnails underneath with the current one raised on a rounded pill with its
name and price, and a next arrow. Moving on, the pictures swing along a large wheel: the old one turns out downward,
the new one turns in from above, both rotating, while the text and background cross-fade.

## Slides

- Every slide is a container under the widget, the **main container**: its own Style tab gives it a background
  (Normal and Hover: colour, gradient, video, slideshow), a background overlay and a border, like any container. Inside
  it the **Content** container holds the text. A new widget starts with three slides (soft backgrounds, a heading, a
  text and a button); **Add Slide** gives the new slide its Content container and background the same way.
- In the slide list, each slide has: **Label** (under its thumbnail, and for screen readers), **Badge** (a small tag
  such as a price), **Picture** and its description, **Thumbnail** (empty: the picture), **Content on the** left (picture
  on the right) or right (picture on the left), and **Behind the picture**: nothing, an **arc** (part of a large ring
  off to the side) or a **blob** (four outlines), with its colour.

## Settings

- **Thumbnails**: show them; position left, middle or right; **Shape behind the current one**: none, circle (around its
  picture), rounded rectangle or rectangle (around it and its label); **Labels**: under the current one, under every
  thumbnail, or none; **Arrows**: next only (after the thumbnails), previous and next, or none.
- **Motion**: **Transition**: *Wheel* (the reference), *Slide* or *Fade*; for the wheel, **The new picture comes from**
  above or below; duration and easing; **Turn the picture slowly** (for round pictures); **Play by itself**, each slide
  stays, wait while the pointer is on it.
- **Style**: the box's corners, border and shadow; the picture's width, height at most, distance from the edge and
  shadow; the arc / blob size and the arc's thickness; the thumbnails' size, spacing, distance from the edges, shape
  colour and corners, how far the current one rises, label and badge colours and typography, arrow colours.

## How it works

- Markup: `.rf-sw` (region, `aria-roledescription="carousel"`, focusable) > `.rf-sw__slots` > one `.rf-sw__slot` per
  slide (its container, then `.rf-sw__visual`: the decoration and `.rf-sw__picture`), then `.rf-sw__nav` (thumbnails as
  tabs, arrows). The slide containers go into their own slots in the editor too
  (`get_default_children_container_placeholder_selector()` = `.rf-sw__slot`, placed by `nth-child`).
- The slots share one grid cell and cross-fade (`is-active`, `is-leaving`). The script
  (`assets/js/frontend/handlers/showcase-wheel.js`) animates `.rf-sw__picture` with the Web Animations API: for the
  wheel it rotates about a point far off to the picture's outer side (`transform-origin: 190% 50%`, or `-90% 50%` when
  the picture is on the left), 62 degrees out one way and in from the other; for Slide it translates. Thumbnails,
  arrows, the left and right keys and a swipe move it; reduced motion changes at once.
- Edit Mode: the preview is the same showcase; it does not play by itself, follows the slide picked in the panel, and
  rebuilds when slides come and go. The settings the script reads are `frontend_available` with `render_type: none`.
- On phones (767px and under) the picture sits above the content.
