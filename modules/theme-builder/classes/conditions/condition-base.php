<?php
namespace Refraction\Modules\ThemeBuilder\Classes\Conditions;

use Refraction\Modules\ThemeBuilder\Classes\Environment;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * A family of display rules (general, singular, archive, ...).
 *
 * The rule `include/singular/page/7` is the condition named "singular" with the arguments
 * `[ 'page', '7' ]`. A condition knows which arguments are valid, whether a request matches them,
 * how specific they are, how to print them and which sub-types the editor offers.
 */
abstract class Condition_Base {

	/** Rule name, the second segment of a rule string. */
	abstract public static function get_name(): string;

	/** Whether the arguments after the name form a rule this condition understands. */
	abstract public static function is_valid_args( array $args ): bool;

	abstract public function get_label(): string;

	/** Whether the arguments match the current request. Arguments are already validated. */
	abstract public function check( array $args, Environment $environment ): bool;

	/** Higher is more specific; a more specific template wins over a general one. */
	abstract public function get_specificity( array $args ): float;

	/** Readable text for the admin list and the editor. */
	abstract public function describe( array $args, Environment $environment ): string;

	/**
	 * Sub-types for the editor dropdown.
	 *
	 * @return array<int, array{value: string, label: string, target?: string, required?: bool}>
	 *         `value` is the rule path after the name ('' for "all"); `target` is the kind of id the user
	 *         picks next (`post:{type}`, `post:any`, `term:{taxonomy}`, `user`) and `required` says whether
	 *         the id is needed.
	 */
	public function get_sub_conditions(): array {
		return [ [ 'value' => '', 'label' => $this->get_label() ] ];
	}

	/** Audience conditions filter who sees a template instead of where it appears. */
	public function is_audience(): bool {
		return false;
	}

	protected static function is_id( string $value ): bool {
		return '' !== $value && ctype_digit( $value ) && (int) $value > 0 && strlen( $value ) < 11;
	}
}
