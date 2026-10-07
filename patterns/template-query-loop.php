<?php
/**
 * Title: Posts list
 * Slug: wpsets/template-query-loop
 * Categories: query, posts
 * Block Types: core/query
 * Description: Default post list with featured image, title, content, meta, and pagination.
 * Viewport Width: 1280
 *
 * @package wpsets
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

?>
<!-- wp:query {"queryId":0,"query":{"perPage":10,"pages":0,"offset":0,"postType":"post","order":"desc","orderBy":"date","author":"","search":"","exclude":[],"sticky":"","inherit":true,"taxQuery":null,"parents":[]},"layout":{"type":"constrained"}} -->
<div class="wp-block-query"><!-- wp:post-template {"layout":{"type":"default"}} -->
<!-- wp:group {"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|l"}}}} -->
<div class="wp-block-group" style="margin-bottom:var(--wp--preset--spacing--l)"><!-- wp:post-title {"isLink":true} /-->

<!-- wp:post-featured-image {"isLink":true} /-->

<!-- wp:post-content /-->

<!-- wp:group {"fontSize":"xs","layout":{"type":"flex"}} -->
<div class="wp-block-group has-xs-font-size"><!-- wp:post-author {"showAvatar":false,"showBio":false} /-->

<!-- wp:post-date {"isLink":true} /-->

<!-- wp:post-terms {"term":"category"} /-->

<!-- wp:post-terms {"term":"post_tag"} /--></div>
<!-- /wp:group --></div>
<!-- /wp:group -->
<!-- /wp:post-template -->

<!-- wp:group {"layout":{"type":"constrained"}} -->
<div class="wp-block-group"><!-- wp:query-pagination -->
<!-- wp:query-pagination-previous /-->

<!-- wp:query-pagination-numbers /-->

<!-- wp:query-pagination-next /-->
<!-- /wp:query-pagination --></div>
<!-- /wp:group -->

<!-- wp:query-no-results -->
<!-- wp:paragraph -->
<p><?php echo esc_html_x( 'No posts were found.', 'Message shown when a query returns nothing.', 'wpsets' ); ?></p>
<!-- /wp:paragraph -->
<!-- /wp:query-no-results --></div>
<!-- /wp:query -->
