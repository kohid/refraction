<?php

namespace Refraction\Core\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Inline Material Symbols icons bundled with the plugin (assets/icons/material).
 *
 * Add icons with `node scripts/fetch-icons.mjs name [name ...]`; nothing is ever loaded from
 * the web at runtime. Browse names at https://kohid.github.io/icons/ (Material Symbols Light,
 * Apache License 2.0, see NOTICE).
 *
 *     echo Icons::svg( 'palette', [ 'size' => 20, 'class' => 'refraction-ui-icon' ] );
 *     // CSS mask: mask-image: url( Icons::url( 'palette' ) );
 */
class Icons {

	/** @var array<string,string> */
	private static $cache = [];

	public static function dir(): string {
		return REFRACTION_ASSETS_PATH . 'icons/material/';
	}

	public static function url( string $name ): string {
		return REFRACTION_ASSETS_URL . 'icons/material/' . self::clean( $name ) . '.svg';
	}

	/** An icon name is lowercase letters, digits and dashes only; anything else gives an empty name. */
	public static function clean( string $name ): string {
		return preg_match( '/^[a-z0-9][a-z0-9-]*$/', $name ) ? $name : '';
	}

	public static function exists( string $name ): bool {
		$name = self::clean( $name );

		return '' !== $name && is_readable( self::dir() . $name . '.svg' );
	}

	/**
	 * @param string $name Material icon name, for example "dark-mode".
	 * @param array  $args size (px, default 24), class, label (accessible name; without it the icon is hidden from screen readers).
	 *
	 * @return string The inline SVG, or an empty string when the icon is not bundled.
	 */
	public static function svg( string $name, array $args = [] ): string {
		$name = self::clean( $name );

		if ( '' === $name ) {
			return '';
		}

		if ( ! isset( self::$cache[ $name ] ) ) {
			self::$cache[ $name ] = self::read( $name );
		}

		if ( '' === self::$cache[ $name ] ) {
			return '';
		}

		$size = max( 8, min( 256, (int) ( $args['size'] ?? 24 ) ) );
		$class = trim( 'refraction-icon ' . ( $args['class'] ?? '' ) );
		$label = isset( $args['label'] ) ? (string) $args['label'] : '';
		$attributes = sprintf( ' class="%s" width="%d" height="%d"', esc_attr( $class ), $size, $size );
		$attributes .= '' === $label ? ' aria-hidden="true"' : sprintf( ' role="img" aria-label="%s"', esc_attr( $label ) );

		// The bundled file is marked decorative; the attributes above decide whether this use is.
		$markup = str_replace( ' aria-hidden="true"', '', self::$cache[ $name ] );

		return preg_replace( '/^<svg/', '<svg' . $attributes, $markup, 1 );
	}

	/** Files are validated on read too, so a bad file dropped into the folder is never printed. */
	private static function read( string $name ): string {
		$path = self::dir() . $name . '.svg';

		if ( ! is_readable( $path ) ) {
			return '';
		}

		$svg = trim( (string) file_get_contents( $path ) ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- Local bundled file.

		$is_plain = 1 === preg_match( '/^<svg [^>]*>(<path d="[^"]+"\/>)+<\/svg>$/', $svg )
			&& 0 === preg_match( '/<script|\son[a-z]+=|href=/i', $svg );

		return $is_plain ? $svg : '';
	}
}
