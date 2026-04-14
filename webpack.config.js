const defaultConfig = require("@wordpress/scripts/config/webpack.config");
const path = require("path");
const DependencyExtractionWebpackPlugin = require("@wordpress/dependency-extraction-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

// Remove the default plugins we want to customize.
const plugins = defaultConfig.plugins.filter(
	(plugin) =>
		plugin.constructor.name !== "MiniCssExtractPlugin" &&
		plugin.constructor.name !== "DependencyExtractionPlugin"
);

// Custom entry configuration to separate CSS outputs.
const entry = {
	"css/style": path.resolve(__dirname, "src/styles/style.scss"),
	"css/editor": path.resolve(__dirname, "src/styles/editor.scss"),
};

module.exports = {
	...defaultConfig,
	entry,
	output: {
		filename: "[name].js",
		path: path.resolve(__dirname, "dist"),
	},
	plugins,
	module: {
		...defaultConfig.module,
		rules: [
			...defaultConfig.module.rules.map((rule) => {
				// Modify the rule that handles SCSS files.
				if (rule.test && rule.test.toString().includes("scss")) {
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
				}
				return rule;
			}),
		],
	},
	optimization: {
		...defaultConfig.optimization,
		splitChunks: {
			cacheGroups: {
				default: false,
			},
		},
	},
};

// Add back the MiniCssExtractPlugin with custom configuration.
module.exports.plugins.push(
	new MiniCssExtractPlugin({
		filename: "[name].css",
	})
);

// Add custom DependencyExtractionWebpackPlugin.
module.exports.plugins.push(
	new DependencyExtractionWebpackPlugin({
		injectPolyfill: true,
		outputFormat: "php",
		outputFilename: "[name].asset.php",
	})
);
