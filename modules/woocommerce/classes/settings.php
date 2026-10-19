<?php
namespace Refraction\Modules\Woocommerce\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Cleaning of widget settings before they reach a query or a class name. Pure.
 */
final class Settings {

	const ORDERBY = [ 'date', 'title', 'price', 'popularity', 'rating', 'menu_order', 'rand', 'id' ];

	const CART_MODES = [ 'dropdown', 'offcanvas', 'none' ];

	public static function columns( $value ): int {
		return max( 1, min( 6, (int) $value ) );
	}

	public static function limit( $value ): int {
		return max( 1, min( 100, (int) $value ) );
	}

	public static function orderby( $value ): string {
		return in_array( $value, self::ORDERBY, true ) ? $value : 'date';
	}

	public static function order( $value ): string {
		$value = strtoupper( (string) $value );

		return in_array( $value, [ 'ASC', 'DESC' ], true ) ? $value : 'DESC';
	}

	public static function cart_mode( $value ): string {
		return in_array( $value, self::CART_MODES, true ) ? $value : 'dropdown';
	}

	/** @return int[] */
	public static function ids( $value ): array {
		$ids = [];

		foreach ( (array) $value as $item ) {
			$id = is_scalar( $item ) ? (int) $item : 0;

			if ( $id > 0 ) {
				$ids[ $id ] = $id;
			}
		}

		return array_values( $ids );
	}
}
