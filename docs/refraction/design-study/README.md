# Design study (daily)

A daily session (about four hours) that makes Ask Claude's designs better. The owner asked for it: the results of `ask-claude-watch` should look like the work of a good studio, not a template. Each day studies current, well-made websites, practises real requests on a local site with Refraction, and turns what it learns into the design guide that every Ask Claude prompt carries (`modules/ask-claude/classes/design-guide.php`).

Start from [capabilities.md](capabilities.md), the atlas of what Refraction can do, and add to it whenever a study finds something new.

## Rules

- **Inspiration, never copying.** Study a site's ideas: layout, rhythm, type scale, color use, motion, the order of sections and how it guides the visitor. Do not copy its text, images, logos, code, or its whole look. Note patterns in your own words in `references.md`. Recipes are built from scratch with Refraction widgets.
- **Only Refraction's own features.** A pattern Refraction cannot build is not a recipe. It goes in `lessons.md` under "Feature ideas" for the owner to decide.
- **Every recipe is valid.** `scripts/check-ask-claude.mjs` runs every recipe through the Layout_Sanitizer, and fails if any setting or value would be left out.
- **Offline plugin.** Nothing in the guide may make the plugin call a remote service.
- **No secrets, no binaries** in commits. Screenshots stay in the session's scratch folder; send the best ones to the owner.

## A day

1. **Set up (about 15 min).** Build the plugin (`node scripts/build-release.mjs`) and start a practice site: `node scripts/claude/design-practice.mjs site --site /tmp/rf-practice --port 9400`.
2. **Study (about 1 hour).** Look at 4-6 current sites, in a different field each day, from well-known showcases of web design and from leading companies in that field. Take desktop and phone screenshots with Playwright. For each site, write in `references.md` the address, the date and 3-6 patterns worth learning, each with the Refraction settings that would build it.
3. **Practise (about 2 hours).** Take 2-3 briefs from `briefs.json` (rotate; add new ones), queue them (`design-practice.mjs queue --site … --brief ID`), and follow `.claude/commands/ask-claude-watch.md` exactly: study, plan a direction, build, preview with `--shots`, and review and improve at least twice. Score the final result with the rubric below and note it in `log.md`.
4. **Improve (about 45 min).** Turn what you learned into the guide:
   - a sharper rule in DIRECTION;
   - a feature in SIGNATURE;
   - a new recipe (a section that worked well in practice);
   - a point in CHECKLIST.

   Fix any sanitizer gap or Refraction bug you found, with a test. Record mistakes and their fixes in `lessons.md`.
5. **Ship.** Run `php scripts/test-ask-claude.php` and `node scripts/check-ask-claude.mjs` on a fresh site, bump the patch version (the four places in CLAUDE.md, plus a changelog line), commit to a `study/design-YYYY-MM-DD` branch and push. Stop the practice site and delete its folder.

## Rubric (score 1-5 each, in log.md)

| Point | What a 5 looks like |
| --- | --- |
| Specific | Could only belong to this business; the copy and the palette say so |
| Hierarchy | One h1, one main action, obvious at a glance |
| Rhythm | Consistent spacing; each section differs in shape or tone from the one before |
| Signature | One memorable moment, built well; motion restrained |
| Phone | Every section reads well at 390px; no overflow; easy to tap |
| Craft | Contrast, alignment, no orphans or awkward wraps, no broken icons |
| Honest | No invented facts; placeholders in brackets |
