<?php
namespace Refraction\Modules\FormBuilder\Classes;

use Refraction\Modules\CustomCss\Classes\Css_Sanitizer;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * The look of a form, edited in the builder's Style tab. Every value is a color, a number in range or one of a few
 * words, so the output is a short list of CSS custom properties that can not carry markup. The one free text value,
 * custom CSS, goes through the same sanitiser as the Custom CSS module and is scoped to this form.
 * Pure logic, tested in scripts/test-form-builder.php.
 */
class Style {

	/** key => [ type, default, extra ]. Types: color, int (min, max), enum (values). */
	private static function spec(): array {
		return [
			'primary' => [ 'color', '#009ef7' ],
			'text' => [ 'color', '#181c32' ],
			'muted' => [ 'color', '#7e8299' ],
			'label_color' => [ 'color', '#181c32' ],
			'input_bg' => [ 'color', '#f5f8fa' ],
			'input_border' => [ 'color', '#f5f8fa' ],
			'input_text' => [ 'color', '#181c32' ],
			'focus' => [ 'color', '#009ef7' ],
			'error' => [ 'color', '#f1416c' ],
			'form_bg' => [ 'color', '#ffffff' ],
			'button_bg' => [ 'color', '#009ef7' ],
			'button_text' => [ 'color', '#ffffff' ],
			'radius' => [ 'int', 8, 0, 30 ],
			'input_height' => [ 'int', 42, 30, 70 ],
			'font_size' => [ 'int', 14, 12, 22 ],
			'label_size' => [ 'int', 13, 11, 20 ],
			'label_weight' => [ 'enum', '600', [ '400', '500', '600', '700', '800' ] ],
			'gap' => [ 'int', 20, 6, 60 ],
			'padding' => [ 'int', 24, 0, 80 ],
			'border_width' => [ 'int', 1, 0, 4 ],
			'width' => [ 'int', 0, 0, 1400 ],
			'shadow' => [ 'enum', 'soft', [ 'none', 'soft', 'strong' ] ],
			'label_position' => [ 'enum', 'top', [ 'top', 'left', 'hidden' ] ],
			'button_align' => [ 'enum', 'left', [ 'left', 'center', 'right', 'stretch' ] ],
			'button_size' => [ 'enum', 'medium', [ 'small', 'medium', 'large' ] ],
			'font_family' => [ 'enum', 'inherit', [ 'inherit', 'system', 'serif', 'mono' ] ],
		];
	}

	public static function defaults(): array {
		$defaults = [];

		foreach ( self::spec() as $key => $spec ) {
			$defaults[ $key ] = $spec[1];
		}

		$defaults['custom_css'] = '';

		return $defaults;
	}

	/** Metadata the builder UI uses to draw the right control for every property. */
	public static function controls(): array {
		$controls = [];

		foreach ( self::spec() as $key => $spec ) {
			$controls[ $key ] = [ 'type' => $spec[0], 'default' => $spec[1] ] + ( 'int' === $spec[0] ? [ 'min' => $spec[2], 'max' => $spec[3] ] : [] ) + ( 'enum' === $spec[0] ? [ 'values' => $spec[2] ] : [] );
		}

		return $controls;
	}

	public static function clean( $raw ): array {
		$raw = is_array( $raw ) ? $raw : [];
		$clean = [];

		foreach ( self::spec() as $key => $spec ) {
			$value = $raw[ $key ] ?? $spec[1];

			if ( 'color' === $spec[0] ) {
				$clean[ $key ] = self::color( $value, $spec[1] );
			} elseif ( 'int' === $spec[0] ) {
				$clean[ $key ] = is_numeric( $value ) ? max( $spec[2], min( $spec[3], (int) round( (float) $value ) ) ) : $spec[1];
			} else {
				$clean[ $key ] = in_array( (string) $value, array_map( 'strval', $spec[2] ), true ) ? (string) $value : $spec[1];
			}
		}

		$css = is_string( $raw['custom_css'] ?? null ) ? $raw['custom_css'] : '';
		$clean['custom_css'] = class_exists( Css_Sanitizer::class ) ? Css_Sanitizer::sanitize( substr( $css, 0, 10000 ) ) : '';

		return $clean;
	}

	/** #rgb or #rrggbb, lowercased and expanded; anything else gives the default. */
	public static function color( $value, string $default ): string {
		$value = strtolower( trim( (string) $value ) );

		if ( 1 === preg_match( '/^#[0-9a-f]{3}$/', $value ) ) {
			return '#' . $value[1] . $value[1] . $value[2] . $value[2] . $value[3] . $value[3];
		}

		return 1 === preg_match( '/^#[0-9a-f]{6}$/', $value ) ? $value : $default;
	}

	/** @return array<string,string> CSS custom property => value. */
	public static function variables( array $style ): array {
		$style = self::clean( $style );
		$fonts = [
			'inherit' => 'inherit',
			'system' => 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
			'serif' => 'Georgia, "Times New Roman", serif',
			'mono' => 'ui-monospace, Menlo, Consolas, monospace',
		];
		$shadows = [
			'none' => 'none',
			'soft' => '0 0 20px rgba(76, 87, 125, 0.08)',
			'strong' => '0 12px 40px rgba(76, 87, 125, 0.22)',
		];
		$button_padding = [ 'small' => '6px 14px', 'medium' => '9px 20px', 'large' => '13px 28px' ];

		return [
			'--rfb-primary' => $style['primary'],
			'--rfb-ink' => $style['text'],
			'--rfb-muted' => $style['muted'],
			'--rfb-label' => $style['label_color'],
			'--rfb-input-bg' => $style['input_bg'],
			'--rfb-input-border' => $style['input_border'],
			'--rfb-input-text' => $style['input_text'],
			'--rfb-focus' => $style['focus'],
			'--rfb-error' => $style['error'],
			'--rfb-form-bg' => $style['form_bg'],
			'--rfb-button-bg' => $style['button_bg'],
			'--rfb-button-text' => $style['button_text'],
			'--rfb-radius' => $style['radius'] . 'px',
			'--rfb-input-height' => $style['input_height'] . 'px',
			'--rfb-font-size' => $style['font_size'] . 'px',
			'--rfb-label-size' => $style['label_size'] . 'px',
			'--rfb-label-weight' => $style['label_weight'],
			'--rfb-gap' => $style['gap'] . 'px',
			'--rfb-padding' => $style['padding'] . 'px',
			'--rfb-border-width' => $style['border_width'] . 'px',
			'--rfb-max-width' => $style['width'] > 0 ? $style['width'] . 'px' : 'none',
			'--rfb-shadow' => $shadows[ $style['shadow'] ],
			'--rfb-font' => $fonts[ $style['font_family'] ],
			'--rfb-button-padding' => $button_padding[ $style['button_size'] ],
		];
	}

	/** The value of a style="" attribute (already clean; still pass it through esc_attr when printing). */
	public static function inline( array $style ): string {
		$out = '';

		foreach ( self::variables( $style ) as $name => $value ) {
			$out .= $name . ':' . $value . ';';
		}

		return $out;
	}

	/** Modifier classes that switch layout, not color. */
	public static function classes( array $style ): string {
		$style = self::clean( $style );

		return 'rfb-label-' . $style['label_position'] . ' rfb-btn-' . $style['button_align'];
	}

	/** Custom CSS scoped to one form: the word `selector` becomes the form's own selector. */
	public static function scoped_css( array $style, string $selector ): string {
		$css = self::clean( $style )['custom_css'];

		// Only the standalone word: ".my-selector" or "selectors" stay as written.
		return '' === $css ? '' : (string) preg_replace( '/(?<![\w-])selector(?![\w-])/', $selector, $css );
	}
}
