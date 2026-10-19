<?php
namespace Refraction\Modules\DisplayConditions\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Reads the visitor's device class and languages from request headers. The device is an approximation: it
 * trusts the `Sec-CH-UA-Mobile` client hint when the browser sends it and falls back to User-Agent patterns.
 */
class Visitor_Hints {

	public static function device( string $user_agent, string $ch_mobile ): string {
		$ua = strtolower( substr( $user_agent, 0, 500 ) );

		if ( preg_match( '~ipad|tablet|kindle|silk/|playbook|nexus (7|9|10)~', $ua ) ) {
			return 'tablet';
		}

		if ( false !== strpos( $ua, 'android' ) && false === strpos( $ua, 'mobile' ) ) {
			return 'tablet';
		}

		if ( '?1' === trim( $ch_mobile ) ) {
			return 'mobile';
		}

		if ( preg_match( '~mobi|iphone|ipod|android|windows phone|blackberry|opera mini~', $ua ) ) {
			return 'mobile';
		}

		return 'desktop';
	}

	/** @return string[] Language tags from an Accept-Language header, best first. */
	public static function languages( string $header ): array {
		$found = [];

		foreach ( explode( ',', substr( $header, 0, 300 ) ) as $index => $part ) {
			$bits = explode( ';', trim( $part ) );
			$tag = strtolower( trim( $bits[0] ) );

			if ( ! preg_match( '~^[a-z]{2,3}(-[a-z0-9]{2,8})*$~', $tag ) ) {
				continue;
			}

			$quality = 1.0;

			if ( isset( $bits[1] ) && preg_match( '~q\s*=\s*([0-9.]+)~', $bits[1], $m ) ) {
				$quality = (float) $m[1];
			}

			$found[] = [ $tag, $quality, $index ];
		}

		usort( $found, static fn( $a, $b ) => [ $b[1], $a[2] ] <=> [ $a[1], $b[2] ] );

		return array_values( array_unique( array_map( static fn( $row ) => $row[0], $found ) ) );
	}
}
