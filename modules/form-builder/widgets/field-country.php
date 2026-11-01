<?php
namespace Refraction\Modules\FormBuilder\Widgets;

use Refraction\Modules\FormBuilder\Base\Field_Widget;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** The Form Builder "country" field as an editor widget (see Base\Field_Widget). */
class Field_Country extends Field_Widget {

	protected function field_type(): string {
		return 'country';
	}

	public function get_icon() {
		return 'rficon-globe';
	}

	protected function features(): array {
		return [ 'placeholder', 'default', 'required' ];
	}
}
