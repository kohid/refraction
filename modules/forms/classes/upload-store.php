<?php
namespace Refraction\Modules\Forms\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Where uploaded form files live: uploads/refraction-forms/YYYY/MM/<random>-<name>.
 *
 * The folder carries deny rules for Apache and IIS and an index file, file names start with 128
 * random bits, and the only way the plugin hands a file out is the capability- and nonce-checked
 * download in the Submissions screen.
 */
final class Upload_Store {

	const FOLDER = 'refraction-forms';

	public static function base_dir(): string {
		$uploads = wp_upload_dir( null, false );

		return wp_normalize_path( trailingslashit( $uploads['basedir'] ) . self::FOLDER );
	}

	public static function protect( string $dir ): void {
		if ( ! is_dir( $dir ) ) {
			wp_mkdir_p( $dir );
		}

		$files = [
			'.htaccess' => "<IfModule mod_authz_core.c>\nRequire all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\nOrder allow,deny\nDeny from all\n</IfModule>\nOptions -Indexes\n",
			'index.php' => "<?php\n// Silence is golden.\n",
			'web.config' => "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<configuration><system.webServer><authorization><deny users=\"*\" /></authorization></system.webServer></configuration>\n",
		];

		foreach ( $files as $name => $content ) {
			if ( ! file_exists( $dir . '/' . $name ) ) {
				file_put_contents( $dir . '/' . $name, $content ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
			}
		}
	}

	/**
	 * Moves a validated upload into the protected folder.
	 *
	 * @return array|null ['name' => original name, 'path' => relative path, 'size' => bytes]
	 */
	public static function store( array $file ): ?array {
		$tmp = (string) ( $file['tmp_name'] ?? '' );

		if ( '' === $tmp || ! is_uploaded_file( $tmp ) ) {
			return null;
		}

		$base = self::base_dir();
		self::protect( $base );
		$sub = gmdate( 'Y' ) . '/' . gmdate( 'm' );
		$dir = $base . '/' . $sub;
		wp_mkdir_p( $dir );
		self::protect( $dir );

		$stored = bin2hex( random_bytes( 16 ) ) . '-' . Upload_Policy::safe_name( (string) $file['name'] );

		if ( ! move_uploaded_file( $tmp, $dir . '/' . $stored ) ) { // phpcs:ignore Generic.PHP.ForbiddenFunctions
			return null;
		}

		chmod( $dir . '/' . $stored, 0640 ); // phpcs:ignore WordPress.WP.AlternativeFunctions.chmod_chmod

		return [ 'name' => Upload_Policy::safe_name( (string) $file['name'] ), 'path' => $sub . '/' . $stored, 'size' => (int) $file['size'] ];
	}

	/** Absolute path of a stored file, or '' when the path points outside the folder. */
	public static function resolve( string $relative ): string {
		$base = realpath( self::base_dir() );
		$full = realpath( self::base_dir() . '/' . ltrim( $relative, '/' ) );

		if ( ! $base || ! $full || 0 !== strpos( $full, $base . DIRECTORY_SEPARATOR ) || ! is_file( $full ) ) {
			return '';
		}

		return $full;
	}

	public static function delete_stored( string $json ): void {
		$data = json_decode( $json, true );

		if ( is_array( $data ) && ! empty( $data['path'] ) ) {
			$full = self::resolve( (string) $data['path'] );

			if ( '' !== $full ) {
				wp_delete_file( $full );
			}
		}
	}
}
