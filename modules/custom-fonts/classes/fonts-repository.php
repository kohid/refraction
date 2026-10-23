<?php
namespace Refraction\Modules\CustomFonts\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Custom font families, kept in one option and their files under uploads/refraction-fonts/<family>/.
 * Everything read back is re-cleaned, so a tampered option cannot print markup.
 */
class Fonts_Repository {

	const OPTION = 'refraction_custom_fonts';
	const DIR = 'refraction-fonts';

	public static function base_dir(): string {
		$u = wp_upload_dir( null, false );

		return trailingslashit( $u['basedir'] ) . self::DIR;
	}

	public static function base_url(): string {
		$u = wp_upload_dir( null, false );

		return set_url_scheme( trailingslashit( $u['baseurl'] ) . self::DIR );
	}

	/** @return array<string,array> slug => family */
	public function all(): array {
		$raw = get_option( self::OPTION, [] );
		$out = [];

		foreach ( is_array( $raw ) ? $raw : [] as $slug => $family ) {
			if ( ! is_array( $family ) ) {
				continue;
			}

			$name = Pure_Font_Face_Css::clean_family( (string) ( $family['family'] ?? '' ) );
			$slug = sanitize_key( (string) $slug );

			if ( '' === $name || '' === $slug ) {
				continue;
			}

			$variations = [];

			foreach ( (array) ( $family['variations'] ?? [] ) as $vid => $v ) {
				$files = [];

				foreach ( array_keys( Pure_Font_Face_Css::FORMATS ) as $ext ) {
					$path = Pure_Font_Face_Css::clean_path( (string) ( $v['files'][ $ext ] ?? '' ) );

					if ( '' !== $path ) {
						$files[ $ext ] = $path;
					}
				}

				if ( $files ) {
					$variations[ sanitize_key( (string) $vid ) ] = [
						'weight' => Pure_Font_Face_Css::clean_weight( (string) ( $v['weight'] ?? '' ) ),
						'style' => Pure_Font_Face_Css::clean_style( (string) ( $v['style'] ?? '' ) ),
						'files' => $files,
					];
				}
			}

			$out[ $slug ] = [
				'family' => $name,
				'display' => Pure_Font_Face_Css::clean_display( (string) ( $family['display'] ?? '' ) ),
				'preload' => ! empty( $family['preload'] ),
				'variations' => $variations,
			];
		}

		return $out;
	}

	public function names(): array {
		return array_values( array_map( static function ( $f ) {
			return $f['family'];
		}, $this->all() ) );
	}

	private function save( array $all ): void {
		update_option( self::OPTION, $all, false );
		do_action( 'refraction/custom_fonts/changed' );
	}

	public static function slug_for( string $family ): string {
		return sanitize_key( str_replace( ' ', '-', strtolower( $family ) ) );
	}

	/**
	 * @param array<int,array{weight:string,style:string,files:array<string,string>}> $variations
	 */
	public function add( string $family, string $display, bool $preload, array $variations ): void {
		$all = $this->all();
		$slug = self::slug_for( $family );
		$current = $all[ $slug ] ?? [ 'family' => $family, 'variations' => [] ];

		foreach ( $variations as $v ) {
			$current['variations'][ 'v' . bin2hex( random_bytes( 4 ) ) ] = $v;
		}

		$current['display'] = $display;
		$current['preload'] = $preload;
		$all[ $slug ] = $current;
		$this->save( $all );
	}

	public function delete_family( string $slug ): void {
		$all = $this->all();

		if ( ! isset( $all[ $slug ] ) ) {
			return;
		}

		unset( $all[ $slug ] );
		$this->remove_dir( self::base_dir() . '/' . $slug );
		$this->save( $all );
	}

	public function delete_variation( string $slug, string $vid ): void {
		$all = $this->all();

		if ( ! isset( $all[ $slug ]['variations'][ $vid ] ) ) {
			return;
		}

		foreach ( $all[ $slug ]['variations'][ $vid ]['files'] as $path ) {
			$file = self::base_dir() . '/' . $path;

			if ( is_file( $file ) ) {
				wp_delete_file( $file );
			}
		}

		unset( $all[ $slug ]['variations'][ $vid ] );

		if ( ! $all[ $slug ]['variations'] ) {
			$this->remove_dir( self::base_dir() . '/' . $slug );
			unset( $all[ $slug ] );
		}

		$this->save( $all );
	}

	private function remove_dir( string $dir ): void {
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
