const path = require("path");
const DependencyExtractionWebpackPlugin = require("@wordpress/dependency-extraction-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const defaultConfig = require("@wordpress/scripts/config/webpack.config");

// `copy-webpack-plugin` and `fast-glob` are transitive dependencies of
// @wordpress/scripts, so resolve them from there rather than assuming a hoisted
// copy at the theme root.
const fromWpScripts = (request) =>
	require(
		require.resolve(request, {
			paths: [path.dirname(require.resolve("@wordpress/scripts/package.json"))],
		})
	);

const CopyWebpackPlugin = fromWpScripts("copy-webpack-plugin");
const { sync: glob } = fromWpScripts("fast-glob");

const DIST_PATH = path.resolve(__dirname, "dist");
const SRC_PATH = path.resolve(__dirname, "src");
const THEME_STYLES_PATH = path.join(SRC_PATH, "styles") + path.sep;

// wp-scripts' own test for a block's `style.scss` / `style.css`.
const BLOCK_STYLE_TEST = /[\\/]style(\.module)?\.(pc|sc|sa|c)ss$/;

/**
 * wp-scripts exports a single config object normally, but an ARRAY of two
 * configs — [scripts, modules] — when WP_EXPERIMENTAL_MODULES is set. wp-scripts
 * sets that env var from the `--experimental-modules` CLI flag, which is
 * required for the block.json `viewScriptModule` field (i.e. for any
 * Interactivity API block). Normalise both shapes into a tuple.
 */
const [scriptConfig, moduleConfig] = Array.isArray(defaultConfig)
	? defaultConfig
	: [defaultConfig, null];

/**
 * wp-scripts discovers block entry points by globbing src/ for block.json, and
 * exposes the result as `entry`. In current versions that is a FUNCTION, so it
 * has to be called and spread — replacing `entry` outright silently disables
 * block discovery.
 *
 * The lookup is skipped entirely when src/ holds no block.json and no top-level
 * index script, because wp-scripts warns ("No entry file discovered…") in that
 * case — which is the normal state of the scaffold before its first block.
 *
 * @param {Function|Object} entry Entry config from a wp-scripts config object.
 * @return {Object} Resolved entry points.
 */
const resolveEntry = (entry) => {
	if (!hasScriptEntryPoints()) {
		return {};
	}

	return typeof entry === "function" ? entry() : entry || {};
};

/**
 * Whether src/ contains anything wp-scripts would build an entry point from.
 *
 * @return {boolean} True when a block.json or an index script is present.
 */
const hasScriptEntryPoints = () =>
	glob(["**/block.json", "index.[jt]s?(x)", "index.m[jt]s"], {
		cwd: SRC_PATH,
		onlyFiles: true,
	}).length > 0;

/**
 * Point a wp-scripts output config at this theme's dist/ directory.
 *
 * @param {Object} output Output config from a wp-scripts config object.
 * @return {Object} Output config writing to dist/.
 */
const distOutput = (output) => ({
	...output,
	path: DIST_PATH,
});

/**
 * Rewrite the SCSS rule so extracted CSS resolves assets relative to dist/css/.
 *
 * @param {Object} module Module config from a wp-scripts config object.
 * @return {Object} Module config with the patched SCSS rule.
 */
const withScssPublicPath = (module) => ({
	...module,
	rules: module.rules.map((rule) => {
		// Modify the rule that handles SCSS files.
		if (!rule.test || !rule.test.toString().includes("scss")) {
			return rule;
		}

		return {
			...rule,
			use: rule.use.map((loader) => {
				// Replace the MiniCssExtractPlugin loader with a custom configuration.
				if (loader.loader && loader.loader.includes("mini-css-extract-plugin")) {
					return {
						loader: loader.loader,
						options: {
							publicPath: "../../",
							esModule: false,
						},
					};
				}
				return loader;
			}),
		};
	}),
});

// Remove the default plugins we want to customize. Note the constructor name is
// `DependencyExtractionWebpackPlugin` — filtering on `DependencyExtractionPlugin`
// never matched, which left the default instance running alongside the custom one.
const scriptPlugins = scriptConfig.plugins.filter(
	(plugin) =>
		plugin.constructor.name !== "MiniCssExtractPlugin" &&
		plugin.constructor.name !== "DependencyExtractionWebpackPlugin"
);

scriptPlugins.push(
	// Add back the MiniCssExtractPlugin with custom configuration.
	new MiniCssExtractPlugin({
		filename: "[name].css",
	}),

	// Add custom DependencyExtractionWebpackPlugin.
	new DependencyExtractionWebpackPlugin({
		injectPolyfill: true,
		outputFormat: "php",
		outputFilename: "[name].asset.php",
	}),

	// wp-scripts' own `**/*.php` copy pattern is narrowed by PhpFilePathsPlugin to
	// PHP files referenced directly from block.json, so a render.php that requires
	// a sibling partial gets copied while the partial is left behind in src/ and
	// fatals at runtime. Copy block sub-partials explicitly. The context is src/
	// (not src/blocks/) so partials land next to the render.php that requires them.
	new CopyWebpackPlugin({
		patterns: [
			{
				from: "**/parts/*.php",
				context: SRC_PATH,
				noErrorOnMissing: true,
			},
		],
	})
);

// The theme's own src/styles/style.scss is an entry point in its own right and
// must stay dist/css/style.css — the name inc/setup.php enqueues. It matches
// wp-scripts' block-style regex, though, so without this it would be re-emitted
// as dist/css/style-style.css. Narrow the group's test to exclude src/styles/.
const defaultStyleCacheGroup = scriptConfig.optimization.splitChunks.cacheGroups.style;

const styleCacheGroup = defaultStyleCacheGroup && {
	...defaultStyleCacheGroup,
	test: (module) => {
		const name = module.nameForCondition && module.nameForCondition();
		return Boolean(name) && !name.startsWith(THEME_STYLES_PATH) && BLOCK_STYLE_TEST.test(name);
	},
};

const scripts = {
	...scriptConfig,
	entry: () => ({
		...resolveEntry(scriptConfig.entry),
		"css/style": path.join(SRC_PATH, "styles/style.scss"),
		"css/editor": path.join(SRC_PATH, "styles/editor.scss"),
	}),
	output: distOutput(scriptConfig.output),
	plugins: scriptPlugins,
	module: withScssPublicPath(scriptConfig.module),
	optimization: {
		...scriptConfig.optimization,
		splitChunks: {
			...scriptConfig.optimization.splitChunks,
			cacheGroups: {
				// Keep wp-scripts' `style` cache group so a block's style.scss still
				// emits as style-index.css, as its block.json expects. Dropping the
				// group entirely — as replacing cacheGroups wholesale would — leaves
				// block.json's "style": "file:./style-index.css" pointing at nothing.
				...scriptConfig.optimization.splitChunks.cacheGroups,
				...(styleCacheGroup && { style: styleCacheGroup }),
				default: false,
			},
		},
	},
};

// The modules config builds `viewScriptModule` entries. It only needs its output
// redirected to dist/ — in particular the splitChunks override above must NOT be
// applied here, because the Interactivity router is pulled in with a dynamic
// import() and needs chunking left alone.
const modules = moduleConfig && {
	...moduleConfig,
	entry: () => resolveEntry(moduleConfig.entry),
	output: distOutput(moduleConfig.output),
};

module.exports = modules ? [scripts, modules] : scripts;
