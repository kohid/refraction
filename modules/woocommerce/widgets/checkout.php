<?php
namespace Refraction\Modules\Woocommerce\Widgets;

use Refraction\Controls_Manager;
use Refraction\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Checkout: WooCommerce's classic shortcode `[woocommerce_checkout]` as a widget.
 */
class Checkout extends Woo_Widget_Base {

	public function get_name() {
		return 'woo-checkout';
	}

	public function get_title() {
		return esc_html__( 'Checkout', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-checkout';
	}

	public function get_keywords() {
		return [ 'woocommerce', 'checkout', 'pay', 'billing', 'order' ];
	}

	protected function needs_product(): bool {
		return false;
	}

	protected function get_woo_scripts(): array {
		return [ 'wc-checkout', 'wc-country-select', 'wc-address-i18n', 'wc-password-strength-meter' ];
	}

	protected function register_controls() {
		$this->start_controls_section( 'section_content', [ 'label' => esc_html__( 'Checkout', 'refraction' ) ] );
		$this->add_control(
			'info',
			[
				'type' => Controls_Manager::RAW_HTML,
				'raw' => esc_html__( 'Shows the classic WooCommerce checkout form (billing, shipping, payment). The Checkout block is a different system: to use it, leave this widget out and show the page content in the template instead.', 'refraction' ),
				'content_classes' => 'refraction-descriptor',
			]
		);
		$this->end_controls_section();

		$this->start_controls_section( 'section_style', [ 'label' => esc_html__( 'Style', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$this->add_typography( 'text_typography', '{{WRAPPER}} .woocommerce' );
		$this->add_color_control( 'text_color', esc_html__( 'Text color', 'refraction' ), '{{WRAPPER}} .woocommerce' );
		$this->add_color_control( 'link_color', esc_html__( 'Link color', 'refraction' ), '{{WRAPPER}} .woocommerce a:not(.button)' );
		$this->add_color_control( 'button_color', esc_html__( 'Button text color', 'refraction' ), '{{WRAPPER}} .woocommerce .button, {{WRAPPER}} .woocommerce button.button' );
		$this->add_color_control( 'button_bg', esc_html__( 'Button background', 'refraction' ), '{{WRAPPER}} .woocommerce .button, {{WRAPPER}} .woocommerce button.button', 'background-color' );
		$this->end_controls_section();
	}

	protected function render_widget(): void {
		if ( Plugin::$instance->editor->is_edit_mode() ) {
			// The editor has no basket: still show the form so it can be styled.
			add_filter( 'woocommerce_checkout_redirect_empty_cart', '__return_false', 99 );
		} elseif ( WC()->cart && WC()->cart->is_empty() && ! is_wc_endpoint_url( 'order-pay' ) && ! is_wc_endpoint_url( 'order-received' ) ) {
			wc_print_notices();
			echo '<p class="cart-empty woocommerce-info">' . esc_html( apply_filters( 'wc_empty_cart_message', __( 'Your cart is currently empty.', 'woocommerce' ) ) ) . '</p>'; // phpcs:ignore WordPress.WP.I18n.TextDomainMismatch -- WooCommerce's own string.

			return;
		}

		echo do_shortcode( '[woocommerce_checkout]' );
	}
}
