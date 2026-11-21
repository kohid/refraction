# Copy and paste in the editor (0.137.0)

Copy (right-click > Copy, Ctrl+C) keeps the copied elements in the browser's storage (`refractionCommon.storage`,
key `clipboard`, inside the one `refraction` localStorage entry) and also on the system clipboard as JSON. Paste
(right-click > Paste, Ctrl+V) reads the storage, so it works on the same page and on any other page of the site; Paste
from other site reads the system clipboard.

## What changed

- **Size.** `document/elements/copy` used to store `model.toJSON( { copyHtmlCache: true } )`: every setting with its
  default, for every screen size, for every child. A widget holding containers came to millions of characters (Focus
  Stack 2.6M, Showcase Wheel 1.5M, Timed Slides 1.4M, Mega Menu 0.5M), the browser refused it (QuotaExceededError,
  about 5M characters per site) and Copy did nothing. It now stores what a save stores (`remove: [ 'default',
  'editSettings', 'defaultEditSettings' ]`; the paste fills the defaults in), while the copied element's own settings
  stay whole so Paste Style still carries values equal to the defaults. A copy that still does not fit clears the
  clipboard and says so.
- **Keyboard in inline editing.** A click on a widget's text (heading, button, testimonial...) puts the caret in a
  contenteditable, where shortcuts excluded for inputs did nothing. The shortcut manager (`web-cli` `shortcuts.js`)
  now lets a shortcut with `noTextSelected` run there when no text is selected: Ctrl+C copies the widget, and with
  text selected it stays the text's copy. Ctrl+V there is the browser's paste: `bindElementPaste()` (editor-base)
  turns a paste of a copied element (the JSON Copy puts on the system clipboard) into `document/ui/paste` instead of
  text; any other text pastes as text.
- **Nested widgets.** A widget's own slides or items are locked containers that cover it (Showcase Wheel, carousels,
  tabs, Dynamic Container), so a right-click or a click reached the slide, where Copy is off. Their menu now has
  "Copy <widget>" (`container.js`, shown only for those), and Ctrl+C on one copies its widget
  (`document/ui` `copyTarget()`).
- **Embeds.** In the preview, an iframe inside a widget takes the pointer only once the widget is selected
  (`.refraction-widget:not(.refraction-element-editable) iframe { pointer-events: none }`), so a right-click on a
  Video, Google Maps or Facebook widget opens the editor's menu.

## Check

`node scripts/check-copy-paste.mjs --site DIR --port N`: every widget copies (largest under 1M characters), pastes
once on the same page and once on another page, and stays after saving; the keyboard in inline editing; the slide
menu and Ctrl+C on a slide; the right-click on a Video.
