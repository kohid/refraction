<?php
namespace Refraction\Modules\Woocommerce\Classes;

use Refraction\Modules\ThemeBuilder\Classes\Environment;
use Refraction\Modules\ThemeBuilder\Classes\Location_Scope;
use Refraction\Modules\ThemeBuilder\Classes\Preview_Target;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * The WooCommerce template locations: which request each one serves and what its Preview Settings offer.
 */
final class Woo_Locations {

	const PRODUCT = 'product';
	const PRODUCT_ARCHIVE = 'product-archive';
	const CART = 'cart';
	const CHECKOUT = 'checkout';
	const PURCHASE_SUMMARY = 'purchase-summary';
	const MY_ACCOUNT = 'my-account';

	/** @return string[] In the order they are tried. */
	public static function all(): array {
		return [ self::PRODUCT, self::PRODUCT_ARCHIVE, self::CART, self::CHECKOUT, self::PURCHASE_SUMMARY, self::MY_ACCOUNT ];
	}

	private static function woo( Environment $environment ): Woo_Environment {
		return $environment instanceof Woo_Environment ? $environment : new Wp_Woo_Environment();
	}

	public static function register_scopes(): void {
		Location_Scope::register( self::PRODUCT, fn( Environment $e ) => self::woo( $e )->is_product() );
		Location_Scope::register( self::PRODUCT_ARCHIVE, fn( Environment $e ) => self::woo( $e )->is_product_archive() && ! self::woo( $e )->is_product() );
		Location_Scope::register( self::CART, fn( Environment $e ) => self::woo( $e )->is_cart() );
		Location_Scope::register( self::CHECKOUT, fn( Environment $e ) => self::woo( $e )->is_checkout() && ! self::woo( $e )->is_order_received() );
		Location_Scope::register( self::PURCHASE_SUMMARY, fn( Environment $e ) => self::woo( $e )->is_order_received() );
		Location_Scope::register( self::MY_ACCOUNT, fn( Environment $e ) => self::woo( $e )->is_account() );

		Preview_Target::register_location( self::PRODUCT, [ 'post' ], 'post:product' );
		Preview_Target::register_location( self::PRODUCT_ARCHIVE, [ 'term', 'postype' ], 'postype:product' );
		Preview_Target::register_location( self::CART, [ 'post' ], 'post:page' );
		Preview_Target::register_location( self::CHECKOUT, [ 'post' ], 'post:page' );
		Preview_Target::register_location( self::PURCHASE_SUMMARY, [ 'order' ], 'order:shop_order' );
		Preview_Target::register_location( self::MY_ACCOUNT, [ 'post' ], 'post:page' );
	}
}
