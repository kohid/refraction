<?php
namespace Refraction\Modules\ConnectorSteps\Widgets;

use Refraction\Controls_Manager;
use Refraction\Icons_Manager;
use Refraction\Modules\NestedElements\Base\Widget_Nested_Base;
use Refraction\Modules\NestedElements\Controls\Control_Nested_Repeater;
use Refraction\Modules\ProWidgets\Module as ProWidgets;
use Refraction\Repeater;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Connector (0.142.0): steps in order (first, second, third...), each a container to design, with an arrow from each
 * step to the next. A row on wide screens; on phones (by default) one under another, the arrows then pointing down.
 *
 * Markup: .rf-cs > .rf-cs__step (one per step: its container, and the arrow to the next one except for the last). The
 * arrow sits in the gap after its step, centred on it: the layout writes where (custom properties per screen size),
 * so it needs no script. Its look: the line (dotted, dashed, solid, none) and the head (chevron, triangle, double
 * chevron, arrow in a circle, dot, an icon, none), with colour, thickness, size and an optional motion.
 */
class Connector_Steps extends Widget_Nested_Base {

	public function get_name() {
		return 'refraction-connector-steps';
	}

	public function get_title() {
		return esc_html__( 'Connector', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-arrow-right';
	}

	public function get_categories() {
		return [ ProWidgets::CATEGORY ];
	}

	public function get_keywords() {
		return [ 'connector', 'steps', 'process', 'flow', 'arrow', 'arrows', 'how it works', 'sequence', 'next', 'nested' ];
	}

	public function get_style_depends(): array {
		return [ 'widget-connector-steps' ];
	}

	protected function is_dynamic_content(): bool {
		return false;
	}

	protected function get_html_wrapper_class() {
		return 'refraction-widget-connector-steps';
	}

	// ---------------------------------------------------------------- the steps

	/** A step: a white card with its number, a title and a line of text, ready to change. */
	private function step_container( int $index ): array {
		return [
			'elType' => 'container',
			'settings' => [
				/* translators: %d: Step index. */
				'_title' => sprintf( __( 'Step #%d', 'refraction' ), $index ),
				'content_width' => 'full',
				'flex_gap' => [ 'unit' => 'px', 'size' => 8, 'column' => '8', 'row' => '8', 'isLinked' => true ],
				'padding' => [ 'unit' => 'px', 'top' => '28', 'right' => '24', 'bottom' => '28', 'left' => '24', 'isLinked' => false ],
				'background_background' => 'classic',
				'background_color' => '#FFFFFF',
				'border_radius' => [ 'unit' => 'px', 'top' => '16', 'right' => '16', 'bottom' => '16', 'left' => '16', 'isLinked' => true ],
				'box_shadow_box_shadow_type' => 'yes',
				'box_shadow_box_shadow' => [ 'horizontal' => 0, 'vertical' => 10, 'blur' => 30, 'spread' => 0, 'color' => 'rgba(17, 24, 39, 0.10)' ],
			],
			'elements' => [
				[ 'elType' => 'widget', 'widgetType' => 'heading', 'settings' => [ 'title' => sprintf( '%02d', $index ), 'header_size' => 'div', 'typography_typography' => 'custom', 'typography_font_size' => [ 'unit' => 'px', 'size' => 44 ], 'typography_font_weight' => '300', 'title_color' => '#2563EB' ], 'elements' => [] ],
				/* translators: %d: Step index. */
				[ 'elType' => 'widget', 'widgetType' => 'heading', 'settings' => [ 'title' => sprintf( __( 'Step %d', 'refraction' ), $index ), 'header_size' => 'h3', 'typography_typography' => 'custom', 'typography_font_size' => [ 'unit' => 'px', 'size' => 18 ] ], 'elements' => [] ],
				[ 'elType' => 'widget', 'widgetType' => 'text-editor', 'settings' => [ 'editor' => '<p>' . esc_html__( 'Say what happens at this step.', 'refraction' ) . '</p>' ], 'elements' => [] ],
			],
		];
	}

	protected function get_default_children_elements() {
		return [ $this->step_container( 1 ), $this->step_container( 2 ), $this->step_container( 3 ), $this->step_container( 4 ) ];
	}

	protected function get_default_repeater_title_setting_key() {
		return 'item_title';
	}

	protected function get_default_children_title() {
		/* translators: %d: Step index. */
		return esc_html__( 'Step #%d', 'refraction' );
	}

	/** One slot per step: its container goes into the step of the same place, with the arrow after it. */
	protected function get_default_children_container_placeholder_selector() {
		return '.rf-cs__step';
	}

	/** A new step starts as the first ones (the card with its number, title and text). */
	protected function new_items_like_defaults(): bool {
		return true;
	}

	// ---------------------------------------------------------------- controls

	protected function register_controls() {
		$this->start_controls_section( 'section_items', [ 'label' => esc_html__( 'Steps', 'refraction' ) ] );

		$repeater = new Repeater();
		$repeater->add_control( 'item_title', [
			'label' => esc_html__( 'Title', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => esc_html__( 'Step', 'refraction' ),
			'label_block' => true,
			'description' => esc_html__( 'For the panel and Structure. The step itself is the container under this widget: design it with any widgets.', 'refraction' ),
		] );

		$this->add_control( 'items', [
			'label' => esc_html__( 'Steps', 'refraction' ),
			'type' => Control_Nested_Repeater::CONTROL_TYPE,
			'fields' => $repeater->get_controls(),
			'default' => [
				[ 'item_title' => esc_html__( 'Step #1', 'refraction' ) ],
				[ 'item_title' => esc_html__( 'Step #2', 'refraction' ) ],
				[ 'item_title' => esc_html__( 'Step #3', 'refraction' ) ],
				[ 'item_title' => esc_html__( 'Step #4', 'refraction' ) ],
			],
			'title_field' => '{{{ item_title }}}',
			'button_text' => esc_html__( 'Add Step', 'refraction' ),
			'description' => esc_html__( 'In this order the arrows point: from each step to the next. Drag to change the order.', 'refraction' ),
		] );

		$this->end_controls_section();

		// ------------------------------------------------ Layout
		$this->start_controls_section( 'section_layout', [ 'label' => esc_html__( 'Layout', 'refraction' ) ] );

		$root = '{{WRAPPER}} .rf-cs';

		$this->add_responsive_control( 'direction', [
			'label' => esc_html__( 'Steps', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'options' => [
				'row' => [ 'title' => esc_html__( 'In a row (arrows pointing right)', 'refraction' ), 'icon' => 'rficon-arrow-right' ],
				'column' => [ 'title' => esc_html__( 'One under another (arrows pointing down)', 'refraction' ), 'icon' => 'rficon-arrow-down' ],
			],
			'default' => 'row',
			'mobile_default' => 'column',
			'toggle' => false,
			'description' => esc_html__( 'Per screen size (the device icon). Phones start with the steps one under another.', 'refraction' ),
			// Where each arrow sits: the middle of the gap after its step, along the step at "Arrow Along The Step".
			'selectors_dictionary' => [
				'row' => 'flex-direction: row; --rf-cs-flex: 1 1 0; --rf-cs-cx: calc(100% + var(--rf-cs-gap, 56px) / 2); --rf-cs-cy: var(--rf-cs-at, 50%); --rf-cs-rot: 0deg;',
				'column' => 'flex-direction: column; --rf-cs-flex: 0 0 auto; --rf-cs-cx: var(--rf-cs-at, 50%); --rf-cs-cy: calc(100% + var(--rf-cs-gap, 56px) / 2); --rf-cs-rot: 90deg;',
			],
			'selectors' => [ $root => '{{VALUE}}' ],
		] );

		$this->add_responsive_control( 'gap', [
			'label' => esc_html__( 'Space For The Arrows', 'refraction' ) . ' (px)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 16, 'max' => 200 ] ],
			'default' => [ 'size' => 64 ],
			'mobile_default' => [ 'size' => 56 ],
			'description' => esc_html__( 'The space between two steps; the arrow is drawn in it.', 'refraction' ),
			'selectors' => [ $root => 'gap: {{SIZE}}px; --rf-cs-gap: {{SIZE}}px;' ],
		] );

		$this->add_responsive_control( 'at', [
			'label' => esc_html__( 'Arrow Along The Step', 'refraction' ) . ' (%)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 100 ] ],
			'default' => [ 'size' => 50 ],
			'description' => esc_html__( 'In a row, its height on the step (50: the middle); one under another, its place across the step.', 'refraction' ),
			'selectors' => [ $root => '--rf-cs-at: {{SIZE}}%;' ],
		] );

		$this->add_responsive_control( 'align', [
			'label' => esc_html__( 'Step Height', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'stretch',
			'options' => [
				'stretch' => esc_html__( 'All as tall as the tallest', 'refraction' ),
				'flex-start' => esc_html__( 'Their own height, at the top', 'refraction' ),
				'center' => esc_html__( 'Their own height, in the middle', 'refraction' ),
			],
			'selectors' => [ $root => 'align-items: {{VALUE}};' ],
		] );

		$this->end_controls_section();

		// ------------------------------------------------ Arrows
		$this->start_controls_section( 'section_arrows', [ 'label' => esc_html__( 'Arrows', 'refraction' ) ] );

		$this->add_control( 'line', [
			'label' => esc_html__( 'Line', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'dotted',
			'options' => [
				'dotted' => esc_html__( 'Dotted', 'refraction' ),
				'dashed' => esc_html__( 'Dashed', 'refraction' ),
				'solid' => esc_html__( 'Solid', 'refraction' ),
				'none' => esc_html__( 'None (the head only)', 'refraction' ),
			],
		] );
		$this->add_control( 'head', [
			'label' => esc_html__( 'Head', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'chevron',
			'options' => [
				'chevron' => esc_html__( 'Chevron', 'refraction' ),
				'triangle' => esc_html__( 'Triangle', 'refraction' ),
				'double' => esc_html__( 'Double chevron', 'refraction' ),
				'circle' => esc_html__( 'Arrow in a circle', 'refraction' ),
				'dot' => esc_html__( 'Dot', 'refraction' ),
				'icon' => esc_html__( 'An icon', 'refraction' ),
				'none' => esc_html__( 'None', 'refraction' ),
			],
		] );
		$this->add_control( 'head_icon', [
			'label' => esc_html__( 'Icon', 'refraction' ),
			'type' => Controls_Manager::ICONS,
			'default' => [ 'value' => 'fas fa-arrow-right', 'library' => 'fa-solid' ],
			'description' => esc_html__( 'Drawn pointing right; it turns down with the arrows.', 'refraction' ),
			'condition' => [ 'head' => 'icon' ],
		] );
		$this->add_control( 'motion', [
			'label' => esc_html__( 'Animation', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '',
			'options' => [
				'' => esc_html__( 'None', 'refraction' ),
				'flow' => esc_html__( 'The line flows towards the next step', 'refraction' ),
				'nudge' => esc_html__( 'The head nudges forward', 'refraction' ),
			],
			'description' => esc_html__( 'Not played for visitors who ask for less motion.', 'refraction' ),
			'separator' => 'before',
		] );
		$this->add_control( 'speed', [
			'label' => esc_html__( 'Duration', 'refraction' ) . ' (s)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0.2, 'max' => 6, 'step' => 0.1 ] ],
			'default' => [ 'size' => 1.2 ],
			'selectors' => [ $root => '--rf-cs-speed: {{SIZE}}s;' ],
			'condition' => [ 'motion!' => '' ],
		] );

		$this->end_controls_section();

		// ------------------------------------------------ Style > Arrows
		$this->start_controls_section( 'section_style_arrows', [ 'label' => esc_html__( 'Arrows', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );

		$this->add_control( 'color', [
			'label' => esc_html__( 'Color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'default' => '#1F2937',
			'selectors' => [ $root => '--rf-cs-color: {{VALUE}};' ],
		] );
		$this->add_responsive_control( 'thickness', [
			'label' => esc_html__( 'Line Thickness', 'refraction' ) . ' (px)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 1, 'max' => 12 ] ],
			'default' => [ 'size' => 3 ],
			'selectors' => [ $root => '--rf-cs-w: {{SIZE}}px;' ],
			'condition' => [ 'line!' => 'none' ],
		] );
		$this->add_responsive_control( 'head_size', [
			'label' => esc_html__( 'Head Size', 'refraction' ) . ' (px)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 6, 'max' => 64 ] ],
			'default' => [ 'size' => 14 ],
			'selectors' => [ $root => '--rf-cs-head: {{SIZE}}px;' ],
			'condition' => [ 'head!' => 'none' ],
		] );
		$this->add_responsive_control( 'inset', [
			'label' => esc_html__( 'Space From The Steps', 'refraction' ) . ' (px)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 60 ] ],
			'default' => [ 'size' => 8 ],
			'description' => esc_html__( 'Between the arrow\'s ends and the two steps.', 'refraction' ),
			'selectors' => [ $root => '--rf-cs-inset: {{SIZE}}px;' ],
		] );
		$this->add_control( 'circle_bg', [
			'label' => esc_html__( 'Circle Color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ $root => '--rf-cs-circle: {{VALUE}};' ],
			'condition' => [ 'head' => 'circle' ],
		] );
		$this->add_control( 'circle_icon', [
			'label' => esc_html__( 'Arrow In The Circle', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'default' => '#FFFFFF',
			'selectors' => [ $root => '--rf-cs-circle-icon: {{VALUE}};' ],
			'condition' => [ 'head' => 'circle' ],
		] );

		$this->end_controls_section();
	}

	// ---------------------------------------------------------------- output

	/** The head's drawing (pointing right). */
	private static function head_svg( string $head ): string {
		$paths = [
			'chevron' => '<path d="M5 2l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
			'triangle' => '<path d="M3 2l11 6-11 6z" fill="currentColor"/>',
			'double' => '<path d="M2 2l6 6-6 6M8 2l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
			'circle' => '<path d="M4 8h8M9 5l3 3-3 3" fill="none" stroke="var(--rf-cs-circle-icon, #fff)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
			'dot' => '<circle cx="8" cy="8" r="4.5" fill="currentColor"/>',
		];

		return isset( $paths[ $head ] ) ? '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">' . $paths[ $head ] . '</svg>' : '';
	}

	private function arrow_html( array $settings ): string {
		$head = (string) ( $settings['head'] ?? 'chevron' );
		$inside = '';

		if ( 'icon' === $head && ! empty( $settings['head_icon']['value'] ) ) {
			ob_start();
			Icons_Manager::render_icon( $settings['head_icon'], [ 'aria-hidden' => 'true' ] );
			$inside = (string) ob_get_clean();
		} elseif ( 'none' !== $head ) {
			$inside = self::head_svg( $head );
		}

		return '<span class="rf-cs__arrow" aria-hidden="true"><span class="rf-cs__line"></span>' . ( '' !== $inside ? '<span class="rf-cs__head">' . $inside . '</span>' : '' ) . '</span>';
	}

	/** The classes for the arrows' look, on the steps' box. */
	private static function look_classes( array $settings ): string {
		$line = in_array( $settings['line'] ?? '', [ 'dotted', 'dashed', 'solid', 'none' ], true ) ? $settings['line'] : 'dotted';
		$head = in_array( $settings['head'] ?? '', [ 'chevron', 'triangle', 'double', 'circle', 'dot', 'icon', 'none' ], true ) ? $settings['head'] : 'chevron';
		$motion = in_array( $settings['motion'] ?? '', [ 'flow', 'nudge' ], true ) ? ' rf-cs--' . $settings['motion'] : '';

		return 'rf-cs rf-cs--line-' . $line . ' rf-cs--head-' . $head . $motion;
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		$items = array_values( (array) ( $settings['items'] ?? [] ) );
		$children = $this->get_children();
		$last = count( $children ) - 1;
		$arrow = $this->arrow_html( $settings );
		?>
		<div class="<?php echo esc_attr( self::look_classes( $settings ) ); ?>">
			<?php foreach ( $children as $index => $child ) : ?>
				<div class="rf-cs__step refraction-repeater-item-<?php echo esc_attr( $items[ $index ]['_id'] ?? $index ); ?>">
					<?php $child->print_element(); ?>
					<?php echo $index < $last ? $arrow : ''; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Static SVG or icon markup. ?>
				</div>
			<?php endforeach; ?>
		</div>
		<?php
	}

	protected function content_template() {
		$heads = [];

		foreach ( [ 'chevron', 'triangle', 'double', 'circle', 'dot' ] as $head ) {
			$heads[ $head ] = self::head_svg( $head );
		}
		?>
		<#
		const items = settings.items || [];
		const heads = <?php echo wp_json_encode( $heads ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Static SVG. ?>;
		const line = [ 'dotted', 'dashed', 'solid', 'none' ].includes( settings.line ) ? settings.line : 'dotted';
		const head = [ 'chevron', 'triangle', 'double', 'circle', 'dot', 'icon', 'none' ].includes( settings.head ) ? settings.head : 'chevron';
		const motion = [ 'flow', 'nudge' ].includes( settings.motion ) ? ' rf-cs--' + settings.motion : '';
		let inside = heads[ head ] || '';
		if ( 'icon' === head && settings.head_icon && settings.head_icon.value ) {
			const icon = refraction.helpers.renderIcon( view, settings.head_icon, { 'aria-hidden': true }, 'i', 'object' );
			inside = icon && icon.rendered ? icon.value : '';
		}
		const arrow = '<span class="rf-cs__arrow" aria-hidden="true"><span class="rf-cs__line"></span>' + ( inside ? '<span class="rf-cs__head">' + inside + '</span>' : '' ) + '</span>';
		#>
		<div class="rf-cs rf-cs--line-{{ line }} rf-cs--head-{{ head }}{{ motion }}">
			<# _.each( items, ( item, index ) => { #>
				<div class="rf-cs__step refraction-repeater-item-{{ item._id }}">{{{ index < items.length - 1 ? arrow : '' }}}</div>
			<# } ); #>
		</div>
		<?php
	}
}
