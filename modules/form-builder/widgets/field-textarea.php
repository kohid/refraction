<?php
namespace Refraction\Modules\FormBuilder\Widgets;

use Refraction\Modules\FormBuilder\Base\Field_Widget;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** The Form Builder "textarea" field as an editor widget (see Base\Field_Widget). */
class Field_Textarea extends Field_Widget {

	protected function field_type(): string {
		return 'textarea';
	}

	public function get_icon() {
		return 'rficon-text-area';
	}

	protected function features(): array {
		return [ 'placeholder', 'default', 'required' ];
	}
}
