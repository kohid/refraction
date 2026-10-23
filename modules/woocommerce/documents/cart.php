<?php
namespace Refraction\Modules\Woocommerce\Documents;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Cart extends Woo_Document {

	public static function get_type() {
		return 'cart';
	}

	public static function get_title() {
		return esc_html__( 'Cart', 'refraction' );
	}

	public static function get_plural_title() {
		return esc_html__( 'Carts', 'refraction' );
	}

	/** The page whose content the Post Content widget shows while this template is edited. */
	public function get_preview_sources(): array {
		return [ [ 'value' => 'post:page', 'label' => esc_html__( 'Page', 'refraction' ) ] ];
	}
}
