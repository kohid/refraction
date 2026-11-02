<?php
namespace Refraction\Modules\PageLoader\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Page Settings > Loading screen, clamped into the config the inline loader script reads. No WordPress calls:
 * tested standalone by scripts/test-page-loader.php.
 */
class Pure_Loader_Settings {

	const STYLES = [ 'bar', 'spinner', 'counter' ];
	const EXITS = [ 'fade', 'slide', 'split' ];
	const LOGOS = [ 'site', 'text', 'image' ];

	const DEFAULTS = [ 'bg' => '#0A0E2B', 'color' => '#FFFFFF', 'accent' => '#3DD9E8', 'accent_2' => '#F25C54' ];

	private static function pick( array $s, string $key, array $allowed ): string {
		$value = $s[ $key ] ?? '';

		return is_string( $value ) && in_array( $value, $allowed, true ) ? $value : $allowed[0];
	}

	private static function number( array $s, string $key, int $default, int $min, int $max ): int {
		$value = $s[ $key ] ?? '';

		return is_numeric( $value ) ? (int) max( $min, min( $max, (float) $value ) ) : $default;
	}

	/** #rgb, #rrggbb, #rrggbbaa or rgb()/rgba() with numbers only; anything else falls back. */
	public static function color( $value, string $fallback ): string {
		$value = is_string( $value ) ? trim( $value ) : '';

		if ( preg_match( '/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i', $value ) || preg_match( '/^rgba?\(\s*[\d.\s,%]+\)$/i', $value ) ) {
			return $value;
		}

		return $fallback;
	}

	/** @return array Empty when the page has no loading screen. */
	public static function normalize( array $s ): array {
		if ( 'yes' !== ( $s['rf_loader'] ?? '' ) ) {
			return [];
		}

		$caption = is_string( $s['rf_loader_caption'] ?? null ) ? trim( $s['rf_loader_caption'] ) : '';

		return [
			'style' => self::pick( $s, 'rf_loader_style', self::STYLES ),
			'exit' => self::pick( $s, 'rf_loader_exit', self::EXITS ),
			'logo' => self::pick( $s, 'rf_loader_logo', self::LOGOS ),
			'text' => is_string( $s['rf_loader_text'] ?? null ) ? trim( $s['rf_loader_text'] ) : '',
			'image' => (int) ( $s['rf_loader_image']['id'] ?? 0 ),
			'caption' => mb_substr( $caption, 0, 80 ),
			'percent' => 'yes' === ( $s['rf_loader_percent'] ?? 'yes' ),
			'bg' => self::color( $s['rf_loader_bg'] ?? '', self::DEFAULTS['bg'] ),
			'color' => self::color( $s['rf_loader_color'] ?? '', self::DEFAULTS['color'] ),
			'accent' => self::color( $s['rf_loader_accent'] ?? '', self::DEFAULTS['accent'] ),
			'accent_2' => self::color( $s['rf_loader_accent_2'] ?? '', self::DEFAULTS['accent_2'] ),
			'min' => self::number( $s, 'rf_loader_min', 600, 0, 5000 ),
			'max' => self::number( $s, 'rf_loader_max', 8000, 1500, 20000 ),
			'once' => 'yes' === ( $s['rf_loader_once'] ?? '' ),
		];
	}
}
