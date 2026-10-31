<?php
namespace Refraction\Modules\FormBuilder\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * File uploads of the File field.
 *
 * Files never go into the media library and are never served by the web server: they live in
 * wp-content/uploads/refraction-builder/<collection>/ under a random name, the folder refuses direct requests, and an
 * administrator downloads them through an authenticated, nonce-protected handler. The type is checked against the
 * field's own list of extensions AND WordPress's real MIME detection; the original name is kept only as a label.
 */
class Uploads {

	const FOLDER = 'refraction-builder';

	/** Allowed extension => MIME types WordPress may report for it. */
	private static function mimes(): array {
		return [
			'jpg' => [ 'image/jpeg' ], 'jpeg' => [ 'image/jpeg' ], 'png' => [ 'image/png' ], 'gif' => [ 'image/gif' ], 'webp' => [ 'image/webp' ],
			'pdf' => [ 'application/pdf' ],
			'doc' => [ 'application/msword' ],
			'docx' => [ 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip' ],
			'xls' => [ 'application/vnd.ms-excel' ],
			'xlsx' => [ 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip' ],
			'csv' => [ 'text/csv', 'text/plain', 'application/csv' ],
			'txt' => [ 'text/plain' ],
			'zip' => [ 'application/zip', 'application/x-zip-compressed' ],
			'mp3' => [ 'audio/mpeg', 'audio/mp3' ],
			'mp4' => [ 'video/mp4' ],
		];
	}

	/** The name of the file input for a field path ("cv", "address.photo"). */
	public static function input_name( string $path ): string {
		return 'rfb_file__' . str_replace( '.', '__', $path );
	}

	public static function base_dir(): string {
		$upload = wp_upload_dir( null, false );

		return trailingslashit( $upload['basedir'] ) . self::FOLDER;
	}

	public static function dir( string $slug ): string {
		return self::base_dir() . '/' . Schema::slug( $slug );
	}

	/** Creates the folder with files that stop a web server from listing or serving it. */
	private static function prepare( string $slug ): bool {
		$dir = self::dir( $slug );

		if ( ! wp_mkdir_p( $dir ) ) {
			return false;
		}

		$guards = [
			self::base_dir() . '/index.php' => "<?php\n// Silence is golden.\n",
			self::base_dir() . '/.htaccess' => "Options -Indexes\n<IfModule mod_authz_core.c>\nRequire all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\nOrder deny,allow\nDeny from all\n</IfModule>\n",
			$dir . '/index.php' => "<?php\n// Silence is golden.\n",
		];

		foreach ( $guards as $file => $contents ) {
			if ( ! file_exists( $file ) ) {
				file_put_contents( $file, $contents ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
			}
		}

		return true;
	}

	/** @return array<string,array> file field path => field, for every upload field the form can hold (top level and inside groups). */
	public static function fields( array $definition ): array {
		$found = [];

		foreach ( $definition['fields'] as $field ) {
			if ( 'file' === $field['type'] ) {
				$found[ $field['key'] ] = $field;
			} elseif ( 'group' === $field['type'] ) {
				foreach ( $field['children'] as $child ) {
					if ( 'file' === $child['type'] ) {
						$found[ $field['key'] . '.' . $child['key'] ] = $child;
					}
				}
			}
		}

		return $found;
	}

	/**
	 * Checks and stores the files posted for every upload field.
	 *
	 * @param array $definition Cleaned definition.
	 * @param array $files      The $_FILES array.
	 * @param array $existing   Already stored descriptors by field path (when editing a record).
	 * @param array $remove     Descriptor ids to drop (when editing a record).
	 *
	 * @return array{files:array<string,array>,errors:array<string,string>,added:string[]} Final descriptors per path, messages per path, ids stored by this call.
	 */
	public function process( array $definition, array $files, array $existing = [], array $remove = [] ): array {
		$result = [ 'files' => [], 'errors' => [], 'added' => [] ];

		foreach ( self::fields( $definition ) as $path => $field ) {
			$kept = array_values( array_filter( (array) ( $existing[ $path ] ?? [] ), static function ( $file ) use ( $remove ) {
				return is_array( $file ) && isset( $file['id'] ) && ! in_array( $file['id'], $remove, true );
			} ) );
			$incoming = $this->incoming( $files[ self::input_name( $path ) ] ?? null );

			if ( $incoming && 1 === $field['max_files'] ) {
				$kept = []; // A single-file field is replaced by the new upload.
			}

			foreach ( $incoming as $upload ) {
				if ( count( $kept ) >= $field['max_files'] ) {
					$result['errors'][ $path ] = sprintf( Schema::t( 'You can upload at most %d files here.' ), $field['max_files'] );
					break;
				}

				$stored = $this->store( $definition['slug'], $field, $upload );

				if ( is_string( $stored ) ) {
					$result['errors'][ $path ] = $stored;
					continue;
				}

				$kept[] = $stored;
				$result['added'][] = $stored['id'];
			}

			$result['files'][ $path ] = $kept;
		}

		return $result;
	}

	/** Flattens PHP's file array shape (single or multiple) into a list of single uploads, skipping empty slots. */
	private function incoming( $entry ): array {
		if ( ! is_array( $entry ) || ! isset( $entry['name'] ) ) {
			return [];
		}

		$uploads = [];
		$names = (array) $entry['name'];

		foreach ( array_keys( $names ) as $i ) {
			$error = (int) ( is_array( $entry['error'] ) ? $entry['error'][ $i ] : $entry['error'] );

			if ( UPLOAD_ERR_NO_FILE === $error ) {
				continue;
			}

			$uploads[] = [
				'name' => (string) $names[ $i ],
				'tmp_name' => (string) ( is_array( $entry['tmp_name'] ) ? $entry['tmp_name'][ $i ] : $entry['tmp_name'] ),
				'size' => (int) ( is_array( $entry['size'] ) ? $entry['size'][ $i ] : $entry['size'] ),
				'error' => $error,
			];
		}

		return $uploads;
	}

	/** @return array|string The stored descriptor, or a message for the visitor. */
	private function store( string $slug, array $field, array $upload ) {
		$name = sanitize_file_name( wp_basename( $upload['name'] ) );

		if ( UPLOAD_ERR_OK !== $upload['error'] ) {
			return UPLOAD_ERR_INI_SIZE === $upload['error'] || UPLOAD_ERR_FORM_SIZE === $upload['error']
				? sprintf( Schema::t( '%s is too large.' ), $name )
				: sprintf( Schema::t( '%s could not be uploaded.' ), $name );
		}

		if ( ! is_uploaded_file( $upload['tmp_name'] ) ) {
			return sprintf( Schema::t( '%s could not be uploaded.' ), $name );
		}

		if ( $upload['size'] > $field['max_size'] * 1024 * 1024 ) {
			return sprintf( Schema::t( '%1$s is larger than %2$s MB.' ), $name, rtrim( rtrim( number_format( $field['max_size'], 1, '.', '' ), '0' ), '.' ) );
		}

		$ext = strtolower( pathinfo( $name, PATHINFO_EXTENSION ) );
		$mimes = self::mimes();

		if ( ! in_array( $ext, $field['accept'], true ) || ! isset( $mimes[ $ext ] ) ) {
			return sprintf( Schema::t( '%1$s is not an allowed file type. Allowed: %2$s.' ), $name, implode( ', ', $field['accept'] ) );
		}

		$check = wp_check_filetype_and_ext( $upload['tmp_name'], $name, [ $ext => $mimes[ $ext ][0] ] );
		$real = '';

		if ( function_exists( 'finfo_open' ) ) {
			$finfo = finfo_open( FILEINFO_MIME_TYPE );
			$real = $finfo ? (string) finfo_file( $finfo, $upload['tmp_name'] ) : '';
		}

		if ( ( $real && ! in_array( $real, $mimes[ $ext ], true ) ) || ( ! $real && ! $check['ext'] ) ) {
			return sprintf( Schema::t( '%s does not look like a real %s file.' ), $name, strtoupper( $ext ) );
		}

		if ( ! self::prepare( $slug ) ) {
			return Schema::t( 'The upload folder is not writable.' );
		}

		$id = bin2hex( random_bytes( 16 ) );
		$target = self::dir( $slug ) . '/' . $id . '.' . $ext;
		if ( ! move_uploaded_file( $upload['tmp_name'], $target ) ) {
			return sprintf( Schema::t( '%s could not be saved.' ), $name );
		}

		chmod( $target, 0640 ); // phpcs:ignore WordPress.WP.AlternativeFunctions.chmod_chmod

		return [ 'id' => $id, 'name' => $name, 'size' => $upload['size'], 'type' => $real ?: $mimes[ $ext ][0], 'ext' => $ext ];
	}

	/** Path of a stored file, or '' when the descriptor is not a valid one. */
	public static function path( string $slug, array $file ): string {
		$id = (string) ( $file['id'] ?? '' );
		$ext = (string) ( $file['ext'] ?? '' );

		if ( 1 !== preg_match( '/^[a-f0-9]{32}$/', $id ) || ! isset( self::mimes()[ $ext ] ) ) {
			return '';
		}

		return self::dir( $slug ) . '/' . $id . '.' . $ext;
	}

	/** Every descriptor found anywhere in a record's values (groups included). */
	public static function descriptors( $values ): array {
		$found = [];

		if ( ! is_array( $values ) ) {
			return $found;
		}

		if ( isset( $values['id'], $values['ext'] ) && is_string( $values['id'] ) ) {
			return [ $values ];
		}

		foreach ( $values as $value ) {
			$found = array_merge( $found, self::descriptors( $value ) );
		}

		return $found;
	}

	/** Deletes stored files by descriptor. */
	public static function delete( string $slug, array $descriptors ): void {
		foreach ( $descriptors as $file ) {
			$path = self::path( $slug, (array) $file );

			if ( '' !== $path && file_exists( $path ) ) {
				wp_delete_file( $path );
			}
		}
	}

	/** Removes files that were stored during this request but ended up in no saved value (for example a hidden field's upload). */
	public static function prune( string $slug, array $added_ids, array $values ): void {
		$kept = array_column( self::descriptors( $values ), 'id' );
		$orphans = array_diff( $added_ids, $kept );

		foreach ( $orphans as $id ) {
			foreach ( array_keys( self::mimes() ) as $ext ) {
				self::delete( $slug, [ [ 'id' => $id, 'ext' => $ext ] ] );
			}
		}
	}
}
