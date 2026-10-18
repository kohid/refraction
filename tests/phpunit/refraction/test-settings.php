<?php
namespace Refraction\Testing;

use RefractionEditorTesting\Refraction_Test_Base;

class Refraction_Test_Settings extends Refraction_Test_Base {

	public function test_validationsCheckboxList() {
		$this->assertEquals( [], \Refraction\Settings_Validations::checkbox_list( null ) );
		$this->assertEquals( [ 'a', 'b' ], \Refraction\Settings_Validations::checkbox_list( [ 'a', 'b' ] ) );
	}
}
