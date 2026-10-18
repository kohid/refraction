<?php
namespace Refraction\Testing\Modules\Library;

use Refraction\Modules\Library\Module;
use RefractionEditorTesting\Refraction_Test_Base;
use RefractionEditorTesting\Traits\Refraction_Library;

class Refraction_Test_Module extends Refraction_Test_Base {

	use Refraction_Library;

	/** @var Module */
	private static $module;

	public function test_should_confirm_module_activation() {
		self::$module = new Module();

		$this->assert_document_type_registered( 'page' );
		$this->assert_document_type_registered( 'section' );
	}

	public function test_should_return_library() {
		$this->assertEquals( 'library', self::$module->get_name() );
	}
}
