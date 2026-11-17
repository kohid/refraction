<?php
namespace Refraction\Modules\FocusStack\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Background;
use Refraction\Group_Control_Border;
use Refraction\Group_Control_Box_Shadow;
use Refraction\Modules\NestedElements\Base\Widget_Nested_Base;
use Refraction\Modules\NestedElements\Controls\Control_Nested_Repeater;
use Refraction\Modules\ProWidgets\Module as ProWidgets;
use Refraction\Repeater;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Focus Stack (0.110.0): the current slide is a whole card, its Header, Content and Footer containers one under
 * another; the slides before and after it wait as slim cards showing only their header or footer (chosen per side),
 * and the ones two away wait smaller and fainter. Moving on, the waiting card grows into the current one, its content
 * fading in, while the old one folds into a slim card on the other side. Up and down or left and right, either way.
 *
 * Every slide is a container holding three containers: the first is its header, the last its footer, the ones between
 * its content. Markup: .rf-fs > .rf-fs__slides > the slide containers (.rf-fs__slide, marked by the script).
 * Script: modules/focus-stack/assets/js/frontend/handlers/focus-stack.js; styles: assets/scss/frontend.scss.
 */
class Focus_Stack extends Widget_Nested_Base {

	public function get_name() {
		return 'refraction-focus-stack';
	}

	public function get_title() {
		return esc_html__( 'Focus Stack', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-slides';
	}

	public function get_categories() {
		return [ ProWidgets::CATEGORY ];
	}

	public function get_keywords() {
		return [ 'stack', 'cards', 'slider', 'slides', 'carousel', 'accordion', 'header', 'footer', 'nested', 'container', 'vertical' ];
	}

	public function get_style_depends(): array {
		return [ 'widget-focus-stack' ];
	}

	protected function is_dynamic_content(): bool {
		return true;
	}

	protected function get_html_wrapper_class() {
		return 'refraction-widget-focus-stack';
	}

	// ---------------------------------------------------------------- the slides and their parts

	private static function widget( string $type, array $settings ): array {
		return [ 'elType' => 'widget', 'widgetType' => $type, 'settings' => $settings, 'elements' => [] ];
	}

	private static function part( string $title, array $settings, array $elements ): array {
		return [
			'elType' => 'container',
			'isInner' => true,
			'settings' => $settings + [
				'_title' => $title,
				'content_width' => 'full',
				'padding' => [ 'unit' => 'px', 'top' => '14', 'right' => '18', 'bottom' => '14', 'left' => '18', 'isLinked' => false ],
			],
			'elements' => $elements,
		];
	}

	/** A slide: its Header, Content and Footer containers, each with an example to edit or replace. */
	private function slide_container( int $index ): array {
		$titles = [ 1 => __( 'First slide', 'refraction' ), 2 => __( 'Second slide', 'refraction' ), 3 => __( 'Third slide', 'refraction' ) ];
		$muted = '#6B7280';
		$row = [ 'flex_direction' => 'row', 'flex_justify_content' => 'space-between', 'flex_align_items' => 'center', 'flex_wrap' => 'nowrap' ];
		$small = [ 'typography_typography' => 'custom', 'typography_font_size' => [ 'unit' => 'px', 'size' => 13 ] ];

		return [
			'elType' => 'container',
			'settings' => [
				/* translators: %d: Slide index. */
				'_title' => sprintf( __( 'Slide #%d', 'refraction' ), $index ),
				'content_width' => 'full',
				'flex_gap' => [ 'unit' => 'px', 'size' => 0, 'column' => '0', 'row' => '0', 'isLinked' => true ],
				'padding' => [ 'unit' => 'px', 'top' => '0', 'right' => '0', 'bottom' => '0', 'left' => '0', 'isLinked' => true ],
			],
			'elements' => [
				self::part( __( 'Header', 'refraction' ), $row, [
					self::widget( 'heading', [
						'title' => $titles[ $index ] ?? sprintf( /* translators: %d: Slide index. */ __( 'Slide %d', 'refraction' ), $index ),
						'header_size' => 'h3',
						'typography_typography' => 'custom',
						'typography_font_size' => [ 'unit' => 'px', 'size' => 16 ],
						'typography_font_weight' => '600',
					] ),
					self::widget( 'heading', [ 'title' => __( 'Header', 'refraction' ), 'header_size' => 'p', 'title_color' => $muted ] + $small ),
				] ),
				self::part( __( 'Content', 'refraction' ), [ 'min_height' => [ 'unit' => 'px', 'size' => 180 ], 'flex_justify_content' => 'center' ], [
					self::widget( 'heading', [
						'title' => __( 'Content', 'refraction' ),
						'header_size' => 'h4',
						'typography_typography' => 'custom',
						'typography_font_size' => [ 'unit' => 'px', 'size' => 22 ],
					] ),
					self::widget( 'text-editor', [
						'editor' => '<p>' . esc_html__( 'Drop any widgets here. When this slide waits before or after the current one, only its header or its footer shows.', 'refraction' ) . '</p>',
					] ),
				] ),
				self::part( __( 'Footer', 'refraction' ), $row, [
					self::widget( 'heading', [ 'title' => __( 'Footer', 'refraction' ), 'header_size' => 'p', 'title_color' => $muted ] + $small ),
					self::widget( 'button', [ 'text' => __( 'Open', 'refraction' ), 'size' => 'xs' ] ),
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
		return '.rf-fs__slides';
	}

	/** A slide added in the editor gets its Header, Content and Footer containers, like the first ones. */
	protected function new_items_like_defaults(): bool {
		return true;
	}

	// ---------------------------------------------------------------- controls

	private static function choose( array $labels_icons ): array {
		$options = [];

		foreach ( $labels_icons as $value => [ $label, $icon ] ) {
			$options[ $value ] = [ 'title' => $label, 'icon' => $icon ];
		}

		return $options;
	}

	protected function register_controls() {
		$vertical = [ 'orientation!' => 'horizontal' ];
		$horizontal = [ 'orientation' => 'horizontal' ];

		// ------------------------------------------------ Content: slides
		$this->start_controls_section( 'section_slides', [ 'label' => esc_html__( 'Slides', 'refraction' ) ] );

		$repeater = new Repeater();
		$repeater->add_control( 'slide_title', [
			'label' => esc_html__( 'Title', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => esc_html__( 'Slide', 'refraction' ),
			'label_block' => true,
			'description' => esc_html__( 'For the navigator and screen readers. The slide itself is the container under this widget: its first container is the header, its last the footer, the ones between the content.', 'refraction' ),
		] );

		$repeater->add_control( 'waiting_part', [
			'label' => esc_html__( 'When waiting, it shows', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '',
			'options' => [
				'' => esc_html__( 'As set for the stack', 'refraction' ),
				'header' => esc_html__( 'Its header', 'refraction' ),
				'footer' => esc_html__( 'Its footer', 'refraction' ),
			],
			'description' => esc_html__( 'What this slide shows while it waits before or after the current one. "As set for the stack": Layout > The next / previous slides show.', 'refraction' ),
		] );

		$this->add_control( 'slides', [
			'label' => esc_html__( 'Slides', 'refraction' ),
			'type' => Control_Nested_Repeater::CONTROL_TYPE,
			'frontend_available' => true,
			'fields' => $repeater->get_controls(),
			'default' => [
				[ 'slide_title' => esc_html__( 'Slide #1', 'refraction' ) ],
				[ 'slide_title' => esc_html__( 'Slide #2', 'refraction' ) ],
				[ 'slide_title' => esc_html__( 'Slide #3', 'refraction' ) ],
			],
			'title_field' => '{{{ slide_title }}}',
			'button_text' => esc_html__( 'Add Slide', 'refraction' ),
		] );

		$this->add_control( 'stack_label', [
			'label' => esc_html__( 'Accessible name', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => esc_html__( 'Cards', 'refraction' ),
			'separator' => 'before',
		] );

		$this->end_controls_section();

		// ------------------------------------------------ Content: layout
		$this->start_controls_section( 'section_layout', [ 'label' => esc_html__( 'Layout', 'refraction' ) ] );

		$this->add_control( 'orientation', [
			'frontend_available' => true,
			'render_type' => 'ui',
			'label' => esc_html__( 'Stack', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'options' => self::choose( [
				'vertical' => [ esc_html__( 'Up and down', 'refraction' ), 'rficon-v-align-stretch' ],
				'horizontal' => [ esc_html__( 'Side by side', 'refraction' ), 'rficon-h-align-stretch' ],
			] ),
			'default' => 'vertical',
			'toggle' => false,
			'prefix_class' => 'rf-fs-o-',
		] );

		$this->add_control( 'direction_v', [
			'frontend_available' => true,
			// Read by the script, which rebuilds the stack: no need to draw the widget again.
			'render_type' => 'none',
			'label' => esc_html__( 'Moves', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'down',
			'options' => [
				'down' => esc_html__( 'Down: the next slide waits above', 'refraction' ),
				'up' => esc_html__( 'Up: the next slide waits below', 'refraction' ),
			],
			'condition' => $vertical,
		] );

		$this->add_control( 'direction_h', [
			'frontend_available' => true,
			'render_type' => 'none',
			'label' => esc_html__( 'Moves', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'left',
			'options' => [
				'left' => esc_html__( 'Left: the next slide waits on the right', 'refraction' ),
				'right' => esc_html__( 'Right: the next slide waits on the left', 'refraction' ),
			],
			'condition' => $horizontal,
		] );

		$parts = [
			'header' => esc_html__( 'Its header', 'refraction' ),
			'footer' => esc_html__( 'Its footer', 'refraction' ),
		];

		$this->add_control( 'next_part', [
			'frontend_available' => true,
			'render_type' => 'none',
			'label' => esc_html__( 'The next slides show', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'header',
			'options' => $parts,
			'separator' => 'before',
		] );

		$this->add_control( 'prev_part', [
			'frontend_available' => true,
			'render_type' => 'none',
			'label' => esc_html__( 'The previous slides show', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'footer',
			'options' => $parts,
		] );

		$this->add_control( 'focus_shows', [
			'label' => esc_html__( 'The slide in focus shows', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'frontend_available' => true,
			'render_type' => 'none',
			'default' => 'full',
			'options' => [
				'full' => esc_html__( 'Everything: header, content and footer', 'refraction' ),
				'content' => esc_html__( 'Its content only', 'refraction' ),
				'header_content' => esc_html__( 'Its header and content', 'refraction' ),
				'content_footer' => esc_html__( 'Its content and footer', 'refraction' ),
			],
			'description' => esc_html__( 'The parts left out still show while the slide waits, if that is the part it shows.', 'refraction' ),
		] );

		$this->add_control( 'visible', [
			'frontend_available' => true,
			'render_type' => 'none',
			'label' => esc_html__( 'Waiting slides on each side', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '2',
			'options' => [
				'0' => esc_html__( 'None', 'refraction' ),
				'1' => esc_html__( 'One', 'refraction' ),
				'2' => esc_html__( 'Two (the second smaller and fainter)', 'refraction' ),
			],
		] );

		$this->add_control( 'loop', [
			'frontend_available' => true,
			'render_type' => 'none',
			'label' => esc_html__( 'Go round', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'description' => esc_html__( 'After the last slide comes the first. Off: the first slide has nothing before it.', 'refraction' ),
		] );

		$this->add_responsive_control( 'stack_height', [
			'label' => esc_html__( 'Height', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px', 'vh' ],
			'range' => [ 'px' => [ 'min' => 160, 'max' => 1000 ], 'vh' => [ 'min' => 20, 'max' => 100 ] ],
			'default' => [ 'unit' => 'px', 'size' => 420 ],
			'selectors' => [ '{{WRAPPER}} .rf-fs' => '--rf-fs-height: {{SIZE}}{{UNIT}};' ],
			'condition' => $horizontal,
		] );

		$this->add_responsive_control( 'active_min_height', [
			'label' => esc_html__( 'Current slide at least', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px', 'vh' ],
			'range' => [ 'px' => [ 'min' => 0, 'max' => 900 ], 'vh' => [ 'min' => 0, 'max' => 100 ] ],
			'selectors' => [ '{{WRAPPER}} .rf-fs' => '--rf-fs-active-min: {{SIZE}}{{UNIT}};' ],
			'condition' => $vertical,
		] );

		$this->add_control( 'rotate_parts', [
			'label' => esc_html__( 'Turn the waiting slides\' text', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'description' => esc_html__( 'The header or footer of a slim side card reads from top to bottom.', 'refraction' ),
			'prefix_class' => 'rf-fs-turn-',
			'render_type' => 'ui',
			'condition' => $horizontal,
		] );

		$this->end_controls_section();

		// ------------------------------------------------ Content: motion
		$this->start_controls_section( 'section_motion', [ 'label' => esc_html__( 'Motion', 'refraction' ) ] );

		$this->add_control( 'duration', [
			'frontend_available' => true,
			'render_type' => 'none',
			'label' => esc_html__( 'Duration (ms)', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'min' => 100,
			'max' => 3000,
			'step' => 50,
			'default' => 700,
		] );

		$this->add_control( 'easing', [
			'frontend_available' => true,
			'render_type' => 'none',
			'label' => esc_html__( 'Easing', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'smooth',
			'options' => [
				'smooth' => esc_html__( 'Smooth', 'refraction' ),
				'snappy' => esc_html__( 'Snappy', 'refraction' ),
				'gentle' => esc_html__( 'Gentle', 'refraction' ),
				'spring' => esc_html__( 'Springy', 'refraction' ),
				'linear' => esc_html__( 'Even', 'refraction' ),
			],
		] );

		$this->add_control( 'fade_content', [
			'frontend_available' => true,
			'render_type' => 'none',
			'label' => esc_html__( 'Fade the content in', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'description' => esc_html__( 'The growing card shows its content once it has made room for it.', 'refraction' ),
		] );

		$this->add_control( 'autoplay', [
			'frontend_available' => true,
			'render_type' => 'none',
			'label' => esc_html__( 'Play by itself', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'separator' => 'before',
			'description' => esc_html__( 'Not in Edit Mode, where the stack follows the slide you pick.', 'refraction' ),
		] );

		$this->add_control( 'interval', [
			'frontend_available' => true,
			'render_type' => 'none',
			'label' => esc_html__( 'Each slide stays (ms)', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'min' => 800,
			'max' => 20000,
			'step' => 100,
			'default' => 3000,
			'condition' => [ 'autoplay' => 'yes' ],
		] );

		$this->add_control( 'pause_on_hover', [
			'frontend_available' => true,
			'render_type' => 'none',
			'label' => esc_html__( 'Wait while the pointer is on it', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'condition' => [ 'autoplay' => 'yes' ],
		] );

		$this->add_control( 'click_waiting', [
			'frontend_available' => true,
			'render_type' => 'none',
			'label' => esc_html__( 'Clicking a waiting slide opens it', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'description' => esc_html__( 'The arrow keys and a swipe always move the stack.', 'refraction' ),
		] );

		$this->end_controls_section();

		// ------------------------------------------------ Style: the current slide
		$this->start_controls_section( 'section_style_active', [
			'label' => esc_html__( 'Current slide', 'refraction' ),
			'tab' => Controls_Manager::TAB_STYLE,
		] );

		$this->add_group_control( Group_Control_Background::get_type(), [
			'name' => 'active_background',
			'types' => [ 'classic', 'gradient' ],
			'exclude' => [ 'image' ],
			'selector' => '{{WRAPPER}} .rf-fs__slide.is-active',
		] );

		$this->add_group_control( Group_Control_Border::get_type(), [
			'name' => 'active_border',
			'selector' => '{{WRAPPER}} .rf-fs__slide.is-active',
		] );

		$this->add_responsive_control( 'active_radius', [
			'label' => esc_html__( 'Border Radius', 'refraction' ),
			'type' => Controls_Manager::DIMENSIONS,
			'size_units' => [ 'px', '%', 'em' ],
			'selectors' => [ '{{WRAPPER}} .rf-fs' => '--rf-fs-active-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
		] );

		$this->add_group_control( Group_Control_Box_Shadow::get_type(), [
			'name' => 'active_shadow',
			'selector' => '{{WRAPPER}} .rf-fs__slide.is-active',
		] );

		$this->end_controls_section();

		// ------------------------------------------------ Style: how the waiting slides lay out the part they show
		$this->start_controls_section( 'section_style_waiting_layout', [
			'label' => esc_html__( 'Waiting slides layout', 'refraction' ),
			'tab' => Controls_Manager::TAB_STYLE,
		] );

		$this->add_control( 'waiting_layout_note', [
			'type' => Controls_Manager::RAW_HTML,
			'raw' => esc_html__( 'How the header or footer a waiting slide shows is laid out, for the next and the previous slides. Empty: as set on that container. In focus, every container is laid out its own way again.', 'refraction' ),
			'content_classes' => 'refraction-descriptor',
		] );

		$this->start_controls_tabs( 'waiting_layout_tabs' );

		foreach ( [ 'next' => esc_html__( 'Next', 'refraction' ), 'prev' => esc_html__( 'Previous', 'refraction' ) ] as $side => $side_label ) {
			$selector = '{{WRAPPER}} .rf-fs__slide.is-' . $side . ':not(.is-moving) .rf-fs__part.is-shown';

			$this->start_controls_tab( 'waiting_layout_' . $side, [ 'label' => $side_label ] );

			$this->add_responsive_control( $side . '_part_padding', [
				'label' => esc_html__( 'Padding', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', 'em', 'rem', '%' ],
				'selectors' => [ $selector => '--padding-top: {{TOP}}{{UNIT}}; --padding-right: {{RIGHT}}{{UNIT}}; --padding-bottom: {{BOTTOM}}{{UNIT}}; --padding-left: {{LEFT}}{{UNIT}}; --padding-block-start: {{TOP}}{{UNIT}}; --padding-inline-end: {{RIGHT}}{{UNIT}}; --padding-block-end: {{BOTTOM}}{{UNIT}}; --padding-inline-start: {{LEFT}}{{UNIT}};' ],
			] );

			$this->add_responsive_control( $side . '_part_direction', [
				'label' => esc_html__( 'Direction', 'refraction' ),
				'type' => Controls_Manager::CHOOSE,
				'options' => self::choose( [
					'row' => [ esc_html__( 'Row - horizontal', 'refraction' ), 'rficon-arrow-right' ],
					'column' => [ esc_html__( 'Column - vertical', 'refraction' ), 'rficon-arrow-down' ],
					'row-reverse' => [ esc_html__( 'Row - reversed', 'refraction' ), 'rficon-arrow-left' ],
					'column-reverse' => [ esc_html__( 'Column - reversed', 'refraction' ), 'rficon-arrow-up' ],
				] ),
				'selectors_dictionary' => [
					'row' => '--flex-direction: row; --container-widget-width: initial; --container-widget-height: 100%; --container-widget-flex-grow: 1; --container-widget-align-self: stretch;',
					'column' => '--flex-direction: column; --container-widget-width: 100%; --container-widget-height: initial; --container-widget-flex-grow: 0; --container-widget-align-self: initial;',
					'row-reverse' => '--flex-direction: row-reverse; --container-widget-width: initial; --container-widget-height: 100%; --container-widget-flex-grow: 1; --container-widget-align-self: stretch;',
					'column-reverse' => '--flex-direction: column-reverse; --container-widget-width: 100%; --container-widget-height: initial; --container-widget-flex-grow: 0; --container-widget-align-self: initial;',
				],
				'selectors' => [ $selector => '{{VALUE}}' ],
			] );

			$this->add_responsive_control( $side . '_part_justify', [
				'label' => esc_html__( 'Justify Content', 'refraction' ),
				'type' => Controls_Manager::CHOOSE,
				'label_block' => true,
				'options' => self::choose( [
					'flex-start' => [ esc_html__( 'Start', 'refraction' ), 'rficon-flex rficon-justify-start-h' ],
					'center' => [ esc_html__( 'Center', 'refraction' ), 'rficon-flex rficon-justify-center-h' ],
					'flex-end' => [ esc_html__( 'End', 'refraction' ), 'rficon-flex rficon-justify-end-h' ],
					'space-between' => [ esc_html__( 'Space Between', 'refraction' ), 'rficon-flex rficon-justify-space-between-h' ],
					'space-around' => [ esc_html__( 'Space Around', 'refraction' ), 'rficon-flex rficon-justify-space-around-h' ],
					'space-evenly' => [ esc_html__( 'Space Evenly', 'refraction' ), 'rficon-flex rficon-justify-space-evenly-h' ],
				] ),
				'selectors' => [ $selector => '--justify-content: {{VALUE}};' ],
			] );

			$this->add_responsive_control( $side . '_part_align', [
				'label' => esc_html__( 'Align Items', 'refraction' ),
				'type' => Controls_Manager::CHOOSE,
				'options' => self::choose( [
					'flex-start' => [ esc_html__( 'Start', 'refraction' ), 'rficon-flex rficon-align-start-v' ],
					'center' => [ esc_html__( 'Center', 'refraction' ), 'rficon-flex rficon-align-center-v' ],
					'flex-end' => [ esc_html__( 'End', 'refraction' ), 'rficon-flex rficon-align-end-v' ],
					'stretch' => [ esc_html__( 'Stretch', 'refraction' ), 'rficon-flex rficon-align-stretch-v' ],
				] ),
				'selectors' => [ $selector => '--align-items: {{VALUE}};' ],
			] );

			$this->add_responsive_control( $side . '_part_gap', [
				'label' => esc_html__( 'Gap', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'em', 'rem' ],
				'range' => [ 'px' => [ 'min' => 0, 'max' => 100 ] ],
				'selectors' => [ $selector => '--gap: {{SIZE}}{{UNIT}}; --row-gap: {{SIZE}}{{UNIT}}; --column-gap: {{SIZE}}{{UNIT}};' ],
			] );

			$this->end_controls_tab();
		}

		$this->end_controls_tabs();

		$this->end_controls_section();

		// ------------------------------------------------ Style: the waiting slides
		$this->start_controls_section( 'section_style_waiting', [
			'label' => esc_html__( 'Waiting slides', 'refraction' ),
			'tab' => Controls_Manager::TAB_STYLE,
		] );

		$this->add_responsive_control( 'gap', [
			'label' => esc_html__( 'Space between cards', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px' ],
			'range' => [ 'px' => [ 'min' => 0, 'max' => 60 ] ],
			'default' => [ 'unit' => 'px', 'size' => 10 ],
			'selectors' => [ '{{WRAPPER}} .rf-fs' => '--rf-fs-gap: {{SIZE}}{{UNIT}};' ],
		] );

		$this->add_responsive_control( 'near_size', [
			'label' => esc_html__( 'Width (next to the current one)', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ '%' ],
			'range' => [ '%' => [ 'min' => 30, 'max' => 100 ] ],
			'default' => [ 'unit' => '%', 'size' => 88 ],
			'selectors' => [ '{{WRAPPER}} .rf-fs' => '--rf-fs-near-size: {{SIZE}}%;' ],
			'condition' => $vertical,
		] );

		$this->add_responsive_control( 'far_size', [
			'label' => esc_html__( 'Width (two away)', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ '%' ],
			'range' => [ '%' => [ 'min' => 30, 'max' => 100 ] ],
			'default' => [ 'unit' => '%', 'size' => 76 ],
			'selectors' => [ '{{WRAPPER}} .rf-fs' => '--rf-fs-far-size: {{SIZE}}%;' ],
			'condition' => $vertical + [ 'visible' => '2' ],
		] );

		$this->add_responsive_control( 'thickness', [
			'label' => esc_html__( 'Height', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px' ],
			'range' => [ 'px' => [ 'min' => 24, 'max' => 200 ] ],
			'description' => esc_html__( 'Empty: the height of its header or footer.', 'refraction' ),
			'selectors' => [ '{{WRAPPER}} .rf-fs' => '--rf-fs-thick: {{SIZE}}{{UNIT}};' ],
			'condition' => $vertical,
		] );

		$this->add_responsive_control( 'side_width', [
			'label' => esc_html__( 'Width', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px' ],
			'range' => [ 'px' => [ 'min' => 24, 'max' => 240 ] ],
			'default' => [ 'unit' => 'px', 'size' => 64 ],
			'selectors' => [ '{{WRAPPER}} .rf-fs' => '--rf-fs-side: {{SIZE}}{{UNIT}};' ],
			'condition' => $horizontal,
		] );

		$this->add_responsive_control( 'near_size_h', [
			'label' => esc_html__( 'Height (next to the current one)', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ '%' ],
			'range' => [ '%' => [ 'min' => 30, 'max' => 100 ] ],
			'default' => [ 'unit' => '%', 'size' => 88 ],
			'selectors' => [ '{{WRAPPER}} .rf-fs' => '--rf-fs-near-size: {{SIZE}}%;' ],
			'condition' => $horizontal,
		] );

		$this->add_responsive_control( 'far_size_h', [
			'label' => esc_html__( 'Height (two away)', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ '%' ],
			'range' => [ '%' => [ 'min' => 30, 'max' => 100 ] ],
			'default' => [ 'unit' => '%', 'size' => 76 ],
			'selectors' => [ '{{WRAPPER}} .rf-fs' => '--rf-fs-far-size: {{SIZE}}%;' ],
			'condition' => $horizontal + [ 'visible' => '2' ],
		] );

		$this->add_control( 'near_opacity', [
			'label' => esc_html__( 'Opacity (next to the current one)', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0.1, 'max' => 1, 'step' => 0.05 ] ],
			'default' => [ 'size' => 1 ],
			'selectors' => [ '{{WRAPPER}} .rf-fs' => '--rf-fs-near-opacity: {{SIZE}};' ],
		] );

		$this->add_control( 'far_opacity', [
			'label' => esc_html__( 'Opacity (two away)', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0.05, 'max' => 1, 'step' => 0.05 ] ],
			'default' => [ 'size' => 0.45 ],
			'selectors' => [ '{{WRAPPER}} .rf-fs' => '--rf-fs-far-opacity: {{SIZE}};' ],
			'condition' => [ 'visible' => '2' ],
		] );

		$this->add_group_control( Group_Control_Background::get_type(), [
			'name' => 'waiting_background',
			'types' => [ 'classic', 'gradient' ],
			'exclude' => [ 'image' ],
			'selector' => '{{WRAPPER}} .rf-fs__slide.is-waiting',
			'separator' => 'before',
		] );

		$this->add_group_control( Group_Control_Border::get_type(), [
			'name' => 'waiting_border',
			'selector' => '{{WRAPPER}} .rf-fs__slide.is-waiting',
		] );

		$this->add_responsive_control( 'waiting_radius', [
			'label' => esc_html__( 'Border Radius', 'refraction' ),
			'type' => Controls_Manager::DIMENSIONS,
			'size_units' => [ 'px', '%', 'em' ],
			'selectors' => [ '{{WRAPPER}} .rf-fs' => '--rf-fs-waiting-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
		] );

		$this->add_group_control( Group_Control_Box_Shadow::get_type(), [
			'name' => 'waiting_shadow',
			'selector' => '{{WRAPPER}} .rf-fs__slide.is-waiting',
		] );

		$this->end_controls_section();
	}

	// ---------------------------------------------------------------- output

	/** The settings the script reads, on the stack itself (it reads them in Edit Mode from the model). */
	private static function options( array $settings ): string {
		$horizontal = 'horizontal' === ( $settings['orientation'] ?? 'vertical' );

		return (string) wp_json_encode( [
			'reverse' => $horizontal ? 'right' !== ( $settings['direction_h'] ?? 'left' ) : 'up' === ( $settings['direction_v'] ?? 'down' ),
			'next' => 'footer' === ( $settings['next_part'] ?? 'header' ) ? 'footer' : 'header',
			'prev' => 'header' === ( $settings['prev_part'] ?? 'footer' ) ? 'header' : 'footer',
			'visible' => max( 0, min( 2, (int) ( $settings['visible'] ?? 2 ) ) ),
			'loop' => 'yes' === ( $settings['loop'] ?? 'yes' ),
			'duration' => max( 100, min( 3000, (int) ( $settings['duration'] ?? 700 ) ) ),
			'easing' => (string) ( $settings['easing'] ?? 'smooth' ),
			'fade' => 'yes' === ( $settings['fade_content'] ?? 'yes' ),
			'focus' => in_array( $settings['focus_shows'] ?? 'full', [ 'full', 'content', 'header_content', 'content_footer' ], true ) ? $settings['focus_shows'] : 'full',
			'autoplay' => 'yes' === ( $settings['autoplay'] ?? 'yes' ),
			'interval' => max( 800, (int) ( $settings['interval'] ?? 3000 ) ),
			'pause' => 'yes' === ( $settings['pause_on_hover'] ?? 'yes' ),
			'click' => 'yes' === ( $settings['click_waiting'] ?? 'yes' ),
			// Each slide's own choice ('' : as set for the stack).
			'parts' => array_map( static fn( $slide ) => in_array( $slide['waiting_part'] ?? '', [ 'header', 'footer' ], true ) ? $slide['waiting_part'] : '', array_values( (array) ( $settings['slides'] ?? [] ) ) ),
		] );
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		$slides = array_values( (array) ( $settings['slides'] ?? [] ) );
		$label = '' !== trim( (string) ( $settings['stack_label'] ?? '' ) ) ? $settings['stack_label'] : __( 'Cards', 'refraction' );

		$this->add_render_attribute( 'root', [
			'class' => 'rf-fs',
			'role' => 'region',
			'aria-roledescription' => 'carousel',
			'aria-label' => $label,
			'tabindex' => '0',
			'data-rf-fs' => self::options( $settings ),
		] );
		?>
		<div <?php $this->print_render_attribute_string( 'root' ); ?>>
			<div class="rf-fs__slides">
				<?php foreach ( $this->get_children() as $index => $child ) {
					$this->print_slide( $index, count( $this->get_children() ), (string) ( $slides[ $index ]['slide_title'] ?? '' ) );
				} ?>
			</div>
		</div>
		<?php
	}

	/** A slide container, marked for the script and screen readers; the first one is current before the script runs. */
	private function print_slide( int $index, int $total, string $title ) {
		$children = $this->get_children();
		$target_id = $children[ $index ]->get_id();

		$decorate = function ( $should_render, $container ) use ( $index, $total, $title, $target_id ) {
			if ( $container->get_id() !== $target_id ) {
				return $should_render;
			}

			$container->add_render_attribute( '_wrapper', [
				'class' => [ 'rf-fs__slide', 0 === $index ? 'is-active' : 'is-waiting' ],
				'role' => 'group',
				'aria-roledescription' => 'slide',
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
		<div class="rf-fs" role="region" aria-roledescription="carousel" aria-label="{{ settings.stack_label }}" tabindex="0">
			<div class="rf-fs__slides"></div>
		</div>
		<?php
	}
}
