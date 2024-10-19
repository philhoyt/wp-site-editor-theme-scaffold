# WP-SETS: WordPress Site Editor Theme Scaffold

WP-SETS is a modern WordPress theme scaffold designed with the Site Editor in mind. It provides a solid foundation for creating custom block themes using the latest WordPress features.

## Features

- Full Site Editing (FSE) support
- PHP_CodeSniffer integration with WordPress Coding Standards
- Sass compilation for styles
- Utilizes gulp-wp for efficient WordPress theme development

## Requirements

- WordPress 6.0+
- PHP 7.4+
- Node.js 14+
- Composer

## Installation

1. Clone this repository into your WordPress themes directory:
   ```
   git clone https://github.com/philhoyt/wp-site-editor-theme-scaffold.git your-theme-name
   ```

After cloning the repository, you'll want to replace the default theme information with your own. Make sure to use case-sensitive search to avoid unintended replacements. Here are the strings you need to replace throughout the project:

Theme name: `WP-SETS`
Replace this with your desired theme name (e.g., "My Theme")

Slug: `wpsets`
Replace this with your theme's slug. Use lowercase letters and hyphens (e.g., "mytheme")

Namespace: `WPSETS`
Replace this with your theme's namespace. Use uppercase letters (e.g., "MYTHEME")

Important files to check:
- `style.css`: Update theme information
- `package.json`: Update name and description
- `composer.json`: Update name if necessary
- `phpcs.xml`: Update the ruleset name
- `inc/setup.php`: Update function prefixes and namespaces
- `languages/wpsets.pot`: Rename this file and update its contents

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

Note: This project uses gulp-wp, a Gulp-based build tool specifically designed for WordPress theme development. It handles tasks such as Sass compilation, JavaScript bundling, and more.

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

## License

This project is licensed under the GNU General Public License v2 or later.
