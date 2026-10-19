<?php
namespace Refraction\Modules\DynamicTags\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Turns raw custom field values (post meta, user meta, ACF) into what each tag category needs, and decides
 * which keys a tag may read. Pure: no WordPress calls, so it is tested without a site.
 */
class Value {

	/** Names of user meta that hold secrets, whatever the user's role. */
	const USER_META_DENY = '/pass|token|capabilit|activation|secret|level|key|nonce|hash|salt/i';

	/** A readable post/term meta key: no leading underscore (those are protected), no markup. */
	public static function allowed_key( string $key ): bool {
		return 1 === preg_match( '/^[A-Za-z0-9][A-Za-z0-9_\-.: ]{0,190}$/', $key );
	}

	public static function allowed_user_key( string $key ): bool {
		return self::allowed_key( $key ) && ! preg_match( self::USER_META_DENY, $key );
	}

	/** Request parameter names: letters, digits, underscore, dash. */
	public static function allowed_param( string $name ): bool {
		return 1 === preg_match( '/^[A-Za-z0-9_\-]{1,100}$/', $name );
	}

	public static function to_text( $value ): string {
		if ( is_bool( $value ) ) {
			return $value ? '1' : '';
		}

		if ( is_scalar( $value ) ) {
			return (string) $value;
		}

		if ( is_array( $value ) ) {
			$parts = [];

			foreach ( $value as $item ) {
				if ( ! is_scalar( $item ) ) {
					return '';
				}

				$parts[] = (string) $item;
			}

			return implode( ', ', $parts );
		}

		return '';
	}

	/**
	 * @return array{id:int,url:string}|null Either part may be empty; the caller fills the URL from the ID.
	 */
	public static function to_image( $value ): ?array {
		if ( is_array( $value ) ) {
			$id = (int) ( $value['ID'] ?? $value['id'] ?? 0 );
			$url = isset( $value['url'] ) && is_string( $value['url'] ) && self::safe_url( $value['url'] ) ? $value['url'] : '';

			return ( $id || $url ) ? [ 'id' => $id, 'url' => $url ] : null;
		}

		if ( is_numeric( $value ) && (int) $value > 0 ) {
			return [ 'id' => (int) $value, 'url' => '' ];
		}

		if ( is_string( $value ) && self::safe_url( trim( $value ) ) ) {
			return [ 'id' => 0, 'url' => trim( $value ) ];
		}

		return null;
	}

	/** @return array<int,array{id:int,url:string}> */
	public static function to_gallery( $value ): array {
		if ( is_string( $value ) ) {
			$value = explode( ',', $value );
		}

		$items = [];

		foreach ( (array) $value as $item ) {
			$image = self::to_image( is_string( $item ) ? trim( $item ) : $item );

			if ( $image ) {
				$items[] = $image;
			}
		}

		return $items;
	}

	/** A hex, rgb(a) or hsl(a) colour, or an empty string. */
	public static function to_color( $value ): string {
		$value = is_string( $value ) ? trim( $value ) : '';

		if ( preg_match( '/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i', $value ) ) {
			return $value;
		}

		if ( preg_match( '/^(?:rgb|hsl)a?\(\s*[0-9.%]+\s*[, ]\s*[0-9.%]+\s*[, ]\s*[0-9.%]+\s*(?:[,\/]\s*[0-9.%]+\s*)?\)$/i', $value ) ) {
			return $value;
		}

		return '';
	}

	/**
	 * A date field (ACF `Ymd`, ISO date or date time, or a unix timestamp) as a "wall clock" timestamp: the
	 * digits are read as UTC so no time zone shifts them. Format the result with gmdate().
	 */
	public static function to_timestamp( $value ): ?int {
		if ( is_int( $value ) || ( is_string( $value ) && ctype_digit( $value ) && 8 !== strlen( $value ) ) ) {
			return (int) $value > 0 ? (int) $value : null;
		}

		if ( ! is_string( $value ) || '' === trim( $value ) ) {
			return null;
		}

		$value = trim( $value );
		$zone = new \DateTimeZone( 'UTC' );

		foreach ( [ '!Ymd', '!Y-m-d', '!Y-m-d H:i:s', '!Y-m-d\TH:i:s', '!Y-m-d H:i', '!d/m/Y' ] as $format ) {
			$date = \DateTimeImmutable::createFromFormat( $format, $value, $zone );
			$errors = \DateTimeImmutable::getLastErrors();

			if ( $date && ( ! $errors || ( ! $errors['warning_count'] && ! $errors['error_count'] ) ) ) {
				return $date->getTimestamp();
			}
		}

		return null;
	}

	private static function safe_url( string $url ): bool {
		return 1 === preg_match( '#^(https?:)?//[^\s<>"\']+$#i', $url ) || 1 === preg_match( '#^/[^\s<>"\'/][^\s<>"\']*$#', $url );
	}
}
