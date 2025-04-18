const defaultConfig = require('@wordpress/scripts/config/webpack.config');
const path = require('path');
const DependencyExtractionWebpackPlugin = require('@wordpress/dependency-extraction-webpack-plugin');

// Remove the default plugins we want to customize
const plugins = defaultConfig.plugins.filter(
	plugin => 
		plugin.constructor.name !== 'MiniCssExtractPlugin' && 
		plugin.constructor.name !== 'DependencyExtractionPlugin'
);

// Custom entry configuration to separate JS and CSS
const entry = {
	'js/theme': path.resolve(__dirname, 'src/scripts/theme.js'),
	'css/style': path.resolve(__dirname, 'src/styles/style.scss'),
	'css/editor': path.resolve(__dirname, 'src/styles/editor.scss'),
};

module.exports = {
	...defaultConfig,
	entry,
	output: {
		filename: '[name].js',
		path: path.resolve(__dirname, 'dist'),
	},
	plugins: plugins,
	module: {
		...defaultConfig.module,
		rules: [
			...defaultConfig.module.rules.map(rule => {
				// Modify the rule that handles SCSS files
				if (rule.test && rule.test.toString().includes('scss')) {
					return {
						...rule,
						use: rule.use.map(loader => {
							// Replace the MiniCssExtractPlugin loader with a custom configuration
							if (loader.loader && loader.loader.includes('mini-css-extract-plugin')) {
								return {
									loader: loader.loader,
									options: {
										publicPath: '../../',
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
				default: false, // Disable the default behavior
			},
		},
	},
};

// Add back the MiniCssExtractPlugin with custom configuration
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
module.exports.plugins.push(
	new MiniCssExtractPlugin({
		filename: '[name].css',
	})
);

// Add custom DependencyExtractionWebpackPlugin
module.exports.plugins.push(
	new DependencyExtractionWebpackPlugin({
		injectPolyfill: true,
		outputFormat: 'php',
		outputFilename: '[name].asset.php',
	})
);