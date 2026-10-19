<?php
namespace Refraction\Modules\ThemeBuilder\Documents;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Footer extends Theme_Document {

	public static function get_type() {
		return 'footer';
	}

	public function get_location(): string {
		return 'footer';
	}

	public static function get_title() {
		return esc_html__( 'Footer', 'refraction' );
	}

	public static function get_plural_title() {
		return esc_html__( 'Footers', 'refraction' );
	}
}
