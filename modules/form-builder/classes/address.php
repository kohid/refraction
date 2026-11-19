<?php
namespace Refraction\Modules\FormBuilder\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * The Address field (0.123.0): addresses suggested while the visitor types, from the site owner's own list (typed in
 * the field, or a .txt / .csv file in the Media Library, one address per line). Nothing is asked of an outside
 * service: a long list is searched by this site (Shortcodes::address_search), a short one in the browser.
 *
 * The matching is the same here and in assets/js/frontend.js (searchAddresses): every word typed must start a word of
 * the address ("inver high" finds "Inverness, Highland"); addresses that start with what was typed come first, then
 * shorter ones.
 */
class Address {

	/** A list this long or shorter goes to the browser with the page; a longer one is searched by the site. */
	const INLINE = 300;

	/** The most lines read from a file. */
	const MAX_LINES = 50000;

	/** The addresses of a field: its own list, then its file's lines (each once). */
	public static function lines( array $field ): array {
		$lines = (array) ( $field['address_list'] ?? [] );
		$file = (int) ( $field['address_file'] ?? 0 );

		if ( $file ) {
			$lines = array_merge( $lines, self::file_lines( $file ) );
		}

		return array_values( array_unique( $lines ) );
	}

	/** Cleans a typed list: one address per line, trimmed, each once. */
	public static function clean_list( $raw, int $max = 5000 ): array {
		$out = [];

		foreach ( is_array( $raw ) ? $raw : preg_split( '/\r\n|\r|\n/', (string) $raw ) as $line ) {
			$line = self::line( (string) $line );

			if ( '' !== $line ) {
				$out[ $line ] = true;
			}

			if ( count( $out ) >= $max ) {
				break;
			}
		}

		return array_keys( $out );
	}

	/** One line of a list or file: outer quotes of a CSV cell dropped, cells joined with ", ", spaces tidied. */
	private static function line( string $line ): string {
		$line = trim( $line );

		if ( '' !== $line && '"' === $line[0] ) {
			$line = implode( ', ', array_filter( array_map( 'trim', str_getcsv( $line ) ), 'strlen' ) );
		}

		$line = (string) preg_replace( '/\s+/u', ' ', strip_tags( $line ) );

		return function_exists( 'mb_substr' ) ? mb_substr( $line, 0, 200 ) : substr( $line, 0, 200 );
	}

	/** The lines of a .txt or .csv file from the Media Library, kept for a day (until the file changes). */
	private static function file_lines( int $id ): array {
		if ( ! function_exists( 'get_attached_file' ) ) {
			return [];
		}

		$path = (string) get_attached_file( $id );
		$type = (string) get_post_mime_type( $id );

		if ( '' === $path || ! is_readable( $path ) || ! in_array( $type, [ 'text/plain', 'text/csv' ], true ) || filesize( $path ) > 8 * MB_IN_BYTES ) {
			return [];
		}

		$cache = 'rfb_addr_' . $id . '_' . filemtime( $path );
		$lines = get_transient( $cache );

		if ( ! is_array( $lines ) ) {
			$lines = self::clean_list( (string) file_get_contents( $path ), self::MAX_LINES ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- A local upload.
			set_transient( $cache, $lines, DAY_IN_SECONDS );
		}

		return $lines;
	}

	/** Lower case, commas and extra spaces out: the text that is matched. */
	private static function fold( string $text ): string {
		$text = function_exists( 'mb_strtolower' ) ? mb_strtolower( $text ) : strtolower( $text );

		return trim( (string) preg_replace( '/[\s,]+/u', ' ', $text ) );
	}

	/**
	 * The addresses that match what was typed, best first.
	 *
	 * @param string[] $lines The addresses.
	 */
	public static function search( array $lines, string $typed, int $max ): array {
		$typed = self::fold( $typed );

		if ( '' === $typed ) {
			return [];
		}

		$words = explode( ' ', $typed );
		$found = [];

		foreach ( $lines as $line ) {
			$folded = self::fold( $line );
			$starts = ' ' . $folded;

			foreach ( $words as $word ) {
				if ( false === strpos( $starts, ' ' . $word ) ) {
					continue 2;
				}
			}

			$found[] = [ 0 === strpos( $folded, $typed ) ? 0 : 1, strlen( $line ), $line ];

			if ( count( $found ) > 2000 ) {
				break;
			}
		}

		usort( $found, static function ( $a, $b ) {
			return [ $a[0], $a[1], $a[2] ] <=> [ $b[0], $b[1], $b[2] ];
		} );

		return array_column( array_slice( $found, 0, max( 1, $max ) ), 2 );
	}

	/** Photon, OpenStreetMap's address search (0.125.0): asked by this site's server, never by the visitor's browser. */
	const PHOTON = 'https://photon.komoot.io/api/';

	/** Whether the field looks addresses up in OpenStreetMap (Address source > Real addresses). */
	public static function is_online( array $field ): bool {
		return 'osm' === ( $field['address_source'] ?? '' );
	}

	/**
	 * The suggestions for what was typed: the field's own addresses that match, then (when the field looks real
	 * addresses up) OpenStreetMap's, each once, at most the field's "Suggestions shown".
	 */
	public static function suggest( array $field, string $typed ): array {
		$max = max( 1, (int) ( $field['address_max'] ?? 8 ) );
		$found = self::search( self::lines( $field ), $typed, $max );

		if ( self::is_online( $field ) && count( $found ) < $max ) {
			$found = array_values( array_unique( array_merge( $found, self::lookup( $field, $typed, $max ) ) ) );
		}

		return array_slice( $found, 0, $max );
	}

	/**
	 * OpenStreetMap addresses for what was typed, labelled as a person writes them ("Inverness Museum & Art Gallery,
	 * Castle Wynd, Crown and City Centre, Inverness, Highland, IV2 3EB"), near the field's place first and only in its
	 * countries. Kept for a week per question, so the service is asked once for a common search.
	 */
	public static function lookup( array $field, string $typed, int $max = 8 ): array {
		$typed = trim( preg_replace( '/\s+/u', ' ', $typed ) );

		if ( ( function_exists( 'mb_strlen' ) ? mb_strlen( $typed ) : strlen( $typed ) ) < 2 || ! function_exists( 'wp_remote_get' ) ) {
			return [];
		}

		$query = [ 'q' => $typed, 'limit' => min( 20, $max * 2 ), 'lang' => 'en' ];
		$near = self::near( (string) ( $field['address_near'] ?? '' ) );

		if ( $near ) {
			$query['lat'] = $near[0];
			$query['lon'] = $near[1];
		}

		$countries = self::countries( (string) ( $field['address_country'] ?? '' ) );
		$cache = 'rfb_osm_' . md5( wp_json_encode( [ $query, $countries ] ) );
		$labels = get_transient( $cache );

		if ( ! is_array( $labels ) ) {
			$response = wp_remote_get( add_query_arg( array_map( 'rawurlencode', $query ), self::PHOTON ), [ 'timeout' => 5, 'user-agent' => 'Refraction Form Builder address field' ] );

			if ( is_wp_error( $response ) || 200 !== (int) wp_remote_retrieve_response_code( $response ) ) {
				return [];
			}

			$labels = self::labels( (array) json_decode( (string) wp_remote_retrieve_body( $response ), true ), $countries );
			set_transient( $cache, $labels, WEEK_IN_SECONDS );
		}

		return array_slice( $labels, 0, $max );
	}

	/**
	 * Photon's places as address lines: name, house number and street, district, town (when not the name), county,
	 * postcode; each part once.
	 *
	 * @param array    $geo       Photon's answer (GeoJSON).
	 * @param string[] $countries Two-letter codes to keep (none: all).
	 */
	public static function labels( array $geo, array $countries = [] ): array {
		$labels = [];

		foreach ( (array) ( $geo['features'] ?? [] ) as $feature ) {
			$p = (array) ( $feature['properties'] ?? [] );

			if ( $countries && ! in_array( strtoupper( (string) ( $p['countrycode'] ?? '' ) ), $countries, true ) ) {
				continue;
			}

			$street = trim( ( (string) ( $p['housenumber'] ?? '' ) ) . ' ' . ( (string) ( $p['street'] ?? '' ) ) );
			$parts = [];

			foreach ( [ $p['name'] ?? '', $street, $p['district'] ?? '', $p['city'] ?? '', $p['county'] ?? '', $p['postcode'] ?? '' ] as $part ) {
				$part = self::line( (string) $part );

				if ( '' !== $part && ! in_array( strtolower( $part ), array_map( 'strtolower', $parts ), true ) ) {
					$parts[] = $part;
				}
			}

			$label = implode( ', ', $parts );

			if ( '' !== $label && ! in_array( $label, $labels, true ) ) {
				$labels[] = $label;
			}
		}

		return $labels;
	}

	/** "57.48, -4.22" as [ lat, lng ], or null. */
	public static function near( string $text ): ?array {
		return 1 === preg_match( '/^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/', $text, $m ) && abs( (float) $m[1] ) <= 90 && abs( (float) $m[2] ) <= 180 ? [ (float) $m[1], (float) $m[2] ] : null;
	}

	/** "GB, IE" as [ 'GB', 'IE' ]. */
	public static function countries( string $text ): array {
		return array_values( array_filter( array_map( 'strtoupper', preg_split( '/[\s,]+/', $text ) ), static function ( $code ) {
			return 1 === preg_match( '/^[A-Z]{2}$/', $code );
		} ) );
	}

	/** Whether an answer is one of the field's addresses (for "Only addresses from the list"). */
	public static function allows( array $field, string $value ): bool {
		$value = self::fold( $value );

		// Looked up: the answer must be one OpenStreetMap gives for itself.
		if ( self::is_online( $field ) ) {
			$first = trim( (string) strtok( $value, ',' ) );

			foreach ( array_merge( self::lookup( $field, $value, 20 ), self::lookup( $field, $first, 20 ) ) as $label ) {
				if ( self::fold( $label ) === $value ) {
					return true;
				}
			}
		}

		foreach ( self::lines( $field ) as $line ) {
			if ( self::fold( $line ) === $value ) {
				return true;
			}
		}

		return false;
	}
}
