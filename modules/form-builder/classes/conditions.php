<?php
namespace Refraction\Modules\FormBuilder\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Conditional visibility of a field: "show (or hide) this field when ALL (or ANY) of these rules match".
 * Pure logic; the same rules are evaluated in JavaScript (assets/js/frontend.js) while the visitor fills the form, and
 * again here on submit, so a hidden field is never validated or stored whatever the browser did.
 */
class Conditions {

	const OPERATORS = [ 'equals', 'not_equals', 'contains', 'not_contains', 'empty', 'not_empty', 'greater', 'less' ];
	const MAX_RULES = 10;

	public static function operators(): array {
		return [
			'equals' => Schema::t( 'is' ),
			'not_equals' => Schema::t( 'is not' ),
			'contains' => Schema::t( 'contains' ),
			'not_contains' => Schema::t( 'does not contain' ),
			'empty' => Schema::t( 'is empty' ),
			'not_empty' => Schema::t( 'is not empty' ),
			'greater' => Schema::t( 'is greater than' ),
			'less' => Schema::t( 'is less than' ),
		];
	}

	public static function defaults(): array {
		return [ 'enabled' => false, 'action' => 'show', 'match' => 'all', 'rules' => [] ];
	}

	/** Always returns the full shape so a cleaned definition is stable when cleaned again. */
	public static function clean( $raw ): array {
		$raw = is_array( $raw ) ? $raw : [];
		$rules = [];

		foreach ( (array) ( $raw['rules'] ?? [] ) as $rule ) {
			if ( ! is_array( $rule ) ) {
				continue;
			}

			$field = Schema::key( $rule['field'] ?? '' );
			$op = in_array( $rule['op'] ?? '', self::OPERATORS, true ) ? $rule['op'] : 'equals';

			if ( '' === $field ) {
				continue;
			}

			$rules[] = [ 'field' => $field, 'op' => $op, 'value' => in_array( $op, [ 'empty', 'not_empty' ], true ) ? '' : Schema::text( $rule['value'] ?? '', 120 ) ];

			if ( count( $rules ) >= self::MAX_RULES ) {
				break;
			}
		}

		return [
			'enabled' => ! empty( $raw['enabled'] ) && $rules,
			'action' => 'hide' === ( $raw['action'] ?? '' ) ? 'hide' : 'show',
			'match' => 'any' === ( $raw['match'] ?? '' ) ? 'any' : 'all',
			'rules' => $rules,
		];
	}

	/**
	 * @param array    $conditions Cleaned conditions.
	 * @param callable $lookup     Receives a field key, returns its current value (string, or list of strings for choices).
	 */
	public static function is_visible( array $conditions, callable $lookup ): bool {
		if ( empty( $conditions['enabled'] ) || empty( $conditions['rules'] ) ) {
			return true;
		}

		$results = [];

		foreach ( $conditions['rules'] as $rule ) {
			$results[] = self::matches( $rule, $lookup( $rule['field'] ) );
		}

		$matched = 'any' === $conditions['match'] ? in_array( true, $results, true ) : ! in_array( false, $results, true );

		return 'hide' === $conditions['action'] ? ! $matched : $matched;
	}

	/** @param string|array|null $actual */
	public static function matches( array $rule, $actual ): bool {
		$list = is_array( $actual ) ? array_map( 'strval', $actual ) : null;
		$text = null === $list ? trim( (string) $actual ) : implode( ',', $list );
		$expected = (string) $rule['value'];

		switch ( $rule['op'] ) {
			case 'equals':
				return null === $list ? $text === $expected : in_array( $expected, $list, true );
			case 'not_equals':
				return null === $list ? $text !== $expected : ! in_array( $expected, $list, true );
			case 'contains':
				return '' !== $expected && false !== stripos( $text, $expected );
			case 'not_contains':
				return '' === $expected || false === stripos( $text, $expected );
			case 'empty':
				return '' === $text;
			case 'not_empty':
				return '' !== $text;
			case 'greater':
				return is_numeric( $text ) && is_numeric( $expected ) && (float) $text > (float) $expected;
			case 'less':
				return is_numeric( $text ) && is_numeric( $expected ) && (float) $text < (float) $expected;
		}

		return false;
	}
}
