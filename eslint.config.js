/**
 * Project ESLint flat config.
 *
 * Extends the default @wordpress/scripts config (which already ignores
 * build/, node_modules/, vendor/) and adds this scaffold's dist/ output.
 */

const wpScriptsConfig = require("@wordpress/scripts/config/eslint.config.cjs");

module.exports = [
	{
		ignores: ["**/dist/**"],
	},
	...wpScriptsConfig,
];
