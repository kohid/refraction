<?php
namespace Refraction\Testing\Modules\Gutenberg;

use Refraction\Core\Base\Document;
use RefractionEditorTesting\Refraction_Test_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Test_Module extends Refraction_Test_Base {
	public function test_register_refraction_rest_field() {
		// Arrange
		$this->act_as_admin();

		$post = $this->factory()->create_and_get_custom_post( [
			'type' => 'post',
			'meta_input' => [
				Document::BUILT_WITH_REFRACTION_META_KEY => 'builder',
			],
		] );

		do_action( 'rest_api_init' );

		// Act
		$request = new \WP_REST_Request( 'POST', "/wp/v2/posts/{$post->ID}" );

		$request->set_body_params( [
			'gutenberg_refraction_mode' => false,
		] );

		rest_do_request( $request );

		// Assert
		$this->assertEmpty( get_post_meta( $post->ID, Document::BUILT_WITH_REFRACTION_META_KEY, true ) );
	}
}
