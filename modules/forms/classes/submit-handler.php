<?php
namespace Refraction\Modules\Forms\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Receives form submissions, from the ajax request or from a plain POST when JavaScript is off.
 *
 * Order: rate limit, nonce, load the saved form, honeypot, minimum time, math question, captcha,
 * validation, actions. The browser only names the document and the widget; everything else is read
 * from the saved document.
 */
class Submit_Handler {

	const ACTION = 'refraction_form_submit';
	const NONCE = 'refraction_form_submit';

	/** @var array<string,array> Result of a non-ajax POST in this request, by widget id. */
	private static array $results = [];

	private Submissions_Repository $repo;

	public function __construct( Submissions_Repository $repo ) {
		$this->repo = $repo;

		add_action( 'wp_ajax_nopriv_' . self::ACTION, [ $this, 'handle_ajax' ] );
		add_action( 'wp_ajax_' . self::ACTION, [ $this, 'handle_ajax' ] );
		add_action( 'wp_loaded', [ $this, 'maybe_handle_post' ] );
	}

	public static function get_result( string $element_id ): ?array {
		return self::$results[ $element_id ] ?? null;
	}

	public static function secret(): string {
		return wp_salt( 'auth' ) . '|refraction-forms';
	}

	public static function client_ip(): string {
		$ip = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
		$ip = (string) apply_filters( 'refraction/forms/client_ip', $ip );

		return false !== filter_var( $ip, FILTER_VALIDATE_IP ) ? $ip : '';
	}

	public function handle_ajax(): void {
		$result = $this->process( wp_unslash( $_POST ), $this->normalize_files() ); // phpcs:ignore WordPress.Security.NonceVerification.Missing

		wp_send_json( $this->public_result( $result ), $result['status'] );
	}

	public function maybe_handle_post(): void {
		if ( 'POST' !== ( $_SERVER['REQUEST_METHOD'] ?? '' ) || empty( $_POST['rf_form_id'] ) || ! empty( $_POST['action'] ) || wp_doing_ajax() ) { // phpcs:ignore WordPress.Security.NonceVerification.Missing
			return;
		}

		$post = wp_unslash( $_POST ); // phpcs:ignore WordPress.Security.NonceVerification.Missing
		$result = $this->process( $post, $this->normalize_files() );
		$element_id = Form_Definition::sanitize_id( $post['rf_form_id'] );

		if ( $result['success'] ) {
			$target = $result['redirect'] ? $result['redirect'] : add_query_arg( 'rf_sent', $element_id, remove_query_arg( 'rf_sent', $this->current_url() ) ) . '#refraction-form-' . $element_id;
			// The owner chose this URL in the Redirect action, so it may leave the site.
			wp_redirect( $target ); // phpcs:ignore WordPress.Security.SafeRedirect.wp_redirect_wp_redirect
			exit;
		}

		$result['posted'] = isset( $post['form_fields'] ) && is_array( $post['form_fields'] ) ? $post['form_fields'] : [];
		self::$results[ $element_id ] = $result;
	}

	/** The current request path and query as a relative URL, safe to put in a Location header. */
	private function current_url(): string {
		$uri = isset( $_SERVER['REQUEST_URI'] ) ? (string) wp_unslash( $_SERVER['REQUEST_URI'] ) : '/'; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
		$uri = preg_replace( '/[\x00-\x20\x7f#].*$/s', '', $uri );

		return '' !== $uri && '/' === $uri[0] && ( ! isset( $uri[1] ) || ! in_array( $uri[1], [ '/', '\\' ], true ) ) ? $uri : '/';
	}

	/** Turns $_FILES['form_fields'] (name[id], tmp_name[id] ...) into [id => entry]. */
	private function normalize_files(): array {
		$out = [];

		if ( empty( $_FILES['form_fields']['name'] ) || ! is_array( $_FILES['form_fields']['name'] ) ) {
			return $out;
		}

		foreach ( $_FILES['form_fields']['name'] as $id => $name ) {
			if ( is_array( $name ) ) {
				continue;
			}

			$out[ (string) $id ] = [
				'name' => (string) $name,
				'type' => (string) ( $_FILES['form_fields']['type'][ $id ] ?? '' ),
				'tmp_name' => (string) ( $_FILES['form_fields']['tmp_name'][ $id ] ?? '' ),
				'error' => (int) ( $_FILES['form_fields']['error'][ $id ] ?? UPLOAD_ERR_NO_FILE ),
				'size' => (int) ( $_FILES['form_fields']['size'][ $id ] ?? 0 ),
			];
		}

		return $out;
	}

	private function public_result( array $r ): array {
		return [ 'success' => $r['success'], 'message' => $r['message'], 'errors' => (object) $r['errors'], 'redirect' => $r['redirect'], 'popups' => $r['popups'] ?? [] ];
	}

	private function fail( int $status, string $message, array $errors = [] ): array {
		return [ 'success' => false, 'status' => $status, 'message' => $message, 'errors' => $errors, 'redirect' => '' ];
	}

	/**
	 * @return array{success: bool, status: int, message: string, errors: array, redirect: string}
	 */
	public function process( array $post, array $files ): array {
		$post_id = isset( $post['rf_form_post'] ) ? absint( $post['rf_form_post'] ) : 0;
		$element_id = Form_Definition::sanitize_id( $post['rf_form_id'] ?? '' );
		$form_key = Form_Definition::form_key( $post_id, $element_id );

		$widget = Form_Loader::load_settings( $post_id, $element_id );

		if ( null === $widget ) {
			return $this->fail( 404, __( 'This form could not be found.', 'refraction' ) );
		}

		$def = Form_Definition::from_settings( $widget );
		$error_message = (string) ( $widget['error_message'] ?? __( 'An error occurred. Please try again.', 'refraction' ) );
		$settings = Settings::get();

		$limit = (int) ( $widget['rate_limit_max'] ?? 5 );
		$window = max( 1, (int) ( $widget['rate_limit_window'] ?? 10 ) ) * MINUTE_IN_SECONDS;

		if ( ! ( new Rate_Limiter( new Transient_Counter_Store() ) )->hit( $form_key . '|' . self::client_ip(), $limit, $window ) ) {
			return $this->fail( 429, __( 'Too many submissions. Please wait a few minutes and try again.', 'refraction' ) );
		}

		if ( ! isset( $post['rf_nonce'] ) || ! wp_verify_nonce( (string) $post['rf_nonce'], self::NONCE ) ) {
			return $this->fail( 403, __( 'Your session has expired. Please reload the page and try again.', 'refraction' ) );
		}

		// Bots that fill the trap get a normal-looking success and nothing is stored or sent.
		$traps = [ 'rf_hp_main' ];

		foreach ( $def->get_fields() as $field ) {
			if ( 'honeypot' === $field['type'] ) {
				$traps[] = 'rf_hp_' . $field['id'];
			}
		}

		if ( Spam_Guard::honeypot_triggered( $post, $traps ) ) {
			do_action( 'refraction/forms/spam_blocked', 'honeypot', $form_key );

			return [ 'success' => true, 'status' => 200, 'message' => (string) ( $widget['success_message'] ?? '' ), 'errors' => [], 'redirect' => '' ];
		}

		$min_time = (int) ( $widget['min_submit_time'] ?? 3 );

		if ( ! Spam_Guard::min_time_ok( (string) ( $post['rf_ts'] ?? '' ), time(), $min_time, $form_key, self::secret() ) ) {
			do_action( 'refraction/forms/spam_blocked', 'too_fast', $form_key );

			return $this->fail( 422, __( 'That was very quick. Please wait a moment and send the form again.', 'refraction' ) );
		}

		$errors = [];

		if ( Form_Definition::is_truthy( $widget['math_question'] ?? '' ) && ! Spam_Guard::math_verify( (string) ( $post['rf_math'] ?? '' ), (string) ( $post['rf_math_token'] ?? '' ), $form_key, self::secret() ) ) {
			$errors['rf_math'] = __( 'Please answer the question correctly.', 'refraction' );
		}

		if ( Form_Definition::is_truthy( $widget['captcha'] ?? '' ) && Captcha::is_configured( $settings ) ) {
			$captcha_error = Captcha::verify( $settings, $post );

			if ( null !== $captcha_error ) {
				$errors['rf_captcha'] = $captcha_error;
			}
		}

		$checked = ( new Validator() )->validate( $def, isset( $post['form_fields'] ) && is_array( $post['form_fields'] ) ? $post['form_fields'] : [], $files );
		$errors = array_merge( $errors, $checked['errors'] );

		if ( $errors ) {
			return $this->fail( 422, '' !== (string) ( $widget['invalid_message'] ?? '' ) ? (string) $widget['invalid_message'] : __( 'Please check the highlighted fields.', 'refraction' ), $errors );
		}

		$ctx = [ 'fields' => [], 'extra' => [], 'meta' => [] ];

		foreach ( $def->get_input_fields() as $field ) {
			if ( ! array_key_exists( $field['id'], $checked['values'] ) ) {
				continue;
			}

			$value = $checked['values'][ $field['id'] ];

			if ( 'file' === $field['type'] && isset( $checked['files'][ $field['id'] ] ) ) {
				/* translators: %s: file size. */
				$value = $value . ' (' . size_format( (int) $checked['files'][ $field['id'] ]['size'] ) . ')';
			}

			$ctx['fields'][ $field['id'] ] = [ 'label' => $field['label'] ?: $field['id'], 'value' => $value, 'type' => $field['type'] ];
		}

		$page_url = isset( $post['rf_page'] ) ? esc_url_raw( (string) $post['rf_page'] ) : '';
		$info = [
			'form_key' => $form_key,
			'post_id' => $post_id,
			'element_id' => $element_id,
			'ip' => self::client_ip(),
			'user_agent' => isset( $_SERVER['HTTP_USER_AGENT'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_USER_AGENT'] ) ) : '',
			'page_url' => $page_url,
			'user_id' => get_current_user_id(),
		];
		$ctx['extra'] = [
			'form_name' => $def->get_name(),
			'site_name' => wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES ),
			'site_url' => home_url( '/' ),
			'page_url' => $page_url,
			'date' => wp_date( get_option( 'date_format' ) ),
			'time' => wp_date( get_option( 'time_format' ) ),
		];
		$ctx['meta'] = [ 'form_id' => $element_id, 'form_name' => $def->get_name(), 'submission_id' => null, 'page_url' => $page_url, 'submitted_at' => gmdate( 'c' ) ];

		$outcome = ( new Action_Runner( $this->repo, $settings ) )->run( $def, $ctx, $checked['files'], $info );

		do_action( 'refraction/forms/submitted', $outcome['submission_id'], $ctx['fields'], $def );

		if ( ! $outcome['success'] ) {
			return $this->fail( 500, $error_message );
		}

		return [ 'success' => true, 'status' => 200, 'message' => (string) ( $widget['success_message'] ?? __( 'The form was sent successfully.', 'refraction' ) ), 'errors' => [], 'redirect' => $outcome['redirect'], 'popups' => $outcome['popups'] ];
	}
}
