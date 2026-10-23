<?php
namespace Refraction\Modules\Woocommerce\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Border;
use Refraction\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Add to Cart: WooCommerce's own add to cart form for the product type (quantity, variations, grouped list,
 * external button), optionally submitted without leaving the page.
 */
class Add_To_Cart extends Woo_Widget_Base {

	public function get_name() {
		return 'woo-add-to-cart';
	}

	public function get_title() {
		return esc_html__( 'Add to Cart', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-product-add-to-cart';
	}

	public function get_keywords() {
		return [ 'woocommerce', 'product', 'add', 'cart', 'buy', 'button', 'variation', 'quantity' ];
	}

	protected function get_woo_scripts(): array {
		return [ 'wc-add-to-cart', 'wc-add-to-cart-variation', 'wc-cart-fragments' ];
	}

	protected function register_controls() {
		$this->register_product_section();

		$this->start_controls_section( 'section_content', [ 'label' => esc_html__( 'Add to Cart', 'refraction' ) ] );

		$this->add_control( 'ajax', [ 'label' => esc_html__( 'Add without reloading the page', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'default' => 'yes' ] );
		$this->add_control( 'quantity', [ 'label' => esc_html__( 'Quantity field', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => 'show', 'options' => [ 'show' => esc_html__( 'Show', 'refraction' ), 'hide' => esc_html__( 'Hide', 'refraction' ) ], 'prefix_class' => 'refraction-woo-qty-' ] );
		$this->add_control( 'button_text', [ 'label' => esc_html__( 'Button text', 'refraction' ), 'type' => Controls_Manager::TEXT, 'placeholder' => esc_html__( 'Add to cart', 'refraction' ) ] );
		$this->add_responsive_control( 'align', [ 'label' => esc_html__( 'Alignment', 'refraction' ), 'type' => Controls_Manager::CHOOSE, 'options' => [ 'flex-start' => [ 'title' => esc_html__( 'Start', 'refraction' ), 'icon' => 'rficon-text-align-left' ], 'center' => [ 'title' => esc_html__( 'Center', 'refraction' ), 'icon' => 'rficon-text-align-center' ], 'flex-end' => [ 'title' => esc_html__( 'End', 'refraction' ), 'icon' => 'rficon-text-align-right' ] ], 'selectors' => [ '{{WRAPPER}} form.cart, {{WRAPPER}} .woocommerce-variation-add-to-cart' => 'justify-content: {{VALUE}};' ] ] );

		$this->end_controls_section();

		$button = '{{WRAPPER}} .single_add_to_cart_button, {{WRAPPER}} .button.product_type_external';

		$this->start_controls_section( 'section_button_style', [ 'label' => esc_html__( 'Button', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$this->add_typography( 'button_typography', $button );
		$this->start_controls_tabs( 'button_tabs' );
		$this->start_controls_tab( 'button_normal', [ 'label' => esc_html__( 'Normal', 'refraction' ) ] );
		$this->add_color_control( 'button_color', esc_html__( 'Text color', 'refraction' ), $button );
		$this->add_color_control( 'button_bg', esc_html__( 'Background', 'refraction' ), $button, 'background-color' );
		$this->end_controls_tab();
		$this->start_controls_tab( 'button_hover', [ 'label' => esc_html__( 'Hover', 'refraction' ) ] );
		$this->add_color_control( 'button_hover_color', esc_html__( 'Text color', 'refraction' ), '{{WRAPPER}} .single_add_to_cart_button:hover, {{WRAPPER}} .button.product_type_external:hover' );
		$this->add_color_control( 'button_hover_bg', esc_html__( 'Background', 'refraction' ), '{{WRAPPER}} .single_add_to_cart_button:hover, {{WRAPPER}} .button.product_type_external:hover', 'background-color' );
		$this->end_controls_tab();
		$this->end_controls_tabs();
		$this->add_group_control( Group_Control_Border::get_type(), [ 'name' => 'button_border', 'selector' => $button, 'separator' => 'before' ] );
		$this->add_responsive_control( 'button_radius', [ 'label' => esc_html__( 'Border radius', 'refraction' ), 'type' => Controls_Manager::DIMENSIONS, 'size_units' => [ 'px', '%' ], 'selectors' => [ $button => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ] ] );
		$this->add_responsive_control( 'button_padding', [ 'label' => esc_html__( 'Padding', 'refraction' ), 'type' => Controls_Manager::DIMENSIONS, 'size_units' => [ 'px', 'em' ], 'selectors' => [ $button => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ] ] );
		$this->end_controls_section();

		$this->start_controls_section( 'section_quantity_style', [ 'label' => esc_html__( 'Quantity and options', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$this->add_responsive_control( 'qty_width', [ 'label' => esc_html__( 'Quantity width', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 40, 'max' => 160 ] ], 'selectors' => [ '{{WRAPPER}} .quantity .qty' => 'width: {{SIZE}}{{UNIT}};' ] ] );
		$this->add_typography( 'label_typography', '{{WRAPPER}} table.variations th label' );
		$this->add_color_control( 'label_color', esc_html__( 'Option label color', 'refraction' ), '{{WRAPPER}} table.variations th label' );
		$this->end_controls_section();
	}

	protected function render_product( \WC_Product $product ): void {
		$text = trim( (string) $this->get_settings( 'button_text' ) );
		$filter = '' !== $text ? static fn() => $text : null;

		if ( $filter ) {
			add_filter( 'woocommerce_product_single_add_to_cart_text', $filter );
		}

		printf( '<div class="refraction-add-to-cart" data-ajax-add="%s">', 'yes' === $this->get_settings( 'ajax' ) ? 'yes' : 'no' );

		// Messages of the last add to cart: WooCommerce prints them where the template asks, this is the fallback.
		echo '<div class="woocommerce-notices-wrapper refraction-add-to-cart__notices" role="status">';

		if ( ! Plugin::$instance->editor->is_edit_mode() && function_exists( 'wc_print_notices' ) ) {
			wc_print_notices();
		}

		echo '</div>';

		woocommerce_template_single_add_to_cart();

		echo '</div>';

		if ( $filter ) {
			remove_filter( 'woocommerce_product_single_add_to_cart_text', $filter );
		}
	}
}
