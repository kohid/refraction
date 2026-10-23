# Motion, Sticky, Custom Fonts, Custom Icons: plan (B2b)

Goal: the second half of roadmap item B2, built in and offline, written test-first.

Architecture: three always-on modules (`motion-effects`, `custom-fonts`, `custom-icons`), each with a pure-logic class layer
(no WordPress calls, tested by `scripts/test-motion.php`) and a thin WordPress layer (controls, admin screen, hooks).
Browser behaviour is checked by `scripts/check-motion.mjs` on a fresh test site.

## Tasks (one commit each)

1. Motion Effects (`modules/motion-effects`)
   - Test first: `Motion_Settings::normalize()` clamps speeds/ranges, whitelists directions and devices; `uses_motion()` detects use.
   - Controls: Scrolling Effects and Mouse Effects sections (Advanced tab, containers, columns, sections, widgets).
   - JS `motion.js`: IntersectionObserver gates work to visible elements, one rAF loop, transforms/opacity/filter only,
     skipped for `prefers-reduced-motion`, enqueued only when an element on the page uses it (always in the editor preview).
   - Stacking: effects set CSS variables on the wrapper and compose in one `transform`, so entrance animations (which animate
     `transform` on the same element) keep working because the motion transform is applied to an inner layer variable, not by
     overwriting the animation: see `motion.scss`.
2. Sticky: `Sticky_Settings` (offset, devices, effects offset), `sticky.js` (fixed + placeholder, admin bar aware,
   stay-in-parent, `.rf-sticky--effects` class past the effects offset), shrink/solid controls via selectors.
3. Custom Fonts: `Font_File_Validator` (extension, mime, magic bytes, size), `Font_Face_Css` generator, option-backed
   families, admin screen (Refraction > Custom Fonts), CSS written to uploads, fonts group in the typography list.
4. Custom Icons: `Svg_Sanitizer`, `Icon_Zip_Validator` (zip-slip, limits), `Icon_Set_Builder` (svg and IcoMoon/Fontello),
   storage in `uploads/refraction-icons/<set>`, icons manager tab, admin screen.
5. Docs (`motion.md`), changelog, admin menu expectations, final verification.

Review focus: hostile uploads (php/svg disguised as fonts, zip-slip, script in svg), reduced motion, admin bar offset,
fonts with quotes in names, 0 / huge setting values.
