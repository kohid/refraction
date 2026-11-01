<?php
namespace Refraction\Modules\FormBuilder\Widgets;

use Refraction\Modules\FormBuilder\Base\Field_Widget;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** The Form Builder "signature" field as an editor widget (see Base\Field_Widget). */
class Field_Signature extends Field_Widget {

	protected function field_type(): string {
		return 'signature';
	}

	public function get_icon() {
		return 'rficon-edit';
	}

	protected function features(): array {
		return [ 'required', 'placeholder', 'pad' ];
	}
}
