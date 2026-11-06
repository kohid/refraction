# Views (devices) in the editor (0.39.0)

The editor (pages, Theme Builder templates, popups, Form Builder forms, events) has eight views, in the top bar and in
the device picker of every responsive setting of every widget, each showing its width next to its icon:

| View | Breakpoint key | Applies up to | Default |
|---|---|---|---|
| Desktop | `desktop` | (everything above 1024) | on |
| 1024 | `tablet` | 1024px | on (cannot be turned off) |
| 820 | `mobile_extra` | 820px (was 880 by default) | on |
| 768 | `mobile` | 768px (was 767 by default) | on (cannot be turned off) |
| 480 | `phone_lg` | 480px | on (new) |
| 430 | `phone_md` | 430px | on (new) |
| 393 | `phone_sm` | 393px | on (new) |
| 375 | `phone_xs` | 375px | on (new) |

Tablet extra (1200), laptop (1366) and widescreen (2400, and up) are still available, off by default. All are set in
Site Settings > Layout > Breakpoints (on/off and their widths).

## How it works

- `Core\Breakpoints\Manager::get_default_config()` lists the breakpoints from the smallest up (the order is the
  cascade order); `default_active_breakpoints()` is the default on list. A kit whose devices list was saved before
  0.39 gets the phone views and Mobile Landscape added once (`init_breakpoints()`, marked with the kit setting
  `refraction_devices_version`, then the device CSS templates are compiled and the CSS cache cleared); a view turned
  off later stays off. The Layout tab's save writes the marker too.
- Settings flow down: a view without its own value uses the next larger view's (CSS media queries `max-width`, and
  `getResponsiveControlValue()` in JS).
- Each view opens the preview at its own width (`editor-base.js` `getBreakpointResizeOptions()`).
- CSS templates (`assets/dev/scss/frontend/breakpoints/templates.scss`) have `REFRACTION_SCREEN_PHONE_{XS,SM,MD,LG}_{MAX,MIN,NEXT}`
  placeholders; `Core\Responsive\Files\Frontend` resolves them (a `MIN` of the smallest active device is 0).
- Hide on device: each phone view hides only in its own range; "Hide on Mobile" (768) keeps hiding on every smaller
  screen too, as before the phone views existed, so existing pages do not change.
- Device mode (`#refraction-device-mode`, `body[data-refraction-device-mode]`): `phone_lg` … `phone_xs` on phones.
  Background video "Play on mobile" and nested tabs' touch mode count the phone views as mobile.
- Motion effects, sticky and reveal: a device list saved before (no new view in it) keeps its meaning: "mobile" takes
  in the phone views, "tablet" the 820 view (`Pure_Motion_Settings::with_newer_devices()` and the same in the JS).
- Carousels (Swiper): the smallest active breakpoint applies from 0 (`assets/dev/js/frontend/utils/swiper.js`).
- Ask Claude knows the `_phone_*` device copies of settings.

Popups' and display conditions' device choices stay Desktop / Tablet / Mobile (decided by the screen width).

## Check

`node scripts/check-devices.mjs --site DIR --port N`: the kit upgrade, the default devices and widths, a value per
view on the site at each width (and fallbacks), "Hide on" per phone view and "Hide on Mobile", the device mode, the top
bar's eight views with widths, each view's preview width, the device picker of a widget setting, and motion device
lists.
