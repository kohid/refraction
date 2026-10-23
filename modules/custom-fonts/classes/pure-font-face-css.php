<?php
namespace Refraction\Modules\CustomFonts\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Builds @font-face CSS from stored font families. Every value is whitelisted or escaped so a stored value can
 * never close the rule or the url(). No WordPress calls.
 */
class Pure_Font_Face_Css {

	const FORMATS = [ 'woff2' => 'woff2', 'woff' => 'woff', 'ttf' => 'truetype', 'otf' => 'opentype' ];

	const DISPLAYS = [ 'auto', 'block', 'swap', 'fallback', 'optional' ];

	public static function clean_family( string $name ): string {
		$name = (string) preg_replace( '/[^\p{L}\p{N} _\-]+/u', '', $name );
		$name = trim( (string) preg_replace( '/\s+/u', ' ', $name ) );

		return function_exists( 'mb_substr' ) ? mb_substr( $name, 0, 60 ) : substr( $name, 0, 60 );
	}

	public static function clean_weight( string $weight ): string {
		return in_array( $weight, [ '100', '200', '300', '400', '500', '600', '700', '800', '900' ], true ) ? $weight : '400';
	}

	public static function clean_style( string $style ): string {
		return in_array( $style, [ 'normal', 'italic', 'oblique' ], true ) ? $style : 'normal';
	}

	public static function clean_display( string $display ): string {
		return in_array( $display, self::DISPLAYS, true ) ? $display : 'swap';
	}

	/** A relative file path restricted to the characters we generate ourselves. */
	public static function clean_path( string $path ): string {
		$path = str_replace( '\\', '/', $path );

		if ( ! preg_match( '#^[A-Za-z0-9._\-]+(/[A-Za-z0-9._\-]+)*$#', $path ) || false !== strpos( $path, '..' ) ) {
			return '';
		}

		return $path;
	}

	private static function url( string $base, string $path ): string {
		$path = self::clean_path( $path );

		return '' === $path ? '' : rtrim( $base, '/' ) . '/' . $path;
	}

	private static function css_string( string $value ): string {
		return '"' . str_replace( [ '\\', '"', "\n", "\r", '(', ')', '<', '>' ], [ '\\\\', '\\"', '', '', '%28', '%29', '%3C', '%3E' ], $value ) . '"';
	}

	public static function generate( array $families, string $base_url ): string {
		$css = '';

		foreach ( $families as $family ) {
			$name = self::clean_family( (string) ( $family['family'] ?? '' ) );

			if ( '' === $name ) {
				continue;
			}

			$display = self::clean_display( (string) ( $family['display'] ?? '' ) );

			foreach ( (array) ( $family['variations'] ?? [] ) as $variation ) {
				$sources = [];

				foreach ( self::FORMATS as $ext => $format ) {
					$url = self::url( $base_url, (string) ( $variation['files'][ $ext ] ?? '' ) );

					if ( '' !== $url ) {
						$sources[] = 'url(' . self::css_string( $url ) . ') format("' . $format . '")';
					}
				}

				if ( ! $sources ) {
					continue;
				}

				$css .= '@font-face{font-family:' . self::css_string( $name )
					. ';font-style:' . self::clean_style( (string) ( $variation['style'] ?? '' ) )
					. ';font-weight:' . self::clean_weight( (string) ( $variation['weight'] ?? '' ) )
					. ';font-display:' . $display
					. ';src:' . implode( ',', $sources ) . ";}\n";
			}
		}

		return $css;
	}

	/** @return string[] woff2 URLs of the families flagged for preload. */
	public static function preload_urls( array $families, string $base_url ): array {
		$urls = [];

		foreach ( $families as $family ) {
			if ( empty( $family['preload'] ) ) {
				continue;
			}

			foreach ( (array) ( $family['variations'] ?? [] ) as $variation ) {
				$url = self::url( $base_url, (string) ( $variation['files']['woff2'] ?? '' ) );

				if ( '' !== $url ) {
					$urls[] = $url;
				}
			}
		}

		return $urls;
	}
}
