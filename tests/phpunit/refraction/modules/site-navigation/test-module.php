<?php

namespace Refraction\Tests\Phpunit\Refraction\Modules\SiteNavigation;

use RefractionEditorTesting\Refraction_Test_Base;
use Refraction\Modules\SiteNavigation\Module as SiteNavigation;
use Refraction\Core\Experiments\Manager as Experiments_Manager;
use Refraction\Plugin;

class Refraction_Test_Module extends Refraction_Test_Base {
	private $original_experiment_default_state;

	public function setUp(): void {
		parent::setUp();

		remove_all_filters( 'refraction/editor/v2/scripts/env' );

		$this->original_experiment_default_state = Plugin::$instance->experiments
			->get_features( SiteNavigation::PAGES_PANEL_EXPERIMENT_NAME )['default'];
	}

	public function tearDown(): void {
		parent::tearDown();

		Plugin::$instance->experiments->set_feature_default_state(
			SiteNavigation::PAGES_PANEL_EXPERIMENT_NAME,
			$this->original_experiment_default_state
		);
	}


	public function test_construct_experiment_inactive() {
		// Arrange
		Plugin::$instance->experiments->set_feature_default_state(
			SiteNavigation::PAGES_PANEL_EXPERIMENT_NAME,
			Experiments_Manager::STATE_INACTIVE
		);

		// Act.
		$module = new SiteNavigation();

		// Assert.
		$env = apply_filters( 'refraction/editor/v2/scripts/env', [] );
		$this->assertFalse( $env['@refraction/editor-site-navigation']['is_pages_panel_active'] );
	}

	public function test_construct_experiment_active() {
		// Arrange
		Plugin::$instance->experiments->set_feature_default_state(
			SiteNavigation::PAGES_PANEL_EXPERIMENT_NAME,
			Experiments_Manager::STATE_ACTIVE
		);

		// Act.
		$module = new SiteNavigation();

		// Assert.
		$env = apply_filters( 'refraction/editor/v2/scripts/env', [] );
		$this->assertTrue( $env['@refraction/editor-site-navigation']['is_pages_panel_active'] );
	}
}
