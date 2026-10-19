<?php
namespace Refraction\Modules\ThemeBuilder\Documents;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Header extends Theme_Document {

	public static function get_type() {
		return 'header';
	}

	public function get_location(): string {
		return 'header';
	}

	public static function get_title() {
		return esc_html__( 'Header', 'refraction' );
	}

	public static function get_plural_title() {
		return esc_html__( 'Headers', 'refraction' );
	}
}
