<?php
namespace Refraction\Modules\Migration\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * The names the page builder Refraction comes from stores its data under (post meta, options, the template library,
 * shortcodes). They are put together from parts so that scripts/rename-to-refraction.mjs, which renames that word
 * everywhere in the source, leaves them alone: the converter has to read the other plugin's data as it is.
 */
final class Upstream {

	/** The other builder's lower-case name (as in its meta keys). */
	public static function name(): string {
		return 'element' . 'or';
	}

	/** Its product name, for messages. */
	public static function label(): string {
		return ucfirst( self::name() );
	}

	/** One of its post meta keys: meta( 'data' ) is `_<name>_data`. */
	public static function meta( string $key ): string {
		return '_' . self::name() . '_' . $key;
	}

	/** One of its options: option( 'active_kit' ) is `<name>_active_kit`. */
	public static function option( string $key ): string {
		return self::name() . '_' . $key;
	}

	public static function library_cpt(): string {
		return self::name() . '_library';
	}

	public static function library_taxonomy(): string {
		return self::name() . '_library_type';
	}

	/** The prefix of its own icon font. */
	public static function icon_prefix(): string {
		return 'e' . 'icon';
	}

	/** Whether the other builder is running on this request (needed to keep a picture of widgets Refraction lacks). */
	public static function is_active(): bool {
		return class_exists( '\\' . self::label() . '\\Plugin' );
	}

	/** Its plugin instance, or null. */
	public static function plugin() {
		$class = '\\' . self::label() . '\\Plugin';

		return class_exists( $class ) && isset( $class::$instance ) ? $class::$instance : null;
	}
}
