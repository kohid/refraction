<?php
namespace Refraction\Modules\CustomIcons\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Custom icon sets: metadata in one option, files in uploads/refraction-icons/<set>/. Reads are re-cleaned.
 */
class Sets_Repository {

	const OPTION = 'refraction_custom_icon_sets';
	const DIR = 'refraction-icons';

	public static function base_dir(): string {
		$u = wp_upload_dir( null, false );

		return trailingslashit( $u['basedir'] ) . self::DIR;
	}

	public static function base_url(): string {
		$u = wp_upload_dir( null, false );

		return set_url_scheme( trailingslashit( $u['baseurl'] ) . self::DIR );
	}

	/** @return array<string,array{name:string,type:string,icons:array,fonts:array,time:int}> */
	public function all(): array {
		$raw = get_option( self::OPTION, [] );
		$out = [];

		foreach ( is_array( $raw ) ? $raw : [] as $slug => $set ) {
			$slug = Pure_Icon_Set::set_slug( (string) $slug );
			$type = $set['type'] ?? '';

			if ( '' === $slug || ! in_array( $type, [ 'svg', 'font' ], true ) || empty( $set['icons'] ) || ! is_array( $set['icons'] ) ) {
				continue;
			}

			$icons = [];

			foreach ( $set['icons'] as $name => $value ) {
				$name = Pure_Icon_Set::icon_name( (string) $name );

				if ( 'svg' === $type && '' !== Pure_Icon_Set::safe_file( (string) $value ) ) {
					$icons[ $name ] = (string) $value;
				} elseif ( 'font' === $type && is_int( $value ) ) {
					$icons[ $name ] = $value;
				}
			}

			$fonts = [];

			foreach ( (array) ( $set['fonts'] ?? [] ) as $ext => $file ) {
				if ( isset( Pure_Icon_Set::FORMATS[ $ext ] ) && '' !== Pure_Icon_Set::safe_file( (string) $file ) ) {
					$fonts[ $ext ] = (string) $file;
				}
			}

			if ( $icons ) {
				$out[ $slug ] = [
					'name' => \Refraction\Modules\CustomFonts\Classes\Pure_Font_Face_Css::clean_family( (string) ( $set['name'] ?? $slug ) ),
					'type' => $type,
					'icons' => $icons,
					'fonts' => $fonts,
					'time' => (int) ( $set['time'] ?? 0 ),
				];
			}
		}

		return $out;
	}

	public function save_set( string $slug, array $set ): void {
		$all = $this->all();
		$all[ $slug ] = $set;
		update_option( self::OPTION, $all, false );
	}

	public function delete_set( string $slug ): void {
		$all = $this->all();

		if ( ! isset( $all[ $slug ] ) ) {
			return;
		}

		unset( $all[ $slug ] );
		update_option( self::OPTION, $all, false );
		self::remove_dir( self::base_dir() . '/' . $slug );
	}

	public static function remove_dir( string $dir ): void {
		$base = realpath( self::base_dir() );
		$real = realpath( $dir );

		if ( ! $base || ! $real || 0 !== strpos( $real, $base . DIRECTORY_SEPARATOR ) ) {
			return;
		}

		foreach ( (array) glob( $real . '/*' ) as $file ) {
			if ( is_file( $file ) ) {
				wp_delete_file( $file );
			}
		}

		@rmdir( $real ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
	}
}
