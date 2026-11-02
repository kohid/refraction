<?php
namespace Refraction\Modules\CardMotion\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Card stack of the Image and Image Box widgets: the widget's own image plus up to four more, shown as a fan, a
 * deck, a carousel or a shuffling stack. Clamps the settings into the config card-stack.js reads (the same rules
 * are applied in the editor from the live settings). No WordPress calls: tested by scripts/test-card-motion.php.
 */
class Pure_Stack_Settings {

	const STYLES = [ 'fan', 'deck', 'carousel', 'shuffle' ];
	const RATIOS = [ '3/4', '4/5', '1/1', '2/3', '4/3', '16/9' ];
	const HOVERS = [ 'front', 'lift', 'none' ];
	const MAX_EXTRA = 4;

	private static function size( array $s, string $key, float $default, float $min, float $max ): float {
		$value = $s[ $key ]['size'] ?? ( $s[ $key ] ?? '' );

		return is_numeric( $value ) ? max( $min, min( $max, (float) $value ) ) : $default;
	}

	/**
	 * @param array $s      Widget settings.
	 * @param array $extra  The extra images: [ [ 'url' => ..., 'alt' => ... ] ] (already resolved).
	 * @return array Empty when the widget shows one image.
	 */
	public static function normalize( array $s, array $extra ): array {
		$style = $s['rf_stack'] ?? '';

		if ( ! is_string( $style ) || ! in_array( $style, self::STYLES, true ) ) {
			return [];
		}

		$images = [];

		foreach ( $extra as $image ) {
			$url = is_array( $image ) ? (string) ( $image['url'] ?? '' ) : '';

			if ( '' !== $url && count( $images ) < self::MAX_EXTRA ) {
				$images[] = [ 'url' => $url, 'alt' => (string) ( $image['alt'] ?? '' ) ];
			}
		}

		$ratio = $s['rf_stack_ratio'] ?? '3/4';
		$hover = $s['rf_stack_hover'] ?? 'front';
		$moving = 'fan' !== $style;

		return [
			'style' => $style,
			'images' => $images,
			'ratio' => in_array( $ratio, self::RATIOS, true ) ? $ratio : '3/4',
			'spread' => self::size( $s, 'rf_stack_spread', 8, 0, 30 ),
			'offset' => self::size( $s, 'rf_stack_offset', 30, 0, 80 ),
			'autoplay' => $moving && 'yes' === ( $s['rf_stack_autoplay'] ?? 'yes' ),
			'interval' => (int) self::size( $s, 'rf_stack_interval', 2800, 1200, 10000 ),
			'hover' => in_array( $hover, self::HOVERS, true ) ? $hover : 'front',
			'click' => 'yes' === ( $s['rf_stack_click'] ?? 'yes' ),
			'dots' => 'carousel' === $style && 'yes' === ( $s['rf_stack_dots'] ?? 'yes' ),
			'glow' => 'yes' === ( $s['rf_stack_glow'] ?? '' ),
			'reflection' => 'yes' === ( $s['rf_stack_reflection'] ?? '' ),
		];
	}
}
