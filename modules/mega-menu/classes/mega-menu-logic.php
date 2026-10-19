<?php
namespace Refraction\Modules\MegaMenu\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Pure option logic of the Mega Menu widget (no WordPress needed).
 */
class Mega_Menu_Logic {

	const BREAKPOINTS = [ 'mobile', 'mobile_extra', 'tablet', 'tablet_extra', 'laptop', 'none' ];

	public static function sanitize( array $settings ): array {
		return [
			'layout' => self::pick( $settings, 'layout', [ 'horizontal', 'vertical' ], 'horizontal' ),
			'trigger' => self::pick( $settings, 'trigger', [ 'hover', 'click' ], 'hover' ),
			'hover_delay' => self::clamp( $settings, 'hover_delay', 150 ),
			'close_delay' => self::clamp( $settings, 'close_delay', 250 ),
			'dropdown_width' => self::pick( $settings, 'dropdown_width', [ 'container', 'full', 'custom' ], 'container' ),
			'dropdown_position' => self::pick( $settings, 'dropdown_position', [ 'start', 'center', 'end' ], 'start' ),
			'breakpoint' => self::pick( $settings, 'breakpoint', self::BREAKPOINTS, 'tablet' ),
			'mobile_layout' => self::pick( $settings, 'mobile_layout', [ 'accordion', 'offcanvas' ], 'accordion' ),
		];
	}

	/**
	 * Ids (1-based) of an item's trigger and of its dropdown panel.
	 */
	public static function item_ids( string $widget_id, int $index ): array {
		$n = $index + 1;

		return [
			'trigger' => "refraction-mm-{$widget_id}-t{$n}",
			'panel' => "refraction-mm-{$widget_id}-p{$n}",
		];
	}

	public static function has_dropdown( array $item ): bool {
		return 'dropdown' === ( $item['item_type'] ?? 'link' );
	}

	private static function pick( array $settings, string $key, array $allowed, string $default ): string {
		return isset( $settings[ $key ] ) && in_array( $settings[ $key ], $allowed, true ) ? $settings[ $key ] : $default;
	}

	private static function clamp( array $settings, string $key, int $default ): int {
		return max( 0, min( 2000, (int) ( $settings[ $key ] ?? $default ) ) );
	}
}
