<?php
namespace Refraction\Modules\Woocommerce\Widgets;

use Refraction\Controls_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Product Price: the price, with the sale price and the old price for products on sale.
 */
class Product_Price extends Woo_Widget_Base {

	public function get_name() {
		return 'woo-product-price';
	}

	public function get_title() {
		return esc_html__( 'Product Price', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-product-price';
	}

	public function get_keywords() {
		return [ 'woocommerce', 'product', 'price', 'sale', 'cost' ];
	}

	protected function register_controls() {
		$this->register_product_section();

		$this->add_text_style_section( 'section_style', esc_html__( 'Price', 'refraction' ), '{{WRAPPER}} .price' );

		$this->start_controls_section( 'section_sale_style', [ 'label' => esc_html__( 'Sale', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$this->add_color_control( 'sale_color', esc_html__( 'Sale price color', 'refraction' ), '{{WRAPPER}} .price ins, {{WRAPPER}} .price ins .amount' );
		$this->add_color_control( 'old_color', esc_html__( 'Old price color', 'refraction' ), '{{WRAPPER}} .price del, {{WRAPPER}} .price del .amount' );
		$this->add_typography( 'old_typography', '{{WRAPPER}} .price del' );
		$this->end_controls_section();
	}

	protected function render_product( \WC_Product $product ): void {
		$html = $product->get_price_html();

		if ( '' === $html ) {
			$this->print_editor_hint( __( 'This product has no price.', 'refraction' ) );

			return;
		}

		echo '<p class="' . esc_attr( apply_filters( 'woocommerce_product_price_class', 'price' ) ) . '">' . $html . '</p>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- WooCommerce price markup.
	}
}
