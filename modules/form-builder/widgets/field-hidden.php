<?php
namespace Refraction\Modules\FormBuilder\Widgets;

use Refraction\Modules\FormBuilder\Base\Field_Widget;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** The Form Builder "hidden" field as an editor widget (see Base\Field_Widget). */
class Field_Hidden extends Field_Widget {

	protected function field_type(): string {
		return 'hidden';
	}

	public function get_icon() {
		return 'rficon-eye';
	}

	protected function features(): array {
		return [ 'source', 'default' ];
	}
}
