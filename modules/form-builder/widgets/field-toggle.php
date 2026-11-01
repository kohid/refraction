<?php
namespace Refraction\Modules\FormBuilder\Widgets;

use Refraction\Modules\FormBuilder\Base\Field_Widget;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** The Form Builder "toggle" field as an editor widget (see Base\Field_Widget). */
class Field_Toggle extends Field_Widget {

	protected function field_type(): string {
		return 'toggle';
	}

	public function get_icon() {
		return 'rficon-toggle';
	}

	protected function features(): array {
		return [ 'default', 'required' ];
	}
}
