<?php
namespace House;

require 'endpoints/garage.php';

class Controller extends \Refraction\Data\V2\Base\Controller {

	public function get_name() {
		return 'house';
	}

	public function register_endpoints() {
		$this->register_endpoint( new Endpoints\Garage( $this ) );
	}

	public function get_permission_callback( $request ) {
		// Just for the example to work without extra permissions.
		return true;
	}

	protected function register_index_endpoint() {
		$this->register_endpoint( new \Refraction\Data\V2\Base\Endpoint\Index\AllChildren( $this ) );
	}
}
