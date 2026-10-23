<?php
namespace Refraction\Modules\Woocommerce\Widgets;

use Refraction\Controls_Manager;
use Refraction\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use Refraction\Core\Utils\Icons;
use Refraction\Modules\Woocommerce\Classes\Settings;

/**
 * Menu Cart: a cart icon with the item count and total that opens the mini cart in a dropdown or an off-canvas
 * panel. The numbers and the mini cart follow the cart through WooCommerce's cart fragments.
 */
class Menu_Cart extends Woo_Widget_Base {

	public function get_name() {
		return 'woo-menu-cart';
	}

	public function get_title() {
		return esc_html__( 'Menu Cart', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-woo-cart';
	}

	public function get_keywords() {
		return [ 'woocommerce', 'cart', 'menu', 'mini cart', 'basket', 'header' ];
	}

	protected function needs_product(): bool {
		return false;
	}

	protected function get_woo_scripts(): array {
		return [ 'wc-cart-fragments' ];
	}

	protected function register_controls() {
		$this->start_controls_section( 'section_content', [ 'label' => esc_html__( 'Menu Cart', 'refraction' ) ] );

		$this->add_control( 'icon', [ 'label' => esc_html__( 'Icon', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => 'shopping-cart', 'options' => [ 'shopping-cart' => esc_html__( 'Cart', 'refraction' ), 'shopping-bag' => esc_html__( 'Bag', 'refraction' ), 'shopping-basket' => esc_html__( 'Basket', 'refraction' ), 'none' => esc_html__( 'None', 'refraction' ) ] ] );
		$this->add_control( 'show_count', [ 'label' => esc_html__( 'Item count', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'default' => 'yes' ] );
		$this->add_control( 'hide_empty_count', [ 'label' => esc_html__( 'Hide the count when the cart is empty', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'condition' => [ 'show_count' => 'yes' ] ] );
		$this->add_control( 'show_total', [ 'label' => esc_html__( 'Cart total', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'default' => 'yes' ] );
		$this->add_control( 'mode', [ 'label' => esc_html__( 'Mini cart', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => 'dropdown', 'options' => [ 'dropdown' => esc_html__( 'Dropdown', 'refraction' ), 'offcanvas' => esc_html__( 'Off-canvas panel', 'refraction' ), 'none' => esc_html__( 'None, link to the cart page', 'refraction' ) ] ] );

		$this->end_controls_section();

		$this->start_controls_section( 'section_style_toggle', [ 'label' => esc_html__( 'Toggle', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$this->add_typography( 'toggle_typography', '{{WRAPPER}} .refraction-menu-cart__toggle' );
		$this->add_color_control( 'toggle_color', esc_html__( 'Color', 'refraction' ), '{{WRAPPER}} .refraction-menu-cart__toggle' );
		$this->add_color_control( 'toggle_hover_color', esc_html__( 'Hover color', 'refraction' ), '{{WRAPPER}} .refraction-menu-cart__toggle:hover' );
		$this->add_responsive_control( 'icon_size', [ 'label' => esc_html__( 'Icon size', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 12, 'max' => 60 ] ], 'selectors' => [ '{{WRAPPER}} .refraction-menu-cart__icon svg' => 'width: {{SIZE}}{{UNIT}}; height: {{SIZE}}{{UNIT}};' ] ] );
		$this->add_color_control( 'badge_color', esc_html__( 'Count text color', 'refraction' ), '{{WRAPPER}} .refraction-menu-cart__count' );
		$this->add_color_control( 'badge_bg', esc_html__( 'Count background', 'refraction' ), '{{WRAPPER}} .refraction-menu-cart__count', 'background-color' );
		$this->end_controls_section();

		$this->start_controls_section( 'section_style_panel', [ 'label' => esc_html__( 'Mini cart', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$this->add_responsive_control( 'panel_width', [ 'label' => esc_html__( 'Width', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'size_units' => [ 'px', 'vw' ], 'range' => [ 'px' => [ 'min' => 240, 'max' => 640 ], 'vw' => [ 'min' => 20, 'max' => 100 ] ], 'selectors' => [ '{{WRAPPER}} .refraction-menu-cart__panel' => 'width: {{SIZE}}{{UNIT}};' ] ] );
		$this->add_color_control( 'panel_bg', esc_html__( 'Background', 'refraction' ), '{{WRAPPER}} .refraction-menu-cart__panel', 'background-color' );
		$this->add_color_control( 'panel_color', esc_html__( 'Text color', 'refraction' ), '{{WRAPPER}} .refraction-menu-cart__panel' );
		$this->add_color_control( 'checkout_bg', esc_html__( 'Checkout button background', 'refraction' ), '{{WRAPPER}} .refraction-menu-cart__panel .button.checkout', 'background-color' );
		$this->end_controls_section();
	}

	protected function render_widget(): void {
		$s = $this->get_settings_for_display();
		$cart = function_exists( 'WC' ) ? WC()->cart : null;
		$count = $cart ? (int) $cart->get_cart_contents_count() : 0;
		$total = $cart ? wp_kses_post( $cart->get_cart_subtotal() ) : '';
		$mode = Settings::cart_mode( $s['mode'] );

		// The cart and checkout pages already show the basket.
		if ( ! Plugin::$instance->editor->is_edit_mode() && ( is_cart() || is_checkout() ) ) {
			$mode = 'none';
		}

		$uid = 'refraction-mini-cart-' . $this->get_id();
		$hide_count = 'yes' === $s['hide_empty_count'] && 0 === $count;
		$cart_url = function_exists( 'wc_get_cart_url' ) ? wc_get_cart_url() : home_url( '/' );
		$icon = in_array( $s['icon'], [ 'shopping-cart', 'shopping-bag', 'shopping-basket' ], true ) ? $s['icon'] : '';

		printf( '<div class="refraction-menu-cart" data-mode="%s">', esc_attr( $mode ) );

		printf(
			'<a class="refraction-menu-cart__toggle" href="%1$s"%2$s>',
			esc_url( $cart_url ),
			'none' === $mode ? '' : ' aria-expanded="false" aria-controls="' . esc_attr( $uid ) . '"'
		);

		if ( $icon ) {
			echo '<span class="refraction-menu-cart__icon">';
			echo Icons::svg( $icon, [ 'size' => 24 ] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Bundled static SVG.
			echo '</span>';
		}

		if ( 'yes' === $s['show_count'] ) {
			printf( '<span class="refraction-menu-cart__count"%1$s%3$s>%2$d</span>', $hide_count ? ' hidden' : '', (int) $count, 'yes' === $s['hide_empty_count'] ? ' data-hide-empty="1"' : '' );
		}

		if ( 'yes' === $s['show_total'] ) {
			echo '<span class="refraction-menu-cart__total">' . $total . '</span>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped with wp_kses_post() above.
		}

		/* translators: %d: number of items in the cart. */
		echo '<span class="screen-reader-text">' . esc_html( sprintf( _n( 'View your cart (%d item)', 'View your cart (%d items)', $count, 'refraction' ), $count ) ) . '</span>';
		echo '</a>';

		if ( 'none' !== $mode ) {
			if ( 'offcanvas' === $mode ) {
				echo '<div class="refraction-menu-cart__overlay" hidden></div>';
			}

			printf( '<div class="refraction-menu-cart__panel" id="%s" role="dialog" aria-label="%s" hidden>', esc_attr( $uid ), esc_attr__( 'Your cart', 'refraction' ) );

			if ( 'offcanvas' === $mode ) {
				printf( '<button type="button" class="refraction-menu-cart__close" aria-label="%s">&times;</button>', esc_attr__( 'Close the cart', 'refraction' ) );
			}

			echo '<div class="widget_shopping_cart_content">';

			if ( $cart ) {
				woocommerce_mini_cart();
			}

			echo '</div></div>';
		}

		echo \Refraction\Modules\Woocommerce\Module::get_cart_data_html(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped where built.
		echo '</div>';
	}
}
