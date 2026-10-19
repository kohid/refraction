# Pro widgets, batch 2 (Advanced category)

Eleven more widgets in the **Advanced** category (`refraction-advanced`), always on, in the same module as batch 1
(`modules/pro-widgets/`). All are server-rendered (the editor preview is the same PHP), escape their output, have
responsive controls where layout matters, and use lazy front-end handlers in
`assets/dev/js/frontend/elements-handlers-manager.js`. Styles are `assets/scss/widgets/<name>.scss`.

| Widget | Name | What it does |
|--------|------|--------------|
| Media Carousel | `refraction-media-carousel` | Images and videos on the bundled Swiper. Layout "Carousel" (1-6 per view, responsive, space between, coverflow or fade effect) or "Slideshow with thumbnails". Images open in the site lightbox as one group; video slides (YouTube, Vimeo, video files) show a poster with a play button and open in the lightbox, nothing loads until clicked. Arrows are real buttons, dots, autoplay (off for reduced motion), loop, pause on hover. |
| Testimonial Carousel | `refraction-testimonial-carousel` | Quote, name (optional link), role and photo per item; photo below, above or beside the quote; optional quote mark; 1-6 per view. |
| Reviews | `refraction-reviews` | Review cards with a star rating (0-5 in half steps, clamped; 3/4/5/10 stars), name, date, source label, avatar, optional rating number. Grid (responsive columns) or carousel. All data is typed in; no review service is contacted. Each rating is a `role="img"` with "Rated x out of y". |
| Hotspot | `refraction-hotspot` | An image with markers at percentage positions (separate positions for tablet and mobile). Tooltip trigger click, hover/focus or always visible; markers are buttons, tooltips are `role="tooltip"`; Escape and outside click close; tooltips are kept inside the image; optional pulse (off for reduced motion); optional link per tooltip. |
| Code Highlight | `refraction-code-highlight` | JavaScript, PHP, CSS, HTML, JSON, Bash, Python or plain text, highlighted **on the server** by an own tokenizer (`Classes\Code_Tokenizer`, linear time, no library). Line numbers (CSS counters, not selectable), highlighted lines ("2, 4-6"), file name, language label, copy button with a live-region message, four themes, wrap, tab size, max height. The block is keyboard scrollable. |
| Lottie | `refraction-lottie` | Animation JSON from the Media Library or a URL. The player (lottie-web 5.13.0 light SVG build, MIT, in `assets/lib/lottie/`) and the JSON are loaded only when the widget is within 300px of the viewport. Play as it loads, while in view, on hover (pause, back to start or keep playing), on click (a real toggle button), or tied to the scroll position. Loop, speed, backwards. Reduced motion: shows the first frame (hover/click still work). |
| Video Playlist | `refraction-video-playlist` | Player plus a playlist (right, left or below). YouTube (via youtube-nocookie.com), Vimeo (`dnt=1`) and video files. The page loads nothing from a video site until the visitor presses play or picks an item; thumbnails are only the images you choose. Previous/next, current item marked with `aria-current`, play next automatically (video files: `ended`; YouTube/Vimeo: the players' own postMessage events, no extra script), optional restart after the last item. |
| Gallery | `refraction-gallery` | One or more galleries (each a name plus images). Layouts grid, masonry (CSS columns) and justified rows (flex ratio trick), responsive columns/row height/gap, optional captions from the Media Library (below or on hover), zoom on hover, images `loading="lazy"`. Filter buttons (`aria-pressed`, with a live count) appear when there is more than one gallery; the lightbox walks only through the images that are shown. |
| Facebook Button | `refraction-facebook-button` | Like or Recommend button for the current page or any address (`like.php` iframe: layout, size, share). |
| Facebook Comments | `refraction-facebook-comments` | `comments.php` iframe for the current page or an address, number of comments, height. |
| Facebook Embed | `refraction-facebook-embed` | One public post (`post.php`) or video (`video.php`). |
| Facebook Page | `refraction-facebook-page` | `page.php` iframe: timeline/events/messages tabs, size, small header, cover, faces. |

Facebook widgets print one `iframe` to `https://www.facebook.com/plugins/...` with `loading="lazy"`, a title and a
referrer policy, and only when the address is valid (Page/Embed need a facebook.com or fb.watch address). There is no SDK
script and no pixel. Because the iframe is on the page, the visitor's browser contacts Facebook. This is listed in
`readme.txt` under external services.

Social Icons extras: skipped on purpose. The existing Social Icons widget already has shape, size, columns, alignment,
per-icon colours, custom icons and hover animation.

## Lottie uploads

WordPress does not accept `.json` uploads. The module allows them for users who may upload files, but only when the content
is a Lottie animation (`Classes\Lottie_Json::is_valid`: JSON with `v`, `fr`, `w`, `h` and a `layers` list, at most 5 MB).
Other JSON files are still refused.

## Tests

* `php scripts/test-pro-widgets-2.php` - star maths, code tokenizer (round trip, escaping, linear time), line ranges,
  video URL parsing and privacy-friendly embed URLs, Facebook URL builders, Lottie validation (no WordPress needed).
* `node scripts/check-pro-widgets-2.mjs --site <dir> --port <port>` - Playwright against a real WordPress installed from
  `dist/refraction.zip`: panel search and category, a real drag into a container, control changes re-render the preview,
  front-end HTML, carousel moves (arrows, dots, thumbnails, keyboard), lightbox for images and videos, hotspot tooltips,
  code copy to the real clipboard, Lottie rendering and every trigger, playlist switching and play next, gallery filters
  and lightbox groups, Facebook iframe addresses, reduced motion, mobile, PHP and console errors. YouTube, Vimeo and
  Facebook hosts are answered by an empty stub page, so the run works offline and records exactly what the pages request.
  Needs `ffmpeg` (a 1 second clip is generated).

## Limits and notes

* Play next for YouTube and Vimeo depends on the players' postMessage events; it could only be tested against the
  video-file player here (the stub pages cannot send them). If a provider changes its messages the next item is not
  started automatically; the Next button still works.
* Facebook decides what its plugins show (private pages, region rules, ad blockers, and the Comments plugin may stop being
  served as an iframe). The address is built correctly; the content is Facebook's. Not testable offline.
* Lottie uses the light build: SVG renderer only, no expressions. Animations that need expressions or the canvas renderer
  will not play. With "External URL" the other site must send CORS headers.
* Media Carousel videos play in the lightbox, so "Lightbox: No" turns a video slide into a normal link that opens the
  video address in a new tab.
* The Gallery's masonry order runs down the columns (CSS columns), not across rows. Justified rows need the attachment's
  original size from the Media Library.
* Code Highlight is a compact tokenizer, not a full parser: template strings with nested code, heredocs and regex literals
  are highlighted approximately. The text is always complete and escaped.
* Reviews and Testimonials print no structured data (schema.org), on purpose: the data is typed in by hand.
