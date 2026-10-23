<?php
namespace Refraction\Modules\Woocommerce\Widgets;

use Refraction\Controls_Manager;
use Refraction\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Woo Breadcrumb: the WooCommerce trail (Home / Category / Product).
 */
class Woo_Breadcrumb extends Woo_Widget_Base {

	public function get_name() {
		return 'woo-breadcrumb';
	}

	public function get_title() {
		return esc_html__( 'Woo Breadcrumbs', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-product-breadcrumbs';
	}

	public function get_keywords() {
		return [ 'woocommerce', 'breadcrumb', 'trail', 'navigation' ];
	}

	protected function needs_product(): bool {
		return false;
	}

	protected function register_controls() {
		$this->start_controls_section( 'section_content', [ 'label' => esc_html__( 'Breadcrumbs', 'refraction' ) ] );
		$this->add_control( 'home', [ 'label' => esc_html__( 'Home label', 'refraction' ), 'type' => Controls_Manager::TEXT, 'placeholder' => esc_html__( 'Home', 'refraction' ) ] );
		$this->add_control( 'delimiter', [ 'label' => esc_html__( 'Separator', 'refraction' ), 'type' => Controls_Manager::TEXT, 'default' => '/' ] );
		$this->end_controls_section();

		$this->add_text_style_section( 'section_style', esc_html__( 'Text', 'refraction' ), '{{WRAPPER}} .woocommerce-breadcrumb' );
	}

	protected function render_widget(): void {
		$home = trim( (string) $this->get_settings( 'home' ) );
		$delimiter = trim( (string) $this->get_settings( 'delimiter' ) );

		ob_start();
		woocommerce_breadcrumb(
			[
				'delimiter' => ' ' . esc_html( '' !== $delimiter ? $delimiter : '/' ) . ' ',
				'home' => '' !== $home ? esc_html( $home ) : _x( 'Home', 'breadcrumb', 'refraction' ),
			]
		);
		$html = ob_get_clean();

		if ( '' === trim( (string) $html ) ) {
			$this->print_editor_hint( __( 'There is no breadcrumb trail on this page.', 'refraction' ) );

			return;
		}

		echo $html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- WooCommerce template output.
	}
}
