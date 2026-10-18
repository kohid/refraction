<?php
namespace Refraction\Tests\Phpunit\Refraction\Data\V2\Base\Mock\Template\Endpoint;

use Refraction\Tests\Phpunit\Refraction\Data\V2\Base\Mock\Template\Endpoint;
use Refraction\Tests\Phpunit\Refraction\Data\V2\Base\Mock\Template\Traits\Mock_Force_Permission;

class Bypass_Permission extends Endpoint {
	use Mock_Force_Permission;
}
