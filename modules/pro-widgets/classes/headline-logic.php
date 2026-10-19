<?php
namespace Refraction\Modules\ProWidgets\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Headline_Logic {

	const MAX_LINES = 20;

	/**
	 * Rotating types swap the words one after another; highlight types decorate one fixed phrase.
	 */
	public static function animation_types(): array {
		return [ 'typing', 'clip', 'flip', 'swirl', 'blinds', 'drop-in', 'wave', 'slide', 'slide-down', 'fade', 'highlight', 'underline', 'circle', 'strikethrough' ];
	}

	public static function sanitize_type( string $type ): string {
		return in_array( $type, self::animation_types(), true ) ? $type : 'typing';
	}

	public static function is_highlight( string $type ): bool {
		return in_array( $type, [ 'highlight', 'underline', 'circle', 'strikethrough' ], true );
	}

	/**
	 * One rotating phrase per line; trimmed, blanks removed, capped.
	 *
	 * @return string[]
	 */
	public static function lines( string $text ): array {
		$out = [];

		foreach ( preg_split( '/\R/u', $text ) as $line ) {
			$line = trim( $line );

			if ( '' !== $line ) {
				$out[] = $line;
			}
		}

		return array_slice( $out, 0, self::MAX_LINES );
	}
}
