<?php
namespace Refraction\Modules\Woocommerce\Classes\Conditions;

use Refraction\Modules\ThemeBuilder\Classes\Conditions\Condition_Base;
use Refraction\Modules\ThemeBuilder\Classes\Environment;
use Refraction\Modules\Woocommerce\Classes\Wp_Woo_Environment;
use Refraction\Modules\Woocommerce\Classes\Woo_Environment;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * WooCommerce pages.
 *
 * Arguments: none (every WooCommerce page), `product`, `product/{id}`, `product_cat/{id}`, `product_tag/{id}`,
 * `type/{slug}`, `on_sale`, `in_stock`, `shop`, `archive`, `cat_archive`, `cat_archive/{id}`, `tag_archive`,
 * `tag_archive/{id}`, `cart`, `checkout`, `order_received`, `account`, `account/{endpoint}`.
 */
class Woocommerce extends Condition_Base {

	const TYPES = [ 'simple', 'variable', 'grouped', 'external' ];

	const ENDPOINTS = [ 'orders', 'view-order', 'downloads', 'edit-address', 'edit-account', 'lost-password' ];

	public static function get_name(): string {
		return 'woocommerce';
	}

	public static function is_valid_args( array $args ): bool {
		$count = count( $args );

		if ( 0 === $count ) {
			return true;
		}

		switch ( $args[0] ) {
			case 'product':
			case 'cat_archive':
			case 'tag_archive':
				return 1 === $count || ( 2 === $count && self::is_id( $args[1] ) );
			case 'product_cat':
			case 'product_tag':
				return 2 === $count && self::is_id( $args[1] );
			case 'type':
				return 2 === $count && (bool) preg_match( '/^[a-z0-9_\-]{1,30}$/', $args[1] ) && in_array( $args[1], self::TYPES, true );
			case 'account':
				return 1 === $count || 2 === $count;
			case 'on_sale':
			case 'in_stock':
			case 'shop':
			case 'archive':
			case 'cart':
			case 'checkout':
			case 'order_received':
				return 1 === $count;
			default:
				return false;
		}
	}

	public function get_label(): string {
		return esc_html__( 'WooCommerce', 'refraction' );
	}

	private function woo( Environment $environment ): Woo_Environment {
		return $environment instanceof Woo_Environment ? $environment : new Wp_Woo_Environment();
	}

	public function check( array $args, Environment $environment ): bool {
		$woo = $this->woo( $environment );

		if ( ! $args ) {
			return $woo->is_product() || $woo->is_product_archive() || $woo->is_cart() || $woo->is_checkout() || $woo->is_order_received() || $woo->is_account();
		}

		$id = isset( $args[1] ) && ctype_digit( $args[1] ) ? (int) $args[1] : 0;

		switch ( $args[0] ) {
			case 'product':
				return $woo->is_product() && ( ! $id || $woo->product_id() === $id );
			case 'product_cat':
				return $woo->is_product() && $woo->product_in_term( 'product_cat', $id );
			case 'product_tag':
				return $woo->is_product() && $woo->product_in_term( 'product_tag', $id );
			case 'type':
				return $woo->is_product() && $woo->product_type() === $args[1];
			case 'on_sale':
				return $woo->is_product() && $woo->product_on_sale();
			case 'in_stock':
				return $woo->is_product() && $woo->product_in_stock();
			case 'shop':
				return $woo->is_shop();
			case 'archive':
				return $woo->is_product_archive();
			case 'cat_archive':
				return $woo->is_product_tax_archive( 'product_cat', $id );
			case 'tag_archive':
				return $woo->is_product_tax_archive( 'product_tag', $id );
			case 'cart':
				return $woo->is_cart();
			case 'checkout':
				return $woo->is_checkout();
			case 'order_received':
				return $woo->is_order_received();
			case 'account':
				return $woo->is_account() && ( ! isset( $args[1] ) || $woo->account_endpoint() === $args[1] );
			default:
				return false;
		}
	}

	public function get_specificity( array $args ): float {
		if ( ! $args ) {
			return 10.0;
		}

		switch ( $args[0] ) {
			case 'product':
				return isset( $args[1] ) ? 100.0 : 30.0;
			case 'product_cat':
			case 'product_tag':
			case 'type':
				return 60.0;
			case 'on_sale':
			case 'in_stock':
				return 50.0;
			case 'cat_archive':
			case 'tag_archive':
				return isset( $args[1] ) ? 60.0 : 40.0;
			case 'account':
				return isset( $args[1] ) ? 60.0 : 30.0;
			default:
				return 30.0;
		}
	}

	public function describe( array $args, Environment $environment ): string {
		if ( ! $args ) {
			return esc_html__( 'All WooCommerce pages', 'refraction' );
		}

		$id = isset( $args[1] ) && ctype_digit( $args[1] ) ? (int) $args[1] : 0;

		switch ( $args[0] ) {
			case 'product':
				return $id ? sprintf( /* translators: %s: product name. */ esc_html__( 'Product: %s', 'refraction' ), $environment->label_post( $id ) ) : esc_html__( 'All products', 'refraction' );
			case 'product_cat':
				return sprintf( /* translators: %s: category name. */ esc_html__( 'Product in category: %s', 'refraction' ), $environment->label_term( 'product_cat', $id ) );
			case 'product_tag':
				return sprintf( /* translators: %s: tag name. */ esc_html__( 'Product with tag: %s', 'refraction' ), $environment->label_term( 'product_tag', $id ) );
			case 'type':
				return sprintf( /* translators: %s: product type, for example "variable". */ esc_html__( '%s products', 'refraction' ), ucfirst( $args[1] ) );
			case 'on_sale':
				return esc_html__( 'Products on sale', 'refraction' );
			case 'in_stock':
				return esc_html__( 'Products in stock', 'refraction' );
			case 'shop':
				return esc_html__( 'Shop page', 'refraction' );
			case 'archive':
				return esc_html__( 'All product archives', 'refraction' );
			case 'cat_archive':
				return $id ? sprintf( /* translators: %s: category name. */ esc_html__( 'Product category: %s', 'refraction' ), $environment->label_term( 'product_cat', $id ) ) : esc_html__( 'Product category archives', 'refraction' );
			case 'tag_archive':
				return $id ? sprintf( /* translators: %s: tag name. */ esc_html__( 'Product tag: %s', 'refraction' ), $environment->label_term( 'product_tag', $id ) ) : esc_html__( 'Product tag archives', 'refraction' );
			case 'cart':
				return esc_html__( 'Cart page', 'refraction' );
			case 'checkout':
				return esc_html__( 'Checkout page', 'refraction' );
			case 'order_received':
				return esc_html__( 'Order received page', 'refraction' );
			default:
				return isset( $args[1] ) ? sprintf( /* translators: %s: My Account endpoint. */ esc_html__( 'My Account: %s', 'refraction' ), $args[1] ) : esc_html__( 'My Account pages', 'refraction' );
		}
	}

	public function get_sub_conditions(): array {
		$subs = [
			[ 'value' => '', 'label' => esc_html__( 'All WooCommerce pages', 'refraction' ) ],
			[ 'value' => 'product', 'label' => esc_html__( 'Products', 'refraction' ), 'target' => 'post:product', 'required' => false ],
			[ 'value' => 'product_cat', 'label' => esc_html__( 'Product in category', 'refraction' ), 'target' => 'term:product_cat', 'required' => true ],
			[ 'value' => 'product_tag', 'label' => esc_html__( 'Product with tag', 'refraction' ), 'target' => 'term:product_tag', 'required' => true ],
		];

		foreach ( self::TYPES as $type ) {
			$subs[] = [ 'value' => 'type/' . $type, 'label' => sprintf( /* translators: %s: product type. */ esc_html__( '%s products', 'refraction' ), ucfirst( $type ) ) ];
		}

		return array_merge(
			$subs,
			[
				[ 'value' => 'on_sale', 'label' => esc_html__( 'Products on sale', 'refraction' ) ],
				[ 'value' => 'in_stock', 'label' => esc_html__( 'Products in stock', 'refraction' ) ],
				[ 'value' => 'shop', 'label' => esc_html__( 'Shop page', 'refraction' ) ],
				[ 'value' => 'archive', 'label' => esc_html__( 'All product archives', 'refraction' ) ],
				[ 'value' => 'cat_archive', 'label' => esc_html__( 'Product category archives', 'refraction' ), 'target' => 'term:product_cat', 'required' => false ],
				[ 'value' => 'tag_archive', 'label' => esc_html__( 'Product tag archives', 'refraction' ), 'target' => 'term:product_tag', 'required' => false ],
				[ 'value' => 'cart', 'label' => esc_html__( 'Cart page', 'refraction' ) ],
				[ 'value' => 'checkout', 'label' => esc_html__( 'Checkout page', 'refraction' ) ],
				[ 'value' => 'order_received', 'label' => esc_html__( 'Order received page', 'refraction' ) ],
				[ 'value' => 'account', 'label' => esc_html__( 'My Account pages', 'refraction' ) ],
				[ 'value' => 'account/orders', 'label' => esc_html__( 'My Account: Orders', 'refraction' ) ],
				[ 'value' => 'account/downloads', 'label' => esc_html__( 'My Account: Downloads', 'refraction' ) ],
				[ 'value' => 'account/edit-address', 'label' => esc_html__( 'My Account: Addresses', 'refraction' ) ],
				[ 'value' => 'account/edit-account', 'label' => esc_html__( 'My Account: Account details', 'refraction' ) ],
			]
		);
	}
}
