<?php
/**
 * Template functions for themes that place the Theme Builder header and footer themselves.
 *
 * A classic theme that calls these from its own header.php / footer.php declares
 * `add_theme_support( 'refraction-theme-builder' )` so Refraction does not replace header.php and
 * footer.php automatically.
 */

use Refraction\Modules\ThemeBuilder\Classes\Locations_Manager;
use Refraction\Modules\ThemeBuilder\Module;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

if ( ! function_exists( 'refraction_theme_builder_header' ) ) {
	/**
	 * Print the Refraction header that matches this request.
	 *
	 * @return bool True when a Refraction header was printed; otherwise print the theme's own header.
	 */
	function refraction_theme_builder_header(): bool {
		return Module::instance()->get_locations_manager()->print_location( Locations_Manager::HEADER );
	}
}

if ( ! function_exists( 'refraction_theme_builder_footer' ) ) {
	/**
	 * Print the Refraction footer that matches this request.
	 *
	 * @return bool True when a Refraction footer was printed; otherwise print the theme's own footer.
	 */
	function refraction_theme_builder_footer(): bool {
		return Module::instance()->get_locations_manager()->print_location( Locations_Manager::FOOTER );
	}
}
