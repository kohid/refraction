<?php
namespace Refraction\Modules\DisplayConditions\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Decides whether an element is shown to the current visitor. Pure logic: all facts come from a Context.
 *
 * A condition is `[ 'type' => ..., 'op' => 'is'|'is_not', 'value' => string, 'from' => string, 'to' => string ]`.
 * Rows that are not filled in are skipped. See docs/refraction/extras-a.md for the list of types.
 */
class Condition_Evaluator {

	const DAYS = [ 'mon' => 1, 'tue' => 2, 'wed' => 3, 'thu' => 4, 'fri' => 5, 'sat' => 6, 'sun' => 7 ];

	/** Condition types that need no value. */
	const VALUELESS = [ 'logged_in' ];

	/** Types that read a from/to pair instead of a value. */
	const RANGES = [ 'date_range', 'time_of_day' ];

	/**
	 * @param array[] $items Conditions.
	 * @param string  $logic `and` (all must match) or `or` (one is enough).
	 * @param string  $mode  `show` (visible when they match) or `hide` (visible when they do not).
	 */
	public static function is_visible( array $items, string $logic, string $mode, Context $context ): bool {
		$results = [];

		foreach ( $items as $item ) {
			if ( ! is_array( $item ) || ! self::is_complete( $item ) ) {
				continue;
			}

			$matched = self::check( $item, $context );
			$results[] = ( 'is_not' === ( $item['op'] ?? 'is' ) ) ? ! $matched : $matched;
		}

		if ( ! $results ) {
			return true;
		}

		$combined = 'or' === $logic ? in_array( true, $results, true ) : ! in_array( false, $results, true );

		return 'hide' === $mode ? ! $combined : $combined;
	}

	public static function is_complete( array $item ): bool {
		$type = (string) ( $item['type'] ?? '' );

		if ( '' === $type ) {
			return false;
		}

		if ( in_array( $type, self::VALUELESS, true ) ) {
			return true;
		}

		if ( in_array( $type, self::RANGES, true ) ) {
			return '' !== trim( (string) ( $item['from'] ?? '' ) ) || '' !== trim( (string) ( $item['to'] ?? '' ) );
		}

		return '' !== trim( (string) ( $item['value'] ?? '' ) );
	}

	private static function check( array $item, Context $context ): bool {
		$value = (string) ( $item['value'] ?? '' );

		switch ( $item['type'] ) {
			case 'logged_in':
				return $context->is_logged_in();

			case 'user_role':
				return $context->is_logged_in() && (bool) array_intersect( self::list( $value ), array_map( 'strtolower', $context->user_roles() ) );

			case 'user':
				return $context->is_logged_in() && ( in_array( (string) $context->user_id(), self::list( $value ), true ) || in_array( $context->user_login(), self::list( $value ), true ) );

			case 'post_type':
				return in_array( strtolower( $context->post_type() ), self::list( $value ), true );

			case 'post':
				return $context->post_id() > 0 && in_array( (string) $context->post_id(), self::list( $value ), true );

			case 'term':
				return self::has_term( self::list( $value ), $context->term_keys() );

			case 'author':
				return $context->author_id() > 0 && in_array( (string) $context->author_id(), self::list( $value ), true );

			case 'date_range':
				return self::in_date_range( $context->now(), (string) ( $item['from'] ?? '' ), (string) ( $item['to'] ?? '' ) );

			case 'time_of_day':
				return self::in_time_of_day( $context->now(), (string) ( $item['from'] ?? '' ), (string) ( $item['to'] ?? '' ) );

			case 'day_of_week':
				return self::on_day( $context->now(), self::list( $value ) );

			case 'url_param':
				return self::pair_matches( $value, static fn( $name ) => $context->query_arg( $name ), true );

			case 'cookie':
				return self::pair_matches( $value, static fn( $name ) => $context->cookie( $name ), false );

			case 'referrer':
				return '' !== $context->referrer() && false !== stripos( $context->referrer(), trim( $value ) );

			case 'device':
				return in_array( $context->device(), self::list( $value ), true );

			case 'language':
				return self::speaks( self::list( $value ), $context->languages() );
		}

		return false;
	}

	/** @return string[] Lowercase comma or newline separated entries. */
	private static function list( string $value ): array {
		return array_values( array_filter( array_map( 'trim', preg_split( '~[,\n]+~', strtolower( $value ) ) ) ) );
	}

	private static function has_term( array $wanted, array $keys ): bool {
		$keys = array_map( 'strtolower', $keys );

		foreach ( $wanted as $entry ) {
			if ( false !== strpos( $entry, ':' ) ) {
				if ( in_array( $entry, $keys, true ) ) {
					return true;
				}

				continue;
			}

			foreach ( $keys as $key ) {
				if ( substr( $key, -strlen( ':' . $entry ) ) === ':' . $entry ) {
					return true;
				}
			}
		}

		return false;
	}

	private static function parse_moment( string $text, \DateTimeZone $zone ): ?\DateTimeImmutable {
		$text = trim( $text );

		if ( '' === $text ) {
			return null;
		}

		try {
			return new \DateTimeImmutable( $text, $zone );
		} catch ( \Exception $e ) {
			return null;
		}
	}

	private static function in_date_range( \DateTimeImmutable $now, string $from, string $to ): bool {
		$start = self::parse_moment( $from, $now->getTimezone() );
		$end = self::parse_moment( $to, $now->getTimezone() );

		return ( ! $start || $now >= $start ) && ( ! $end || $now <= $end );
	}

	private static function in_time_of_day( \DateTimeImmutable $now, string $from, string $to ): bool {
		$minutes = static function ( string $text ): ?int {
			return preg_match( '~^\s*(\d{1,2}):(\d{2})~', $text, $m ) ? ( (int) $m[1] * 60 + (int) $m[2] ) : null;
		};
		$start = $minutes( $from );
		$end = $minutes( $to );
		$current = (int) $now->format( 'G' ) * 60 + (int) $now->format( 'i' );

		if ( null === $start && null === $end ) {
			return true;
		}

		$start = $start ?? 0;
		$end = $end ?? 1439;

		return $start <= $end ? ( $current >= $start && $current <= $end ) : ( $current >= $start || $current <= $end );
	}

	private static function on_day( \DateTimeImmutable $now, array $days ): bool {
		$today = (int) $now->format( 'N' );

		foreach ( $days as $day ) {
			$number = self::DAYS[ substr( $day, 0, 3 ) ] ?? ( ctype_digit( $day ) ? (int) $day : 0 );

			if ( $number === $today ) {
				return true;
			}
		}

		return false;
	}

	/** `name=text` (contains, or equals for URL parameters) or just `name` (it exists). */
	private static function pair_matches( string $spec, callable $read, bool $exact ): bool {
		$spec = trim( $spec );
		$pos = strpos( $spec, '=' );
		$name = trim( false === $pos ? $spec : substr( $spec, 0, $pos ) );

		if ( '' === $name ) {
			return false;
		}

		$actual = $read( $name );

		if ( null === $actual ) {
			return false;
		}

		if ( false === $pos ) {
			return true;
		}

		$expected = substr( $spec, $pos + 1 );

		return $exact ? ( $actual === $expected ) : ( '' === $expected || false !== stripos( $actual, $expected ) );
	}

	private static function speaks( array $wanted, array $languages ): bool {
		foreach ( $languages as $language ) {
			foreach ( $wanted as $entry ) {
				if ( $language === $entry || ( false === strpos( $entry, '-' ) && 0 === strpos( $language, $entry . '-' ) ) ) {
					return true;
				}
			}
		}

		return false;
	}
}
