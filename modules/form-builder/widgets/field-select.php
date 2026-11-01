<?php
namespace Refraction\Modules\FormBuilder\Widgets;

use Refraction\Modules\FormBuilder\Base\Field_Widget;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** The Form Builder "select" field as an editor widget (see Base\Field_Widget). */
class Field_Select extends Field_Widget {

	protected function field_type(): string {
		return 'select';
	}

	public function get_icon() {
		return 'rficon-select';
	}

	protected function features(): array {
		return [ 'placeholder', 'options', 'default', 'required' ];
	}
}
