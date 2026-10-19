<?php
namespace Refraction\Modules\Forms\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Honeypot, minimum fill time and the local math question. Tokens are HMAC-signed with a server
 * secret, so the browser cannot forge a timestamp or an answer.
 */
final class Spam_Guard {

	private static function sign( string $data, string $secret ): string {
		return substr( hash_hmac( 'sha256', $data, $secret ), 0, 32 );
	}

	public static function time_token( int $now, string $form_key, string $secret ): string {
		return $now . '.' . self::sign( "t|$now|$form_key", $secret );
	}

	public static function min_time_ok( string $token, int $now, int $min_seconds, string $form_key, string $secret ): bool {
		if ( $min_seconds <= 0 ) {
			return true;
		}

		if ( ! preg_match( '/^(\d{1,12})\.([a-f0-9]{32})$/', $token, $m ) ) {
			return false;
		}

		$ts = (int) $m[1];

		if ( ! hash_equals( self::sign( "t|$ts|$form_key", $secret ), $m[2] ) ) {
			return false;
		}

		return $ts <= $now && ( $now - $ts ) >= $min_seconds;
	}

	public static function honeypot_triggered( array $post, array $names ): bool {
		foreach ( $names as $name ) {
			if ( isset( $post[ $name ] ) && '' !== trim( is_scalar( $post[ $name ] ) ? (string) $post[ $name ] : 'x' ) ) {
				return true;
			}
		}

		return false;
	}

	public static function math_challenge( int $a, int $b, string $form_key, string $secret ): array {
		return [
			/* translators: 1: first number, 2: second number. */
			'question' => sprintf( __( 'What is %1$d + %2$d?', 'refraction' ), $a, $b ),
			'token' => self::sign( 'm|' . ( $a + $b ) . "|$form_key", $secret ),
		];
	}

	public static function math_verify( string $answer, string $token, string $form_key, string $secret ): bool {
		$answer = trim( $answer );

		if ( ! preg_match( '/^-?\d{1,6}$/', $answer ) || '' === $token ) {
			return false;
		}

		return hash_equals( self::sign( 'm|' . (int) $answer . "|$form_key", $secret ), $token );
	}
}
