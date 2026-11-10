=== Refraction ===
Contributors: kohid
Tags: page builder, drag-and-drop, editor, landing page
Requires at least: 6.8
Tested up to: 6.8
Requires PHP: 7.4
Stable tag: 0.64.2
License: GPLv3
License URI: https://www.gnu.org/licenses/gpl-3.0.html

Refraction is a drag-and-drop page builder for WordPress that runs on your own server. Its only network request is an optional update check against its GitHub releases.

== Description ==

Refraction is a drag-and-drop page builder for WordPress, developed independently. It has no accounts, cloud libraries, telemetry or upsell services. The one thing it contacts on its own is GitHub, to look for new Refraction releases (see External services below).

== Credits ==

Refraction is based on Elementor by Elementor.com (GPL-3.0-or-later). See NOTICE and license.txt for the upstream notices.

Refraction is not affiliated with or endorsed by the authors of that code base.

== External services ==

Refraction makes one external request on its own, to check for plugin updates.

* Service: the GitHub REST API (https://api.github.com/repos/kohid/refraction/releases/latest). Terms: https://docs.github.com/en/site-policy/github-terms/github-terms-of-service. Privacy: https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement.
* What is sent: an unauthenticated GET request. As with any HTTP request, GitHub sees your server's IP address and a User-Agent of the form `Refraction/<version>; <your site URL>`. No other data, no account, no licence key.
* When: when WordPress checks for plugin updates (about every 12 hours). The result is cached in the `refraction_update_release` site transient for 12 hours (1 hour after a failed lookup). Clicking "Check again" on the Dashboard > Updates screen forces a fresh lookup.
* Downloading an update: if a newer release exists and you update from the Plugins screen, WordPress downloads `refraction.zip` from that release on github.com.

To turn the update check off completely, add this to wp-config.php:

`define( 'REFRACTION_DISABLE_UPDATE_CHECK', true );`

To read releases from a different repository (for example your own fork), define `REFRACTION_UPDATE_REPOSITORY` as `owner/repo` or use the `refraction/updater/repository` filter.

Forms contact a service only when you set it up yourself: a Webhook action sends the submission from your server to the URL you enter, and the optional reCAPTCHA, hCaptcha or Cloudflare Turnstile setting (Refraction > Submissions > Settings) loads the provider's script in visitors' browsers and sends the visitor's response token to the provider to verify it. Both are off until you configure them.
Embeds you add yourself. These are not requested unless you place the widget on a page and enter an address; the visitor's browser then contacts the service (its own terms and privacy policy apply). Refraction adds no SDK script or tracking pixel for any of them.

* Facebook widgets (Button, Comments, Embed, Page): a lazy-loaded iframe to https://www.facebook.com/plugins/. Sent: the address you entered and what a browser sends with any request (IP address, cookies Facebook already has). Terms: https://www.facebook.com/terms. Privacy: https://www.facebook.com/privacy/policy.
* Video Playlist and the Media Carousel's video slides: YouTube (the privacy-enhanced youtube-nocookie.com address) or Vimeo (do-not-track mode) are contacted only after a visitor presses play. Video files from your own site make no external request. YouTube terms: https://www.youtube.com/t/terms. Vimeo terms: https://vimeo.com/terms.
* Lottie, when you choose "External URL": the visitor's browser fetches the animation JSON from the address you entered when the animation comes near the screen. Files from your Media Library stay on your site. The Lottie player itself (lottie-web, MIT license) is bundled in the plugin.

Other things you may notice that are not Refraction's own services: the editor loads Google Fonts when you pick a Google font, and some documentation "learn more" links point to third-party websites. They are only requested when you use them.

== Changelog ==

= 0.64.2 =
* Ask Claude keeps every real fact and item when it redesigns a page and adds more (counters, FAQ from real facts, latest posts, app showcase, map), building cards as single Image Box / Icon Box widgets; an answer may now hold up to 600 elements (was 250), so rich pages are no longer cut off.

= 0.64.1 =
* Ask Claude design guide: rules learned from redesigning a real taxi home page (grid rows, legible text over photos, whole-card links, booking first on service pages).

= 0.64.0 =
* Ask Claude designs with more intent: every mode (API key, Claude.ai chat, Claude Code, MCP) now gets a design direction (palette, type scale, 8px spacing rhythm, varied section shapes, motion with restraint, phone rules), the list of Refraction's signature features with their exact settings (text reveals, two-tone headings, marquee bands, parallax, sticky columns, magnetic buttons, scroll doors, shape dividers, animated headlines), five tested section recipes and a review checklist.
* Claude Code mode: a new preview step saves the answer into a hidden draft copy of the page (the page itself is untouched) and takes desktop and phone screenshots, so Claude looks at the page and improves it before sending it; the draft is deleted when the result is sent.
* Ask Claude now tells Claude which settings it left out (unknown names, or values that do not fit), so they get corrected instead of silently missing.
* Fixed: shape dividers set by Ask Claude were always left out.

= 0.63.0 =
* New Dashboard widgets (a new Dashboard category), in a clean admin-dashboard look: white cards with soft shadows, muted labels, dashed table rows and tinted badges.
* Chart: bars, horizontal bars, line, area, pie and donut, from series typed in, a pasted table (CSV) or this site's own numbers (posts, comments or form submissions per month, posts per category, users per role). Drawn on the site without a chart library; tooltip, legend, stacked bars, smooth curves, the total in a donut, number format (prefix, suffix, decimals, 1.2K), drawing in when shown, and the numbers as a table for screen readers.
* Data Table: columns of text, numbers, badges (colored by the word: Paid, Pending, Failed...), progress bars, dates and links, over rows typed in, a pasted table or the latest posts; sorting, search, pages, and on phones scrolling or each row as a card.
* Stat Card: an icon, a label, a big number that counts up, its change as a green or red badge (or the other way when down is good) and a sparkline.
* Every value of the three widgets can come from a Dynamic Tag. New Site Statistic tag: published posts of a type, comments, users (of a role) or form submissions, all time or the last 7, 30 or 365 days.

= 0.62.0 =
* Widget audit: every widget rendered on desktop and phone with each color setting set to its own color, checking for settings that do nothing, widgets that render nothing, sideways scrolling on phones, JavaScript errors and PHP notices (scripts/audit-widgets-editor.mjs and audit-widgets-render.mjs).
* Fix: Phone Showcase pushed the page sideways on phones (the glow behind the device and floating cards near the edge). On phones the cards now stay inside the device and nothing reaches past the sides.
* Fix: Loop Carousel's Dots Color also painted the current dot, so the current slide could no longer be told apart; it now leaves the current dot alone, which has its own color.
* Nested Carousel: arrow hover color and background, icon size, corners, border, shadow and distance from the edge; the current bullet as a pill (its width), space between bullets, distance from the slides, fraction typography and color, progress bar height.
* Loop Carousel: arrow background, hover colors, button and icon size, corners and distance from the edge; current dot color, dot size, current dot width, space between dots and distance from the slides.
* Share Buttons: hover colors for the custom color mode.

= 0.61.1 =
* Fix: Tabs: icons from the Solar and Phosphor libraries (and any icon drawn as inline SVG) were hidden on every tab; they now show, in the tab icon colors (normal, hover, active).
* Fix: Image Box, Icon Box and the other widgets with a tooltip description: the tooltip's Background Color (Style > Tooltip) now applies; the default dark color always won before.

= 0.61.0 =
* Timed Slides: a Transition setting with twelve new ways for the next slide to come in, besides the card growing into the slide: fade, slide in from the side, slide up, zoom in, zoom out, blur, a circle opening from the clicked card, wipe from the side, wipe up, curtain (opening from the middle), diagonal wipe and flip. Going back runs the side and wipe transitions the other way. The slide's shade is kept during the change.

= 0.60.0 =
* Phone Showcase buttons: each button shows text and an icon (before or after, in place of the arrow) with an optional small line above the text, for app store badges ("GET IT ON" over "Google Play" with the Google Play icon), or an image only (for example an official store badge), with the button text as its alt text. Icon size and spacing, small text typography, border width and the first button's border color.

= 0.59.0 =
* Phone Showcase: a Heading (with its HTML tag) and a Description under the text above the steps, with their colors, typography and spacing; and a Second Button beside the first (an outline by default) with its own link, colors and hover colors. The Button style section now covers both buttons and the space between them.

= 0.58.0 =
* Image uploads (Refraction > Settings > Images, on when installed): every uploaded image is turned upright, brought down to a maximum dimension (1600px by default; landscape by width, portrait by height, smaller images keep their size) and saved as WebP at the chosen quality (80% by default); an image uploaded without alt text gets its file name ("inverness-airport-van.jpg" becomes "Inverness airport van"). Works in the Media Library, the editor's Insert Media window, drag and drop and images added from a URL. Animated GIFs and SVGs stay as they are; images already in the library are not changed.

= 0.57.0 =
* Nested Carousel: new Stack effect. One card is open and the cards around it show as bars (their top strip), above and below; on each step the next bar grows into the open card while the open one shrinks into a bar, and a new bar fades in at the far end. Next cards come from above or below, 0 to 3 bars on each side, bar height and width, space between cards, bar opacity and a minimum height that keeps the page still. Click a bar to open it; arrows, dots, fraction or progress, arrow keys, autoplay with its pause button, loop. Heights animate in every browser.

= 0.56.0 =
* Fix: Image Box and Icon Box: a linked title keeps the title's font size, font and color; before, the site's link style (Site Settings > Typography > Link) or the theme's could set the link's own size.
* Fix: in the editor, an image shown before its size had loaded (for example after changing the title or description) could appear narrower than on the page until the next change; the element is now drawn again once its size arrives.
* Image Box and Icon Box: Content Padding (Style > Content), space around the title, description and button.

= 0.55.0 =
* Nav Menu: more hover effects for the menu items (line through, highlighter, dot, corners, brackets, pill, glow, lift) and ways in (grow from the left or right, drop in), with the effect's width (as wide as the text by default, or your own in %, px or em, placed left, center or right), distance, roundness, speed and the text color on a background or pill.
* Nav Menu submenus: their own hover effect, separate from the main items (background, underline, side bar, text slides in, arrow, dot, highlighter), with its color and thickness; the panel's open animation (fade up, fade, slide down, zoom, flip down), its position under the item, distance from it, padding, space and lines between items, item corners and the current page's color. The main items' hover effect no longer applies inside submenus.
* Nav Menu hamburger button: hover animations (grow, shrink, lift, turn, wiggle, pulse, lines shift) and click animations (press, bounce, jelly, ripple, spin), and a hover background.

= 0.54.0 =
* Heading: Dual Heading. Add a highlighted part after the title (and text after it, such as the full stop) in its own color or a gradient, with its own typography, and a mark behind it: a rounded highlighter, a highlighter, an underline or a background, in any color, thickness and height. The mark follows the words when they wrap, and can draw itself when the heading scrolls into view.

= 0.53.0 =
* New Phone Showcase widget: an interactive walk-through of an app. Up to 20 steps (icon, title, description and a screenshot each) beside a phone that shows the current step's screen; click a step, use the arrow keys, or tap inside the phone for the next one, or let it play by itself. A library of 13 devices drawn in code (camera island, notch, camera holes, edge-to-edge, classic with a home button, compact, foldable, clay, outline, tablets) in 9 colors or your own, or your own frame image. Status bar, screen changes (slide, fade, zoom), floating cards (ratings, "Booked!", points) shown always or with a step, a button under the steps, and full styling.

= 0.52.0 =
* Container > Layout > Scrolling Effect: two more. "Zooms through into the next": the camera moves through the container, its titles growing past the viewer while it blurs and fades, and the next one comes into focus. "Falls away into the distance", the reverse: it shrinks away, titles first, and the next comes in from close up, settling into focus.

= 0.51.0 =
* Container > Layout > Scrolling Effect: each top-level container chooses how it leaves the screen as the page scrolls down: opens like a door to the left or to the right (the next one waiting behind it), sinks back as the next slides over it, slides to the left as the next comes in from the right (with layers moving at different speeds), or turns over like a book page. Mix them on one page. Options for how far a door opens, parallax depth, shading and phones. Tall containers scroll through first; scrolling up brings everything back.

= 0.49.0 =
* Page Settings > Pages Side By Side: the page's top-level containers become pages that fill the screen, with no scrolling down. They slide to the left (the things on them moving as layers, with a depth you choose, per element too) or turn like a book's pages. Turned by the wheel, the keys, a swipe, arrows and links to a part of the page, with a large page number (01, with your own mark before it, or 1 / 6), a progress line and an optional return to the first page. Phones held upright show the pages in landscape (turn the phone to read), ask to be turned, or keep one long page.

= 0.48.0 =
* Icons: the Phosphor icon library (MIT), six weights (Regular, Bold, Fill, Duotone, Light, Thin) of 1,512 icons each, in the icon library after the Solar icons. Drawn as inline SVG like Solar; the Duotone weight takes the Duotone controls.
* Icon controls: icons drawn as SVG (Solar, Phosphor) now show in the panel's icon preview (it was empty).
* Icon Box: each icon's Hover tab (main icon in Style > Main Icon, each More Icon in its item) has every setting of the Normal tab: colors, size, padding, border, corners, rotate, a new Scale, opacity, shadow, and a Hover Animation that plays while hovered (or stops the normal one), plus Hover Change Time. Style > Icon > "Each Icon's Hover Starts When": the box is hovered, or the icon itself.

= 0.47.0 =
* New Marquee widget: words, icons or logos that keep running, in one row or two going opposite ways, solid and outlined words, speeding up with the scroll (or turning with its direction), tilted into a ribbon, with faded edges, a turning separator and gray logos that take their color under the pointer. Pauses on hover and keyboard focus; stands still and wraps for reduced motion.
* Site Settings > Motion & Cursor: a site cursor (dot and trailing ring, ring, dot or an inverting disc) that grows over links and buttons and shows a word over chosen elements, and page transitions between the pages of the site (cross-fade, rise in, wipe up, step back).
* Advanced > Interactions on every element: Magnetic (drawn towards the pointer), Cursor Word ("View", "Play", "Drag") and No Site Cursor Here.
* Reveal: new effects Wipe up, Wipe down, Wipe from either side, and Light up from faint (text that fills in word by word as it is read).

= 0.46.0 =
* Text Editor, Icon Box, Image Box, Testimonial, Alert, Call to Action and Author Box: the text can be shown as text, cut to a number of lines, or as a tooltip (Call to Action: cut to lines only). Cut text can have a Show more / Show less toggle under it, a full-width button or a text link with its own words and icon (hidden when the text is short enough not to be cut, usable from the keyboard), and its full text in a tooltip. Text Editor in tooltip mode shows a trigger text and icon to hover. New Style > Show More Toggle section; Style > Tooltip for every one of them.

= 0.45.0 =
* Icon Box: every icon has its own style settings. Each More Icon (Content > More Icons, open the item) and the main icon (new Style > Main Icon) have icon, duotone, background and border colors for normal and while the box is hovered, size, padding, border width, border radius, rotate, opacity, box shadow, and their own animation with its duration and delay. Settings left empty follow Style > Icon, which still styles every icon. The arranged-freely position of the main icon moved to Style > Main Icon.

= 0.44.0 =
* Icon Box and Image Box: the title has no margin of its own any more, so a theme's heading margin no longer shows (Title Spacing and Margin still add space when set).
* Icon Box: Icon Layout "Arrange freely": the main icon and More Icons share one area (width and height in Style > Icon) and each is placed across and down it, turned and layered, with its own size and color, to build one picture from several icons.
* Image Box and Icon Box: a Button under the text (text, link, icon before or after, filled, outline or text link; Style > Button with typography, colors for normal and hover, padding, radius, border, space above). The description can be shown as text, cut to a number of lines (with its full text in a tooltip if wanted) or as a tooltip of the box (above or under it; Style > Tooltip).

= 0.43.0 =
* Nav Menu: the collapsed menu panel no longer scrolls sideways (long items wrap; the full width dropdown fits the page without its scrollbar). New: the site logo, site name, an image or your own text at the top of the panel, linked to the home page, and buttons under the menu items (filled or outline, with icons, typography, colors, padding, radius and layout).
* Icon Box and Image Box: a Margin control for the title, to remove the margin a theme gives headings.
* Icon Box: More Icons, shown next to the main icon, each with its own link, color, background, duotone color and size; space between icons; Icon Animation (pulse, float, bounce, spin, swing, shake, heartbeat, fade in, zoom in) played all the time, while hovered or once when it comes into view, with its duration and a delay between icons.

= 0.42.1 =
* Editor Preferences > Panel > Position: the panel floats over the page (full width view, the default) or sits beside it, so the page's left side can be clicked without sliding the panel away.
* Checked every feature (all PHP tests and browser checks pass); the roadmap's statuses brought up to date.

= 0.42.0 =
* New: Solar icons (480 Design, CC BY 4.0) in the icon library: 8,859 icons in six styles (Bold Duotone, Line Duotone, Bold, Linear, Outline, Broken), drawn as inline SVG. Font Awesome is no longer offered in the icon library (Settings > Advanced can show it again); the Font Awesome icons already on your pages keep working.
* New: Duotone. The Icon, Icon Box, Icon List, Button and Social Icons widgets have a second color and a second layer opacity for Solar's duotone icons.

= 0.41.0 =
* Editor: with Site Settings open, clicking anything on the page goes back to editing it (asking whether to save Site Settings changes first).
* Nav Menu: submenu icon from the icon library or the built-in ones, with its size, colors (normal, hover, open), button background, padding, radius, border, space from the text and turn when open. Hamburger: six animations (X, spin, arrow left or right, lines collapsing, none), your own open and close icons, line thickness and speed. Collapsed menu panel: dropdown (full screen width by default, or the widget's width), slide in from the right or left, or full screen, with an open and close animation (fade, slide down or up, zoom, from the side) and its duration, panel width, backdrop color, a close button, item alignment and a line between items.

= 0.40.0 =
* Site Settings > Buttons now styles the Button widget only (not menu toggles, sub menu arrows and other buttons), and Site Settings > Images the Image widget only.
* Site Settings > Typography: new "Use as the default" switch. On, widgets' headings, text and links follow Typography instead of the Global Fonts (a widget given its own font keeps it).
* The editor's panel floats over the preview, like the Ask Claude panel, so pages, forms and events are shown at the full width of the window (the arrow on its edge slides it away).

= 0.39.0 =
* New: eight views in the editor (pages, Theme Builder templates, forms and events): Desktop, 1024, 820, 768, 480, 430, 393 and 375px, in the top bar and in every responsive setting of every widget, each opening the preview at its own width and showing its width next to its icon. The phone views (480, 430, 393, 375px) are new devices; 1024 is Tablet, 820 Mobile Landscape and 768 Mobile. Settings flow down: a phone view shows the 768px settings until it is given its own. Existing sites get the new views once (they can be turned off in Site Settings > Layout > Breakpoints).
* Change: the Mobile breakpoint is 768px by default (was 767px), Mobile Landscape 820px (was 880px).
* Motion effects, sticky and reveal device lists chosen before keep their meaning on the new views ("Mobile" includes the phones, "Tablet" the 820px view).

= 0.38.1 =
* Just Refraction theme 1.1.0: the theme always uses the site's global fonts (Site Settings > Global Fonts) on every page, Refraction pages included: Text for text, Primary for headings and the site title, Secondary for post details and the footer, Accent for the menu and buttons. Site Settings > Typography and widgets' own fonts still win.

= 0.38.0 =
* New: move a site from Elementor. "Convert to Refraction" under each page built with Elementor (and as a bulk action) converts it in place: content, layout, styles, dynamic tags, popup links and template shortcodes come along, Elementor Pro widgets become their Refraction versions, and widgets from add-ons Refraction has no version of are kept as HTML showing what they showed. The first conversion also moves the global colors, fonts and layout settings and every template (headers, footers, single and archive templates, popups with their conditions and triggers, sections). "Back to Elementor" undoes a page while Elementor is installed. Refraction > Move from Elementor converts everything at once and says when Elementor can be removed.
* New: Template widget and [refraction-template id="..."] shortcode, showing a saved template.
* Fix: on block themes, the "Full width" page template (header and footer) now shows the Theme Builder header and footer.

= 0.37.1 =
* Fix: an event (or any page) whose Single template has no Post Content widget could not be opened in the editor ("the content area was not found"). The editor now shows the page's own content there; the site still uses the template.

= 0.37.0 =
* Events: Pay without a payment link. When an event has a total amount but no payment link, the Pay button opens a form with the total amount, the payment instructions and a QR code (new in the event form's Pay button and the event's page settings), where people send their payment's reference number. These payments are listed under Refraction > Events > Bookings as "To check" until marked paid.
* Events: events made by an event form before 0.36 (or with the form's own fields) fill their total amount, payment link and gallery from the form's answers.
* Event Gallery: falls back to the event's featured image when it has no gallery.
* Event widgets: editor hints now say what the event is missing and where to set it.

= 0.36.0 =
* Events: Book now (pay in cash). Event forms and events can offer a booking form on the event page that keeps to the ticket limit and tickets per person. Bookings are emailed, listed under Refraction > Events > Bookings and can be marked as paid.
* Events: the Pay button pays the total amount: it shows it, and {amount} in the payment link is replaced by it.
* Event Gallery: new "Main picture with thumbnails" layout.
* Events: dates read "November 5, 2026"; new Event Detail tags for the start and end date and time; date answers of event forms are written out.
* Fixed: Event Gallery, Event Button and Event Details showed only a hint in the editor; they now show an event while you design pages and event templates.

= 0.35.0 =
* Events: each event type has its own address: /workshops/ lists its events and /workshops/event-name/ is one of them (set under Events in the form's page settings).
* Events: "Design the event page" and "Design the archive" (Refraction > Event types) make Theme Builder Single and Archive templates for a type, ready to edit with Refraction.
* New Event dynamic tags: Event Detail, Event Link (tickets, payment, map, add to calendar), Event Form Field (any answer of the event form, also your own fields), Event Gallery and Event Start.
* New Event Button (payment, tickets, map, calendar) and Event Gallery widgets, and an Image gallery field for event forms.
* Theme Builder on block themes: the header and footer are rendered before the page head, so the Navigation block's scripts load.

= 0.34.0 =
* Events: event types. Design an event form in the editor with the new Event Form fields (event name, start and end date and time, all day, category, venue, address, price, ticket limit, tickets per person, total amount, organizer, image, description, and an Event button for a ticket link, a payment link or submitting). Each form is one type of event; staff use it (on any page with Form Canvas) to make events of that type, with their picture, details and a page in the type's design. Refraction > Event types lists them.
* Event forms can be for staff only, anyone logged in or anyone, and make events that are published, waiting for review or drafts.
* Event Calendar and Events List can show only some types of event. Event Details shows the ticket limit, tickets per person, total amount and a payment button.

= 0.33.0 =
* New Events (Refraction > Events): each event is a page you build in the editor, with its date and time, venue, price, tickets and organizer in the page settings (Event details); Event Categories with their own colors; schema.org Event data on each event's page.
* New Event Calendar widget: Month, List and Day views, search, previous / next / today, a month picker, events in their category colors, events over several days joined across them, "+ N more" on busy days, and a preview card with View event and Add to calendar (Google, iCalendar, Outlook).
* New Events List and Event Details widgets.
* Page template "Refraction Full Width" now works with block themes (such as Twenty Twenty-Five): it prints the theme's header and footer template parts instead of the missing header.php and footer.php (which logged a deprecation notice and left the page without the theme's header).

= 0.32.0 =
* Form Builder: new Form Canvas widget (Form Builder category, on any page) shows a form made in Refraction > Builder in a box you style: title and text, width, alignment, padding, background, border, corners, shadow, and the form's colors on that page.
* Shortcode widget: new "Form Builder form" option under the shortcode shows a chosen form below it, without typing the shortcode.
* Form Builder: a Form page opened on its own address (View) is now a real form that sends; before, its Submit button did nothing there.
* Form Builder: forms on pages kept by a page cache (LiteSpeed and the like) fetch a fresh security token when the page is old, so they no longer fail with "This page expired"; the form script also starts when an optimisation plugin loads it late.

= 0.31.0 =
* New Timed Slides widget (Advanced): the Timed cards slider where every slide is a container you drop any widgets into. Each slide has its own background image or YouTube video (thumbnail used when there is no image) and card. Content Position (horizontal, vertical, text alignment, width, spacing) and the Cards (position, width, shape, corners, gaps) are separate, responsive settings, with styles for cards, arrows, progress line and number.
* Slides, Timed cards: the slider engine is shared with Timed Slides; cards relayout when their size changes, and the arrow keys no longer move the slider while typing in a field.

= 0.30.1 =
* Slides: the slider no longer shrinks to nothing when it sits alone in a container laid out as a row (the Timed cards layout disappeared on the site).
* Slides, Timed cards: new Card shape (3/4, 4/5, 1/1, 2/3, 4/3, 16/9) and Card corners controls for the waiting cards, video thumbnails included; the growing card keeps the same corners.

= 0.30.0 =
* 3D Build Scene: animations other than Build in stages hide the stage captions and progress line unless "Show the stages on the site" is on; the first view button is named after the animation.
* 3D Build Scene: the wheel parts and the animation name are detected from the uploaded .glb (by itself, or with the new button), and characters get a visitor button per animation.
* Slides: a slide with a YouTube video and no image shows the video's thumbnail, on the slide and on its card.

= 0.29.0 =
* New: Slides can show a YouTube video per slide (muted background video, image until it plays, optional sound button); the slide moves on when its video ends. Slides also take a second button.
* New: 3D Build Scene animations besides building: Turntable, Drive in (a car rolls in with its wheels turning), the model's own animation (characters: by name, looping or with the scroll) and Float; plus Grab to rotate at any time and Follow the cursor (the model, or a character's head).

= 0.28.0 =
* New: Card stack for the Image and Image Box widgets: up to five images as a fan, a deck whose top card flies off, a carousel with cards at the sides, or a shuffling pile with glow and reflection; hovering a card behind brings it forward.
* New: Slides widget layout "Timed cards": the next slides wait as cards, and the next one grows from its card into the slide, with a timer line, progress line and a large counter.

= 0.27.0 =
* New: Loading screen (Page Settings > Loading screen): covers the page while it loads with your logo and a progress line, a spinning ring or a large percentage, then fades, slides up or splits open. It never blocks the page: it shows only with JavaScript and is lifted after a time limit.

= 0.26.2 =
* Fix: the private preview link of MCP drafts redirected to the home page on sites with pretty permalinks.

= 0.26.1 =
* Fix: Ask Claude dropped the item titles of accordions, tabs and other nested widgets; they are kept now.

= 0.26.0 =
* New: Refraction is an MCP server. Claude Code (on your Claude plan) can read your widgets, pages and media, build draft pages with a private preview link, compare them with a reference in a browser and refine them, then offer the result to a page through the Ask Claude panel.
* Fix: Ask Claude kept media settings only for images; a .glb model in the 3D Build Scene and videos are now kept too.

= 0.25.1 =
* Fix: Ask Claude kept no tablet or mobile settings (padding_mobile, font sizes...), so generated pages did not adapt to phones; the editor's responsive copies are now accepted and checked like their control.
* Ask Claude: when the API key's account has no credit, the message says a Claude plan does not pay for API calls and offers one-click switches to Claude Code or the Claude.ai chat, keeping the description.

= 0.25.0 =
* New: Ask Claude can be built by Claude Code on your Claude Pro or Max plan, with no API key or credit. Choose "Claude Code" in the panel and send the request; a Claude Code session watching the site builds it, and you insert the result. The site never calls Claude.
* The API key option now says plainly that it is billed per use to the key, not covered by a Claude plan.

= 0.24.1 =
* Fix: System Info no longer warns about a PHP memory limit of -1, which means unlimited; it now shows "-1 (unlimited)".

= 0.24.0 =
* New: Ask Claude can use your Claude.ai Pro or Max plan instead of API credit. Pick "Claude.ai chat" in the panel, copy the prompt into a chat, and paste Claude's answer back; it is checked and inserted like any other result, and the site calls nobody.
* Fix: the Ask Claude description box and messages were dark gray on gray (unreadable) in the light interface themes.

= 0.23.2 =
* Fix: Ask Claude shows a plain message when the Anthropic account has no credit left (with where to add it), and Anthropic's own one-line message for other errors, instead of the raw response.

= 0.23.1 =
* Fix: the Ask Claude panel follows the Refraction interface theme (Daylight, Graphite, Ember, Blueprint, Contrast, or the editor's own light/dark mode).
* Fix: Ask Claude descriptions can be up to 60,000 characters (they were cut at 4,000), with a live character count and a taller, resizable box.

= 0.23.0 =
* New: smooth page scrolling in Page Settings > Scrolling: one section per scroll (with section dots; tall scroll scenes scroll through first), smooth eased scrolling, or snap to sections. Site only, off for reduced motion.
* New: 3D Build Scene "Fill stages from the model" reads an uploaded .glb and makes one stage per named group (or per material), bottom to top.
* New: 3D Build Scene stage names are clickable: in Build they scroll to that stage, in Parts and Aerial they pick that stage's parts out.
* New: Scroll Sequence gallery mode: images zoom in or out and turn as you scroll, fading into the next.

= 0.22.0 =
* New: Just Refraction, a plain companion theme, released as just-refraction.zip next to the plugin. It adds no design of its own and never styles pages built with Refraction; Refraction's Theme Builder header, footer and templates are printed by the theme in the right place. Pages not built with Refraction get an optional minimal reading style, and the theme's own simple header and footer can be switched off in the Customizer.

= 0.21.0 =
* New: view buttons on the 3D Build Scene for visitors: Build, Parts (the finished model spread out), Aerial (seen from above), Auto-rotate, and Day / Dusk light. In Parts and Aerial visitors drag to turn the model in any direction. Each button can be turned off, placed in any corner and styled; the model can also rotate on its own once built.
* New: 3D Build Scene width and alignment, and colors and typography for the stage names under the progress line.

= 0.20.0 =
* New: Reveal, in the Advanced tab of every widget and container. Headings and text can come in line by line, word by word or letter by letter, sliding up from behind their line; cards and columns inside a container can come in one after another; any element can fade, slide, zoom, sharpen or rise into view. Play it once, every time it comes into view, or with the scroll so it runs backwards when scrolling up. Respects reduced motion, keeps text readable for screen readers, and never leaves content hidden if the script cannot run.
* New: parallax presets in Scrolling Effects (far, middle and near layers, float, drift, come closer) to make the pieces of an illustration move at different speeds.

= 0.19.0 =
* New: Ask Claude in the editor. Describe a page, a section or a change to the selected element (and attach reference images from your library), and Claude builds it with Refraction's own widgets as ordinary, editable elements; one Undo takes it back. It uses your site's colors and fonts, writes placeholders instead of inventing facts about your business, and everything it returns is checked before it reaches the page (only real widgets and settings, library images, no raw HTML or scripts). Uses your own Anthropic API key, stored encrypted; your site calls Claude only when someone presses Generate. Anyone who can edit pages may use it; administrators manage the key. Needs PHP 8.1 or newer; the rest of Refraction still runs on PHP 7.4.

= 0.18.0 =
* New: Scroll Sequence widget (Advanced). Play a video or a numbered image sequence with the scroll, forward and backward, while the section stays pinned: a camera move through a room, a product turning, a drone shot. Add text that shows between two points of the scroll, with a shade behind it so it stays readable. Frames load progressively and play by file name; videos are scrubbed from memory. Reduced motion shows a still picture and all the text.

= 0.17.0 =
* New: 3D Build Scene widget (Advanced). Show a 3D model whose parts fly in stage by stage while visitors scroll: the scene stays pinned while it builds, captions and a progress line follow the stages, and the finished model can be turned by dragging. Use the built-in sample house or upload your own .glb model; group its parts into stages by name (roof*, glass*), choose where parts come from, the camera angles, the light and shadows. A preview slider shows any point of the build in the editor. Respects reduced motion, falls back to a still image without 3D, and can show the still image on phones. Everything runs from your site: nothing is loaded from elsewhere.

= 0.16.0 =
* New: Choice cards for forms built in the page editor. Each card is a container: drop in a heading, image, badge, price, Icon List, Accordion or anything else. Set each card's name, price and period (what is saved with the record), its width and where its pick control sits; visitors click anywhere on a card to pick it, one or several. Fields inside a card are shown but locked.
* New: Badge and Price widgets in the Form Builder category. Inside a card the Price shows the card's price, elsewhere its own amount, in the form's currency.
* Change: the Builder's own drag and drop designer is gone. "New form" and "Edit form" open the page editor; each collection's records screen shows its shortcodes and the delete option.

= 0.15.0 =
* New: Steps, Group and Repeater for forms built in the page editor. Steps splits the form into pages: add steps in the panel and drop each step's fields into its box; visitors see one step at a time with Back / Next and the progress from the form settings. Group keeps fields together under one answer (an address). Repeater lets visitors add and remove rows (guests, items) with a minimum, a maximum and its own button text. Each has its own Style tab (box, title, rows and buttons).
* New: conditional visibility in every field's Advanced tab: show or hide a field, group or repeater when all or any rules on other fields match. A hidden field is not required and not saved (checked on the server too).
* New: File upload and Signature widgets, with allowed file types, size and count, and the pad height.
* Fix: a form built in the page editor is always printed live, never from the page cache, so every visitor sees their own answers and errors.

= 0.14.0 =
* New: build forms in the page editor. Refraction > Builder > "New form in the page editor" opens a Form page in the editor, with a Form Builder widget category on top of the panel: Text, Long text, Name, Email, Phone, Website, Number, Amount, Country, Date, Time, Date and time, Dropdown, Choice, Choices, Yes / No, Rating, Hidden field and a Submit button. Each field has the editor's Content, Style and Advanced tabs (Advanced adds a Records table section: field key, table column, public, filter), with responsive controls. Lay the form out with the editor's own Container, Grid, Heading, Image, Text Editor, Icon List and the rest.
* New: the page-settings cog of a Form page holds the whole form: names, statuses, the message after sending, submit and step texts, redirect, notifications, webhook, opening and closing, spam protection, currency, and the form's colors and sizes.
* New: saving a Form page saves it as a collection, so records, statuses, exports, notifications and [refraction_form] work as before. Field keys are given once and kept, so renaming a field never breaks saved answers. The Builder's "Edit form" opens these forms in the editor. Groups, repeaters, steps, conditions, uploads and choice cards come in the next stages; forms made in the Builder's own designer keep working there.

= 0.13.0 =
* New: build your own Choice card. A card can now be a free container: it has a pick control and whatever blocks you drop in (heading, text, badge, price, image, Icon List, Columns, an Accordion for "What's included", any field). Nothing is fixed: no title, price or details unless you add them. Existing cards keep their old header and can be switched to a free container at any time (their title, badge and price become blocks).
* New: the pick control is yours to place and style: left, right, a top corner or hidden (the whole card is clickable), as a radio circle (a square when several can be picked), a tick badge that shows once picked, or none. Set it for the whole set or per card.
* New: Badge and Price blocks. A Price block shows the card's price (or its own amount) in your currency with the period, and shows nothing when there is none. A Heading can show the card's name.
* Fix: a Choice card's Style tab now styles the card itself (box, hover, selected look, pick control) and no longer edits the Group style. A card has its own Selected state.
* Fix: Accordion and Tabs are drawn in the designer with their real header and tab classes, so their style shows while you edit (it already worked on the page).

= 0.12.0 =
* New: free layout. Fields now take any width from 10% to 100% (1/2, 1/3, 1/4, 1/5, 2/3, 3/4, 20%, 30%...), and widths that add up to a full row sit side by side. A new Columns block splits a row into columns with ready-made splits (50/50, 33/33/33, 10/90, 20/80, 30/70, 25/50/25 and more) or your own widths, with a gap you choose. Any field, group, repeater or content block can go in a column, and Columns can nest. On a phone everything stacks.
* New: choice cards take any content. Drop any field or content block (heading, paragraph, image, Icon List, HTML, Columns) anywhere inside a card. The set has cards per row and a gap; each card has its own width, so 3 cards on top and 4 below, or one full-width card, are all possible. A card can show its content always, or behind "What's included".
* New: Icon List block. Add items with an icon each (from a bundled set), text and an optional link; vertical or side by side. Style the list gap, icon color, size and background, and the text color, size and weight, with hover looks.
* Fix: the Image style did not do what it said. Alignment in the Style tab now really aligns the picture (left, center, right), with its own width, fit, height, border, radius, shadow and hover shadow; the text options that never applied to a picture are gone.

= 0.11.0 =
* New: Accordion and Tabs fields. Add panels (or tabs), then drag any field into a panel, including groups, repeaters and choice cards. A panel only arranges its fields: their answers are saved exactly as if they sat at the top of the form. Panels can have visibility rules (a hidden panel hides and skips every field inside it), an accordion can keep one or several panels open, tabs come as underline or pills and work with the arrow keys, and a closed panel or inactive tab opens by itself when it holds the field that needs attention.
* New: Choice cards. A Choice cards field holds Group or Repeater cards. Each card has a title, badge, short text, price with a period and a "What's included" details area; visitors pick one card (or several if you allow it). The fields inside a card are shown but locked: they can not be edited, and the server ignores them. The record stores the picked card with its title and price taken from the form, never from the post.
* New: Amount fields type like money. 1200 becomes 1,200 and 350329.45 becomes 350,329.45 as you type, with the currency symbol and an optional period (per hour, day, week, month, quarter, year, or your own text) beside the box. The General tab has a Currency card: symbol, position, thousands and decimal separators and decimal places, used by every Amount field, the records table, the public list and the cards. Saved values stay plain numbers, so sorting and exports keep working.

= 0.10.0 =
* New: field styles are shared by field type. Style one Repeater and every Repeater follows; the same for every other type. Choose "Only this field" in a field's Style tab to give one field its own look, which wins over the shared one. There is a reset for the shared style of a type.
* New: every styled part has Normal, Hover and Focus (Selected for choices, On for switches, Active for repeaters and groups) tabs: field box, label, input, choice buttons, plain choices, switch track and knob. The selected field previews the state you are editing.
* New: repeaters and groups can be styled part by part: the repeater box (.rfb-repeater), each row (.rfb-rep-row), the space between rows, the add-row and remove-row buttons, and the group box (.rfb-group), each with margin, padding, background, border, radius and shadow where it makes sense.

= 0.9.1 =
* Fix: field styles set in the Builder designer were not saved (and so never reached the form). Existing fields could not keep a style; they can now.
* Tweak: fields on the designer canvas no longer grow a full-width bar when you hover or select them. A thin outline marks the field and a small toolbar floats over its top-right edge (type, duplicate, delete, and move up / down when selected); Conditional and Required tags float over the top edge. Nothing shifts, and only the field under the pointer reacts, not the repeater or group around it.

= 0.9.0 =
* Fix: a field with conditional visibility stayed disabled when its rule stopped and then started matching again (change the choice, go back, and the field could not be edited). It now comes back enabled and keeps what was typed, on the public form and in the admin.
* New: every field has a Style tab (next to Settings) with margin, padding, background color, border style, width and color, border radius, box shadow, alignment, label / input / description typography, hover and focus looks, and a button look for choices (Yes / No style, with their own selected color). The groups shown depend on the field type (a divider has a line, an image has a radius and shadow). The designer previews hover and focus on the form.

= 0.8.0 =
* New: the Builder designer fills the screen, so a long form can be built without scrolling the page; the field list, the form and the settings each scroll on their own.
* New: the field list is grouped (Layout, Content, Basic fields, Choices, Advanced) into icon tiles that fold away.
* New fields: Name (choose prefix, first, middle and last name), Country (full list, optional pre-selected country), Image (pick from the media library, size, width, alignment, alt text and link) and Signature (draw with a mouse, finger or pen, saved as a private image).
* New: Step, Group and Repeater titles can be shown or hidden on the form and written as div, p or h2 to h6; every field and block can have a description under its label.
* Tweak: the step progress display uses numbered circles with the current step in bold.

= 0.7.1 =
* Tweak: in the Builder designer, the Style, Advanced and General tabs now sit in the right-hand settings panel next to the field settings, and the form stays visible while you change them.
* Tweak: the field list (left) and the settings panel (right) can each be folded away to give the form more room; the choice is remembered in the browser.

= 0.7.0 =
* New: drag and drop form designer in Builder. Drag fields from the list onto the form, reorder them, drop them into groups and repeaters, or use the buttons on each field; a settings panel changes the selected field.
* New: Multi Step (Step fields with a numbered or bar progress display and Back / Next), Repeater (rows people can add and remove), Group (fields kept together), File Upload (private, type and size checked, downloaded by administrators only), Hidden Field (fixed value, URL parameter, page address, user or date), Heading, Paragraph, Custom HTML and Divider.
* New: conditional visibility on any field (show or hide when all or any of several rules match; hidden fields are never required or saved).
* New: Style editor (colors, fonts, sizes, spacing, label position, shadow, button size and position, custom CSS) with a live preview, and an Advanced tab (redirect after submit, email notification, webhook, login required, opening and closing dates, submission limit, spam protection settings).
* New: Applications starting point showing a multi-step form with conditions, a group, a repeater and an upload.

= 0.6.0 =
* New: Builder (Refraction > Builder). Design your own collections of records, such as Bookings, Listings and Transactions, from a ready-made starting point or from scratch: 15 field types (text, long text, number, amount, email, phone, link, date, time, date and time, dropdown, single and multiple choice, yes/no switch, rating), required fields, help text, defaults, number limits and your own statuses with colors.
* New: a records table with status tabs and counts, search, dropdown filters, sortable columns, pagination, bulk status change, bulk delete and CSV export, plus add and edit forms with validation. The look follows the Metronic admin layout (cards, solid inputs, soft badges, initials), written from scratch.
* New: shortcodes `[refraction_form collection="..."]` for a public submission form (honeypot, minimum fill time, hourly limit per visitor) and `[refraction_records collection="..."]` for a public list as cards or a table, showing only published statuses and the fields you mark "Show publicly".

= 0.5.0 =
* New: WooCommerce builder (loads only when WooCommerce is active). Theme Builder templates for Single Product, Product Archive, Cart, Checkout, My Account and Purchase Summary, with product conditions (ID, category, tag, type, on sale, in stock, shop, cart, checkout, account pages) and Preview Settings with a sample product, category or order.
* New: 23 WooCommerce widgets: Products, Product Categories, Product Title, Images, Price, Rating, Stock, Meta, Short Description, Content, Data Tabs, Additional Information, Upsells, Related Products, Add to Cart, Menu Cart, Cart, Checkout, My Account, Purchase Summary, Order Tracking, Notices and Breadcrumbs.

= 0.4.0 =
* New: Theme tab in Settings (Automatic, Daylight, Graphite, Ember, Blueprint, Contrast). The choice applies to your account and re-skins Refraction's admin screens and the editor panel, top bar, navigator, library and finder; your site and the page preview are never changed. Automatic keeps today's look. Admins can set a default theme for people who have not chosen.

* New: Popups. A Popup template type (Refraction > Theme Builder > Popups) designed in the normal editor on a popup canvas with overlay, box and close button. Settings for width, height, position, overlay colour, opacity and blur, border, shadow, padding, close button, entrance and exit animation, Escape, overlay click, scroll lock and auto close.
* New: popup triggers: page load with delay, scroll (percentage or element), scroll back up, click on any element, exit intent (mouse, and back button or fast scroll up on touch screens), inactivity, after N page views, links made with the Popup dynamic tag, the refraction:popup:open event and window.refractionPopup.
* New: popup rules: only once, every N visits, once per session or per day, do not show again after a form or a marked button, logged in, logged out and roles, devices, referrer, URL parameter, schedule and priority queue, plus the Theme Builder display conditions.
* New: Forms actions Open popup and Close popup. Popup content loads on first open; popups are accessible dialogs with a focus trap and focus return, and skip animations for reduced motion.
* New: Custom CSS for every element (Advanced tab, with a `selector` keyword and live preview), every page (Page Settings) and the whole site (Site Settings). Risky constructs (`</style>`, `@import`, `expression()`, `javascript:` URLs, `behavior`, `-moz-binding`) are removed.
* New: Refraction > Custom Code: HTML, JavaScript and CSS snippets in the head, after the opening body tag or in the footer, with Theme Builder display conditions, priority, an Active switch and a code editor with syntax hints. Administrators only; `REFRACTION_DISABLE_CUSTOM_CODE` and `?refraction-disable-code=1` switch snippets off.
* New: Display Conditions on every element (logged in, role, user, post type, page, term, author, date range, time of day, day of week, URL parameter, cookie, referrer, device, browser language) with AND/OR. Hidden elements are not in the HTML. The editor shows a badge and a "Show elements with conditions" switch.
* New: Custom Attributes on every element (`key|value` lines, event handlers and `javascript:` links removed).
* New: Motion Effects on every container, section, column and widget (Advanced tab): scrolling effects (vertical and horizontal scroll, transparency, blur, rotate, scale with direction, speed, viewport range, per-device switch, relative to viewport or page) and mouse effects (mouse track, 3D tilt). Off for visitors who prefer reduced motion.
* New: Sticky (top or bottom) with offset, Sticky On devices, stay in column, effects offset and shrink / transparent-to-solid styles; works with Theme Builder headers and the admin bar.
* New: Custom Fonts (Refraction > Custom Fonts): upload woff2, woff, ttf or otf fonts with weights and styles, font-display and preload; they appear under "Custom Fonts" in every typography font list.
* New: Custom Icons (Refraction > Custom Icons): upload a ZIP of SVG icons or an IcoMoon or Fontello icon font; each set is a tab in the icon picker.
* New: Off-Canvas widget: a panel holding any widgets that slides in from the left, right, top or bottom, opens centered, or pushes the page aside. Opens from a built-in button, any element (CSS selector) or a #refraction-offcanvas:ID link; closes with its button, the overlay or Escape; focus is trapped and returned, page scroll is locked.
* New: Mega Menu widget: menu items that are links or open a dropdown made of a container with any widgets. Horizontal or vertical, menu-width, full-width or custom-width dropdowns, open on hover (with delays) or click, full keyboard support, and a mobile layout (stacked list or slide-in panel) from the breakpoint you choose.
* New: Nested Carousel widget: slides are containers with any widgets. Slides per view per device, spacing, slide or fade, vertical, autoplay with pause button, loop, arrows, bullets, fraction or progress, keyboard and screen reader support; works inside tabs, dropdowns and panels.


= 0.3.0 =
* New: Theme Builder templates for Single (posts, pages, custom post types), Archive (category, tag, custom taxonomy, author, date, posts page, post type archives), Search Results and Error 404. Each shows between your header and footer, on classic and block themes; when nothing matches your theme renders normally.
* New: Preview Settings in the template settings: design a Single, Archive, Search Results, 404, Header or Footer template against a real post, page, custom post type item, term, author, month, search word or the 404 page.
* New: Theme Elements widgets: Site Logo, Site Title, Site Tagline, Page Title, Post Title, Post Content, Post Excerpt, Featured Image, Post Info, Author Box, Post Comments, Post Navigation, Breadcrumbs, Archive Title, Sitemap and Search Form.
* Tweak: Refraction > Theme Builder has tabs for Single, Archive, Search Results and Error 404.
* Tweak: header and footer templates are previewed against a real page in the editor instead of a blank canvas.
* New: dynamic content. The database icon on text, link, image, gallery, number, color and date controls now offers tags: post (title, excerpt, content, dates, featured image, URL, ID, terms, comments, custom fields), author (name, bio, avatar, meta, URL), site (title, tagline, URL, logo, date, request parameter, shortcode, page title, visitor), archive, contact links (email, phone, SMS, WhatsApp, Skype), internal URL, lightbox and a popup link placeholder. With Advanced Custom Fields active, ACF text, number, URL, image, gallery, color and date tags appear too. Every tag has Before, After and Fallback.
* New: Loop Builder. Loop Item template type (Refraction > Theme Builder > Loop Items) and the widgets Posts, Archive Posts, Portfolio, Loop Grid, Loop Carousel and Taxonomy Filter, with a reusable Query control (post type, manual selection, related posts, terms, authors, exclude, order, offset, avoid duplicates), numbered / previous-next / load more / infinite pagination and ajax filtering. Only published posts without a password are ever listed.
* New: Forms. A Form widget with text, email, textarea, URL, tel, number, select, radio, checkbox, acceptance, date, time, file upload, password, hidden, HTML, step and honeypot fields, multi-step forms with a progress indicator, per-field width and required marks, and ajax submit that falls back to a normal post without JavaScript.
* New: form actions after submit: Collect Submissions, Email and Email 2 (auto-responder) with `[field id="..."]` and `[all-fields]` tags, Redirect, and Webhook with Discord and Slack presets. A webhook is the only data a form sends out, and only to the address you enter.
* New: spam protection with a honeypot, a minimum fill time, a per-IP rate limit and a local math question; optional reCAPTCHA, hCaptcha or Turnstile that load only after you choose a provider and enter your keys.
* New: Refraction > Submissions with search and filters, read/unread/trash, bulk actions, a per-submission action log, CSV export, retention (auto delete), IP and browser storage off by default, and WordPress privacy export and erase support.
* New: Login widget (remember me, lost password link, redirect, logged-in state, register link when registration is open).
* New: an "Advanced" widget category with 12 built-in widgets: Nav Menu (horizontal, vertical or dropdown, accessible hamburger, hover effects), Slides, Price List, Price Table, Flip Box, Call to Action, Animated Headline, Countdown (due date or per-visitor timer; hide, message or redirect when it ends), Share Buttons (plain links, copy link, print), Blockquote (with a tweet link), Progress Tracker and Table of Contents (automatic, numbered, collapsible, sticky).
* New: 11 more widgets in the Advanced category: Media Carousel (images and videos, coverflow, thumbnail slideshow, lightbox), Testimonial Carousel, Reviews (star ratings you type in, grid or carousel), Hotspot (click, hover or always-on tooltips), Code Highlight (JS, PHP, CSS, HTML, JSON, Bash, Python; line numbers, copy button, themes), Lottie (bundled player, Media Library or URL), Video Playlist (YouTube, Vimeo and video files, loaded on click), Gallery (grid, masonry, justified, filter buttons, lightbox) and four Facebook embeds (Button, Comments, Embed, Page; plain iframes, no SDK).
* New: Lottie `.json` files can be uploaded to the Media Library; only real Lottie animations are accepted.
* Fix: typing in the editor's widget search no longer raises JavaScript errors.

= 0.2.0 =
* New: complete rebrand. The editor, loading screens, toolbar and onboarding logos and the icon font are Refraction's own artwork (icon classes now use the `rficon-` prefix); documentation links point to this project; the kit export no longer lists removed features; the old changelog moved to docs/refraction/upstream-changelog.txt.
* New: Theme Builder. Build your site's Header and Footer with Refraction and choose where each one appears. Refraction > Theme Builder lists them with their conditions; "Add New" opens the template type dialog with Header or Footer preselected.
* New: Display Conditions in the template settings of the editor. Include or exclude the entire site, the front page, all singular pages, a post type, one page or post (with search), posts by an author or in a category/tag/custom term, child pages, archives (post type, category, tag, custom taxonomy, author, date, search results), the 404 page, and visitor rules (logged in, logged out, user role). Excludes always win, the most specific template wins, and ties go to the most recently modified template.
* New: works with classic themes (header.php and footer.php are replaced when a template matches) and block themes (the header and footer template parts are replaced). When nothing matches, your theme renders normally. Themes can opt in explicitly with `add_theme_support( 'refraction-theme-builder' )` and `refraction_theme_builder_header()` / `refraction_theme_builder_footer()`.
* Tweak: Floating Elements are now shown or hidden by the same conditions engine (rules are stored in the same place as before).
* Tweak: the editor previews a header or footer template on a blank canvas, not on a copy of your site.

= 0.1.2 =
* Fix: "Create new page" on the Refraction home screen opened the WordPress block editor; it now opens the Refraction editor.
* Fix: the editor's local template library did not open, its REST endpoint hit a PHP fatal, and inserting or saving a template crashed. Saved templates now list, insert and save locally.
* Fix: Element Manager and Tools > Website Templates (export and import a site kit as a zip) returned "not allowed" or crashed; both work again.
* Fix: a leftover "flexbox changes" dialog appeared on every editor open.
* Fix: JavaScript errors on the Settings and Tools pages (removed telemetry code) and a PHP warning for templates without an author.
* New: an "Edit with Refraction" row action in the Pages and Posts lists for every editable post, and a "Settings saved." notice.
* Fix: the release workflow failed on `npm ci` (package-lock.json was out of sync for npm 11.12.1), so no downloadable zip was published. The lock file is regenerated, npm is pinned in the workflow, and the workflow can be re-run for an existing tag and updates a release created by hand.
* New: "Check for updates" link on the Refraction row of the Plugins screen. It bypasses the cache and says plainly whether Refraction is up to date, an update is available, or why the check failed (no release, no zip asset, GitHub rate limit, GitHub unreachable).
* New: "View details" window with the GitHub release notes, and the standard "Enable auto-updates" toggle now works for Refraction.
* New: `REFRACTION_UPDATE_API_BASE` constant (and `refraction/updater/api_base` filter) to point the update check at another API host; defaults to https://api.github.com.
* Tweak: added an `Update URI` plugin header so WordPress never asks WordPress.org about a plugin named "refraction".

= 0.1.1 =
* Fix: the Refraction menu was missing from the WordPress admin sidebar. It is now a visible top-level menu (Home, Settings, Tools, Saved Templates, Floating Elements, Role Manager, System Info) that respects user capabilities; editors see Home and Saved Templates.
* New: local Refraction home screen with quick links.
* Fix: the Settings link on the Plugins screen opens the Refraction settings page.
* Tweak: removed the duplicate in-page navigation sidebar, which also carried an upgrade prompt.

= 0.1.0 =
* Initial fork of the GPL-3.0-or-later code base credited in NOTICE (upstream version 4.4.0).
* Removed the Atomic Editor.
* Removed all calls to the upstream project's servers and its upsell prompts.
* Added a self-hosted update check against GitHub releases (can be disabled with REFRACTION_DISABLE_UPDATE_CHECK).
