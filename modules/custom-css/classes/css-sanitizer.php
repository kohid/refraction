<?php
namespace Refraction\Modules\CustomCss\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Makes user written CSS safe to print inside a <style> element. Pure string logic (no WordPress needed).
 *
 * Removed: markup (`<...>`, so `</style>` can not close the element), `@import`, `expression()`,
 * `javascript:` / `vbscript:` / `data:text/html` URLs, `behavior` and `-moz-binding`, null bytes. Comments are
 * dropped. CSS escapes and whitespace tricks (a hex escape for the j of javascript, a tab inside the word, a comment inside expression) are
 * decoded before the check.
 */
class Css_Sanitizer {

	/** Each pattern removes the whole declaration or at-rule statement that contains the construct. */
	private static function patterns(): array {
		$spaced = static function ( string $word ): string {
			return implode( '[\s]*', str_split( $word ) );
		};

		return [
			'~<[^>]*>?~',
			'~@import\b[^;{}]*;?~i',
			'~[^;{}]*' . $spaced( 'expression' ) . '\s*\([^;}]*;?~i',
			'~[^;{}]*(?:' . $spaced( 'javascript' ) . '|' . $spaced( 'vbscript' ) . '|' . $spaced( 'livescript' ) . ')\s*:[^;}]*;?~i',
			'~[^;{}]*' . $spaced( 'data' ) . '\s*:\s*' . $spaced( 'text' ) . '\s*/\s*' . $spaced( 'html' ) . '[^;}]*;?~i',
			'~[^;{}]*' . $spaced( 'behavior' ) . '\s*:[^;}]*;?~i',
			'~[^;{}]*-' . $spaced( 'moz-binding' ) . '\s*:[^;}]*;?~i',
		];
	}

	public static function sanitize( string $css ): string {
		$css = str_replace( "\0", '', $css );
		$css = preg_replace( '~/\*.*?(?:\*/|$)~s', '', $css );
		$css = (string) $css;

		if ( ! self::scan( $css ) ) {
			$decoded = self::decode_escapes( $css );

			if ( self::scan( $decoded ) ) {
				$css = $decoded;
			}
		}

		for ( $i = 0; $i < 10; $i++ ) {
			$before = $css;

			foreach ( self::patterns() as $pattern ) {
				$css = (string) preg_replace( $pattern, '', $css );
			}

			if ( $css === $before ) {
				break;
			}
		}

		return trim( $css );
	}

	public static function is_risky( string $css ): bool {
		return self::sanitize( $css ) !== trim( str_replace( "\0", '', (string) preg_replace( '~/\*.*?(?:\*/|$)~s', '', $css ) ) );
	}

	/** Replace the `selector` keyword with the element's own selector. */
	public static function scope( string $css, string $selector ): string {
		return (string) preg_replace_callback(
			'~(?<![\w.#\-])selector(?![\w\-])~i',
			static function () use ( $selector ) {
				return $selector;
			},
			$css
		);
	}

	private static function scan( string $css ): bool {
		foreach ( self::patterns() as $pattern ) {
			if ( preg_match( $pattern, $css ) ) {
				return true;
			}
		}

		return false;
	}

	/** `\6a ` -> `j`, `\;` -> `;`. */
	private static function decode_escapes( string $css ): string {
		$css = (string) preg_replace_callback(
			'~\\\\([0-9a-fA-F]{1,6})[ \t\r\n\f]?~',
			static function ( $m ) {
				$code = hexdec( $m[1] );

				return ( $code > 0 && $code < 0x110000 && ( $code < 0xD800 || $code > 0xDFFF ) ) ? mb_chr( $code, 'UTF-8' ) : '';
			},
			$css
		);

		return (string) preg_replace( '~\\\\(.)~s', '$1', $css );
	}
}
