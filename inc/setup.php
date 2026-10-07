<?php
/**
 * Theme setup.
 *
 * @package wpsets
 */

namespace WPSETS\Setup;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Sets up theme defaults and registers support for various WordPress features.
 *
 * Note that this function is hooked into the after_setup_theme hook, which
 * runs before the init hook. The init hook is too late for some features, such
 * as indicating support for post thumbnails.
 *
 * @since 0.0.0
 * @return void
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

	// Add support for post thumbnails.
	add_theme_support( 'post-thumbnails' );

	// Remove core block patterns if you're providing your own in the patterns directory.
	remove_theme_support( 'core-block-patterns' );
}
add_action( 'after_setup_theme', __NAMESPACE__ . '\\setup' );


/**
 * Enqueue scripts and styles for the front-end.
 *
 * Loads the main stylesheet with proper versioning from the build process.
 * Falls back to the theme version if the asset file doesn't exist.
 *
 * @since 0.0.0
 * @return void
 */
function enqueue_scripts_and_styles() {
	// Get style asset info.
	$style_asset_path = get_template_directory() . '/dist/css/style.asset.php';
	// The files load from the parent theme, so fall back to its version, not a
	// child theme's.
	$style_asset = array(
		'version' => wp_get_theme( get_template() )->get( 'Version' ),
	);

	if ( file_exists( $style_asset_path ) ) {
		$style_asset = require $style_asset_path;
	}

	// Enqueue main stylesheet.
	wp_enqueue_style(
		'wpsets-style',
		get_template_directory_uri() . '/dist/css/style.css',
		array(),
		$style_asset['version']
	);

	// wp-scripts emits dist/css/style-rtl.css alongside; serve it for RTL locales.
	wp_style_add_data( 'wpsets-style', 'rtl', 'replace' );
}
add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\\enqueue_scripts_and_styles' );

/**
 * Add editor styles support and enqueue editor stylesheet.
 *
 * Enables theme support for editor styles and loads the editor-specific
 * stylesheet for the block editor.
 *
 * @since 0.0.0
 * @return void
 */
function add_editor_styles() {
	// Add theme support for editor styles.
	add_theme_support( 'editor-styles' );

	// Enqueue editor styles.
	add_editor_style( 'dist/css/editor.css' );
}
add_action( 'after_setup_theme', __NAMESPACE__ . '\\add_editor_styles' );

/**
 * Add page links to a paginated post written in the classic editor.
 *
 * The Post Content block prints wp_link_pages() only when the post contains a
 * Page Break block. A classic `<!--nextpage-->` marker still splits the post
 * into pages, which are then left with no links between them. The links go
 * inside the block's wrapper, where core puts them for a Page Break.
 *
 * @since 0.0.0
 * @param string $content Rendered post content block.
 * @return string
 */
function append_classic_page_links( $content ) {
	global $multipage;

	if ( ! $multipage || '' === $content || has_block( 'core/nextpage' ) ) {
		return $content;
	}

	$closing_tag = strrpos( $content, '</' );
	if ( false === $closing_tag ) {
		return $content;
	}

	return substr_replace( $content, wp_link_pages( array( 'echo' => 0 ) ), $closing_tag, 0 );
}
add_filter( 'render_block_core/post-content', __NAMESPACE__ . '\\append_classic_page_links' );

/**
 * Hide the comments section of a password-protected post until it is unlocked.
 *
 * Core withholds the comments themselves but still prints the Comments block's
 * heading, which leaves a "Comments" title with nothing under it.
 *
 * @since 0.0.0
 * @param string    $block_content Rendered block HTML.
 * @param array     $block         Parsed block.
 * @param \WP_Block $instance      Block instance.
 * @return string
 */
function hide_locked_comments( $block_content, $block, $instance ) {
	$post_id = isset( $instance->context['postId'] ) ? $instance->context['postId'] : get_the_ID();

	return post_password_required( $post_id ) ? '' : $block_content;
}
add_filter( 'render_block_core/comments', __NAMESPACE__ . '\\hide_locked_comments', 10, 3 );

/**
 * Merge a fallback Page List into the navigation's own list.
 *
 * When a Navigation block falls back to a Page List (no menu chosen, or a
 * menu that is only a Page List), core renders the list's own <ul> directly
 * inside the navigation's <ul>. A list may only contain list items (WCAG
 * 1.3.1; axe "list"), so the inner <ul> is merged into the outer one. Submenus
 * close as </ul></li>, so the first </ul></ul> is the page list's end.
 *
 * @since 0.0.0
 * @param string $content Rendered navigation block.
 * @return string
 */
function unwrap_page_list_in_navigation( $content ) {
	$opened = preg_replace(
		'#<ul class="wp-block-navigation__container([^"]*)">\s*<ul class="wp-block-page-list">#',
		'<ul class="wp-block-navigation__container$1 wp-block-page-list">',
		$content,
		1,
		$count
	);

	if ( 1 !== $count ) {
		return $content;
	}

	$closed = preg_replace( '#</ul>\s*</ul>#', '</ul>', $opened, 1, $count );

	return 1 === $count ? $closed : $content;
}
add_filter( 'render_block_core/navigation', __NAMESPACE__ . '\\unwrap_page_list_in_navigation' );

/**
 * Mark a button with the `is-current` class as the current page.
 *
 * The Button block has no aria-current attribute, so writing one into saved
 * markup would fail block validation. A pattern marks the current button
 * with the class (a category row, a tab strip) and this adds the attribute on
 * output.
 *
 * @since 0.0.0
 * @param string $block_content Rendered block HTML.
 * @param array  $block         Parsed block.
 * @return string
 */
function mark_current_button( $block_content, $block ) {
	$class_name = isset( $block['attrs']['className'] ) ? (string) $block['attrs']['className'] : '';
	if ( ! in_array( 'is-current', preg_split( '/\s+/', $class_name, -1, PREG_SPLIT_NO_EMPTY ), true ) ) {
		return $block_content;
	}

	$processor = new \WP_HTML_Tag_Processor( $block_content );
	if ( $processor->next_tag( array( 'class_name' => 'wp-block-button__link' ) ) ) {
		$processor->set_attribute( 'aria-current', 'page' );
	}

	return $processor->get_updated_html();
}
add_filter( 'render_block_core/button', __NAMESPACE__ . '\\mark_current_button', 10, 2 );
