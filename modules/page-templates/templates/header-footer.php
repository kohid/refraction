<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

\Refraction\Plugin::$instance->frontend->add_body_class( 'refraction-template-full-width' );

// A block theme has no header.php or footer.php: its header and footer are template parts. They are rendered before
// wp_head() so the styles of their blocks are printed in the head.
$refraction_block_theme = function_exists( 'wp_is_block_theme' ) && wp_is_block_theme();

if ( $refraction_block_theme ) {
	ob_start();
	block_template_part( 'header' );
	$refraction_header = ob_get_clean();
	ob_start();
	block_template_part( 'footer' );
	$refraction_footer = ob_get_clean();
	?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
	<?php wp_body_open(); ?>
<div class="wp-site-blocks">
	<?php
	echo $refraction_header; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- The theme's own blocks.
} else {
	get_header();
}
/**
 * Before Header-Footer page template content.
 *
 * Fires before the content of Refraction Header-Footer page template.
 *
 * @since 2.0.0
 */
do_action( 'refraction/page_templates/header-footer/before_content' );

\Refraction\Plugin::$instance->modules_manager->get_modules( 'page-templates' )->print_content();

/**
 * After Header-Footer page template content.
 *
 * Fires after the content of Refraction Header-Footer page template.
 *
 * @since 2.0.0
 */
do_action( 'refraction/page_templates/header-footer/after_content' );

if ( $refraction_block_theme ) {
	echo $refraction_footer; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- The theme's own blocks.
	echo '</div>';
	wp_footer();
	echo '</body></html>';
} else {
	get_footer();
}
