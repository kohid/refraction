<?php
namespace Refraction\Modules\ThemeBuilder\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * One display rule, `{include|exclude}/{name}[/{arg}...]`, for example `exclude/singular/page/7`.
 *
 * Rule strings come from the browser, so parse() is the single gate: anything it does not
 * recognise returns null and is dropped.
 */
final class Rule {

	const INCLUDE = 'include';
	const EXCLUDE = 'exclude';

	public bool $include;
	public string $name;

	/** @var string[] */
	public array $args;

	private function __construct( bool $include, string $name, array $args ) {
		$this->include = $include;
		$this->name = $name;
		$this->args = $args;
	}

	public static function parse( $raw ): ?Rule {
		if ( ! is_string( $raw ) ) {
			return null;
		}

		$parts = explode( '/', strtolower( trim( $raw ) ) );
		$verb = array_shift( $parts );

		if ( self::INCLUDE !== $verb && self::EXCLUDE !== $verb ) {
			return null;
		}

		$name = (string) array_shift( $parts );
		$class = Conditions_Manager::class_for( $name );

		if ( ! $class ) {
			return null;
		}

		foreach ( $parts as $part ) {
			if ( ! preg_match( '/^[a-z0-9_\-]{1,40}$/', $part ) ) {
				return null;
			}
		}

		if ( ! $class::is_valid_args( $parts ) ) {
			return null;
		}

		return new self( self::INCLUDE === $verb, $name, $parts );
	}

	/**
	 * Keep only valid, unique rule strings, in their canonical form.
	 *
	 * @param mixed $raw
	 * @return string[]
	 */
	public static function sanitize_list( $raw ): array {
		if ( ! is_array( $raw ) ) {
			return [];
		}

		$rules = [];

		foreach ( $raw as $item ) {
			$rule = self::parse( $item );

			if ( $rule ) {
				$rules[ $rule->to_string() ] = $rule->to_string();
			}
		}

		return array_values( $rules );
	}

	public function to_string(): string {
		return implode( '/', array_merge( [ $this->include ? self::INCLUDE : self::EXCLUDE, $this->name ], $this->args ) );
	}
}
