<?php
namespace Refraction\Modules\Woocommerce\Widgets;

use Refraction\Controls_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Product Data Tabs: Description, Additional information and Reviews.
 */
class Product_Data_Tabs extends Woo_Widget_Base {

	public function get_name() {
		return 'woo-product-data-tabs';
	}

	public function get_title() {
		return esc_html__( 'Product Data Tabs', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-product-tabs';
	}

	public function get_keywords() {
		return [ 'woocommerce', 'product', 'tabs', 'description', 'reviews', 'information' ];
	}

	protected function get_woo_scripts(): array {
		return [ 'wc-single-product' ];
	}

	protected function register_controls() {
		$this->register_product_section();

		$this->start_controls_section( 'section_style_tabs', [ 'label' => esc_html__( 'Tabs', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$this->add_typography( 'tabs_typography', '{{WRAPPER}} .wc-tabs li a' );
		$this->add_color_control( 'tab_color', esc_html__( 'Tab color', 'refraction' ), '{{WRAPPER}} .wc-tabs li a' );
		$this->add_color_control( 'tab_active_color', esc_html__( 'Active tab color', 'refraction' ), '{{WRAPPER}} .wc-tabs li.active a' );
		$this->add_color_control( 'panel_color', esc_html__( 'Panel text color', 'refraction' ), '{{WRAPPER}} .woocommerce-Tabs-panel' );
		$this->end_controls_section();
	}

	protected function render_product( \WC_Product $product ): void {
		woocommerce_output_product_data_tabs();
	}
}
