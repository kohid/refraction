<?php
namespace Refraction\Modules\OffCanvas\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Pure option logic of the Off-Canvas widget (no WordPress needed).
 */
class Off_Canvas_Logic {

	const POSITIONS = [ 'left', 'right', 'top', 'bottom', 'center' ];
	const MODES = [ 'overlay', 'push' ];
	const HASH_PREFIX = '#refraction-offcanvas:';

	public static function sanitize( array $settings ): array {
		$position = isset( $settings['position'] ) && in_array( $settings['position'], self::POSITIONS, true ) ? $settings['position'] : 'left';
		$mode = isset( $settings['mode'] ) && in_array( $settings['mode'], self::MODES, true ) ? $settings['mode'] : 'overlay';

		if ( 'center' === $position ) {
			$mode = 'overlay';
		}

		return [
			'position' => $position,
			'mode' => $mode,
			'close_on_overlay' => self::flag( $settings, 'close_on_overlay', true ),
			'close_on_esc' => self::flag( $settings, 'close_on_esc', true ),
			'duration' => max( 0, min( 2000, (int) ( $settings['duration'] ?? 300 ) ) ),
		];
	}

	/**
	 * Id of the panel element: the custom CSS id when it is usable, otherwise one made from the widget id.
	 */
	public static function panel_id( string $widget_id, string $custom = '' ): string {
		$custom = trim( strtolower( $custom ) );
		$custom = trim( (string) preg_replace( '/[^a-z0-9_-]+/', '-', $custom ), '-' );

		return '' !== $custom ? $custom : 'refraction-offcanvas-' . $widget_id;
	}

	public static function hash( string $panel_id ): string {
		return self::HASH_PREFIX . $panel_id;
	}

	/**
	 * Panel id out of a `#refraction-offcanvas:ID` hash, or '' for anything else.
	 */
	public static function parse_hash( string $hash ): string {
		if ( 0 !== strpos( $hash, self::HASH_PREFIX ) ) {
			return '';
		}

		$id = substr( $hash, strlen( self::HASH_PREFIX ) );

		return preg_match( '/^[A-Za-z0-9_-]+$/', $id ) ? $id : '';
	}

	private static function flag( array $settings, string $key, bool $default ): bool {
		if ( ! array_key_exists( $key, $settings ) ) {
			return $default;
		}

		return 'yes' === $settings[ $key ] || true === $settings[ $key ];
	}
}
