<?php
namespace Refraction\Modules\Woocommerce\Documents;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Product_Archive extends Woo_Document {

	public static function get_type() {
		return 'product-archive';
	}

	public static function get_title() {
		return esc_html__( 'Product Archive', 'refraction' );
	}

	public static function get_plural_title() {
		return esc_html__( 'Product Archives', 'refraction' );
	}

	public function get_preview_sources(): array {
		return [
			[ 'value' => 'postype:product', 'label' => esc_html__( 'Shop page', 'refraction' ) ],
			[ 'value' => 'term:product_cat', 'label' => esc_html__( 'Product category archive', 'refraction' ) ],
			[ 'value' => 'term:product_tag', 'label' => esc_html__( 'Product tag archive', 'refraction' ) ],
		];
	}
}
