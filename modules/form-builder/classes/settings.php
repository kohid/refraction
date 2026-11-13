<?php
namespace Refraction\Modules\FormBuilder\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * The Advanced tab of a collection: what happens after a submission, who is told, when the form is open and how it
 * defends itself against spam. Pure logic, tested in scripts/test-form-builder.php.
 */
class Settings {

	public static function defaults(): array {
		return [
			'submit_text' => Schema::t( 'Submit' ),
			'next_text' => Schema::t( 'Next' ),
			'back_text' => Schema::t( 'Back' ),
			'progress' => 'steps',
			'redirect_url' => '',
			'notify_enabled' => false,
			'notify_to' => '',
			'notify_subject' => '',
			'reply_to_field' => '',
			'webhook_url' => '',
			'require_login' => false,
			'opens' => '',
			'closes' => '',
			'max_submissions' => 0,
			'closed_message' => Schema::t( 'This form is not accepting submissions right now.' ),
			'honeypot' => true,
			'min_seconds' => 3,
			'hourly_limit' => 10,
			'reference_prefix' => '',
			'confirm_enabled' => false,
			'confirm_field' => '',
			'confirm_subject' => '',
			'confirm_message' => '',
		] + Money::defaults();
	}

	public static function clean( $raw ): array {
		$d = self::defaults();
		$raw = is_array( $raw ) ? $raw : [];
		$emails = [];

		foreach ( preg_split( '/[\s,;]+/', (string) ( $raw['notify_to'] ?? '' ) ) as $email ) {
			if ( '' !== $email && false !== filter_var( $email, FILTER_VALIDATE_EMAIL ) && count( $emails ) < 5 ) {
				$emails[] = strtolower( $email );
			}
		}

		return [
			'submit_text' => Schema::text( $raw['submit_text'] ?? '', 40 ) ?: $d['submit_text'],
			'next_text' => Schema::text( $raw['next_text'] ?? '', 40 ) ?: $d['next_text'],
			'back_text' => Schema::text( $raw['back_text'] ?? '', 40 ) ?: $d['back_text'],
			'progress' => in_array( $raw['progress'] ?? '', [ 'steps', 'bar', 'none' ], true ) ? $raw['progress'] : $d['progress'],
			'redirect_url' => self::url( $raw['redirect_url'] ?? '' ),
			'notify_enabled' => ! empty( $raw['notify_enabled'] ) && $emails,
			'notify_to' => implode( ', ', $emails ),
			'notify_subject' => Schema::text( $raw['notify_subject'] ?? '', 120 ),
			'reply_to_field' => Schema::key( $raw['reply_to_field'] ?? '' ),
			'webhook_url' => self::url( $raw['webhook_url'] ?? '' ),
			'require_login' => ! empty( $raw['require_login'] ),
			'opens' => self::datetime( $raw['opens'] ?? '' ),
			'closes' => self::datetime( $raw['closes'] ?? '' ),
			'max_submissions' => max( 0, min( 1000000, (int) ( $raw['max_submissions'] ?? 0 ) ) ),
			'closed_message' => Schema::text( $raw['closed_message'] ?? '', 200 ) ?: $d['closed_message'],
			'honeypot' => ! array_key_exists( 'honeypot', $raw ) || ! empty( $raw['honeypot'] ),
			'min_seconds' => max( 0, min( 60, is_numeric( $raw['min_seconds'] ?? null ) ? (int) $raw['min_seconds'] : $d['min_seconds'] ) ),
			'hourly_limit' => max( 0, min( 1000, is_numeric( $raw['hourly_limit'] ?? null ) ? (int) $raw['hourly_limit'] : $d['hourly_limit'] ) ),
			// A reference per record (IT-251113-4821) and an email to the visitor (0.90.0).
			'reference_prefix' => substr( (string) preg_replace( '/[^A-Z0-9]/', '', strtoupper( (string) ( $raw['reference_prefix'] ?? '' ) ) ), 0, 8 ),
			'confirm_enabled' => ! empty( $raw['confirm_enabled'] ) && '' !== Schema::key( $raw['confirm_field'] ?? '' ),
			'confirm_field' => Schema::key( $raw['confirm_field'] ?? '' ),
			'confirm_subject' => Schema::text( $raw['confirm_subject'] ?? '', 160 ),
			'confirm_message' => Schema::textarea_text( $raw['confirm_message'] ?? '', 4000 ),
		] + Money::clean( $raw );
	}

	/** A new reference: prefix, the date and four random digits (IT-251113-4821); no prefix: the date and digits. */
	public static function new_reference( string $prefix, \DateTimeInterface $now, int $random ): string {
		return ( '' !== $prefix ? $prefix . '-' : '' ) . $now->format( 'ymd' ) . '-' . str_pad( (string) ( $random % 10000 ), 4, '0', STR_PAD_LEFT );
	}

	/** Is this a reference the form could have made (for the success message, which reads it from the address)? */
	public static function is_reference( string $value ): bool {
		return 1 === preg_match( '/^(?:[A-Z0-9]{1,8}-)?\d{6}-\d{4,8}$/', $value );
	}

	/**
	 * The visitor's email: {reference}, {summary} (every answer, one per line) and {field_key} for one answer.
	 *
	 * @param array $answers field key => answer as text, in form order, with labels: [ key => [ label, text ] ].
	 */
	public static function fill_message( string $template, string $reference, array $answers ): string {
		$summary = implode( "\n", array_map( static function ( $row ) {
			return $row[0] . ': ' . $row[1];
		}, array_filter( $answers, static function ( $row ) {
			return '' !== $row[1];
		} ) ) );

		return (string) preg_replace_callback( '/\{([a-z][a-z0-9_]*)\}/', static function ( $m ) use ( $reference, $summary, $answers ) {
			if ( 'reference' === $m[1] ) {
				return $reference;
			}

			if ( 'summary' === $m[1] ) {
				return $summary;
			}

			return isset( $answers[ $m[1] ] ) ? $answers[ $m[1] ][1] : $m[0];
		}, $template );
	}

	/** An http(s) address or an empty string. */
	public static function url( $value ): string {
		$value = trim( is_scalar( $value ) ? (string) $value : '' );
		$scheme = strtolower( (string) parse_url( $value, PHP_URL_SCHEME ) );

		return '' !== $value && false !== filter_var( $value, FILTER_VALIDATE_URL ) && in_array( $scheme, [ 'http', 'https' ], true ) ? $value : '';
	}

	/** "YYYY-MM-DD HH:MM" (also accepts the T form of a datetime-local input) or an empty string. */
	public static function datetime( $value ): string {
		$value = str_replace( 'T', ' ', trim( is_scalar( $value ) ? (string) $value : '' ) );
		$date = \DateTime::createFromFormat( '!Y-m-d H:i', $value );

		return $date && $date->format( 'Y-m-d H:i' ) === $value ? $value : '';
	}

	/**
	 * Is the form taking submissions right now?
	 *
	 * @param string $now   "YYYY-MM-DD HH:MM" in the site's time zone.
	 * @param int    $count Submissions so far.
	 *
	 * @return string open | not_yet | closed | full
	 */
	public static function availability( array $settings, string $now, int $count ): string {
		if ( '' !== $settings['opens'] && $now < $settings['opens'] ) {
			return 'not_yet';
		}

		if ( '' !== $settings['closes'] && $now >= $settings['closes'] ) {
			return 'closed';
		}

		return $settings['max_submissions'] > 0 && $count >= $settings['max_submissions'] ? 'full' : 'open';
	}
}
