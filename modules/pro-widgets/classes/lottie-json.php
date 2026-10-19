<?php
namespace Refraction\Modules\ProWidgets\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Checks that a file really is a Lottie animation before WordPress accepts it as an upload, and that a
 * source URL entered by the owner is a normal web address.
 */
class Lottie_Json {

	const MAX_BYTES = 5242880;

	public static function is_valid( string $json, int $max_bytes = self::MAX_BYTES ): bool {
		if ( '' === $json || strlen( $json ) > $max_bytes ) {
			return false;
		}

		$data = json_decode( $json, true, 64 );

		if ( ! is_array( $data ) || ! isset( $data['v'], $data['fr'], $data['w'], $data['h'], $data['layers'] ) ) {
			return false;
		}

		return is_numeric( $data['fr'] ) && $data['fr'] > 0 && is_numeric( $data['w'] ) && is_numeric( $data['h'] ) && is_array( $data['layers'] );
	}

	/**
	 * http(s) or a site-relative path.
	 */
	public static function is_safe_url( string $url ): bool {
		$url = trim( $url );

		if ( '' === $url ) {
			return false;
		}

		if ( 0 === strpos( $url, '/' ) && 0 !== strpos( $url, '//' ) ) {
			return true;
		}

		return (bool) preg_match( '#^https?://[^\s]+$#i', $url );
	}
}
