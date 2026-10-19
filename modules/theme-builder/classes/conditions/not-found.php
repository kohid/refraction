<?php
namespace Refraction\Modules\ThemeBuilder\Classes\Conditions;

use Refraction\Modules\ThemeBuilder\Classes\Environment;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Not_Found extends Condition_Base {

	public static function get_name(): string {
		return '404';
	}

	public static function is_valid_args( array $args ): bool {
		return [] === $args;
	}

	public function get_label(): string {
		return esc_html__( '404 page', 'refraction' );
	}

	public function check( array $args, Environment $environment ): bool {
		return $environment->is_404();
	}

	public function get_specificity( array $args ): float {
		return 40.0;
	}

	public function describe( array $args, Environment $environment ): string {
		return esc_html__( '404 page', 'refraction' );
	}
}
