# Site Settings: what Buttons, Images and Typography reach; the floating panel (0.40.0)

- **Buttons** (`core/kits/documents/tabs/theme-style-buttons.php`): `{{WRAPPER}} :where(.refraction-widget-button) .refraction-button`
  (and `:hover`, `:focus`; `:where()` keeps the weight the rules always had, so precedence is unchanged). It used to reach every `button`, `input[type=button|submit]` and `.refraction-button` of the
  site, so menu toggles, sub menu arrows, carousel arrows and close buttons took the button colors and padding. Other
  widgets' buttons are styled in their own Style tab.
- **Images** (`theme-style-images.php`): `{{WRAPPER}} :where(.refraction-widget-image) img` instead of every `img` (logos, icons,
  galleries, carousels).
- **Typography > Use as the default** (kit setting `theme_typography_default`, `Kits\Manager::is_theme_typography_default()`):
  on, `is_custom_typography_enabled()` is false, so widgets' typography controls no longer get the Global Fonts as
  their default CSS (the same as Settings > Disable Default Fonts, but per kit and from Site Settings) and their text
  follows Typography's body, link and H1–H6 styles. A widget's own typography (or a Global Font chosen on it) still
  wins. Read from the saved kit meta (the kit's controls ask while they are being made). Saving the kit clears the CSS
  files, so pages pick it up.
- **Floating panel** (`assets/dev/scss/editor/panel/panel.scss`, `_wrapper.scss`, `_devices.scss`): `#refraction-panel` is
  absolutely positioned in `#refraction-editor-wrapper` with a shadow, over the preview, as the Ask Claude panel is on
  the right; `--e-preview-width` is the full width (less a docked Structure panel). Preview mode (the arrow on its edge)
  slides it away as before; resizing it still works. Applies to every editor (pages, templates, forms, events).

Check: `node scripts/check-site-settings.mjs --site DIR --port N`.
