<?php
namespace Refraction\Modules\ThemeBuilder\Classes\Conditions;

use Refraction\Modules\ThemeBuilder\Classes\Environment;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class General extends Condition_Base {

	const SPECIFICITY = 10.0;

	public static function get_name(): string {
		return 'general';
	}

	public static function is_valid_args( array $args ): bool {
		return [] === $args;
	}

	public function get_label(): string {
		return esc_html__( 'Entire site', 'refraction' );
	}

	public function check( array $args, Environment $environment ): bool {
		return true;
	}

	public function get_specificity( array $args ): float {
		return self::SPECIFICITY;
	}

	public function describe( array $args, Environment $environment ): string {
		return esc_html__( 'Entire site', 'refraction' );
	}
}
