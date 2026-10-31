<?php
namespace Refraction\Modules\FormBuilder\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Per-field styling (the Style tab of a field): spacing, background, border, shadow, alignment, label / input / description
 * typography, hover and focus looks, and button-style choices.
 *
 * Data-driven: SPEC lists every property once (which part of the field it styles, which CSS property it writes, what kind of
 * value it takes). The same table drives the cleaning here, the CSS written for the public form, the controls of the designer
 * and the live preview on its canvas (assets/js/builder.js reads it through the page config), so they can not drift apart.
 * Every value is a color, a number in a range or one of a few words, never free text, so the CSS can not carry markup.
 * Pure logic, tested in scripts/test-form-builder.php.
 */
class Field_Style {

	/** The part of a field each group styles, as a selector inside the field (empty = the field itself). */
	const PARTS = [
		'box' => '',
		'box_hover' => ':hover',
		'label' => '.rfb-label, .rfb-legend-text, .rfb-switch-text, .rfb-step-title, .rfb-heading, .rfb-paragraph',
		'control' => '.rfb-input, .rfb-signature, .rfb-image img, .rfb-divider, .rfb-html',
		'control_hover' => '.rfb-input:hover, .rfb-signature:hover',
		'control_focus' => '.rfb-input:focus, .rfb-input:focus-visible',
		'desc' => '.rfb-description, .rfb-help',
		// A leading "&" means "on the field itself": the button look is a class of the field, not of something inside it.
		'choice' => '&.rfb-choice-buttons .rfb-check',
		'choice_on' => '&.rfb-choice-buttons .rfb-check:has(input:checked)',
	];

	const SHADOWS = [
		'none' => 'none',
		'soft' => '0 2px 8px rgba(0, 0, 0, 0.08)',
		'medium' => '0 6px 18px rgba(0, 0, 0, 0.15)',
		'strong' => '0 12px 32px rgba(0, 0, 0, 0.25)',
	];

	/** Types a group applies to: '*' = every type. */
	private static function applies(): array {
		$inputs = [ 'text', 'textarea', 'name', 'number', 'currency', 'email', 'phone', 'url', 'country', 'date', 'time', 'datetime', 'select', 'rating', 'file', 'signature' ];

		return [
			'box' => '*',
			'box_hover' => '*',
			'label' => [ 'text', 'textarea', 'name', 'number', 'currency', 'email', 'phone', 'url', 'country', 'date', 'time', 'datetime', 'select', 'rating', 'file', 'signature', 'radio', 'checkbox', 'toggle', 'step', 'group', 'repeater', 'heading', 'paragraph' ],
			'control' => array_merge( $inputs, [ 'divider', 'image', 'html' ] ),
			'control_hover' => $inputs,
			'control_focus' => array_values( array_diff( $inputs, [ 'file' ] ) ),
			'desc' => [ 'text', 'textarea', 'name', 'number', 'currency', 'email', 'phone', 'url', 'country', 'date', 'time', 'datetime', 'select', 'rating', 'file', 'signature', 'radio', 'checkbox', 'toggle', 'step', 'group', 'repeater' ],
			'choice' => [ 'radio', 'checkbox' ],
			'choice_on' => [ 'radio', 'checkbox' ],
		];
	}

	/** @return array<string,array> key => [ group, css property, kind, ...extra ] where kind is color | int (min, max, unit) | enum (values) | bool */
	public static function spec(): array {
		$spec = [];
		$side = static function ( string $group, string $prefix, string $css, int $min, int $max ) use ( &$spec ): void {
			foreach ( [ 'top', 'right', 'bottom', 'left' ] as $edge ) {
				$spec[ $prefix . '_' . $edge ] = [ $group, $css . '-' . $edge, 'int', $min, $max, 'px' ];
			}
		};

		$side( 'box', 'margin', 'margin', -100, 300 );
		$side( 'box', 'padding', 'padding', 0, 300 );
		$spec += [
			'bg' => [ 'box', 'background-color', 'color' ],
			'border_style' => [ 'box', 'border-style', 'enum', [ 'none', 'solid', 'dashed', 'dotted', 'double' ] ],
			'border_width' => [ 'box', 'border-width', 'int', 0, 20, 'px' ],
			'border_color' => [ 'box', 'border-color', 'color' ],
			'radius' => [ 'box', 'border-radius', 'int', 0, 200, 'px' ],
			'shadow' => [ 'box', 'box-shadow', 'enum', array_keys( self::SHADOWS ) ],
			'align' => [ 'box', 'text-align', 'enum', [ 'left', 'center', 'right', 'justify' ] ],

			'h_bg' => [ 'box_hover', 'background-color', 'color' ],
			'h_border_color' => [ 'box_hover', 'border-color', 'color' ],
			'h_shadow' => [ 'box_hover', 'box-shadow', 'enum', array_keys( self::SHADOWS ) ],

			'l_color' => [ 'label', 'color', 'color' ],
			'l_family' => [ 'label', 'font-family', 'enum', [ 'inherit', 'system', 'serif', 'mono' ] ],
			'l_size' => [ 'label', 'font-size', 'int', 8, 80, 'px' ],
			'l_weight' => [ 'label', 'font-weight', 'enum', [ '300', '400', '500', '600', '700', '800', '900' ] ],
			'l_transform' => [ 'label', 'text-transform', 'enum', [ 'none', 'uppercase', 'lowercase', 'capitalize' ] ],
			'l_spacing' => [ 'label', 'letter-spacing', 'int', -5, 20, 'px' ],
			'l_height' => [ 'label', 'line-height', 'int', 80, 300, 'pct' ],
			'l_italic' => [ 'label', 'font-style', 'bool' ],

			'c_color' => [ 'control', 'color', 'color' ],
			'c_bg' => [ 'control', 'background-color', 'color' ],
			'c_border_style' => [ 'control', 'border-style', 'enum', [ 'none', 'solid', 'dashed', 'dotted', 'double' ] ],
			'c_border_width' => [ 'control', 'border-width', 'int', 0, 20, 'px' ],
			'c_border_color' => [ 'control', 'border-color', 'color' ],
			'c_radius' => [ 'control', 'border-radius', 'int', 0, 200, 'px' ],
			'c_shadow' => [ 'control', 'box-shadow', 'enum', array_keys( self::SHADOWS ) ],
			'c_family' => [ 'control', 'font-family', 'enum', [ 'inherit', 'system', 'serif', 'mono' ] ],
			'c_size' => [ 'control', 'font-size', 'int', 8, 80, 'px' ],
			'c_weight' => [ 'control', 'font-weight', 'enum', [ '300', '400', '500', '600', '700', '800', '900' ] ],
			'c_pad_y' => [ 'control', 'padding-block', 'int', 0, 80, 'px' ],
			'c_pad_x' => [ 'control', 'padding-inline', 'int', 0, 80, 'px' ],

			'ch_color' => [ 'control_hover', 'color', 'color' ],
			'ch_bg' => [ 'control_hover', 'background-color', 'color' ],
			'ch_border_color' => [ 'control_hover', 'border-color', 'color' ],
			'ch_shadow' => [ 'control_hover', 'box-shadow', 'enum', array_keys( self::SHADOWS ) ],

			'cf_border_color' => [ 'control_focus', 'border-color', 'color' ],
			'cf_shadow' => [ 'control_focus', 'box-shadow', 'enum', array_keys( self::SHADOWS ) ],

			'd_color' => [ 'desc', 'color', 'color' ],
			'd_size' => [ 'desc', 'font-size', 'int', 8, 60, 'px' ],
			'd_italic' => [ 'desc', 'font-style', 'bool' ],

			'b_bg' => [ 'choice', 'background-color', 'color' ],
			'b_color' => [ 'choice', 'color', 'color' ],
			'b_border_color' => [ 'choice', 'border-color', 'color' ],
			'b_radius' => [ 'choice', 'border-radius', 'int', 0, 200, 'px' ],
			'b_on_bg' => [ 'choice_on', 'background-color', 'color' ],
			'b_on_color' => [ 'choice_on', 'color', 'color' ],
			'b_on_border_color' => [ 'choice_on', 'border-color', 'color' ],
		];

		return $spec;
	}

	/** The look of a radio or checkbox list: plain, or a row of buttons (Yes / No style). */
	const CHOICE_LOOKS = [ 'default', 'buttons' ];

	/** @return string[] Group ids that apply to a field type. */
	public static function groups_for( string $type ): array {
		$groups = [];

		foreach ( self::applies() as $group => $types ) {
			if ( '*' === $types || in_array( $type, $types, true ) ) {
				$groups[] = $group;
			}
		}

		return $groups;
	}

	/**
	 * Keeps only known properties with valid values; an unset property is simply absent (so a field with no styling stores
	 * an empty list and the page prints no CSS for it).
	 */
	public static function clean( $raw ): array {
		$raw = is_array( $raw ) ? $raw : [];
		$clean = [];

		foreach ( self::spec() as $key => $spec ) {
			if ( ! isset( $raw[ $key ] ) || '' === $raw[ $key ] || null === $raw[ $key ] ) {
				continue;
			}

			$value = $raw[ $key ];

			switch ( $spec[2] ) {
				case 'color':
					$color = 'transparent' === $value ? 'transparent' : Style::color( $value, '' );

					if ( '' !== $color ) {
						$clean[ $key ] = $color;
					}
					break;
				case 'int':
					if ( is_numeric( $value ) ) {
						$clean[ $key ] = max( $spec[3], min( $spec[4], (int) round( (float) $value ) ) );
					}
					break;
				case 'enum':
					if ( in_array( (string) $value, array_map( 'strval', $spec[3] ), true ) ) {
						$clean[ $key ] = (string) $value;
					}
					break;
				case 'bool':
					if ( true === $value || 1 === $value || '1' === $value || 'true' === $value ) {
						$clean[ $key ] = true;
					}
					break;
			}
		}

		if ( in_array( $raw['choice_look'] ?? '', self::CHOICE_LOOKS, true ) && 'default' !== $raw['choice_look'] ) {
			$clean['choice_look'] = $raw['choice_look'];
		}

		return $clean;
	}

	/** Class added to a choice field when it is shown as buttons. */
	public static function choice_class( array $field ): string {
		return 'buttons' === ( $field['style']['choice_look'] ?? '' ) ? 'rfb-choice-buttons' : '';
	}

	private static function fonts(): array {
		return [
			'inherit' => 'inherit',
			'system' => 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
			'serif' => 'Georgia, "Times New Roman", serif',
			'mono' => 'ui-monospace, Menlo, Consolas, monospace',
		];
	}

	/** @return array<string,string> group => "prop:value;..." for one field's cleaned style. */
	public static function declarations( array $style ): array {
		$spec = self::spec();
		$groups = [];

		foreach ( $style as $key => $value ) {
			if ( ! isset( $spec[ $key ] ) ) {
				continue;
			}

			list( $group, $css, $kind ) = $spec[ $key ];

			if ( 'color' === $kind ) {
				$text = (string) $value;
			} elseif ( 'int' === $kind ) {
				$unit = $spec[ $key ][5];
				$text = 'pct' === $unit ? (string) round( $value / 100, 2 ) : $value . 'px';
			} elseif ( 'bool' === $kind ) {
				$text = 'italic';
			} elseif ( 'box-shadow' === $css ) {
				$text = self::SHADOWS[ $value ];
			} elseif ( 'font-family' === $css ) {
				$text = self::fonts()[ $value ];
			} else {
				$text = (string) $value;
			}

			$groups[ $group ] = ( $groups[ $group ] ?? '' ) . $css . ':' . $text . ';';
		}

		// A width alone or a style alone would draw nothing; give the other half a sensible value.
		foreach ( [ 'box' => [ 'border_style', 'border_width' ], 'control' => [ 'c_border_style', 'c_border_width' ] ] as $group => $keys ) {
			$has_style = isset( $style[ $keys[0] ] );
			$has_width = isset( $style[ $keys[1] ] );

			if ( isset( $groups[ $group ] ) && $has_width && ! $has_style ) {
				$groups[ $group ] .= 'border-style:solid;';
			} elseif ( isset( $groups[ $group ] ) && $has_style && ! $has_width && 'none' !== $style[ $keys[0] ] ) {
				$groups[ $group ] .= 'border-width:1px;';
			}
		}

		return $groups;
	}

	/**
	 * CSS for every styled field of a form.
	 *
	 * @param string $scope A selector that makes the rules specific, for example "#rfb-form-bookings".
	 * @param array  $parts Optional replacement selectors per group (the designer canvas wraps fields differently).
	 */
	public static function css( array $definition, string $scope, array $parts = [] ): string {
		$out = '';
		$parts = $parts + self::PARTS;

		foreach ( Schema::walk( $definition['fields'] ) as $field ) {
			if ( empty( $field['style'] ) ) {
				continue;
			}

			$base = $scope . ' [data-rfb-key="' . self::attr( $field['key'] ) . '"]';

			foreach ( self::declarations( $field['style'] ) as $group => $declarations ) {
				$selectors = [];

				foreach ( array_map( 'trim', explode( ',', $parts[ $group ] ) ) as $part ) {
					$selectors[] = $base . ( '' === $part ? '' : ( 0 === strpos( $part, ':' ) ? $part : ( 0 === strpos( $part, '&' ) ? substr( $part, 1 ) : ' ' . $part ) ) );
				}

				$out .= implode( ', ', $selectors ) . '{' . $declarations . '}';
			}
		}

		return $out;
	}

	/** Field keys are already limited to [a-z0-9_]; this keeps the attribute selector safe even if that ever changes. */
	private static function attr( string $key ): string {
		return (string) preg_replace( '/[^a-z0-9_-]/', '', $key );
	}

	/** What the designer needs: the property table (without PHP-only detail), the groups per type. */
	public static function config(): array {
		$properties = [];

		foreach ( self::spec() as $key => $spec ) {
			$properties[ $key ] = [ 'group' => $spec[0], 'css' => $spec[1], 'kind' => $spec[2] ]
				+ ( 'int' === $spec[2] ? [ 'min' => $spec[3], 'max' => $spec[4], 'unit' => $spec[5] ] : [] )
				+ ( 'enum' === $spec[2] ? [ 'values' => $spec[3] ] : [] );
		}

		return [ 'properties' => $properties, 'parts' => self::PARTS, 'applies' => self::applies(), 'shadows' => self::SHADOWS, 'fonts' => self::fonts() ];
	}
}
