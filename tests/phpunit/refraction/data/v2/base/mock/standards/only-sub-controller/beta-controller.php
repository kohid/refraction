<?php
namespace Refraction\Tests\Phpunit\Refraction\Data\V2\Base\Mock\Standards\OnlySubController;

class Beta_Controller extends \Refraction\Tests\Phpunit\Refraction\Data\V2\Base\Mock\Template\Sub_Controller {
	public function get_name() {
		return 'beta';
	}

	public function get_parent_name() {
		return 'alpha';
	}

	public function get_items( $request ) {
		return 'beta-items';
	}

	public function get_item( $request ) {
		return 'beta-item';
	}
}
