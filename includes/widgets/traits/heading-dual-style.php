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
		$part = '{{WRAPPER}} .refraction-heading-dual';

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
	}
}
