<?php
namespace Refraction\Modules\FormBuilder\Widgets;

use Refraction\Modules\FormBuilder\Base\Field_Widget;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** The Form Builder "datetime" field as an editor widget (see Base\Field_Widget). */
class Field_Datetime extends Field_Widget {

	protected function field_type(): string {
		return 'datetime';
	}

	public function get_icon() {
		return 'rficon-calendar';
	}

	protected function features(): array {
		return [ 'default', 'required', 'input' ];
	}
}
