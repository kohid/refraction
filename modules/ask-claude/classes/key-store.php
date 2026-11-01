<?php
namespace Refraction\Modules\AskClaude\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * The site's Anthropic API key and Ask Claude settings. The key is encrypted at rest with libsodium (a key derived from
 * the site's secret salts), is never sent to the browser, and only a masked form ("sk-ant-...wxyz") is ever shown.
 */
class Key_Store {

	const OPTION = 'refraction_ask_claude';
	const MODELS = [ 'claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5' ];
	const DEFAULT_MODEL = 'claude-opus-5-5';

	private static function secret(): string {
		return sodium_crypto_generichash( wp_salt( 'secure_auth' ) . '|refraction-ask-claude', '', SODIUM_CRYPTO_SECRETBOX_KEYBYTES );
	}

	private static function settings(): array {
		$value = get_option( self::OPTION, [] );

		return is_array( $value ) ? $value : [];
	}

	public static function has_key(): bool {
		return '' !== self::key();
	}

	/** The decrypted key, or '' when none is set or it can not be decrypted (the salts changed). */
	public static function key(): string {
		$stored = (string) ( self::settings()['key'] ?? '' );
		$raw = '' !== $stored ? base64_decode( $stored, true ) : false; // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode

		if ( false === $raw || strlen( $raw ) <= SODIUM_CRYPTO_SECRETBOX_NONCEBYTES ) {
			return '';
		}

		$plain = sodium_crypto_secretbox_open( substr( $raw, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES ), substr( $raw, 0, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES ), self::secret() );

		return false === $plain ? '' : $plain;
	}

	/** Whether a pasted value looks like an Anthropic API key (it is checked for real on the first request). */
	public static function looks_valid( string $key ): bool {
		return 1 === preg_match( '/^sk-ant-[A-Za-z0-9_\-]{20,200}$/', $key );
	}

	public static function save_key( string $key ): void {
		$nonce = random_bytes( SODIUM_CRYPTO_SECRETBOX_NONCEBYTES );
		$settings = self::settings();
		$settings['key'] = base64_encode( $nonce . sodium_crypto_secretbox( $key, $nonce, self::secret() ) ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode
		update_option( self::OPTION, $settings, false );
	}

	public static function delete_key(): void {
		$settings = self::settings();
		unset( $settings['key'] );
		update_option( self::OPTION, $settings, false );
	}

	public static function masked(): string {
		$key = self::key();

		return '' === $key ? '' : substr( $key, 0, 7 ) . '…' . substr( $key, -4 );
	}

	public static function model(): string {
		$model = (string) ( self::settings()['model'] ?? '' );

		return in_array( $model, self::MODELS, true ) ? $model : self::DEFAULT_MODEL;
	}

	public static function save_model( string $model ): void {
		$settings = self::settings();
		$settings['model'] = in_array( $model, self::MODELS, true ) ? $model : self::DEFAULT_MODEL;
		update_option( self::OPTION, $settings, false );
	}
}
