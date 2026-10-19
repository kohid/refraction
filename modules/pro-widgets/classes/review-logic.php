<?php
namespace Refraction\Modules\ProWidgets\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Star rating maths for the Reviews widget. Ratings come from the owner's own data, never from a remote API.
 */
class Review_Logic {

	/**
	 * Clamp anything to a number between 0 and $max (junk becomes 0).
	 */
	public static function clamp( $value, int $max = 5 ): float {
		if ( ! is_numeric( $value ) ) {
			return 0.0;
		}

		return (float) max( 0, min( $max, (float) $value ) );
	}

	/**
	 * One entry per star: `full`, `half` or `empty`. The fraction rounds to the nearest half star.
	 *
	 * @return string[]
	 */
	public static function stars( $rating, int $max = 5 ): array {
		$max = max( 1, min( 10, $max ) );
		$rating = self::clamp( $rating, $max );
		$rounded = round( $rating * 2 ) / 2;
		$stars = [];

		for ( $i = 1; $i <= $max; $i++ ) {
			if ( $rounded >= $i ) {
				$stars[] = 'full';
			} elseif ( $rounded >= $i - 0.5 && $rounded > 0 && $rounded < $i ) {
				$stars[] = 'half';
			} else {
				$stars[] = 'empty';
			}
		}

		return $stars;
	}

	/**
	 * 4.0 => "4", 4.5 => "4.5".
	 */
	public static function format( float $rating ): string {
		return rtrim( rtrim( number_format( $rating, 1, '.', '' ), '0' ), '.' );
	}
}
