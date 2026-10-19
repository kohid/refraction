<?php
namespace Refraction\Modules\ThemeBuilder\Documents;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Search_Results extends Theme_Document {

	public static function get_type() {
		return 'search-results';
	}

	public function get_location(): string {
		return 'search-results';
	}

	public static function get_title() {
		return esc_html__( 'Search Results', 'refraction' );
	}

	public static function get_plural_title() {
		return esc_html__( 'Search Results', 'refraction' );
	}
}
