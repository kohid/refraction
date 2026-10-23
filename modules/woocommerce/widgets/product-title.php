<?php
namespace Refraction\Modules\Woocommerce\Widgets;

use Refraction\Controls_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Product Title: the name of the product.
 */
class Product_Title extends Woo_Widget_Base {

	public function get_name() {
		return 'woo-product-title';
	}

	public function get_title() {
		return esc_html__( 'Product Title', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-product-title';
	}

	public function get_keywords() {
		return [ 'woocommerce', 'product', 'title', 'name', 'heading' ];
	}

	protected function register_controls() {
		$this->register_product_section();

		$this->start_controls_section( 'section_content', [ 'label' => esc_html__( 'Title', 'refraction' ) ] );

		$this->add_control(
			'link_product',
			[
				'label' => esc_html__( 'Link to product', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
			]
		);

		$this->add_html_tag_control( 'h1' );

		$this->end_controls_section();

		$this->add_text_style_section( 'section_style', esc_html__( 'Title', 'refraction' ), '{{WRAPPER}} .refraction-woo-title' );
	}

	protected function render_product( \WC_Product $product ): void {
		$name = esc_html( $product->get_name() );

		if ( 'yes' === $this->get_settings( 'link_product' ) ) {
			$name = '<a href="' . esc_url( $product->get_permalink() ) . '">' . $name . '</a>';
		}

		$this->print_text_in_tag( $this->tag( 'html_tag', 'h1' ), 'product_title entry-title refraction-woo-title', $name );
	}
}
