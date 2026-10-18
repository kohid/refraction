<?php
namespace Refraction\Tests\Phpunit\Refraction\Core\Common\DevTools;

use RefractionEditorTesting\Refraction_Test_Base;
use Refraction\Modules\DevTools\Module;

class Refraction_Test_Module extends Refraction_Test_Base {
	/**
	 * @var \Refraction\Modules\DevTools\Module
	 */
	private $module;

	public function setUp(): void {
		parent::setUp();

		$this->module = new Module();
	}

	public function test_get_settings() {
		// Act.
		$settings = $this->module->get_settings();

		// Assert.
		$this->assertArrayHasKey( 'isDebug', $settings );
		$this->assertArrayHasKey( 'urls', $settings );
		$this->assertArrayHasKey( 'deprecation', $settings );
	}
}
