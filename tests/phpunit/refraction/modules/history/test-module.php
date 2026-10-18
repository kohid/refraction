<?php

namespace Refraction\Testing\Modules\History;

use Refraction\Modules\History\Module;
use RefractionEditorTesting\Refraction_Test_Base;

class Refraction_Test_Manager extends Refraction_Test_Base {

	public function test_should_get_name() {
		$Module = new Module();

		$this->assertEquals( $Module->get_name(), 'history' );
	}
}
