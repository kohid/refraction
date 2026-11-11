<?php
namespace Refraction\Modules\OrganicFx\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Uploaded grain textures: PNG files in uploads/refraction-grain/ (kept through plugin updates), listed in one option
 * [ slug => [ 'name', 'file', 'w', 'h' ] ]. The editor turns a picture into ink (dark parts) as the alpha of a PNG;
 * the server only accepts a PNG that GD can open, and writes it again itself, so nothing else in the upload survives.
 */
class Textures_Repository {

	const OPTION = 'refraction_grain_textures';
	const MAX = 40;
	const MAX_BYTES = 4000000;
	const MAX_SIDE = 1024;

	public static function dir(): array {
		$up = wp_upload_dir();

		return [ trailingslashit( $up['basedir'] ) . 'refraction-grain', trailingslashit( $up['baseurl'] ) . 'refraction-grain' ];
	}

	public function all(): array {
		$list = get_option( self::OPTION, [] );
		$out = [];

		foreach ( is_array( $list ) ? $list : [] as $slug => $t ) {
			if ( preg_match( '/^[a-z0-9-]+$/', (string) $slug ) && is_array( $t ) && ! empty( $t['file'] ) && preg_match( '/^[a-z0-9-]+\.png$/', $t['file'] ) ) {
				$out[ $slug ] = [ 'name' => (string) ( $t['name'] ?? $slug ), 'file' => $t['file'], 'w' => (int) ( $t['w'] ?? 0 ), 'h' => (int) ( $t['h'] ?? 0 ) ];
			}
		}

		return $out;
	}

	/** For the script and the editor: id => [ name, url, w, h ]. */
	public function for_script(): array {
		$url = self::dir()[1];
		$out = [];

		foreach ( $this->all() as $slug => $t ) {
			$out[ 'tex-' . $slug ] = [ 'name' => $t['name'], 'url' => $url . '/' . $t['file'], 'w' => $t['w'], 'h' => $t['h'] ];
		}

		return $out;
	}

	/**
	 * Saves a PNG (raw bytes). Returns [ id, entry ] or a WP_Error.
	 *
	 * @return array|\WP_Error
	 */
	public function add( string $name, string $png ) {
		if ( count( $this->all() ) >= self::MAX ) {
			/* translators: %d: maximum number of textures. */
			return new \WP_Error( 'full', sprintf( __( 'There are already %d textures. Delete one first.', 'refraction' ), self::MAX ) );
		}

		$info = strlen( $png ) <= self::MAX_BYTES ? @getimagesizefromstring( $png ) : false; // phpcs:ignore WordPress.PHP.NoSilencedErrors -- a bad upload is reported below.

		if ( ! $info || IMAGETYPE_PNG !== $info[2] || ! function_exists( 'imagecreatefromstring' ) ) {
			return new \WP_Error( 'bad', __( 'That picture could not be read. Use a PNG, JPG or WebP under 4 MB.', 'refraction' ) );
		}

		$img = @imagecreatefromstring( $png ); // phpcs:ignore WordPress.PHP.NoSilencedErrors

		if ( ! $img ) {
			return new \WP_Error( 'bad', __( 'That picture could not be read.', 'refraction' ) );
		}

		$w = imagesx( $img );
		$h = imagesy( $img );

		if ( max( $w, $h ) > self::MAX_SIDE ) {
			$k = self::MAX_SIDE / max( $w, $h );
			$small = imagecreatetruecolor( max( 1, (int) round( $w * $k ) ), max( 1, (int) round( $h * $k ) ) );
			imagealphablending( $small, false );
			imagesavealpha( $small, true );
			imagecopyresampled( $small, $img, 0, 0, 0, 0, imagesx( $small ), imagesy( $small ), $w, $h );
			imagedestroy( $img );
			$img = $small;
			$w = imagesx( $img );
			$h = imagesy( $img );
		}

		imagesavealpha( $img, true );
		[ $dir ] = self::dir();
		wp_mkdir_p( $dir );

		$all = $this->all();
		$slug = substr( Pure_Shape_Store::id( $name, [] ), 3 );

		for ( $base = $slug, $i = 2; isset( $all[ $slug ] ) || file_exists( "$dir/$slug.png" ); $i++ ) {
			$slug = $base . '-' . $i;
		}

		if ( ! imagepng( $img, "$dir/$slug.png" ) ) {
			imagedestroy( $img );

			return new \WP_Error( 'write', __( 'The texture could not be saved in the uploads folder.', 'refraction' ) );
		}

		imagedestroy( $img );
		$all[ $slug ] = [ 'name' => $name, 'file' => "$slug.png", 'w' => $w, 'h' => $h ];
		update_option( self::OPTION, $all, true );

		return [ 'tex-' . $slug, $this->for_script()[ 'tex-' . $slug ] ];
	}

	public function delete( string $id ): void {
		$slug = preg_replace( '/^tex-/', '', $id );
		$all = $this->all();

		if ( isset( $all[ $slug ] ) ) {
			wp_delete_file( self::dir()[0] . '/' . $all[ $slug ]['file'] );
			unset( $all[ $slug ] );
			update_option( self::OPTION, $all, true );
		}
	}
}
