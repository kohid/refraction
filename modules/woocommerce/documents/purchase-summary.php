<?php
namespace Refraction\Modules\Woocommerce\Documents;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Purchase_Summary extends Woo_Document {

	public static function get_type() {
		return 'purchase-summary';
	}

	public static function get_title() {
		return esc_html__( 'Purchase Summary', 'refraction' );
	}

	public static function get_plural_title() {
		return esc_html__( 'Purchase Summaries', 'refraction' );
	}

	public function get_preview_sources(): array {
		return [ [ 'value' => 'order:shop_order', 'label' => esc_html__( 'Order', 'refraction' ) ] ];
	}
}
