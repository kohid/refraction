<?php
namespace Refraction\Modules\FormBuilder\Widgets;

use Refraction\Modules\FormBuilder\Base\Field_Widget;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** The Form Builder "checkbox" field as an editor widget (see Base\Field_Widget). */
class Field_Checkbox extends Field_Widget {

	protected function field_type(): string {
		return 'checkbox';
	}

	public function get_icon() {
		return 'rficon-checkbox';
	}

	protected function features(): array {
		return [ 'options', 'required' ];
	}
}
