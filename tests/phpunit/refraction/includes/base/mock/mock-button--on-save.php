<?php

namespace Refraction\Tests\Phpunit\Includes\Base\Mock;

class Mock_Button__On_Save extends \Refraction\Widget_Button {
	protected function on_save( array $settings ) {
		return [ 'text' => 'On Save' ];
	}
}
