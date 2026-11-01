<?php
namespace Refraction\Modules\FormBuilder\Widgets;

use Refraction\Modules\FormBuilder\Base\Field_Widget;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** The Form Builder "radio" field as an editor widget (see Base\Field_Widget). */
class Field_Radio extends Field_Widget {

	protected function field_type(): string {
		return 'radio';
	}

	public function get_icon() {
		return 'rficon-radio';
	}

	protected function features(): array {
		return [ 'options', 'default', 'required' ];
	}
}
