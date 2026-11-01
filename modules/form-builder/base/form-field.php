<?php
namespace Refraction\Modules\FormBuilder\Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** A widget that is a Form Builder field (a plain field, a Group or a Repeater): it can say what Builder field it is. */
interface Form_Field {

	/** The field as the Form Builder sees it, before Schema::clean_field cleans it. */
	public function raw_field(): array;
}
