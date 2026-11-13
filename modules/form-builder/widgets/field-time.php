<?php
namespace Refraction\Modules\FormBuilder\Widgets;

use Refraction\Modules\FormBuilder\Base\Field_Widget;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** The Form Builder "time" field as an editor widget (see Base\Field_Widget). */
class Field_Time extends Field_Widget {

	protected function field_type(): string {
		return 'time';
	}

	public function get_icon() {
		return 'rficon-clock';
	}

	protected function features(): array {
		return [ 'default', 'required', 'input', 'time_limits' ];
	}
}
