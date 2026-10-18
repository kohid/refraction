<?php
namespace Refraction\Tests\Phpunit\Refraction\Data\Base\Mock\Processor;

use Refraction\Tests\Phpunit\Refraction\Data\Base\Mock\Template\Processor;

class Controller extends \Refraction\Tests\Phpunit\Refraction\Data\Base\Mock\Template\Controller {

	public function register_processors() {
		$this->register_processor( Processor::class );
	}
}
