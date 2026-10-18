<?php
namespace Refraction\Testing\Modules\PerformanceLab;

use RefractionEditorTesting\Refraction_Test_Base;
use Refraction\Modules\PerformanceLab\Module as PerformanceLab;
require_once __DIR__ . '/mock.php';
class Refraction_Test_PerformanceLab extends Refraction_Test_Base {

	public function test_performance_lab_get_webp_src() {
		$image_id = $this->factory()->attachment->create_upload_object( REFRACTION_PATH . '/tests/phpunit/resources/pixel.jpg' );
		$image_url = wp_get_attachment_url( $image_id );
		$reflection = new \ReflectionClass( PerformanceLab::class );
		$method = $reflection->getMethod( 'performance_lab_get_webp_src' );
		$method->setAccessible( true );
		$performance_lab = new PerformanceLab();
		$webp_src = $method->invokeArgs( $performance_lab, [ $image_id, 'full', $image_url ] );
		$this->assertEquals( '.webp', substr( $webp_src, -5 ) );

		// Clean up
		wp_delete_attachment( $image_id, true );
	}
}
