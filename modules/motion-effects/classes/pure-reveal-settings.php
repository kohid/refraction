<?php
namespace Refraction\Modules\MotionEffects\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Turns the raw Reveal control values of an element into the small, clamped config `reveal.js` reads, and holds the
 * parallax presets of Scrolling Effects. No WordPress calls: tested standalone by scripts/test-motion.php.
 */
class Pure_Reveal_Settings {

	/** How a whole element, a text piece or a child comes in. */
	const EFFECTS = [ 'fade-up', 'fade-down', 'fade-left', 'fade-right', 'fade', 'zoom-in', 'zoom-out', 'blur', 'rise', 'wipe-up', 'wipe-down', 'wipe-left', 'wipe-right', 'dim' ];

	/** How text comes in: each piece slides up from behind its own mask, or uses the element effect. */
	const TEXT_SPLITS = [ 'lines', 'words', 'chars' ];

	const TRIGGERS = [ 'once', 'always', 'scroll' ];

	const EASINGS = [ 'smooth', 'soft', 'snappy', 'back', 'linear' ];

	/**
	 * Scrolling Effects presets: layers of an illustration that move at different speeds. Each sets the effects it
	 * names (start 0, end 100) and replaces any effect switched on by hand.
	 */
	const PRESETS = [
		'far' => [ 'ty' => [ 'up', 2 ] ],
		'mid' => [ 'ty' => [ 'up', 4 ] ],
		'near' => [ 'ty' => [ 'up', 7 ] ],
		'float' => [ 'ty' => [ 'up', 3 ], 'rotate' => [ 'right', 1 ] ],
		'drift-left' => [ 'ty' => [ 'up', 2 ], 'tx' => [ 'left', 3 ] ],
		'drift-right' => [ 'ty' => [ 'up', 2 ], 'tx' => [ 'right', 3 ] ],
		'depth' => [ 'ty' => [ 'up', 2 ], 'scale' => [ 'up', 2 ] ],
	];

	public static function uses_reveal( array $settings ): bool {
		return '' !== self::effect( $settings, 'rf_reveal' ) || in_array( $settings['rf_reveal_text'] ?? '', self::TEXT_SPLITS, true ) || '' !== self::effect( $settings, 'rf_reveal_children' );
	}

	private static function effect( array $settings, string $key ): string {
		$value = $settings[ $key ] ?? '';

		return is_string( $value ) && in_array( $value, self::EFFECTS, true ) ? $value : '';
	}

	/**
	 * @param string[] $valid_devices Device keys that exist on this site.
	 * @return array Empty when the element uses no reveal.
	 */
	public static function normalize( array $settings, array $valid_devices ): array {
		if ( ! self::uses_reveal( $settings ) ) {
			return [];
		}

		$text = in_array( $settings['rf_reveal_text'] ?? '', self::TEXT_SPLITS, true ) ? $settings['rf_reveal_text'] : '';
		$range = Pure_Motion_Settings::range( $settings, 'rf_reveal' );

		return array_filter( [
			'effect' => self::effect( $settings, 'rf_reveal' ),
			'text' => $text,
			'textEffect' => '' !== $text ? Pure_Motion_Settings::pick( $settings, 'rf_reveal_text_effect', array_merge( [ 'mask' ], self::EFFECTS ) ) : '',
			'children' => self::effect( $settings, 'rf_reveal_children' ),
			'trigger' => Pure_Motion_Settings::pick( $settings, 'rf_reveal_trigger', self::TRIGGERS ),
			'duration' => (int) Pure_Motion_Settings::number( $settings, 'rf_reveal_duration', 700, 100, 4000 ),
			'delay' => (int) Pure_Motion_Settings::number( $settings, 'rf_reveal_delay', 0, 0, 4000 ),
			'stagger' => (int) Pure_Motion_Settings::number( $settings, 'rf_reveal_stagger', 80, 0, 1000 ),
			'distance' => (int) Pure_Motion_Settings::number( $settings, 'rf_reveal_distance', 40, 0, 300 ),
			'easing' => Pure_Motion_Settings::pick( $settings, 'rf_reveal_easing', self::EASINGS ),
			'offset' => (int) Pure_Motion_Settings::number( $settings, 'rf_reveal_offset', 10, 0, 50 ),
			'start' => $range[0],
			'end' => $range[1],
			'devices' => Pure_Motion_Settings::devices( $settings, 'rf_reveal_devices', $valid_devices, $valid_devices ),
		], static function ( $value ) {
			return '' !== $value;
		} );
	}

	/** The settings with a chosen parallax preset applied (its effects on, the hand-made ones off). */
	public static function with_preset( array $settings ): array {
		$preset = $settings['rf_scroll_preset'] ?? '';

		if ( ! is_string( $preset ) || ! isset( self::PRESETS[ $preset ] ) ) {
			return $settings;
		}

		foreach ( array_keys( Pure_Motion_Settings::SCROLL ) as $key ) {
			$settings[ "rf_scroll_{$key}" ] = '';
		}

		foreach ( self::PRESETS[ $preset ] as $key => list( $dir, $amount ) ) {
			$amount_key = Pure_Motion_Settings::SCROLL[ $key ][1];
			$settings[ "rf_scroll_{$key}" ] = 'yes';
			$settings[ "rf_scroll_{$key}_dir" ] = $dir;
			$settings[ "rf_scroll_{$key}_{$amount_key}" ] = $amount;
			$settings[ "rf_scroll_{$key}_start" ] = 0;
			$settings[ "rf_scroll_{$key}_end" ] = 100;
		}

		return $settings;
	}
}
