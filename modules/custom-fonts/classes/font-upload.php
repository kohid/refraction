<?php
namespace Refraction\Modules\CustomFonts\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Reads the Add Font form: validates every uploaded file (nothing is stored unless all pass) and moves them to
 * uploads/refraction-fonts/<family>/<random>.<detected extension>.
 */
class Font_Upload {

	const MAX_ROWS = 12;

	/** @return array{error:string,variations:array} */
	public function process( string $family, array $post, array $files ): array {
		$slug = Fonts_Repository::slug_for( $family );
		$rows = min( self::MAX_ROWS, max( 0, (int) ( $post['rows'] ?? 0 ) ) );
		$staged = [];

		for ( $i = 0; $i < $rows; $i++ ) {
			$entry = [
				'weight' => Pure_Font_Face_Css::clean_weight( (string) ( $post[ "weight_$i" ] ?? '' ) ),
				'style' => Pure_Font_Face_Css::clean_style( (string) ( $post[ "style_$i" ] ?? '' ) ),
				'files' => [],
			];

			foreach ( array_keys( Pure_Font_Face_Css::FORMATS ) as $ext ) {
				$key = "font_{$i}_{$ext}";
				$f = $files[ $key ] ?? null;

				if ( ! is_array( $f ) || UPLOAD_ERR_NO_FILE === ( $f['error'] ?? UPLOAD_ERR_NO_FILE ) ) {
					continue;
				}

				if ( UPLOAD_ERR_OK !== $f['error'] || ! is_uploaded_file( $f['tmp_name'] ) ) {
					return $this->fail( sprintf( 'The %s file could not be uploaded.', $ext ) );
				}

				if ( (int) $f['size'] > Pure_Font_Validator::MAX_BYTES ) {
					return $this->fail( sprintf( '%s is larger than 5 MB.', $f['name'] ) );
				}

				$bytes = (string) file_get_contents( $f['tmp_name'] ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
				$check = Pure_Font_Validator::validate( (string) $f['name'], $bytes, (string) ( $f['type'] ?? '' ) );

				if ( ! $check['ok'] ) {
					return $this->fail( $f['name'] . ': ' . $check['error'] );
				}

				if ( $check['ext'] !== $ext ) {
					return $this->fail( sprintf( '%1$s was added to the %2$s field but is a %3$s font.', $f['name'], $ext, $check['ext'] ) );
				}

				$entry['files'][ $ext ] = $f['tmp_name'];
			}

			if ( $entry['files'] ) {
				$staged[] = $entry;
			}
		}

		if ( ! $staged ) {
			return $this->fail( 'Choose at least one font file.' );
		}

		$dir = Fonts_Repository::base_dir() . '/' . $slug;

		if ( ! wp_mkdir_p( $dir ) ) {
			return $this->fail( 'The fonts folder could not be created in the uploads directory.' );
		}

		if ( ! file_exists( $dir . '/index.php' ) ) {
			file_put_contents( $dir . '/index.php', "<?php\n// Silence is golden.\n" ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
		}

		$variations = [];

		foreach ( $staged as $entry ) {
			foreach ( $entry['files'] as $ext => $tmp ) {
				$name = bin2hex( random_bytes( 8 ) ) . '.' . $ext;

				if ( ! move_uploaded_file( $tmp, $dir . '/' . $name ) ) {
					return $this->fail( 'A font file could not be saved.' );
				}

				$entry['files'][ $ext ] = $slug . '/' . $name;
			}

			$variations[] = $entry;
		}

		return [ 'error' => '', 'variations' => $variations ];
	}

	private function fail( string $message ): array {
		return [ 'error' => $message, 'variations' => [] ];
	}
}
