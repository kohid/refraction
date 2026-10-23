<?php
namespace Refraction\Modules\CustomIcons\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Names, icon-font metadata (IcoMoon selection.json, Fontello config.json) and the CSS of a custom icon set.
 * No WordPress calls.
 */
class Pure_Icon_Set {

	const FORMATS = [ 'woff2' => 'woff2', 'woff' => 'woff', 'ttf' => 'truetype', 'otf' => 'opentype' ];

	public static function set_slug( string $name ): string {
		$slug = trim( (string) preg_replace( '/[^a-z0-9]+/', '-', strtolower( $name ) ), '-' );

		return substr( $slug, 0, 40 );
	}

	public static function icon_name( string $path ): string {
		$base = pathinfo( basename( str_replace( '\\', '/', $path ) ), PATHINFO_FILENAME );

		return self::name_from( $base );
	}

	private static function name_from( string $raw ): string {
		$name = trim( (string) preg_replace( '/[^a-z0-9]+/', '-', strtolower( $raw ) ), '-' );

		return '' === $name ? 'icon' : substr( $name, 0, 60 );
	}

	/**
	 * @param array<int|string,string> $paths
	 * @return array<int|string,string> same keys, unique names
	 */
	public static function unique_names( array $paths ): array {
		$seen = [];
		$out = [];

		foreach ( $paths as $key => $path ) {
			$name = self::icon_name( $path );
			$candidate = $name;
			$n = 2;

			while ( isset( $seen[ $candidate ] ) ) {
				$candidate = $name . '-' . $n++;
			}

			$seen[ $candidate ] = true;
			$out[ $key ] = $candidate;
		}

		return $out;
	}

	private static function valid_code( $code ): bool {
		return is_int( $code ) && $code >= 33 && $code <= 0x10FFFF && ! ( $code >= 0xD800 && $code <= 0xDFFF );
	}

	/** @return array{family:string,icons:array<string,int>}|null */
	public static function parse_icomoon( string $json ): ?array {
		$data = json_decode( $json, true );

		if ( ! is_array( $data ) || empty( $data['icons'] ) || ! is_array( $data['icons'] ) ) {
			return null;
		}

		$icons = [];

		foreach ( $data['icons'] as $icon ) {
			$props = $icon['properties'] ?? [];
			$first = trim( explode( ',', (string) ( $props['name'] ?? '' ) )[0] );
			$code = $props['code'] ?? null;

			if ( '' !== $first && self::valid_code( $code ) ) {
				$icons[ self::unique_key( $icons, self::name_from( $first ) ) ] = $code;
			}
		}

		$family = (string) ( $data['preferences']['fontPref']['metadata']['fontFamily'] ?? 'icomoon' );

		return $icons ? [ 'family' => self::name_from( $family ), 'icons' => $icons ] : null;
	}

	/** @return array{family:string,icons:array<string,int>}|null */
	public static function parse_fontello( string $json ): ?array {
		$data = json_decode( $json, true );

		if ( ! is_array( $data ) || empty( $data['glyphs'] ) || ! is_array( $data['glyphs'] ) ) {
			return null;
		}

		$icons = [];

		foreach ( $data['glyphs'] as $glyph ) {
			$name = trim( (string) ( $glyph['css'] ?? '' ) );
			$code = $glyph['code'] ?? null;

			if ( '' !== $name && self::valid_code( $code ) ) {
				$icons[ self::unique_key( $icons, self::name_from( $name ) ) ] = $code;
			}
		}

		return $icons ? [ 'family' => self::name_from( (string) ( $data['name'] ?? 'fontello' ) ), 'icons' => $icons ] : null;
	}

	private static function unique_key( array $existing, string $name ): string {
		$candidate = $name;
		$n = 2;

		while ( isset( $existing[ $candidate ] ) ) {
			$candidate = $name . '-' . $n++;
		}

		return $candidate;
	}

	private static function css_string( string $value ): string {
		return '"' . str_replace( [ '\\', '"', "\n", "\r", '(', ')', '<', '>' ], [ '\\\\', '\\"', '', '', '%28', '%29', '%3C', '%3E' ], $value ) . '"';
	}

	private static function file_url( string $base, string $file ): string {
		$file = Pure_Icon_Set::safe_file( $file );

		if ( '' === $file ) {
			return '';
		}

		// An empty base gives a path relative to the stylesheet, which lives in the same folder as the files.
		return '' === $base ? $file : rtrim( $base, '/' ) . '/' . $file;
	}

	public static function safe_file( string $file ): string {
		return preg_match( '/^[A-Za-z0-9][A-Za-z0-9._\-]*$/', $file ) && false === strpos( $file, '..' ) ? $file : '';
	}

	/**
	 * @param array<string,string> $fonts ext => file name (inside the set folder)
	 * @param array<string,int>    $icons name => code point
	 */
	public static function font_css( string $slug, string $family, array $fonts, array $icons, string $base_url ): string {
		$slug = self::set_slug( $slug );
		$class = 'rf-cf-' . $slug;
		$sources = [];

		foreach ( self::FORMATS as $ext => $format ) {
			$url = self::file_url( $base_url, (string) ( $fonts[ $ext ] ?? '' ) );

			if ( '' !== $url ) {
				$sources[] = 'url(' . self::css_string( $url ) . ') format("' . $format . '")';
			}
		}

		if ( '' === $slug || ! $sources ) {
			return '';
		}

		$css = '@font-face{font-family:' . self::css_string( $class ) . ';font-style:normal;font-weight:400;font-display:block;src:' . implode( ',', $sources ) . ";}\n";
		$css .= '.' . $class . '{font-family:' . self::css_string( $class ) . ';font-style:normal;font-weight:400;font-variant:normal;text-transform:none;line-height:1;display:inline-block;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}' . "\n";

		foreach ( $icons as $name => $code ) {
			$name = self::name_from( (string) $name );

			if ( self::valid_code( $code ) ) {
				$css .= '.' . $class . '-' . $name . ':before{content:"\\' . dechex( $code ) . '"}' . "\n";
			}
		}

		return $css;
	}

	/** @param array<string,string> $icons name => svg file name */
	public static function svg_css( string $slug, array $icons, string $base_url ): string {
		$slug = self::set_slug( $slug );

		if ( '' === $slug ) {
			return '';
		}

		$css = '.rf-ci{display:inline-block;width:1em;height:1em;vertical-align:-0.125em;background-color:currentColor;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-position:center;mask-position:center;-webkit-mask-size:contain;mask-size:contain}' . "\n";

		foreach ( $icons as $name => $file ) {
			$url = self::file_url( $base_url, (string) $file );

			if ( '' !== $url ) {
				$css .= '.rf-ci-' . $slug . '-' . self::name_from( (string) $name ) . '{-webkit-mask-image:url(' . self::css_string( $url ) . ');mask-image:url(' . self::css_string( $url ) . ")}\n";
			}
		}

		return $css;
	}
}
