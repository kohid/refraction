<?php

namespace Refraction\Tests\Phpunit\Refraction\Modules\Checklist;

use Refraction\Core\Experiments\Manager as Experiments_Manager;
use Refraction\Modules\Checklist\Module;
use RefractionEditorTesting\Refraction_Test_Base;

class Test_Module extends Refraction_Test_Base {

	public function test_experiment_is_hidden_and_inactive_by_default(): void {
		$experiment = Module::get_experimental_data();

		$this->assertSame( Module::EXPERIMENT_NAME, $experiment['name'] );
		$this->assertTrue( $experiment['hidden'] );
		$this->assertSame( Experiments_Manager::STATE_INACTIVE, $experiment['default'] );
		$this->assertSame( Experiments_Manager::RELEASE_STATUS_STABLE, $experiment['release_status'] );
	}
}
