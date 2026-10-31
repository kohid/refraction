<?php
namespace Refraction\Modules\FormBuilder\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Prints a form: every field kind, groups, repeaters and the layout blocks. Shared by the admin record form and the
 * public form so both look and behave the same.
 *
 * Context (all optional):
 *   admin   bool                 admin screen (hidden fields are shown as text, uploads list existing files)
 *   files   array<path,list>     stored file descriptors by field path (admin edit)
 *   file_url callable            descriptor => download URL (admin edit)
 *   hidden  array<key,string>    resolved value of hidden fields (public form)
 */
class Field_Renderer {

	/**
	 * @param array[] $fields Fields to print.
	 * @param array   $values Current values keyed by field key (null/absent uses the default).
	 * @param string  $prefix Input name prefix, for example "values" or "values[address]".
	 * @param array   $errors Messages keyed by field path.
	 * @param string  $path   Path of the container these fields sit in ("" at the top).
	 */
	public static function render_fields( array $fields, array $values, string $prefix, array $errors = [], array $ctx = [], string $path = '' ): void {
		foreach ( $fields as $field ) {
			$key = $field['key'];
			$here = '' === $path ? $key : $path . '.' . $key;
			$value = array_key_exists( $key, $values ) ? $values[ $key ] : null;
			self::render( $field, $value, $prefix . '[' . $key . ']', $errors, $ctx, $here );
		}
	}

	/**
	 * @param array             $field Cleaned field.
	 * @param string|array|null $value Current value (null: the default).
	 * @param string            $name  Full input name of this field.
	 * @param array             $errors Messages keyed by field path.
	 * @param string            $path  Dotted path of this field ("address.street", "rows.0.name").
	 */
	public static function render( array $field, $value, string $name, array $errors = [], array $ctx = [], string $path = '' ): void {
		$type = $field['type'];
		$error = (string) ( $errors[ $path ] ?? '' );
		$id = 'rfb-' . trim( (string) preg_replace( '/[^a-z0-9_]+/i', '-', $name ), '-' );
		$classes = [ 'rfb-field', 'rfb-w-' . $field['width'], 'rfb-t-' . $type ];

		if ( '' !== $field['css_class'] ) {
			$classes[] = $field['css_class'];
		}

		if ( '' !== $error ) {
			$classes[] = 'has-error';
		}

		$attrs = ' class="' . esc_attr( implode( ' ', $classes ) ) . '" data-rfb-key="' . esc_attr( $field['key'] ) . '" data-rfb-type="' . esc_attr( $type ) . '"';

		if ( ! empty( $field['conditions']['enabled'] ) ) {
			$attrs .= ' data-rfb-cond="' . esc_attr( (string) wp_json_encode( $field['conditions'] ) ) . '"';
		}

		if ( Schema::is_step( $type ) ) {
			echo '<h3 class="rfb-step-title rfb-w-full">' . esc_html( $field['label'] ) . '</h3>';
			return;
		}

		// Layout blocks.
		if ( Schema::is_layout( $type ) ) {
			echo '<div' . $attrs . '>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts.

			if ( 'heading' === $type ) {
				echo '<h' . (int) $field['level'] . ' class="rfb-heading">' . esc_html( '' !== $field['content'] ? $field['content'] : $field['label'] ) . '</h' . (int) $field['level'] . '>';
			} elseif ( 'paragraph' === $type ) {
				echo '<p class="rfb-paragraph">' . nl2br( esc_html( $field['content'] ) ) . '</p>';
			} elseif ( 'html' === $type ) {
				echo '<div class="rfb-html">' . wp_kses_post( $field['content'] ) . '</div>';
			} else {
				echo '<hr class="rfb-divider">';
			}

			echo '</div>';
			return;
		}

		$described = '';
		$described .= '' !== $field['help'] ? $id . '-help ' : '';
		$described .= '' !== $error ? $id . '-error' : '';
		$described_attr = '' !== trim( $described ) ? ' aria-describedby="' . esc_attr( trim( $described ) ) . '"' : '';
		$required = $field['required'] ? ' required aria-required="true"' : '';
		$label_class = 'rfb-label' . ( $field['required'] ? ' is-required' : '' ) . ( $field['hide_label'] ? ' screen-reader-text' : '' );

		// Hidden fields.
		if ( 'hidden' === $type ) {
			$shown = $value ?? ( $ctx['hidden'][ $field['key'] ] ?? $field['default'] );

			if ( ! empty( $ctx['admin'] ) ) {
				echo '<div' . $attrs . '><label class="' . esc_attr( $label_class ) . '" for="' . esc_attr( $id ) . '">' . esc_html( $field['label'] ) . ' <span class="rfb-muted">(' . esc_html__( 'hidden field', 'refraction' ) . ')</span></label><input class="rfb-input" type="text" id="' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '" value="' . esc_attr( (string) $shown ) . '"></div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			} else {
				echo '<input type="hidden" name="' . esc_attr( $name ) . '" value="' . esc_attr( (string) $shown ) . '" data-rfb-key="' . esc_attr( $field['key'] ) . '">';
			}

			return;
		}

		echo '<div' . $attrs . '>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped

		if ( 'group' === $type ) {
			echo '<fieldset class="rfb-group"><legend class="rfb-label">' . esc_html( $field['label'] ) . '</legend><div class="rfb-form-grid" data-rfb-scope>';
			self::render_fields( $field['children'], is_array( $value ) ? $value : [], $name, $errors, $ctx, $path );
			echo '</div></fieldset>';
		} elseif ( 'repeater' === $type ) {
			self::repeater( $field, is_array( $value ) ? $value : [], $name, $errors, $ctx, $path, $id );
		} elseif ( 'file' === $type ) {
			self::file( $field, $id, $required, $described_attr, $label_class, $path, $ctx );
		} elseif ( in_array( $type, [ 'radio', 'checkbox' ], true ) ) {
			echo '<fieldset class="rfb-choice"' . $described_attr . '><legend class="' . esc_attr( $label_class ) . '">' . esc_html( $field['label'] ) . '</legend>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			$value = null === $value ? ( 'checkbox' === $type ? [] : $field['default'] ) : $value;
			$picked = array_map( 'strval', (array) $value );
			$suffix = 'radio' === $type ? '' : '[]';

			foreach ( $field['options'] as $index => $option ) {
				$option_id = $id . '-' . $index;
				echo '<label class="rfb-check" for="' . esc_attr( $option_id ) . '"><input type="' . esc_attr( $type ) . '" id="' . esc_attr( $option_id ) . '" name="' . esc_attr( $name . $suffix ) . '" value="' . esc_attr( $option['value'] ) . '"' . checked( in_array( $option['value'], $picked, true ), true, false ) . '><span>' . esc_html( $option['label'] ) . '</span></label>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			}

			echo '</fieldset>';
		} elseif ( 'toggle' === $type ) {
			$value = null === $value ? $field['default'] : $value;
			echo '<input type="hidden" name="' . esc_attr( $name ) . '" value="0">';
			echo '<label class="rfb-switch" for="' . esc_attr( $id ) . '"><input type="checkbox" id="' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '" value="1"' . checked( '1' === (string) $value, true, false ) . $described_attr . '><span class="rfb-switch-track" aria-hidden="true"></span><span class="rfb-switch-text">' . esc_html( $field['label'] ) . '</span></label>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		} else {
			$value = null === $value ? $field['default'] : $value;
			echo '<label class="' . esc_attr( $label_class ) . '" for="' . esc_attr( $id ) . '">' . esc_html( $field['label'] ) . '</label>';
			self::control( $field, $value, $name, $id, $required, $described_attr );
		}

		if ( '' !== $field['help'] ) {
			echo '<p class="rfb-help" id="' . esc_attr( $id . '-help' ) . '">' . esc_html( $field['help'] ) . '</p>';
		}

		if ( '' !== $error ) {
			echo '<p class="rfb-error" id="' . esc_attr( $id . '-error' ) . '" role="alert">' . esc_html( $error ) . '</p>';
		}

		echo '</div>';
	}

	/** The single input of a plain field. */
	private static function control( array $field, $value, string $name, string $id, string $required, string $described_attr ): void {
		$type = $field['type'];

		if ( 'textarea' === $type ) {
			echo '<textarea class="rfb-input" rows="4" id="' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '" placeholder="' . esc_attr( $field['placeholder'] ) . '"' . $required . $described_attr . '>' . esc_textarea( (string) $value ) . '</textarea>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			return;
		}

		if ( 'select' === $type ) {
			echo '<select class="rfb-input" id="' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '"' . $required . $described_attr . '>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			echo '<option value="">' . esc_html( '' !== $field['placeholder'] ? $field['placeholder'] : __( 'Select...', 'refraction' ) ) . '</option>';

			foreach ( $field['options'] as $option ) {
				echo '<option value="' . esc_attr( $option['value'] ) . '"' . selected( (string) $value, $option['value'], false ) . '>' . esc_html( $option['label'] ) . '</option>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			}

			echo '</select>';
			return;
		}

		if ( 'rating' === $type ) {
			echo '<select class="rfb-input" id="' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '"' . $required . $described_attr . '><option value="">' . esc_html__( 'No rating', 'refraction' ) . '</option>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped

			for ( $stars = 1; $stars <= 5; $stars++ ) {
				echo '<option value="' . (int) $stars . '"' . selected( (string) $value, (string) $stars, false ) . '>' . esc_html( str_repeat( '★', $stars ) . ' (' . $stars . ')' ) . '</option>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			}

			echo '</select>';
			return;
		}

		$html_types = [
			'text' => 'text', 'email' => 'email', 'phone' => 'tel', 'url' => 'url', 'date' => 'date', 'time' => 'time',
			'datetime' => 'datetime-local', 'number' => 'number', 'currency' => 'number',
		];
		$attributes = '';

		if ( 'number' === $type || 'currency' === $type ) {
			$attributes .= ' step="' . ( 'currency' === $type ? '0.01' : 'any' ) . '" inputmode="decimal"';
			$attributes .= null !== $field['min'] ? ' min="' . esc_attr( (string) $field['min'] ) . '"' : '';
			$attributes .= null !== $field['max'] ? ' max="' . esc_attr( (string) $field['max'] ) . '"' : '';
		}

		echo '<input class="rfb-input" type="' . esc_attr( $html_types[ $type ] ?? 'text' ) . '" id="' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '" value="' . esc_attr( (string) $value ) . '" placeholder="' . esc_attr( $field['placeholder'] ) . '"' . $attributes . $required . $described_attr . '>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	}

	private static function file( array $field, string $id, string $required, string $described_attr, string $label_class, string $path, array $ctx ): void {
		$existing = (array) ( $ctx['files'][ $path ] ?? [] );
		$accept = '.' . implode( ',.', $field['accept'] );
		$multiple = $field['max_files'] > 1 ? ' multiple' : '';
		$hint = sprintf( /* translators: 1: extensions, 2: size in MB, 3: file count. */ __( '%1$s, up to %2$s MB each, %3$d at most.', 'refraction' ), strtoupper( implode( ', ', $field['accept'] ) ), rtrim( rtrim( number_format( $field['max_size'], 1, '.', '' ), '0' ), '.' ), $field['max_files'] );

		echo '<label class="' . esc_attr( $label_class ) . '" for="' . esc_attr( $id ) . '">' . esc_html( $field['label'] ) . '</label>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped

		if ( $existing ) {
			echo '<ul class="rfb-files">';

			foreach ( $existing as $file ) {
				$url = isset( $ctx['file_url'] ) ? (string) call_user_func( $ctx['file_url'], $file ) : '';
				echo '<li>' . ( '' !== $url ? '<a href="' . esc_url( $url ) . '">' . esc_html( (string) $file['name'] ) . '</a>' : esc_html( (string) $file['name'] ) ) . ' <span class="rfb-muted">(' . esc_html( size_format( (int) ( $file['size'] ?? 0 ) ) ) . ')</span> <label class="rfb-check"><input type="checkbox" name="rfb_remove[]" value="' . esc_attr( (string) $file['id'] ) . '"><span>' . esc_html__( 'Remove', 'refraction' ) . '</span></label></li>';
			}

			echo '</ul>';
		}

		echo '<input class="rfb-input rfb-file" type="file" id="' . esc_attr( $id ) . '" name="' . esc_attr( Uploads::input_name( $path ) ) . '[]" accept="' . esc_attr( $accept ) . '"' . $multiple . ( $existing ? '' : $required ) . $described_attr . ' data-rfb-max-size="' . esc_attr( (string) (int) ( $field['max_size'] * 1024 * 1024 ) ) . '" data-rfb-max-files="' . (int) $field['max_files'] . '" data-rfb-accept="' . esc_attr( implode( ',', $field['accept'] ) ) . '">'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		echo '<p class="rfb-help rfb-file-hint">' . esc_html( $hint ) . '</p><p class="rfb-error rfb-file-error" role="alert" hidden></p>';
	}

	private static function repeater( array $field, array $rows, string $name, array $errors, array $ctx, string $path, string $id ): void {
		$shown = max( count( $rows ), max( $field['min_rows'], 1 ) );

		echo '<fieldset class="rfb-repeater" data-rfb-min="' . (int) max( $field['min_rows'], $field['required'] ? 1 : 0 ) . '" data-rfb-max="' . (int) $field['max_rows'] . '"><legend class="rfb-label">' . esc_html( $field['label'] ) . '</legend><div class="rfb-rows">';

		for ( $i = 0; $i < $shown; $i++ ) {
			self::repeater_row( $field, is_array( $rows[ $i ] ?? null ) ? $rows[ $i ] : [], $name, (string) $i, $errors, $ctx, $path . '.' . $i );
		}

		echo '</div><template class="rfb-row-template">';
		self::repeater_row( $field, [], $name, '__INDEX__', [], $ctx, $path . '.__INDEX__' );
		echo '</template><button type="button" class="rfb-btn rfb-btn-light-primary" data-rfb-add>' . esc_html( $field['add_label'] ) . '</button></fieldset>';
	}

	private static function repeater_row( array $field, array $values, string $name, string $index, array $errors, array $ctx, string $path ): void {
		echo '<div class="rfb-rep-row" data-rfb-scope><div class="rfb-form-grid">';
		self::render_fields( $field['children'], $values, $name . '[' . $index . ']', $errors, $ctx, $path );
		echo '</div><button type="button" class="rfb-icon-btn rfb-rep-remove" data-rfb-remove aria-label="' . esc_attr__( 'Remove this row', 'refraction' ) . '">&times;</button></div>';
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
