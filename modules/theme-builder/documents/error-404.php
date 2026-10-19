<?php
namespace Refraction\Modules\ThemeBuilder\Documents;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Error_404 extends Theme_Document {

	public static function get_type() {
		return 'error-404';
	}

	public function get_location(): string {
		return 'error-404';
	}

	public static function get_title() {
		return esc_html__( 'Error 404', 'refraction' );
	}

	public static function get_plural_title() {
		return esc_html__( 'Error 404 Pages', 'refraction' );
	}
}
