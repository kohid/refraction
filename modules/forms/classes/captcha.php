<?php
namespace Refraction\Modules\Forms\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Optional captcha providers (reCAPTCHA, hCaptcha, Turnstile). Nothing here runs unless the site owner
 * picked a provider and entered keys in Submissions > Settings AND switched the captcha on in a form.
 * These are external services: the visitor's browser loads the provider's script and this server
 * sends the visitor's response token to the provider's verify URL.
 */
final class Captcha {

	const PROVIDERS = [
		'recaptcha_v2' => [ 'script' => 'https://www.google.com/recaptcha/api.js', 'verify' => 'https://www.google.com/recaptcha/api/siteverify', 'field' => 'g-recaptcha-response', 'class' => 'g-recaptcha', 'label' => 'Google reCAPTCHA v2' ],
		'recaptcha_v3' => [ 'script' => 'https://www.google.com/recaptcha/api.js?render=%s', 'verify' => 'https://www.google.com/recaptcha/api/siteverify', 'field' => 'g-recaptcha-response', 'class' => '', 'label' => 'Google reCAPTCHA v3' ],
		'hcaptcha' => [ 'script' => 'https://js.hcaptcha.com/1/api.js', 'verify' => 'https://api.hcaptcha.com/siteverify', 'field' => 'h-captcha-response', 'class' => 'h-captcha', 'label' => 'hCaptcha' ],
		'turnstile' => [ 'script' => 'https://challenges.cloudflare.com/turnstile/v0/api.js', 'verify' => 'https://challenges.cloudflare.com/turnstile/v0/siteverify', 'field' => 'cf-turnstile-response', 'class' => 'cf-turnstile', 'label' => 'Cloudflare Turnstile' ],
	];

	public static function is_configured( array $settings ): bool {
		return isset( self::PROVIDERS[ $settings['captcha_provider'] ] ) && '' !== $settings['captcha_site_key'] && '' !== $settings['captcha_secret_key'];
	}

	/** @return string|null An error message, or null when the visitor passed. */
	public static function verify( array $settings, array $post ): ?string {
		$provider = self::PROVIDERS[ $settings['captcha_provider'] ];
		$token = isset( $post[ $provider['field'] ] ) && is_scalar( $post[ $provider['field'] ] ) ? (string) $post[ $provider['field'] ] : '';
		$failed = __( 'Please confirm that you are not a robot.', 'refraction' );

		if ( '' === $token || strlen( $token ) > 4096 ) {
			return $failed;
		}

		$url = apply_filters( 'refraction/forms/captcha_verify_url', $provider['verify'], $settings['captcha_provider'] );
		$response = wp_remote_post( $url, [
			'timeout' => 8,
			'body' => [ 'secret' => $settings['captcha_secret_key'], 'response' => $token ],
		] );

		if ( is_wp_error( $response ) ) {
			return __( 'The captcha could not be checked. Please try again.', 'refraction' );
		}

		$body = json_decode( (string) wp_remote_retrieve_body( $response ), true );

		if ( ! is_array( $body ) || empty( $body['success'] ) ) {
			return $failed;
		}

		if ( 'recaptcha_v3' === $settings['captcha_provider'] && (float) ( $body['score'] ?? 0 ) < 0.5 ) {
			return $failed;
		}

		return null;
	}
}
