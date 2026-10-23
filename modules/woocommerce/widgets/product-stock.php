<?php
namespace Refraction\Modules\Woocommerce\Widgets;

use Refraction\Controls_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Product Stock: In stock, Out of stock, "Only 3 left" and backorder messages.
 */
class Product_Stock extends Woo_Widget_Base {

	public function get_name() {
		return 'woo-product-stock';
	}

	public function get_title() {
		return esc_html__( 'Product Stock', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-product-stock';
	}

	public function get_keywords() {
		return [ 'woocommerce', 'product', 'stock', 'availability', 'inventory' ];
	}

	protected function register_controls() {
		$this->register_product_section();

		$this->start_controls_section( 'section_content', [ 'label' => esc_html__( 'Stock', 'refraction' ) ] );
		$this->add_control(
			'always_show',
			[
				'label' => esc_html__( 'Show "In stock" when the stock is not managed', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => 'yes',
			]
		);
		$this->end_controls_section();

		$this->add_text_style_section( 'section_style', esc_html__( 'Text', 'refraction' ), '{{WRAPPER}} .stock' );

		$this->start_controls_section( 'section_colors', [ 'label' => esc_html__( 'Status colors', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$this->add_color_control( 'in_stock_color', esc_html__( 'In stock', 'refraction' ), '{{WRAPPER}} .stock.in-stock' );
		$this->add_color_control( 'out_stock_color', esc_html__( 'Out of stock', 'refraction' ), '{{WRAPPER}} .stock.out-of-stock' );
		$this->add_color_control( 'backorder_color', esc_html__( 'On backorder', 'refraction' ), '{{WRAPPER}} .stock.available-on-backorder' );
		$this->end_controls_section();
	}

	protected function render_product( \WC_Product $product ): void {
		$availability = $product->get_availability();
		$text = (string) $availability['availability'];
		$class = (string) $availability['class'];

		if ( '' === $text && 'yes' === $this->get_settings( 'always_show' ) && $product->is_in_stock() ) {
			$text = __( 'In stock', 'refraction' );
			$class = 'in-stock';
		}

		if ( '' === $text ) {
			$this->print_editor_hint( __( 'This product shows no stock message.', 'refraction' ) );

			return;
		}

		printf( '<p class="stock %1$s">%2$s</p>', esc_attr( $class ), wp_kses_post( $text ) );
	}
}
