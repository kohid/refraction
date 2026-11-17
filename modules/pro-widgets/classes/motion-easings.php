<?php
namespace Refraction\Modules\ProWidgets\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * The easings Focus Stack and Showcase Wheel offer (0.116.0). Their curves are in
 * assets/dev/js/frontend/utils/motion-easings.js, by the same names.
 */
class Motion_Easings {

	public static function options(): array {
		return [
			'smooth' => esc_html__( 'Smooth', 'refraction' ),
			'snappy' => esc_html__( 'Snappy', 'refraction' ),
			'gentle' => esc_html__( 'Gentle', 'refraction' ),
			'soft' => esc_html__( 'Soft (eases in and out a little)', 'refraction' ),
			'glide' => esc_html__( 'Glide (fast start, long settle)', 'refraction' ),
			'speed-up' => esc_html__( 'Speed up (slow start, fast end)', 'refraction' ),
			'sharp' => esc_html__( 'Sharp (slow ends, quick middle)', 'refraction' ),
			'spring' => esc_html__( 'Springy (goes past and settles)', 'refraction' ),
			'anticipate' => esc_html__( 'Anticipate (pulls back first, goes past)', 'refraction' ),
			'bounce' => esc_html__( 'Bounce at the end', 'refraction' ),
			'elastic' => esc_html__( 'Elastic (wobbles into place)', 'refraction' ),
			'linear' => esc_html__( 'Even', 'refraction' ),
		];
	}

	/** A saved name, or Smooth. */
	public static function clean( $name ): string {
		$name = (string) $name;

		return array_key_exists( $name, self::options() ) ? $name : 'smooth';
	}
}
