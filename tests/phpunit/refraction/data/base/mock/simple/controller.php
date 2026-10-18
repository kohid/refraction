<?php
namespace Refraction\Tests\Phpunit\Refraction\Data\Base\Mock\Simple;

use Refraction\Tests\Phpunit\Refraction\Data\Base\Mock\Template\Endpoint;

class Controller extends \Refraction\Tests\Phpunit\Refraction\Data\Base\Mock\Template\Controller {

	public function register_endpoints() {
		$this->register_endpoint( Endpoint::class );
	}
}
