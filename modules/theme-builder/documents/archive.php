<?php
namespace Refraction\Modules\ThemeBuilder\Documents;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Archive extends Theme_Document {

	public static function get_type() {
		return 'archive';
	}

	public function get_location(): string {
		return 'archive';
	}

	public static function get_title() {
		return esc_html__( 'Archive', 'refraction' );
	}

	public static function get_plural_title() {
		return esc_html__( 'Archives', 'refraction' );
	}
}
