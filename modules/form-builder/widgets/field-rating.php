<?php
namespace Refraction\Modules\FormBuilder\Widgets;

use Refraction\Modules\FormBuilder\Base\Field_Widget;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** The Form Builder "rating" field as an editor widget (see Base\Field_Widget). */
class Field_Rating extends Field_Widget {

	protected function field_type(): string {
		return 'rating';
	}

	public function get_icon() {
		return 'rficon-rating';
	}

	protected function features(): array {
		return [ 'required', 'input' ];
	}
}
