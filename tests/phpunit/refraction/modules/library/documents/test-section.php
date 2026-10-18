<?php
namespace Refraction\Testing\Modules\Library\Documents;

use Refraction\Modules\Library\Documents\Section;
use RefractionEditorTesting\Refraction_Test_Base;

class Refraction_Test_Section extends Refraction_Test_Base {

	/** @var Section */
	private static $section;

	public static function setUpBeforeClass(): void {
		self::$section = new Section();

		parent::setUpBeforeClass();
	}

	public function test_should_return_name() {
		$name = self::$section->get_name();

		$this->assertEquals( 'section', $name );
	}

	public function test_should_return_title() {
		$title = Section::get_title();

		$this->assertEquals( esc_html__( 'Section', 'refraction' ), $title );
	}
}
