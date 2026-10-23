<?php
namespace Refraction\Modules\CustomIcons\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Checks the entry list of an uploaded icon ZIP before anything is read: path traversal, counts, sizes and
 * compression ratio. Only svg, json and font entries are accepted; the rest is ignored. No WordPress calls.
 */
class Pure_Zip_Validator {

	const MAX_FILES = 500;
	const MAX_TOTAL_BYTES = 10485760; // 10 MB uncompressed in total.
	const MAX_SVG_BYTES = 100000;
	const MAX_JSON_BYTES = 2097152;
	const MAX_FONT_BYTES = 3145728;
	const MAX_RATIO = 200;

	const EXTENSIONS = [ 'svg' => 'svg', 'json' => 'json', 'woff2' => 'font', 'woff' => 'font', 'ttf' => 'font', 'otf' => 'font' ];

	/**
	 * @param array<int,array{name:string,size:int,comp:int}> $entries
	 * @return array{ok:bool,error:string,accepted:array<int,array{name:string,ext:string}>}
	 */
	public static function check( array $entries ): array {
		$fail = static function ( string $error ): array {
			return [ 'ok' => false, 'error' => $error, 'accepted' => [] ];
		};

		if ( count( $entries ) > self::MAX_FILES ) {
			return $fail( 'The ZIP contains too many files.' );
		}

		$accepted = [];
		$total = 0;

		foreach ( $entries as $i => $entry ) {
			$name = (string) $entry['name'];

			if ( ! self::path_is_safe( $name ) ) {
				return $fail( 'The ZIP contains an unsafe file path and was refused.' );
			}

			$base = basename( str_replace( '\\', '/', $name ) );

			if ( '/' === substr( $name, -1 ) || 0 === strpos( $name, '__MACOSX/' ) || '.' === substr( $base, 0, 1 ) ) {
				continue;
			}

			$ext = strtolower( pathinfo( $base, PATHINFO_EXTENSION ) );

			if ( ! isset( self::EXTENSIONS[ $ext ] ) ) {
				continue;
			}

			$size = (int) $entry['size'];
			$limit = [ 'svg' => self::MAX_SVG_BYTES, 'json' => self::MAX_JSON_BYTES, 'font' => self::MAX_FONT_BYTES ][ self::EXTENSIONS[ $ext ] ];

			if ( $size > $limit ) {
				return $fail( sprintf( '%s is too large.', $base ) );
			}

			$comp = max( 1, (int) $entry['comp'] );

			if ( $size > 1000 && $size / $comp > self::MAX_RATIO ) {
				return $fail( sprintf( '%s looks like a compression bomb.', $base ) );
			}

			$total += $size;

			if ( $total > self::MAX_TOTAL_BYTES ) {
				return $fail( 'The ZIP is too large when unpacked.' );
			}

			$accepted[ $i ] = [ 'name' => $name, 'ext' => $ext ];
		}

		if ( ! $accepted ) {
			return $fail( 'The ZIP has no SVG files and no icon font in it.' );
		}

		return [ 'ok' => true, 'error' => '', 'accepted' => $accepted ];
	}

	public static function path_is_safe( string $name ): bool {
		if ( '' === $name || false !== strpos( $name, "\0" ) || '/' === $name[0] || '\\' === $name[0] || preg_match( '/^[A-Za-z]:/', $name ) ) {
			return false;
		}

		foreach ( preg_split( '#[\\\\/]#', $name ) as $segment ) {
			if ( '..' === $segment ) {
				return false;
			}
		}

		return true;
	}
}
