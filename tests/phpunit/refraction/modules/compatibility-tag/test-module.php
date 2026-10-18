<?php
namespace Refraction\Testing\Modules\CompatibilityTag;

use Refraction\Core\Utils\Collection;
use RefractionEditorTesting\Refraction_Test_Base;
use Refraction\Modules\CompatibilityTag\Module;
use Refraction\Modules\CompatibilityTag\Compatibility_Tag;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Test_Module extends Refraction_Test_Base {
	public function test_on_plugin_update_message() {
		$this->mock_wp_api( [
			'get_plugins' => new Collection( [
				'old' => [
					'Name' => 'old version plugin',
					Module::PLUGIN_VERSION_TESTED_HEADER => '2.9.0',
				],
				'invalid' => [
					'Name' => 'invalid version plugin',
					Module::PLUGIN_VERSION_TESTED_HEADER => 'a.b.10',
				],
				'patch' => [
					'Name' => 'patch version plugin',
					Module::PLUGIN_VERSION_TESTED_HEADER => '3.1.0',
				],
				'tested' => [
					'Name' => 'tested version plugin',
					Module::PLUGIN_VERSION_TESTED_HEADER => '3.1.5',
				],
				'not_exists' => [
					'Name' => 'header not exists plugin',
					Module::PLUGIN_VERSION_TESTED_HEADER => '',
				],
				'extends_refraction' => [
					'Name' => 'extends refraction',
					Module::PLUGIN_VERSION_TESTED_HEADER => '',
				],
				'regular' => [
					'Name' => 'regular plugins',
					Module::PLUGIN_VERSION_TESTED_HEADER => '',
				],
				'refraction/refraction.php' => [
					'Name' => 'refraction core',
					Module::PLUGIN_VERSION_TESTED_HEADER => ''
				],
				'refraction-beta/refraction-beta.php' => [
					'Name' => 'refraction beta',
					Module::PLUGIN_VERSION_TESTED_HEADER => ''
				],
			] ),
		] );

		new Module();

		// Act
		ob_start();
		do_action('in_plugin_update_message-' . REFRACTION_PLUGIN_BASE, [
			'new_version' => '3.1.5',
			'Version' => '3.0.0'
		] );

		$result = ob_get_clean();

		// Assert
		$this->assertMatchesRegularExpression( '/old version plugin/', $result );
		$this->assertMatchesRegularExpression( '/invalid version plugin/', $result );
		$this->assertDoesNotMatchRegularExpression( '/patch version plugin/', $result );
		$this->assertDoesNotMatchRegularExpression( '/tested version plugin/', $result );
		$this->assertDoesNotMatchRegularExpression( '/header not exists plugin/', $result );
		$this->assertMatchesRegularExpression( '/extends refraction/', $result );
		$this->assertDoesNotMatchRegularExpression( '/regular plugins/', $result );
		$this->assertDoesNotMatchRegularExpression( '/refraction core/', $result );
		$this->assertDoesNotMatchRegularExpression( '/refraction beta/', $result );
	}
}
