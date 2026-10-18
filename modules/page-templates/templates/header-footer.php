<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

\Refraction\Plugin::$instance->frontend->add_body_class( 'refraction-template-full-width' );

get_header();
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

get_footer();
