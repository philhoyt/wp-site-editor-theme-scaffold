<?php
/**
 * Seed a development site with content for screenshots, navigation, comment
 * and smoke testing. Run it through WP-CLI with `npm run seed`, or
 * `bin/wp.sh eval-file bin/seed-content.php`.
 *
 * Safe to re-run: anything it already created (matched by slug) is skipped.
 * It also turns on threaded, paginated comments (five per page) so comment
 * pagination and deep replies render, and sets pretty permalinks.
 *
 * bin/smoke.js depends on these slugs; keep the two in step:
 *   smoke-paged          a classic post split with <!--nextpage-->
 *   smoke-locked         a password-protected post with an approved comment
 *   smoke-page-comments  a page with comments open and one comment
 *   smoke-classic        classic-editor markup: caption, floated image, [gallery]
 *
 * Featured images are generated with GD; without GD the posts are seeded with
 * no images.
 *
 * No declare( strict_types=1 ): `wp eval-file` runs the file through eval(),
 * where the declaration is not the first statement and is a fatal error.
 *
 * @package wpsets
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once ABSPATH . 'wp-admin/includes/image.php';
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/taxonomy.php';

/**
 * Create (once) a gradient PNG attachment and return its id.
 *
 * @param string $slug Attachment slug stem.
 * @param int[]  $from Top colour as RGB.
 * @param int[]  $to   Bottom colour as RGB.
 * @return int Attachment id, or 0 when GD is unavailable.
 */
function wpsets_seed_image( $slug, $from, $to ) {
	$slug     = $slug . '-image'; // Keep attachment slugs distinct from post slugs.
	$existing = get_posts(
		array(
			'post_type'      => 'attachment',
			'name'           => $slug,
			'posts_per_page' => 1,
			'post_status'    => 'inherit',
		)
	);
	if ( $existing ) {
		return $existing[0]->ID;
	}
	if ( ! function_exists( 'imagecreatetruecolor' ) ) {
		return 0;
	}

	$width  = 1600;
	$height = 900;
	$image  = imagecreatetruecolor( $width, $height );
	for ( $y = 0; $y < $height; $y++ ) {
		$t = $y / $height;
		imageline(
			$image,
			0,
			$y,
			$width,
			$y,
			imagecolorallocate(
				$image,
				(int) ( $from[0] + ( $to[0] - $from[0] ) * $t ),
				(int) ( $from[1] + ( $to[1] - $from[1] ) * $t ),
				(int) ( $from[2] + ( $to[2] - $from[2] ) * $t )
			)
		);
	}

	$upload = wp_upload_dir();
	$path   = trailingslashit( $upload['path'] ) . $slug . '.png';
	imagepng( $image, $path );

	$id = wp_insert_attachment(
		array(
			'post_mime_type' => 'image/png',
			'post_title'     => $slug,
			'post_name'      => $slug,
			'post_status'    => 'inherit',
		),
		$path
	);
	wp_update_attachment_metadata( $id, wp_generate_attachment_metadata( $id, $path ) );

	return $id;
}

/**
 * Create (once) a post or page and return its id.
 *
 * @param array $args  wp_insert_post() arguments; post_name is required.
 * @param int   $image Featured image id, or 0.
 * @return int Post id.
 */
function wpsets_seed_post( $args, $image = 0 ) {
	$type     = isset( $args['post_type'] ) ? $args['post_type'] : 'post';
	$existing = get_posts(
		array(
			'post_type'      => $type,
			'name'           => $args['post_name'],
			'posts_per_page' => 1,
			'post_status'    => 'any',
		)
	);
	if ( $existing ) {
		WP_CLI::log( "skip {$type}: {$args['post_name']}" );
		return $existing[0]->ID;
	}

	$id = wp_insert_post(
		array_merge(
			array(
				'post_status' => 'publish',
				'post_author' => 1,
			),
			$args
		)
	);
	if ( $image ) {
		set_post_thumbnail( $id, $image );
	}
	WP_CLI::log( "created {$type}: {$args['post_name']} (#{$id})" );

	return $id;
}

/**
 * Add an approved comment.
 *
 * @param int    $post_id Post id.
 * @param string $author  Author name.
 * @param string $content Comment text.
 * @param int    $parent_id Parent comment id.
 * @param int    $age     Age in minutes, so the order is stable.
 * @return int Comment id.
 */
function wpsets_seed_comment( $post_id, $author, $content, $parent_id = 0, $age = 0 ) {
	return (int) wp_insert_comment(
		array(
			'comment_post_ID'      => $post_id,
			'comment_author'       => $author,
			'comment_author_email' => strtolower( $author ) . '@example.com',
			'comment_content'      => $content,
			'comment_parent'       => $parent_id,
			'comment_approved'     => 1,
			'comment_date'         => gmdate( 'Y-m-d H:i:s', time() - $age * 60 ),
		)
	);
}

// Site settings: threaded, paginated comments and pretty permalinks.
update_option( 'thread_comments', 1 );
update_option( 'thread_comments_depth', 5 );
update_option( 'page_comments', 1 );
update_option( 'comments_per_page', 5 );
if ( ! get_option( 'permalink_structure' ) ) {
	update_option( 'permalink_structure', '/%postname%/' );
}

$wpsets_notes  = wp_create_category( 'Notes' );
$wpsets_design = wp_create_category( 'Design' );

$wpsets_body = '<!-- wp:paragraph --><p>Vivamus dui risus, convallis eu pretium in, ultrices a urna. Sed velit dui, facilisis ac ipsum vel, auctor viverra nunc. Ut viverra sed diam id vestibulum. Nulla condimentum est lectus, eu ultrices lorem elementum in.</p><!-- /wp:paragraph -->'
	. '<!-- wp:heading --><h2 class="wp-block-heading">A second thought</h2><!-- /wp:heading -->'
	. '<!-- wp:paragraph --><p>Ut tempus nec felis ut ultrices. Duis sit amet lacus vel nisl posuere gravida. <a href="#">A link inside the text</a>.</p><!-- /wp:paragraph -->'
	. '<!-- wp:quote --><blockquote class="wp-block-quote"><!-- wp:paragraph --><p>Keep it simple, keep it readable.</p><!-- /wp:paragraph --><cite>Someone, somewhere</cite></blockquote><!-- /wp:quote -->'
	. '<!-- wp:buttons --><div class="wp-block-buttons"><!-- wp:button --><div class="wp-block-button"><a class="wp-block-button__link wp-element-button">Fill button</a></div><!-- /wp:button --><!-- wp:button {"className":"is-style-outline"} --><div class="wp-block-button is-style-outline"><a class="wp-block-button__link wp-element-button">Outline button</a></div><!-- /wp:button --></div><!-- /wp:buttons -->';

// Posts: title, slug, gradient (or null), category, tags, age in days.
$wpsets_posts = array(
	array( 'Sleep important, say experts', 'sleep-important-say-experts', array( array( 137, 148, 153 ), array( 54, 69, 79 ) ), $wpsets_notes, array( 'notes' ), 3 ),
	array( 'A slow morning in the workshop', 'a-slow-morning-in-the-workshop', array( array( 229, 228, 226 ), array( 137, 148, 153 ) ), $wpsets_design, array( 'craft' ), 6 ),
	array( 'What a long title teaches about wrapping, measure, and the space a heading needs on a phone', 'what-a-long-title-teaches', array( array( 54, 69, 79 ), array( 0, 0, 0 ) ), $wpsets_design, array( 'typography' ), 9 ),
	array( 'A post without a featured image', 'a-post-without-a-featured-image', null, $wpsets_notes, array(), 15 ),
	array( 'Older thoughts on quiet interfaces', 'older-thoughts-on-quiet-interfaces', array( array( 180, 190, 200 ), array( 60, 70, 80 ) ), $wpsets_design, array( 'notes' ), 40 ),
);

$wpsets_first = 0;
foreach ( $wpsets_posts as $wpsets_i => $wpsets_post ) {
	$wpsets_id = wpsets_seed_post(
		array(
			'post_title'    => $wpsets_post[0],
			'post_name'     => $wpsets_post[1],
			'post_content'  => $wpsets_body,
			'post_excerpt'  => 0 === $wpsets_i ? 'A hand-written excerpt, shown instead of the automatic one.' : '',
			'post_date'     => gmdate( 'Y-m-d H:i:s', time() - $wpsets_post[5] * DAY_IN_SECONDS ),
			'post_category' => array( $wpsets_post[3] ),
			'tags_input'    => $wpsets_post[4],
		),
		$wpsets_post[2] ? wpsets_seed_image( $wpsets_post[1], $wpsets_post[2][0], $wpsets_post[2][1] ) : 0
	);
	if ( 1 === $wpsets_i ) {
		stick_post( $wpsets_id );
	}
	if ( 0 === $wpsets_i ) {
		$wpsets_first = $wpsets_id;
	}
}

// Comments on the first post: seven top-level (two pages at five per page)
// and a reply chain five levels deep.
if ( $wpsets_first && 0 === (int) get_comments_number( $wpsets_first ) ) {
	$wpsets_names = array( 'Ada', 'Grace', 'Linus', 'Margaret', 'Alan', 'Barbara', 'Ken' );
	foreach ( $wpsets_names as $wpsets_n => $wpsets_name ) {
		$wpsets_comment = wpsets_seed_comment( $wpsets_first, $wpsets_name, "Top-level comment number {$wpsets_n}, with a sentence long enough to wrap at the content width.", 0, 1000 - $wpsets_n * 10 );
		if ( 0 === $wpsets_n ) {
			$wpsets_parent = $wpsets_comment;
			for ( $wpsets_depth = 2; $wpsets_depth <= 5; $wpsets_depth++ ) {
				$wpsets_parent = wpsets_seed_comment( $wpsets_first, 'Replier', "A reply at depth {$wpsets_depth}.<ol><li>An ordered list</li><li>inside a comment</li></ol>", $wpsets_parent, 900 - $wpsets_depth );
			}
		}
	}
	WP_CLI::log( 'created comments on the first post' );
}

// Smoke-test content (bin/smoke.js).
wpsets_seed_post(
	array(
		'post_title'   => 'Smoke: paged classic post',
		'post_name'    => 'smoke-paged',
		'post_content' => "<p>Page one of a classic post.</p>\n<!--nextpage-->\n<p>Page two.</p>\n<!--nextpage-->\n<p>Page three.</p>",
	)
);

$wpsets_locked = wpsets_seed_post(
	array(
		'post_title'    => 'Smoke: password-protected post',
		'post_name'     => 'smoke-locked',
		'post_password' => 'smoke',
		'post_content'  => '<!-- wp:paragraph --><p>Only visible with the password.</p><!-- /wp:paragraph -->',
	)
);
if ( 0 === (int) get_comments_number( $wpsets_locked ) ) {
	wpsets_seed_comment( $wpsets_locked, 'Ada', 'A comment that must stay hidden until the post is unlocked.' );
}

$wpsets_page_comments = wpsets_seed_post(
	array(
		'post_type'      => 'page',
		'post_title'     => 'Smoke: page with comments',
		'post_name'      => 'smoke-page-comments',
		'comment_status' => 'open',
		'post_content'   => '<!-- wp:paragraph --><p>A page with comments open.</p><!-- /wp:paragraph -->',
	)
);
if ( 0 === (int) get_comments_number( $wpsets_page_comments ) ) {
	wpsets_seed_comment( $wpsets_page_comments, 'Grace', 'A comment on a page.' );
}

$wpsets_img_a = wpsets_seed_image( 'smoke-classic-a', array( 137, 148, 153 ), array( 54, 69, 79 ) );
$wpsets_img_b = wpsets_seed_image( 'smoke-classic-b', array( 229, 228, 226 ), array( 137, 148, 153 ) );
$wpsets_src_a = $wpsets_img_a ? wp_get_attachment_image_url( $wpsets_img_a, 'full' ) : 'https://example.com/missing.png';
wpsets_seed_post(
	array(
		'post_title'   => 'Smoke: classic editor content',
		'post_name'    => 'smoke-classic',
		'post_content' => '[caption id="" align="alignnone" width="1600"]<img src="' . esc_url( $wpsets_src_a ) . '" width="1600" height="900" alt="A wide captioned image" /> A caption wider than a phone[/caption]'
			. "\n\n" . '<img class="alignleft" src="' . esc_url( $wpsets_src_a ) . '" width="1600" height="900" alt="A floated image" />Text beside a floated image, long enough to wrap around it on a wide screen and to show the half-width cap on a phone.'
			. "\n\n" . '[gallery columns="4" ids="' . (int) $wpsets_img_a . ',' . (int) $wpsets_img_b . ',' . (int) $wpsets_img_a . ',' . (int) $wpsets_img_b . '"]'
			. "\n\n" . 'Supercalifragilisticexpialidociouswithoutanywheretobreakthislongwordonaphonescreen.',
	)
);

// Pages, with a tree three levels deep so the page-list navigation renders
// submenus.
$wpsets_about = wpsets_seed_post(
	array(
		'post_type'    => 'page',
		'post_title'   => 'About',
		'post_name'    => 'about',
		'post_content' => '<!-- wp:paragraph --><p>The about page.</p><!-- /wp:paragraph -->',
	)
);
$wpsets_team  = wpsets_seed_post(
	array(
		'post_type'    => 'page',
		'post_title'   => 'Team',
		'post_name'    => 'team',
		'post_parent'  => $wpsets_about,
		'post_content' => '<!-- wp:paragraph --><p>A child page.</p><!-- /wp:paragraph -->',
	)
);
wpsets_seed_post(
	array(
		'post_type'    => 'page',
		'post_title'   => 'History',
		'post_name'    => 'history',
		'post_parent'  => $wpsets_about,
		'post_content' => '<!-- wp:paragraph --><p>A second child page.</p><!-- /wp:paragraph -->',
	)
);
wpsets_seed_post(
	array(
		'post_type'    => 'page',
		'post_title'   => 'Leads',
		'post_name'    => 'leads',
		'post_parent'  => $wpsets_team,
		'post_content' => '<!-- wp:paragraph --><p>A third-level page.</p><!-- /wp:paragraph -->',
	)
);
wpsets_seed_post(
	array(
		'post_type'     => 'page',
		'post_title'    => 'No title template',
		'post_name'     => 'no-title-template',
		'page_template' => 'page-no-title',
		'post_content'  => '<!-- wp:paragraph --><p>This page uses the Page without title template.</p><!-- /wp:paragraph -->',
	)
);

flush_rewrite_rules();
WP_CLI::success( 'Seed complete.' );
