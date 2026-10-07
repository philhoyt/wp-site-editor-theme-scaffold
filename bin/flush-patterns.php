<?php
/**
 * Clear the active theme's pattern cache and report how many patterns register.
 *
 * WordPress caches the files under patterns/ in a site transient keyed to the
 * theme version, so a new or renamed pattern file does not register until
 * Version changes. Run through WP-CLI:
 *
 *   npm run patterns:flush
 *   bin/wp.sh eval-file bin/flush-patterns.php
 *
 * Defining WP_DEVELOPMENT_MODE as 'theme' on the dev site turns the cache off.
 *
 * @package wpsets
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$wpsets_theme = wp_get_theme();

if ( is_callable( array( $wpsets_theme, 'delete_pattern_cache' ) ) ) {
	$wpsets_theme->delete_pattern_cache();
} else {
	// Not public in every release inside the supported range.
	$wpsets_method = new ReflectionMethod( $wpsets_theme, 'delete_pattern_cache' );
	$wpsets_method->setAccessible( true );
	$wpsets_method->invoke( $wpsets_theme );
}

WP_CLI::success(
	sprintf(
		'%d patterns registered for %s.',
		count( $wpsets_theme->get_block_patterns() ),
		$wpsets_theme->get_stylesheet()
	)
);
