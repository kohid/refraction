=== Refraction ===
Contributors: kohid
Tags: page builder, drag-and-drop, editor, landing page
Requires at least: 6.8
Tested up to: 6.8
Requires PHP: 7.4
Stable tag: 0.24.1
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
