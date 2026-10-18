<?php

namespace Refraction\Testing\Modules\WpRest;

use RefractionEditorTesting\Refraction_Test_Base;

class Test_Refraction_User_Meta extends Refraction_Test_Base {
	private $user_id;
	private $rest_field;

	public function setUp(): void {
		parent::setUp();
		$this->user_id = $this->factory()->create_and_get_administrator_user()->ID;

		$this->act_as_admin();

		do_action( 'rest_api_init' );
	}

	public function test_get_introduction_meta() {
		// Arrange
		$test_data = [ 'ai_get_started' => true ];
		update_user_meta( $this->user_id, 'refraction_introduction', $test_data );
		$request = new \WP_REST_Request( 'GET', '/wp/v2/users/' . $this->user_id );

		// Act
		$response = rest_get_server()->dispatch( $request );
		$data = $response->get_data();

		// Assert
		$this->assertEquals( 200, $response->get_status() );
		$this->assertArrayHasKey( 'refraction_introduction', $data );
		$this->assertEquals( $test_data, $data['refraction_introduction'] );
	}

	public function test_update_introduction_meta() {
		// Arrange
		$test_data = [
			'refraction_introduction' => [
				'ai_get_started' => true,
			],
		];
		$request = new \WP_REST_Request( 'POST', '/wp/v2/users/' . $this->user_id );
		$request->set_body_params( $test_data );

		// Act
		$response = rest_get_server()->dispatch( $request );
		$data = $response->get_data();

		// Assert
		$this->assertEquals( 200, $response->get_status() );
		$this->assertEquals( $test_data['refraction_introduction'], $data['refraction_introduction'] );
	}

	public function test_patch_introduction_meta() {
		// Arrange
		$initial_data = [
			'ai_get_started' => false,
			'existing_key' => 'value',
		];
		update_user_meta( $this->user_id, 'refraction_introduction', $initial_data );

		$patch_data = [
			'refraction_introduction' => [
				'ai_get_started' => true,
			],
		];
		$request = new \WP_REST_Request( 'PATCH', '/wp/v2/users/' . $this->user_id );
		$request->set_body_params( $patch_data );

		// Act
		$response = rest_get_server()->dispatch( $request );
		$data = $response->get_data();

		// Assert
		$this->assertEquals( 200, $response->get_status() );
		$this->assertEquals( true, $data['refraction_introduction']['ai_get_started'] );
		$this->assertEquals( 'value', $data['refraction_introduction']['existing_key'] );
	}

	public function test_update_introduction_meta_invalid_type() {
		// Arrange
		$test_data = [
			'refraction_introduction' => [
				'ai_get_started' => 'not_a_boolean',
			],
		];
		$request = new \WP_REST_Request( 'POST', '/wp/v2/users/' . $this->user_id );
		$request->set_body_params( $test_data );

		// Act
		$response = rest_get_server()->dispatch( $request );
		$data = $response->get_data();

		// Assert
		$this->assertEquals( 400, $response->get_status() );
		$this->assertEquals( 'rest_invalid_param', $data['code'] );
	}

	public function test_update_additional_properties() {
		// Arrange
		$test_data = [
			'refraction_introduction' => [
				'additional_property' => true,
			],
		];
		$request = new \WP_REST_Request( 'POST', '/wp/v2/users/' . $this->user_id );
		$request->set_body_params( $test_data );

		// Act
		$response = rest_get_server()->dispatch( $request );
		$data = $response->get_data();

		// Assert
		$this->assertEquals( 200, $response->get_status() );
		$this->assertEquals( $test_data['refraction_introduction'], $data['refraction_introduction'] );
	}
}
