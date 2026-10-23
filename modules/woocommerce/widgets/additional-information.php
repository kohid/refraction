<?php
namespace Refraction\Modules\Woocommerce\Widgets;

use Refraction\Controls_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Additional Information: the attribute table (weight, dimensions, attributes).
 */
class Additional_Information extends Woo_Widget_Base {

	public function get_name() {
		return 'woo-additional-information';
	}

	public function get_title() {
		return esc_html__( 'Additional Information', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-product-info';
	}

	public function get_keywords() {
		return [ 'woocommerce', 'product', 'additional', 'information', 'attributes', 'weight', 'dimensions' ];
	}

	protected function register_controls() {
		$this->register_product_section();

		$this->start_controls_section( 'section_content', [ 'label' => esc_html__( 'Information', 'refraction' ) ] );
		$this->add_control( 'show_heading', [ 'label' => esc_html__( 'Heading', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'default' => 'yes' ] );
		$this->add_control( 'heading', [ 'label' => esc_html__( 'Heading text', 'refraction' ), 'type' => Controls_Manager::TEXT, 'placeholder' => esc_html__( 'Additional information', 'refraction' ), 'condition' => [ 'show_heading' => 'yes' ] ] );
		$this->end_controls_section();

		$this->add_text_style_section( 'section_style', esc_html__( 'Table', 'refraction' ), '{{WRAPPER}} .woocommerce-product-attributes' );
	}

	protected function render_product( \WC_Product $product ): void {
		if ( ! $product->has_attributes() && ! $product->has_dimensions( false ) && ! $product->has_weight() ) {
			$this->print_editor_hint( __( 'This product has no additional information.', 'refraction' ) );

			return;
		}

		if ( 'yes' === $this->get_settings( 'show_heading' ) ) {
			$heading = trim( (string) $this->get_settings( 'heading' ) );
			echo '<h2>' . esc_html( '' !== $heading ? $heading : __( 'Additional information', 'refraction' ) ) . '</h2>';
		}

		wc_display_product_attributes( $product );
	}
}
