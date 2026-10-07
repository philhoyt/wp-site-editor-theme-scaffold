---
paths:
 - "**/*.php"
 - "**/*.js"
 - "**/*.jsx"
 - "**/*.scss"
 - "**/*.css"
 - "**/*.html"
 - "**/theme.json"
 - "**/composer.json"
 - "**/package.json"
---

# Project: WP-SETS

A WordPress Full Site Editing (FSE) **block theme** scaffold — used as a base to start
other themes. Layout is defined entirely in block-based `.html` templates/parts plus PHP
patterns; there are no PHP page templates.

- Type: block theme (FSE), not a plugin
- Slug / text domain: `wpsets`
- PHP namespace: `WPSETS\Setup`
- PHP minimum: 7.4 (`Requires PHP` in `style.css`)
- WP minimum: 6.6 (`Requires at least`, the theme.json v3 floor); Tested up to: 7.1
- Main entry: `functions.php` → `inc/setup.php`
- Version: `style.css` `Version:` header (kept at `0.0.0` on purpose — set per derived theme).
  Asset cache-busting uses `dist/css/*.asset.php` versions, not a PHP constant.
- Distribution: GitHub scaffold (cloned as a base); `/dist` is gitignored and built via
  `npm run build`.

## Conventions

- Tabs for PHP/JS/SCSS/HTML; spaces for JSON/YAML.
- User-facing strings live in `patterns/*.php` wrapped in `esc_html__()` / `esc_html_e()` /
  `esc_html_x()` / `esc_attr_x()` with the `wpsets` text domain.
- Templates/parts are thin shells; meaningful block markup lives in PHP patterns under
  `patterns/` (the pattern paradigm, like Twenty Twenty-Five).
- Build: `src/` → webpack (`@wordpress/scripts`) → `dist/`. SCSS only; `src/scripts/` is
  reserved for future theme JS.
- Spacing preset slugs contain no digits (`xs s m l xl xxl xxxl`); WordPress kebab-cases
  a `2xl` slug to `2-xl` when it emits the custom property.
- Block markup in `patterns/`, `templates/` and `parts/` must match each block's
  `save()` output; run `npm run validate:blocks` after touching any of them.
- `theme.json` `$schema` is pinned to a released version and moves with `Tested up to`.
- `.claude/settings.json` runs phpcs / ESLint / Stylelint / security / readme / validate-blocks hooks after
  every Edit/Write from `.claude/scripts/hooks/`; those scripts are excluded from lint.
- Release: `.github/workflows/release.yml` runs on `v*` tags, stages through
  `.distignore`, and publishes `<slug>.zip`. The scaffold never tags; set `SLUG` in the
  derived theme.

## Commands

- `composer lint` / `composer lint-fix` — phpcs / phpcbf
- `npm run lint:scss` / `npm run lint:js` — Stylelint / ESLint
- `npm run build` / `npm run start` — production build / dev watch
- `wp i18n make-pot . languages/wpsets.pot --include="templates,parts,patterns,inc,theme.json"`
- `npm run validate:blocks` — parse patterns/templates/parts with the core block registry
- `bin/wp.sh <command>` — WP-CLI against the Local site named by `SITE`, or wp-env when Local is down
- `npm run wp-env:start` / `npm run seed` / `npm run test:smoke` / `npm run check:a11y` — wp-env test site, content, checks
- `npm run review:start` / `review:import` / `review:check` — Theme Unit Test site and Theme Check on a staged copy
- `npm run patterns:flush`, `npm run export:templates` — pattern cache, Site Editor copies
