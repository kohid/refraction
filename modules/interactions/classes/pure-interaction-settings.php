<?php
namespace Refraction\Modules\Interactions\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * The interaction settings, clamped (no WordPress calls, so scripts/test-interactions.php can run it on its own):
 * the site cursor and the page transition (Site Settings > Motion & Cursor) and an element's magnetic pull and cursor
 * label (Advanced > Interactions).
 */
class Pure_Interaction_Settings {

	const CURSORS = [ 'dot-ring', 'ring', 'dot', 'blend' ];
	const TRANSITIONS = [ 'fade', 'slide', 'wipe', 'zoom' ];

	private static function number( $value, float $min, float $max, float $default ): float {
		$value = is_array( $value ) ? ( $value['size'] ?? '' ) : $value;

		if ( ! is_numeric( $value ) ) {
			return $default;
		}

		return max( $min, min( $max, (float) $value ) );
	}

	private static function color( $value, string $default ): string {
		$value = is_string( $value ) ? trim( $value ) : '';

		return preg_match( '/^#[0-9a-fA-F]{3,8}$|^rgba?\([\d\s.,%]+\)$/', $value ) ? $value : $default;
	}

	/** The site cursor for interactions.js, or [] when off. */
	public static function cursor( array $kit ): array {
		$style = $kit['rf_cursor'] ?? '';

		if ( ! in_array( $style, self::CURSORS, true ) ) {
			return [];
		}

		return [
			'style' => $style,
			'color' => self::color( $kit['rf_cursor_color'] ?? '', 'blend' === $style ? '#ffffff' : '#111111' ),
			'size' => (int) self::number( $kit['rf_cursor_size'] ?? '', 16, 80, 36 ),
			'hide' => 'yes' === ( $kit['rf_cursor_hide_system'] ?? '' ),
			'links' => 'no' !== ( $kit['rf_cursor_links'] ?? 'yes' ),
			'ease' => round( self::number( $kit['rf_cursor_ease'] ?? '', 0.05, 1, 0.2 ), 2 ),
		];
	}

	/** The page transition, or [] when off. */
	public static function transition( array $kit ): array {
		$type = $kit['rf_transition'] ?? '';

		if ( ! in_array( $type, self::TRANSITIONS, true ) ) {
			return [];
		}

		return [
			'type' => $type,
			'duration' => (int) self::number( $kit['rf_transition_duration'] ?? '', 150, 1500, 450 ),
		];
	}

	/** The CSS of a page transition (cross-document View Transitions; browsers without them just change page). */
	public static function transition_css( array $t ): string {
		if ( ! $t ) {
			return '';
		}

		$ms = (int) $t['duration'] . 'ms';
		$ease = 'cubic-bezier(0.22,1,0.36,1)';
		$css = '@view-transition{navigation:auto}'
			. '::view-transition-group(root){animation-duration:' . $ms . '}'
			. '::view-transition-old(root),::view-transition-new(root){animation-duration:' . $ms . ';animation-timing-function:' . $ease . '}';

		switch ( $t['type'] ) {
			case 'slide':
				$css .= '@keyframes rf-vt-out{to{opacity:0;transform:translateY(-4vh)}}@keyframes rf-vt-in{from{opacity:0;transform:translateY(6vh)}}'
					. '::view-transition-old(root){animation-name:rf-vt-out}::view-transition-new(root){animation-name:rf-vt-in}';
				break;
			case 'wipe':
				$css .= '@keyframes rf-vt-wipe{from{clip-path:inset(100% 0 0 0)}to{clip-path:inset(0)}}'
					. '::view-transition-old(root){animation:none}::view-transition-new(root){animation-name:rf-vt-wipe}';
				break;
			case 'zoom':
				$css .= '@keyframes rf-vt-zout{to{opacity:0;transform:scale(.96)}}@keyframes rf-vt-zin{from{opacity:0;transform:scale(1.04)}}'
					. '::view-transition-old(root){animation-name:rf-vt-zout}::view-transition-new(root){animation-name:rf-vt-zin}';
				break;
		}

		return $css . '@media (prefers-reduced-motion:reduce){@view-transition{navigation:none}}';
	}

	/** An element's magnetic pull for interactions.js, or [] when off. */
	public static function magnetic( array $settings ): array {
		if ( 'yes' !== ( $settings['rf_magnetic'] ?? '' ) ) {
			return [];
		}

		return [
			's' => round( self::number( $settings['rf_magnetic_strength'] ?? '', 0.05, 1, 0.35 ), 2 ),
			'r' => (int) self::number( $settings['rf_magnetic_area'] ?? '', 0, 200, 40 ),
		];
	}

	/** An element's cursor label (a word or two), or ''. */
	public static function label( array $settings ): string {
		$label = is_string( $settings['rf_cursor_label'] ?? null ) ? trim( $settings['rf_cursor_label'] ) : '';

		return function_exists( 'mb_substr' ) ? mb_substr( $label, 0, 24 ) : substr( $label, 0, 24 );
	}
}
