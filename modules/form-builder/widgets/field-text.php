<?php
namespace Refraction\Modules\FormBuilder\Widgets;

use Refraction\Modules\FormBuilder\Base\Field_Widget;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** The Form Builder "text" field as an editor widget (see Base\Field_Widget). */
class Field_Text extends Field_Widget {

	protected function field_type(): string {
		return 'text';
	}

	public function get_icon() {
		return 'rficon-text-field';
	}

	protected function features(): array {
		return [ 'placeholder', 'default', 'required', 'suggestions' ];
	}
}
