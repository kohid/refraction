<?php
namespace Elementor\Tests\Phpunit\Elementor\Modules\Blender\Rest;

use Elementor\Modules\Blender\Rest\Publish_Controller;
use Elementor\Tests\Phpunit\Elementor\Modules\Blender\Test_Gltf_Files;
use ElementorEditorTesting\Elementor_Test_Base;
use WP_REST_Request;

require_once dirname( __DIR__ ) . '/test-gltf-files.php';

class Test_Publish_Controller extends Elementor_Test_Base {

	const STATUS_ROUTE = '/refraction/v1/blender';

	const MODELS_ROUTE = '/refraction/v1/blender/models';

	// 1x1 transparent PNG.
	const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

	private $created_attachments = [];

	public function setUp(): void {
		parent::setUp();

		global $wp_rest_server;
		$wp_rest_server = new \WP_REST_Server();
		do_action( 'rest_api_init' );
	}

	public function tearDown(): void {
		foreach ( $this->created_attachments as $attachment_id ) {
			wp_delete_attachment( $attachment_id, true );
		}

		parent::tearDown();
	}

	private function make_upload( string $name, string $contents, string $type ): array {
		$tmp = wp_tempnam( $name );
		file_put_contents( $tmp, $contents );

		return [
			'name' => $name,
			'type' => $type,
			'tmp_name' => $tmp,
			'error' => UPLOAD_ERR_OK,
			'size' => strlen( $contents ),
		];
	}

	private function glb_upload( string $name = 'chair.glb', string $payload = '' ): array {
		return $this->make_upload( $name, Test_Gltf_Files::make_glb( 2, null, $payload ), 'model/gltf-binary' );
	}

	private function poster_upload(): array {
		// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode
		return $this->make_upload( 'chair-poster.png', base64_decode( self::PNG_BASE64 ), 'image/png' );
	}

	private function publish( array $files, array $params = [] ) {
		$request = new WP_REST_Request( 'POST', self::MODELS_ROUTE );
		$request->set_file_params( $files );

		foreach ( $params as $key => $value ) {
			$request->set_param( $key, $value );
		}

		$response = rest_get_server()->dispatch( $request );
		$data = $response->get_data();

		if ( isset( $data['id'] ) ) {
			$this->created_attachments[] = $data['id'];

			if ( ! empty( $data['poster']['id'] ) ) {
				$this->created_attachments[] = $data['poster']['id'];
			}
		}

		return $response;
	}

	public function test_routes_are_registered() {
		$routes = rest_get_server()->get_routes();

		$this->assertArrayHasKey( self::STATUS_ROUTE, $routes );
		$this->assertArrayHasKey( self::MODELS_ROUTE, $routes );
	}

	public function test_status_requires_upload_permission() {
		$this->act_as_subscriber();

		$response = rest_get_server()->dispatch( new WP_REST_Request( 'GET', self::STATUS_ROUTE ) );

		$this->assertSame( 403, $response->get_status() );
	}

	public function test_status_for_editor() {
		$this->act_as_editor();

		$response = rest_get_server()->dispatch( new WP_REST_Request( 'GET', self::STATUS_ROUTE ) );

		$this->assertSame( 200, $response->get_status() );
		$this->assertSame( ELEMENTOR_VERSION, $response->get_data()['version'] );
	}

	public function test_publish_is_forbidden_for_subscriber() {
		$this->act_as_subscriber();

		$response = $this->publish( [ 'model' => $this->glb_upload() ] );

		$this->assertSame( 403, $response->get_status() );
	}

	public function test_publish_without_model_is_rejected() {
		$this->act_as_editor();

		$response = $this->publish( [] );

		$this->assertSame( 400, $response->get_status() );
		$this->assertSame( 'refraction_blender_missing_model', $response->get_data()['code'] );
	}

	public function test_publish_creates_model_with_poster() {
		$this->act_as_editor();

		$response = $this->publish(
			[
				'model' => $this->glb_upload(),
				'poster' => $this->poster_upload(),
			],
			[
				'title' => 'Chair',
				'source' => 'chair.blend',
			]
		);
		$data = $response->get_data();

		$this->assertSame( 201, $response->get_status(), wp_json_encode( $data ) );
		$this->assertSame( 'Chair', $data['title'] );
		$this->assertSame( 'model/gltf-binary', $data['mime_type'] );
		$this->assertStringEndsWith( '.glb', $data['url'] );
		$this->assertSame( 'chair.blend', get_post_meta( $data['id'], Publish_Controller::META_SOURCE, true ) );

		$this->assertNotNull( $data['poster'] );
		$this->assertSame( $data['poster']['id'], Publish_Controller::get_poster_id( $data['id'] ) );
		$this->assertSame( $data['id'], wp_get_post_parent_id( $data['poster']['id'] ) );
	}

	public function test_publish_rejects_files_that_are_not_gltf() {
		$this->act_as_editor();

		$response = $this->publish( [ 'model' => $this->make_upload( 'chair.glb', '<?php echo 1;', 'model/gltf-binary' ) ] );

		$this->assertSame( 400, $response->get_status() );
	}

	public function test_publish_rejects_other_allowed_file_types_as_model() {
		$this->act_as_editor();

		$response = $this->publish( [ 'model' => $this->poster_upload() ] );

		$this->assertSame( 400, $response->get_status() );
		$this->assertSame( 'refraction_blender_not_a_model', $response->get_data()['code'] );
	}

	public function test_republish_replaces_file_and_poster_of_same_attachment() {
		$this->act_as_editor();

		$first = $this->publish( [
			'model' => $this->glb_upload(),
			'poster' => $this->poster_upload(),
		] )->get_data();
		$old_file = get_attached_file( $first['id'] );

		$second_response = $this->publish(
			[
				'model' => $this->glb_upload( 'chair.glb', str_repeat( "\0", 8 ) ),
				'poster' => $this->poster_upload(),
			],
			[
				'attachment_id' => $first['id'],
				'title' => 'Chair v2',
			]
		);
		$second = $second_response->get_data();

		$this->assertSame( 200, $second_response->get_status(), wp_json_encode( $second ) );
		$this->assertSame( $first['id'], $second['id'] );
		$this->assertSame( 'Chair v2', $second['title'] );
		$this->assertNotSame( $first['url'], $second['url'] );
		$this->assertFileDoesNotExist( $old_file );
		$this->assertSame( 20, filesize( get_attached_file( $second['id'] ) ) );

		$this->assertNotSame( $first['poster']['id'], $second['poster']['id'] );
		$this->assertNull( get_post( $first['poster']['id'] ) );
	}

	public function test_republish_to_unknown_attachment_is_not_found() {
		$this->act_as_editor();

		$image_id = self::factory()->attachment->create( [ 'post_mime_type' => 'image/png' ] );

		$response = $this->publish( [ 'model' => $this->glb_upload() ], [ 'attachment_id' => $image_id ] );

		$this->assertSame( 404, $response->get_status() );
		$this->assertSame( 'refraction_blender_unknown_model', $response->get_data()['code'] );
	}

	public function test_republish_needs_edit_permission_on_the_attachment() {
		$this->act_as_admin();
		$model = $this->publish( [ 'model' => $this->glb_upload() ] )->get_data();

		$this->act_as( 'author' );
		$response = $this->publish( [ 'model' => $this->glb_upload() ], [ 'attachment_id' => $model['id'] ] );

		$this->assertSame( 403, $response->get_status() );
		$this->assertSame( 'refraction_blender_forbidden', $response->get_data()['code'] );
	}
}
