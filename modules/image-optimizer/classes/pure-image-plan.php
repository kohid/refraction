<?php
namespace Refraction\Modules\ImageOptimizer\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Pure logic of the upload optimizer (no WordPress calls, so scripts/test-image-optimizer.php runs it on its own):
 * the size an uploaded image is brought down to, the settings, and the alt text made from a file name.
 */
class Pure_Image_Plan {

	const DEFAULT_MAX = 1600;
	const DEFAULT_QUALITY = 80;

	/** The types that are resized and converted. GIFs only when not animated (the module checks). */
	const TYPES = [ 'image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/x-ms-bmp', 'image/webp' ];

	/**
	 * The new size, or null to keep it. Landscape (and square) images are fitted by width, portrait ones by height;
	 * images within the limit stay as they are. A limit of 0 never resizes.
	 *
	 * @return array{0: int, 1: int}|null
	 */
	public static function target_size( int $width, int $height, int $max ): ?array {
		if ( $max <= 0 || $width <= 0 || $height <= 0 ) {
			return null;
		}

		if ( $width >= $height ) {
			return $width > $max ? [ $max, max( 1, (int) round( $height * $max / $width ) ) ] : null;
		}

		return $height > $max ? [ max( 1, (int) round( $width * $max / $height ) ), $max ] : null;
	}

	/** The longest side allowed (0 = do not resize), from the setting. */
	public static function max_size( $value ): int {
		if ( '' === $value || null === $value || ! is_numeric( $value ) ) {
			return self::DEFAULT_MAX;
		}

		return max( 0, min( 10000, (int) $value ) );
	}

	/** The WebP quality (1-100), from the setting. */
	public static function quality( $value ): int {
		if ( '' === $value || null === $value || ! is_numeric( $value ) ) {
			return self::DEFAULT_QUALITY;
		}

		return max( 1, min( 100, (int) $value ) );
	}

	/**
	 * Alt text from a file name: no extension, no "-scaled" or size suffix WordPress adds, dashes and underscores as
	 * spaces, the first letter capital. "inverness-airport_van.JPG" -> "Inverness airport van".
	 */
	public static function alt_from_filename( string $name ): string {
		$name = trim( $name );
		$name = (string) preg_replace( '/\.(jpe?g|png|gif|bmp|webp|avif|tiff?|heic)$/i', '', $name );
		$name = (string) preg_replace( '/-(scaled|rotated|e\d{10,})$/i', '', $name );
		$name = (string) preg_replace( '/-\d+x\d+$/', '', $name );
		$name = (string) preg_replace( '/[-_.+]+/', ' ', $name );
		$name = trim( (string) preg_replace( '/\s+/u', ' ', $name ) );

		if ( '' === $name ) {
			return '';
		}

		$first = function_exists( 'mb_substr' ) ? mb_substr( $name, 0, 1 ) : substr( $name, 0, 1 );
		$rest = function_exists( 'mb_substr' ) ? mb_substr( $name, 1 ) : substr( $name, 1 );

		return ( function_exists( 'mb_strtoupper' ) ? mb_strtoupper( $first ) : strtoupper( $first ) ) . $rest;
	}

	/** Whether an image is drawn from a palette (a GIF, or an 8-bit PNG): GD cannot write those as WebP directly. */
	public static function is_palette( string $mime, string $head ): bool {
		if ( 'image/gif' === $mime ) {
			return true;
		}

		// PNG: the IHDR colour type is byte 25 of the file; 3 is indexed colour.
		return 'image/png' === $mime && strlen( $head ) > 25 && 3 === ord( $head[25] );
	}

	/** Whether GIF bytes hold more than one frame (an animation, which a conversion would flatten). */
	public static function is_animated_gif( string $bytes ): bool {
		// Marked to loop (the NETSCAPE2.0 or ANIMEXTS1.0 block), or more than one frame: a Graphic Control Extension
		// (21 F9 04, four bytes, 00) followed by an image (2C).
		if ( false !== strpos( $bytes, "\x21\xFF\x0BNETSCAPE2.0" ) || false !== strpos( $bytes, "\x21\xFF\x0BANIMEXTS1.0" ) ) {
			return true;
		}

		return preg_match_all( '/\x21\xF9\x04.{4}\x00\x2C/s', $bytes ) > 1;
	}
}
