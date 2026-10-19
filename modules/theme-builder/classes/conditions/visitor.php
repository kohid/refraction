<?php
namespace Refraction\Modules\ThemeBuilder\Classes\Conditions;

use Refraction\Modules\ThemeBuilder\Classes\Environment;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Who is looking: logged in, logged out or a user role. An audience filter, see Conditions_Manager.
 */
class Visitor extends Condition_Base {

	public static function get_name(): string {
		return 'visitor';
	}

	public static function is_valid_args( array $args ): bool {
		if ( 1 === count( $args ) ) {
			return in_array( $args[0], [ 'logged_in', 'logged_out' ], true );
		}

		return 2 === count( $args ) && 'role' === $args[0];
	}

	public function is_audience(): bool {
		return true;
	}

	public function get_label(): string {
		return esc_html__( 'Visitor', 'refraction' );
	}

	public function check( array $args, Environment $environment ): bool {
		switch ( $args[0] ) {
			case 'logged_in':
				return $environment->is_user_logged_in();
			case 'logged_out':
				return ! $environment->is_user_logged_in();
			default:
				return in_array( $args[1], $environment->current_user_roles(), true );
		}
	}

	public function get_specificity( array $args ): float {
		return 0.0;
	}

	public function describe( array $args, Environment $environment ): string {
		switch ( $args[0] ) {
			case 'logged_in':
				return esc_html__( 'Logged-in visitors', 'refraction' );
			case 'logged_out':
				return esc_html__( 'Logged-out visitors', 'refraction' );
			default:
				/* translators: %s: user role name. */
				return sprintf( esc_html__( 'Role: %s', 'refraction' ), $environment->label_role( $args[1] ) );
		}
	}

	public function get_sub_conditions(): array {
		$subs = [
			[ 'value' => 'logged_in', 'label' => esc_html__( 'Logged in', 'refraction' ) ],
			[ 'value' => 'logged_out', 'label' => esc_html__( 'Logged out', 'refraction' ) ],
		];

		if ( function_exists( 'wp_roles' ) ) {
			foreach ( wp_roles()->get_names() as $role => $label ) {
				/* translators: %s: user role name. */
				$subs[] = [ 'value' => 'role/' . $role, 'label' => sprintf( esc_html__( 'Role: %s', 'refraction' ), translate_user_role( $label ) ) ];
			}
		}

		return $subs;
	}
}
