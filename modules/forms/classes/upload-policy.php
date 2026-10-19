<?php
namespace Refraction\Modules\Forms\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Rules for uploaded files. An extension is accepted only if the site owner listed it and it is not
 * on the always-blocked list; every dot-separated part of the name is checked, so "a.php.jpg" fails.
 */
final class Upload_Policy {

	const BLOCKED = [
		'php', 'php3', 'php4', 'php5', 'php7', 'php8', 'phtml', 'phar', 'phps', 'pht', 'pl', 'py', 'cgi', 'asp', 'aspx', 'jsp', 'jspx', 'exe', 'com', 'bat', 'cmd', 'sh',
		'js', 'mjs', 'html', 'htm', 'xhtml', 'shtml', 'svg', 'htaccess', 'htpasswd', 'ini', 'dll', 'so', 'msi', 'jar', 'vbs', 'ps1', 'scr', 'swf',
	];

	public static function parse_types( string $raw ): array {
		$types = [];

		foreach ( preg_split( '/[\s,;]+/', strtolower( $raw ) ) as $ext ) {
			$ext = ltrim( $ext, '.' );

			if ( '' !== $ext && preg_match( '/^[a-z0-9]{1,10}$/', $ext ) && ! in_array( $ext, self::BLOCKED, true ) ) {
				$types[ $ext ] = $ext;
			}
		}

		return array_values( $types );
	}

	/**
	 * @return string|null An error message, or null when the file is acceptable.
	 */
	public static function check( array $file, array $options ): ?string {
		$name = (string) ( $file['name'] ?? '' );
		$error = (int) ( $file['error'] ?? 0 );

		if ( UPLOAD_ERR_OK !== $error ) {
			return UPLOAD_ERR_INI_SIZE === $error || UPLOAD_ERR_FORM_SIZE === $error
				? __( 'The file is too large.', 'refraction' )
				: __( 'The file could not be uploaded. Please try again.', 'refraction' );
		}

		$bad_name = __( 'This file type is not allowed.', 'refraction' );

		if ( '' === $name || false !== strpos( $name, "\0" ) || '.' === $name[0] || preg_match( '/[\x00-\x1f]/', $name ) ) {
			return $bad_name;
		}

		$parts = explode( '.', strtolower( $name ) );

		if ( count( $parts ) < 2 ) {
			return $bad_name;
		}

		array_shift( $parts );

		foreach ( $parts as $part ) {
			if ( in_array( trim( $part ), self::BLOCKED, true ) ) {
				return $bad_name;
			}
		}

		if ( ! in_array( end( $parts ), (array) ( $options['allowed'] ?? [] ), true ) ) {
			return $bad_name;
		}

		$size = (int) ( $file['size'] ?? 0 );

		if ( $size <= 0 ) {
			return __( 'The file is empty.', 'refraction' );
		}

		if ( $size > (int) ( $options['max_bytes'] ?? 0 ) ) {
			return __( 'The file is too large.', 'refraction' );
		}

		if ( preg_match( '/<\?(php|=|\s)/i', (string) ( $options['head'] ?? '' ) ) ) {
			return $bad_name;
		}

		return null;
	}

	public static function safe_name( string $name ): string {
		$name = basename( str_replace( '\\', '/', $name ) );
		$name = strtolower( preg_replace( '/[^A-Za-z0-9._\-]+/', '-', $name ) );
		$name = preg_replace( '/\.{2,}/', '.', $name );
		$name = ltrim( $name, '.-' );

		return '' === $name ? 'file' : $name;
	}
}
