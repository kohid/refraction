<?php
namespace Refraction\Modules\Popups\Documents;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Background;
use Refraction\Group_Control_Border;
use Refraction\Group_Control_Box_Shadow;
use Refraction\Modules\Popups\Classes\Popup_Rules;
use Refraction\Modules\ThemeBuilder\Documents\Theme_Document;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * The Popup template: a Theme Builder template that is printed in the footer when its display conditions and
 * visitor rules pass, and opened by its triggers. Settings use the `rp_` prefix.
 */
class Popup extends Theme_Document {

	const TYPE = 'popup';

	public static function get_type() {
		return self::TYPE;
	}

	public function get_location(): string {
		return self::TYPE;
	}

	public static function get_title() {
		return esc_html__( 'Popup', 'refraction' );
	}

	public static function get_plural_title() {
		return esc_html__( 'Popups', 'refraction' );
	}

	public static function get_add_new_title() {
		return esc_html__( 'Add New Popup', 'refraction' );
	}

	/** Every style control writes under this wrapper, which the popup markup and the editor preview both carry. */
	public function get_css_wrapper_selector() {
		return '.refraction-popup-' . $this->get_main_id();
	}

	/** The public, sanitised config of this popup. */
	public function get_popup_config(): array {
		return Popup_Rules::normalize( (array) $this->get_settings(), (int) round( (float) get_option( 'gmt_offset', 0 ) * 3600 ) );
	}

	protected function register_controls() {
		parent::register_controls();

		$this->register_layout_controls();
		$this->register_overlay_controls();
		$this->register_box_controls();
		$this->register_close_controls();
		$this->register_animation_controls();
		$this->register_behavior_controls();
		$this->register_trigger_controls();
		$this->register_rule_controls();
	}

	private function section( string $id, string $label ): void {
		$this->start_controls_section( $id, [ 'label' => $label, 'tab' => Controls_Manager::TAB_SETTINGS ] );
	}

	private function register_layout_controls(): void {
		$box = '{{WRAPPER}} .refraction-popup__box';
		$layer = '{{WRAPPER}} .refraction-popup__layer';

		$this->section( 'refraction_popup_layout', esc_html__( 'Popup Layout', 'refraction' ) );

		$this->add_responsive_control( 'rp_width', [
			'label' => esc_html__( 'Width', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px', '%', 'vw' ],
			'range' => [ 'px' => [ 'min' => 200, 'max' => 1600 ], '%' => [ 'min' => 10, 'max' => 100 ], 'vw' => [ 'min' => 10, 'max' => 100 ] ],
			'default' => [ 'size' => 640, 'unit' => 'px' ],
			'selectors' => [ $box => 'width: {{SIZE}}{{UNIT}};' ],
		] );

		$this->add_control( 'rp_height_mode', [
			'label' => esc_html__( 'Height', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'auto',
			'options' => [ 'auto' => esc_html__( 'Fit content', 'refraction' ), 'custom' => esc_html__( 'Custom', 'refraction' ) ],
		] );

		$this->add_responsive_control( 'rp_height', [
			'label' => esc_html__( 'Custom height', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px', 'vh', '%' ],
			'range' => [ 'px' => [ 'min' => 100, 'max' => 1400 ], 'vh' => [ 'min' => 10, 'max' => 100 ], '%' => [ 'min' => 10, 'max' => 100 ] ],
			'default' => [ 'size' => 60, 'unit' => 'vh' ],
			'condition' => [ 'rp_height_mode' => 'custom' ],
			'selectors' => [ $box => 'height: {{SIZE}}{{UNIT}};' ],
		] );

		$this->add_responsive_control( 'rp_pos_h', [
			'label' => esc_html__( 'Horizontal position', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'center',
			'options' => [ 'left' => esc_html__( 'Left', 'refraction' ), 'center' => esc_html__( 'Center', 'refraction' ), 'right' => esc_html__( 'Right', 'refraction' ) ],
			'selectors_dictionary' => [ 'left' => 'flex-start', 'center' => 'center', 'right' => 'flex-end' ],
			'selectors' => [ $layer => 'justify-content: {{VALUE}};' ],
		] );

		$this->add_responsive_control( 'rp_pos_v', [
			'label' => esc_html__( 'Vertical position', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'center',
			'options' => [ 'top' => esc_html__( 'Top', 'refraction' ), 'center' => esc_html__( 'Middle', 'refraction' ), 'bottom' => esc_html__( 'Bottom', 'refraction' ) ],
			'selectors_dictionary' => [ 'top' => 'flex-start', 'center' => 'center', 'bottom' => 'flex-end' ],
			'selectors' => [ $layer => 'align-items: {{VALUE}};' ],
		] );

		$this->add_responsive_control( 'rp_gap', [
			'label' => esc_html__( 'Distance from the screen edge', 'refraction' ),
			'type' => Controls_Manager::DIMENSIONS,
			'size_units' => [ 'px', 'vw', 'vh' ],
			'default' => [ 'top' => 16, 'right' => 16, 'bottom' => 16, 'left' => 16, 'unit' => 'px', 'isLinked' => true ],
			'selectors' => [ $layer => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
		] );

		$this->add_responsive_control( 'rp_padding', [
			'label' => esc_html__( 'Padding', 'refraction' ),
			'type' => Controls_Manager::DIMENSIONS,
			'size_units' => [ 'px', 'em', '%' ],
			'default' => [ 'top' => 24, 'right' => 24, 'bottom' => 24, 'left' => 24, 'unit' => 'px', 'isLinked' => true ],
			'selectors' => [ $box => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
		] );

		$this->end_controls_section();
	}

	private function register_overlay_controls(): void {
		$overlay = '{{WRAPPER}} .refraction-popup__overlay';

		$this->section( 'refraction_popup_overlay', esc_html__( 'Overlay', 'refraction' ) );

		$this->add_control( 'rp_overlay_hidden', [
			'label' => esc_html__( 'Hide overlay', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'selectors' => [ $overlay => 'display: none;' ],
		] );

		$this->add_control( 'rp_overlay_color', [
			'label' => esc_html__( 'Color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'default' => 'rgba(15, 18, 30, 0.62)',
			'condition' => [ 'rp_overlay_hidden' => '' ],
			'selectors' => [ $overlay => 'background-color: {{VALUE}};' ],
		] );

		$this->add_control( 'rp_overlay_opacity', [
			'label' => esc_html__( 'Opacity', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 1, 'step' => 0.05 ] ],
			'default' => [ 'size' => 1 ],
			'condition' => [ 'rp_overlay_hidden' => '' ],
			'selectors' => [ $overlay => 'opacity: {{SIZE}};' ],
		] );

		$this->add_control( 'rp_overlay_blur', [
			'label' => esc_html__( 'Background blur (px)', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 30 ] ],
			'default' => [ 'size' => 0 ],
			'condition' => [ 'rp_overlay_hidden' => '' ],
			'selectors' => [ $overlay => 'backdrop-filter: blur({{SIZE}}px); -webkit-backdrop-filter: blur({{SIZE}}px);' ],
		] );

		$this->end_controls_section();
	}

	private function register_box_controls(): void {
		$box = '{{WRAPPER}} .refraction-popup__box';

		$this->section( 'refraction_popup_box', esc_html__( 'Popup Box', 'refraction' ) );

		$this->add_group_control( Group_Control_Background::get_type(), [
			'name' => 'rp_box_background',
			'types' => [ 'classic', 'gradient' ],
			'selector' => $box,
			'fields_options' => [ 'background' => [ 'default' => 'classic' ], 'color' => [ 'default' => '#ffffff' ] ],
		] );

		$this->add_group_control( Group_Control_Border::get_type(), [
			'name' => 'rp_box_border',
			'selector' => $box,
		] );

		$this->add_responsive_control( 'rp_box_radius', [
			'label' => esc_html__( 'Corner radius', 'refraction' ),
			'type' => Controls_Manager::DIMENSIONS,
			'size_units' => [ 'px', '%' ],
			'default' => [ 'top' => 12, 'right' => 12, 'bottom' => 12, 'left' => 12, 'unit' => 'px', 'isLinked' => true ],
			'selectors' => [ $box => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
		] );

		$this->add_group_control( Group_Control_Box_Shadow::get_type(), [
			'name' => 'rp_box_shadow',
			'selector' => $box,
			'fields_options' => [
				'box_shadow_type' => [ 'default' => 'yes' ],
				'box_shadow' => [ 'default' => [ 'horizontal' => 0, 'vertical' => 24, 'blur' => 60, 'spread' => 0, 'color' => 'rgba(15, 18, 30, 0.28)' ] ],
			],
		] );

		$this->end_controls_section();
	}

	private function register_close_controls(): void {
		$close = '{{WRAPPER}} .refraction-popup__close';

		$this->section( 'refraction_popup_close', esc_html__( 'Close Button', 'refraction' ) );

		$this->add_control( 'rp_show_close', [
			'label' => esc_html__( 'Show close button', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'description' => esc_html__( 'Without a button the popup can still close with the overlay, the Escape key or your own button.', 'refraction' ),
		] );

		$this->add_control( 'rp_close_icon', [
			'label' => esc_html__( 'Icon', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'close',
			'options' => [ 'close' => esc_html__( 'Cross', 'refraction' ), 'cancel' => esc_html__( 'Circled cross', 'refraction' ) ],
			'condition' => [ 'rp_show_close' => 'yes' ],
		] );

		$this->add_control( 'rp_close_side', [
			'label' => esc_html__( 'Corner', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'right',
			'options' => [ 'right' => esc_html__( 'Top right', 'refraction' ), 'left' => esc_html__( 'Top left', 'refraction' ) ],
			'selectors_dictionary' => [ 'right' => 'left: auto; right: var(--rp-close-x, 12px);', 'left' => 'right: auto; left: var(--rp-close-x, 12px);' ],
			'selectors' => [ $close => '{{VALUE}}' ],
			'condition' => [ 'rp_show_close' => 'yes' ],
		] );

		$this->add_control( 'rp_close_x', [
			'label' => esc_html__( 'Distance from the side (px, negative = outside)', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => -60, 'max' => 60 ] ],
			'default' => [ 'size' => 12 ],
			'selectors' => [ '{{WRAPPER}} .refraction-popup__box' => '--rp-close-x: {{SIZE}}px;' ],
			'condition' => [ 'rp_show_close' => 'yes' ],
		] );

		$this->add_control( 'rp_close_y', [
			'label' => esc_html__( 'Distance from the top (px, negative = outside)', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => -60, 'max' => 60 ] ],
			'default' => [ 'size' => 12 ],
			'selectors' => [ $close => 'top: {{SIZE}}px;' ],
			'condition' => [ 'rp_show_close' => 'yes' ],
		] );

		$this->add_control( 'rp_close_size', [
			'label' => esc_html__( 'Icon size (px)', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 12, 'max' => 48 ] ],
			'default' => [ 'size' => 22 ],
			'selectors' => [ $close . ' svg' => 'width: {{SIZE}}px; height: {{SIZE}}px;' ],
			'condition' => [ 'rp_show_close' => 'yes' ],
		] );

		$this->add_control( 'rp_close_color', [
			'label' => esc_html__( 'Icon color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'default' => '#1d2230',
			'selectors' => [ $close => 'color: {{VALUE}};' ],
			'condition' => [ 'rp_show_close' => 'yes' ],
		] );

		$this->add_control( 'rp_close_bg', [
			'label' => esc_html__( 'Background', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'default' => '',
			'selectors' => [ $close => 'background-color: {{VALUE}};' ],
			'condition' => [ 'rp_show_close' => 'yes' ],
		] );

		$this->add_control( 'rp_close_color_hover', [
			'label' => esc_html__( 'Icon color on hover', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ $close . ':hover, ' . $close . ':focus-visible' => 'color: {{VALUE}};' ],
			'condition' => [ 'rp_show_close' => 'yes' ],
		] );

		$this->add_control( 'rp_close_bg_hover', [
			'label' => esc_html__( 'Background on hover', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ $close . ':hover, ' . $close . ':focus-visible' => 'background-color: {{VALUE}};' ],
			'condition' => [ 'rp_show_close' => 'yes' ],
		] );

		$this->add_control( 'rp_close_radius', [
			'label' => esc_html__( 'Corner radius (px)', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 40 ] ],
			'default' => [ 'size' => 999 ],
			'selectors' => [ $close => 'border-radius: {{SIZE}}px;' ],
			'condition' => [ 'rp_show_close' => 'yes' ],
		] );

		$this->end_controls_section();
	}

	private function animation_options(): array {
		return [
			'none' => esc_html__( 'None', 'refraction' ),
			'fade' => esc_html__( 'Fade', 'refraction' ),
			'zoom' => esc_html__( 'Zoom', 'refraction' ),
			'slide-up' => esc_html__( 'Slide up', 'refraction' ),
			'slide-down' => esc_html__( 'Slide down', 'refraction' ),
			'slide-left' => esc_html__( 'Slide from the right', 'refraction' ),
			'slide-right' => esc_html__( 'Slide from the left', 'refraction' ),
		];
	}

	private function register_animation_controls(): void {
		$this->section( 'refraction_popup_animation', esc_html__( 'Animation', 'refraction' ) );

		$this->add_control( 'rp_anim_in', [
			'label' => esc_html__( 'Entrance', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'fade',
			'options' => $this->animation_options(),
		] );

		$this->add_control( 'rp_anim_in_duration', [
			'label' => esc_html__( 'Entrance duration (ms)', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'default' => 300,
			'min' => 0,
			'max' => 5000,
			'condition' => [ 'rp_anim_in!' => 'none' ],
		] );

		$this->add_control( 'rp_anim_out', [
			'label' => esc_html__( 'Exit', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'fade',
			'options' => $this->animation_options(),
		] );

		$this->add_control( 'rp_anim_out_duration', [
			'label' => esc_html__( 'Exit duration (ms)', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'default' => 200,
			'min' => 0,
			'max' => 5000,
			'condition' => [ 'rp_anim_out!' => 'none' ],
		] );

		$this->add_control( 'rp_anim_note', [
			'type' => Controls_Manager::RAW_HTML,
			'raw' => esc_html__( 'Animations are skipped for visitors who ask their system for reduced motion.', 'refraction' ),
			'content_classes' => 'refraction-descriptor',
		] );

		$this->end_controls_section();
	}

	private function register_behavior_controls(): void {
		$this->section( 'refraction_popup_behavior', esc_html__( 'Behavior', 'refraction' ) );

		$this->add_control( 'rp_prevent_scroll', [
			'label' => esc_html__( 'Prevent page scroll while open', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
		] );

		$this->add_control( 'rp_close_overlay', [
			'label' => esc_html__( 'Close when the overlay is clicked', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
		] );

		$this->add_control( 'rp_close_esc', [
			'label' => esc_html__( 'Close with the Escape key', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
		] );

		$this->add_control( 'rp_autoclose', [
			'label' => esc_html__( 'Close automatically after (seconds)', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'default' => 0,
			'min' => 0,
			'max' => 3600,
			'description' => esc_html__( '0 keeps the popup open until the visitor closes it.', 'refraction' ),
		] );

		$this->add_control( 'rp_a11y_note', [
			'type' => Controls_Manager::RAW_HTML,
			'raw' => esc_html__( 'The popup is a modal dialog: it is labelled by its first heading, keeps keyboard focus inside while open and returns focus to the element that opened it.', 'refraction' ),
			'content_classes' => 'refraction-descriptor',
		] );

		$this->end_controls_section();
	}

	private function register_trigger_controls(): void {
		$this->section( 'refraction_popup_triggers', esc_html__( 'Triggers', 'refraction' ) );

		$this->add_control( 'rp_triggers_note', [
			'type' => Controls_Manager::RAW_HTML,
			'raw' => esc_html__( 'Turn on one or more triggers. The first one that fires opens the popup. Links with the Popup dynamic tag, the JavaScript API and the refraction:popup:open event work without a trigger.', 'refraction' ),
			'content_classes' => 'refraction-descriptor',
		] );

		$this->add_control( 'rp_trigger_load', [ 'label' => esc_html__( 'On page load', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'separator' => 'before' ] );
		$this->add_control( 'rp_load_delay', [ 'label' => esc_html__( 'Delay (seconds)', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'default' => 0, 'min' => 0, 'max' => 3600, 'condition' => [ 'rp_trigger_load' => 'yes' ] ] );

		$this->add_control( 'rp_trigger_scroll', [ 'label' => esc_html__( 'On scroll', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'separator' => 'before' ] );
		$this->add_control( 'rp_scroll_mode', [
			'label' => esc_html__( 'Scrolled to', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'percent',
			'options' => [ 'percent' => esc_html__( 'A percentage of the page', 'refraction' ), 'element' => esc_html__( 'An element', 'refraction' ) ],
			'condition' => [ 'rp_trigger_scroll' => 'yes' ],
		] );
		$this->add_control( 'rp_scroll_percent', [ 'label' => esc_html__( 'Percentage', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'default' => 50, 'min' => 0, 'max' => 100, 'condition' => [ 'rp_trigger_scroll' => 'yes', 'rp_scroll_mode' => 'percent' ] ] );
		$this->add_control( 'rp_scroll_selector', [ 'label' => esc_html__( 'Element CSS selector', 'refraction' ), 'type' => Controls_Manager::TEXT, 'placeholder' => '#pricing', 'condition' => [ 'rp_trigger_scroll' => 'yes', 'rp_scroll_mode' => 'element' ] ] );

		$this->add_control( 'rp_trigger_scroll_up', [ 'label' => esc_html__( 'On scroll back up', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'separator' => 'before', 'description' => esc_html__( 'Fires when the visitor scrolls up after reading down the page.', 'refraction' ) ] );
		$this->add_control( 'rp_scroll_up_distance', [ 'label' => esc_html__( 'Scroll up by (px)', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'default' => 120, 'min' => 20, 'max' => 2000, 'condition' => [ 'rp_trigger_scroll_up' => 'yes' ] ] );

		$this->add_control( 'rp_trigger_click', [ 'label' => esc_html__( 'On click', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'separator' => 'before' ] );
		$this->add_control( 'rp_click_selector', [ 'label' => esc_html__( 'Element CSS selector', 'refraction' ), 'type' => Controls_Manager::TEXT, 'placeholder' => '.open-offer', 'condition' => [ 'rp_trigger_click' => 'yes' ] ] );

		$this->add_control( 'rp_trigger_exit', [ 'label' => esc_html__( 'Exit intent', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'separator' => 'before', 'description' => esc_html__( 'Desktop: the mouse leaves through the top of the window. Touch screens: the back button or a fast scroll up.', 'refraction' ) ] );

		$this->add_control( 'rp_trigger_idle', [ 'label' => esc_html__( 'After inactivity', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'separator' => 'before' ] );
		$this->add_control( 'rp_idle_seconds', [ 'label' => esc_html__( 'Idle for (seconds)', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'default' => 30, 'min' => 1, 'max' => 3600, 'condition' => [ 'rp_trigger_idle' => 'yes' ] ] );

		$this->add_control( 'rp_trigger_views', [ 'label' => esc_html__( 'After page views', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'separator' => 'before', 'description' => esc_html__( 'Counts pages of this browser session on which a popup is loaded.', 'refraction' ) ] );
		$this->add_control( 'rp_views_count', [ 'label' => esc_html__( 'Page views', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'default' => 2, 'min' => 1, 'max' => 1000, 'condition' => [ 'rp_trigger_views' => 'yes' ] ] );

		$this->end_controls_section();
	}

	private function register_rule_controls(): void {
		global $wp_roles;

		$this->section( 'refraction_popup_rules', esc_html__( 'Advanced Rules', 'refraction' ) );

		$this->add_control( 'rp_frequency', [
			'label' => esc_html__( 'Show', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'always',
			'options' => [
				'always' => esc_html__( 'Every time it triggers', 'refraction' ),
				'once' => esc_html__( 'Only once', 'refraction' ),
				'every_n' => esc_html__( 'Every N page visits', 'refraction' ),
				'session' => esc_html__( 'Once per session', 'refraction' ),
				'day' => esc_html__( 'Once per day', 'refraction' ),
			],
		] );
		$this->add_control( 'rp_frequency_n', [ 'label' => esc_html__( 'N', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'default' => 3, 'min' => 2, 'max' => 1000, 'condition' => [ 'rp_frequency' => 'every_n' ] ] );
		$this->add_control( 'rp_frequency_days', [ 'label' => esc_html__( 'Show again after (days, 0 = never)', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'default' => 30, 'min' => 0, 'max' => 3650, 'condition' => [ 'rp_frequency' => 'once' ] ] );

		$this->add_control( 'rp_dismiss_on_form', [
			'label' => esc_html__( 'Do not show again after a form is sent', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'description' => esc_html__( 'Also works for any element inside the popup with the attribute data-refraction-popup-dismiss.', 'refraction' ),
		] );
		$this->add_control( 'rp_dismiss_days', [ 'label' => esc_html__( 'Keep it hidden for (days)', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'default' => 365, 'min' => 1, 'max' => 3650 ] );

		$this->add_control( 'rp_audience', [
			'label' => esc_html__( 'Visitors', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'any',
			'separator' => 'before',
			'options' => [ 'any' => esc_html__( 'Everyone', 'refraction' ), 'logged_in' => esc_html__( 'Logged in', 'refraction' ), 'logged_out' => esc_html__( 'Logged out', 'refraction' ) ],
		] );

		$roles = [];

		foreach ( ( isset( $wp_roles ) ? $wp_roles->get_names() : [] ) as $slug => $name ) {
			$roles[ $slug ] = translate_user_role( $name );
		}

		$this->add_control( 'rp_roles', [
			'label' => esc_html__( 'Only these roles (empty = any)', 'refraction' ),
			'type' => Controls_Manager::SELECT2,
			'multiple' => true,
			'options' => $roles,
			'label_block' => true,
			'condition' => [ 'rp_audience' => 'logged_in' ],
		] );

		$this->add_control( 'rp_devices', [
			'label' => esc_html__( 'Devices', 'refraction' ),
			'type' => Controls_Manager::SELECT2,
			'multiple' => true,
			'label_block' => true,
			'default' => [ 'desktop', 'tablet', 'mobile' ],
			'options' => [ 'desktop' => esc_html__( 'Desktop', 'refraction' ), 'tablet' => esc_html__( 'Tablet', 'refraction' ), 'mobile' => esc_html__( 'Mobile', 'refraction' ) ],
			'description' => esc_html__( 'Decided by the screen width and your breakpoints.', 'refraction' ),
		] );

		$this->add_control( 'rp_referrer', [
			'label' => esc_html__( 'Visitor came from', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'any',
			'options' => [
				'any' => esc_html__( 'Anywhere', 'refraction' ),
				'search' => esc_html__( 'A search engine', 'refraction' ),
				'internal' => esc_html__( 'Another page of this site', 'refraction' ),
				'external' => esc_html__( 'Another website', 'refraction' ),
				'url' => esc_html__( 'An address containing…', 'refraction' ),
			],
		] );
		$this->add_control( 'rp_referrer_url', [ 'label' => esc_html__( 'Address contains', 'refraction' ), 'type' => Controls_Manager::TEXT, 'placeholder' => 'newsletter', 'condition' => [ 'rp_referrer' => 'url' ] ] );

		$this->add_control( 'rp_param_name', [ 'label' => esc_html__( 'URL parameter', 'refraction' ), 'type' => Controls_Manager::TEXT, 'placeholder' => 'utm_campaign', 'description' => esc_html__( 'Show only when the address has this parameter.', 'refraction' ) ] );
		$this->add_control( 'rp_param_value', [ 'label' => esc_html__( 'Parameter value', 'refraction' ), 'type' => Controls_Manager::TEXT, 'placeholder' => esc_html__( 'any value', 'refraction' ), 'condition' => [ 'rp_param_name!' => '' ] ] );

		$this->add_control( 'rp_schedule', [ 'label' => esc_html__( 'Schedule', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'separator' => 'before' ] );
		$this->add_control( 'rp_schedule_start', [ 'label' => esc_html__( 'Start', 'refraction' ), 'type' => Controls_Manager::DATE_TIME, 'condition' => [ 'rp_schedule' => 'yes' ], 'description' => esc_html__( 'Dates and times use the site time zone.', 'refraction' ) ] );
		$this->add_control( 'rp_schedule_end', [ 'label' => esc_html__( 'End', 'refraction' ), 'type' => Controls_Manager::DATE_TIME, 'condition' => [ 'rp_schedule' => 'yes' ] ] );
		$this->add_control( 'rp_time_from', [ 'label' => esc_html__( 'Daily from (HH:MM)', 'refraction' ), 'type' => Controls_Manager::TEXT, 'placeholder' => '09:00', 'condition' => [ 'rp_schedule' => 'yes' ] ] );
		$this->add_control( 'rp_time_to', [ 'label' => esc_html__( 'Daily until (HH:MM)', 'refraction' ), 'type' => Controls_Manager::TEXT, 'placeholder' => '17:00', 'condition' => [ 'rp_schedule' => 'yes' ] ] );

		$this->add_control( 'rp_priority', [
			'label' => esc_html__( 'Priority', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'default' => 0,
			'min' => -1000,
			'max' => 1000,
			'separator' => 'before',
			'description' => esc_html__( 'When several popups trigger together the highest number goes first and the others wait until it closes.', 'refraction' ),
		] );

		$this->end_controls_section();
	}
}
