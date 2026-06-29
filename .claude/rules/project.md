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
- WP minimum: 6.0 (`Requires at least`); Tested up to: 7.0
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

## Commands

- `composer lint` / `composer lint-fix` — phpcs / phpcbf
- `npm run lint:scss` / `npm run lint:js` — Stylelint / ESLint
- `npm run build` / `npm run start` — production build / dev watch
- `wp i18n make-pot . languages/wpsets.pot --include="templates,parts,patterns,inc"`
