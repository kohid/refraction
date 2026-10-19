<?php
namespace Refraction\Modules\Forms\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Handles the Login widget's POST with wp_signon(). Nonce checked, attempts rate-limited per IP,
 * one generic error message for every failure (no user enumeration), redirects validated.
 */
class Login_Handler {

	const NONCE = 'refraction_login';
	const WIDGET = 'refraction-login';

	/** @var array<string,string> Error by widget id for this request. */
	private static array $errors = [];

	public function __construct() {
		add_action( 'wp_loaded', [ $this, 'maybe_login' ] );
	}

	public static function get_error( string $element_id ): string {
		return self::$errors[ $element_id ] ?? '';
	}

	public function maybe_login(): void {
		if ( 'POST' !== ( $_SERVER['REQUEST_METHOD'] ?? '' ) || empty( $_POST['rf_login_id'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Missing
			return;
		}

		$element_id = Form_Definition::sanitize_id( wp_unslash( $_POST['rf_login_id'] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Missing

		if ( ! isset( $_POST['rf_login_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['rf_login_nonce'] ) ), self::NONCE ) ) {
			self::$errors[ $element_id ] = __( 'Your session has expired. Please reload the page and try again.', 'refraction' );

			return;
		}

		$post_id = isset( $_POST['rf_login_post'] ) ? absint( $_POST['rf_login_post'] ) : 0;
		$widget = Form_Loader::load_settings( $post_id, $element_id, self::WIDGET );

		if ( null === $widget ) {
			self::$errors[ $element_id ] = __( 'This form could not be found.', 'refraction' );

			return;
		}

		$limiter = new Rate_Limiter( new Transient_Counter_Store() );
		$max = (int) apply_filters( 'refraction/forms/login_attempts', 10 );

		if ( ! $limiter->hit( 'login|' . Submit_Handler::client_ip(), $max, 15 * MINUTE_IN_SECONDS ) ) {
			self::$errors[ $element_id ] = __( 'Too many login attempts. Please wait a few minutes and try again.', 'refraction' );

			return;
		}

		$login = isset( $_POST['rf_login_user'] ) ? sanitize_user( wp_unslash( $_POST['rf_login_user'] ) ) : '';
		$pass = isset( $_POST['rf_login_pass'] ) ? (string) wp_unslash( $_POST['rf_login_pass'] ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
		$user = wp_signon( [ 'user_login' => $login, 'user_password' => $pass, 'remember' => ! empty( $_POST['rf_login_remember'] ) ], is_ssl() );

		if ( is_wp_error( $user ) ) {
			self::$errors[ $element_id ] = (string) ( $widget['error_message'] ?? __( 'Invalid username or password.', 'refraction' ) );

			return;
		}

		$target = trim( (string) ( $widget['redirect_url'] ?? '' ) );
		$fallback = $this->current_path();
		$destination = '' !== $target ? wp_validate_redirect( '/' === ( $target[0] ?? '' ) ? home_url( $target ) : $target, $fallback ) : $fallback;

		wp_safe_redirect( $destination );
		exit;
	}

	private function current_path(): string {
		$uri = isset( $_SERVER['REQUEST_URI'] ) ? (string) wp_unslash( $_SERVER['REQUEST_URI'] ) : '/'; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
		$uri = preg_replace( '/[\x00-\x20\x7f#].*$/s', '', $uri );

		return '' !== $uri && '/' === $uri[0] && ( ! isset( $uri[1] ) || ! in_array( $uri[1], [ '/', '\\' ], true ) ) ? home_url( $uri ) : home_url( '/' );
	}
}
