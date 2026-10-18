<?php
/**
 * Plugin Name: Refraction
 * Plugin URI: https://github.com/kohid/refraction
 * Description: Refraction is a visual drag-and-drop page builder for WordPress, a community fork of Refraction. It runs locally and has no accounts, cloud features or upsells.
 * Version: 0.1.0
 * Author: Refraction contributors (based on Elementor by Elementor.com)
 * Author URI: https://github.com/kohid/refraction
 * License: GPL-3.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-3.0.html
 * Requires PHP: 7.4
 * Requires at least: 6.8
 * Text Domain: refraction
 *
 * @package Refraction
 * @category Core
 *
 * Refraction is based on Elementor (Copyright Elementor Ltd. and contributors), released
 * under the GNU General Public License. See NOTICE and license.txt.
 *
 * Refraction is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * any later version.
 *
 * Refraction is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

define( 'REFRACTION_VERSION', '0.1.0' );
define( 'REFRACTION_MINIMUM_WP_VERSION', '6.8' );

define( 'REFRACTION__FILE__', __FILE__ );
define( 'REFRACTION_PLUGIN_BASE', plugin_basename( REFRACTION__FILE__ ) );
define( 'REFRACTION_PATH', plugin_dir_path( REFRACTION__FILE__ ) );

if ( defined( 'REFRACTION_TESTS' ) && REFRACTION_TESTS ) {
	define( 'REFRACTION_URL', 'file://' . REFRACTION_PATH );
} else {
	define( 'REFRACTION_URL', plugins_url( '/', REFRACTION__FILE__ ) );
}

define( 'REFRACTION_MODULES_PATH', plugin_dir_path( REFRACTION__FILE__ ) . '/modules' );
define( 'REFRACTION_ASSETS_PATH', REFRACTION_PATH . 'assets/' );
define( 'REFRACTION_ASSETS_URL', REFRACTION_URL . 'assets/' );

if ( file_exists( REFRACTION_PATH . 'vendor/autoload_packages.php' ) ) {
	require_once REFRACTION_PATH . 'vendor/autoload_packages.php';
} elseif ( file_exists( REFRACTION_PATH . 'vendor/autoload.php' ) ) {
	require_once REFRACTION_PATH . 'vendor/autoload.php';
	// We need this file because of the DI\create function that we are using.
	// Autoload classmap doesn't include this file.
}

$deprecation_func_file = REFRACTION_PATH . 'vendor_prefixed/twig/symfony/deprecation-contracts/function.php';
if ( file_exists( $deprecation_func_file ) ) {
	require_once $deprecation_func_file;
	if ( ! function_exists( 'trigger_deprecation' ) ) {
		function trigger_deprecation( string $package, string $version, string $message, ...$args ): void {
			\RefractionDeps\trigger_deprecation( $package, $version, $message, ...$args );
		}
	}
}

if ( ! version_compare( PHP_VERSION, '7.4', '>=' ) ) {
	add_action( 'admin_notices', 'refraction_fail_php_version' );
} elseif ( ! version_compare( get_bloginfo( 'version' ), REFRACTION_MINIMUM_WP_VERSION, '>=' ) ) {
	add_action( 'admin_notices', 'refraction_fail_wp_version' );
} else {
	require REFRACTION_PATH . 'includes/plugin.php';
}

/**
 * Refraction admin notice for minimum PHP version.
 *
 * Warning when the site doesn't have the minimum required PHP version.
 *
 * @since 1.0.0
 *
 * @return void
 */
function refraction_fail_php_version() {
	$html_message = sprintf(
		'<div class="error"><h3>%1$s</h3><p>%2$s</p></div>',
		esc_html__( 'Refraction isn’t running because PHP is outdated.', 'refraction' ),
		sprintf(
			/* translators: %s: PHP version. */
			esc_html__( 'Update to version %s and get back to creating!', 'refraction' ),
			'7.4'
		)
	);

	echo wp_kses_post( $html_message );
}

/**
 * Refraction admin notice for minimum WordPress version.
 *
 * Warning when the site doesn't have the minimum required WordPress version.
 *
 * @since 1.5.0
 *
 * @return void
 */
function refraction_fail_wp_version() {
	$html_message = sprintf(
		'<div class="error"><h3>%1$s</h3><p>%2$s</p></div>',
		esc_html__( 'Refraction isn’t running because WordPress is outdated.', 'refraction' ),
		sprintf(
			/* translators: %s: WordPress version. */
			esc_html__( 'Update to version %s and get back to creating!', 'refraction' ),
			REFRACTION_MINIMUM_WP_VERSION
		)
	);

	echo wp_kses_post( $html_message );
}
