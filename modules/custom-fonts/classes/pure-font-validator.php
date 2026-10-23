<?php
namespace Refraction\Modules\CustomFonts\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Decides whether an uploaded file really is a web font. The claimed extension, the declared MIME type and the
 * first bytes of the file (magic number) must all agree, and anything that looks like script is refused.
 * No WordPress calls.
 */
class Pure_Font_Validator {

	const MAX_BYTES = 5242880; // 5 MB per file.

	const EXTENSIONS = [ 'woff2', 'woff', 'ttf', 'otf' ];

	const MIMES = [
		'', 'application/octet-stream', 'font/woff2', 'font/woff', 'font/ttf', 'font/otf', 'font/sfnt',
		'application/font-woff', 'application/font-woff2', 'application/x-font-woff', 'application/x-font-ttf',
		'application/x-font-truetype', 'application/x-font-opentype', 'application/font-sfnt', 'application/vnd.ms-opentype',
		'application/x-woff', 'binary/octet-stream',
	];

	const DANGEROUS = [ 'php', 'phtml', 'phar', 'php3', 'php4', 'php5', 'php7', 'phps', 'pht', 'svg', 'svgz', 'html', 'htm', 'xhtml', 'js', 'mjs', 'exe', 'sh', 'htaccess', 'shtml', 'xml' ];

	/** @return array{ok:bool,ext:string,error:string} */
	public static function validate( string $filename, string $bytes, string $mime = '' ): array {
		$fail = static function ( string $error ): array {
			return [ 'ok' => false, 'ext' => '', 'error' => $error ];
		};

		$parts = explode( '.', strtolower( basename( str_replace( '\\', '/', $filename ) ) ) );
		$ext = count( $parts ) > 1 ? end( $parts ) : '';

		foreach ( array_slice( $parts, 1 ) as $segment ) {
			if ( in_array( $segment, self::DANGEROUS, true ) ) {
				return $fail( 'This file type is not allowed.' );
			}
		}

		if ( ! in_array( $ext, self::EXTENSIONS, true ) ) {
			return $fail( 'Only woff2, woff, ttf and otf font files are allowed.' );
		}

		if ( '' === $bytes ) {
			return $fail( 'The file is empty.' );
		}

		if ( strlen( $bytes ) > self::MAX_BYTES ) {
			return $fail( 'The file is larger than 5 MB.' );
		}

		if ( ! in_array( strtolower( trim( explode( ';', $mime )[0] ) ), self::MIMES, true ) ) {
			return $fail( 'The file type reported by the browser is not a font.' );
		}

		if ( self::detect( $bytes ) !== $ext ) {
			return $fail( 'The file content is not a valid ' . $ext . ' font.' );
		}

		if ( preg_match( '/<\?(php|=)|<script|<svg|<html|<!doctype/i', $bytes ) ) {
			return $fail( 'The file contains script or markup and was refused.' );
		}

		return [ 'ok' => true, 'ext' => $ext, 'error' => '' ];
	}

	/** Font format from the magic number, or '' when it is none of the four. */
	public static function detect( string $bytes ): string {
		$head = substr( $bytes, 0, 4 );

		switch ( true ) {
			case 'wOF2' === $head:
				return 'woff2';
			case 'wOFF' === $head:
				return 'woff';
			case "\x00\x01\x00\x00" === $head || 'true' === $head:
				return 'ttf';
			case 'OTTO' === $head:
				return 'otf';
		}

		return '';
	}
}
