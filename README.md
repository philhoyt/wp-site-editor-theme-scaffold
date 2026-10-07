# WP-SETS: WordPress Site Editor Theme Scaffold

WP-SETS is a modern WordPress theme scaffold designed with the Site Editor in mind. It provides a solid foundation for creating custom block themes using the latest WordPress features.

## Features

- Full Site Editing (FSE) support
- PHP_CodeSniffer integration with WordPress Coding Standards
- Sass compilation for styles
- Modern build tooling with @wordpress/scripts

## Requirements

- WordPress 6.6+
- PHP 7.4+
- Node.js 24 (see `.nvmrc`)
- Composer

## Installation

1. Clone this repository into your WordPress themes directory:
   ```
   git clone https://github.com/philhoyt/wp-site-editor-theme-scaffold.git your-theme-name
   ```

The quickest way to start a derived theme is the generator, which performs every replacement below for you:

```
npx create-wp-site-editor-theme "My Theme"
```

If you cloned instead, you'll want to replace the default theme information with your own. Make sure to use case-sensitive search to avoid unintended replacements. Here are the strings you need to replace throughout the project:

Theme name: `WP-SETS`
Replace this with your desired theme name (e.g., "My Theme")

Slug: `wpsets`
Replace this with your theme's slug. Use lowercase letters and hyphens (e.g., "mytheme")

Namespace: `WPSETS`
Replace this with your theme's namespace. Use uppercase letters (e.g., "MYTHEME")

Important files to check:

- `style.css`: Update theme information
- `package.json`: Update name, description and the `build/wpsets-check` paths in the `review:*` scripts
- `composer.json`: Update name if necessary
- `phpcs.xml`: Update the ruleset name and the `text_domain` element
- `inc/setup.php`: Update function prefixes and namespaces
- `patterns/*.php`, `templates/*.html`, `parts/*.html`: Pattern slugs `wpsets/…` and every `wp:pattern` reference to them
- `languages/wpsets.pot`: Rename this file and update its contents
- `.wp-env.json`, `.wp-env.review.json`: The `wp-content/themes/wpsets` mappings and `theme activate wpsets`
- `.github/workflows/release.yml`, `.github/workflows/ci.yml`: `SLUG: wpsets` and `theme activate wpsets`
- `.github/blueprint.json`: `wpsets.zip` in the release download URL (and `OWNER/REPO`)
- `bin/wp.sh`: `SITE` and `THEME_PATH`
- `bin/*.php`, `bin/*.js`: `wpsets_` variable and function prefixes, the `wpsets-style` handle and `wp-sets.local` examples

2. Navigate to the theme directory:

   ```
   cd your-theme-name
   ```

3. Install PHP dependencies:

   ```
   composer install
   ```

4. Install Node.js dependencies:
   ```
   npm install
   ```

## Development

To start development:

1. Run the development script:
   ```
   npm run start
   ```

This will start the development server with hot module replacement, automatically compiling your SCSS and JavaScript files as you make changes.

## Building for Production

To build the theme for production:

1. Run the build script:
   ```
   npm run build
   ```

This will compile and minify all assets for production use.

## Linting

To lint your PHP files:

npm run lint:php

To automatically fix some PHP linting issues:

npm run lint:php:fix

## Playground demo

`.github/blueprint.json` installs the theme's latest release zip in [WordPress Playground](https://playground.wordpress.net/). It only works once the derived theme has tagged a release (see `.github/workflows/release.yml`). Replace `OWNER/REPO` in its `installTheme` URL (the zip name follows the theme slug), then add a badge to the theme's README:

```markdown
[![Try it in WordPress Playground](https://img.shields.io/badge/Playground-Try%20it-3858e9?logo=wordpress)](https://playground.wordpress.net/?blueprint-url=https://raw.githubusercontent.com/OWNER/REPO/main/.github/blueprint.json)
```

## License

This project is licensed under the GNU General Public License v2 or later.
