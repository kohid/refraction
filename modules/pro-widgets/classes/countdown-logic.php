<?php
namespace Refraction\Modules\ProWidgets\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Countdown_Logic {

	/**
	 * Parse a local date/time (as typed in the editor) into a Unix timestamp, or null when it is not a date.
	 */
	public static function parse_due( string $value, \DateTimeZone $tz ): ?int {
		$value = trim( $value );

		if ( '' === $value ) {
			return null;
		}

		try {
			$date = new \DateTimeImmutable( $value, $tz );
		} catch ( \Exception $e ) {
			return null;
		}

		return $date->getTimestamp();
	}

	public static function split( int $seconds ): array {
		$seconds = max( 0, $seconds );

		return [
			'days' => intdiv( $seconds, 86400 ),
			'hours' => intdiv( $seconds % 86400, 3600 ),
			'minutes' => intdiv( $seconds % 3600, 60 ),
			'seconds' => $seconds % 60,
		];
	}

	public static function is_expired( int $due, int $now ): bool {
		return $now >= $due;
	}

	public static function evergreen_seconds( int $days, int $hours, int $minutes, int $seconds ): int {
		return max( 0, $days * 86400 + $hours * 3600 + $minutes * 60 + $seconds );
	}

	public static function pad( int $value ): string {
		return str_pad( (string) max( 0, $value ), 2, '0', STR_PAD_LEFT );
	}

	/**
	 * Cookie name for an evergreen timer, from the widget id.
	 */
	public static function cookie_key( string $id ): string {
		return 'rf_cd_' . preg_replace( '/[^A-Za-z0-9_-]/', '', $id );
	}
}
