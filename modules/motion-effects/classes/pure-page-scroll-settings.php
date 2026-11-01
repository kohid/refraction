<?php
namespace Refraction\Modules\MotionEffects\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Page Settings > Scrolling: the page's scroll behaviour, clamped into the config `page-scroll.js` reads.
 * No WordPress calls: tested standalone by scripts/test-motion.php.
 */
class Pure_Page_Scroll_Settings {

	/** sections: one section per scroll; smooth: eased wheel scrolling; snap: the browser's own scroll snapping. */
	const MODES = [ 'sections', 'smooth', 'snap' ];

	/** @return array Empty when the page scrolls normally. */
	public static function normalize( array $settings ): array {
		$mode = $settings['rf_page_scroll'] ?? '';

		if ( ! is_string( $mode ) || ! in_array( $mode, self::MODES, true ) ) {
			return [];
		}

		return [
			'mode' => $mode,
			'speed' => (int) Pure_Motion_Settings::number( $settings, 'rf_page_scroll_speed', 900, 300, 2500 ),
			'easing' => Pure_Motion_Settings::pick( $settings, 'rf_page_scroll_easing', [ 'inout', 'out', 'linear' ] ),
			'smoothness' => (int) Pure_Motion_Settings::number( $settings, 'rf_page_scroll_smoothness', 5, 1, 10 ),
			'snap' => Pure_Motion_Settings::pick( $settings, 'rf_page_scroll_snap', [ 'proximity', 'mandatory' ] ),
			'dots' => 'sections' === $mode && Pure_Motion_Settings::on( $settings, 'rf_page_scroll_dots' ),
			'offset' => (int) Pure_Motion_Settings::number( $settings, 'rf_page_scroll_offset', 0, 0, 400 ),
			'touch' => Pure_Motion_Settings::on( $settings, 'rf_page_scroll_touch' ),
		];
	}
}
