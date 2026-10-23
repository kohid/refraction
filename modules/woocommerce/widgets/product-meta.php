<?php
namespace Refraction\Modules\Woocommerce\Widgets;

use Refraction\Controls_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Product Meta: SKU, categories and tags.
 */
class Product_Meta extends Woo_Widget_Base {

	public function get_name() {
		return 'woo-product-meta';
	}

	public function get_title() {
		return esc_html__( 'Product Meta', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-product-meta';
	}

	public function get_keywords() {
		return [ 'woocommerce', 'product', 'meta', 'sku', 'category', 'tag' ];
	}

	protected function register_controls() {
		$this->register_product_section();

		$this->start_controls_section( 'section_content', [ 'label' => esc_html__( 'Meta', 'refraction' ) ] );

		$this->add_control(
			'layout',
			[
				'label' => esc_html__( 'Layout', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'stacked',
				'options' => [
					'stacked' => esc_html__( 'Stacked', 'refraction' ),
					'inline' => esc_html__( 'Inline', 'refraction' ),
				],
				'prefix_class' => 'refraction-woo-meta--',
			]
		);

		foreach ( [ 'sku' => esc_html__( 'SKU', 'refraction' ), 'categories' => esc_html__( 'Categories', 'refraction' ), 'tags' => esc_html__( 'Tags', 'refraction' ) ] as $key => $label ) {
			$this->add_control( 'show_' . $key, [ 'label' => $label, 'type' => Controls_Manager::SWITCHER, 'default' => 'yes' ] );
			$this->add_control( 'label_' . $key, [ 'label' => $label . ' ' . esc_html__( 'label', 'refraction' ), 'type' => Controls_Manager::TEXT, 'condition' => [ 'show_' . $key => 'yes' ], 'placeholder' => $label . ':' ] );
		}

		$this->end_controls_section();

		$this->add_text_style_section( 'section_style', esc_html__( 'Text', 'refraction' ), '{{WRAPPER}} .product_meta', '{{WRAPPER}} .product_meta a' );
	}

	private function label( string $key, string $default ): string {
		$label = trim( (string) $this->get_settings( 'label_' . $key ) );

		return '' !== $label ? $label : $default;
	}

	protected function render_product( \WC_Product $product ): void {
		echo '<div class="product_meta">';

		if ( 'yes' === $this->get_settings( 'show_sku' ) && wc_product_sku_enabled() && ( $product->get_sku() || $product->is_type( 'variable' ) ) ) {
			printf(
				'<span class="sku_wrapper">%1$s <span class="sku">%2$s</span></span>',
				esc_html( $this->label( 'sku', __( 'SKU:', 'refraction' ) ) ),
				esc_html( $product->get_sku() ? $product->get_sku() : __( 'N/A', 'refraction' ) )
			);
		}

		if ( 'yes' === $this->get_settings( 'show_categories' ) ) {
			$list = wc_get_product_category_list( $product->get_id(), ', ' );

			if ( $list ) {
				echo '<span class="posted_in">' . esc_html( $this->label( 'categories', __( 'Categories:', 'refraction' ) ) ) . ' ' . $list . '</span>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Term links built by WooCommerce.
			}
		}

		if ( 'yes' === $this->get_settings( 'show_tags' ) ) {
			$list = wc_get_product_tag_list( $product->get_id(), ', ' );

			if ( $list ) {
				echo '<span class="tagged_as">' . esc_html( $this->label( 'tags', __( 'Tags:', 'refraction' ) ) ) . ' ' . $list . '</span>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Term links built by WooCommerce.
			}
		}

		echo '</div>';
	}
}
