<?php
namespace Refraction\Modules\NestedCarousel\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Pure option logic of the Nested Carousel widget (no WordPress needed).
 */
class Carousel_Logic {

	const PAGINATION = [ 'none', 'bullets', 'fraction', 'progress' ];

	public static function sanitize( array $settings ): array {
		return [
			'effect' => isset( $settings['effect'] ) && in_array( $settings['effect'], [ 'fade', 'stack' ], true ) ? $settings['effect'] : 'slide',
			'pagination' => isset( $settings['pagination'] ) && in_array( $settings['pagination'], self::PAGINATION, true ) ? $settings['pagination'] : 'bullets',
			'slides_to_show' => self::range( $settings, 'slides_to_show', 1, 8, 1 ),
			'spacing' => self::range( $settings, 'spacing', 0, 200, 20 ),
			'speed' => self::range( $settings, 'speed', 100, 5000, 500 ),
			'autoplay_speed' => self::range( $settings, 'autoplay_speed', 500, 30000, 5000 ),
			'direction' => isset( $settings['direction'] ) && 'vertical' === $settings['direction'] ? 'vertical' : 'horizontal',
		];
	}

	/**
	 * A fade shows exactly one slide at a time.
	 */
	public static function slides_per_view( string $effect, int $slides_to_show ): int {
		return 'fade' === $effect ? 1 : max( 1, $slides_to_show );
	}

	/**
	 * Swiper loops only with spare slides beyond the ones in view.
	 */
	public static function can_loop( int $slides, int $per_view ): bool {
		return $slides > $per_view;
	}

	/**
	 * The Stack effect: each slide's place around the open one. 0 is the open slide, 1..$peek the slides that come
	 * next (shown as bars on the side they come from), -1..-$peek the ones before; null is out of sight. Without a
	 * loop the ends have no slides beyond them. Mirrored in the frontend handler (stackRoles()).
	 *
	 * @return array<int, int|null> Slide index => place.
	 */
	public static function stack_roles( int $count, int $active, int $peek, bool $loop ): array {
		$roles = [];

		if ( $count < 1 ) {
			return $roles;
		}

		$active = ( ( $active % $count ) + $count ) % $count;
		$peek = max( 0, $peek );

		for ( $i = 0; $i < $count; $i++ ) {
			$d = $i - $active;

			if ( $loop ) {
				// The shorter way round; a tie (even count) counts as next.
				$d = ( ( $d % $count ) + $count ) % $count;
				$d = $d > $count / 2 ? $d - $count : $d;
			}

			$roles[ $i ] = abs( $d ) <= $peek ? $d : null;
		}

		return $roles;
	}

		public static function swiper_pagination_type( string $pagination ): string {
		return in_array( $pagination, [ 'bullets', 'fraction', 'progressbar' ], true ) ? $pagination : ( 'progress' === $pagination ? 'progressbar' : '' );
	}

	private static function range( array $settings, string $key, int $min, int $max, int $default ): int {
		return max( $min, min( $max, (int) ( $settings[ $key ] ?? $default ) ) );
	}
}
