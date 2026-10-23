<?php
namespace Refraction\Modules\MotionEffects\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Turns the raw Motion Effects control values of an element into the small, clamped config the front end reads.
 * No WordPress calls: tested standalone by scripts/test-motion.php.
 */
class Pure_Motion_Settings {

	/** Effect key => [ allowed directions (first is the default), amount key, amount default, amount max ]. */
	const SCROLL = [
		'ty' => [ [ 'up', 'down' ], 'speed', 4, 10 ],
		'tx' => [ [ 'left', 'right' ], 'speed', 4, 10 ],
		'fade' => [ [ 'in', 'out', 'in-out', 'out-in' ], 'level', 5, 10 ],
		'blur' => [ [ 'in', 'out', 'in-out', 'out-in' ], 'level', 5, 20 ],
		'rotate' => [ [ 'left', 'right' ], 'speed', 4, 10 ],
		'scale' => [ [ 'up', 'down' ], 'speed', 4, 10 ],
	];

	public static function uses_motion( array $settings ): bool {
		foreach ( array_keys( self::SCROLL ) as $key ) {
			if ( self::on( $settings, "rf_scroll_{$key}" ) ) {
				return true;
			}
		}

		return self::on( $settings, 'rf_mouse_track' ) || self::on( $settings, 'rf_mouse_tilt' );
	}

	/**
	 * @param string[] $valid_devices Device keys that exist on this site (desktop, tablet, mobile, ...).
	 */
	public static function normalize( array $settings, array $valid_devices ): array {
		$config = [];
		$effects = [];

		foreach ( self::SCROLL as $key => $def ) {
			if ( ! self::on( $settings, "rf_scroll_{$key}" ) ) {
				continue;
			}

			list( $dirs, $amount_key, $amount_default, $amount_max ) = $def;

			$range = self::range( $settings, "rf_scroll_{$key}" );

			$effects[ $key ] = [
				'dir' => self::pick( $settings, "rf_scroll_{$key}_dir", $dirs ),
				$amount_key => self::number( $settings, "rf_scroll_{$key}_{$amount_key}", $amount_default, 0, $amount_max ),
				'start' => $range[0],
				'end' => $range[1],
			];
		}

		if ( $effects ) {
			$relative = self::pick( $settings, 'rf_scroll_relative', [ 'viewport', 'page' ] );

			$config['scroll'] = [
				'devices' => self::devices( $settings, 'rf_scroll_devices', $valid_devices, $valid_devices ),
				'relative' => $relative,
				'effects' => $effects,
			];
		}

		$mouse = [];

		if ( self::on( $settings, 'rf_mouse_track' ) ) {
			$mouse['track'] = [
				'dir' => self::pick( $settings, 'rf_mouse_track_dir', [ 'opposite', 'direct' ] ),
				'speed' => self::number( $settings, 'rf_mouse_track_speed', 1, 0, 10 ),
			];
		}

		if ( self::on( $settings, 'rf_mouse_tilt' ) ) {
			$mouse['tilt'] = [
				'intensity' => self::number( $settings, 'rf_mouse_tilt_intensity', 4, 0, 10 ),
				'keep' => self::on( $settings, 'rf_mouse_tilt_keep' ),
			];
		}

		if ( $mouse ) {
			$mouse['devices'] = self::devices( $settings, 'rf_mouse_devices', $valid_devices, array_values( array_intersect( [ 'desktop' ], $valid_devices ) ) );
			$config['mouse'] = $mouse;
		}

		return $config;
	}

	public static function on( array $settings, string $key ): bool {
		return isset( $settings[ $key ] ) && 'yes' === $settings[ $key ];
	}

	public static function pick( array $settings, string $key, array $allowed ): string {
		$value = isset( $settings[ $key ] ) && is_string( $settings[ $key ] ) ? $settings[ $key ] : '';

		return in_array( $value, $allowed, true ) ? $value : $allowed[0];
	}

	/** @return int|float */
	public static function number( array $settings, string $key, $default, $min, $max ) {
		$raw = $settings[ $key ] ?? '';

		if ( is_array( $raw ) ) { // Slider-shaped value.
			$raw = $raw['size'] ?? '';
		}

		$value = is_numeric( $raw ) ? (float) $raw : (float) $default;

		return (float) max( $min, min( $max, $value ) );
	}

	/** @return int[] [ start, end ] percent, ordered. */
	public static function range( array $settings, string $prefix ): array {
		$start = (int) round( self::number( $settings, "{$prefix}_start", 0, 0, 100 ) );
		$end = (int) round( self::number( $settings, "{$prefix}_end", 100, 0, 100 ) );

		if ( $start > $end ) {
			list( $start, $end ) = [ $end, $start ];
		}

		return [ $start, $end ];
	}

	/** @return string[] */
	public static function devices( array $settings, string $key, array $valid, array $default ): array {
		if ( empty( $settings[ $key ] ) || ! is_array( $settings[ $key ] ) ) {
			return array_values( $default );
		}

		return array_values( array_intersect( $valid, array_map( 'strval', $settings[ $key ] ) ) );
	}
}
