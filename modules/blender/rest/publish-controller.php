<?php
namespace Elementor\Modules\Blender\Rest;

use Elementor\Modules\Blender\Classes\Gltf_Files;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * REST endpoints used by the Refraction Blender add-on.
 *
 * GET  /refraction/v1/blender         Connection check.
 * POST /refraction/v1/blender/models  Upload a .glb (and an optional poster image). With
 *                                     `attachment_id`, the file of that existing attachment is
 *                                     replaced, so every 3D Model widget using it shows the
 *                                     new version without editing the page.
 *
 * Authentication is whatever WordPress accepts for REST; the add-on uses Application Passwords.
 */
class Publish_Controller {

	const API_NAMESPACE = 'refraction/v1';

	const API_BASE = 'blender';

	const META_POSTER = '_refraction_model_poster';

	const META_SOURCE = '_refraction_blender_source';

	public function register_routes(): void {
		register_rest_route( self::API_NAMESPACE, '/' . self::API_BASE, [
			'methods' => WP_REST_Server::READABLE,
			'callback' => [ $this, 'get_status' ],
			'permission_callback' => [ $this, 'check_permission' ],
		] );

		register_rest_route( self::API_NAMESPACE, '/' . self::API_BASE . '/models', [
			'methods' => WP_REST_Server::CREATABLE,
			'callback' => [ $this, 'publish_model' ],
			'permission_callback' => [ $this, 'check_permission' ],
			'args' => [
				'title' => [
					'type' => 'string',
					'sanitize_callback' => 'sanitize_text_field',
				],
				'source' => [
					'type' => 'string',
					'sanitize_callback' => 'sanitize_file_name',
				],
				'attachment_id' => [
					'type' => 'integer',
					'minimum' => 0,
				],
			],
		] );
	}

	public function check_permission(): bool {
		return current_user_can( 'upload_files' );
	}

	public function get_status(): WP_REST_Response {
		$user = wp_get_current_user();

		return new WP_REST_Response( [
			'site' => get_bloginfo( 'name' ),
			'version' => ELEMENTOR_VERSION,
			'user' => $user->display_name,
			'max_upload_size' => wp_max_upload_size(),
		] );
	}

	/**
	 * @param WP_REST_Request $request
	 *
	 * @return WP_REST_Response|WP_Error
	 */
	public function publish_model( WP_REST_Request $request ) {
		$files = $request->get_file_params();

		if ( empty( $files['model'] ) ) {
			return new WP_Error( 'refraction_blender_missing_model', __( 'Send the model as a multipart file field named "model".', 'elementor' ), [ 'status' => 400 ] );
		}

		$attachment_id = (int) $request->get_param( 'attachment_id' );

		if ( $attachment_id ) {
			$error = $this->check_replaceable( $attachment_id );

			if ( $error ) {
				return $error;
			}
		}

		$this->require_media_functions();

		$model = $this->handle_upload( $files['model'] );

		if ( is_wp_error( $model ) ) {
			return $model;
		}

		if ( ! Gltf_Files::is_model_mime_type( $model['type'] ) ) {
			wp_delete_file( $model['file'] );

			return new WP_Error( 'refraction_blender_not_a_model', __( 'The model must be a glTF 2.0 file (.glb or .gltf).', 'elementor' ), [ 'status' => 400 ] );
		}

		$title = (string) $request->get_param( 'title' );

		if ( '' === $title ) {
			$title = pathinfo( $model['file'], PATHINFO_FILENAME );
		}

		$is_new = ! $attachment_id;

		$attachment_id = $is_new
			? $this->insert_attachment( $model, $title )
			: $this->replace_attachment_file( $attachment_id, $model, $title );

		if ( is_wp_error( $attachment_id ) ) {
			wp_delete_file( $model['file'] );

			return $attachment_id;
		}

		$source = (string) $request->get_param( 'source' );

		if ( '' !== $source ) {
			update_post_meta( $attachment_id, self::META_SOURCE, $source );
		}

		if ( ! empty( $files['poster'] ) ) {
			$poster_error = $this->attach_poster( $attachment_id, $files['poster'], $title );

			if ( is_wp_error( $poster_error ) ) {
				return $poster_error;
			}
		}

		$response = new WP_REST_Response( self::get_model_data( $attachment_id ) );
		$response->set_status( $is_new ? 201 : 200 );

		return $response;
	}

	public static function get_model_data( int $attachment_id ): array {
		$poster_id = self::get_poster_id( $attachment_id );

		return [
			'id' => $attachment_id,
			'title' => get_the_title( $attachment_id ),
			'url' => wp_get_attachment_url( $attachment_id ),
			'mime_type' => get_post_mime_type( $attachment_id ),
			'poster' => $poster_id ? [
				'id' => $poster_id,
				'url' => wp_get_attachment_url( $poster_id ),
			] : null,
			'edit_link' => get_edit_post_link( $attachment_id, 'raw' ),
		];
	}

	public static function get_poster_id( int $attachment_id ): int {
		$poster_id = (int) get_post_meta( $attachment_id, self::META_POSTER, true );

		if ( ! $poster_id || 'attachment' !== get_post_type( $poster_id ) ) {
			return 0;
		}

		return $poster_id;
	}

	/**
	 * @return WP_Error|null Null when the attachment can be replaced.
	 */
	private function check_replaceable( int $attachment_id ) {
		if ( 'attachment' !== get_post_type( $attachment_id ) || ! Gltf_Files::is_model_mime_type( get_post_mime_type( $attachment_id ) ) ) {
			return new WP_Error( 'refraction_blender_unknown_model', __( 'The attachment to update does not exist or is not a 3D model. Publish it as a new model instead.', 'elementor' ), [ 'status' => 404 ] );
		}

		if ( ! current_user_can( 'edit_post', $attachment_id ) ) {
			return new WP_Error( 'refraction_blender_forbidden', __( 'You are not allowed to update this model.', 'elementor' ), [ 'status' => rest_authorization_required_code() ] );
		}

		return null;
	}

	private function require_media_functions(): void {
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';
	}

	/**
	 * Moves an uploaded file into the uploads folder, the same way core's media endpoint does.
	 *
	 * @param array $file One entry of `$_FILES`.
	 *
	 * @return array|WP_Error `file`, `url` and `type` on success.
	 */
	private function handle_upload( array $file ) {
		$overrides = [ 'test_form' => false ];

		// Unit tests cannot produce real uploaded files.
		if ( defined( 'DIR_TESTDATA' ) && DIR_TESTDATA ) {
			$overrides['action'] = 'wp_handle_mock_upload';
		}

		$uploaded = wp_handle_upload( $file, $overrides );

		if ( isset( $uploaded['error'] ) ) {
			return new WP_Error( 'refraction_blender_upload_failed', $uploaded['error'], [ 'status' => 400 ] );
		}

		return $uploaded;
	}

	/**
	 * @return int|WP_Error
	 */
	private function insert_attachment( array $upload, string $title, int $parent_id = 0 ) {
		$attachment_id = wp_insert_attachment( [
			'post_mime_type' => $upload['type'],
			'guid' => $upload['url'],
			'post_title' => $title,
			'post_content' => '',
			'post_status' => 'inherit',
		], $upload['file'], $parent_id, true );

		if ( is_wp_error( $attachment_id ) ) {
			return $attachment_id;
		}

		wp_update_attachment_metadata( $attachment_id, wp_generate_attachment_metadata( $attachment_id, $upload['file'] ) );

		return $attachment_id;
	}

	/**
	 * Points an existing attachment at a newly uploaded file and removes the old one.
	 *
	 * The new file gets its own name, so its URL changes and browsers do not show a cached copy.
	 *
	 * @return int|WP_Error
	 */
	private function replace_attachment_file( int $attachment_id, array $upload, string $title ) {
		$old_file = get_attached_file( $attachment_id );

		$updated = wp_update_post( [
			'ID' => $attachment_id,
			'post_title' => $title,
			'post_mime_type' => $upload['type'],
		], true );

		if ( is_wp_error( $updated ) ) {
			return $updated;
		}

		update_attached_file( $attachment_id, $upload['file'] );
		wp_update_attachment_metadata( $attachment_id, wp_generate_attachment_metadata( $attachment_id, $upload['file'] ) );

		if ( $old_file && $old_file !== $upload['file'] ) {
			$uploads = wp_get_upload_dir();
			wp_delete_file_from_directory( $old_file, $uploads['basedir'] );
		}

		return $attachment_id;
	}

	/**
	 * @return true|WP_Error
	 */
	private function attach_poster( int $model_id, array $file, string $title ) {
		$upload = $this->handle_upload( $file );

		if ( is_wp_error( $upload ) ) {
			return $upload;
		}

		if ( ! in_array( $upload['type'], [ 'image/png', 'image/jpeg', 'image/webp' ], true ) ) {
			wp_delete_file( $upload['file'] );

			return new WP_Error( 'refraction_blender_bad_poster', __( 'The poster must be a PNG, JPEG or WebP image.', 'elementor' ), [ 'status' => 400 ] );
		}

		/* translators: %s: 3D model title. */
		$poster_id = $this->insert_attachment( $upload, sprintf( __( '%s (poster)', 'elementor' ), $title ), $model_id );

		if ( is_wp_error( $poster_id ) ) {
			wp_delete_file( $upload['file'] );

			return $poster_id;
		}

		$old_poster_id = self::get_poster_id( $model_id );

		update_post_meta( $model_id, self::META_POSTER, $poster_id );

		// Only remove the previous poster if it was created for this model.
		if ( $old_poster_id && wp_get_post_parent_id( $old_poster_id ) === $model_id && current_user_can( 'delete_post', $old_poster_id ) ) {
			wp_delete_attachment( $old_poster_id, true );
		}

		return true;
	}
}
