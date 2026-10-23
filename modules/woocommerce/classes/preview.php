<?php
namespace Refraction\Modules\Woocommerce\Classes;

use Refraction\Modules\ThemeBuilder\Classes\Preview_Context;
use Refraction\Modules\ThemeBuilder\Documents\Theme_Document;
use Refraction\Modules\Woocommerce\Documents\Purchase_Summary;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Preview Settings for the WooCommerce templates: the sample order of a Purchase Summary and the lookup that
 * lets the editor pick it. Orders are customer data: only people who may edit shop orders can search or preview them.
 */
class Preview {

	/** The order the Purchase Summary preview shows, 0 when none. */
	private static int $order_id = 0;

	public function __construct() {
		add_filter( 'refraction/theme_builder/preview_query_vars', [ $this, 'query_vars' ], 10, 3 );
		add_action( 'refraction/theme_builder/preview_entered', [ $this, 'entered' ], 10, 2 );
		add_filter( 'refraction/theme_builder/lookup_items', [ $this, 'lookup' ], 10, 5 );
	}

	public static function order_id(): int {
		return self::$order_id;
	}

	public function query_vars( $vars, $location, $target ) {
		if ( Woo_Locations::PURCHASE_SUMMARY === $location && function_exists( 'wc_get_page_id' ) ) {
			$page_id = (int) wc_get_page_id( 'checkout' );

			if ( $page_id > 0 ) {
				return [ 'page_id' => $page_id, 'post_type' => 'page', 'post_status' => 'any' ];
			}
		}

		return $vars;
	}

	public function entered( $document, $target ): void {
		self::$order_id = 0;

		if ( ! $document instanceof Purchase_Summary || ! function_exists( 'wc_get_order' ) || ! current_user_can( 'edit_shop_orders' ) ) {
			return;
		}

		$id = (int) ( $target['id'] ?? 0 );

		if ( ! $id ) {
			$latest = wc_get_orders( [ 'limit' => 1, 'orderby' => 'date', 'order' => 'DESC', 'return' => 'ids' ] );
			$id = $latest ? (int) $latest[0] : 0;
		}

		self::$order_id = $id && wc_get_order( $id ) ? $id : 0;
	}

	/**
	 * @param mixed  $items   Items already found by another handler.
	 * @param string $kind    Lookup kind.
	 * @param int[]  $ids     Ids to turn into labels.
	 * @return mixed
	 */
	public function lookup( $items, $kind, $subtype, $query, $ids ) {
		if ( 'order' !== $kind ) {
			return $items;
		}

		if ( ! function_exists( 'wc_get_orders' ) || ! current_user_can( 'edit_shop_orders' ) ) {
			return [];
		}

		$orders = [];

		if ( $ids ) {
			foreach ( $ids as $id ) {
				$order = wc_get_order( $id );
				$orders[] = $order instanceof \WC_Order ? $order : null;
			}
		} elseif ( '' !== $query && ctype_digit( $query ) ) {
			$orders[] = wc_get_order( (int) $query );
		} else {
			$args = [ 'limit' => 20, 'orderby' => 'date', 'order' => 'DESC' ];

			if ( '' !== $query ) {
				$args['s'] = $query;
			}

			$orders = wc_get_orders( $args );
		}

		$found = [];

		foreach ( $orders as $order ) {
			if ( ! $order instanceof \WC_Order || ! current_user_can( 'read_shop_order', $order->get_id() ) && ! current_user_can( 'edit_shop_orders' ) ) {
				continue;
			}

			$name = trim( $order->get_billing_first_name() . ' ' . $order->get_billing_last_name() );
			$found[] = [
				'id' => $order->get_id(),
				/* translators: 1: order number, 2: customer name. */
				'text' => sprintf( '#%1$s %2$s', $order->get_order_number(), $name ),
				'hint' => wc_get_order_status_name( $order->get_status() ),
			];
		}

		return $found;
	}
}
