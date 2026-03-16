# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run start          # Dev server with hot reload
npm run build          # Production build

# Linting
npm run lint:js        # ESLint
npm run lint:css       # Stylelint (CSS)
npm run lint:scss      # Stylelint (SCSS)
npm run lint:scss:fix  # Auto-fix SCSS lint issues
npm run lint:php       # PHP CodeSniffer
npm run lint:php:fix   # Auto-fix PHP lint issues

# Formatting
npm run format         # Format JS/JSON/MD via wp-scripts
```

## Architecture

This is a **WordPress Full Site Editing (FSE) block theme** scaffold. There are no PHP templates — layout is defined via block-based `.html` files in `templates/` and `parts/`.

### Build Pipeline

`src/` → webpack (`@wordpress/scripts`) → `dist/`

- `src/styles/style.scss` → `dist/css/style.css` (front-end)
- `src/styles/editor.scss` → `dist/css/editor.css` (editor-only)
- `src/scripts/theme.js` → `dist/js/theme.js`

Webpack (`webpack.config.js`) extends the default `@wordpress/scripts` config, separating JS and CSS into subdirectories and generating `*.asset.php` manifest files used by `inc/setup.php` for versioned asset enqueueing.

### SCSS Structure

```
src/styles/
├── tools/_context.scss     # front/editor separation mixin
├── base/global/            # global resets/base styles
└── modules/                # feature-specific partials
```

The `_context.scss` mixin controls whether styles apply on the front-end or in the editor:

```scss
@use '../tools/context';
@include context.is(front) { /* front-end only */ }
@include context.is(editor) { /* editor only */ }
```

### Theme Identity

- **Text domain / namespace prefix**: `wpsets`
- **PHP namespace**: `WPSETS\Setup`
- **Colors/spacing/typography**: defined in `theme.json` (not hardcoded CSS)
- **WordPress CSS custom properties**: `--wp--preset--color--*`, `--wp--preset--spacing--*`, `--wp--custom--*`

### Key Files

| File | Purpose |
|------|---------|
| `theme.json` | All theme settings: color palette, typography, layout widths, spacing, border radii |
| `inc/setup.php` | Theme setup hooks, asset enqueueing using `*.asset.php` manifests |
| `functions.php` | Minimal entry point — includes `inc/setup.php` |
| `webpack.config.js` | Build config extending `@wordpress/scripts` defaults |

### Conventions

- Tabs for indentation (PHP, JS, SCSS, HTML); spaces for JSON/YAML
- Theme layout uses CSS Grid on `.wp-site-blocks` (header/main/footer)
- Core block patterns are disabled; custom patterns go in `patterns/`
- Admin bar height is exposed as a CSS custom property for layout offset calculations
