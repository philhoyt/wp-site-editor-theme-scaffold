<?php
/**
 * Theme setup.
 *
 * @package wpsets
 */

namespace WPSETS\Setup;

/**
 * Sets up theme defaults and registers support for various WordPress features.
 *
 * Note that this function is hooked into the after_setup_theme hook, which
 * runs before the init hook. The init hook is too late for some features, such
 * as indicating support for post thumbnails.
 */
function setup() {
	/**
	 * Make theme available for translation.
	 * Translations can be filed in the /languages/ directory.
	 */
	load_theme_textdomain( 'wpsets', get_template_directory() . '/languages' );

	// Add default posts and comments RSS feed links to head.
	add_theme_support( 'automatic-feed-links' );

	/**
	 * Let WordPress manage the document title.
	 * By adding theme support, we declare that this theme does not use a
	 * hard-coded <title> tag in the document head, and expect WordPress to
	 * provide it for us.
	 */
	add_theme_support( 'title-tag' );

	// Add support for responsive video embeds.
	add_theme_support( 'responsive-embeds' );

	// Remove core block patterns if you're providing your own in the patterns directory.
	remove_theme_support( 'core-block-patterns' );
}
add_action( 'after_setup_theme', __NAMESPACE__ . '\\setup' );


/**
 * Enqueue scripts and styles.
 */
function enqueue_scripts_and_styles() {
	// Get style asset info.
	$style_asset = require get_template_directory() . '/dist/css/style.asset.php';

	// Enqueue main stylesheet.
	wp_enqueue_style(
		'wpsets-style',
		get_template_directory_uri() . '/dist/css/style.css',
		array(),
		$style_asset['version']
	);

	// Get script asset info.
	$script_asset = require get_template_directory() . '/dist/js/theme.asset.php';

	// Enqueue theme script.
	wp_enqueue_script(
		'wpsets-script',
		get_template_directory_uri() . '/dist/js/theme.js',
		$script_asset['dependencies'],
		$script_asset['version'],
		true
	);
}
add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\\enqueue_scripts_and_styles' );

/**
 * Add Editor Styles.
 */
function add_editor_styles() {
	// Add theme support for editor styles.
	add_theme_support( 'editor-styles' );

	// Enqueue editor styles.
	add_editor_style( get_template_directory_uri() . '/dist/css/editor.css' );
}
add_action( 'after_setup_theme', __NAMESPACE__ . '\\add_editor_styles' );
