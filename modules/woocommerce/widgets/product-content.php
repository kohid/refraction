<?php
namespace Refraction\Modules\Woocommerce\Widgets;

use Refraction\Controls_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Product Content: the long description of the product.
 */
class Product_Content extends Woo_Widget_Base {

	/** @var int Depth guard: a product description that holds this widget must not print itself again. */
	private static int $depth = 0;

	public function get_name() {
		return 'woo-product-content';
	}

	public function get_title() {
		return esc_html__( 'Product Content', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-post-content';
	}

	public function get_keywords() {
		return [ 'woocommerce', 'product', 'content', 'description', 'text' ];
	}

	protected function register_controls() {
		$this->register_product_section();
		$this->add_text_style_section( 'section_style', esc_html__( 'Text', 'refraction' ), '{{WRAPPER}} .refraction-woo-content' );
	}

	protected function render_product( \WC_Product $product ): void {
		if ( self::$depth > 0 ) {
			return;
		}

		++self::$depth;
		echo '<div class="refraction-woo-content">' . apply_filters( 'the_content', (string) get_post_field( 'post_content', $product->get_id() ) ) . '</div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Filtered post content.
		--self::$depth;
	}
}
