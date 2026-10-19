<?php
namespace Refraction\Modules\CustomAttributes\Classes;

use Refraction\Modules\CustomCss\Classes\Css_Sanitizer;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Turns the Attributes textarea (`key|value` per line, or `key` for a boolean attribute) into a safe
 * attribute list. Pure string logic: the caller escapes values when printing.
 *
 * Dropped: event handlers (`on*`), `srcdoc`, `formaction`, attributes Refraction sets itself, keys with odd
 * characters, URL attributes that start with `javascript:`, `vbscript:` or `data:text/html`. The value of
 * `style` goes through the CSS sanitiser. Tags are removed from values.
 */
class Attribute_Parser {

	const MAX_ATTRIBUTES = 20;
	const MAX_VALUE = 500;

	const BLOCKED = [ 'srcdoc', 'formaction', 'action', 'data-id', 'data-element_type', 'data-e-type', 'data-settings', 'data-model-cid', 'xmlns' ];
	const URL_ATTRIBUTES = [ 'href', 'src', 'action', 'formaction', 'poster', 'data', 'cite', 'background', 'longdesc', 'ping', 'xlink:href' ];

	/** @return array<string, string> */
	public static function parse( $text ): array {
		if ( ! is_string( $text ) || '' === trim( $text ) ) {
			return [];
		}

		$attributes = [];

		foreach ( preg_split( '~\R~', $text ) as $line ) {
			$line = trim( $line );

			if ( '' === $line ) {
				continue;
			}

			$pos = strpos( $line, '|' );
			$key = strtolower( trim( false === $pos ? $line : substr( $line, 0, $pos ) ) );
			$value = false === $pos ? '' : trim( substr( $line, $pos + 1 ) );

			if ( ! self::is_allowed_key( $key ) ) {
				continue;
			}

			$value = self::clean_value( $key, $value );

			if ( null === $value ) {
				continue;
			}

			$attributes[ $key ] = $value;

			if ( count( $attributes ) >= self::MAX_ATTRIBUTES ) {
				break;
			}
		}

		return $attributes;
	}

	private static function is_allowed_key( string $key ): bool {
		if ( ! preg_match( '~^[a-z_][a-z0-9_:.\-]{0,63}$~', $key ) ) {
			return false;
		}

		return 0 !== strpos( $key, 'on' ) && ! in_array( $key, self::BLOCKED, true );
	}

	private static function clean_value( string $key, string $value ): ?string {
		$value = preg_replace( '~[\x00-\x08\x0b\x0c\x0e-\x1f]~', '', $value );
		$value = trim( (string) preg_replace( '~<[^>]*>?~', '', $value ) );

		if ( 'style' === $key ) {
			$value = rtrim( Css_Sanitizer::sanitize( $value ), '; ' );
		} elseif ( in_array( $key, self::URL_ATTRIBUTES, true ) && self::is_script_url( $value ) ) {
			return null;
		}

		return function_exists( 'mb_substr' ) ? mb_substr( $value, 0, self::MAX_VALUE ) : substr( $value, 0, self::MAX_VALUE );
	}

	private static function is_script_url( string $value ): bool {
		$check = html_entity_decode( $value, ENT_QUOTES | ENT_HTML5, 'UTF-8' );
		$check = strtolower( (string) preg_replace( '~[\x00-\x20\x7f]+~', '', $check ) );

		return (bool) preg_match( '~^(javascript|vbscript|livescript):|^data:text/html|^data:application/xhtml~', $check );
	}
}
