<?php
namespace Refraction\Tests\Phpunit\Refraction\Data\V2\Base\Mock\AllChildren;

use Refraction\Tests\Phpunit\Refraction\Data\V2\Base\Mock\Template\Endpoint;
use Refraction\Data\V2\Base\Endpoint\Index;

class Controller extends \Refraction\Tests\Phpunit\Refraction\Data\V2\Base\Mock\Template\Controller {

	/**
	 * @inheritdoc
	 * @var Endpoint[]
	 */
	public $endpoints;

	public function register_endpoints() {
		$this->register_endpoint( $this->get_new_wrapped_endpoint() );
		$this->register_endpoint( $this->get_new_wrapped_endpoint() );
	}

	public function get_items( $request ) {
		return [
			'someKey' => [
				'fakeKey' => 'fakeValue',
			],
		];
	}

	protected function register_index_endpoint() {
		$this->register_endpoint( new Index\AllChildren( $this ) );
	}

	private function get_new_wrapped_endpoint() {
		$endpoint = new Endpoint( $this );
		$endpoint->set_test_data( 'get_items', rand_long_str( 5 ) );
		return $endpoint;
	}
}
