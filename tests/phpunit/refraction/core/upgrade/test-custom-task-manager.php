<?php
namespace Refraction\Tests\Phpunit\Refraction\Core\Upgrade;

use Refraction\Tests\Phpunit\Refraction\Core\Upgrade\Mock\Mock_Custom_Tasks;
use RefractionEditorTesting\Refraction_Test_Base;

class Test_Custom_Task_Manager extends Refraction_Test_Base {
	public function test_add_tasks_requested_to_run() {
		// Arrange.
		$manager = new Custom_Task_Manager();

		// Act.
		$manager->add_tasks_requested_to_run( [ 'test_task_set_global' ] );
		$manager->public_start_run();
		$manager->get_task_runner()->handle_cron_healthcheck();

		// Assert.
		$this->assertTrue( $GLOBALS[ Mock_Custom_Tasks::class ] );

		// Cleanup.
		unset( $GLOBALS[ Mock_Custom_Tasks::class ] );
	}
}
