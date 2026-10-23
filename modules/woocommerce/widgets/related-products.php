<?php
namespace Refraction\Modules\Woocommerce\Widgets;

use Refraction\Controls_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Related Products: products that share categories or tags with the product.
 */
class Related_Products extends Woo_Widget_Base {

	public function get_name() {
		return 'woo-related-products';
	}

	public function get_title() {
		return esc_html__( 'Related Products', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-product-related';
	}

	public function get_keywords() {
		return [ 'woocommerce', 'product', 'related', 'similar' ];
	}

	protected function get_woo_scripts(): array {
		return [ 'wc-add-to-cart' ];
	}

	protected function register_controls() {
		$this->register_product_section();

		$this->start_controls_section( 'section_content', [ 'label' => esc_html__( 'Related products', 'refraction' ) ] );
		$this->add_control( 'heading', [ 'label' => esc_html__( 'Heading', 'refraction' ), 'type' => Controls_Manager::TEXT, 'placeholder' => esc_html__( 'Related products', 'refraction' ) ] );
		$this->add_control( 'limit', [ 'label' => esc_html__( 'Products', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'min' => 1, 'max' => 24, 'default' => 4 ] );
		$this->add_control( 'columns', [ 'label' => esc_html__( 'Columns', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'min' => 1, 'max' => 6, 'default' => 4 ] );
		$this->add_control( 'orderby', [ 'label' => esc_html__( 'Order by', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => 'rand', 'options' => [ 'rand' => esc_html__( 'Random', 'refraction' ), 'date' => esc_html__( 'Date', 'refraction' ), 'title' => esc_html__( 'Title', 'refraction' ), 'price' => esc_html__( 'Price', 'refraction' ) ] ] );
		$this->add_control( 'order', [ 'label' => esc_html__( 'Order', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => 'desc', 'options' => [ 'desc' => esc_html__( 'Descending', 'refraction' ), 'asc' => esc_html__( 'Ascending', 'refraction' ) ] ] );
		$this->end_controls_section();

		$this->add_text_style_section( 'section_style', esc_html__( 'Heading', 'refraction' ), '{{WRAPPER}} .related > h2' );
	}

	protected function render_product( \WC_Product $product ): void {
		$heading = trim( (string) $this->get_settings( 'heading' ) );
		$filter = '' !== $heading ? static fn() => $heading : null;

		if ( $filter ) {
			add_filter( 'woocommerce_product_related_products_heading', $filter );
		}

		ob_start();
		woocommerce_related_products(
			[
				'posts_per_page' => \Refraction\Modules\Woocommerce\Classes\Settings::limit( $this->get_settings( 'limit' ) ?: 4 ),
				'columns' => \Refraction\Modules\Woocommerce\Classes\Settings::columns( $this->get_settings( 'columns' ) ?: 4 ),
				'orderby' => in_array( $this->get_settings( 'orderby' ), [ 'rand', 'date', 'title', 'price' ], true ) ? $this->get_settings( 'orderby' ) : 'rand',
				'order' => 'asc' === $this->get_settings( 'order' ) ? 'asc' : 'desc',
			]
		);
		$html = ob_get_clean();

		if ( $filter ) {
			remove_filter( 'woocommerce_product_related_products_heading', $filter );
		}

		if ( '' === trim( (string) $html ) ) {
			$this->print_editor_hint( __( 'No related products were found.', 'refraction' ) );

			return;
		}

		echo $html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- WooCommerce template output.
	}
}
