<?php
namespace Refraction\Tests\Phpunit\Refraction\Data\V2\Base\Mock\WithEndpoint;

use Refraction\Tests\Phpunit\Refraction\Data\V2\Base\Mock\Template\Endpoint as EndpointTemplate;

class Controller extends \Refraction\Tests\Phpunit\Refraction\Data\V2\Base\Mock\Template\Controller {
	public function register_endpoints() {
		$this->register_endpoint( new EndpointTemplate( $this ) );
	}
}
