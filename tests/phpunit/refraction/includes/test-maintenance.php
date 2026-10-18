<?php
namespace Refraction\Testing\Includes;

use RefractionEditorTesting\Refraction_Test_Base;

class Test_Maintenance extends Refraction_Test_Base {

	const OPTION_KEY = 'refraction_font_display';

	public function test_new_install_options() {
		// Arrange.
		$user = $this->act_as_admin();
		delete_option( 'refraction_install_history' );

		// Act.
		\Refraction\Maintenance::insert_defaults_options();

		// Assert.
		$this->assertEquals( 'swap', get_option( static::OPTION_KEY ) );
	}

	public function test_not_new_install_options() {
		// Arrange.
		$user = $this->act_as_admin();
		update_option( 'refraction_install_history', [ '1.0.0' ] );

		// Act.
		\Refraction\Maintenance::insert_defaults_options();

		// Assert.
		$this->assertNotEquals( 'swap', get_option( static::OPTION_KEY ) );
	}
}
