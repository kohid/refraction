<?php
namespace Refraction\Modules\Woocommerce\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * WooCommerce only loads its scripts and styles on its own pages. A widget on any other page asks for what it needs.
 */
final class Woo_Assets {

	const STYLES = [ 'woocommerce-layout', 'woocommerce-smallscreen', 'woocommerce-general' ];

	/**
	 * The editor page itself is an admin request, where WooCommerce does not start the session, customer and cart
	 * that the cart, checkout and mini cart templates read. Start them when a widget needs them.
	 */
	public static function ensure_cart(): void {
		if ( ! function_exists( 'WC' ) || ! WC() || WC()->cart || ! function_exists( 'wc_load_cart' ) ) {
			return;
		}

		wc_load_cart();
	}

	/**
	 * @param string[] $scripts WooCommerce script handles (`wc-cart-fragments`, `wc-add-to-cart-variation`...).
	 */
	public static function enqueue( array $scripts = [] ): void {
		if ( ! class_exists( 'WC_Frontend_Scripts' ) ) {
			return;
		}

		if ( ! wp_script_is( 'woocommerce', 'registered' ) && ! is_admin() ) {
			\WC_Frontend_Scripts::load_scripts();
		}

		foreach ( array_merge( [ 'woocommerce' ], $scripts ) as $handle ) {
			if ( wp_script_is( $handle, 'registered' ) ) {
				wp_enqueue_script( $handle );
			}
		}

		foreach ( self::STYLES as $handle ) {
			if ( wp_style_is( $handle, 'registered' ) ) {
				wp_enqueue_style( $handle );
			}
		}
	}
}
