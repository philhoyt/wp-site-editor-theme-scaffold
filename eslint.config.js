/**
 * Project ESLint flat config.
 *
 * Extends the default @wordpress/scripts config (which already ignores
 * build/, node_modules/, vendor/) and adds this scaffold's dist/ output.
 */

const wpScriptsConfig = require("@wordpress/scripts/config/eslint.config.cjs");

module.exports = [
	{
		ignores: ["**/dist/**", ".claude/**"],
	},
	...wpScriptsConfig,
	{
		settings: {
			// Script modules provided by WordPress core at runtime. They are
			// externalised by DependencyExtractionWebpackPlugin, so they are never
			// resolvable on disk and import/no-unresolved would flag every
			// Interactivity API block.
			"import/core-modules": ["@wordpress/interactivity", "@wordpress/interactivity-router"],
		},
	},
];
