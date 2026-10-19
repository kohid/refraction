<?php
namespace Refraction\Modules\LoopBuilder\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * A small signed blob (JSON + HMAC) that the page hands to the browser and gets back unchanged. The
 * REST endpoint trusts only what verifies, so a visitor cannot ask for another document or query.
 */
class Context_Token {

	public static function sign( array $data, string $key ): string {
		$payload = self::b64( wp_json_encode( $data ) );

		return $payload . '.' . self::b64( hash_hmac( 'sha256', $payload, $key, true ) );
	}

	public static function verify( string $token, string $key ): ?array {
		$parts = explode( '.', $token );

		if ( 2 !== count( $parts ) || '' === $parts[0] || '' === $parts[1] ) {
			return null;
		}

		$expected = self::b64( hash_hmac( 'sha256', $parts[0], $key, true ) );

		if ( ! hash_equals( $expected, $parts[1] ) ) {
			return null;
		}

		$data = json_decode( (string) base64_decode( strtr( $parts[0], '-_', '+/' ), true ), true );

		return is_array( $data ) ? $data : null;
	}

	private static function b64( string $raw ): string {
		return rtrim( strtr( base64_encode( $raw ), '+/', '-_' ), '=' );
	}
}
