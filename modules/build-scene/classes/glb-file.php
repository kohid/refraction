<?php
namespace Refraction\Modules\BuildScene\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** What a glTF binary (.glb) looks like. Pure logic, tested in scripts/test-build-scene.php. */
class Glb_File {

	const MIME = 'model/gltf-binary';

	/** The first 12 bytes of a .glb: the magic "glTF", version 2 and a total length of at least the header. */
	public static function is_valid_header( string $head ): bool {
		if ( strlen( $head ) < 12 || 'glTF' !== substr( $head, 0, 4 ) ) {
			return false;
		}

		$fields = unpack( 'Vversion/Vlength', substr( $head, 4, 8 ) );

		return 2 === (int) $fields['version'] && (int) $fields['length'] >= 12;
	}

	/** Whether a media URL points to a .glb or .gltf file (the only models the scene loads). */
	public static function is_model_url( string $url ): bool {
		$path = (string) wp_parse_url( $url, PHP_URL_PATH );

		return '' !== $path && in_array( strtolower( pathinfo( $path, PATHINFO_EXTENSION ) ), [ 'glb', 'gltf' ], true );
	}
}
