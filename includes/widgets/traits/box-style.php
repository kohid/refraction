<?php
namespace Refraction\Includes\Widgets\Traits;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Background;
use Refraction\Group_Control_Border;
use Refraction\Group_Control_Box_Shadow;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * A box's look (0.89.0): Normal / Hover tabs with background, border, rounded corners and shadow, then padding and
 * whether the content is cut to the corners. Used by the Image Box (its card) and Timed Slides (the slider).
 */
class Box_Style {

	/**
	 * Adds the controls inside the current section.
	 *
	 * @param \Refraction\Controls_Stack $el       The widget.
	 * @param string                    $prefix   Prefix of the setting ids (`ib_box`, `ts_box`).
	 * @param string                    $selector The box (`{{WRAPPER}} .refraction-image-box-wrapper`).
	 * @param array                     $options  `background` (bool, default true), `padding` (bool, default true),
	 *                                            `clip` (bool: show the "cut the content to the corners" switch,
	 *                                            default true; false when the box already hides what overflows).
	 */
	public static function controls( $el, string $prefix, string $selector, array $options = [] ): void {
		$options += [ 'background' => true, 'padding' => true, 'clip' => true ];

		$el->add_control( $prefix . '_heading', [
			'label' => esc_html__( 'Box', 'refraction' ),
			'type' => Controls_Manager::HEADING,
			'separator' => 'before',
			'classes' => 'rf-panel-category',
		] );

		$el->start_controls_tabs( $prefix . '_tabs' );

		foreach ( [ 'normal' => esc_html__( 'Normal', 'refraction' ), 'hover' => esc_html__( 'Hover', 'refraction' ) ] as $state => $label ) {
			$id = $prefix . ( 'hover' === $state ? '_hover' : '' );
			$sel = $selector . ( 'hover' === $state ? ':hover' : '' );

			$el->start_controls_tab( $prefix . '_tab_' . $state, [ 'label' => $label ] );

			if ( $options['background'] ) {
				$el->add_group_control( Group_Control_Background::get_type(), [
					'name' => $id . '_bg',
					'types' => [ 'classic', 'gradient' ],
					'exclude' => [ 'image' ],
					'selector' => $sel,
				] );
			}

			if ( 'hover' === $state ) {
				// The Normal border, recolored: no need to choose its type again.
				$el->add_control( $id . '_border_color', [
					'label' => esc_html__( 'Border Color', 'refraction' ),
					'type' => Controls_Manager::COLOR,
					'selectors' => [ $sel => 'border-color: {{VALUE}};' ],
				] );
			} else {
				$el->add_group_control( Group_Control_Border::get_type(), [
					'name' => $id . '_border',
					'selector' => $sel,
				] );
			}

			$el->add_responsive_control( $id . '_radius', [
				'label' => esc_html__( 'Rounded Corners', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%', 'em', 'rem' ],
				'selectors' => [ $sel => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
			] );

			$el->add_group_control( Group_Control_Box_Shadow::get_type(), [
				'name' => $id . '_shadow',
				'selector' => $sel,
			] );

			if ( 'hover' === $state ) {
				$el->add_control( $prefix . '_transition', [
					'label' => esc_html__( 'Change Duration', 'refraction' ) . ' (ms)',
					'type' => Controls_Manager::SLIDER,
					'range' => [ 'px' => [ 'min' => 0, 'max' => 1500, 'step' => 50 ] ],
					'default' => [ 'size' => 300, 'unit' => 'px' ],
					'selectors' => [ $selector => 'transition: background-color {{SIZE}}ms, border-color {{SIZE}}ms, border-radius {{SIZE}}ms, box-shadow {{SIZE}}ms;' ],
				] );
			}

			$el->end_controls_tab();
		}

		$el->end_controls_tabs();

		if ( $options['padding'] ) {
			$el->add_responsive_control( $prefix . '_padding', [
				'label' => esc_html__( 'Padding', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%', 'em', 'rem' ],
				'selectors' => [ $selector => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
				'separator' => 'before',
			] );
		}

		if ( $options['clip'] ) {
			$el->add_control( $prefix . '_clip', [
				'label' => esc_html__( 'Cut The Content To The Corners', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => 'yes',
				'description' => esc_html__( 'The image follows the rounded corners. Turn off if a tooltip or a shadow inside must reach outside the box.', 'refraction' ),
				'selectors' => [ $selector => 'overflow: hidden;' ],
				// Only once a corner is rounded: other boxes keep showing what reaches outside them (tooltips).
				'conditions' => [
					'relation' => 'or',
					'terms' => array_map( fn( $side ) => [ 'name' => $prefix . '_radius[' . $side . ']', 'operator' => '!==', 'value' => '' ], [ 'top', 'right', 'bottom', 'left' ] ),
				],
			] );
		}
	}
}
