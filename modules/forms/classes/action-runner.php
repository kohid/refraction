<?php
namespace Refraction\Modules\Forms\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Runs the "Actions after submit" of a form. Collect Submissions runs first so every other action can
 * write to the action log of the stored submission. One failing action never stops the others.
 */
class Action_Runner {

	private Submissions_Repository $repo;
	private array $settings;
	private int $submission_id = 0;

	public function __construct( Submissions_Repository $repo, array $settings ) {
		$this->repo = $repo;
		$this->settings = $settings;
	}

	/**
	 * @param array $ctx     Template context: fields, extra, meta.
	 * @param array $uploads Validated $_FILES entries by field id.
	 * @param array $info    form_key, post_id, element_id, ip, user_agent, page_url, user_id.
	 * @return array{submission_id: int, redirect: string, success: bool, results: array}
	 */
	public function run( Form_Definition $def, array $ctx, array $uploads, array $info ): array {
		$results = [];
		$redirect = '';
		$actions = $def->get_actions();
		$ordered = array_merge(
			array_filter( $actions, fn( $a ) => 'collect' === $a['type'] ),
			array_filter( $actions, fn( $a ) => 'collect' !== $a['type'] )
		);

		foreach ( $ordered as $action ) {
			try {
				$result = $this->run_one( $action, $def, $ctx, $uploads, $info );
			} catch ( \Throwable $e ) {
				$result = [ 'status' => 'failed', 'message' => $e->getMessage() ];
			}

			if ( 'collect' === $action['type'] && 'success' === $result['status'] ) {
				$ctx['meta']['submission_id'] = $this->submission_id;
			}

			if ( ! empty( $result['redirect'] ) ) {
				$redirect = $result['redirect'];
			}

			$results[] = [ 'type' => $action['type'], 'status' => $result['status'], 'message' => $result['message'] ];

			if ( $this->submission_id ) {
				$this->repo->add_log( $this->submission_id, $action['type'], $result['status'], $result['message'] );
			}
		}

		$collected = false;
		$mail_failed = false;

		foreach ( $results as $r ) {
			if ( 'collect' === $r['type'] && 'success' === $r['status'] ) {
				$collected = true;
			}

			if ( in_array( $r['type'], [ 'email', 'email2' ], true ) && 'failed' === $r['status'] ) {
				$mail_failed = true;
			}
		}

		return [ 'submission_id' => $this->submission_id, 'redirect' => $redirect, 'success' => $collected || ! $mail_failed, 'results' => $results ];
	}

	private function run_one( array $action, Form_Definition $def, array $ctx, array $uploads, array $info ): array {
		switch ( $action['type'] ) {
			case 'collect':
				return $this->collect( $def, $ctx, $uploads, $info );
			case 'email':
			case 'email2':
				return $this->email( $action, $ctx );
			case 'redirect':
				return $this->redirect( $action, $ctx );
			default:
				return $this->webhook( $action, $ctx );
		}
	}

	private function collect( Form_Definition $def, array $ctx, array $uploads, array $info ): array {
		$rows = [];

		foreach ( $def->get_input_fields() as $field ) {
			$id = $field['id'];

			if ( in_array( $field['type'], [ 'password', 'honeypot' ], true ) || ! isset( $ctx['fields'][ $id ] ) ) {
				continue;
			}

			$value = $ctx['fields'][ $id ]['value'];

			if ( 'file' === $field['type'] && isset( $uploads[ $id ] ) ) {
				$stored = Upload_Store::store( $uploads[ $id ] );

				if ( ! $stored ) {
					throw new \RuntimeException( __( 'The uploaded file could not be saved.', 'refraction' ) );
				}

				$value = wp_json_encode( $stored );
			}

			$rows[ $id ] = [ 'label' => $field['label'] ?: $id, 'type' => $field['type'], 'value' => $value ];
		}

		$this->submission_id = $this->repo->insert( [
			'form_key' => $info['form_key'],
			'form_name' => $def->get_name(),
			'post_id' => $info['post_id'],
			'element_id' => $info['element_id'],
			'user_id' => $info['user_id'],
			'ip' => $this->settings['store_ip'] ? $info['ip'] : '',
			'user_agent' => $this->settings['store_user_agent'] ? $info['user_agent'] : '',
			'page_url' => $info['page_url'],
		], $rows );

		if ( ! $this->submission_id ) {
			throw new \RuntimeException( __( 'The submission could not be stored.', 'refraction' ) );
		}

		/* translators: %d: submission number. */
		return [ 'status' => 'success', 'message' => sprintf( __( 'Stored as submission #%d.', 'refraction' ), $this->submission_id ) ];
	}

	private function email( array $action, array $ctx ): array {
		$p = 'email2' === $action['type'] ? 'email2_' : 'email_';
		$default_to = 'email2' === $action['type'] ? '' : (string) get_option( 'admin_email' );
		$cfg = [
			'to' => (string) ( $action[ $p . 'to' ] ?? $default_to ),
			'subject' => (string) ( $action[ $p . 'subject' ] ?? '' ),
			'message' => (string) ( $action[ $p . 'content' ] ?? '[all-fields]' ),
			'from_email' => (string) ( $action[ $p . 'from' ] ?? '' ),
			'from_name' => (string) ( $action[ $p . 'from_name' ] ?? '' ),
			'reply_to' => (string) ( $action[ $p . 'reply_to' ] ?? '' ),
			'cc' => (string) ( $action[ $p . 'cc' ] ?? '' ),
			'bcc' => (string) ( $action[ $p . 'bcc' ] ?? '' ),
			'format' => (string) ( $action[ $p . 'format' ] ?? 'html' ),
		];

		$mail = Mail_Builder::build( $cfg, $ctx );

		if ( isset( $mail['error'] ) ) {
			return [ 'status' => 'failed', 'message' => $mail['error'] ];
		}

		if ( 'html' === $cfg['format'] ) {
			$mail['message'] = wp_kses_post( $mail['message'] );
		}

		$error = '';
		$catch = function ( $wp_error ) use ( &$error ) {
			$error = $wp_error->get_error_message();
		};
		add_action( 'wp_mail_failed', $catch );
		$sent = wp_mail( $mail['to'], $mail['subject'], $mail['message'], $mail['headers'] );
		remove_action( 'wp_mail_failed', $catch );

		if ( ! $sent ) {
			return [ 'status' => 'failed', 'message' => '' !== $error ? $error : __( 'wp_mail() returned false.', 'refraction' ) ];
		}

		/* translators: %s: recipient addresses. */
		return [ 'status' => 'success', 'message' => sprintf( __( 'Sent to %s.', 'refraction' ), implode( ', ', $mail['to'] ) ) ];
	}

	private function redirect( array $action, array $ctx ): array {
		$url = trim( Template_Tags::render( (string) ( $action['redirect_url'] ?? '' ), $ctx, 'url' ) );
		$url = preg_replace( '/[\x00-\x1f\x7f]/', '', $url );

		if ( '' === $url ) {
			return [ 'status' => 'skipped', 'message' => __( 'No redirect URL set.', 'refraction' ) ];
		}

		if ( '/' === $url[0] && ( ! isset( $url[1] ) || ! in_array( $url[1], [ '/', '\\' ], true ) ) ) {
			$url = home_url( $url );
		}

		$url = esc_url_raw( $url, [ 'http', 'https' ] );

		if ( '' === $url ) {
			return [ 'status' => 'failed', 'message' => __( 'The redirect URL is not valid.', 'refraction' ) ];
		}

		return [ 'status' => 'success', 'message' => $url, 'redirect' => $url ];
	}

	private function webhook( array $action, array $ctx ): array {
		$url = trim( (string) ( $action['webhook_url'] ?? '' ) );

		if ( ! Webhook_Payload::is_valid_url( $url ) ) {
			return [ 'status' => 'failed', 'message' => __( 'The webhook URL is not valid.', 'refraction' ) ];
		}

		$payload = Webhook_Payload::build( $action, $ctx );
		$timeout = max( 1, min( 30, (int) ( $action['webhook_timeout'] ?? 10 ) ) );
		$parts = parse_url( $url );
		$host = strtolower( (string) $parts['host'] );
		$port = (int) ( $parts['port'] ?? 0 );

		$allow_host = fn( $external, $check_host ) => strtolower( (string) $check_host ) === $host ? true : $external;
		$allow_port = function ( $ports ) use ( $port ) {
			if ( $port ) {
				$ports[] = $port;
			}

			return $ports;
		};

		if ( $this->settings['allow_private_webhooks'] ) {
			add_filter( 'http_request_host_is_external', $allow_host, 10, 2 );
			add_filter( 'http_allowed_safe_ports', $allow_port );
		}

		$response = wp_safe_remote_post( $url, [
			'timeout' => $timeout,
			'redirection' => 0,
			'user-agent' => 'Refraction-Forms/' . REFRACTION_VERSION,
			'headers' => [ 'Content-Type' => $payload['content_type'] ],
			'body' => $payload['body'],
		] );

		remove_filter( 'http_request_host_is_external', $allow_host, 10 );
		remove_filter( 'http_allowed_safe_ports', $allow_port );

		if ( is_wp_error( $response ) ) {
			return [ 'status' => 'failed', 'message' => $response->get_error_message() ];
		}

		$code = (int) wp_remote_retrieve_response_code( $response );

		if ( $code < 200 || $code >= 300 ) {
			/* translators: %d: HTTP status code. */
			return [ 'status' => 'failed', 'message' => sprintf( __( 'The webhook answered with HTTP %d.', 'refraction' ), $code ) ];
		}

		/* translators: %d: HTTP status code. */
		return [ 'status' => 'success', 'message' => sprintf( __( 'Delivered (HTTP %d).', 'refraction' ), $code ) ];
	}
}
