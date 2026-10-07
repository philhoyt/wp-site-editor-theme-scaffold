<?php
/**
 * Export Site Editor copies of the active theme's templates and parts back to
 * the theme files, so the repository stays the source of truth.
 *
 * A template or part saved in the Site Editor is stored as a wp_template or
 * wp_template_part post and shadows the file of the same slug from then on.
 * This script reports each copy against its file, can write the copy to
 * templates/<slug>.html or parts/<slug>.html (dropping the "theme":"<slug>"
 * attribute the editor adds to template-part references), and can then delete
 * the database copies so the files render again.
 *
 * Usage (the words are positional because WP-CLI rejects unknown --flags on
 * eval-file):
 *   npm run export:templates          # report only (default)
 *   npm run export:templates:write    # write the files, then validate:blocks
 *   npm run export:templates:delete   # validate:blocks, then delete copies whose file matches
 *
 * Exported markup is database content: read the diff before committing it. A
 * copy that inlines a pattern ("patternName") or points a block at a database
 * id ("ref") is flagged, because the file would lose the pattern reference
 * (and its translations) or depend on one site's post ids.
 *
 * Global Styles edits (wp_global_styles) and navigation menus (wp_navigation)
 * are counted but not exported; they are content, not theme files.
 *
 * No declare( strict_types=1 ): `wp eval-file` runs the file through eval(),
 * where the declaration is not the first statement and is a fatal error.
 *
 * @package wpsets
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$wpsets_args   = isset( $args ) && is_array( $args ) ? array_map( fn( $a ) => ltrim( (string) $a, '-' ), $args ) : array();
$wpsets_write  = in_array( 'write', $wpsets_args, true );
$wpsets_delete = in_array( 'delete', $wpsets_args, true );

$wpsets_theme = wp_get_theme();
$wpsets_slug  = $wpsets_theme->get_stylesheet();
$wpsets_dir   = get_stylesheet_directory();

$wpsets_posts = get_posts(
	array(
		'post_type'   => array( 'wp_template', 'wp_template_part' ),
		'post_status' => array( 'publish', 'draft', 'auto-draft' ),
		'numberposts' => -1,
		'orderby'     => 'post_type',
		'order'       => 'ASC',
		'tax_query'   => array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query -- one-off maintenance run.
			array(
				'taxonomy' => 'wp_theme',
				'field'    => 'name',
				'terms'    => $wpsets_slug,
			),
		),
	)
);

WP_CLI::log( sprintf( 'Theme %s (%s)', $wpsets_theme->get( 'Name' ), $wpsets_dir ) );

if ( empty( $wpsets_posts ) ) {
	WP_CLI::success( 'No Site Editor copies of templates or parts. The files are what renders.' );
} else {
	$wpsets_written = 0;
	$wpsets_deleted = 0;
	$wpsets_kept    = 0;

	foreach ( $wpsets_posts as $wpsets_post ) {
		$wpsets_subdir = 'wp_template' === $wpsets_post->post_type ? 'templates' : 'parts';
		$wpsets_file   = $wpsets_dir . '/' . $wpsets_subdir . '/' . $wpsets_post->post_name . '.html';
		$wpsets_label  = $wpsets_subdir . '/' . $wpsets_post->post_name . '.html';

		$wpsets_content = str_replace(
			array( '"theme":"' . $wpsets_slug . '",', ',"theme":"' . $wpsets_slug . '"' ),
			'',
			$wpsets_post->post_content
		);
		$wpsets_content = rtrim( $wpsets_content ) . "\n";

		$wpsets_same = false;
		if ( file_exists( $wpsets_file ) ) {
			$wpsets_existing = (string) file_get_contents( $wpsets_file ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- theme file on disk.
			$wpsets_same     = rtrim( $wpsets_existing ) === rtrim( $wpsets_content );
			$wpsets_state    = $wpsets_same
				? 'same as the file'
				: sprintf( 'differs from the file (%d lines on disk, %d in the editor copy)', count( explode( "\n", $wpsets_existing ) ), count( explode( "\n", $wpsets_content ) ) );
		} else {
			$wpsets_state = 'new; no file yet';
		}

		WP_CLI::log( sprintf( '- %s (post %d, %s, saved %s): %s', $wpsets_label, $wpsets_post->ID, $wpsets_post->post_status, $wpsets_post->post_modified, $wpsets_state ) );

		if ( false !== strpos( $wpsets_content, '"patternName"' ) ) {
			WP_CLI::warning( sprintf( '%s inlines a pattern ("patternName"). Put the <!-- wp:pattern {"slug":"…"} /--> reference back instead of committing the inlined markup.', $wpsets_label ) );
		}
		if ( preg_match( '/"ref":\d+/', $wpsets_content ) ) {
			WP_CLI::warning( sprintf( '%s points a block at a database id ("ref"). That id only exists on this site; remove it before committing.', $wpsets_label ) );
		}

		if ( $wpsets_write && ! $wpsets_same ) {
			if ( ! is_dir( dirname( $wpsets_file ) ) ) {
				wp_mkdir_p( dirname( $wpsets_file ) );
			}
			if ( false === file_put_contents( $wpsets_file, $wpsets_content ) ) { // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents -- theme file on disk.
				WP_CLI::error( sprintf( 'Could not write %s', $wpsets_file ), false );
				continue;
			}
			++$wpsets_written;
		}

		// Only a copy that the file already matches is deleted, so nothing that
		// has not been written (and validated) is lost.
		if ( $wpsets_delete ) {
			if ( $wpsets_same ) {
				wp_delete_post( $wpsets_post->ID, true );
				++$wpsets_deleted;
			} else {
				++$wpsets_kept;
			}
		}
	}

	if ( $wpsets_write ) {
		WP_CLI::success( sprintf( '%d file(s) written to %s. Review the diff; the database copies still shadow the files.', $wpsets_written, $wpsets_dir ) );
	} elseif ( $wpsets_delete ) {
		WP_CLI::success( sprintf( '%d database cop%s deleted; the files render now.', $wpsets_deleted, 1 === $wpsets_deleted ? 'y' : 'ies' ) );
		if ( $wpsets_kept ) {
			WP_CLI::warning( sprintf( '%d cop%s kept because the file differs. Write them first.', $wpsets_kept, 1 === $wpsets_kept ? 'y' : 'ies' ) );
		}
	} else {
		WP_CLI::log( 'Report only: nothing written. npm run export:templates:write writes the files.' );
	}
}

$wpsets_styles = get_posts(
	array(
		'post_type'   => 'wp_global_styles',
		'post_status' => 'any',
		'numberposts' => -1,
		'tax_query'   => array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query -- one-off maintenance run.
			array(
				'taxonomy' => 'wp_theme',
				'field'    => 'name',
				'terms'    => $wpsets_slug,
			),
		),
	)
);
foreach ( $wpsets_styles as $wpsets_style ) {
	$wpsets_style_data = json_decode( $wpsets_style->post_content, true );
	if ( is_array( $wpsets_style_data ) && ( ! empty( $wpsets_style_data['styles'] ) || ! empty( $wpsets_style_data['settings'] ) ) ) {
		WP_CLI::warning( sprintf( 'Global Styles were customised in the editor (post %d, saved %s). Not exported: move the changes into theme.json or a styles/*.json variation by hand, then reset Global Styles in the editor.', $wpsets_style->ID, $wpsets_style->post_modified ) );
	}
}

$wpsets_menus = get_posts(
	array(
		'post_type'   => 'wp_navigation',
		'post_status' => 'publish',
		'numberposts' => -1,
	)
);
if ( ! empty( $wpsets_menus ) ) {
	WP_CLI::log( sprintf( '%d navigation menu(s) in the database (wp_navigation); menus are content and stay there.', count( $wpsets_menus ) ) );
}
