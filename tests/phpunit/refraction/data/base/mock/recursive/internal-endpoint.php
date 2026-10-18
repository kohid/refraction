<?php
namespace Refraction\Tests\Phpunit\Refraction\Data\Base\Mock\Recursive;

use Refraction\Data\Base\Endpoint;

class Internal_Endpoint extends Endpoint {

	public function get_name() {
		return 'index';
	}

	public function get_items( $request ) {
		return $this->controller->get_items_recursive( [ $this ] );
	}
}
