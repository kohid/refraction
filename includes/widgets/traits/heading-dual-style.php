<?php
namespace Refraction\Includes\Widgets\Traits;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Typography;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * The Style section of a highlighted part (.refraction-heading-dual), shared by the Heading's Dual Heading
 * (Heading_Dual_Trait) and Highlight Words (modules/highlight-words) on other widgets.
 */
class Heading_Dual_Style {

	/**
	 * The style of a highlighted part (.refraction-heading-dual): text fill (color or gradient), typography, the mark
	 * behind it and its drawing. Shared with Highlight Words, which adds it to other widgets.
	 *
	 * @param \Refraction\Controls_Stack $el         The widget.
	 * @param array                     $show       The section's condition or conditions.
	 * @param string                    $section_id The section id.
	 */
	public static function controls( $el, array $show, string $section_id = 'section_rf_dual_style' ): void {
		// Only this widget's own highlighted parts: a widget that holds other widgets (Timed Slides, carousels) would
		// otherwise style the highlighted words of every heading inside it over their own settings.
		$part = '{{WRAPPER}} .refraction-heading-dual:not({{WRAPPER}} .refraction-element *)';

		$el->start_controls_section(
			$section_id,
			[
				'label' => esc_html__( 'Highlighted Text', 'refraction' ),
				'tab' => Controls_Manager::TAB_STYLE,
			] + $show
		);

		$el->add_control(
			'rf_dual_fill',
			[
				'label' => esc_html__( 'Text Fill', 'refraction' ),
				'type' => Controls_Manager::CHOOSE,
				'options' => [
					'color' => [
						'title' => esc_html__( 'Color', 'refraction' ),
						'icon' => 'rficon-paint-brush',
					],
					'gradient' => [
						'title' => esc_html__( 'Gradient', 'refraction' ),
						'icon' => 'rficon-barcode',
					],
				],
				'default' => 'color',
				'toggle' => false,
				'prefix_class' => 'refraction-dual-fill-',
			]
		);

		$el->add_control(
			'rf_dual_color',
			[
				'label' => esc_html__( 'Text Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ $part => 'color: {{VALUE}};' ],
				'condition' => [ 'rf_dual_fill' => 'color' ],
			]
		);

		$el->add_control(
			'rf_dual_grad_a',
			[
				'label' => esc_html__( 'Gradient Start', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'default' => '#0F766E',
				'selectors' => [ $part => '--rf-dual-ga: {{VALUE}};' ],
				'condition' => [ 'rf_dual_fill' => 'gradient' ],
			]
		);

		$el->add_control(
			'rf_dual_grad_b',
			[
				'label' => esc_html__( 'Gradient End', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'default' => '#84CC16',
				'selectors' => [ $part => '--rf-dual-gb: {{VALUE}};' ],
				'condition' => [ 'rf_dual_fill' => 'gradient' ],
			]
		);

		$el->add_control(
			'rf_dual_grad_angle',
			[
				'label' => esc_html__( 'Gradient Angle', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'deg' ],
				'range' => [ 'deg' => [ 'min' => 0, 'max' => 360 ] ],
				'selectors' => [ $part => '--rf-dual-gangle: {{SIZE}}deg;' ],
				'condition' => [ 'rf_dual_fill' => 'gradient' ],
			]
		);

		$el->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'rf_dual_typography',
				'selector' => $part,
			]
		);

		$el->add_control(
			'rf_dual_mark',
			[
				'label' => esc_html__( 'Mark Behind', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => [
					'' => esc_html__( 'None', 'refraction' ),
					'round' => esc_html__( 'Rounded highlighter', 'refraction' ),
					'marker' => esc_html__( 'Highlighter', 'refraction' ),
					'underline' => esc_html__( 'Underline', 'refraction' ),
					'block' => esc_html__( 'Background', 'refraction' ),
				],
				'default' => 'round',
				'prefix_class' => 'refraction-dual-mark-',
				'separator' => 'before',
				'description' => esc_html__( 'With a gradient text fill, only the text is drawn: the mark is left out.', 'refraction' ),
			]
		);

		$marked = [ 'rf_dual_mark!' => '' ];

		$el->add_control(
			'rf_dual_mark_color',
			[
				'label' => esc_html__( 'Mark Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'default' => '#D4F25A',
				'selectors' => [ $part => '--rf-dual-mc: {{VALUE}};' ],
				'condition' => $marked,
			]
		);

		$el->add_responsive_control(
			'rf_dual_mark_height',
			[
				'label' => esc_html__( 'Mark Thickness', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'em', 'px' ],
				'range' => [
					'em' => [ 'min' => 0.02, 'max' => 1.2, 'step' => 0.01 ],
					'px' => [ 'min' => 1, 'max' => 80 ],
				],
				'selectors' => [ $part => '--rf-dual-mh: {{SIZE}}{{UNIT}};' ],
				'condition' => [ 'rf_dual_mark' => [ 'round', 'marker', 'underline' ] ],
			]
		);

		$el->add_responsive_control(
			'rf_dual_mark_offset',
			[
				'label' => esc_html__( 'Distance From The Bottom', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'em', 'px' ],
				'range' => [
					'em' => [ 'min' => -0.5, 'max' => 1, 'step' => 0.01 ],
					'px' => [ 'min' => -20, 'max' => 60 ],
				],
				'selectors' => [ $part => '--rf-dual-mo: {{SIZE}}{{UNIT}};' ],
				'condition' => [ 'rf_dual_mark' => [ 'round', 'marker', 'underline' ] ],
			]
		);

		$el->add_responsive_control(
			'rf_dual_mark_extend',
			[
				'label' => esc_html__( 'Reach Past The Words', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'em', 'px' ],
				'range' => [
					'em' => [ 'min' => 0, 'max' => 0.6, 'step' => 0.01 ],
					'px' => [ 'min' => 0, 'max' => 40 ],
				],
				'selectors' => [ $part => '--rf-dual-mx: {{SIZE}}{{UNIT}};' ],
				'condition' => $marked,
			]
		);

		$el->add_responsive_control(
			'rf_dual_mark_radius',
			[
				'label' => esc_html__( 'Corner Radius', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'em', 'px' ],
				'range' => [
					'em' => [ 'min' => 0, 'max' => 1, 'step' => 0.01 ],
					'px' => [ 'min' => 0, 'max' => 40 ],
				],
				'selectors' => [ $part => '--rf-dual-mr: {{SIZE}}{{UNIT}};' ],
				'condition' => [ 'rf_dual_mark' => 'block' ],
			]
		);

		$el->add_control(
			'rf_dual_draw',
			[
				'label' => esc_html__( 'Draw When Scrolled Into View', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'prefix_class' => 'refraction-dual-draw-',
				'render_type' => 'template',
				'condition' => $marked,
			]
		);

		$el->add_control(
			'rf_dual_draw_repeat',
			[
				'label' => esc_html__( 'Draw Every Time It Comes Into View', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'description' => esc_html__( 'Off: drawn once. On: drawn again each time the heading comes back into view (it resets once it has left the screen).', 'refraction' ),
				'prefix_class' => 'refraction-dual-redraw-',
				'render_type' => 'template',
				'condition' => array_merge( $marked, [ 'rf_dual_draw' => 'yes' ] ),
			]
		);

		$el->add_control(
			'rf_dual_draw_duration',
			[
				'label' => esc_html__( 'Drawing Time (ms)', 'refraction' ),
				'type' => Controls_Manager::NUMBER,
				'min' => 100,
				'max' => 4000,
				'step' => 50,
				'placeholder' => '800',
				'selectors' => [ $part => '--rf-dual-dur: {{VALUE}}ms;' ],
				'condition' => array_merge( $marked, [ 'rf_dual_draw' => 'yes' ] ),
			]
		);

		$el->add_control(
			'rf_dual_draw_delay',
			[
				'label' => esc_html__( 'Delay (ms)', 'refraction' ),
				'type' => Controls_Manager::NUMBER,
				'min' => 0,
				'max' => 4000,
				'step' => 50,
				'placeholder' => '150',
				'selectors' => [ $part => '--rf-dual-delay: {{VALUE}}ms;' ],
				'condition' => array_merge( $marked, [ 'rf_dual_draw' => 'yes' ] ),
			]
		);

		$el->end_controls_section();

		self::apply_section_condition( $el, $section_id, $show );
	}

	/**
	 * One part's own Highlighted Text section (0.102.0), for widgets made of parts (Phone Showcase): shown once that
	 * part has words to highlight. "Same as all highlighted text" keeps the shared section's look; "Its own style"
	 * gives the part its own text fill, typography, mark and colors. Drawing on scroll stays the shared section's
	 * (switched on there), with its own time and delay here.
	 *
	 * @param \Refraction\Controls_Stack $el    The widget.
	 * @param string                    $key   The part's key (rf_hl_part_<key> holds its words).
	 * @param string                    $label The part's name.
	 * @param string                    $class The class of the part's element.
	 */
	public static function part_controls( $el, string $key, string $label, string $class ): void {
		$p = 'rf_hl_' . $key . '_';
		$sel = '{{WRAPPER}} .' . $class . ' .refraction-heading-dual:not({{WRAPPER}} .refraction-element *)';
		$words = [ 'rf_hl_part_' . $key . '!' => '' ];
		$own = $words + [ $p . 'style' => 'own' ];
		$colored = $own + [ $p . 'fill' => 'color' ];
		$marked = $colored + [ $p . 'mark!' => 'none' ];

		$el->start_controls_section( 'section_rf_hl_style_' . $key, [
			/* translators: %s: Part of the widget, like Heading or Step Titles. */
			'label' => sprintf( esc_html__( 'Highlighted Text: %s', 'refraction' ), $label ),
			'tab' => Controls_Manager::TAB_STYLE,
			'condition' => $words,
		] );

		$el->add_control( $p . 'style', [
			'label' => esc_html__( 'Style', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '',
			'options' => [
				'' => esc_html__( 'Same as all highlighted text', 'refraction' ),
				'own' => esc_html__( 'Its own style', 'refraction' ),
			],
			'condition' => $words,
		] );

		// The fill first, the mark after it: the mark's background shorthand then replaces what the fill left.
		$el->add_control( $p . 'fill', [
			'label' => esc_html__( 'Text Fill', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'options' => [
				'color' => [ 'title' => esc_html__( 'Color', 'refraction' ), 'icon' => 'rficon-paint-brush' ],
				'gradient' => [ 'title' => esc_html__( 'Gradient', 'refraction' ), 'icon' => 'rficon-barcode' ],
			],
			'default' => 'color',
			'toggle' => false,
			'selectors_dictionary' => [
				'color' => '-webkit-text-fill-color: currentColor; -webkit-background-clip: border-box; background-clip: border-box; background-image: none;',
				'gradient' => 'background: linear-gradient(var(--rf-dual-gangle, 90deg), var(--rf-dual-ga, #0f766e), var(--rf-dual-gb, #84cc16)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent; padding: 0;',
			],
			'selectors' => [ $sel => '{{VALUE}}' ],
			'condition' => $own,
		] );
		$el->add_control( $p . 'color', [ 'label' => esc_html__( 'Text Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $sel => 'color: {{VALUE}};' ], 'condition' => $colored ] );
		$el->add_control( $p . 'ga', [ 'label' => esc_html__( 'Gradient Start', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $sel => '--rf-dual-ga: {{VALUE}};' ], 'condition' => $own + [ $p . 'fill' => 'gradient' ] ] );
		$el->add_control( $p . 'gb', [ 'label' => esc_html__( 'Gradient End', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $sel => '--rf-dual-gb: {{VALUE}};' ], 'condition' => $own + [ $p . 'fill' => 'gradient' ] ] );
		$el->add_control( $p . 'gangle', [ 'label' => esc_html__( 'Gradient Angle', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'size_units' => [ 'deg' ], 'range' => [ 'deg' => [ 'min' => 0, 'max' => 360 ] ], 'selectors' => [ $sel => '--rf-dual-gangle: {{SIZE}}deg;' ], 'condition' => $own + [ $p . 'fill' => 'gradient' ] ] );
		$el->add_group_control( Group_Control_Typography::get_type(), [ 'name' => $p . 'typography', 'selector' => $sel, 'condition' => $own ] );

		// The marks of _heading-dual.scss, written for this part only. The round end closes once the drawing is
		// nearly done (--rf-dual-p near 1), as the shared rule's --rf-dual-rc does.
		$band = 'linear-gradient(90deg, var(--rf-dual-c) calc(var(--rf-dual-p) * 100%), transparent 0)';
		$cap = 'color-mix(in srgb, var(--rf-dual-c) clamp(0%, calc((var(--rf-dual-p) - 0.94) * 1667%), 100%), transparent)';
		$el->add_control( $p . 'mark', [
			'label' => esc_html__( 'Mark Behind', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'options' => [
				'none' => esc_html__( 'None', 'refraction' ),
				'round' => esc_html__( 'Rounded highlighter', 'refraction' ),
				'marker' => esc_html__( 'Highlighter', 'refraction' ),
				'underline' => esc_html__( 'Underline', 'refraction' ),
				'block' => esc_html__( 'Background', 'refraction' ),
			],
			'default' => 'round',
			'separator' => 'before',
			'selectors_dictionary' => [
				'none' => 'background: none; padding: 0;',
				'round' => '--rf-dual-h: var(--rf-dual-mh, 0.46em); padding: 0 var(--rf-dual-mx, 0.1em); border-radius: 0; background: radial-gradient(circle closest-side, var(--rf-dual-c) 97%, transparent) left 0 bottom var(--rf-dual-mo, 0.1em) / var(--rf-dual-h) var(--rf-dual-h) no-repeat, radial-gradient(circle closest-side, ' . $cap . ' 97%, transparent) right 0 bottom var(--rf-dual-mo, 0.1em) / var(--rf-dual-h) var(--rf-dual-h) no-repeat, ' . $band . ' left calc(var(--rf-dual-h) / 2) bottom var(--rf-dual-mo, 0.1em) / calc(100% - var(--rf-dual-h)) var(--rf-dual-h) no-repeat;',
				'marker' => 'padding: 0 var(--rf-dual-mx, 0.06em); border-radius: 0; background: ' . $band . ' left 0 bottom var(--rf-dual-mo, 0.1em) / 100% var(--rf-dual-mh, 0.46em) no-repeat;',
				'underline' => 'padding: 0 var(--rf-dual-mx, 0); border-radius: 0; background: ' . $band . ' left 0 bottom var(--rf-dual-mo, 0) / 100% var(--rf-dual-mh, 0.08em) no-repeat;',
				'block' => 'padding: 0.02em var(--rf-dual-mx, 0.18em); border-radius: var(--rf-dual-mr, 0.2em); background: ' . $band . ';',
			],
			'selectors' => [ $sel => '{{VALUE}}' ],
			'condition' => $colored,
		] );
		$el->add_control( $p . 'mark_color', [ 'label' => esc_html__( 'Mark Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $sel => '--rf-dual-mc: {{VALUE}};' ], 'condition' => $marked ] );
		foreach ( [
			'mark_height' => [ esc_html__( 'Mark Thickness', 'refraction' ), '--rf-dual-mh', 2 ],
			'mark_offset' => [ esc_html__( 'Distance From The Bottom', 'refraction' ), '--rf-dual-mo', 1 ],
			'mark_reach' => [ esc_html__( 'Reach Past The Words', 'refraction' ), '--rf-dual-mx', 1 ],
		] as $name => [ $title, $var, $max ] ) {
			$el->add_responsive_control( $p . $name, [
				'label' => $title,
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'em', 'px' ],
				'range' => [ 'em' => [ 'min' => 0, 'max' => $max, 'step' => 0.01 ], 'px' => [ 'min' => 0, 'max' => 60 ] ],
				'selectors' => [ $sel => $var . ': {{SIZE}}{{UNIT}};' ],
				'condition' => $marked,
			] );
		}
		$el->add_responsive_control( $p . 'mark_radius', [ 'label' => esc_html__( 'Mark Corners', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'size_units' => [ 'em', 'px' ], 'range' => [ 'em' => [ 'max' => 1, 'step' => 0.01 ], 'px' => [ 'max' => 30 ] ], 'selectors' => [ $sel => '--rf-dual-mr: {{SIZE}}{{UNIT}};' ], 'condition' => $colored + [ $p . 'mark' => 'block' ] ] );
		$el->add_control( $p . 'draw_duration', [ 'label' => esc_html__( 'Drawing Time (ms)', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'min' => 100, 'max' => 4000, 'step' => 50, 'placeholder' => '800', 'selectors' => [ $sel => '--rf-dual-dur: {{VALUE}}ms;' ], 'description' => esc_html__( 'Used when Draw When Scrolled Into View is on in Highlighted Text (All Parts).', 'refraction' ), 'condition' => $marked, 'separator' => 'before' ] );
		$el->add_control( $p . 'draw_delay', [ 'label' => esc_html__( 'Drawing Delay (ms)', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'min' => 0, 'max' => 4000, 'step' => 50, 'placeholder' => '150', 'selectors' => [ $sel => '--rf-dual-delay: {{VALUE}}ms;' ], 'condition' => $marked ] );

		$el->end_controls_section();
	}

	/**
	 * The section's condition (highlighted words typed, or the Dual Heading on) on each of its settings too: a section
	 * condition only hides the settings in the panel, so their defaults (the mark, its color) were still printed and
	 * their classes still put on the widget when it highlighted nothing. A widget holding other widgets then gave them
	 * its marks and colors.
	 *
	 * @param \Refraction\Controls_Stack $el         The widget.
	 * @param string                    $section_id The section id.
	 * @param array                     $show       The section's condition or conditions.
	 */
	private static function apply_section_condition( $el, string $section_id, array $show ): void {
		foreach ( $el->get_controls() as $id => $control ) {
			if ( ( $control['section'] ?? '' ) !== $section_id || 'section' === ( $control['type'] ?? '' ) ) {
				continue;
			}

			$args = [];

			if ( ! empty( $show['condition'] ) ) {
				$args['condition'] = array_merge( (array) ( $control['condition'] ?? [] ), $show['condition'] );
			}

			if ( ! empty( $show['conditions'] ) ) {
				$args['conditions'] = empty( $control['conditions'] )
					? $show['conditions']
					: [
						'relation' => 'and',
						'terms' => [ $show['conditions'], $control['conditions'] ],
					];
			}

			if ( $args ) {
				$el->update_control( $id, $args );
			}
		}
	}
}
