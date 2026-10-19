<?php
namespace Refraction\Modules\Woocommerce\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Answers the WooCommerce questions of the current request from WooCommerce itself. Every call is guarded,
 * so a request where WooCommerce is not loaded is simply "not a WooCommerce page".
 */
class Wp_Woo_Environment implements Woo_Environment {

	private function product(): ?\WC_Product {
		if ( ! function_exists( 'wc_get_product' ) || ! is_singular( 'product' ) ) {
			return null;
		}

		$product = wc_get_product( (int) get_queried_object_id() );

		return $product instanceof \WC_Product ? $product : null;
	}

	public function is_product(): bool {
		return function_exists( 'is_product' ) && is_product();
	}

	public function product_id(): int {
		return $this->is_product() ? (int) get_queried_object_id() : 0;
	}

	public function product_in_term( string $taxonomy, int $term_id ): bool {
		$product = $this->product();

		if ( ! $product || ! taxonomy_exists( $taxonomy ) ) {
			return false;
		}

		// A product in a child category is in the parent category too.
		$terms = wp_get_post_terms( $product->get_id(), $taxonomy, [ 'fields' => 'ids' ] );

		if ( is_wp_error( $terms ) ) {
			return false;
		}

		foreach ( $terms as $id ) {
			if ( (int) $id === $term_id || in_array( $term_id, array_map( 'intval', get_ancestors( (int) $id, $taxonomy, 'taxonomy' ) ), true ) ) {
				return true;
			}
		}

		return false;
	}

	public function product_type(): string {
		$product = $this->product();

		return $product ? $product->get_type() : '';
	}

	public function product_on_sale(): bool {
		$product = $this->product();

		return $product && $product->is_on_sale();
	}

	public function product_in_stock(): bool {
		$product = $this->product();

		return $product && $product->is_in_stock();
	}

	public function is_shop(): bool {
		return function_exists( 'is_shop' ) && is_shop();
	}

	public function is_product_archive(): bool {
		if ( is_singular() ) {
			return false;
		}

		if ( $this->is_shop() || ( function_exists( 'is_product_taxonomy' ) && is_product_taxonomy() ) || is_post_type_archive( 'product' ) ) {
			return true;
		}

		return is_search() && 'product' === get_query_var( 'post_type' );
	}

	public function is_product_tax_archive( string $taxonomy, int $term_id = 0 ): bool {
		if ( ! is_tax( $taxonomy ) ) {
			return false;
		}

		return 0 === $term_id || (int) get_queried_object_id() === $term_id;
	}

	public function is_cart(): bool {
		return function_exists( 'is_cart' ) && is_cart();
	}

	public function is_checkout(): bool {
		return function_exists( 'is_checkout' ) && is_checkout() && ! $this->is_order_received();
	}

	public function is_order_received(): bool {
		return function_exists( 'is_wc_endpoint_url' ) && is_wc_endpoint_url( 'order-received' );
	}

	public function is_account(): bool {
		return function_exists( 'is_account_page' ) && is_account_page();
	}

	public function account_endpoint(): string {
		if ( ! function_exists( 'WC' ) || ! WC()->query ) {
			return '';
		}

		$current = WC()->query->get_current_endpoint();

		return is_string( $current ) ? $current : '';
	}
}
