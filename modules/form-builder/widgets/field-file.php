<?php
namespace Refraction\Modules\FormBuilder\Widgets;

use Refraction\Modules\FormBuilder\Base\Field_Widget;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** The Form Builder "file" field as an editor widget (see Base\Field_Widget). */
class Field_File extends Field_Widget {

	protected function field_type(): string {
		return 'file';
	}

	public function get_icon() {
		return 'rficon-upload';
	}

	protected function features(): array {
		return [ 'required', 'upload' ];
	}
}
