<?php
namespace Refraction\Modules\FormBuilder\Classes;

use Refraction\Controls_Manager;
use Refraction\Icons_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * The look of a form's own buttons (0.97.0), like the Button widget's: an icon on the left or the right, the space
 * beside the text, the icon's size and a hover animation. Used by Submit, the Repeater's Add and Remove buttons and the
 * Steps' Back and Next buttons. Setting names are the prefix + "_icon", "_icon_position", "_icon_gap", "_icon_size" and
 * "_hover_animation" (no prefix: "icon", "icon_position"...).
 */
class Form_Buttons {

	public static function name( string $prefix, string $setting ): string {
		return '' === $prefix ? $setting : $prefix . '_' . $setting;
	}

	/**
	 * Adds the controls inside the current section.
	 *
	 * @param \Refraction\Controls_Stack $el      The widget.
	 * @param string                    $prefix  Setting name prefix ('' for Submit, "add", "back"...).
	 * @param string                    $selector The button (`{{WRAPPER}} .rfb-submit`); '' when the script builds it
	 *                                            elsewhere (see style()).
	 * @param array                     $options `heading` (a panel category title, '' for none), `position` (default
	 *                                           "left" or "right"), `text` (false: an icon-only button, no position or
	 *                                           space), `condition`.
	 */
	public static function controls( $el, string $prefix, string $selector, array $options = [] ): void {
		$options += [ 'heading' => '', 'position' => 'left', 'text' => true, 'condition' => [] ];
		$has_icon = [ self::name( $prefix, 'icon' ) . '[value]!' => '' ] + $options['condition'];
		// No selector: a button the script builds outside the widget (Back, Next); style() carries the size and space.
		$method = '' !== $selector ? 'add_responsive_control' : 'add_control';

		if ( '' !== $options['heading'] ) {
			$el->add_control( self::name( $prefix, 'button_heading' ), [
				'label' => $options['heading'],
				'type' => Controls_Manager::HEADING,
				'separator' => 'before',
				'classes' => 'rf-panel-category',
				'condition' => $options['condition'],
			] );
		}

		$el->add_control( self::name( $prefix, 'icon' ), [
			'label' => esc_html__( 'Icon', 'refraction' ),
			'type' => Controls_Manager::ICONS,
			'skin' => 'inline',
			'label_block' => false,
			'exclude_inline_options' => [ 'svg' ],
			'condition' => $options['condition'],
		] );

		if ( $options['text'] ) {
			$el->add_control( self::name( $prefix, 'icon_position' ), [
				'label' => esc_html__( 'Icon position', 'refraction' ),
				'type' => Controls_Manager::CHOOSE,
				'default' => $options['position'],
				'toggle' => false,
				'options' => [
					'left' => [ 'title' => esc_html__( 'Left', 'refraction' ), 'icon' => 'rficon-h-align-left' ],
					'right' => [ 'title' => esc_html__( 'Right', 'refraction' ), 'icon' => 'rficon-h-align-right' ],
				],
				'condition' => $has_icon,
			] );
			$el->{ $method }( self::name( $prefix, 'icon_gap' ), [
				'label' => esc_html__( 'Space between icon and text', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => 0, 'max' => 40 ] ],
				'condition' => $has_icon,
			] + ( '' !== $selector ? [ 'selectors' => [ $selector => 'gap: {{SIZE}}{{UNIT}};' ] ] : [] ) );
		}

		$el->{ $method }( self::name( $prefix, 'icon_size' ), [
			'label' => esc_html__( 'Icon size', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 8, 'max' => 48 ] ],
			'condition' => $has_icon,
		] + ( '' !== $selector ? [ 'selectors' => [ $selector . ' .rfb-btn-icon' => 'font-size: {{SIZE}}{{UNIT}};' ] ] : [] ) );
		$el->add_control( self::name( $prefix, 'hover_animation' ), [
			'label' => esc_html__( 'Hover Animation', 'refraction' ),
			'type' => Controls_Manager::HOVER_ANIMATION,
			'condition' => $options['condition'],
		] );
	}

	/** The button's icon, or '' (the icon libraries' own markup, hidden from screen readers). */
	public static function icon( array $settings, string $prefix, string $class = '' ): string {
		$icon = $settings[ self::name( $prefix, 'icon' ) ] ?? null;

		if ( empty( $icon['value'] ) ) {
			return '';
		}

		$html = (string) Icons_Manager::try_get_icon_html( $icon, [ 'aria-hidden' => 'true' ] );

		return '' !== $html ? '<span class="rfb-btn-icon' . ( '' !== $class ? ' ' . esc_attr( $class ) : '' ) . '" aria-hidden="true">' . $html . '</span>' : '';
	}

	/** What goes inside the button: the text and the icon in its place. */
	public static function inner( array $settings, string $prefix, string $text, string $icon_class = '', string $text_class = '' ): string {
		$icon = self::icon( $settings, $prefix, $icon_class );
		$label = '<span class="rfb-btn-text' . ( '' !== $text_class ? ' ' . esc_attr( $text_class ) : '' ) . '">' . esc_html( $text ) . '</span>';

		return 'right' === ( $settings[ self::name( $prefix, 'icon_position' ) ] ?? 'left' ) ? $label . $icon : $icon . $label;
	}

	/** The space beside the icon and the icon's size as inline CSS, for a button the script builds (Back, Next). */
	public static function style( array $settings, string $prefix ): string {
		$css = '';

		foreach ( [ 'icon_gap' => 'gap', 'icon_size' => '--rfb-btn-icon-size' ] as $setting => $property ) {
			$value = $settings[ self::name( $prefix, $setting ) ] ?? null;

			if ( is_array( $value ) && is_numeric( $value['size'] ?? null ) && '' !== (string) $value['size'] ) {
				$css .= $property . ':' . (float) $value['size'] . 'px;';
			}
		}

		return $css;
	}

	/** Classes the button takes: has-icon, and the hover animation's. */
	public static function classes( array $settings, string $prefix ): string {
		$classes = '' !== self::icon( $settings, $prefix ) ? ' has-icon' : '';
		$animation = (string) ( $settings[ self::name( $prefix, 'hover_animation' ) ] ?? '' );

		return $classes . ( '' !== $animation && 'none' !== $animation ? ' refraction-animation-' . sanitize_html_class( $animation ) : '' );
	}
}
