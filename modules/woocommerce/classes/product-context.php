<?php
namespace Refraction\Modules\Woocommerce\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Which product a widget is about, and a way to run WooCommerce template code as if that product were the
 * current one (WooCommerce template functions read the global `$product`).
 */
final class Product_Context {

	/**
	 * The product to show: the one chosen in the widget, else the current post (a product page, the editor preview
	 * or an item of a loop). Null when there is none or the visitor may not see it.
	 */
	public static function get_product( int $explicit_id = 0 ): ?\WC_Product {
		if ( ! function_exists( 'wc_get_product' ) ) {
			return null;
		}

		$id = $explicit_id > 0 ? $explicit_id : (int) get_the_ID();
		$type = $id ? get_post_type( $id ) : '';

		if ( 'product_variation' === $type ) {
			$id = (int) wp_get_post_parent_id( $id );
			$type = 'product';
		}

		if ( ! $id || 'product' !== $type || ! self::can_show( $id ) ) {
			return null;
		}

		$product = wc_get_product( $id );

		return $product instanceof \WC_Product ? $product : null;
	}

	/** Published and not password protected for visitors; drafts and private products only for those who may read them. */
	public static function can_show( int $post_id ): bool {
		$post = get_post( $post_id );

		if ( ! $post || 'product' !== $post->post_type ) {
			return false;
		}

		if ( 'publish' === $post->post_status ) {
			return ! post_password_required( $post ) || current_user_can( 'edit_post', $post_id );
		}

		return current_user_can( 'read_post', $post_id ) && current_user_can( 'edit_post', $post_id );
	}

	/**
	 * Run a callback with the product as the global product and post.
	 *
	 * @return mixed The callback result.
	 */
	public static function run( \WC_Product $product, callable $callback ) {
		$previous_product = $GLOBALS['product'] ?? null;
		$previous_post = $GLOBALS['post'] ?? null;
		$post = get_post( $product->get_id() );

		$GLOBALS['product'] = $product; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited

		if ( $post ) {
			$GLOBALS['post'] = $post; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
			setup_postdata( $post );
		}

		try {
			return $callback();
		} finally {
			if ( null === $previous_product ) {
				unset( $GLOBALS['product'] );
			} else {
				$GLOBALS['product'] = $previous_product; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
			}

			if ( null === $previous_post ) {
				unset( $GLOBALS['post'] );
			} else {
				$GLOBALS['post'] = $previous_post; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
				setup_postdata( $previous_post );
			}
		}
	}

	/**
	 * Run a callback with some WooCommerce hook callbacks taken off (to hide a part of a product card), and put them
	 * back afterwards at the priority they had.
	 *
	 * @param array<int, array{0: string, 1: string}> $hooks `[ hook, function name ]` pairs.
	 * @return mixed
	 */
	public static function without_hooks( array $hooks, callable $callback ) {
		$removed = [];

		foreach ( $hooks as [ $hook, $function ] ) {
			$priority = has_action( $hook, $function );

			if ( false !== $priority ) {
				remove_action( $hook, $function, $priority );
				$removed[] = [ $hook, $function, $priority ];
			}
		}

		try {
			return $callback();
		} finally {
			foreach ( $removed as [ $hook, $function, $priority ] ) {
				add_action( $hook, $function, $priority );
			}
		}
	}
}
