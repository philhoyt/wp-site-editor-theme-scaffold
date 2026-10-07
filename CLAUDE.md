# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run start          # Dev server with hot reload
npm run build          # Production build

# Linting
npm run lint:js        # ESLint
npm run lint:scss      # Stylelint (SCSS)
npm run lint:scss:fix  # Auto-fix SCSS lint issues
npm run lint:php       # PHP CodeSniffer (composer lint)
npm run lint:php:fix   # Auto-fix PHP lint issues (composer lint-fix)
composer analyse       # PHPStan static analysis (level 5, WordPress stubs)

# Formatting
npm run format         # Format JS/JSON/MD via wp-scripts
npm run format:check   # Check formatting without writing

# Utilities
npm run screenshot     # Capture screenshot.png of the local site (Puppeteer)
npm run validate:blocks # Parse patterns/templates/parts with the core block registry; fails on any block that would enter recovery mode
npm run packages-update # Update @wordpress/* packages
```

## Architecture

This is a **WordPress Full Site Editing (FSE) block theme** scaffold. There are no PHP page templates — `templates/` and `parts/` hold thin block-based `.html` shells, while the meaningful block markup lives in PHP patterns under `patterns/` (see [Patterns](#patterns)).

### Build Pipeline

`src/` → webpack (`@wordpress/scripts`) → `dist/`

- `src/styles/style.scss` → `dist/css/style.css` (front-end)
- `src/styles/editor.scss` → `dist/css/editor.css` (editor-only)

Webpack (`webpack.config.js`) extends the default `@wordpress/scripts` config, separating CSS into a `css/` subdirectory and generating `*.asset.php` manifest files used by `inc/setup.php` for versioned asset enqueueing. `src/scripts/` is reserved as the entry point for theme JS — add an entry to `webpack.config.js` when the first script lands.

Blocks live under `src/blocks/<name>/` and are discovered automatically: `wp-scripts` globs `src/` for `block.json` and builds an entry point per script field, so no manual entry is needed. `webpack.config.js` **merges** its two CSS entries into that discovered set rather than replacing it — replacing `entry` silently disables block discovery.

`start` and `build` pass `--experimental-modules`, which is required for the `block.json` `viewScriptModule` field (i.e. any Interactivity API block). That flag makes `@wordpress/scripts` export an **array** of two configs — `[scripts, modules]` — instead of one object, which is why `webpack.config.js` destructures both and customises them separately. The `splitChunks` override is deliberately applied only to the scripts config; the Interactivity router arrives via a dynamic `import()` and needs chunking left alone.

`wp-scripts` copies only PHP files referenced directly from `block.json`, so `webpack.config.js` adds a `CopyWebpackPlugin` pattern for `**/parts/*.php`. Put a block's sub-partials in `src/blocks/<name>/parts/` and they will be copied to `dist/` alongside `render.php`.

### SCSS Structure

```
src/styles/
├── tools/_context.scss     # front/editor separation mixin
├── base/global/            # global resets/base styles
└── modules/                # feature-specific partials
```

The `_context.scss` mixin controls whether styles apply on the front-end or in the editor:

```scss
@use "../tools/context";
@include context.is(front) {
	/* front-end only */
}
@include context.is(editor) {
	/* editor only */
}
```

### Theme Identity

- **Text domain / namespace prefix**: `wpsets`
- **PHP namespace**: `WPSETS\Setup`
- **Colors/spacing/typography**: defined in `theme.json` (not hardcoded CSS)
- **WordPress CSS custom properties**: `--wp--preset--color--*`, `--wp--preset--spacing--*`, `--wp--custom--*`

### Key Files

| File                | Purpose                                                                             |
| ------------------- | ----------------------------------------------------------------------------------- |
| `style.css`         | Theme header — name, version, text domain, `Requires`/`Tested up to` metadata        |
| `theme.json`        | All theme settings: color palette, typography, layout widths, spacing, border radii. Its `$schema` is pinned to a released version (`wp/7.1`) and moves together with `Tested up to` in `style.css`, so the editor and validators only offer settings the theme claims to support |
| `inc/setup.php`     | Theme setup hooks, asset enqueueing using `*.asset.php` manifests                   |
| `functions.php`     | Minimal entry point — includes `inc/setup.php`                                      |
| `patterns/`         | PHP patterns holding the theme's block markup (the pattern paradigm)                 |
| `webpack.config.js` | Build config extending `@wordpress/scripts` defaults                                |
| `phpcs.xml`         | PHP CodeSniffer ruleset (WordPress standard + PHPCompatibilityWP)                    |
| `phpstan.neon`      | PHPStan config (level 5, WordPress stubs)                                            |
| `bin/wp.sh`         | WP-CLI wrapper for the Local site. `SITE` at the top is the folder name under `~/Local Sites` (`wp-sets` for the scaffold's own dev site; change it in a derived theme) and needs a one-time socket symlink, described in the script |
| `.distignore`       | Paths excluded from the theme zip (source, tooling, dotfiles, docs, lockfiles)       |
| `.github/workflows/release.yml` | On a `v*` tag: builds, checks the tag against `style.css` `Version` and `package.json` (and `readme.txt` `Stable tag` once one exists), stages through `.distignore`, zips with a single `<slug>/` root, and publishes a GitHub release with the fixed asset name `<slug>.zip`. Set `SLUG` in its `env:` block. The scaffold itself never tags a release; the workflow activates in a derived theme |

### Navigation

`src/styles/modules/_navigation.scss` replaces core's dropdown (a 200px white box with a
hard border and no shadow) with a content-sized surface, and fixes the mobile overlay.
All values come from `settings.custom.navigation` in `theme.json`
(`--wp--custom--navigation--submenu--*`); it draws no indicator and sets no hover
colours, so a derived theme layers its look on top rather than undoing anything.

Three core-markup traps, documented at the top of the module: `__container` is not a
direct child of `.wp-block-navigation`; the open overlay inherits the bar's
`items-justified-*` alignment and needs the three `--navigation-layout-*` custom
properties reset; core marks the open overlay's background and padding `!important`.

### Claude Code hooks

`.claude/settings.json` runs six `PostToolUse` hooks after every Edit/Write, from
`.claude/scripts/hooks/`: phpcs (using the project `phpcs.xml`), ESLint, Stylelint, a
security-pattern warning for PHP, a readme-prose warning (a no-op until a
`readme.txt` exists), and `validate:blocks` on the edited pattern, template or part. Each hook only acts on the file type it covers and feeds its
findings back as additional context; none of them block the edit. The hook scripts are
excluded from phpcs (`phpcs.xml`), ESLint (`eslint.config.js`) and Prettier
(`.prettierignore`) so they do not show up as lint targets themselves.

### Conventions

- Tabs for indentation (PHP, JS, SCSS, HTML); spaces for JSON/YAML
- Theme layout uses CSS Grid on `.wp-site-blocks` (header/main/footer)
- There is deliberately no `front-page.html`. It would take over `/` under WordPress's
  default "Your latest posts" Reading setting, where `home.html` should render the posts
  list; a static front page falls through to `page.html`. Add one only for a designed
  homepage, and make it render a query loop or the page content explicitly
- Core block patterns are disabled; custom patterns go in `patterns/`
- No custom image sizes are registered. Add `add_image_size()` in the derived theme only once a pattern or template consumes the size — unused sizes bloat every upload and get flagged in a directory review
- `dist/css/style-rtl.css` is served automatically via `wp_style_add_data( …, 'rtl', 'replace' )`; nothing extra is needed for RTL locales
- Admin bar height is exposed as a CSS custom property for layout offset calculations
- Spacing preset slugs must not contain digits. WordPress kebab-cases slugs when it emits
  custom properties, so a `2xl` slug becomes `--wp--preset--spacing--2-xl` and any
  `var(--wp--preset--spacing--2xl)` written in a pattern or SCSS resolves to nothing,
  silently. The scale is `xs s m l xl xxl xxxl`. (The border-radius slugs are already
  written as `2-xl` / `3-xl`, which matches what WordPress emits.)

### Patterns

This scaffold follows the **pattern-paradigm** used by Twenty Twenty-Five: templates and template-parts under `templates/` and `parts/` are thin shells; the meaningful block markup lives in PHP patterns under `patterns/` and is composed via `<!-- wp:pattern {"slug":"wpsets/…"} -->`.

**Why patterns instead of inline block markup in templates?**

- **i18n works.** Pattern files are PHP, so user-facing strings can use `esc_html__()`, `esc_html_e()`, `esc_attr_x()` directly — even inside block JSON attributes like `label` or `ariaLabel`. `make-pot` extracts them with no special handling.
- **Reuse.** The same query-loop / comments / post-nav pattern is referenced from multiple templates instead of duplicated.
- **Inserter UX.** Patterns with `Block Types:` headers surface as starter options when a user inserts the matching block.

**Pattern header conventions used here**

| Header | Purpose |
|--------|---------|
| `Title:` | Display name in the inserter |
| `Slug:` | `wpsets/{name}` — must match the namespace |
| `Categories:` | Inserter grouping (`header`, `footer`, `query`, `text`) |
| `Block Types:` | Marks the pattern as a starter for that block (e.g. `core/query`, `core/comments`) |
| `Inserter: no` | Suppresses the pattern from the inserter UI |
| `Viewport Width:` | Width the inserter preview renders at; `1280` on full-width patterns so the preview is not squeezed to a mobile layout |

**Naming conventions**

- `header.php` / `footer.php` — site-wide template-part patterns
- `template-*.php` — full-page or major-region patterns that compose a template (`template-query-loop`)
- `hidden-*.php` — internal building blocks referenced only from templates or other patterns; not shown in the inserter
- Other names (`comments.php`, `post-navigation.php`) — reusable building blocks that may also surface in the inserter

### Block markup must validate

Patterns, templates and parts are hand-written serialised block HTML. If the HTML does
not match what the block's `save()` would produce, the editor drops the block into
recovery mode, and repairing it from the Site Editor inlines the pattern markup and
breaks i18n. **Run `npm run validate:blocks` after touching any of them** — it boots the
core block registry under jsdom, renders the patterns through WP-CLI (`bin/wp.sh`) so
the PHP runs, reads templates and parts from disk, and parses everything with
`@wordpress/blocks`. It fails on:

- an **unknown block name** (a typo parses as `core/missing`, which core counts as valid);
- **invalid** markup — the block would enter recovery mode (expected/found is printed);
- markup that matches only a **deprecated** `save()` — the editor silently rewrites it and
  the template shows as customised;
- a `wp:pattern` slug that is not registered, or a `wp:template-part` slug with no
  `parts/<slug>.html`.

Pass file paths to check only those (`npm run validate:blocks -- patterns/header.php
templates/page.html`); `--from=<json>` validates an arbitrary `{"name": "markup"}` map
instead. Plugin blocks cannot be validated outside the editor: list their namespaces in
`package.json` under `"validateBlocks": { "allow": [] }` (or pass `--allow=ns,ns`) and
they are counted as skipped while the core blocks inside them are still checked.

When `bin/wp.sh` cannot reach a site (Local not running and wp-env not started), or the
theme is not active there, the patterns and the pattern-slug check are skipped with a
warning and only templates and parts are checked. `npm run wp-env:start` gives
`bin/wp.sh` a site to fall back to.

Mismatches found so far, all class-list slips: `has-background-dim-55` (core rounds
`dimRatio` to the nearest 10, so 55 → `-60`); a separator without
`has-alpha-channel-opacity` (present whenever no opacity is set); the cover's `<img>`
must come before the overlay `<span>` in the current save format (span-first only
matches a deprecation and gets silently rewritten). Class order and inline-style order
do not matter — the validator compares them as sets — but missing or extra classes do.

### Translations

User-facing strings live in `patterns/*.php` wrapped in `esc_html__()`, `esc_html_e()`, `esc_html_x()`, or `esc_attr_x()` with the `wpsets` text domain. To regenerate `languages/wpsets.pot`:

```bash
wp i18n make-pot . languages/wpsets.pot --include="templates,parts,patterns,inc,theme.json"
```

The `--include` paths cover both PHP source and any patterns/templates that might pick up additional strings as the theme grows; `theme.json` carries the custom template titles.

## Gotchas

Things that are not derivable from the code:

- **Theme patterns are cached against the theme version.** WordPress keeps the files
  under `patterns/` in a site transient (`wp_theme_files_patterns-<hash>`), so a new or
  renamed pattern file does not register until `Version:` in `style.css` changes. Run
  `npm run patterns:flush` (`bin/flush-patterns.php`) to clear it, or define
  `WP_DEVELOPMENT_MODE` as `'theme'` on the dev site to turn the cache off.
- **Site Editor customisations override theme files.** If the dev site does not match
  `templates/` or `parts/`, `npm run export:templates` lists the database copies against
  their files. To keep an editor change, `npm run export:templates:write` writes the files
  (then validates them); `npm run export:templates:delete` removes the copies whose file
  now matches. An exported part usually needs hand repair before it is committed: the
  editor inlines the pattern it came from (`"metadata":{"patternName":…}`, losing the
  `wp:pattern` reference and its translations) and saves the navigation as
  `"ref":<post id>`, which exists only on that site. The script warns about both.
- **`context.is()` takes one argument.** Styles that apply to both the front-end and
  the editor go outside the mixin entirely.
- **Spacing slugs must not contain digits.** See [Conventions](#conventions).
- **Block markup must match `save()` output.** See
  [Block markup must validate](#block-markup-must-validate); run `npm run validate:blocks`.
