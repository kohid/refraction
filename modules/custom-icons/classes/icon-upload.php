<?php
namespace Refraction\Modules\CustomIcons\Classes;

use Refraction\Modules\CustomFonts\Classes\Pure_Font_Validator;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Unpacks an uploaded icon ZIP into a set. Nothing is extracted with extractTo(): every accepted entry is read
 * into memory, checked (SVG sanitised, fonts sniffed) and written under a name we generate, so a hostile archive
 * can neither escape the folder nor drop a script.
 */
class Icon_Upload {

	const MAX_ZIP_BYTES = 10485760;

	/** @return array{error:string,set:array,slug:string} */
	public function process( string $name, array $file ): array {
		$slug = Pure_Icon_Set::set_slug( $name );

		if ( '' === $slug ) {
			return $this->fail( 'Give the icon set a name made of letters or digits.' );
		}

		if ( ! class_exists( '\ZipArchive' ) ) {
			return $this->fail( 'This server cannot read ZIP files (the PHP zip extension is missing).' );
		}

		if ( ! isset( $file['error'] ) || UPLOAD_ERR_OK !== $file['error'] || ! is_uploaded_file( (string) $file['tmp_name'] ) ) {
			return $this->fail( 'Choose a ZIP file to upload.' );
		}

		if ( (int) $file['size'] > self::MAX_ZIP_BYTES ) {
			return $this->fail( 'The ZIP is larger than 10 MB.' );
		}

		if ( 'zip' !== strtolower( pathinfo( (string) $file['name'], PATHINFO_EXTENSION ) ) || "PK\x03\x04" !== (string) file_get_contents( $file['tmp_name'], false, null, 0, 4 ) ) { // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
			return $this->fail( 'That file is not a ZIP archive.' );
		}

		$zip = new \ZipArchive();

		if ( true !== $zip->open( $file['tmp_name'] ) ) {
			return $this->fail( 'The ZIP could not be opened.' );
		}

		$entries = [];

		for ( $i = 0; $i < $zip->numFiles; $i++ ) {
			$st = $zip->statIndex( $i );
			$entries[ $i ] = [ 'name' => (string) $st['name'], 'size' => (int) $st['size'], 'comp' => (int) $st['comp_size'] ];
		}

		$check = Pure_Zip_Validator::check( $entries );

		if ( ! $check['ok'] ) {
			$zip->close();

			return $this->fail( $check['error'] );
		}

		$svgs = [];
		$fonts = [];
		$meta = null;

		foreach ( $check['accepted'] as $i => $entry ) {
			$bytes = $zip->getFromIndex( $i );

			if ( ! is_string( $bytes ) ) {
				continue;
			}

			$base = strtolower( basename( str_replace( '\\', '/', $entry['name'] ) ) );

			if ( 'svg' === $entry['ext'] ) {
				$svgs[ $i ] = [ 'path' => $entry['name'], 'svg' => Pure_Svg_Sanitizer::sanitize( $bytes ) ];
			} elseif ( 'json' === $entry['ext'] && in_array( $base, [ 'selection.json', 'config.json' ], true ) ) {
				$meta = 'selection.json' === $base ? Pure_Icon_Set::parse_icomoon( $bytes ) : Pure_Icon_Set::parse_fontello( $bytes );
			} elseif ( isset( Pure_Icon_Set::FORMATS[ $entry['ext'] ] ) && ! isset( $fonts[ $entry['ext'] ] ) ) {
				$check_font = Pure_Font_Validator::validate( $base, $bytes, '' );

				if ( $check_font['ok'] ) {
					$fonts[ $entry['ext'] ] = $bytes;
				}
			}
		}

		$zip->close();

		$dir = Sets_Repository::base_dir() . '/' . $slug;

		if ( $meta && $fonts ) {
			$set = [ 'name' => $name, 'type' => 'font', 'icons' => $meta['icons'], 'fonts' => [], 'time' => time() ];
			$files = [];

			foreach ( $fonts as $ext => $bytes ) {
				$files[ 'font.' . $ext ] = $bytes;
				$set['fonts'][ $ext ] = 'font.' . $ext;
			}
		} else {
			$svgs = array_filter( $svgs, static function ( $s ) {
				return '' !== $s['svg'];
			} );

			if ( ! $svgs ) {
				return $this->fail( $meta ? 'The icon font file (woff2, woff, ttf or otf) is missing from the ZIP.' : 'No usable SVG files were found. Scripts, external references and unsafe markup are removed, and files that are not SVG are ignored.' );
			}

			$names = Pure_Icon_Set::unique_names( array_map( static function ( $s ) {
				return $s['path'];
			}, $svgs ) );
			$set = [ 'name' => $name, 'type' => 'svg', 'icons' => [], 'fonts' => [], 'time' => time() ];
			$files = [];

			foreach ( $svgs as $i => $s ) {
				$files[ $names[ $i ] . '.svg' ] = $s['svg'];
				$set['icons'][ $names[ $i ] ] = $names[ $i ] . '.svg';
			}
		}

		Sets_Repository::remove_dir( $dir );

		if ( ! wp_mkdir_p( $dir ) ) {
			return $this->fail( 'The icons folder could not be created in the uploads directory.' );
		}

		file_put_contents( $dir . '/index.php', "<?php\n// Silence is golden.\n" ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents

		foreach ( $files as $file_name => $content ) {
			file_put_contents( $dir . '/' . $file_name, $content ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
		}

		$base_url = '';
		$css = 'font' === $set['type']
			? Pure_Icon_Set::font_css( $slug, '', $set['fonts'], $set['icons'], $base_url )
			: Pure_Icon_Set::svg_css( $slug, $set['icons'], $base_url );

		file_put_contents( $dir . '/style.css', $css ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
		file_put_contents( $dir . '/icons.json', wp_json_encode( [ 'icons' => array_keys( $set['icons'] ) ] ) ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents

		return [ 'error' => '', 'set' => $set, 'slug' => $slug ];
	}

	private function fail( string $message ): array {
		return [ 'error' => $message, 'set' => [], 'slug' => '' ];
	}
}
