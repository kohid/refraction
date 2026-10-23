<?php
namespace Refraction\Modules\CustomCode\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** Pure helpers for Custom Code snippets: allowed values, ordering and the markup printed for one snippet. */
class Snippet_Format {

	const LOCATIONS = [ 'head', 'body_start', 'body_end' ];
	const TYPES = [ 'html', 'js', 'css' ];

	public static function location( $value ): string {
		return in_array( $value, self::LOCATIONS, true ) ? $value : 'head';
	}

	public static function type( $value ): string {
		return in_array( $value, self::TYPES, true ) ? $value : 'html';
	}

	public static function priority( $value ): int {
		return is_numeric( $value ) ? max( 1, min( 999, (int) $value ) ) : 10;
	}

	/** Markup for one snippet. JS and CSS get their tag and can not close it early. */
	public static function render( string $type, string $code, int $id ): string {
		if ( '' === trim( $code ) ) {
			return '';
		}

		switch ( self::type( $type ) ) {
			case 'css':
				return '<style id="refraction-snippet-' . $id . '">' . preg_replace( '~</(style)~i', '<\\/$1', $code ) . '</style>';
			case 'js':
				return '<script id="refraction-snippet-' . $id . '">' . preg_replace( '~</(script)~i', '<\\/$1', $code ) . '</script>';
			default:
				return $code;
		}
	}

	/** @param array<int, array{id: int, priority: int}> $snippets */
	public static function sort( array $snippets ): array {
		usort(
			$snippets,
			static function ( $a, $b ) {
				return [ $a['priority'], $a['id'] ] <=> [ $b['priority'], $b['id'] ];
			}
		);

		return $snippets;
	}
}
