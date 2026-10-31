<?php
namespace Refraction\Modules\FormBuilder\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** Prints one form control, shared by the admin record form and the public form so both look and behave the same. */
class Field_Renderer {

	/**
	 * @param array             $field Cleaned field definition.
	 * @param string|array|null $value Current value (null uses the field default).
	 * @param string            $name  Prefix of the input names, for example "values".
	 * @param string            $error Validation message for this field.
	 */
	public static function render( array $field, $value, string $name, string $error = '' ): void {
		$value = null === $value ? ( 'checkbox' === $field['type'] ? [] : $field['default'] ) : $value;
		$id = 'rfb-' . $name . '-' . $field['key'];
		$input_name = $name . '[' . $field['key'] . ']';
		$described = '';

		if ( '' !== $field['help'] ) {
			$described .= $id . '-help ';
		}

		if ( '' !== $error ) {
			$described .= $id . '-error';
		}

		$class = 'rfb-field rfb-w-' . $field['width'] . ( '' !== $error ? ' has-error' : '' );
		$described_attr = '' !== trim( $described ) ? ' aria-describedby="' . esc_attr( trim( $described ) ) . '"' : '';
		$required = $field['required'] ? ' required aria-required="true"' : '';
		$choice = in_array( $field['type'], [ 'radio', 'checkbox' ], true );

		echo '<div class="' . esc_attr( $class ) . '">';

		if ( $choice ) {
			echo '<fieldset class="rfb-choice"' . $described_attr . '><legend class="rfb-label' . ( $field['required'] ? ' is-required' : '' ) . '">' . esc_html( $field['label'] ) . '</legend>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Attribute built from escaped parts.
		} elseif ( 'toggle' !== $field['type'] ) {
			echo '<label class="rfb-label' . ( $field['required'] ? ' is-required' : '' ) . '" for="' . esc_attr( $id ) . '">' . esc_html( $field['label'] ) . '</label>';
		}

		switch ( $field['type'] ) {
			case 'textarea':
				echo '<textarea class="rfb-input" rows="4" id="' . esc_attr( $id ) . '" name="' . esc_attr( $input_name ) . '" placeholder="' . esc_attr( $field['placeholder'] ) . '"' . $required . $described_attr . '>' . esc_textarea( (string) $value ) . '</textarea>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				break;

			case 'select':
				echo '<select class="rfb-input" id="' . esc_attr( $id ) . '" name="' . esc_attr( $input_name ) . '"' . $required . $described_attr . '>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				echo '<option value="">' . esc_html( '' !== $field['placeholder'] ? $field['placeholder'] : __( 'Select...', 'refraction' ) ) . '</option>';

				foreach ( $field['options'] as $option ) {
					echo '<option value="' . esc_attr( $option['value'] ) . '"' . selected( (string) $value, $option['value'], false ) . '>' . esc_html( $option['label'] ) . '</option>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				}

				echo '</select>';
				break;

			case 'radio':
			case 'checkbox':
				$picked = array_map( 'strval', (array) $value );
				$type = 'radio' === $field['type'] ? 'radio' : 'checkbox';
				$suffix = 'radio' === $field['type'] ? '' : '[]';

				foreach ( $field['options'] as $index => $option ) {
					$option_id = $id . '-' . $index;
					echo '<label class="rfb-check" for="' . esc_attr( $option_id ) . '"><input type="' . esc_attr( $type ) . '" id="' . esc_attr( $option_id ) . '" name="' . esc_attr( $input_name . $suffix ) . '" value="' . esc_attr( $option['value'] ) . '"' . checked( in_array( $option['value'], $picked, true ), true, false ) . '><span>' . esc_html( $option['label'] ) . '</span></label>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				}

				echo '</fieldset>';
				break;

			case 'toggle':
				echo '<input type="hidden" name="' . esc_attr( $input_name ) . '" value="0">';
				echo '<label class="rfb-switch" for="' . esc_attr( $id ) . '"><input type="checkbox" id="' . esc_attr( $id ) . '" name="' . esc_attr( $input_name ) . '" value="1"' . checked( '1' === (string) $value, true, false ) . $described_attr . '><span class="rfb-switch-track" aria-hidden="true"></span><span class="rfb-switch-text">' . esc_html( $field['label'] ) . '</span></label>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				break;

			case 'rating':
				echo '<select class="rfb-input" id="' . esc_attr( $id ) . '" name="' . esc_attr( $input_name ) . '"' . $required . $described_attr . '><option value="">' . esc_html__( 'No rating', 'refraction' ) . '</option>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped

				for ( $stars = 1; $stars <= 5; $stars++ ) {
					echo '<option value="' . (int) $stars . '"' . selected( (string) $value, (string) $stars, false ) . '>' . esc_html( str_repeat( '★', $stars ) . ' (' . $stars . ')' ) . '</option>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				}

				echo '</select>';
				break;

			default:
				$html_types = [
					'text' => 'text', 'email' => 'email', 'phone' => 'tel', 'url' => 'url', 'date' => 'date', 'time' => 'time',
					'datetime' => 'datetime-local', 'number' => 'number', 'currency' => 'number',
				];
				$attributes = '';

				if ( 'number' === $field['type'] || 'currency' === $field['type'] ) {
					$attributes .= ' step="' . ( 'currency' === $field['type'] ? '0.01' : 'any' ) . '" inputmode="decimal"';
					$attributes .= null !== $field['min'] ? ' min="' . esc_attr( (string) $field['min'] ) . '"' : '';
					$attributes .= null !== $field['max'] ? ' max="' . esc_attr( (string) $field['max'] ) . '"' : '';
				}

				echo '<input class="rfb-input" type="' . esc_attr( $html_types[ $field['type'] ] ?? 'text' ) . '" id="' . esc_attr( $id ) . '" name="' . esc_attr( $input_name ) . '" value="' . esc_attr( (string) $value ) . '" placeholder="' . esc_attr( $field['placeholder'] ) . '"' . $attributes . $required . $described_attr . '>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		}

		if ( '' !== $field['help'] ) {
			echo '<p class="rfb-help" id="' . esc_attr( $id . '-help' ) . '">' . esc_html( $field['help'] ) . '</p>';
		}

		if ( '' !== $error ) {
			echo '<p class="rfb-error" id="' . esc_attr( $id . '-error' ) . '" role="alert">' . esc_html( $error ) . '</p>';
		}

		echo '</div>';
	}

	/** Table cell content for a stored value (safe HTML). */
	public static function cell( array $field, $value ): string {
		$text = Schema::display( $field, $value );

		if ( '' === $text ) {
			return '<span class="rfb-muted">&mdash;</span>';
		}

		switch ( $field['type'] ) {
			case 'email':
				return '<a href="' . esc_url( 'mailto:' . $text ) . '">' . esc_html( $text ) . '</a>';
			case 'phone':
				return '<a href="' . esc_url( 'tel:' . preg_replace( '/[^0-9+]/', '', $text ) ) . '">' . esc_html( $text ) . '</a>';
			case 'url':
				return '<a href="' . esc_url( $text ) . '" target="_blank" rel="noopener noreferrer">' . esc_html( preg_replace( '#^https?://#', '', $text ) ) . '</a>';
			case 'currency':
				return '<span class="rfb-money">' . esc_html( number_format_i18n( (float) $text, 2 ) ) . '</span>';
			case 'rating':
				return '<span class="rfb-stars" role="img" aria-label="' . esc_attr( $text ) . '">' . esc_html( str_repeat( '★', (int) $value ) . str_repeat( '☆', 5 - (int) $value ) ) . '</span>';
			case 'toggle':
				return '<span class="rfb-badge rfb-badge-' . ( '1' === (string) $value ? 'success' : 'secondary' ) . '">' . esc_html( $text ) . '</span>';
			case 'date':
				return esc_html( mysql2date( get_option( 'date_format' ), $text ) );
			case 'checkbox':
				return implode( ' ', array_map( static function ( $label ) {
					return '<span class="rfb-badge rfb-badge-light">' . esc_html( trim( $label ) ) . '</span>';
				}, explode( ', ', $text ) ) );
		}

		return esc_html( $text );
	}
}
