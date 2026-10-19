<?php
namespace Refraction\Modules\Forms\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Module-wide settings (Refraction > Submissions > Settings). Privacy-friendly by default.
 */
final class Settings {

	const OPTION = 'refraction_forms_settings';
	const PROVIDERS = [ 'none', 'recaptcha_v2', 'recaptcha_v3', 'hcaptcha', 'turnstile' ];

	public static function defaults(): array {
		return [
			'retention_days' => 0,
			'store_ip' => false,
			'store_user_agent' => false,
			'mask_emails' => false,
			'allow_private_webhooks' => false,
			'captcha_provider' => 'none',
			'captcha_site_key' => '',
			'captcha_secret_key' => '',
		];
	}

	public static function sanitize( array $raw ): array {
		$out = self::defaults();
		$flag = fn( $v ) => ! in_array( strtolower( trim( (string) $v ) ), [ '', '0', 'no', 'false', 'off' ], true );

		$out['retention_days'] = max( 0, min( 3650, (int) ( $raw['retention_days'] ?? 0 ) ) );

		foreach ( [ 'store_ip', 'store_user_agent', 'mask_emails', 'allow_private_webhooks' ] as $key ) {
			$out[ $key ] = isset( $raw[ $key ] ) && $flag( $raw[ $key ] );
		}

		$provider = (string) ( $raw['captcha_provider'] ?? 'none' );
		$out['captcha_provider'] = in_array( $provider, self::PROVIDERS, true ) ? $provider : 'none';

		foreach ( [ 'captcha_site_key', 'captcha_secret_key' ] as $key ) {
			$out[ $key ] = preg_replace( '/\s+/', '', strip_tags( (string) ( $raw[ $key ] ?? '' ) ) );
		}

		return $out;
	}

	public static function get(): array {
		$stored = function_exists( 'get_option' ) ? get_option( self::OPTION, [] ) : [];

		return self::sanitize( is_array( $stored ) ? $stored : [] );
	}
}
