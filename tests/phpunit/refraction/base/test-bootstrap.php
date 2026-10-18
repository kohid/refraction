<?php
namespace Refraction\Testing;

use RefractionEditorTesting\Refraction_Test_Base;

class Refraction_Test_Bootstrap extends Refraction_Test_Base {
	public function test_plugin_activated() {
		$this->assertTrue( is_plugin_active( PLUGIN_PATH ) );
	}

	public function test_getInstance() {
		$this->assertInstanceOf( '\Refraction\Plugin', \Refraction\Plugin::$instance );
	}

	public function test_Clone() {
		$this->expect_doing_it_wrong('__clone');

		$obj_cloned = clone \Refraction\Plugin::$instance;
	}
}
