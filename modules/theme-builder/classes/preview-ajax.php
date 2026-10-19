<?php
namespace Refraction\Modules\ThemeBuilder\Classes;

use Refraction\Modules\ThemeBuilder\Documents\Theme_Document;
use Refraction\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * "Apply & Preview" in the editor: stores the chosen preview target in the template's page settings so the next
 * widget render (and the next editor load) uses it.
 *
 * Request: admin-ajax.php?action=refraction_theme_builder_preview_apply, POST `_nonce`, `post_id`, `target` (JSON).
 * Needs the capability to edit that template.
 */
class Preview_Ajax {

	const ACTION = 'refraction_theme_builder_preview_apply';

	public function __construct() {
		add_action( 'wp_ajax_' . self::ACTION, [ $this, 'handle' ] );
	}

	public function handle(): void {
		if ( ! check_ajax_referer( Conditions_Ajax::NONCE, '_nonce', false ) ) {
			wp_send_json_error( [ 'message' => esc_html__( 'Your session expired. Reload the editor and try again.', 'refraction' ) ], 403 );
		}

		$post_id = isset( $_POST['post_id'] ) ? absint( $_POST['post_id'] ) : 0;
		$document = $post_id ? Plugin::$instance->documents->get( $post_id ) : null;

		if ( ! $document instanceof Theme_Document || ! current_user_can( 'edit_post', $post_id ) ) {
			wp_send_json_error( [ 'message' => esc_html__( 'You are not allowed to change this template.', 'refraction' ) ], 403 );
		}

		$raw = isset( $_POST['target'] ) ? json_decode( sanitize_text_field( wp_unslash( $_POST['target'] ) ), true ) : [];
		$target = Preview_Target::sanitize( $document->get_location(), $raw );

		$settings = get_post_meta( $post_id, '_refraction_page_settings', true );
		$settings = is_array( $settings ) ? $settings : [];
		$settings[ Preview_Target::SETTING ] = $target;

		update_post_meta( $post_id, '_refraction_page_settings', $settings );

		wp_send_json_success( [ 'target' => $target ] );
	}
}
