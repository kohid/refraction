<?php
namespace Refraction\Modules\FormBuilder\Widgets;

use Refraction\Modules\FormBuilder\Base\Field_Widget;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** The Form Builder "email" field as an editor widget (see Base\Field_Widget). */
class Field_Email extends Field_Widget {

	protected function field_type(): string {
		return 'email';
	}

	public function get_icon() {
		return 'rficon-envelope';
	}

	protected function features(): array {
		return [ 'placeholder', 'default', 'required' ];
	}
}
