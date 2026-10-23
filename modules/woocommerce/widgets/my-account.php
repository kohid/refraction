<?php
namespace Refraction\Modules\Woocommerce\Widgets;

use Refraction\Controls_Manager;
use Refraction\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * My Account: WooCommerce's classic shortcode `[woocommerce_my_account]` as a widget.
 */
class My_Account extends Woo_Widget_Base {

	public function get_name() {
		return 'woo-my-account';
	}

	public function get_title() {
		return esc_html__( 'My Account', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-my-account';
	}

	public function get_keywords() {
		return [ 'woocommerce', 'account', 'login', 'orders', 'customer' ];
	}

	protected function needs_product(): bool {
		return false;
	}

	protected function get_woo_scripts(): array {
		return [ 'wc-password-strength-meter' ];
	}

	protected function register_controls() {
		$this->start_controls_section( 'section_content', [ 'label' => esc_html__( 'My Account', 'refraction' ) ] );
		$this->add_control(
			'info',
			[
				'type' => Controls_Manager::RAW_HTML,
				'raw' => esc_html__( 'Shows the customer account: the login and register forms for visitors, the dashboard, orders, addresses and account details for customers.', 'refraction' ),
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
		echo do_shortcode( '[woocommerce_my_account]' );
	}
}
