<?php
namespace Refraction\Modules\Woocommerce\Documents;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Product extends Woo_Document {

	public static function get_type() {
		return 'product';
	}

	public static function get_title() {
		return esc_html__( 'Single Product', 'refraction' );
	}

	public static function get_plural_title() {
		return esc_html__( 'Single Products', 'refraction' );
	}

	public function get_preview_sources(): array {
		return [ [ 'value' => 'post:product', 'label' => esc_html__( 'Product', 'refraction' ) ] ];
	}
}
