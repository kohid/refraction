<?php
namespace Refraction\Modules\MotionEffects\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Sticky control values to the config sticky.js reads. No WordPress calls.
 */
class Pure_Sticky_Settings {

	public static function uses_sticky( array $settings ): bool {
		return isset( $settings['rf_sticky'] ) && in_array( $settings['rf_sticky'], [ 'top', 'bottom' ], true );
	}

	public static function normalize( array $settings, array $valid_devices ): array {
		if ( ! self::uses_sticky( $settings ) ) {
			return [];
		}

		return [
			'side' => $settings['rf_sticky'],
			'devices' => Pure_Motion_Settings::devices( $settings, 'rf_sticky_on', $valid_devices, $valid_devices ),
			'offset' => (int) Pure_Motion_Settings::number( $settings, 'rf_sticky_offset', 0, 0, 1000 ),
			'effectsOffset' => (int) Pure_Motion_Settings::number( $settings, 'rf_sticky_effects_offset', 0, 0, 5000 ),
			'inParent' => Pure_Motion_Settings::on( $settings, 'rf_sticky_parent' ),
		];
	}
}
