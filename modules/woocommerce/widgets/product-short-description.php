<?php
namespace Refraction\Modules\Woocommerce\Widgets;

use Refraction\Controls_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Product Short Description: the excerpt of the product.
 */
class Product_Short_Description extends Woo_Widget_Base {

	public function get_name() {
		return 'woo-product-short-description';
	}

	public function get_title() {
		return esc_html__( 'Product Short Description', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-product-description';
	}

	public function get_keywords() {
		return [ 'woocommerce', 'product', 'short', 'description', 'excerpt' ];
	}

	protected function register_controls() {
		$this->register_product_section();
		$this->add_text_style_section( 'section_style', esc_html__( 'Text', 'refraction' ), '{{WRAPPER}} .woocommerce-product-details__short-description' );
	}

	protected function render_product( \WC_Product $product ): void {
		$text = $product->get_short_description();

		if ( '' === trim( $text ) ) {
			$this->print_editor_hint( __( 'This product has no short description.', 'refraction' ) );

			return;
		}

		echo '<div class="woocommerce-product-details__short-description">' . apply_filters( 'woocommerce_short_description', $text ) . '</div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Filtered post content, like the_content().
	}
}
