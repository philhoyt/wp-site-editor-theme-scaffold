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
npm run packages-update # Update @wordpress/* packages
```

## Architecture

This is a **WordPress Full Site Editing (FSE) block theme** scaffold. There are no PHP page templates — `templates/` and `parts/` hold thin block-based `.html` shells, while the meaningful block markup lives in PHP patterns under `patterns/` (see [Patterns](#patterns)).

### Build Pipeline

`src/` → webpack (`@wordpress/scripts`) → `dist/`

- `src/styles/style.scss` → `dist/css/style.css` (front-end)
- `src/styles/editor.scss` → `dist/css/editor.css` (editor-only)

Webpack (`webpack.config.js`) extends the default `@wordpress/scripts` config, separating CSS into a `css/` subdirectory and generating `*.asset.php` manifest files used by `inc/setup.php` for versioned asset enqueueing. `src/scripts/` is reserved as the entry point for theme JS — add an entry to `webpack.config.js` when the first script lands.

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
| `theme.json`        | All theme settings: color palette, typography, layout widths, spacing, border radii |
| `inc/setup.php`     | Theme setup hooks, asset enqueueing using `*.asset.php` manifests                   |
| `functions.php`     | Minimal entry point — includes `inc/setup.php`                                      |
| `patterns/`         | PHP patterns holding the theme's block markup (the pattern paradigm)                 |
| `webpack.config.js` | Build config extending `@wordpress/scripts` defaults                                |
| `phpcs.xml`         | PHP CodeSniffer ruleset (WordPress standard + PHPCompatibilityWP)                    |
| `phpstan.neon`      | PHPStan config (level 5, WordPress stubs)                                            |

### Conventions

- Tabs for indentation (PHP, JS, SCSS, HTML); spaces for JSON/YAML
- Theme layout uses CSS Grid on `.wp-site-blocks` (header/main/footer)
- Core block patterns are disabled; custom patterns go in `patterns/`
- Admin bar height is exposed as a CSS custom property for layout offset calculations

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

**Naming conventions**

- `header.php` / `footer.php` — site-wide template-part patterns
- `template-*.php` — full-page or major-region patterns that compose a template (`template-query-loop`)
- `hidden-*.php` — internal building blocks referenced only from templates or other patterns; not shown in the inserter
- Other names (`comments.php`, `post-navigation.php`) — reusable building blocks that may also surface in the inserter

### Translations

User-facing strings live in `patterns/*.php` wrapped in `esc_html__()`, `esc_html_e()`, `esc_html_x()`, or `esc_attr_x()` with the `wpsets` text domain. To regenerate `languages/wpsets.pot`:

```bash
wp i18n make-pot . languages/wpsets.pot --include="templates,parts,patterns,inc"
```

The `--include` paths cover both PHP source and any patterns/templates that might pick up additional strings as the theme grows.
