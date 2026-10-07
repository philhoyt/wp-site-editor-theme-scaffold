<?php
/**
 * Title: Comments
 * Slug: wpsets/comments
 * Categories: text
 * Block Types: core/comments
 * Description: Comment list with a heading, author lines, comment bubbles, pagination and the comment form.
 *
 * @package wpsets
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

?>
<!-- wp:comments {"className":"wp-block-comments-query-loop","style":{"spacing":{"margin":{"top":"var:preset|spacing|xl","bottom":"var:preset|spacing|xl"}}}} -->
<div class="wp-block-comments wp-block-comments-query-loop" style="margin-top:var(--wp--preset--spacing--xl);margin-bottom:var(--wp--preset--spacing--xl)"><!-- wp:group {"metadata":{"name":"Comments Heading"},"style":{"spacing":{"blockGap":"var:preset|spacing|xs","margin":{"bottom":"var:preset|spacing|l"}}},"layout":{"type":"default"}} -->
<div class="wp-block-group" style="margin-bottom:var(--wp--preset--spacing--l)"><!-- wp:heading {"fontSize":"xl"} -->
<h2 class="wp-block-heading has-xl-font-size"><?php esc_html_e( 'Comments', 'wpsets' ); ?></h2>
<!-- /wp:heading -->

<!-- wp:comments-title {"level":3} /--></div>
<!-- /wp:group -->

<!-- wp:comment-template -->
<!-- wp:group {"metadata":{"name":"Comment"},"style":{"spacing":{"blockGap":"var:preset|spacing|xs","margin":{"top":"0","bottom":"var:preset|spacing|l"}}},"layout":{"type":"default"}} -->
<div class="wp-block-group" style="margin-top:0;margin-bottom:var(--wp--preset--spacing--l)"><!-- wp:group {"metadata":{"name":"Author Line"},"style":{"spacing":{"blockGap":"var:preset|spacing|s"}},"layout":{"type":"flex","flexWrap":"nowrap","verticalAlignment":"center"}} -->
<div class="wp-block-group"><!-- wp:avatar {"size":40} /-->

<!-- wp:group {"metadata":{"name":"Name and Meta"},"style":{"spacing":{"blockGap":"0"}},"layout":{"type":"default"}} -->
<div class="wp-block-group"><!-- wp:comment-author-name /-->

<!-- wp:group {"metadata":{"name":"Date, Reply, Edit"},"style":{"spacing":{"blockGap":"0"}},"layout":{"type":"flex","flexWrap":"wrap"}} -->
<div class="wp-block-group"><!-- wp:comment-date /-->

<!-- wp:comment-reply-link {"className":"dot-before"} /-->

<!-- wp:comment-edit-link {"className":"dot-before"} /--></div>
<!-- /wp:group --></div>
<!-- /wp:group --></div>
<!-- /wp:group -->

<!-- wp:comment-content /--></div>
<!-- /wp:group -->
<!-- /wp:comment-template -->

<!-- wp:comments-pagination {"paginationArrow":"arrow","layout":{"type":"flex","justifyContent":"space-between"}} -->
<!-- wp:comments-pagination-previous /-->

<!-- wp:comments-pagination-numbers /-->

<!-- wp:comments-pagination-next /-->
<!-- /wp:comments-pagination -->

<!-- wp:post-comments-form {"style":{"spacing":{"margin":{"top":"var:preset|spacing|xl"}}}} /--></div>
<!-- /wp:comments -->
