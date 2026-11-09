<?php
namespace Elementor\Modules\Blender\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Teaches WordPress about glTF 2.0 files.
 *
 * WordPress rejects `.glb` / `.gltf` uploads by default, and PHP's fileinfo reports a binary
 * glTF as `application/octet-stream`, so the extension alone is not enough. Uploads are allowed
 * only when the file content really is glTF 2.0.
 */
class Gltf_Files {

	const MIME_TYPES = [
		'glb' => 'model/gltf-binary',
		'gltf' => 'model/gltf+json',
	];

	const GLB_MAGIC = 'glTF';

	/**
	 * A `.gltf` file is parsed whole to check it, so very large ones are refused.
	 * Blender add-on exports are `.glb`, which only needs its 12-byte header read.
	 */
	const MAX_GLTF_JSON_BYTES = 33554432; // 32 MB.

	public function register_hooks(): void {
		add_filter( 'upload_mimes', [ $this, 'add_upload_mimes' ] );
		add_filter( 'mime_types', [ $this, 'add_mime_types' ] );
		add_filter( 'wp_check_filetype_and_ext', [ $this, 'check_filetype_and_ext' ], 10, 3 );
	}

	public function add_upload_mimes( $mimes ) {
		if ( ! is_array( $mimes ) ) {
			return $mimes;
		}

		return array_merge( $mimes, self::MIME_TYPES );
	}

	public function add_mime_types( $mimes ) {
		return $this->add_upload_mimes( $mimes );
	}

	/**
	 * @param array  $data     Values WordPress worked out: ext, type, proper_filename.
	 * @param string $file     Full path to the uploaded file.
	 * @param string $filename The name the file was uploaded with.
	 *
	 * @return array
	 */
	public function check_filetype_and_ext( $data, $file, $filename ) {
		$ext = strtolower( pathinfo( (string) $filename, PATHINFO_EXTENSION ) );

		if ( ! isset( self::MIME_TYPES[ $ext ] ) ) {
			return $data;
		}

		$is_valid = 'glb' === $ext
			? self::is_valid_glb( $file )
			: self::is_valid_gltf_json( $file );

		if ( ! $is_valid ) {
			return [
				'ext' => false,
				'type' => false,
				'proper_filename' => false,
			];
		}

		return [
			'ext' => $ext,
			'type' => self::MIME_TYPES[ $ext ],
			'proper_filename' => false,
		];
	}

	public static function is_model_mime_type( $mime_type ): bool {
		return in_array( $mime_type, self::MIME_TYPES, true );
	}

	/**
	 * A GLB starts with a 12-byte header: magic "glTF", uint32 version, uint32 total length.
	 */
	public static function is_valid_glb( $file ): bool {
		if ( ! is_string( $file ) || ! is_readable( $file ) ) {
			return false;
		}

		$size = filesize( $file );

		if ( false === $size || $size < 12 ) {
			return false;
		}

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fopen
		$handle = fopen( $file, 'rb' );

		if ( ! $handle ) {
			return false;
		}

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fread
		$header = fread( $handle, 12 );
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fclose
		fclose( $handle );

		if ( ! is_string( $header ) || 12 !== strlen( $header ) ) {
			return false;
		}

		$fields = unpack( 'a4magic/Vversion/Vlength', $header );

		return self::GLB_MAGIC === $fields['magic']
			&& 2 === $fields['version']
			&& $size === $fields['length'];
	}

	public static function is_valid_gltf_json( $file ): bool {
		if ( ! is_string( $file ) || ! is_readable( $file ) ) {
			return false;
		}

		$size = filesize( $file );

		if ( false === $size || $size < 2 || $size > self::MAX_GLTF_JSON_BYTES ) {
			return false;
		}

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		$json = json_decode( (string) file_get_contents( $file ), true );

		if ( ! is_array( $json ) || ! isset( $json['asset']['version'] ) || ! is_string( $json['asset']['version'] ) ) {
			return false;
		}

		return 0 === strpos( $json['asset']['version'], '2.' );
	}
}
