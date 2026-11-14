<?php
namespace Refraction\Modules\FormBuilder\Classes;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Background;
use Refraction\Group_Control_Border;
use Refraction\Group_Control_Box_Shadow;
use Refraction\Group_Control_Text_Shadow;
use Refraction\Group_Control_Typography;
use Refraction\Icons_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * The look of a form's own buttons (0.97.0), like the Button widget's: an icon on the left or the right, the space
 * beside the text, the icon's size and a hover animation. Used by Submit, the Repeater's Add and Remove buttons and the
 * Steps' Back and Next buttons. Setting names are the prefix + "_icon", "_icon_position", "_icon_gap", "_icon_size" and
 * "_hover_animation" (no prefix: "icon", "icon_position"...).
 *
 * 0.99.0: the rest of the Button widget's settings. Content: the type (Info, Success...), the size, the button's ID;
 * Style (style_controls()): typography, text shadow, Normal / Hover text color, background (color or gradient), shadow,
 * hover border color, transition and hover animation, then border, radius and padding.
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
		$options += [ 'heading' => '', 'position' => 'left', 'text' => true, 'condition' => [], 'look' => true, 'css_id' => true ];
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

		if ( $options['look'] ) {
			$el->add_control( self::name( $prefix, 'button_type' ), [
				'label' => esc_html__( 'Type', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => '',
				'options' => self::types(),
				'condition' => $options['condition'],
			] );
			$el->add_control( self::name( $prefix, 'size' ), [
				'label' => esc_html__( 'Size', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => '',
				'options' => [ '' => esc_html__( 'As the form', 'refraction' ) ] + self::sizes(),
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

		if ( $options['css_id'] ) {
			$el->add_control( self::name( $prefix, 'css_id' ), [
				'label' => esc_html__( 'Button ID', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'ai' => [ 'active' => false ],
				'title' => esc_html__( 'Add your custom id WITHOUT the Pound key. e.g: my-id', 'refraction' ),
				'description' => esc_html__( 'Unique on the page: letters, digits, dashes and underscores.', 'refraction' ),
				'separator' => 'before',
				'condition' => $options['condition'],
			] );
		}
	}

	/** The Button widget's types, as colors of the form's buttons. */
	public static function types(): array {
		return [
			'' => esc_html__( 'Default', 'refraction' ),
			'info' => esc_html__( 'Info', 'refraction' ),
			'success' => esc_html__( 'Success', 'refraction' ),
			'warning' => esc_html__( 'Warning', 'refraction' ),
			'danger' => esc_html__( 'Danger', 'refraction' ),
		];
	}

	/** The Button widget's sizes. */
	public static function sizes(): array {
		return [
			'xs' => esc_html__( 'Extra Small', 'refraction' ),
			'sm' => esc_html__( 'Small', 'refraction' ),
			'md' => esc_html__( 'Medium', 'refraction' ),
			'lg' => esc_html__( 'Large', 'refraction' ),
			'xl' => esc_html__( 'Extra Large', 'refraction' ),
		];
	}

	/** `$selector` with a state on it, for each part of a selector list. */
	private static function on( string $selector, string $states ): string {
		$out = [];

		foreach ( array_map( 'trim', explode( ',', $selector ) ) as $part ) {
			foreach ( explode( ',', $states ) as $state ) {
				$out[] = $part . $state;
			}
		}

		return implode( ', ', $out );
	}

	/**
	 * The Button widget's Style tab for one button, inside the current section.
	 *
	 * @param \Refraction\Controls_Stack $el       The widget.
	 * @param string                    $prefix   Setting name prefix.
	 * @param string                    $selector The button, with its class repeated so the Style tab wins over the form's
	 *                                            own button styles and the theme's.
	 * @param array                     $options  `heading` (a title above, '' for none), `text` (false: an icon-only button,
	 *                                            no typography), `condition`, `legacy` (Submit's older color, background
	 *                                            and hover border settings: shown only while they hold a value).
	 */
	public static function style_controls( $el, string $prefix, string $selector, array $options = [] ): void {
		$options += [ 'heading' => '', 'text' => true, 'condition' => [], 'legacy' => false ];
		$condition = $options['condition'];
		$hover = self::on( $selector, ':hover,:focus' );
		$box = static fn( string $css ): array => [ $selector => $css ];
		$sides = '{{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}}';

		if ( '' !== $options['heading'] ) {
			$el->add_control( self::name( $prefix, 'style_heading' ), [
				'label' => $options['heading'],
				'type' => Controls_Manager::HEADING,
				'separator' => 'before',
				'classes' => 'rf-panel-category',
				'condition' => $condition,
			] );
		}

		if ( $options['text'] ) {
			$el->add_group_control( Group_Control_Typography::get_type(), [ 'name' => self::name( $prefix, 'typography' ), 'selector' => $selector, 'condition' => $condition ] );
			$el->add_group_control( Group_Control_Text_Shadow::get_type(), [ 'name' => self::name( $prefix, 'text_shadow' ), 'selector' => $selector, 'condition' => $condition ] );
		}

		$el->start_controls_tabs( self::name( $prefix, 'button_states' ), [ 'condition' => $condition ] );
		$el->start_controls_tab( self::name( $prefix, 'button_normal' ), [ 'label' => esc_html__( 'Normal', 'refraction' ), 'condition' => $condition ] );
		$el->add_control( self::name( $prefix, 'color_normal' ), [ 'label' => esc_html__( 'Text Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => $box( 'fill: {{VALUE}}; color: {{VALUE}};' ), 'condition' => $condition ] );

		if ( $options['legacy'] ) {
			// Before 0.99.0: a plain background color. It still applies, and shows only while it holds a value.
			$el->add_control( self::name( $prefix, 'bg_normal' ), [ 'label' => esc_html__( 'Background color (earlier setting)', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => $box( 'background-color: {{VALUE}};' ), 'condition' => [ self::name( $prefix, 'bg_normal' ) . '!' => '' ] + $condition ] );
		}

		$el->add_group_control( Group_Control_Background::get_type(), [
			'name' => self::name( $prefix, 'background' ),
			'types' => [ 'classic', 'gradient' ],
			'exclude' => [ 'image' ],
			'selector' => $selector,
			'condition' => $condition,
		] );
		$el->add_group_control( Group_Control_Box_Shadow::get_type(), [ 'name' => self::name( $prefix, 'shadow_normal' ), 'selector' => $selector, 'condition' => $condition ] );
		$el->end_controls_tab();

		$el->start_controls_tab( self::name( $prefix, 'button_hover' ), [ 'label' => esc_html__( 'Hover', 'refraction' ), 'condition' => $condition ] );
		$el->add_control( self::name( $prefix, 'color_hover' ), [ 'label' => esc_html__( 'Text Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $hover => 'fill: {{VALUE}}; color: {{VALUE}};' ], 'condition' => $condition ] );

		if ( $options['legacy'] ) {
			$el->add_control( self::name( $prefix, 'bg_hover' ), [ 'label' => esc_html__( 'Background color (earlier setting)', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $hover => 'background-color: {{VALUE}};' ], 'condition' => [ self::name( $prefix, 'bg_hover' ) . '!' => '' ] + $condition ] );
		}

		$el->add_group_control( Group_Control_Background::get_type(), [
			'name' => self::name( $prefix, 'background_hover' ),
			'types' => [ 'classic', 'gradient' ],
			'exclude' => [ 'image' ],
			'selector' => $hover,
			'condition' => $condition,
		] );
		$el->add_control( self::name( $prefix, 'hover_border_color' ), [ 'label' => esc_html__( 'Border Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $hover => 'border-color: {{VALUE}};' ], 'condition' => $condition ] );

		if ( $options['legacy'] ) {
			$el->add_group_control( Group_Control_Border::get_type(), [ 'name' => self::name( $prefix, 'border_hover' ), 'selector' => $hover, 'condition' => [ self::name( $prefix, 'border_hover_border' ) . '!' => '' ] + $condition ] );
		}

		$el->add_group_control( Group_Control_Box_Shadow::get_type(), [ 'name' => self::name( $prefix, 'shadow_hover' ), 'selector' => $hover, 'condition' => $condition ] );
		$el->add_control( self::name( $prefix, 'transition' ), [
			'label' => esc_html__( 'Transition Duration', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 's', 'ms' ],
			'default' => [ 'unit' => 's' ],
			'range' => [ 's' => [ 'min' => 0, 'max' => 3, 'step' => 0.1 ], 'ms' => [ 'min' => 0, 'max' => 3000, 'step' => 50 ] ],
			'selectors' => $box( 'transition-duration: {{SIZE}}{{UNIT}};' ),
			'condition' => $condition,
		] );
		$el->add_control( self::name( $prefix, 'hover_animation' ), [ 'label' => esc_html__( 'Hover Animation', 'refraction' ), 'type' => Controls_Manager::HOVER_ANIMATION, 'condition' => $condition ] );
		$el->end_controls_tab();
		$el->end_controls_tabs();

		// The name stays "border_normal" (Submit's earlier normal-state border).
		$el->add_group_control( Group_Control_Border::get_type(), [ 'name' => self::name( $prefix, 'border_normal' ), 'selector' => $selector, 'separator' => 'before', 'condition' => $condition ] );
		$el->add_responsive_control( self::name( $prefix, 'radius' ), [ 'label' => esc_html__( 'Border Radius', 'refraction' ), 'type' => Controls_Manager::DIMENSIONS, 'size_units' => [ 'px', '%', 'em', 'rem', 'custom' ], 'selectors' => $box( 'border-radius: ' . $sides . ';' ), 'condition' => $condition ] );
		$el->add_responsive_control( self::name( $prefix, 'padding' ), [ 'label' => esc_html__( 'Padding', 'refraction' ), 'type' => Controls_Manager::DIMENSIONS, 'size_units' => [ 'px', '%', 'em', 'rem', 'vw', 'custom' ], 'separator' => 'before', 'selectors' => $box( 'padding: ' . $sides . ';' ), 'condition' => $condition ] );
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

	/** The button's ID attribute (` id="..."`), or ''. */
	public static function id_attribute( array $settings, string $prefix ): string {
		$id = sanitize_html_class( (string) ( $settings[ self::name( $prefix, 'css_id' ) ] ?? '' ) );

		return '' !== $id ? ' id="' . esc_attr( $id ) . '"' : '';
	}

	/** Classes the button takes: has-icon, the type's and the size's (0.99.0), and the hover animation's. */
	public static function classes( array $settings, string $prefix ): string {
		$classes = '' !== self::icon( $settings, $prefix ) ? ' has-icon' : '';
		$type = (string) ( $settings[ self::name( $prefix, 'button_type' ) ] ?? '' );
		$size = (string) ( $settings[ self::name( $prefix, 'size' ) ] ?? '' );
		$classes .= isset( self::types()[ $type ] ) && '' !== $type ? ' rfb-type-' . $type : '';
		$classes .= isset( self::sizes()[ $size ] ) ? ' rfb-size-' . $size : '';
		$animation = (string) ( $settings[ self::name( $prefix, 'hover_animation' ) ] ?? '' );

		return $classes . ( '' !== $animation && 'none' !== $animation ? ' refraction-animation-' . sanitize_html_class( $animation ) : '' );
	}
}
