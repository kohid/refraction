<?php
namespace Refraction\Modules\Woocommerce\Widgets;

use Refraction\Controls_Manager;
use Refraction\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Purchase Summary: the order received (thank you) page: the order number, totals, payment method and the
 * order details. In the editor it shows the order chosen in Preview Settings.
 */
class Purchase_Summary extends Woo_Widget_Base {

	public function get_name() {
		return 'woo-purchase-summary';
	}

	public function get_title() {
		return esc_html__( 'Purchase Summary', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-product-info';
	}

	public function get_keywords() {
		return [ 'woocommerce', 'order', 'received', 'thank you', 'summary' ];
	}

	protected function needs_product(): bool {
		return false;
	}

	protected function register_controls() {
		$this->start_controls_section( 'section_content', [ 'label' => esc_html__( 'Purchase Summary', 'refraction' ) ] );
		$this->add_control(
			'info',
			[
				'type' => Controls_Manager::RAW_HTML,
				'raw' => esc_html__( 'Shows the order the customer just placed. In the editor it uses the order chosen in Preview Settings.', 'refraction' ),
				'content_classes' => 'refraction-descriptor',
			]
		);
		$this->end_controls_section();

		$this->start_controls_section( 'section_style', [ 'label' => esc_html__( 'Style', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$this->add_typography( 'text_typography', '{{WRAPPER}} .woocommerce-order' );
		$this->add_color_control( 'text_color', esc_html__( 'Text color', 'refraction' ), '{{WRAPPER}} .woocommerce-order' );
		$this->add_color_control( 'heading_color', esc_html__( 'Heading color', 'refraction' ), '{{WRAPPER}} .woocommerce-order h2' );
		$this->end_controls_section();
	}

	protected function render_widget(): void {
		if ( Plugin::$instance->editor->is_edit_mode() ) {
			$order = wc_get_order( \Refraction\Modules\Woocommerce\Classes\Preview::order_id() );

			if ( ! $order instanceof \WC_Order ) {
				$this->print_editor_hint( __( 'There is no order to preview yet. Place a test order, then choose it in Preview Settings.', 'refraction' ) );

				return;
			}

			wc_get_template( 'checkout/thankyou.php', [ 'order' => $order ] );

			return;
		}

		if ( ! is_wc_endpoint_url( 'order-received' ) ) {
			return;
		}

		// WooCommerce checks the order key and the customer before it shows anything.
		echo do_shortcode( '[woocommerce_checkout]' );
	}
}
