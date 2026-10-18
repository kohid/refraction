<?php
namespace Refraction\Tests\Phpunit\Refraction\Core\Experiments\Mock\Modules;

use Refraction\Core\Base\Module;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Module_B extends Module {

	public function get_name() {
		return 'module-b';
	}
}
