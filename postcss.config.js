/**
 * PostCSS config for the theme build.
 *
 * Its presence makes `@wordpress/scripts` use this pipeline instead of its own,
 * which adds cssnano in production. The WordPress Theme Directory requires
 * stylesheets to ship as readable source, so the theme's CSS is built
 * unminified: the same preset wp-scripts uses (postcss-import and
 * autoprefixer), and nothing else.
 *
 * The preset is a dependency of `@wordpress/scripts`, so it is resolved from
 * there rather than assumed to be hoisted, as webpack.config.js does for
 * copy-webpack-plugin.
 */
const path = require("path");

const fromWpScripts = (request) =>
	require(
		require.resolve(request, {
			paths: [path.dirname(require.resolve("@wordpress/scripts/package.json"))],
		})
	);

module.exports = {
	plugins: fromWpScripts("@wordpress/postcss-plugins-preset"),
};
