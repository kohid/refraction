<?php
namespace Refraction\Includes\Widgets\Traits;

use Refraction\Controls_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * The same settings for every icon in a box (a step badge, a button icon, a pill's badge, a title's icon): Icon Size,
 * Padding (the box then fits the icon), Corners, and optionally Icon Color and Background. Ids are {$id}_size,
 * {$id}_padding, {$id}_radius, {$id}_color, {$id}_bg.
 */
class Icon_Box_Style {

	/**
	 * @param \Refraction\Controls_Stack|\Refraction\Repeater $stack Where the controls go.
	 * @param string $id    Id prefix.
	 * @param string $box   Selector of the icon's box.
	 * @param array  $opt   size and colors (bool, default true), condition / conditions (array), heading (label).
	 */
	public static function controls( $stack, string $id, string $box, array $opt = [] ): void {
		$show = array_intersect_key( $opt, [ 'condition' => 1, 'conditions' => 1 ] );
		$icon = $box . ' svg, ' . $box . ' i, ' . $box . ' img';

		if ( ! empty( $opt['heading'] ) ) {
			$stack->add_control( $id . '_heading', [ 'label' => $opt['heading'], 'type' => Controls_Manager::HEADING, 'separator' => 'before' ] + $show );
		}

		if ( $opt['size'] ?? true ) {
			$stack->add_responsive_control( $id . '_size', [
			'label' => esc_html__( 'Icon Size', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px', 'em' ],
			'range' => [ 'px' => [ 'min' => 6, 'max' => 80 ], 'em' => [ 'min' => 0.3, 'max' => 4, 'step' => 0.05 ] ],
			'selectors' => [ $icon => 'width: {{SIZE}}{{UNIT}}; height: {{SIZE}}{{UNIT}}; font-size: {{SIZE}}{{UNIT}};' ],
			] + $show );
		}

		$stack->add_responsive_control( $id . '_padding', [
			'label' => esc_html__( 'Icon Padding', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px', 'em' ],
			'range' => [ 'px' => [ 'max' => 40 ], 'em' => [ 'max' => 2, 'step' => 0.05 ] ],
			'description' => esc_html__( 'Room around the icon; the box then fits the icon.', 'refraction' ),
			'selectors' => [ $box => 'padding: {{SIZE}}{{UNIT}}; width: auto; height: auto; min-width: 0; box-sizing: content-box;' ],
		] + $show );

		$stack->add_responsive_control( $id . '_radius', [
			'label' => esc_html__( 'Icon Corners', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px', '%' ],
			'range' => [ 'px' => [ 'max' => 40 ], '%' => [ 'max' => 50 ] ],
			'selectors' => [ $box => 'border-radius: {{SIZE}}{{UNIT}};' ],
		] + $show );

		if ( $opt['colors'] ?? true ) {
			$stack->add_control( $id . '_color', [ 'label' => esc_html__( 'Icon Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $box => 'color: {{VALUE}}; fill: {{VALUE}};' ] ] + $show );
			$stack->add_control( $id . '_bg', [ 'label' => esc_html__( 'Icon Background', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $box => 'background-color: {{VALUE}};' ] ] + $show );
		}
	}
}
