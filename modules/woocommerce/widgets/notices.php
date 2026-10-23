<?php
namespace Refraction\Modules\Woocommerce\Widgets;

use Refraction\Controls_Manager;
use Refraction\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * WooCommerce Notices: the messages WooCommerce raises ("added to your cart", coupon errors, login errors).
 */
class Notices extends Woo_Widget_Base {

	public function get_name() {
		return 'woo-notices';
	}

	public function get_title() {
		return esc_html__( 'WooCommerce Notices', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-woocommerce-notices';
	}

	public function get_keywords() {
		return [ 'woocommerce', 'notices', 'messages', 'alerts', 'errors' ];
	}

	protected function needs_product(): bool {
		return false;
	}

	protected function register_controls() {
		$this->start_controls_section( 'section_content', [ 'label' => esc_html__( 'Notices', 'refraction' ) ] );
		$this->add_control(
			'info',
			[
				'type' => Controls_Manager::RAW_HTML,
				'raw' => esc_html__( 'Prints WooCommerce messages here. Put it near the top of product, shop and cart templates.', 'refraction' ),
				'content_classes' => 'refraction-descriptor',
			]
		);
		$this->end_controls_section();

		$this->start_controls_section( 'section_style', [ 'label' => esc_html__( 'Style', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$this->add_typography( 'text_typography', '{{WRAPPER}} .woocommerce-message, {{WRAPPER}} .woocommerce-error li, {{WRAPPER}} .woocommerce-info' );
		$this->add_color_control( 'message_bg', esc_html__( 'Message background', 'refraction' ), '{{WRAPPER}} .woocommerce-message', 'background-color' );
		$this->add_color_control( 'error_bg', esc_html__( 'Error background', 'refraction' ), '{{WRAPPER}} .woocommerce-error', 'background-color' );
		$this->end_controls_section();
	}

	protected function render_widget(): void {
		echo '<div class="woocommerce-notices-wrapper">';

		if ( Plugin::$instance->editor->is_edit_mode() ) {
			echo '<div class="woocommerce-message" role="status">' . esc_html__( 'Sample message: "Product" has been added to your cart.', 'refraction' ) . '</div>';
		} else {
			wc_print_notices();
		}

		echo '</div>';
	}
}
