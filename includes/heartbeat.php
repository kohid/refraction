<?php
namespace Refraction;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Refraction heartbeat.
 *
 * Refraction heartbeat handler class is responsible for initializing Refraction
 * heartbeat. The class communicates with WordPress Heartbeat API while working
 * with Refraction.
 *
 * @since 1.0.0
 */
class Heartbeat {

	/**
	 * Heartbeat received.
	 *
	 * Locks the Heartbeat response received when editing with Refraction.
	 *
	 * Fired by `heartbeat_received` filter.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @param array $response The Heartbeat response.
	 * @param array $data     The `$_POST` data sent.
	 *
	 * @return array Heartbeat response received.
	 */
	public function heartbeat_received( $response, $data ) {
		if ( isset( $data['refraction_post_lock']['post_ID'] ) ) {
			$post_id     = $data['refraction_post_lock']['post_ID'];
			$locked_user = Plugin::$instance->editor->get_locked_user( $post_id );

			if ( ! $locked_user || ! empty( $data['refraction_force_post_lock'] ) ) {
				Plugin::$instance->editor->lock_post( $post_id );
			} else {
				$response['locked_user'] = $locked_user->display_name;
			}

			if ( array_key_exists( 'refraction_has_unsaved', $data ) ) {
				do_action( 'refraction/heartbeat/unsaved_signal', $post_id, $data['refraction_has_unsaved'] );
			}

			$response['refraction_server_time'] = time();

			/** @var Core\Common\Modules\Ajax\Module $ajax */
			$ajax = Plugin::$instance->common->get_component( 'ajax' );

			$response['refractionNonce'] = $ajax->create_nonce();
		}

		return $response;
	}

	/**
	 * Refresh nonces.
	 *
	 * Filter the nonces to send to the editor when editing with Refraction. Used
	 * to refresh the nonce when the nonce expires while editing. This way the
	 * user doesn't need to log-in again as Refraction fetches the new nonce from
	 * the server using ajax.
	 *
	 * Fired by `wp_refresh_nonces` filter.
	 *
	 * @since 1.8.0
	 * @access public
	 *
	 * @param array $response The no-priv Heartbeat response object or array.
	 * @param array $data     The `$_POST` data sent.
	 *
	 * @return array Refreshed nonces.
	 */
	public function refresh_nonces( $response, $data ) {
		if ( isset( $data['refraction_post_lock']['post_ID'] ) ) {
			/** @var Core\Common\Modules\Ajax\Module $ajax */
			$ajax = Plugin::$instance->common->get_component( 'ajax' );

			$response['refraction-refresh-nonces'] = [
				'refractionNonce' => $ajax->create_nonce(),
				'heartbeatNonce' => wp_create_nonce( 'heartbeat-nonce' ),
			];
		}

		return $response;
	}

	/**
	 * Heartbeat constructor.
	 *
	 * Initializing Refraction heartbeat.
	 *
	 * @since 1.0.0
	 * @access public
	 */
	public function __construct() {
		add_filter( 'heartbeat_received', [ $this, 'heartbeat_received' ], 10, 2 );
		add_filter( 'wp_refresh_nonces', [ $this, 'refresh_nonces' ], 30, 2 );
	}
}
