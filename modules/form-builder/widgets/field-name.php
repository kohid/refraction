<?php
namespace Refraction\Modules\FormBuilder\Widgets;

use Refraction\Modules\FormBuilder\Base\Field_Widget;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** The Form Builder "name" field as an editor widget (see Base\Field_Widget). */
class Field_Name extends Field_Widget {

	protected function field_type(): string {
		return 'name';
	}

	public function get_icon() {
		return 'rficon-user-circle-o';
	}

	protected function features(): array {
		return [ 'required', 'parts', 'input' ];
	}
}
