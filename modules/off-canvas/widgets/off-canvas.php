<?php
namespace Refraction\Modules\OffCanvas\Widgets;

use Refraction\Controls_Manager;
use Refraction\Core\Utils\Icons;
use Refraction\Group_Control_Background;
use Refraction\Group_Control_Border;
use Refraction\Group_Control_Box_Shadow;
use Refraction\Group_Control_Typography;
use Refraction\Modules\NestedElements\Base\Widget_Nested_Base;
use Refraction\Modules\OffCanvas\Classes\Off_Canvas_Logic;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Off-Canvas: a panel that holds a container (any widgets), opened by a built-in button, any element
 * or a `#refraction-offcanvas:ID` link, and closed by its button, the overlay or Escape.
 */
class Off_Canvas extends Widget_Nested_Base {

	public function get_name() {
		return 'refraction-off-canvas';
	}

	public function get_title() {
		return esc_html__( 'Off-Canvas', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-nav-menu';
	}

	public function get_keywords() {
		return [ 'off canvas', 'offcanvas', 'drawer', 'sidebar', 'panel', 'slide', 'menu', 'modal', 'nested' ];
	}

	public function get_style_depends(): array {
		return [ 'widget-off-canvas' ];
	}

	protected function is_dynamic_content(): bool {
		return true;
	}

	protected function get_html_wrapper_class() {
		return 'refraction-widget-off-canvas';
	}

	protected function get_default_children_elements() {
		return [
			[
				'elType' => 'container',
				'settings' => [
					'_title' => __( 'Off-canvas content', 'refraction' ),
					'content_width' => 'full',
				],
			],
		];
	}

	protected function get_default_repeater_title_setting_key() {
		return 'panel_label';
	}

	protected function get_default_children_placeholder_selector() {
		return '.refraction-offcanvas__content';
	}

	protected function register_controls() {
		$this->start_controls_section( 'section_panel', [
			'label' => esc_html__( 'Panel', 'refraction' ),
		] );

		$this->add_control( 'position', [
			'label' => esc_html__( 'Opens from', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'left',
			'options' => [
				'left' => esc_html__( 'Left', 'refraction' ),
				'right' => esc_html__( 'Right', 'refraction' ),
				'top' => esc_html__( 'Top', 'refraction' ),
				'bottom' => esc_html__( 'Bottom', 'refraction' ),
				'center' => esc_html__( 'Center (overlay)', 'refraction' ),
			],
			'prefix_class' => 'refraction-offcanvas-position-',
		] );

		$this->add_control( 'mode', [
			'label' => esc_html__( 'Mode', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'overlay',
			'options' => [
				'overlay' => esc_html__( 'Overlay the page', 'refraction' ),
				'push' => esc_html__( 'Push the page', 'refraction' ),
			],
			'condition' => [ 'position' => [ 'left', 'right', 'top' ] ],
			'description' => esc_html__( 'Push moves the page content aside instead of covering it.', 'refraction' ),
		] );

		$this->add_responsive_control( 'panel_width', [
			'label' => esc_html__( 'Width', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px', '%', 'vw' ],
			'range' => [
				'px' => [ 'min' => 200, 'max' => 1200 ],
				'%' => [ 'min' => 10, 'max' => 100 ],
				'vw' => [ 'min' => 10, 'max' => 100 ],
			],
			'default' => [ 'size' => 380, 'unit' => 'px' ],
			'condition' => [ 'position' => [ 'left', 'right', 'center' ] ],
			'selectors' => [ '{{WRAPPER}}' => '--refraction-oc-width: {{SIZE}}{{UNIT}};' ],
		] );

		$this->add_responsive_control( 'panel_height', [
			'label' => esc_html__( 'Height', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px', 'vh' ],
			'range' => [
				'px' => [ 'min' => 100, 'max' => 1000 ],
				'vh' => [ 'min' => 10, 'max' => 100 ],
			],
			'default' => [ 'size' => 50, 'unit' => 'vh' ],
			'condition' => [ 'position' => [ 'top', 'bottom' ] ],
			'selectors' => [ '{{WRAPPER}}' => '--refraction-oc-height: {{SIZE}}{{UNIT}};' ],
		] );

		$this->add_control( 'panel_label', [
			'label' => esc_html__( 'Accessible name', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => esc_html__( 'Menu', 'refraction' ),
			'label_block' => true,
			'description' => esc_html__( 'Announced by screen readers when the panel opens.', 'refraction' ),
			'dynamic' => [ 'active' => true ],
		] );

		$this->add_control( 'panel_id', [
			'label' => esc_html__( 'Panel ID', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => '',
			'label_block' => true,
			'placeholder' => 'main-menu',
			'description' => esc_html__( 'Open this panel from any link with the URL #refraction-offcanvas:your-id. Letters, numbers, dashes and underscores only.', 'refraction' ),
			'ai' => [ 'active' => false ],
		] );

		$this->end_controls_section();

		$this->start_controls_section( 'section_trigger', [
			'label' => esc_html__( 'Trigger', 'refraction' ),
		] );

		$this->add_control( 'show_button', [
			'label' => esc_html__( 'Built-in button', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'return_value' => 'yes',
		] );

		$this->add_control( 'button_text', [
			'label' => esc_html__( 'Button text', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => esc_html__( 'Open menu', 'refraction' ),
			'condition' => [ 'show_button' => 'yes' ],
			'dynamic' => [ 'active' => true ],
		] );

		$this->add_control( 'show_button_icon', [
			'label' => esc_html__( 'Hamburger icon', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'return_value' => 'yes',
			'condition' => [ 'show_button' => 'yes' ],
		] );

		$this->add_control( 'trigger_selector', [
			'label' => esc_html__( 'Open from any element', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => '',
			'label_block' => true,
			'placeholder' => '.open-menu, #my-button',
			'description' => esc_html__( 'A CSS selector: clicking a matching element on the page opens this panel.', 'refraction' ),
			'ai' => [ 'active' => false ],
		] );

		$this->end_controls_section();

		$this->start_controls_section( 'section_behavior', [
			'label' => esc_html__( 'Behavior', 'refraction' ),
		] );

		$this->add_control( 'show_close_button', [
			'label' => esc_html__( 'Close button', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'return_value' => 'yes',
		] );

		$this->add_control( 'close_on_overlay', [
			'label' => esc_html__( 'Close on overlay click', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'return_value' => 'yes',
		] );

		$this->add_control( 'close_on_esc', [
			'label' => esc_html__( 'Close on Escape', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'return_value' => 'yes',
		] );

		$this->add_control( 'lock_scroll', [
			'label' => esc_html__( 'Lock page scroll while open', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'return_value' => 'yes',
		] );

		$this->add_control( 'panel_animation', [
			'label' => esc_html__( 'Animation', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'slide',
			'options' => [
				'slide' => esc_html__( 'Slide', 'refraction' ),
				'fade' => esc_html__( 'Fade', 'refraction' ),
			],
			'prefix_class' => 'refraction-offcanvas-animation-',
		] );

		$this->add_control( 'duration', [
			'label' => esc_html__( 'Duration (ms)', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'default' => 300,
			'min' => 0,
			'max' => 2000,
			'step' => 50,
			'selectors' => [ '{{WRAPPER}}' => '--refraction-oc-duration: {{VALUE}}ms;' ],
			'description' => esc_html__( 'Visitors who prefer reduced motion get no animation.', 'refraction' ),
		] );

		$this->end_controls_section();

		$this->register_style_controls();
	}

	private function register_style_controls() {
		$this->start_controls_section( 'section_style_button', [
			'label' => esc_html__( 'Button', 'refraction' ),
			'tab' => Controls_Manager::TAB_STYLE,
			'condition' => [ 'show_button' => 'yes' ],
		] );

		$this->add_group_control( Group_Control_Typography::get_type(), [
			'name' => 'button_typography',
			'selector' => '{{WRAPPER}} .refraction-offcanvas__trigger',
		] );

		$this->start_controls_tabs( 'tabs_button' );

		foreach ( [
			'normal' => [ esc_html__( 'Normal', 'refraction' ), '' ],
			'hover' => [ esc_html__( 'Hover', 'refraction' ), ':hover, {{WRAPPER}} .refraction-offcanvas__trigger:focus-visible' ],
		] as $state => $info ) {
			$this->start_controls_tab( "tab_button_$state", [ 'label' => $info[0] ] );

			$this->add_control( "button_color_$state", [
				'label' => esc_html__( 'Text color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-offcanvas__trigger' . $info[1] => 'color: {{VALUE}};' ],
			] );

			$this->add_control( "button_bg_$state", [
				'label' => esc_html__( 'Background', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-offcanvas__trigger' . $info[1] => 'background-color: {{VALUE}};' ],
			] );

			$this->end_controls_tab();
		}

		$this->end_controls_tabs();

		$this->add_group_control( Group_Control_Border::get_type(), [
			'name' => 'button_border',
			'selector' => '{{WRAPPER}} .refraction-offcanvas__trigger',
			'separator' => 'before',
		] );

		$this->add_responsive_control( 'button_radius', [
			'label' => esc_html__( 'Border radius', 'refraction' ),
			'type' => Controls_Manager::DIMENSIONS,
			'size_units' => [ 'px', '%' ],
			'selectors' => [ '{{WRAPPER}} .refraction-offcanvas__trigger' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
		] );

		$this->add_responsive_control( 'button_padding', [
			'label' => esc_html__( 'Padding', 'refraction' ),
			'type' => Controls_Manager::DIMENSIONS,
			'size_units' => [ 'px', 'em' ],
			'selectors' => [ '{{WRAPPER}} .refraction-offcanvas__trigger' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
		] );

		$this->end_controls_section();

		$this->start_controls_section( 'section_style_panel', [
			'label' => esc_html__( 'Panel', 'refraction' ),
			'tab' => Controls_Manager::TAB_STYLE,
		] );

		$this->add_group_control( Group_Control_Background::get_type(), [
			'name' => 'panel_background',
			'types' => [ 'classic', 'gradient' ],
			'selector' => '{{WRAPPER}} .refraction-offcanvas__panel',
		] );

		$this->add_group_control( Group_Control_Border::get_type(), [
			'name' => 'panel_border',
			'selector' => '{{WRAPPER}} .refraction-offcanvas__panel',
		] );

		$this->add_responsive_control( 'panel_radius', [
			'label' => esc_html__( 'Border radius', 'refraction' ),
			'type' => Controls_Manager::DIMENSIONS,
			'size_units' => [ 'px', '%' ],
			'selectors' => [ '{{WRAPPER}} .refraction-offcanvas__panel' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
		] );

		$this->add_group_control( Group_Control_Box_Shadow::get_type(), [
			'name' => 'panel_shadow',
			'selector' => '{{WRAPPER}} .refraction-offcanvas__panel',
		] );

		$this->add_responsive_control( 'panel_padding', [
			'label' => esc_html__( 'Padding', 'refraction' ),
			'type' => Controls_Manager::DIMENSIONS,
			'size_units' => [ 'px', 'em', '%' ],
			'selectors' => [ '{{WRAPPER}} .refraction-offcanvas__content' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
		] );

		$this->end_controls_section();

		$this->start_controls_section( 'section_style_overlay', [
			'label' => esc_html__( 'Overlay', 'refraction' ),
			'tab' => Controls_Manager::TAB_STYLE,
		] );

		$this->add_control( 'overlay_color', [
			'label' => esc_html__( 'Color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'default' => 'rgba(10, 12, 18, 0.55)',
			'selectors' => [ '{{WRAPPER}} .refraction-offcanvas__overlay' => 'background-color: {{VALUE}};' ],
		] );

		$this->add_control( 'overlay_blur', [
			'label' => esc_html__( 'Blur', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 20 ] ],
			'selectors' => [ '{{WRAPPER}} .refraction-offcanvas__overlay' => 'backdrop-filter: blur({{SIZE}}px);' ],
		] );

		$this->end_controls_section();

		$this->start_controls_section( 'section_style_close', [
			'label' => esc_html__( 'Close button', 'refraction' ),
			'tab' => Controls_Manager::TAB_STYLE,
			'condition' => [ 'show_close_button' => 'yes' ],
		] );

		$this->add_control( 'close_color', [
			'label' => esc_html__( 'Color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .refraction-offcanvas__close' => 'color: {{VALUE}};' ],
		] );

		$this->add_control( 'close_bg', [
			'label' => esc_html__( 'Background', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .refraction-offcanvas__close' => 'background-color: {{VALUE}};' ],
		] );

		$this->add_responsive_control( 'close_size', [
			'label' => esc_html__( 'Size', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 16, 'max' => 64 ] ],
			'default' => [ 'size' => 24, 'unit' => 'px' ],
			'selectors' => [ '{{WRAPPER}} .refraction-offcanvas__close svg' => 'width: {{SIZE}}px; height: {{SIZE}}px;' ],
		] );

		$this->end_controls_section();
	}

	private function trigger_html( array $settings, string $panel_id ): string {
		if ( 'yes' !== ( $settings['show_button'] ?? '' ) ) {
			return '';
		}

		$text = (string) ( $settings['button_text'] ?? '' );
		$label = '' !== $text ? $text : ( $settings['panel_label'] ?? __( 'Menu', 'refraction' ) );

		ob_start();
		?>
		<button type="button" class="refraction-offcanvas__trigger" aria-haspopup="dialog" aria-expanded="false" aria-controls="<?php echo esc_attr( $panel_id ); ?>"<?php echo '' === $text ? ' aria-label="' . esc_attr( $label ) . '"' : ''; ?>>
			<?php if ( 'yes' === ( $settings['show_button_icon'] ?? '' ) ) : ?>
				<span class="refraction-offcanvas__trigger-icon" aria-hidden="true"><?php echo Icons::svg( 'menu', [ 'size' => 24 ] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></span>
			<?php endif; ?>
			<?php if ( '' !== $text ) : ?>
				<span class="refraction-offcanvas__trigger-text"><?php echo esc_html( $text ); ?></span>
			<?php endif; ?>
		</button>
		<?php
		return ob_get_clean();
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		$logic = Off_Canvas_Logic::sanitize( [
			'position' => $settings['position'] ?? 'left',
			'mode' => $settings['mode'] ?? 'overlay',
			'close_on_overlay' => $settings['close_on_overlay'] ?? '',
			'close_on_esc' => $settings['close_on_esc'] ?? '',
			'duration' => $settings['duration'] ?? 300,
		] );
		$panel_id = Off_Canvas_Logic::panel_id( $this->get_id(), (string) ( $settings['panel_id'] ?? '' ) );
		$label = '' !== (string) ( $settings['panel_label'] ?? '' ) ? $settings['panel_label'] : __( 'Menu', 'refraction' );

		$this->add_render_attribute( 'wrap', [
			'class' => 'refraction-offcanvas',
			'data-panel-id' => $panel_id,
			'data-position' => $logic['position'],
			'data-mode' => $logic['mode'],
			'data-close-overlay' => $logic['close_on_overlay'] ? 'yes' : 'no',
			'data-close-esc' => $logic['close_on_esc'] ? 'yes' : 'no',
			'data-lock-scroll' => 'yes' === ( $settings['lock_scroll'] ?? '' ) ? 'yes' : 'no',
			'data-trigger-selector' => (string) ( $settings['trigger_selector'] ?? '' ),
		] );
		?>
		<div <?php $this->print_render_attribute_string( 'wrap' ); ?>>
			<?php echo $this->trigger_html( $settings, $panel_id ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
			<div class="refraction-offcanvas__layer" inert>
				<div class="refraction-offcanvas__overlay" data-refraction-offcanvas-overlay></div>
				<div class="refraction-offcanvas__panel" id="<?php echo esc_attr( $panel_id ); ?>" role="dialog" aria-modal="true" aria-label="<?php echo esc_attr( $label ); ?>" aria-hidden="true" tabindex="-1">
					<?php if ( 'yes' === ( $settings['show_close_button'] ?? '' ) ) : ?>
						<button type="button" class="refraction-offcanvas__close" aria-label="<?php echo esc_attr__( 'Close', 'refraction' ); ?>"><?php echo Icons::svg( 'close', [ 'size' => 24 ] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></button>
					<?php endif; ?>
					<div class="refraction-offcanvas__content">
						<?php $this->print_child( 0 ); ?>
					</div>
				</div>
			</div>
		</div>
		<?php
	}

	protected function get_initial_config(): array {
		return array_merge( parent::get_initial_config(), [
			'target_container' => [ '.refraction-offcanvas__content' ],
		] );
	}

	protected function content_template() {
		?>
		<#
		const panelId = settings.panel_id ? settings.panel_id.toLowerCase().replace( /[^a-z0-9_-]+/g, '-' ).replace( /^-+|-+$/g, '' ) : '',
			id = panelId || 'refraction-offcanvas-' + view.getID(),
			label = settings.panel_label || 'Menu';
		#>
		<div class="refraction-offcanvas" data-panel-id="{{ id }}" data-position="{{ settings.position }}" data-mode="{{ settings.mode }}">
			<# if ( 'yes' === settings.show_button ) { #>
				<button type="button" class="refraction-offcanvas__trigger" aria-haspopup="dialog" aria-expanded="false" aria-controls="{{ id }}">
					<# if ( 'yes' === settings.show_button_icon ) { #>
						<span class="refraction-offcanvas__trigger-icon" aria-hidden="true"><?php echo Icons::svg( 'menu', [ 'size' => 24 ] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></span>
					<# } #>
					<# if ( settings.button_text ) { #><span class="refraction-offcanvas__trigger-text">{{ settings.button_text }}</span><# } #>
				</button>
			<# } #>
			<div class="refraction-offcanvas__layer">
				<div class="refraction-offcanvas__overlay"></div>
				<div class="refraction-offcanvas__panel" id="{{ id }}" role="dialog" aria-modal="true" aria-label="{{ label }}">
					<# if ( 'yes' === settings.show_close_button ) { #>
						<button type="button" class="refraction-offcanvas__close" aria-label="Close"><?php echo Icons::svg( 'close', [ 'size' => 24 ] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></button>
					<# } #>
					<div class="refraction-offcanvas__content"></div>
				</div>
			</div>
		</div>
		<?php
	}
}
