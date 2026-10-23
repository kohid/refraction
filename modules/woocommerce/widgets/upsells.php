<?php
namespace Refraction\Modules\Woocommerce\Widgets;

use Refraction\Controls_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Upsells: the products chosen as "You may also like" in the product's linked products.
 */
class Upsells extends Woo_Widget_Base {

	public function get_name() {
		return 'woo-upsells';
	}

	public function get_title() {
		return esc_html__( 'Upsells', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-product-upsell';
	}

	public function get_keywords() {
		return [ 'woocommerce', 'product', 'upsells', 'related', 'also like' ];
	}

	protected function get_woo_scripts(): array {
		return [ 'wc-add-to-cart' ];
	}

	protected function register_controls() {
		$this->register_product_section();

		$this->start_controls_section( 'section_content', [ 'label' => esc_html__( 'Upsells', 'refraction' ) ] );
		$this->add_control( 'heading', [ 'label' => esc_html__( 'Heading', 'refraction' ), 'type' => Controls_Manager::TEXT, 'placeholder' => esc_html__( 'You may also like…', 'refraction' ) ] );
		$this->add_control( 'limit', [ 'label' => esc_html__( 'Products', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'min' => 1, 'max' => 24, 'default' => 4 ] );
		$this->add_responsive_control( 'columns', [ 'label' => esc_html__( 'Columns', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'min' => 1, 'max' => 6, 'default' => 4, 'selectors' => [ '{{WRAPPER}} ul.products' => '--refraction-woo-columns: {{VALUE}};' ] ] );
		$this->add_control( 'orderby', [ 'label' => esc_html__( 'Order by', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => 'rand', 'options' => [ 'rand' => esc_html__( 'Random', 'refraction' ), 'date' => esc_html__( 'Date', 'refraction' ), 'title' => esc_html__( 'Title', 'refraction' ), 'price' => esc_html__( 'Price', 'refraction' ) ] ] );
		$this->add_control( 'order', [ 'label' => esc_html__( 'Order', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => 'desc', 'options' => [ 'desc' => esc_html__( 'Descending', 'refraction' ), 'asc' => esc_html__( 'Ascending', 'refraction' ) ] ] );
		$this->end_controls_section();

		$this->add_text_style_section( 'section_style', esc_html__( 'Heading', 'refraction' ), '{{WRAPPER}} .up-sells > h2' );
	}

	protected function render_product( \WC_Product $product ): void {
		if ( ! $product->get_upsell_ids() ) {
			$this->print_editor_hint( __( 'This product has no upsells. Add some in the Linked Products tab of the product.', 'refraction' ) );

			return;
		}

		$heading = trim( (string) $this->get_settings( 'heading' ) );
		$filter = '' !== $heading ? static fn() => $heading : null;

		if ( $filter ) {
			add_filter( 'woocommerce_product_upsells_products_heading', $filter );
		}

		woocommerce_upsell_display(
			\Refraction\Modules\Woocommerce\Classes\Settings::limit( $this->get_settings( 'limit' ) ),
			\Refraction\Modules\Woocommerce\Classes\Settings::columns( $this->get_settings( 'columns' ) ),
			in_array( $this->get_settings( 'orderby' ), [ 'rand', 'date', 'title', 'price' ], true ) ? $this->get_settings( 'orderby' ) : 'rand',
			'asc' === $this->get_settings( 'order' ) ? 'asc' : 'desc'
		);

		if ( $filter ) {
			remove_filter( 'woocommerce_product_upsells_products_heading', $filter );
		}
	}
}
