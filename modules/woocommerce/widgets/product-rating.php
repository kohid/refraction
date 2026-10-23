<?php
namespace Refraction\Modules\Woocommerce\Widgets;

use Refraction\Controls_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Product Rating: the average star rating and the number of reviews.
 */
class Product_Rating extends Woo_Widget_Base {

	public function get_name() {
		return 'woo-product-rating';
	}

	public function get_title() {
		return esc_html__( 'Product Rating', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-product-rating';
	}

	public function get_keywords() {
		return [ 'woocommerce', 'product', 'rating', 'stars', 'reviews' ];
	}

	protected function register_controls() {
		$this->register_product_section();

		$this->start_controls_section( 'section_content', [ 'label' => esc_html__( 'Rating', 'refraction' ) ] );

		$this->add_control( 'show_count', [ 'label' => esc_html__( 'Review count', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'default' => 'yes' ] );
		$this->add_control( 'show_empty', [ 'label' => esc_html__( 'Show empty stars when there are no reviews', 'refraction' ), 'type' => Controls_Manager::SWITCHER ] );

		$this->end_controls_section();

		$this->add_text_style_section( 'section_style', esc_html__( 'Review count', 'refraction' ), '{{WRAPPER}} .woocommerce-review-link' );

		$this->start_controls_section( 'section_stars', [ 'label' => esc_html__( 'Stars', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$this->add_color_control( 'star_color', esc_html__( 'Star color', 'refraction' ), '{{WRAPPER}} .star-rating span::before', 'color' );
		$this->add_color_control( 'empty_star_color', esc_html__( 'Empty star color', 'refraction' ), '{{WRAPPER}} .star-rating::before', 'color' );
		$this->end_controls_section();
	}

	protected function render_product( \WC_Product $product ): void {
		if ( ! wc_review_ratings_enabled() ) {
			$this->print_editor_hint( __( 'Product ratings are turned off in the WooCommerce settings.', 'refraction' ) );

			return;
		}

		$count = (int) $product->get_review_count();

		if ( ! $count && 'yes' !== $this->get_settings( 'show_empty' ) ) {
			$this->print_editor_hint( __( 'This product has no reviews yet.', 'refraction' ) );

			return;
		}

		echo '<div class="woocommerce-product-rating">';
		echo wc_get_rating_html( (float) $product->get_average_rating(), $count ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- WooCommerce markup.

		if ( 'yes' === $this->get_settings( 'show_count' ) && $count ) {
			printf(
				'<a href="%1$s" class="woocommerce-review-link" rel="nofollow">%2$s</a>',
				esc_url( $product->get_permalink() . '#reviews' ),
				/* translators: %s: number of reviews. */
				esc_html( sprintf( _n( '(%s customer review)', '(%s customer reviews)', $count, 'refraction' ), number_format_i18n( $count ) ) )
			);
		}

		echo '</div>';
	}
}
