<?php
/**
 * Title: Post navigation
 * Slug: wpsets/post-navigation
 * Categories: text
 * Block Types: core/post-navigation-link
 * Description: Previous and next post links.
 *
 * @package wpsets
 */

?>
<!-- wp:group {"align":"wide","style":{"spacing":{"margin":{"top":"var:preset|spacing|l","bottom":"var:preset|spacing|l"}}},"layout":{"type":"default"}} -->
<div class="wp-block-group alignwide" style="margin-top:var(--wp--preset--spacing--l);margin-bottom:var(--wp--preset--spacing--l)"><!-- wp:group {"tagName":"nav","align":"wide","style":{"border":{"top":{"color":"var:preset|color|contrast-medium","width":"1px"}},"spacing":{"padding":{"top":"var:preset|spacing|s","bottom":"var:preset|spacing|s"}}},"layout":{"type":"flex","flexWrap":"nowrap","justifyContent":"space-between"},"ariaLabel":"<?php esc_attr_e( 'Post navigation', 'wpsets' ); ?>"} -->
<nav class="wp-block-group alignwide" aria-label="<?php esc_attr_e( 'Post navigation', 'wpsets' ); ?>" style="border-top-color:var(--wp--preset--color--contrast-medium);border-top-width:1px;padding-top:var(--wp--preset--spacing--s);padding-bottom:var(--wp--preset--spacing--s)"><!-- wp:post-navigation-link {"type":"previous","showTitle":true,"arrow":"arrow"} /-->

<!-- wp:post-navigation-link {"showTitle":true,"arrow":"arrow"} /--></nav>
<!-- /wp:group --></div>
<!-- /wp:group -->
