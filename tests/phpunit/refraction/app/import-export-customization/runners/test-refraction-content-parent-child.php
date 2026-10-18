<?php
namespace Refraction\Tests\Phpunit\Refraction\App\ImportExportCustomization\Runners;

use Refraction\App\Modules\ImportExportCustomization\Runners\Export\Refraction_Content as Export_Refraction_Content;
use Refraction\App\Modules\ImportExportCustomization\Runners\Import\Refraction_Content as Import_Refraction_Content;
use Refraction\Plugin;
use RefractionEditorTesting\Refraction_Test_Base;

class Test_Refraction_Content_Parent_Child extends Refraction_Test_Base {

	public function test_get_imported_parent_id_returns_mapped_parent_when_available() {
		$this->act_as_admin();

		$mock_imported_data = [];
		$mock_post_settings = [
			'parent' => [
				'id' => 100,
				'title' => 'Parent Page',
				'doc_type' => 'wp-page',
			],
			'child' => [
				'id' => 200,
				'title' => 'Child Page',
				'doc_type' => 'wp-page',
				'post_parent' => 100,
			],
		];

		$importer = new Import_Refraction_Content();
		$importer->import( [
			'session_id' => 'test-session',
			'customization' => [ 'content' => null ],
		], $mock_imported_data);

		$reflection = new \ReflectionClass( $importer );
		$method = $reflection->getMethod( 'get_imported_parent_id' );
		$method->setAccessible( true );

		$property = $reflection->getProperty( 'processed_posts' );
		$property->setAccessible( true );
		$property->setValue( $importer, [ 100 => 500 ] );

		$result = $method->invoke( $importer, [ 'post_parent' => 100 ], 200 );

		$this->assertEquals( 500, $result );
	}
}
