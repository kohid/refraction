# Admin menu (0.1.1)

Root cause of the missing sidebar entry in 0.1.0: the upstream top-level menu `refraction` was hidden with CSS, and its
replacement (`refraction-home`, registered by the removed Elementor One package) was never registered, so only hidden
submenus existed.

Now `Refraction_One_Menu_Manager` registers `refraction-home` (edit_posts, position 58.5, inline SVG icon). The submenu is
built from the registered Editor One menu items (`Menu_Data_Provider::get_visible_submenu_items()`), capability aware:
administrators get Home, Settings, Tools, Saved Templates, Floating Elements, Role Manager, System Info; editors get Home
and Saved Templates. The duplicate "Templates" top-level CPT menu (and its submenu) is removed server-side so Refraction is the highlighted parent on library screens.

Check it with `scripts/setup-menu-test-site.sh` then `node scripts/check-admin-menu.mjs`.

Known leftovers
* Element Manager (`page=refraction-element-manager`) is not listed: its React app reads removed promotion data
  (`promotion_data.manager_permissions`) and throws; it also shows an upgrade button for role restrictions.
* The in-page React sidebar (`Sidebar_Navigation_Handler`, `editor-one-sidebar-navigation`) is no longer loaded.
* `page=refraction-app` (Kit import/export) returns 403 and is not in the menu.
