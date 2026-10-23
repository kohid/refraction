<?php
namespace Refraction\Modules\Woocommerce\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Border;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Product Images: the main image and the gallery, with thumbnails, hover zoom and the Refraction lightbox.
 *
 * The markup keeps the class names WooCommerce's variation script looks for, so choosing a variation with its own
 * image swaps the main image.
 */
class Product_Images extends Woo_Widget_Base {

	public function get_name() {
		return 'woo-product-images';
	}

	public function get_title() {
		return esc_html__( 'Product Images', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-product-images';
	}

	public function get_keywords() {
		return [ 'woocommerce', 'product', 'images', 'gallery', 'photos', 'zoom' ];
	}

	protected function register_controls() {
		$this->register_product_section();

		$this->start_controls_section( 'section_content', [ 'label' => esc_html__( 'Images', 'refraction' ) ] );

		$this->add_control( 'image_size', [ 'label' => esc_html__( 'Image size', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => 'woocommerce_single', 'options' => [ 'woocommerce_single' => esc_html__( 'Product image', 'refraction' ), 'large' => esc_html__( 'Large', 'refraction' ), 'full' => esc_html__( 'Full', 'refraction' ) ] ] );
		$this->add_control( 'show_gallery', [ 'label' => esc_html__( 'Thumbnails', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'default' => 'yes' ] );
		$this->add_responsive_control( 'thumb_columns', [ 'label' => esc_html__( 'Thumbnail columns', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'min' => 2, 'max' => 8, 'default' => 4, 'condition' => [ 'show_gallery' => 'yes' ], 'selectors' => [ '{{WRAPPER}} .refraction-product-images__thumbs' => 'grid-template-columns: repeat({{VALUE}}, minmax(0, 1fr));' ] ] );
		$this->add_control( 'lightbox', [ 'label' => esc_html__( 'Open in lightbox', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'default' => 'yes' ] );
		$this->add_control( 'zoom', [ 'label' => esc_html__( 'Zoom on hover', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'default' => 'yes' ] );
		$this->add_control( 'sale_badge', [ 'label' => esc_html__( 'Sale badge', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'default' => 'yes' ] );

		$this->end_controls_section();

		$this->start_controls_section( 'section_style', [ 'label' => esc_html__( 'Images', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );

		$this->add_responsive_control( 'radius', [ 'label' => esc_html__( 'Border radius', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 0, 'max' => 60 ] ], 'selectors' => [ '{{WRAPPER}} .refraction-product-images__slide, {{WRAPPER}} .refraction-product-images__thumb' => 'border-radius: {{SIZE}}{{UNIT}};' ] ] );
		$this->add_responsive_control( 'gap', [ 'label' => esc_html__( 'Space between thumbnails', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 0, 'max' => 40 ] ], 'selectors' => [ '{{WRAPPER}} .refraction-product-images__thumbs' => 'gap: {{SIZE}}{{UNIT}}; margin-top: {{SIZE}}{{UNIT}};' ] ] );
		$this->add_group_control( Group_Control_Border::get_type(), [ 'name' => 'main_border', 'selector' => '{{WRAPPER}} .refraction-product-images__slide' ] );
		$this->add_color_control( 'active_thumb_color', esc_html__( 'Active thumbnail border', 'refraction' ), '{{WRAPPER}} .refraction-product-images__thumb.is-active', 'border-color' );

		$this->end_controls_section();
	}

	protected function render_product( \WC_Product $product ): void {
		$settings = $this->get_settings_for_display();
		$size = in_array( $settings['image_size'], [ 'woocommerce_single', 'large', 'full' ], true ) ? $settings['image_size'] : 'woocommerce_single';
		$ids = array_values( array_unique( array_filter( array_map( 'absint', array_merge( [ $product->get_image_id() ], $product->get_gallery_image_ids() ) ) ) ) );
		$lightbox = 'yes' === $settings['lightbox'];
		$group = 'product-' . $product->get_id() . '-' . $this->get_id();

		$this->add_render_attribute( 'root', [
			'class' => [ 'refraction-product-images', 'images', 'yes' === $settings['zoom'] ? 'has-zoom' : '' ],
			'data-count' => (string) max( 1, count( $ids ) ),
		] );

		echo '<div ' . $this->get_render_attribute_string( 'root' ) . '>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Render attribute API escapes.

		if ( 'yes' === $settings['sale_badge'] && $product->is_on_sale() ) {
			echo apply_filters( 'woocommerce_sale_flash', '<span class="onsale">' . esc_html__( 'Sale!', 'refraction' ) . '</span>', get_post( $product->get_id() ), $product ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped here, filter is WooCommerce's.
		}

		echo '<div class="refraction-product-images__slides">';

		if ( ! $ids ) {
			echo '<div class="woocommerce-product-gallery__image--placeholder refraction-product-images__slide is-active">';
			printf( '<img src="%1$s" alt="%2$s" class="wp-post-image">', esc_url( wc_placeholder_img_src( $size ) ), esc_attr__( 'Awaiting product image', 'refraction' ) );
			echo '</div>';
		}

		foreach ( $ids as $index => $id ) {
			$full = wp_get_attachment_image_src( $id, 'full' );
			$image = wp_get_attachment_image(
				$id,
				$size,
				false,
				[
					'class' => 0 === $index ? 'wp-post-image' : '',
					'data-src' => $full ? $full[0] : '',
					'data-large_image' => $full ? $full[0] : '',
					'data-large_image_width' => $full ? (string) $full[1] : '',
					'data-large_image_height' => $full ? (string) $full[2] : '',
					'loading' => 0 === $index ? 'eager' : 'lazy',
				]
			);

			printf( '<div class="woocommerce-product-gallery__image refraction-product-images__slide%s" data-index="%d">', 0 === $index ? ' is-active' : '', (int) $index );

			if ( $lightbox && $full ) {
				$key = 'link_' . $index;
				$this->add_render_attribute( $key, 'href', esc_url( $full[0] ) );
				$this->add_lightbox_data_attributes( $key, $id, 'yes', $group, true );
				echo '<a ' . $this->get_render_attribute_string( $key ) . '>' . $image . '</a>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Attributes via render attribute API, image markup from core.
			} else {
				echo $image; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Core image markup.
			}

			echo '</div>';
		}

		echo '</div>';

		if ( 'yes' === $settings['show_gallery'] && count( $ids ) > 1 ) {
			echo '<div class="refraction-product-images__thumbs">';

			foreach ( $ids as $index => $id ) {
				printf(
					'<button type="button" class="refraction-product-images__thumb%1$s" data-index="%2$d" aria-pressed="%3$s" aria-label="%4$s">%5$s</button>',
					0 === $index ? ' is-active' : '',
					(int) $index,
					0 === $index ? 'true' : 'false',
					/* translators: %d: image number. */
					esc_attr( sprintf( __( 'Show image %d', 'refraction' ), $index + 1 ) ),
					wp_get_attachment_image( $id, 'woocommerce_gallery_thumbnail', false, [ 'alt' => '' ] ) // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Core image markup.
				);
			}

			echo '</div>';
		}

		echo '</div>';
	}
}
