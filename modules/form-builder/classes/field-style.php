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

	/**
	 * The part of a field each group styles, as a selector inside the field (empty = the field itself). A leading ":" is a state
	 * of the field itself, a leading "&" continues the field's own selector without a space.
	 */
	const PARTS = [
		'box' => '',
		'box_hover' => ':hover',
		'box_focus' => '&:focus-within',
		'label' => '.rfb-label, .rfb-legend-text, .rfb-switch-text, .rfb-step-title, .rfb-heading, .rfb-paragraph',
		'label_hover' => '&:hover .rfb-label, &:hover .rfb-legend-text, &:hover .rfb-switch-text, &:hover .rfb-step-title, &:hover .rfb-heading, &:hover .rfb-paragraph',
		'label_focus' => '&:focus-within .rfb-label, &:focus-within .rfb-legend-text, &:focus-within .rfb-switch-text',
		'control' => '.rfb-input, .rfb-signature, .rfb-image img, .rfb-divider, .rfb-html',
		'control_hover' => '.rfb-input:hover, .rfb-signature:hover',
		'control_focus' => '.rfb-input:focus, .rfb-input:focus-visible',
		'desc' => '.rfb-description, .rfb-help',
		'choice' => '&.rfb-choice-buttons .rfb-check',
		'choice_hover' => '&.rfb-choice-buttons .rfb-check:hover',
		'choice_on' => '&.rfb-choice-buttons .rfb-check:has(input:checked)',
		'plain' => '&:not(.rfb-choice-buttons) .rfb-check',
		'plain_accent' => '&:not(.rfb-choice-buttons) .rfb-check input',
		'plain_hover' => '&:not(.rfb-choice-buttons) .rfb-check:hover',
		'plain_on' => '&:not(.rfb-choice-buttons) .rfb-check:has(input:checked)',
		'toggle' => '.rfb-switch-track',
		'toggle_hover' => '.rfb-switch:hover .rfb-switch-track',
		'toggle_on' => '.rfb-switch input:checked + .rfb-switch-track',
		'toggle_knob' => '.rfb-switch-track::after',
		'rep' => '.rfb-repeater',
		'rep_hover' => '.rfb-repeater:hover',
		'rep_focus' => '.rfb-repeater:focus-within',
		'rep_rows' => '.rfb-rows',
		'row' => '.rfb-rep-row',
		'row_hover' => '.rfb-rep-row:hover',
		'row_focus' => '.rfb-rep-row:focus-within',
		'rep_button' => '.rfb-repeater > [data-rfb-add]',
		'rep_button_hover' => '.rfb-repeater > [data-rfb-add]:hover',
		'rep_button_focus' => '.rfb-repeater > [data-rfb-add]:focus-visible, .rfb-repeater > [data-rfb-add]:active',
		'rep_remove' => '.rfb-rep-remove',
		'rep_remove_hover' => '.rfb-rep-remove:hover',
		'grp' => '.rfb-group',
		'grp_hover' => '.rfb-group:hover',
		'grp_focus' => '.rfb-group:focus-within',
	];

	/** Which look of the field each group belongs to: the style tab shows one state at a time. */
	const STATES = [
		'normal' => [ 'box', 'label', 'control', 'desc', 'choice', 'plain', 'plain_accent', 'toggle', 'toggle_knob', 'rep', 'rep_rows', 'row', 'rep_button', 'rep_remove', 'grp' ],
		'hover' => [ 'box_hover', 'label_hover', 'control_hover', 'choice_hover', 'plain_hover', 'toggle_hover', 'rep_hover', 'row_hover', 'rep_button_hover', 'rep_remove_hover', 'grp_hover' ],
		'focus' => [ 'box_focus', 'label_focus', 'control_focus', 'choice_on', 'plain_on', 'toggle_on', 'rep_focus', 'row_focus', 'rep_button_focus', 'grp_focus' ],
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
		$labelled = array_merge( $inputs, [ 'radio', 'checkbox', 'toggle', 'step', 'group', 'repeater', 'heading', 'paragraph' ] );
		$described = array_merge( $inputs, [ 'radio', 'checkbox', 'toggle', 'step', 'group', 'repeater' ] );
		$applies = [
			'box' => '*', 'box_hover' => '*', 'box_focus' => '*',
			'label' => $labelled, 'label_hover' => $labelled, 'label_focus' => array_diff( $labelled, [ 'step', 'heading', 'paragraph' ] ),
			'control' => array_merge( $inputs, [ 'divider', 'image', 'html' ] ), 'control_hover' => $inputs, 'control_focus' => array_diff( $inputs, [ 'file' ] ),
			'desc' => $described,
		];

		foreach ( [ 'choice', 'choice_hover', 'choice_on', 'plain', 'plain_accent', 'plain_hover', 'plain_on' ] as $group ) {
			$applies[ $group ] = [ 'radio', 'checkbox' ];
		}

		foreach ( [ 'toggle', 'toggle_hover', 'toggle_on', 'toggle_knob' ] as $group ) {
			$applies[ $group ] = [ 'toggle' ];
		}

		foreach ( [ 'rep', 'rep_hover', 'rep_focus', 'rep_rows', 'row', 'row_hover', 'row_focus', 'rep_button', 'rep_button_hover', 'rep_button_focus', 'rep_remove', 'rep_remove_hover' ] as $group ) {
			$applies[ $group ] = [ 'repeater' ];
		}

		foreach ( [ 'grp', 'grp_hover', 'grp_focus' ] as $group ) {
			$applies[ $group ] = [ 'group' ];
		}

		// Lists, not maps, so they reach the designer as JSON arrays.
		return array_map( static function ( $types ) {
			return is_array( $types ) ? array_values( $types ) : $types;
		}, $applies );
	}

	/** @return array<string,array> key => [ group, css property, kind, ...extra ] where kind is color | int (min, max, unit) | enum (values) | bool */
	public static function spec(): array {
		$spec = [];
		$borders = [ 'none', 'solid', 'dashed', 'dotted', 'double' ];
		$weights = [ '300', '400', '500', '600', '700', '800', '900' ];

		// The same set of box properties styles the field itself and, for repeaters and groups, the parts inside it.
		foreach ( [ '' => [ 'box', 'box_hover', 'box_focus' ], 'rep_' => [ 'rep', 'rep_hover', 'rep_focus' ], 'row_' => [ 'row', 'row_hover', 'row_focus' ], 'grp_' => [ 'grp', 'grp_hover', 'grp_focus' ] ] as $prefix => $groups ) {
			foreach ( [ 'top', 'right', 'bottom', 'left' ] as $edge ) {
				$spec[ $prefix . 'margin_' . $edge ] = [ $groups[0], 'margin-' . $edge, 'int', -100, 300, 'px' ];
			}

			foreach ( [ 'top', 'right', 'bottom', 'left' ] as $edge ) {
				$spec[ $prefix . 'padding_' . $edge ] = [ $groups[0], 'padding-' . $edge, 'int', 0, 300, 'px' ];
			}

			$spec += [
				$prefix . 'bg' => [ $groups[0], 'background-color', 'color' ],
				$prefix . 'border_style' => [ $groups[0], 'border-style', 'enum', $borders ],
				$prefix . 'border_width' => [ $groups[0], 'border-width', 'int', 0, 20, 'px' ],
				$prefix . 'border_color' => [ $groups[0], 'border-color', 'color' ],
				$prefix . 'radius' => [ $groups[0], 'border-radius', 'int', 0, 200, 'px' ],
				$prefix . 'shadow' => [ $groups[0], 'box-shadow', 'enum', array_keys( self::SHADOWS ) ],
				$prefix . 'h_bg' => [ $groups[1], 'background-color', 'color' ],
				$prefix . 'h_border_color' => [ $groups[1], 'border-color', 'color' ],
				$prefix . 'h_shadow' => [ $groups[1], 'box-shadow', 'enum', array_keys( self::SHADOWS ) ],
				$prefix . 'f_bg' => [ $groups[2], 'background-color', 'color' ],
				$prefix . 'f_border_color' => [ $groups[2], 'border-color', 'color' ],
				$prefix . 'f_shadow' => [ $groups[2], 'box-shadow', 'enum', array_keys( self::SHADOWS ) ],
			];
		}

		$spec += [
			'align' => [ 'box', 'text-align', 'enum', [ 'left', 'center', 'right', 'justify' ] ],

			'l_color' => [ 'label', 'color', 'color' ],
			'l_family' => [ 'label', 'font-family', 'enum', [ 'inherit', 'system', 'serif', 'mono' ] ],
			'l_size' => [ 'label', 'font-size', 'int', 8, 80, 'px' ],
			'l_weight' => [ 'label', 'font-weight', 'enum', $weights ],
			'l_transform' => [ 'label', 'text-transform', 'enum', [ 'none', 'uppercase', 'lowercase', 'capitalize' ] ],
			'l_spacing' => [ 'label', 'letter-spacing', 'int', -5, 20, 'px' ],
			'l_height' => [ 'label', 'line-height', 'int', 80, 300, 'pct' ],
			'l_italic' => [ 'label', 'font-style', 'bool' ],
			'lh_color' => [ 'label_hover', 'color', 'color' ],
			'lh_bg' => [ 'label_hover', 'background-color', 'color' ],
			'lf_color' => [ 'label_focus', 'color', 'color' ],
			'lf_bg' => [ 'label_focus', 'background-color', 'color' ],

			'c_color' => [ 'control', 'color', 'color' ],
			'c_bg' => [ 'control', 'background-color', 'color' ],
			'c_border_style' => [ 'control', 'border-style', 'enum', $borders ],
			'c_border_width' => [ 'control', 'border-width', 'int', 0, 20, 'px' ],
			'c_border_color' => [ 'control', 'border-color', 'color' ],
			'c_radius' => [ 'control', 'border-radius', 'int', 0, 200, 'px' ],
			'c_shadow' => [ 'control', 'box-shadow', 'enum', array_keys( self::SHADOWS ) ],
			'c_family' => [ 'control', 'font-family', 'enum', [ 'inherit', 'system', 'serif', 'mono' ] ],
			'c_size' => [ 'control', 'font-size', 'int', 8, 80, 'px' ],
			'c_weight' => [ 'control', 'font-weight', 'enum', $weights ],
			'c_pad_y' => [ 'control', 'padding-block', 'int', 0, 80, 'px' ],
			'c_pad_x' => [ 'control', 'padding-inline', 'int', 0, 80, 'px' ],

			'ch_color' => [ 'control_hover', 'color', 'color' ],
			'ch_bg' => [ 'control_hover', 'background-color', 'color' ],
			'ch_border_color' => [ 'control_hover', 'border-color', 'color' ],
			'ch_shadow' => [ 'control_hover', 'box-shadow', 'enum', array_keys( self::SHADOWS ) ],

			'cf_color' => [ 'control_focus', 'color', 'color' ],
			'cf_bg' => [ 'control_focus', 'background-color', 'color' ],
			'cf_border_color' => [ 'control_focus', 'border-color', 'color' ],
			'cf_shadow' => [ 'control_focus', 'box-shadow', 'enum', array_keys( self::SHADOWS ) ],

			'd_color' => [ 'desc', 'color', 'color' ],
			'd_size' => [ 'desc', 'font-size', 'int', 8, 60, 'px' ],
			'd_italic' => [ 'desc', 'font-style', 'bool' ],

			'b_bg' => [ 'choice', 'background-color', 'color' ],
			'b_color' => [ 'choice', 'color', 'color' ],
			'b_border_color' => [ 'choice', 'border-color', 'color' ],
			'b_radius' => [ 'choice', 'border-radius', 'int', 0, 200, 'px' ],
			'bh_bg' => [ 'choice_hover', 'background-color', 'color' ],
			'bh_color' => [ 'choice_hover', 'color', 'color' ],
			'bh_border_color' => [ 'choice_hover', 'border-color', 'color' ],
			'b_on_bg' => [ 'choice_on', 'background-color', 'color' ],
			'b_on_color' => [ 'choice_on', 'color', 'color' ],
			'b_on_border_color' => [ 'choice_on', 'border-color', 'color' ],

			'pc_color' => [ 'plain', 'color', 'color' ],
			'pc_size' => [ 'plain', 'font-size', 'int', 8, 60, 'px' ],
			'pc_weight' => [ 'plain', 'font-weight', 'enum', $weights ],
			'pa_accent' => [ 'plain_accent', 'accent-color', 'color' ],
			'ph_color' => [ 'plain_hover', 'color', 'color' ],
			'po_color' => [ 'plain_on', 'color', 'color' ],
			'po_weight' => [ 'plain_on', 'font-weight', 'enum', $weights ],

			'tg_off' => [ 'toggle', 'background-color', 'color' ],
			'tg_radius' => [ 'toggle', 'border-radius', 'int', 0, 40, 'px' ],
			'tgh_off' => [ 'toggle_hover', 'background-color', 'color' ],
			'tg_on' => [ 'toggle_on', 'background-color', 'color' ],
			'tg_knob' => [ 'toggle_knob', 'background-color', 'color' ],

			'rows_gap' => [ 'rep_rows', 'gap', 'int', 0, 80, 'px' ],

			'rb_bg' => [ 'rep_button', 'background-color', 'color' ],
			'rb_color' => [ 'rep_button', 'color', 'color' ],
			'rb_border_color' => [ 'rep_button', 'border-color', 'color' ],
			'rb_radius' => [ 'rep_button', 'border-radius', 'int', 0, 200, 'px' ],
			'rb_size' => [ 'rep_button', 'font-size', 'int', 8, 40, 'px' ],
			'rb_weight' => [ 'rep_button', 'font-weight', 'enum', $weights ],
			'rbh_bg' => [ 'rep_button_hover', 'background-color', 'color' ],
			'rbh_color' => [ 'rep_button_hover', 'color', 'color' ],
			'rbh_border_color' => [ 'rep_button_hover', 'border-color', 'color' ],
			'rbf_bg' => [ 'rep_button_focus', 'background-color', 'color' ],
			'rbf_color' => [ 'rep_button_focus', 'color', 'color' ],
			'rbf_border_color' => [ 'rep_button_focus', 'border-color', 'color' ],

			'rr_color' => [ 'rep_remove', 'color', 'color' ],
			'rr_bg' => [ 'rep_remove', 'background-color', 'color' ],
			'rrh_color' => [ 'rep_remove_hover', 'color', 'color' ],
			'rrh_bg' => [ 'rep_remove_hover', 'background-color', 'color' ],
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

		// "default" is kept on purpose: a field can say "plain list" even when its type says "buttons".
		if ( in_array( $raw['choice_look'] ?? '', self::CHOICE_LOOKS, true ) ) {
			$clean['choice_look'] = $raw['choice_look'];
		}

		return $clean;
	}

	/**
	 * Class added to a choice field when it is shown as buttons: the field's own look, else the one its type has.
	 *
	 * @param array $type_styles The definition's styles shared by field type.
	 */
	public static function choice_class( array $field, array $type_styles = [] ): string {
		$look = $field['style']['choice_look'] ?? ( $type_styles[ $field['type'] ]['choice_look'] ?? '' );

		return 'buttons' === $look ? 'rfb-choice-buttons' : '';
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
		foreach ( [ 'box' => '', 'rep' => 'rep_', 'row' => 'row_', 'grp' => 'grp_', 'control' => 'c_' ] as $group => $prefix ) {
			$has_style = isset( $style[ $prefix . 'border_style' ] );
			$has_width = isset( $style[ $prefix . 'border_width' ] );

			if ( isset( $groups[ $group ] ) && $has_width && ! $has_style ) {
				$groups[ $group ] .= 'border-style:solid;';
			} elseif ( isset( $groups[ $group ] ) && $has_style && ! $has_width && 'none' !== $style[ $prefix . 'border_style' ] ) {
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

		// Styles shared by every field of a type come first, so a field's own style (same specificity, later) wins.
		foreach ( (array) ( $definition['type_styles'] ?? [] ) as $type => $style ) {
			$out .= self::rules( (array) $style, $scope . ' .rfb-t-' . self::attr( (string) $type ), $parts );
		}

		foreach ( Schema::walk( $definition['fields'] ) as $field ) {
			if ( ! empty( $field['style'] ) ) {
				$out .= self::rules( $field['style'], $scope . ' [data-rfb-key="' . self::attr( $field['key'] ) . '"]', $parts );
			}
		}

		return $out;
	}

	/** The rules of one style under one base selector. */
	private static function rules( array $style, string $base, array $parts ): string {
		$out = '';

		foreach ( self::declarations( $style ) as $group => $declarations ) {
			$selectors = [];

			foreach ( array_map( 'trim', explode( ',', $parts[ $group ] ) ) as $part ) {
				$selectors[] = $base . ( '' === $part ? '' : ( 0 === strpos( $part, ':' ) ? $part : ( 0 === strpos( $part, '&' ) ? substr( $part, 1 ) : ' ' . $part ) ) );
			}

			$out .= implode( ', ', $selectors ) . '{' . $declarations . '}';
		}

		return $out;
	}

	/** Cleans the styles shared by field type: type => style, known types only, empty ones dropped. */
	public static function clean_types( $raw ): array {
		$clean = [];

		foreach ( (array) $raw as $type => $style ) {
			if ( isset( Schema::types()[ $type ] ) && is_array( $style ) ) {
				$cleaned = self::clean( $style );

				if ( $cleaned ) {
					$clean[ (string) $type ] = $cleaned;
				}
			}
		}

		return $clean;
	}

	/** Field keys are already limited to [a-z0-9_]; this keeps the attribute selector safe even if that ever changes. */
	private static function attr( string $key ): string {
		return (string) preg_replace( '/[^a-z0-9_-]/', '', $key );
	}

	/** What the designer needs: the property table (without PHP-only detail), the groups per type and their states. */
	public static function config(): array {
		$properties = [];

		foreach ( self::spec() as $key => $spec ) {
			$properties[ $key ] = [ 'group' => $spec[0], 'css' => $spec[1], 'kind' => $spec[2] ]
				+ ( 'int' === $spec[2] ? [ 'min' => $spec[3], 'max' => $spec[4], 'unit' => $spec[5] ] : [] )
				+ ( 'enum' === $spec[2] ? [ 'values' => $spec[3] ] : [] );
		}

		$state_of = [];

		foreach ( self::STATES as $state => $groups ) {
			foreach ( $groups as $group ) {
				$state_of[ $group ] = $state;
			}
		}

		return [ 'properties' => $properties, 'parts' => self::PARTS, 'applies' => self::applies(), 'states' => $state_of, 'order' => array_keys( self::PARTS ), 'shadows' => self::SHADOWS, 'fonts' => self::fonts() ];
	}
}
