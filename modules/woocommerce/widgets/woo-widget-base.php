<?php
namespace Refraction\Modules\Woocommerce\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Typography;
use Refraction\Modules\ThemeBuilder\Widgets\Theme_Widget_Base;
use Refraction\Modules\Woocommerce\Classes\Product_Context;
use Refraction\Modules\Woocommerce\Classes\Woo_Assets;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Base of the WooCommerce widgets. They render on the server with WooCommerce's own template functions, inside a
 * `.woocommerce` wrapper so WooCommerce's stylesheet applies, and are never stored in the post content.
 *
 * A product widget shows the current product (a product page, the editor preview of a Single Product template or
 * an item of a loop), or the product whose ID is typed in the widget.
 */
abstract class Woo_Widget_Base extends Theme_Widget_Base {

	const CATEGORY = 'woocommerce';
	const STYLE_HANDLE = 'refraction-woocommerce';
	const SCRIPT_HANDLE = 'refraction-woocommerce-frontend';

	/** Whether the widget is about one product. */
	protected function needs_product(): bool {
		return true;
	}

	/** WooCommerce script handles this widget needs on pages WooCommerce does not load them on. */
	protected function get_woo_scripts(): array {
		return [];
	}

	/** Print the widget for the product (product widgets). */
	protected function render_product( \WC_Product $product ): void {
	}

	/** Print the widget (widgets that are not about one product). */
	protected function render_widget(): void {
	}

	public function get_categories() {
		return [ self::CATEGORY ];
	}

	public function get_style_depends(): array {
		return [ self::STYLE_HANDLE ];
	}

	public function get_script_depends(): array {
		return [ self::SCRIPT_HANDLE ];
	}

	/** The "Product" section: leave empty to use the current product. */
	protected function register_product_section(): void {
		$this->start_controls_section(
			'section_woo_product',
			[
				'label' => esc_html__( 'Product', 'refraction' ),
				'tab' => Controls_Manager::TAB_CONTENT,
			]
		);

		$this->add_control(
			'product_id',
			[
				'label' => esc_html__( 'Product ID', 'refraction' ),
				'type' => Controls_Manager::NUMBER,
				'min' => 0,
				'description' => esc_html__( 'Leave empty to use the product of the page, template preview or loop item.', 'refraction' ),
			]
		);

		$this->end_controls_section();
	}

	protected function add_color_control( string $name, string $label, string $selector, string $property = 'color', array $extra = [] ): void {
		$this->add_control(
			$name,
			[
				'label' => $label,
				'type' => Controls_Manager::COLOR,
				'selectors' => [ $selector => $property . ': {{VALUE}};' ],
			] + $extra
		);
	}

	protected function add_typography( string $name, string $selector ): void {
		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => $name, 'selector' => $selector ] );
	}

	protected function render() {
		if ( $this->needs_product() ) {
			$product = Product_Context::get_product( absint( $this->get_settings( 'product_id' ) ) );

			if ( ! $product ) {
				$this->print_editor_hint( __( 'There is no product to show here. Use this widget on a product page, in a Single Product template, in a loop of products, or type a product ID.', 'refraction' ) );

				return;
			}

			Woo_Assets::enqueue( $this->get_woo_scripts() );
			$this->open_wrapper();
			Product_Context::run( $product, function () use ( $product ) {
				$this->render_product( $product );
			} );
			echo '</div>';

			return;
		}

		Woo_Assets::enqueue( $this->get_woo_scripts() );
		$this->open_wrapper();
		$this->render_widget();
		echo '</div>';
	}

	private function open_wrapper(): void {
		printf( '<div class="woocommerce refraction-woo refraction-woo--%s">', esc_attr( sanitize_html_class( $this->get_name() ) ) );
	}

	/** A heading tag that is one of h1 to h6, div, span or p. */
	protected function print_text_in_tag( string $tag, string $class, string $html ): void {
		printf( '<%1$s class="%2$s">%3$s</%1$s>', tag_escape( $tag ), esc_attr( $class ), $html ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $html is escaped or WooCommerce markup.
	}

	protected function content_template() {}
}
