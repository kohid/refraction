<?php
namespace Refraction\Modules\TimedSlides\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Box_Shadow;
use Refraction\Group_Control_Typography;
use Refraction\Modules\NestedElements\Base\Widget_Nested_Base;
use Refraction\Modules\NestedElements\Controls\Control_Nested_Repeater;
use Refraction\Modules\ProWidgets\Module as ProWidgets;
use Refraction\Modules\ProWidgets\Widgets\Slides;
use Refraction\Repeater;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Timed Slides: the "Timed cards" slider (the current slide fills the widget, the next ones wait as cards that grow
 * into the slide) where every slide's content is a container: drop any widgets in it. Each slide has its own
 * background picture or YouTube video. The content and the cards are placed separately (Content Position, Cards).
 *
 * Markup: .rf-tco (shared styles and engine of modules/card-motion) > stage (backgrounds), timer, a content layer
 * holding the slide containers (.rf-tco__text) and a cards layer (.rf-ts__rail: cards, arrows, line, counter).
 * Script: assets/js/frontend/handlers/timed-slides.js.
 */
class Timed_Slides extends Widget_Nested_Base {

	public function get_name() {
		return 'refraction-timed-slides';
	}

	public function get_title() {
		return esc_html__( 'Timed Slides', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-slides';
	}

	public function get_categories() {
		return [ ProWidgets::CATEGORY ];
	}

	public function get_keywords() {
		return [ 'slides', 'slider', 'timed', 'cards', 'hero', 'video', 'youtube', 'nested', 'container', 'carousel' ];
	}

	public function get_style_depends(): array {
		return [ 'refraction-card-motion', 'widget-slides', 'widget-timed-slides' ];
	}

	protected function is_dynamic_content(): bool {
		return true;
	}

	protected function get_html_wrapper_class() {
		return 'refraction-widget-timed-slides';
	}

	/** A slide's container, filled with an example eyebrow, title, text and button to edit or replace. */
	private function slide_container( int $index ): array {
		$white = '#FFFFFF';
		$widget = static function ( string $type, array $settings ): array {
			return [ 'elType' => 'widget', 'widgetType' => $type, 'settings' => $settings, 'elements' => [] ];
		};

		return [
			'elType' => 'container',
			'settings' => [
				/* translators: %d: Slide index. */
				'_title' => sprintf( __( 'Slide #%d', 'refraction' ), $index ),
				'content_width' => 'full',
				'flex_gap' => [ 'unit' => 'px', 'size' => 18, 'column' => '18', 'row' => '18', 'isLinked' => true ],
				'padding' => [ 'unit' => 'px', 'top' => '0', 'right' => '0', 'bottom' => '0', 'left' => '0', 'isLinked' => true ],
			],
			'elements' => [
				$widget( 'heading', [
					'title' => esc_html__( 'Your city', 'refraction' ),
					'header_size' => 'p',
					'title_color' => $white,
					'typography_typography' => 'custom',
					'typography_font_size' => [ 'unit' => 'px', 'size' => 14 ],
					'typography_text_transform' => 'uppercase',
					'typography_letter_spacing' => [ 'unit' => 'px', 'size' => 1 ],
				] ),
				$widget( 'heading', [
					/* translators: %d: Slide index. */
					'title' => sprintf( esc_html__( 'Slide %d title', 'refraction' ), $index ),
					'header_size' => 'h2',
					'title_color' => $white,
					'typography_typography' => 'custom',
					'typography_font_size' => [ 'unit' => 'px', 'size' => 56 ],
					'typography_font_size_mobile' => [ 'unit' => 'px', 'size' => 36 ],
					'typography_font_weight' => '700',
					'typography_text_transform' => 'uppercase',
					'typography_line_height' => [ 'unit' => 'em', 'size' => 1 ],
				] ),
				$widget( 'text-editor', [
					'editor' => '<p>' . esc_html__( 'Drop any widget into this slide. Its background, video and card are set in the slide list.', 'refraction' ) . '</p>',
					'text_color' => '#FFFFFFD9',
				] ),
				$widget( 'button', [
					'text' => esc_html__( 'Learn more', 'refraction' ),
				] ),
			],
		];
	}

	protected function get_default_children_elements() {
		return [ $this->slide_container( 1 ), $this->slide_container( 2 ), $this->slide_container( 3 ) ];
	}

	protected function get_default_repeater_title_setting_key() {
		return 'slide_title';
	}

	protected function get_default_children_title() {
		/* translators: %d: Slide index. */
		return esc_html__( 'Slide #%d', 'refraction' );
	}

	protected function get_default_children_placeholder_selector() {
		return '.rf-tco__texts';
	}

	private static function choose( array $labels_icons ): array {
		$options = [];

		foreach ( $labels_icons as $value => [ $label, $icon ] ) {
			$options[ $value ] = [ 'title' => $label, 'icon' => $icon ];
		}

		return $options;
	}

	private static function horizontal(): array {
		return self::choose( [
			'flex-start' => [ esc_html__( 'Left', 'refraction' ), 'rficon-h-align-left' ],
			'center' => [ esc_html__( 'Center', 'refraction' ), 'rficon-h-align-center' ],
			'flex-end' => [ esc_html__( 'Right', 'refraction' ), 'rficon-h-align-right' ],
		] );
	}

	private static function vertical(): array {
		return self::choose( [
			'flex-start' => [ esc_html__( 'Top', 'refraction' ), 'rficon-v-align-top' ],
			'center' => [ esc_html__( 'Middle', 'refraction' ), 'rficon-v-align-middle' ],
			'flex-end' => [ esc_html__( 'Bottom', 'refraction' ), 'rficon-v-align-bottom' ],
		] );
	}

	private static function padding( string $top, string $right, string $bottom, string $left, string $unit ): array {
		return [ 'unit' => $unit, 'top' => $top, 'right' => $right, 'bottom' => $bottom, 'left' => $left, 'isLinked' => false ];
	}

	protected function register_controls() {
		$this->register_slides_controls();
		$this->register_slider_controls();
		$this->register_content_position_controls();
		$this->register_cards_controls();
		$this->register_style_controls();
	}

	private function register_slides_controls() {
		$this->start_controls_section( 'section_slides', [
			'label' => esc_html__( 'Slides', 'refraction' ),
		] );

		$repeater = new Repeater();

		$repeater->add_control( 'slide_title', [
			'label' => esc_html__( 'Card title', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => esc_html__( 'Slide', 'refraction' ),
			'label_block' => true,
			'description' => esc_html__( 'Shown on the slide\'s card, in the navigator and to screen readers. The slide\'s own content is the container under this widget: drop any widgets in it.', 'refraction' ),
		] );

		$repeater->add_control( 'card_label', [
			'label' => esc_html__( 'Small text above the card title', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'label_block' => true,
		] );

		$repeater->add_control( 'background_image', [
			'label' => esc_html__( 'Background image', 'refraction' ),
			'type' => Controls_Manager::MEDIA,
			'separator' => 'before',
		] );

		$repeater->add_control( 'image_alt', [
			'label' => esc_html__( 'Image description', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'label_block' => true,
			'description' => esc_html__( 'For screen readers. Leave empty when the image is decoration.', 'refraction' ),
			'condition' => [ 'background_image[url]!' => '' ],
		] );

		$repeater->add_control( 'background_color', [
			'label' => esc_html__( 'Background color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
		] );

		$repeater->add_control( 'background_video', [
			'label' => esc_html__( 'YouTube video', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'label_block' => true,
			'placeholder' => 'https://www.youtube.com/watch?v=...',
			'description' => esc_html__( 'Plays muted behind the slide while it is shown. Without an image, the video\'s thumbnail is the background and the card picture.', 'refraction' ),
			'separator' => 'before',
		] );

		$repeater->add_control( 'video_next', [
			'label' => esc_html__( 'Next slide when the video ends', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'condition' => [ 'background_video!' => '' ],
		] );

		$repeater->add_control( 'video_sound', [
			'label' => esc_html__( 'Sound button', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'condition' => [ 'background_video!' => '' ],
		] );

		$this->add_control( 'slides', [
			'label' => esc_html__( 'Slides', 'refraction' ),
			'type' => Control_Nested_Repeater::CONTROL_TYPE,
			'fields' => $repeater->get_controls(),
			'default' => [
				[ 'slide_title' => esc_html__( 'Slide #1', 'refraction' ), 'card_label' => esc_html__( 'Slide 1', 'refraction' ), 'background_color' => '#3A4A5C' ],
				[ 'slide_title' => esc_html__( 'Slide #2', 'refraction' ), 'card_label' => esc_html__( 'Slide 2', 'refraction' ), 'background_color' => '#5C3A4A' ],
				[ 'slide_title' => esc_html__( 'Slide #3', 'refraction' ), 'card_label' => esc_html__( 'Slide 3', 'refraction' ), 'background_color' => '#3A5C4A' ],
			],
			'title_field' => '{{{ slide_title }}}',
			'button_text' => esc_html__( 'Add Slide', 'refraction' ),
		] );

		$this->add_control( 'slider_label', [
			'label' => esc_html__( 'Accessible name', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => esc_html__( 'Slides', 'refraction' ),
			'label_block' => true,
			'separator' => 'before',
		] );

		$this->end_controls_section();
	}

	private function register_slider_controls() {
		$this->start_controls_section( 'section_slider', [
			'label' => esc_html__( 'Slider', 'refraction' ),
		] );

		$this->add_responsive_control( 'height', [
			'label' => esc_html__( 'Height', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px', 'vh' ],
			'range' => [ 'px' => [ 'min' => 240, 'max' => 1400 ], 'vh' => [ 'min' => 30, 'max' => 100 ] ],
			'default' => [ 'unit' => 'vh', 'size' => 100 ],
			'mobile_default' => [ 'unit' => 'px', 'size' => 640 ],
			'selectors' => [ '{{WRAPPER}} .rf-tco' => 'height: {{SIZE}}{{UNIT}}; min-height: 0;' ],
		] );

		$this->add_control( 'autoplay', [
			'label' => esc_html__( 'Autoplay', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'description' => esc_html__( 'Not for visitors who prefer reduced motion, and not while editing. A slide with a video waits for its video when "Next slide when the video ends" is on.', 'refraction' ),
			'frontend_available' => true,
			'render_type' => 'template',
		] );

		$this->add_control( 'autoplay_speed', [
			'label' => esc_html__( 'Time per slide (ms)', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'default' => 5000,
			'min' => 1500,
			'max' => 30000,
			'step' => 500,
			'condition' => [ 'autoplay' => 'yes' ],
			'frontend_available' => true,
		] );

		$this->add_control( 'pause_on_hover', [
			'label' => esc_html__( 'Pause on hover', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'condition' => [ 'autoplay' => 'yes' ],
			'render_type' => 'template',
		] );

		$this->add_control( 'show_timer', [
			'label' => esc_html__( 'Timer line at the top', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'condition' => [ 'autoplay' => 'yes' ],
			'render_type' => 'template',
		] );

		$this->add_control( 'transition', [
			'label' => esc_html__( 'Transition', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'grow',
			'options' => [
				'grow' => esc_html__( 'Card grows into the slide', 'refraction' ),
				'fade' => esc_html__( 'Fade', 'refraction' ),
				'slide' => esc_html__( 'Slide in from the side', 'refraction' ),
				'slide-up' => esc_html__( 'Slide up', 'refraction' ),
				'zoom-in' => esc_html__( 'Zoom in', 'refraction' ),
				'zoom-out' => esc_html__( 'Zoom out', 'refraction' ),
				'blur' => esc_html__( 'Blur', 'refraction' ),
				'circle' => esc_html__( 'Circle opens from the card', 'refraction' ),
				'wipe' => esc_html__( 'Wipe from the side', 'refraction' ),
				'wipe-up' => esc_html__( 'Wipe up', 'refraction' ),
				'curtain' => esc_html__( 'Curtain (opens from the middle)', 'refraction' ),
				'diagonal' => esc_html__( 'Diagonal wipe', 'refraction' ),
				'flip' => esc_html__( 'Flip', 'refraction' ),
			],
			'description' => esc_html__( 'How the next slide comes in. Going back (previous arrow, left arrow key) runs side and wipe transitions the other way.', 'refraction' ),
			'frontend_available' => true,
		] );

		$this->add_control( 'transition_speed', [
			'label' => esc_html__( 'Transition speed (ms)', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'default' => 900,
			'min' => 300,
			'max' => 3000,
			'step' => 100,
			'frontend_available' => true,
		] );

		$this->add_control( 'overlay', [
			'label' => esc_html__( 'Shade over the background', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'description' => esc_html__( 'Keeps light text readable on bright pictures. Its color is under Style > Slider.', 'refraction' ),
			'separator' => 'before',
			'render_type' => 'template',
		] );

		$this->end_controls_section();
	}

	private function register_content_position_controls() {
		$this->start_controls_section( 'section_content_position', [
			'label' => esc_html__( 'Content Position', 'refraction' ),
		] );

		$layer = '{{WRAPPER}} .rf-ts__layer--content';

		$this->add_responsive_control( 'content_horizontal', [
			'label' => esc_html__( 'Horizontal', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'options' => self::horizontal(),
			'default' => 'flex-start',
			'toggle' => false,
			'selectors' => [ $layer => 'justify-content: {{VALUE}};' ],
		] );

		$this->add_responsive_control( 'content_vertical', [
			'label' => esc_html__( 'Vertical', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'options' => self::vertical(),
			'default' => 'center',
			'mobile_default' => 'flex-start',
			'toggle' => false,
			'selectors' => [ $layer => 'align-items: {{VALUE}};' ],
		] );

		$this->add_responsive_control( 'content_align', [
			'label' => esc_html__( 'Text Alignment', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'options' => self::choose( [
				'left' => [ esc_html__( 'Left', 'refraction' ), 'rficon-text-align-left' ],
				'center' => [ esc_html__( 'Center', 'refraction' ), 'rficon-text-align-center' ],
				'right' => [ esc_html__( 'Right', 'refraction' ), 'rficon-text-align-right' ],
			] ),
			'default' => 'left',
			'toggle' => false,
			'selectors' => [ '{{WRAPPER}} .rf-ts__content' => 'text-align: {{VALUE}};' ],
			'description' => esc_html__( 'Applies to the widgets in the slides that do not set their own alignment.', 'refraction' ),
		] );

		$this->add_responsive_control( 'content_width', [
			'label' => esc_html__( 'Width', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ '%', 'px' ],
			'range' => [ '%' => [ 'min' => 10, 'max' => 100 ], 'px' => [ 'min' => 120, 'max' => 1400 ] ],
			'default' => [ 'unit' => '%', 'size' => 42 ],
			'tablet_default' => [ 'unit' => '%', 'size' => 55 ],
			'mobile_default' => [ 'unit' => '%', 'size' => 100 ],
			'selectors' => [ '{{WRAPPER}} .rf-ts__content' => 'width: {{SIZE}}{{UNIT}};' ],
		] );

		$this->add_responsive_control( 'content_padding', [
			'label' => esc_html__( 'Space from the edges', 'refraction' ),
			'type' => Controls_Manager::DIMENSIONS,
			'size_units' => [ 'px', '%', 'vw', 'vh' ],
			'default' => self::padding( '0', '0', '0', '6', '%' ),
			'mobile_default' => self::padding( '48', '20', '0', '20', 'px' ),
			'selectors' => [ $layer => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
		] );

		$this->add_control( 'content_animation', [
			'label' => esc_html__( 'Content comes in', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'rise',
			'options' => [
				'rise' => esc_html__( 'Rising, one widget after another', 'refraction' ),
				'fade' => esc_html__( 'Fading', 'refraction' ),
				'none' => esc_html__( 'At once', 'refraction' ),
			],
			'prefix_class' => 'rf-ts-in-',
			'separator' => 'before',
		] );

		$this->end_controls_section();
	}

	private function register_cards_controls() {
		$this->start_controls_section( 'section_cards', [
			'label' => esc_html__( 'Cards', 'refraction' ),
		] );

		$this->add_control( 'show_cards', [
			'label' => esc_html__( 'Cards of the next slides', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'render_type' => 'template',
		] );

		$layer = '{{WRAPPER}} .rf-ts__layer--cards';
		$on = [ 'show_cards' => 'yes' ];

		$this->add_responsive_control( 'cards_horizontal', [
			'label' => esc_html__( 'Horizontal', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'options' => self::horizontal(),
			'default' => 'flex-end',
			'toggle' => false,
			'selectors' => [ $layer => 'justify-content: {{VALUE}};' ],
			'description' => esc_html__( 'Where the cards, arrows and counter sit, separately from the content.', 'refraction' ),
		] );

		$this->add_responsive_control( 'cards_vertical', [
			'label' => esc_html__( 'Vertical', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'options' => self::vertical(),
			'default' => 'center',
			'mobile_default' => 'flex-end',
			'toggle' => false,
			'selectors' => [ $layer => 'align-items: {{VALUE}};' ],
		] );

		$this->add_responsive_control( 'cards_area_width', [
			'label' => esc_html__( 'Width', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ '%', 'px' ],
			'range' => [ '%' => [ 'min' => 20, 'max' => 100 ], 'px' => [ 'min' => 200, 'max' => 1600 ] ],
			'default' => [ 'unit' => '%', 'size' => 56 ],
			'tablet_default' => [ 'unit' => '%', 'size' => 45 ],
			'mobile_default' => [ 'unit' => '%', 'size' => 100 ],
			'selectors' => [ '{{WRAPPER}} .rf-ts__rail' => 'width: {{SIZE}}{{UNIT}};' ],
			'description' => esc_html__( 'The cards that do not fit run off the edge.', 'refraction' ),
		] );

		$this->add_responsive_control( 'cards_padding', [
			'label' => esc_html__( 'Space from the edges', 'refraction' ),
			'type' => Controls_Manager::DIMENSIONS,
			'size_units' => [ 'px', '%', 'vw', 'vh' ],
			'default' => self::padding( '0', '0', '0', '0', 'px' ),
			'mobile_default' => self::padding( '0', '0', '28', '20', 'px' ),
			'selectors' => [ $layer => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
		] );

		$this->add_responsive_control( 'card_width', [
			'label' => esc_html__( 'Card width', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 70, 'max' => 420 ] ],
			'default' => [ 'unit' => 'px', 'size' => 168 ],
			'mobile_default' => [ 'unit' => 'px', 'size' => 110 ],
			'selectors' => [ '{{WRAPPER}} .rf-tco' => '--rf-tco-card-w: {{SIZE}}px;' ],
			'condition' => $on,
			'separator' => 'before',
		] );

		$this->add_control( 'cards_ratio', [
			'label' => esc_html__( 'Card shape', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '3/4',
			'options' => [ '3/4' => '3/4', '4/5' => '4/5', '1/1' => '1/1', '2/3' => '2/3', '4/3' => '4/3', '16/9' => '16/9' ],
			// Height over width, for the cards and the row they sit in.
			'selectors_dictionary' => [ '3/4' => '1.3333', '4/5' => '1.25', '1/1' => '1', '2/3' => '1.5', '4/3' => '0.75', '16/9' => '0.5625' ],
			'selectors' => [ '{{WRAPPER}} .rf-tco' => '--rf-tco-card-k: {{VALUE}};' ],
			'condition' => $on,
		] );

		$this->add_responsive_control( 'cards_gap', [
			'label' => esc_html__( 'Space between cards', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 60 ] ],
			'default' => [ 'unit' => 'px', 'size' => 18 ],
			'mobile_default' => [ 'unit' => 'px', 'size' => 12 ],
			'selectors' => [ '{{WRAPPER}} .rf-tco' => '--rf-tco-gap: {{SIZE}}px;' ],
			'condition' => $on,
		] );

		$this->add_control( 'cards_radius', [
			'label' => esc_html__( 'Card corners', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 40 ] ],
			'default' => [ 'size' => 14 ],
			'selectors' => [ '{{WRAPPER}} .rf-tco' => '--rf-tco-radius: {{SIZE}}px;' ],
			'condition' => $on,
		] );

		$this->add_control( 'card_text', [
			'label' => esc_html__( 'Titles on the cards', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'condition' => $on,
			'render_type' => 'template',
		] );

		$this->add_control( 'show_arrows', [
			'label' => esc_html__( 'Arrows', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'separator' => 'before',
			'render_type' => 'template',
		] );

		$this->add_control( 'show_line', [
			'label' => esc_html__( 'Progress line', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'render_type' => 'template',
		] );

		$this->add_control( 'show_progress', [
			'label' => esc_html__( 'Progress number', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => '',
			'description' => esc_html__( 'How far through the slides: a percent or the slide out of all of them.', 'refraction' ),
			'render_type' => 'template',
		] );

		$this->add_control( 'progress_format', [
			'label' => esc_html__( 'Shown as', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'percent',
			'options' => [
				'percent' => esc_html__( 'Percent (40%)', 'refraction' ),
				'fraction' => esc_html__( 'Fraction (2/5)', 'refraction' ),
				'fraction-spaced' => esc_html__( 'Fraction, spaced (2 / 5)', 'refraction' ),
				'of' => esc_html__( 'Slide out of all (2 of 5)', 'refraction' ),
				'padded' => esc_html__( 'Padded fraction (02 / 05)', 'refraction' ),
			],
			'render_type' => 'template',
			'condition' => [ 'show_progress' => 'yes' ],
		] );

		$this->add_control( 'progress_position', [
			'label' => esc_html__( 'Place', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'after',
			'options' => [
				'before' => esc_html__( 'Before the line', 'refraction' ),
				'after' => esc_html__( 'After the line', 'refraction' ),
			],
			'render_type' => 'template',
			'condition' => [ 'show_progress' => 'yes' ],
		] );

		$this->add_control( 'show_count', [
			'label' => esc_html__( 'Slide number', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'render_type' => 'template',
		] );

		$this->end_controls_section();
	}

	private function register_style_controls() {
		$this->start_controls_section( 'section_style_slider', [
			'label' => esc_html__( 'Slider', 'refraction' ),
			'tab' => Controls_Manager::TAB_STYLE,
		] );

		$this->add_control( 'slider_background', [
			'label' => esc_html__( 'Background color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-tco' => 'background-color: {{VALUE}};' ],
		] );

		$this->add_control( 'slider_color', [
			'label' => esc_html__( 'Text color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'description' => esc_html__( 'Cards, arrows and counter, and the slide widgets that have no color of their own.', 'refraction' ),
			'selectors' => [ '{{WRAPPER}} .rf-tco' => 'color: {{VALUE}};' ],
		] );

		$this->add_control( 'overlay_color', [
			'label' => esc_html__( 'Shade color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'description' => esc_html__( 'Empty: a dark gradient from the content side.', 'refraction' ),
			'selectors' => [ '{{WRAPPER}} .rf-tco__slide .refraction-slide__overlay' => 'background: {{VALUE}};' ],
			'condition' => [ 'overlay' => 'yes' ],
		] );

		$this->add_control( 'accent_color', [
			'label' => esc_html__( 'Timer and progress color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-tco' => '--rf-tco-accent: {{VALUE}};' ],
		] );

		$this->add_control( 'timer_height', [
			'label' => esc_html__( 'Timer line thickness', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 1, 'max' => 10 ] ],
			'selectors' => [ '{{WRAPPER}} .rf-tco__timer' => 'height: {{SIZE}}px;' ],
			'condition' => [ 'autoplay' => 'yes', 'show_timer' => 'yes' ],
		] );

		$this->end_controls_section();

		$this->start_controls_section( 'section_style_cards', [
			'label' => esc_html__( 'Cards', 'refraction' ),
			'tab' => Controls_Manager::TAB_STYLE,
			'condition' => [ 'show_cards' => 'yes' ],
		] );

		$this->add_group_control( Group_Control_Typography::get_type(), [
			'name' => 'card_title_typography',
			'label' => esc_html__( 'Title', 'refraction' ),
			'selector' => '{{WRAPPER}} .rf-tco__card-text',
		] );

		$this->add_group_control( Group_Control_Typography::get_type(), [
			'name' => 'card_label_typography',
			'label' => esc_html__( 'Small text', 'refraction' ),
			'selector' => '{{WRAPPER}} .rf-tco__card-text small',
		] );

		$this->add_control( 'card_text_color', [
			'label' => esc_html__( 'Text color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-tco__card' => 'color: {{VALUE}};' ],
		] );

		$this->add_control( 'card_shade', [
			'label' => esc_html__( 'Shade under the title', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'prefix_class' => 'rf-ts-shade-',
		] );

		$this->add_group_control( Group_Control_Box_Shadow::get_type(), [
			'name' => 'card_shadow',
			'selector' => '{{WRAPPER}} .rf-tco__card',
		] );

		$this->add_control( 'card_hover_lift', [
			'label' => esc_html__( 'Lift on hover', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'prefix_class' => 'rf-ts-lift-',
		] );

		$this->end_controls_section();

		$this->start_controls_section( 'section_style_nav', [
			'label' => esc_html__( 'Arrows, line and number', 'refraction' ),
			'tab' => Controls_Manager::TAB_STYLE,
		] );

		$this->add_responsive_control( 'nav_space', [
			'label' => esc_html__( 'Space above', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 100 ] ],
			'selectors' => [ '{{WRAPPER}} .rf-ts__rail' => 'gap: {{SIZE}}px;' ],
		] );

		$this->add_responsive_control( 'nav_end_space', [
			'label' => esc_html__( 'Space after the number', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px', '%' ],
			'range' => [ 'px' => [ 'min' => 0, 'max' => 200 ], '%' => [ 'min' => 0, 'max' => 30 ] ],
			'default' => [ 'unit' => '%', 'size' => 10 ],
			'mobile_default' => [ 'unit' => 'px', 'size' => 20 ],
			'selectors' => [ '{{WRAPPER}} .rf-ts__rail .rf-tco__nav' => 'padding-right: {{SIZE}}{{UNIT}};' ],
		] );

		$this->add_responsive_control( 'arrow_size', [
			'label' => esc_html__( 'Arrow size', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 24, 'max' => 90 ] ],
			'selectors' => [ '{{WRAPPER}} .rf-tco__arrow, {{WRAPPER}} .rf-ts__rail .refraction-slide__sound' => 'width: {{SIZE}}px; height: {{SIZE}}px;' ],
			'condition' => [ 'show_arrows' => 'yes' ],
		] );

		$this->add_control( 'arrow_color', [
			'label' => esc_html__( 'Arrow color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-tco__arrow' => 'color: {{VALUE}};' ],
			'condition' => [ 'show_arrows' => 'yes' ],
		] );

		$this->add_control( 'arrow_border', [
			'label' => esc_html__( 'Arrow border color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-tco__arrow' => 'border-color: {{VALUE}};' ],
			'condition' => [ 'show_arrows' => 'yes' ],
		] );

		$this->add_control( 'arrow_background', [
			'label' => esc_html__( 'Arrow background', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-tco__arrow' => 'background-color: {{VALUE}};' ],
			'condition' => [ 'show_arrows' => 'yes' ],
		] );

		$this->add_control( 'line_fill_color', [
			'label' => esc_html__( 'Line color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'description' => esc_html__( 'The part that fills as the slides go by. Empty: the timer and progress color.', 'refraction' ),
			'selectors' => [ '{{WRAPPER}} .rf-tco__line i' => 'background-color: {{VALUE}};' ],
			'condition' => [ 'show_line' => 'yes' ],
			'separator' => 'before',
		] );

		$this->add_control( 'line_color', [
			'label' => esc_html__( 'Line track color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-tco__line' => 'background-color: {{VALUE}};' ],
			'condition' => [ 'show_line' => 'yes' ],
		] );

		$this->add_responsive_control( 'line_thickness', [
			'label' => esc_html__( 'Line thickness', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 1, 'max' => 12 ] ],
			'selectors' => [ '{{WRAPPER}} .rf-tco__line' => 'height: {{SIZE}}px;' ],
			'condition' => [ 'show_line' => 'yes' ],
		] );

		$this->add_control( 'line_radius', [
			'label' => esc_html__( 'Line corners', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 12 ] ],
			'selectors' => [ '{{WRAPPER}} .rf-tco__line, {{WRAPPER}} .rf-tco__line i' => 'border-radius: {{SIZE}}px;' ],
			'condition' => [ 'show_line' => 'yes' ],
		] );

		$this->add_group_control( Group_Control_Typography::get_type(), [
			'name' => 'progress_typography',
			'label' => esc_html__( 'Progress number', 'refraction' ),
			'selector' => '{{WRAPPER}} .rf-tco__progress',
			'condition' => [ 'show_progress' => 'yes' ],
			'separator' => 'before',
		] );

		$this->add_control( 'progress_color', [
			'label' => esc_html__( 'Progress number color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-tco__progress' => 'color: {{VALUE}};' ],
			'condition' => [ 'show_progress' => 'yes' ],
		] );

		$this->add_group_control( Group_Control_Typography::get_type(), [
			'name' => 'count_typography',
			'label' => esc_html__( 'Number', 'refraction' ),
			'selector' => '{{WRAPPER}} .rf-tco__count',
			'condition' => [ 'show_count' => 'yes' ],
		] );

		$this->add_control( 'count_color', [
			'label' => esc_html__( 'Number color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-tco__count' => 'color: {{VALUE}};' ],
			'condition' => [ 'show_count' => 'yes' ],
		] );

		$this->end_controls_section();
	}

	/* ------------------------------------------------------------------ render */

	/** Inline style of a slide's background and card: its picture (or video thumbnail) and color. */
	private static function picture_css( array $slide ): string {
		return Slides::background_css( $slide ) . ( ! empty( $slide['background_color'] ) ? 'background-color:' . esc_attr( $slide['background_color'] ) . ';' : '' );
	}

	private static function sound_button( array $slide, int $index ): string {
		if ( '' === Slides::youtube_id( (string) ( $slide['background_video'] ?? '' ) ) || 'yes' !== ( $slide['video_sound'] ?? 'yes' ) ) {
			return '';
		}

		return sprintf(
			'<button type="button" class="refraction-slide__sound" data-rf-sound="%1$d" aria-pressed="false" aria-label="%2$s" hidden><svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path class="refraction-slide__sound-on" d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/><path class="refraction-slide__sound-off" d="m23 9-6 6m0-6 6 6"/></svg></button>',
			$index,
			esc_attr__( 'Sound', 'refraction' )
		);
	}

	private static function arrow( string $direction ): string {
		$d = 'next' === $direction ? 'M9 5l7 7-7 7' : 'M15 5l-7 7 7 7';

		return '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="' . $d . '"/></svg>';
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		$slides = array_values( (array) ( $settings['slides'] ?? [] ) );
		$total = count( $slides );
		$on = static function ( string $key ) use ( $settings ): bool {
			return 'yes' === ( $settings[ $key ] ?? '' );
		};
		$autoplay = $on( 'autoplay' );
		$label = '' !== trim( (string) ( $settings['slider_label'] ?? '' ) ) ? $settings['slider_label'] : __( 'Slides', 'refraction' );

		$this->add_render_attribute( 'root', [
			'class' => array_filter( [ 'rf-tco', 'rf-ts', $autoplay && ! $on( 'pause_on_hover' ) ? 'rf-ts--no-pause' : '' ] ),
			'role' => 'region',
			'aria-roledescription' => 'carousel',
			'aria-label' => $label,
			'tabindex' => '0',
		] );
		?>
		<div <?php $this->print_render_attribute_string( 'root' ); ?>>
			<div class="rf-tco__stage">
				<?php foreach ( $slides as $index => $slide ) :
					$id = Slides::youtube_id( (string) ( $slide['background_video'] ?? '' ) );
					$alt = ! empty( $slide['background_image']['url'] ) ? trim( (string) ( $slide['image_alt'] ?? '' ) ) : '';
					?>
					<div class="rf-tco__slide refraction-repeater-item-<?php echo esc_attr( $slide['_id'] ?? $index ); ?>">
						<div class="rf-tco__bg" style="<?php echo esc_attr( self::picture_css( $slide ) ); ?>"<?php echo '' !== $alt ? ' role="img" aria-label="' . esc_attr( $alt ) . '"' : ''; ?>></div>
						<?php if ( '' !== $id ) : ?>
							<div class="refraction-slide__video" data-rf-yt="<?php echo esc_attr( $id ); ?>" data-rf-yt-next="<?php echo 'yes' === ( $slide['video_next'] ?? 'yes' ) ? '1' : '0'; ?>"></div>
						<?php endif; ?>
						<?php if ( $on( 'overlay' ) ) : ?>
							<div class="refraction-slide__overlay"></div>
						<?php endif; ?>
					</div>
				<?php endforeach; ?>
			</div>
			<?php if ( $autoplay && $on( 'show_timer' ) && $total > 1 ) : ?>
				<div class="rf-tco__timer" aria-hidden="true"><i></i></div>
			<?php endif; ?>
			<div class="rf-ts__layer rf-ts__layer--content">
				<div class="rf-tco__texts rf-ts__content" aria-live="<?php echo $autoplay ? 'off' : 'polite'; ?>">
					<?php foreach ( $this->get_children() as $index => $child ) {
						$this->print_slide_content( $index, $total, $slides );
					} ?>
				</div>
			</div>
			<?php $this->render_rail( $settings, $slides ); ?>
		</div>
		<?php
	}

	private function render_rail( array $settings, array $slides ) {
		$total = count( $slides );
		$on = static function ( string $key ) use ( $settings ): bool {
			return 'yes' === ( $settings[ $key ] ?? '' );
		};
		$sounds = '';

		foreach ( $slides as $index => $slide ) {
			$sounds .= self::sound_button( $slide, $index );
		}

		$cards = $on( 'show_cards' ) && $total > 1;
		$many = $total > 1;

		if ( ! $cards && '' === $sounds && ! ( $many && ( $on( 'show_arrows' ) || $on( 'show_line' ) || $on( 'show_count' ) || $on( 'show_progress' ) ) ) ) {
			return;
		}
		?>
		<div class="rf-ts__layer rf-ts__layer--cards">
			<div class="rf-tco__rail rf-ts__rail">
				<?php if ( $cards ) : ?>
					<div class="rf-tco__cards">
						<?php foreach ( $slides as $index => $slide ) :
							$title = (string) ( $slide['slide_title'] ?? '' );
							?>
							<?php /* translators: 1: slide number, 2: slide title */ ?>
							<button type="button" class="rf-tco__card" style="<?php echo esc_attr( self::picture_css( $slide ) ); ?>" aria-label="<?php echo esc_attr( sprintf( __( 'Show slide %1$d: %2$s', 'refraction' ), $index + 1, wp_strip_all_tags( $title ) ) ); ?>">
								<?php if ( $on( 'card_text' ) ) : ?>
									<span class="rf-tco__card-text">
										<?php if ( '' !== trim( (string) ( $slide['card_label'] ?? '' ) ) ) : ?>
											<small><?php echo esc_html( $slide['card_label'] ); ?></small>
										<?php endif; ?>
										<?php echo esc_html( $title ); ?>
									</span>
								<?php endif; ?>
							</button>
						<?php endforeach; ?>
					</div>
				<?php endif; ?>
				<div class="rf-tco__nav">
					<?php echo $sounds; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from escaped parts. ?>
					<?php if ( $many && $on( 'show_arrows' ) ) : ?>
						<button type="button" class="rf-tco__arrow rf-tco__prev" aria-label="<?php esc_attr_e( 'Previous slide', 'refraction' ); ?>"><?php echo self::arrow( 'prev' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- static SVG. ?></button>
						<button type="button" class="rf-tco__arrow rf-tco__next" aria-label="<?php esc_attr_e( 'Next slide', 'refraction' ); ?>"><?php echo self::arrow( 'next' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- static SVG. ?></button>
					<?php endif; ?>
					<?php if ( $many && $on( 'show_progress' ) && 'before' === ( $settings['progress_position'] ?? 'after' ) ) {
						echo self::progress_tag( $settings, $total ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped inside.
					} ?>
					<?php if ( $many && $on( 'show_line' ) ) : ?>
						<span class="rf-tco__line" aria-hidden="true"><i></i></span>
					<?php else : ?>
						<span class="rf-ts__spacer"></span>
					<?php endif; ?>
					<?php if ( $many && $on( 'show_progress' ) && 'before' !== ( $settings['progress_position'] ?? 'after' ) ) {
						echo self::progress_tag( $settings, $total ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped inside.
					} ?>
					<?php if ( $many && $on( 'show_count' ) ) : ?>
						<span class="rf-tco__count" aria-hidden="true">01</span>
					<?php endif; ?>
				</div>
			</div>
		</div>
		<?php
	}

	/** The progress number (timed-cards.js keeps it up to date), showing the first slide. */
	private static function progress_tag( array $settings, int $total ): string {
		$format = (string) ( $settings['progress_format'] ?? 'percent' );

		/* translators: 1: current slide, 2: number of slides. */
		$of = __( '%1$d of %2$d', 'refraction' );

		return sprintf( '<span class="rf-tco__progress" data-format="%1$s" data-of="%2$s" aria-hidden="true">%3$s</span>', esc_attr( $format ), esc_attr( $of ), esc_html( self::progress_text( $format, 1, $total ) ) );
	}

	/** Same formats as progressText() in modules/card-motion/assets/js/timed-cards.js. */
	public static function progress_text( string $format, int $current, int $total ): string {
		$pad = static function ( int $n ): string {
			return str_pad( (string) $n, 2, '0', STR_PAD_LEFT );
		};

		switch ( $format ) {
			case 'fraction':
				return $current . '/' . $total;
			case 'fraction-spaced':
				return $current . ' / ' . $total;
			case 'of':
				/* translators: 1: current slide, 2: number of slides. */
				return sprintf( __( '%1$d of %2$d', 'refraction' ), $current, $total );
			case 'padded':
				return $pad( $current ) . ' / ' . $pad( $total );
			default:
				return (int) round( $current / max( 1, $total ) * 100 ) . '%';
		}
	}

	/** Prints a slide's container, marked as that slide's content (only the container itself, not containers inside it). */
	private function print_slide_content( int $index, int $total, array $slides ) {
		$children = $this->get_children();
		$target_id = $children[ $index ]->get_id();
		$title = (string) ( $slides[ $index ]['slide_title'] ?? '' );

		$decorate = function ( $should_render, $container ) use ( $index, $total, $title, $target_id ) {
			if ( $container->get_id() !== $target_id ) {
				return $should_render;
			}

			$container->add_render_attribute( '_wrapper', [
				'class' => [ 'rf-tco__text', 0 === $index ? 'is-active' : '' ],
				'role' => 'group',
				'aria-roledescription' => 'slide',
				'aria-hidden' => 0 === $index ? 'false' : 'true',
				'aria-label' => sprintf( '%d / %d%s', $index + 1, $total, '' !== trim( $title ) ? ' - ' . wp_strip_all_tags( $title ) : '' ),
			] );

			return $should_render;
		};

		add_filter( 'refraction/frontend/container/should_render', $decorate, 10, 2 );
		$children[ $index ]->print_element();
		remove_filter( 'refraction/frontend/container/should_render', $decorate, 10 );
	}

	protected function content_template() {
		?>
		<#
		const slides = settings.slides || [];
		const total = slides.length;
		const many = total > 1;
		const ytId = ( url ) => {
			const m = String( url || '' ).match( /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/ );
			return m ? m[1] : '';
		};
		const picture = ( slide ) => {
			let css = '';
			const id = ytId( slide.background_video );
			if ( slide.background_image && slide.background_image.url ) {
				css = 'background-image:url(' + slide.background_image.url + ');';
			} else if ( id ) {
				css = 'background-image:url(https://i.ytimg.com/vi/' + id + '/maxresdefault.jpg),url(https://i.ytimg.com/vi/' + id + '/hqdefault.jpg);';
			}
			return css + ( slide.background_color ? 'background-color:' + slide.background_color + ';' : '' );
		};
		const autoplay = 'yes' === settings.autoplay;
		const showCards = 'yes' === settings.show_cards && many;
		let sounds = '';
		_.each( slides, ( slide, index ) => {
			if ( ytId( slide.background_video ) && 'yes' === slide.video_sound ) {
				sounds += '<button type="button" class="refraction-slide__sound" data-rf-sound="' + index + '" aria-pressed="false" aria-label="Sound" hidden><svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path class="refraction-slide__sound-on" d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/><path class="refraction-slide__sound-off" d="m23 9-6 6m0-6 6 6"/></svg></button>';
			}
		} );
		const rail = showCards || sounds || ( many && ( 'yes' === settings.show_arrows || 'yes' === settings.show_line || 'yes' === settings.show_count || 'yes' === settings.show_progress ) );
		#>
		<div class="rf-tco rf-ts {{ autoplay && 'yes' !== settings.pause_on_hover ? 'rf-ts--no-pause' : '' }}" role="region" aria-roledescription="carousel" aria-label="{{ settings.slider_label }}" tabindex="0">
			<div class="rf-tco__stage">
				<# _.each( slides, ( slide ) => { const id = ytId( slide.background_video ); #>
					<div class="rf-tco__slide refraction-repeater-item-{{ slide._id }}">
						<div class="rf-tco__bg" style="{{ picture( slide ) }}"></div>
						<# if ( id ) { #><div class="refraction-slide__video" data-rf-yt="{{ id }}" data-rf-yt-next="{{ 'yes' === slide.video_next ? '1' : '0' }}"></div><# } #>
						<# if ( 'yes' === settings.overlay ) { #><div class="refraction-slide__overlay"></div><# } #>
					</div>
				<# } ); #>
			</div>
			<# if ( autoplay && 'yes' === settings.show_timer && many ) { #><div class="rf-tco__timer" aria-hidden="true"><i></i></div><# } #>
			<div class="rf-ts__layer rf-ts__layer--content">
				<div class="rf-tco__texts rf-ts__content"></div>
			</div>
			<# if ( rail ) { #>
				<div class="rf-ts__layer rf-ts__layer--cards">
					<div class="rf-tco__rail rf-ts__rail">
						<# if ( showCards ) { #>
							<div class="rf-tco__cards">
								<# _.each( slides, ( slide, index ) => { #>
									<button type="button" class="rf-tco__card" style="{{ picture( slide ) }}" aria-label="Show slide {{ index + 1 }}: {{ slide.slide_title }}">
										<# if ( 'yes' === settings.card_text ) { #>
											<span class="rf-tco__card-text"><# if ( slide.card_label ) { #><small>{{ slide.card_label }}</small><# } #>{{ slide.slide_title }}</span>
										<# } #>
									</button>
								<# } ); #>
							</div>
						<# } #>
						<div class="rf-tco__nav">
							{{{ sounds }}}
							<# if ( many && 'yes' === settings.show_arrows ) { #>
								<button type="button" class="rf-tco__arrow rf-tco__prev" aria-label="Previous slide"><?php echo self::arrow( 'prev' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- static SVG. ?></button>
								<button type="button" class="rf-tco__arrow rf-tco__next" aria-label="Next slide"><?php echo self::arrow( 'next' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- static SVG. ?></button>
							<# } #>
							<# var progressTag = '';
							if ( many && 'yes' === settings.show_progress ) {
								var pf = settings.progress_format || 'percent', pn = slides.length, pad2 = function( x ) { return ( x < 10 ? '0' : '' ) + x; };
								var pof = '<?php echo esc_js( __( '%1$d of %2$d', 'refraction' ) ); ?>';
								var ptext = { fraction: '1/' + pn, 'fraction-spaced': '1 / ' + pn, of: pof.replace( '%1$d', 1 ).replace( '%2$d', pn ), padded: '01 / ' + pad2( pn ) }[ pf ] || Math.round( 100 / pn ) + '%';
								progressTag = '<span class="rf-tco__progress" data-format="' + _.escape( pf ) + '" data-of="' + _.escape( pof ) + '" aria-hidden="true">' + _.escape( ptext ) + '</span>';
							} #>
							<# if ( 'before' === settings.progress_position ) { #>{{{ progressTag }}}<# } #>
							<# if ( many && 'yes' === settings.show_line ) { #><span class="rf-tco__line" aria-hidden="true"><i></i></span><# } else { #><span class="rf-ts__spacer"></span><# } #>
							<# if ( 'before' !== settings.progress_position ) { #>{{{ progressTag }}}<# } #>
							<# if ( many && 'yes' === settings.show_count ) { #><span class="rf-tco__count" aria-hidden="true">01</span><# } #>
						</div>
					</div>
				</div>
			<# } #>
		</div>
		<?php
	}
}
