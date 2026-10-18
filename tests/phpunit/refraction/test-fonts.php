<?php
namespace Refraction\Testing;

use RefractionEditorTesting\Refraction_Test_Base;

class Refraction_Test_Fonts extends Refraction_Test_Base {

	public function test_getAllFonts() {
		$this->assertNotEmpty( \Refraction\Fonts::get_fonts() );
	}

	public function test_getFontType() {
		$this->assertEquals( 'system', \Refraction\Fonts::get_font_type( 'Arial' ) );
		$this->assertFalse( \Refraction\Fonts::get_font_type( 'NotFoundThisFont' ) );
	}

	public function test_getFontByGroups() {
		$this->assertArrayHasKey( 'Arial', \Refraction\Fonts::get_fonts_by_groups( [ 'system' ] ) );
		$this->assertArrayNotHasKey( 'Arial', \Refraction\Fonts::get_fonts_by_groups( [ 'googlefonts' ] ) );
	}
}
