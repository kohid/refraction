<?php
namespace Refraction\Tests\Phpunit\Refraction\Core\Upgrade\Mock;

class Mock_Custom_Tasks {
	static function test_task_set_global() {
		$GLOBALS[ self::class ] = true;
	}
}
