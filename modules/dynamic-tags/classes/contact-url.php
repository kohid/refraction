<?php
namespace Refraction\Modules\DynamicTags\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Builds mailto:, tel:, sms:, WhatsApp and Skype links from plain values (pure).
 * Returns an empty string when the input cannot make a valid link.
 */
class Contact_Url {

	public static function build( string $type, array $s ): string {
		switch ( $type ) {
			case 'email':
				return self::email( (string) ( $s['to'] ?? '' ), (string) ( $s['subject'] ?? '' ), (string) ( $s['body'] ?? '' ) );
			case 'tel':
				$number = self::phone( (string) ( $s['number'] ?? '' ), true );

				return '' === $number ? '' : 'tel:' . $number;
			case 'sms':
				$number = self::phone( (string) ( $s['number'] ?? '' ), true );

				return '' === $number ? '' : 'sms:' . $number . self::query( [ 'body' => (string) ( $s['body'] ?? '' ) ] );
			case 'whatsapp':
				$number = self::phone( (string) ( $s['number'] ?? '' ), false );

				return '' === $number ? '' : 'https://wa.me/' . $number . self::query( [ 'text' => (string) ( $s['body'] ?? '' ) ] );
			case 'skype':
				$user = (string) ( $s['username'] ?? '' );
				$action = (string) ( $s['action'] ?? 'chat' );

				if ( ! preg_match( '/^[A-Za-z0-9:._\-,]+$/', $user ) ) {
					return '';
				}

				return 'skype:' . $user . '?' . ( in_array( $action, [ 'call', 'chat', 'add', 'userinfo', 'voicemail' ], true ) ? $action : 'chat' );
		}

		return '';
	}

	private static function email( string $to, string $subject, string $body ): string {
		$to = trim( $to );

		if ( '' === $to || preg_match( '/[\r\n\s,;<>]/', $to ) || ! filter_var( $to, FILTER_VALIDATE_EMAIL ) ) {
			return '';
		}

		return 'mailto:' . $to . self::query( [ 'subject' => $subject, 'body' => $body ] );
	}

	/** Digits, and a leading plus when `$keep_plus`. */
	private static function phone( string $raw, bool $keep_plus ): string {
		$digits = preg_replace( '/\D+/', '', $raw );

		if ( '' === $digits ) {
			return '';
		}

		return ( $keep_plus && '+' === ltrim( $raw )[0] ? '+' : '' ) . $digits;
	}

	private static function query( array $pairs ): string {
		$parts = [];

		foreach ( $pairs as $key => $value ) {
			if ( '' !== trim( $value ) ) {
				$parts[] = $key . '=' . rawurlencode( $value );
			}
		}

		return $parts ? '?' . implode( '&', $parts ) : '';
	}
}
