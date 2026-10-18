<?php
namespace Refraction\Tests\Phpunit\Refraction\Data\Base\Mock\Template\Endpoint;

use Refraction\Tests\Phpunit\Refraction\Data\Base\Mock\Template\BaseTrait;

class Format extends \Refraction\Data\Base\Endpoint {

	/**
	 * @var \Refraction\Tests\Phpunit\Refraction\Data\Base\Mock\Template\Controller
	 */
	protected $controller;

	use BaseTrait;

	public function get_type() {
		return 'endpoint';
	}

	public static function get_format() {
		return '{arg_id}';
	}

	protected function register() {
		// Can be part of BaseTrait.
		if ( ! $this->controller->bypass_register_status ) {
			parent::register();
		}
	}
}
