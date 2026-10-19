<?php
namespace Refraction\Modules\ThemeBuilder\Documents;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Single extends Theme_Document {

	public static function get_type() {
		return 'single';
	}

	public function get_location(): string {
		return 'single';
	}

	public static function get_title() {
		return esc_html__( 'Single', 'refraction' );
	}

	public static function get_plural_title() {
		return esc_html__( 'Singles', 'refraction' );
	}
}
