<?php
namespace Refraction\Tests\Phpunit\Refraction\Data\V2\Base\Mock\Processor;

use Refraction\Tests\Phpunit\Refraction\Data\V2\Base\Mock\Template\Processor;

class Controller extends \Refraction\Tests\Phpunit\Refraction\Data\V2\Base\Mock\Template\Controller {

	public function register_processors() {
		$this->register_processor( new Processor( $this ) );
	}
}
