# Nav Menu: hover effects, submenus and the hamburger button

Additions to the Nav Menu widget (`modules/pro-widgets/widgets/nav-menu.php`, styles in `modules/pro-widgets/assets/scss/widgets/nav-menu.scss`, script `modules/pro-widgets/assets/js/frontend/handlers/nav-menu.js`).

## Menu items (Style > Menu Items)

- **Hover Effect**: Underline, Overline, Double Line, **Line Through**, **Highlighter** (a band behind the lower half of the text), **Dot**, Framed, **Corners**, **Brackets** (`[ text ]`), Background Fill, **Pill**, **Glow**, **Lift**.
- **Animation** (lines, dot, corners, brackets): Fade, Slide, Grow, **Grow from the left**, **Grow from the right**, **Drop in**.
- **Effect Width** (lines): empty is as wide as the text. The item padding also sets `--refraction-nav-link-pl` / `-pr` / `-pb`, so the line follows it. Or set a width in %, px or em; % is of the whole item. **Effect Position** places it left, center or right (`--refraction-nav-pointer-pos` 0 / 0.5 / 1).
- **Distance From The Edge**, **Effect Roundness**, **Effect Speed**, and **Text Color On The Effect** (Background Fill, Pill).
- The effect is drawn on the top-level items only (`.refraction-nav-menu__list > .refraction-nav-menu__item > .refraction-nav-menu__link`). Submenus have their own effect. Before 0.55.0 the main effect was drawn in submenus too.

## Submenu (Style > Submenu)

- **Hover Effect**, separate from the main items (`refraction-nav-menu--subfx-*`):
  - Background (the existing hover background color; the default)
  - Underline
  - Bar at the side
  - Text slides in (with the bar)
  - Arrow appears
  - Dot
  - Highlighter
  - None

  Each comes with its **Effect Color** and **Effect Thickness**.
- **Open Animation** (`refraction-nav-menu--subanim-*`): Fade up (the default, as before), Fade, Slide down, Zoom, Flip down, None. It works through `--refraction-nav-sub-from`, the transform the panel starts from.
- **Position Under The Item** (start, center, end), **Distance From The Item** (a hidden bridge keeps the hover while the pointer crosses the gap), **Panel Padding**, **Space Between Items**, **Line Between Items**, **Item Border Radius**, **Text Color (Current Page)**. These sit with the existing typography, colors, background, border, radius, shadow, width and item padding.
- In the vertical layout and in the collapsed (hamburger) menu, submenus stay in the list: the position, distance and centring don't apply there.

## Hamburger Button (Style > Hamburger Button)

- **Hover Background**.
- **Hover Animation** (`refraction-nav-menu--toggle-hover-*`): Grow, Shrink, Lift, Turn, Wiggle, Pulse, Lines shift (three lines only).
- **Click Animation** (`refraction-nav-menu--toggle-click-*`): Press, Bounce, Jelly, Ripple (with **Ripple Color**), Spin. The handler adds `is-clicked` to the button on each click (taken off and put back, so it plays every time, and removed after 700 ms). The button's change into a close button (Button Animation) still happens alongside.
- With reduced motion the animations don't play.

## Check

`node scripts/check-nav-effects.mjs --site DIR --port N` (a fresh site: it creates a menu named Main). It checks:

- Main items: the line's width and position, the new effects, growing from the left, and no main effect inside submenus.
- Submenus: centred at a distance, kept open across the gap, the side bar.
- The hamburger button: grow on hover; the ripple on click, played again on the next click.
- The collapsed menu: submenus stay in the list.
- The editor has the settings.

## Logo or Site Title in the bar (0.81.0)

Content > **Logo or Site Title** (`bar_brand`): the site logo, site title, both, an image or a text, linked to the home
page (switchable). The site logo is the theme's custom logo (Customize > Site Identity); without one the title shows.

- **Position** left, middle or right (`refraction-nav-menu--brand-<pos>` on the widget). In the middle the
  `Nav_Menu_Walker` closes the list after half of the top-level items, prints the brand
  (`.refraction-nav-menu__bar-brand--middle`) and opens `.refraction-nav-menu__list--after`; the two lists share the bar
  on each side so the brand is centered. Collapsed (hamburger) the middle copy hides and a copy beside the hamburger
  (`--collapsed`) shows; the opened menu lists every item.
- **When**: always, show once the page is scrolled down by N px, or hide once scrolled (`bar_brand_show`,
  `bar_brand_offset`, frontend settings). `nav-menu.js` (`updateBrand()`) toggles `is-brand-hidden` on the nav; the first
  state is set without animating (`is-brand-instant`).
- **Animation** (`refraction-nav-menu--brand-anim-<name>`): fade, slide down, slide up, slide in from the side (from the
  right when on the right), zoom, pop, flip, blur, collapse (grow in: hidden it takes no room). Duration:
  `--refraction-nav-brand-speed`.
- Style > Logo or Site Title: logo width and max height, title typography and colors, space beside the menu
  (`--refraction-nav-brand-gap`), space between logo and title, padding.

Check: `node scripts/check-nav-brand.mjs --site DIR --port N` (also covers the Button icon style, the Text Editor's
outer paragraph margins and highlighted words drawn every time).

### Before and After Scrolling (0.83.0)

Style > Logo or Site Title has two tabs. Before Scrolling holds the settings of 0.81.0 (same ids); After Scrolling the
same settings with ids ending in `_scrolled`, applied under `.refraction-nav-menu.is-scrolled`, which `nav-menu.js`
sets once the page is scrolled past the Scroll point (`bar_brand_offset`, now shown whenever there is a brand). The
brand, its logo and title transition over `--refraction-nav-brand-speed`.
