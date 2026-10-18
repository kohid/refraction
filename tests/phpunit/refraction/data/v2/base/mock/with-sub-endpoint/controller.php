<?php
namespace Refraction\Tests\Phpunit\Refraction\Data\V2\Base\Mock\WithSubEndpoint;

use Refraction\Tests\Phpunit\Refraction\Data\V2\Base\Mock\Template\Endpoint;

class Controller extends \Refraction\Tests\Phpunit\Refraction\Data\V2\Base\Mock\Template\Controller {

	/**
	 * @var \Refraction\Data\V2\Base\Endpoint|Endpoint
	 */
	protected $test_endpoint;

	/**
	 * @var \Refraction\Data\V2\Base\Endpoint|Endpoint
	 */
	protected $test_sub_endpoint;

	public function register_endpoints() {
		$this->test_endpoint = $this->register_endpoint( new Endpoint( $this ) );
		$this->test_sub_endpoint = $this->test_endpoint->register_sub_endpoint( new Endpoint( $this->test_endpoint ) );
	}

	public function get_test_endpoint() {
		return $this->test_endpoint;
	}

	public function get_test_sub_endpoint() {
		return $this->test_sub_endpoint;
	}
}
