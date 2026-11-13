<?php
namespace Refraction\Modules\AskClaude\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Refraction's own icon sets for Ask Claude and the MCP server (0.91.0): Solar (six styles) and Phosphor (six weights),
 * besides Font Awesome. An icon is accepted only when its name is in the set's own list (assets/lib/<set>/<style>.json),
 * so a made-up name never reaches a page. Pure lookups; the lists are read once per request.
 */
class Icon_Sets {

	const SETS = [
		'solar' => [ 'prefix' => 'rf-solar', 'styles' => [ 'bold-duotone', 'line-duotone', 'bold', 'linear', 'outline', 'broken' ] ],
		'phosphor' => [ 'prefix' => 'rf-ph', 'styles' => [ 'regular', 'bold', 'fill', 'duotone', 'light', 'thin' ] ],
	];

	/** @var array<string,array<string,bool>> library => names */
	private static $names = [];

	/** Libraries as the icons control stores them: solar-bold-duotone, phosphor-bold... => [ set, style ]. */
	public static function libraries(): array {
		$out = [];

		foreach ( self::SETS as $set => $spec ) {
			foreach ( $spec['styles'] as $style ) {
				$out[ $set . '-' . $style ] = [ $set, $style ];
			}
		}

		return $out;
	}

	/** @return array<string,bool> */
	public static function names( string $library ): array {
		if ( isset( self::$names[ $library ] ) ) {
			return self::$names[ $library ];
		}

		$parts = self::libraries()[ $library ] ?? null;
		$names = [];

		if ( $parts ) {
			$file = self::dir() . $parts[0] . '/' . $parts[1] . '.json';
			$data = is_readable( $file ) ? json_decode( (string) file_get_contents( $file ), true ) : null; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
			$names = is_array( $data['icons'] ?? null ) ? array_fill_keys( array_map( 'strval', $data['icons'] ), true ) : [];
		}

		return self::$names[ $library ] = $names;
	}

	/** The cleaned icon value, or null when the library or the name is not one of Refraction's. */
	public static function clean( string $library, string $value ): ?array {
		$parts = self::libraries()[ $library ] ?? null;

		if ( ! $parts ) {
			return null;
		}

		$prefix = self::SETS[ $parts[0] ]['prefix'];

		if ( 1 !== preg_match( '/^' . preg_quote( $prefix, '/' ) . ' ' . preg_quote( $prefix, '/' ) . '-([a-z0-9-]{1,60})$/', $value, $m ) || ! isset( self::names( $library )[ $m[1] ] ) ) {
			return null;
		}

		return [ 'value' => $value, 'library' => $library ];
	}

	/**
	 * Icons whose name contains every word searched, per set (one style stands for its set: every style has the same
	 * names), with the value to use.
	 *
	 * @return array<string,array<int,string>> set => values
	 */
	public static function search( string $query, int $limit = 40 ): array {
		$words = array_filter( preg_split( '/[^a-z0-9]+/', strtolower( $query ) ) );
		$out = [];

		foreach ( self::SETS as $set => $spec ) {
			$found = [];

			foreach ( array_keys( self::names( $set . '-' . $spec['styles'][0] ) ) as $name ) {
				$hit = true;

				foreach ( $words as $word ) {
					if ( false === strpos( $name, $word ) ) {
						$hit = false;
						break;
					}
				}

				if ( $hit ) {
					$found[] = $spec['prefix'] . ' ' . $spec['prefix'] . '-' . $name;
				}

				if ( count( $found ) >= $limit ) {
					break;
				}
			}

			$out[ $set ] = $found;
		}

		return $out;
	}

	/** Where the lists are; tests point it elsewhere. */
	public static $dir = null;

	private static function dir(): string {
		return self::$dir ?? ( defined( 'REFRACTION_PATH' ) ? REFRACTION_PATH . 'assets/lib/' : dirname( __DIR__, 3 ) . '/assets/lib/' );
	}
}
