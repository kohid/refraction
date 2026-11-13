<?php
namespace Refraction\Modules\FormBuilder\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * The arithmetic of a Total field (0.90.0): numbers, field keys in braces, + - * / and brackets, and the functions
 * min, max, round, ceil, floor and abs. For example `{vehicle} * {tour}` or `max(25, {miles} * 2.2)`.
 *
 * Pure logic (no eval), tested in scripts/test-form-builder.php. The same grammar runs in assets/js/frontend.js while
 * the visitor fills the form; the server's result is the one stored.
 */
class Formula {

	const FUNCTIONS = [ 'min', 'max', 'round', 'ceil', 'floor', 'abs' ];
	const MAX_LENGTH = 300;

	/** @var array<int,array{0:string,1:string}> */
	private $tokens = [];
	private $at = 0;
	/** @var callable */
	private $number;

	/**
	 * @param string   $formula The formula.
	 * @param callable $number  Receives a field key, returns its number (0 when it has none).
	 *
	 * @return float|null The result, or null when the formula is empty, malformed or divides by zero.
	 */
	public static function evaluate( string $formula, callable $number ): ?float {
		$formula = trim( $formula );

		if ( '' === $formula || strlen( $formula ) > self::MAX_LENGTH ) {
			return null;
		}

		$tokens = self::tokens( $formula );

		if ( null === $tokens ) {
			return null;
		}

		$parser = new self();
		$parser->tokens = $tokens;
		$parser->number = $number;

		try {
			$result = $parser->sum();
		} catch ( \UnexpectedValueException $e ) {
			return null;
		}

		return $parser->at === count( $tokens ) && is_finite( $result ) ? $result : null;
	}

	/** The field keys a formula reads. */
	public static function keys( string $formula ): array {
		preg_match_all( '/\{([a-z][a-z0-9_]*)\}/', $formula, $m );

		return array_values( array_unique( $m[1] ) );
	}

	/** @return array<int,array{0:string,1:string}>|null [ kind, text ] pairs, or null on a character it does not know. */
	private static function tokens( string $formula ): ?array {
		$tokens = [];
		$length = strlen( $formula );
		$i = 0;

		while ( $i < $length ) {
			$c = $formula[ $i ];

			if ( ctype_space( $c ) ) {
				$i++;
			} elseif ( preg_match( '/\G\d+(?:\.\d+)?|\G\.\d+/', $formula, $m, 0, $i ) ) {
				$tokens[] = [ 'num', $m[0] ];
				$i += strlen( $m[0] );
			} elseif ( preg_match( '/\G\{([a-z][a-z0-9_]*)\}/', $formula, $m, 0, $i ) ) {
				$tokens[] = [ 'key', $m[1] ];
				$i += strlen( $m[0] );
			} elseif ( preg_match( '/\G[a-z]+/', $formula, $m, 0, $i ) && in_array( $m[0], self::FUNCTIONS, true ) ) {
				$tokens[] = [ 'fn', $m[0] ];
				$i += strlen( $m[0] );
			} elseif ( false !== strpos( '+-*/(),', $c ) ) {
				$tokens[] = [ 'op', $c ];
				$i++;
			} else {
				return null;
			}
		}

		return $tokens;
	}

	private function peek( string $text ): bool {
		return isset( $this->tokens[ $this->at ] ) && 'op' === $this->tokens[ $this->at ][0] && $text === $this->tokens[ $this->at ][1];
	}

	private function expect( string $text ): void {
		if ( ! $this->peek( $text ) ) {
			throw new \UnexpectedValueException( $text );
		}

		$this->at++;
	}

	private function sum(): float {
		$value = $this->product();

		while ( $this->peek( '+' ) || $this->peek( '-' ) ) {
			$plus = $this->peek( '+' );
			$this->at++;
			$right = $this->product();
			$value = $plus ? $value + $right : $value - $right;
		}

		return $value;
	}

	private function product(): float {
		$value = $this->unary();

		while ( $this->peek( '*' ) || $this->peek( '/' ) ) {
			$times = $this->peek( '*' );
			$this->at++;
			$right = $this->unary();

			if ( ! $times && 0.0 === $right ) {
				throw new \UnexpectedValueException( 'division by zero' );
			}

			$value = $times ? $value * $right : $value / $right;
		}

		return $value;
	}

	private function unary(): float {
		if ( $this->peek( '-' ) ) {
			$this->at++;

			return -$this->unary();
		}

		if ( $this->peek( '+' ) ) {
			$this->at++;

			return $this->unary();
		}

		return $this->atom();
	}

	private function atom(): float {
		$token = $this->tokens[ $this->at ] ?? null;

		if ( ! $token ) {
			throw new \UnexpectedValueException( 'end' );
		}

		if ( 'num' === $token[0] ) {
			$this->at++;

			return (float) $token[1];
		}

		if ( 'key' === $token[0] ) {
			$this->at++;

			return (float) call_user_func( $this->number, $token[1] );
		}

		if ( 'fn' === $token[0] ) {
			$this->at++;
			$this->expect( '(' );
			$args = [ $this->sum() ];

			while ( $this->peek( ',' ) ) {
				$this->at++;
				$args[] = $this->sum();
			}

			$this->expect( ')' );

			switch ( $token[1] ) {
				case 'min':
					return min( $args );
				case 'max':
					return max( $args );
				case 'round':
					return round( $args[0], isset( $args[1] ) ? (int) $args[1] : 0 );
				case 'ceil':
					return ceil( $args[0] );
				case 'floor':
					return floor( $args[0] );
				default:
					return abs( $args[0] );
			}
		}

		if ( $this->peek( '(' ) ) {
			$this->at++;
			$value = $this->sum();
			$this->expect( ')' );

			return $value;
		}

		throw new \UnexpectedValueException( $token[1] );
	}
}
