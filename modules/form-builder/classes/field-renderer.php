<?php
namespace Refraction\Modules\FormBuilder\Classes;

use Refraction\Core\Utils\Icons;

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
 *   type_styles array            the definition's styles shared by field type
 */
class Field_Renderer {

	/** The title of a step, group or repeater in the tag the owner chose (div, p, h2 to h6); hidden titles stay for screen readers. */
	public static function heading( array $field, string $class ): string {
		$tag = in_array( $field['label_tag'], Schema::LABEL_TAGS, true ) ? $field['label_tag'] : 'div';

		return '<' . $tag . ' class="' . esc_attr( $class . ( $field['hide_label'] ? ' screen-reader-text' : '' ) ) . '">' . esc_html( $field['label'] ) . '</' . $tag . '>';
	}

	/** The owner's description, printed under the label. */
	public static function description( array $field, string $id ): string {
		return '' === $field['description'] ? '' : '<p class="rfb-description" id="' . esc_attr( $id . '-desc' ) . '">' . esc_html( $field['description'] ) . '</p>';
	}

	/** Heading and description of a step (used by the public form and the admin form). */
	public static function step_head( array $field ): string {
		return '<div class="rfb-step-head rfb-t-step" data-rfb-key="' . esc_attr( $field['key'] ) . '">' . self::heading( $field, 'rfb-step-title' ) . self::description( $field, 'rfb-step-' . $field['key'] ) . '</div>';
	}

	/**
	 * @param array[] $fields Fields to print.
	 * @param array   $values Current values keyed by field key (null/absent uses the default).
	 * @param string  $prefix Input name prefix, for example "values" or "values[address]".
	 * @param array   $errors Messages keyed by field path.
	 * @param string  $path   Path of the container these fields sit in ("" at the top).
	 */
	public static function render_fields( array $fields, array $values, string $prefix, array $errors = [], array $ctx = [], string $path = '' ): void {
		foreach ( $fields as $field ) {
			// Accordion and Tabs only arrange their fields: the fields keep this scope's input names and values.
			if ( Schema::is_host( $field['type'] ) ) {
				self::host( $field, $values, $prefix, $errors, $ctx, $path );
				continue;
			}

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

		if ( in_array( $type, [ 'radio', 'checkbox' ], true ) && '' !== Field_Style::choice_class( $field, (array) ( $ctx['type_styles'] ?? [] ) ) ) {
			$classes[] = Field_Style::choice_class( $field, (array) ( $ctx['type_styles'] ?? [] ) );
		}

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
			echo self::step_head( $field ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts.
			return;
		}

		// Layout blocks.
		if ( Schema::is_layout( $type ) ) {
			echo '<div' . $attrs . '>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts.

			if ( 'heading' === $type ) {
				$text = $field['from_card'] && isset( $ctx['card'] ) ? $ctx['card']['label'] : ( '' !== $field['content'] ? $field['content'] : $field['label'] );
				echo '<h' . (int) $field['level'] . ' class="rfb-heading">' . esc_html( $text ) . '</h' . (int) $field['level'] . '>';
			} elseif ( 'badge' === $type ) {
				echo '' !== $field['content'] ? '<span class="rfb-badge-pill">' . esc_html( $field['content'] ) . '</span>' : '';
			} elseif ( 'price' === $type ) {
				echo self::price( $field, $ctx ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts.
			} elseif ( 'paragraph' === $type ) {
				echo '<p class="rfb-paragraph">' . nl2br( esc_html( $field['content'] ) ) . '</p>';
			} elseif ( 'html' === $type ) {
				echo '<div class="rfb-html">' . wp_kses_post( $field['content'] ) . '</div>';
			} elseif ( 'image' === $type ) {
				echo self::image( $field ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from WordPress image markup and escaped parts.
			} elseif ( 'icon_list' === $type ) {
				echo self::icon_list( $field ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from bundled icons and escaped parts.
			} elseif ( 'summary' === $type ) {
				// Filled by the script with the answers given so far (labels and values), for a last look before sending.
				echo '<div class="rfb-summary" data-rfb-summary data-rfb-empty="' . esc_attr__( 'Your answers will show here.', 'refraction' ) . '">' . ( '' !== $field['content'] ? '<div class="rfb-summary-title">' . esc_html( $field['content'] ) . '</div>' : '' ) . '<dl class="rfb-summary-list"></dl></div>';
			} else {
				echo '<hr class="rfb-divider">';
			}

			echo '</div>';
			return;
		}

		$described = '';
		$described .= '' !== $field['description'] ? $id . '-desc ' : '';
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

		if ( 'total' === $type ) {
			self::total( $field, $value, $id, $label_class, $ctx );
			echo '</div>';
			return;
		}

		if ( 'group' === $type ) {
			echo '<fieldset class="rfb-group"><legend class="rfb-legend">' . self::heading( $field, 'rfb-legend-text' ) . '</legend>' . self::description( $field, $id ) . '<div class="rfb-form-grid" data-rfb-scope>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			self::render_fields( $field['children'], is_array( $value ) ? $value : [], $name, $errors, $ctx, $path );
			echo '</div></fieldset>';
		} elseif ( 'repeater' === $type ) {
			self::repeater( $field, is_array( $value ) ? $value : [], $name, $errors, $ctx, $path, $id );
		} elseif ( 'choice_set' === $type ) {
			self::choice_set( $field, $value, $name, $id, $errors, $ctx, $path );
		} elseif ( 'file' === $type ) {
			self::file( $field, $id, $required, $described_attr, $label_class, $path, $ctx );
		} elseif ( 'signature' === $type ) {
			self::signature( $field, $name, $id, $label_class, $described_attr, $path, $ctx );
		} elseif ( 'name' === $type ) {
			self::name( $field, is_array( $value ) ? $value : [], $name, $id, $label_class, $described_attr );
		} elseif ( in_array( $type, [ 'radio', 'checkbox' ], true ) ) {
			echo '<fieldset class="rfb-choice"' . $described_attr . '><legend class="' . esc_attr( $label_class ) . '">' . esc_html( $field['label'] ) . '</legend>' . self::description( $field, $id ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			$value = null === $value ? ( 'checkbox' === $type ? [] : $field['default'] ) : $value;
			$picked = array_map( 'strval', (array) $value );
			$suffix = 'radio' === $type ? '' : '[]';

			echo '<div class="rfb-choice-options">';

			foreach ( $field['options'] as $index => $option ) {
				$option_id = $id . '-' . $index;
				echo '<label class="rfb-check" for="' . esc_attr( $option_id ) . '"><input type="' . esc_attr( $type ) . '" id="' . esc_attr( $option_id ) . '" name="' . esc_attr( $name . $suffix ) . '" value="' . esc_attr( $option['value'] ) . '"' . self::number_attr( $option ) . checked( in_array( $option['value'], $picked, true ), true, false ) . '><span>' . esc_html( $option['label'] ) . '</span></label>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			}

			echo '</div></fieldset>';
		} elseif ( 'toggle' === $type ) {
			$value = null === $value ? $field['default'] : $value;
			echo '<input type="hidden" name="' . esc_attr( $name ) . '" value="0">';
			echo '<label class="rfb-switch" for="' . esc_attr( $id ) . '"><input type="checkbox" id="' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '" value="1"' . checked( '1' === (string) $value, true, false ) . $described_attr . '><span class="rfb-switch-track" aria-hidden="true"></span><span class="rfb-switch-text">' . esc_html( $field['label'] ) . '</span></label>' . self::description( $field, $id ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		} else {
			$value = null === $value ? $field['default'] : $value;
			echo '<label class="' . esc_attr( $label_class ) . '" for="' . esc_attr( $id ) . '">' . esc_html( $field['label'] ) . '</label>' . self::description( $field, $id ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			self::control( $field, $value, $name, $id, $required, $described_attr, $ctx );
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
	private static function control( array $field, $value, string $name, string $id, string $required, string $described_attr, array $ctx = [] ): void {
		$type = $field['type'];

		if ( 'currency' === $type ) {
			self::amount( $field, $value, $name, $id, $required, $described_attr, $ctx );
			return;
		}

		if ( 'textarea' === $type ) {
			echo '<textarea class="rfb-input" rows="4" id="' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '" placeholder="' . esc_attr( $field['placeholder'] ) . '"' . $required . $described_attr . '>' . esc_textarea( (string) $value ) . '</textarea>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			return;
		}

		if ( 'select' === $type ) {
			echo '<select class="rfb-input" id="' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '"' . $required . $described_attr . '>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			echo '<option value="">' . esc_html( '' !== $field['placeholder'] ? $field['placeholder'] : __( 'Select...', 'refraction' ) ) . '</option>';

			foreach ( $field['options'] as $option ) {
				echo '<option value="' . esc_attr( $option['value'] ) . '"' . self::number_attr( $option ) . selected( (string) $value, $option['value'], false ) . '>' . esc_html( $option['label'] ) . '</option>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			}

			echo '</select>';
			return;
		}

		if ( 'country' === $type ) {
			echo '<select class="rfb-input" id="' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '" autocomplete="country"' . $required . $described_attr . '><option value="">' . esc_html( '' !== $field['placeholder'] ? $field['placeholder'] : __( 'Select a country...', 'refraction' ) ) . '</option>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped

			foreach ( Countries::all() as $code => $label ) {
				echo '<option value="' . esc_attr( $code ) . '"' . selected( strtoupper( (string) $value ), $code, false ) . '>' . esc_html( $label ) . '</option>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
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
			$attributes .= ' step="' . ( 'currency' === $type ? '0.01' : ( ! empty( $field['stepper'] ) ? '1' : 'any' ) ) . '" inputmode="decimal"';
			$attributes .= null !== $field['min'] ? ' min="' . esc_attr( (string) $field['min'] ) . '"' : '';
			$attributes .= null !== $field['max'] ? ' max="' . esc_attr( (string) $field['max'] ) . '"' : '';
		}

		$attributes .= self::when_attributes( $field );
		$list = '';

		if ( 'text' === $type && ! empty( $field['suggestions'] ) ) {
			// Typing suggestions from the site's own list (no outside address service).
			$list = $id . '-list';
			$attributes .= ' list="' . esc_attr( $list ) . '" autocomplete="off"';
		}

		$input = '<input class="rfb-input" type="' . esc_attr( $html_types[ $type ] ?? 'text' ) . '" id="' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '" value="' . esc_attr( (string) $value ) . '" placeholder="' . esc_attr( $field['placeholder'] ) . '"' . $attributes . $required . $described_attr . '>';

		if ( 'number' === $type && ! empty( $field['stepper'] ) ) {
			// A minus and a plus button around the box (the script wires them; without it the box still takes a number).
			$input = '<div class="rfb-count" data-rfb-count><button type="button" class="rfb-count-btn" data-rfb-step="-1" aria-label="' . esc_attr__( 'One less', 'refraction' ) . '" tabindex="-1">&minus;</button>' . $input . '<button type="button" class="rfb-count-btn" data-rfb-step="1" aria-label="' . esc_attr__( 'One more', 'refraction' ) . '" tabindex="-1">+</button></div>';
		}

		echo $input; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts.

		if ( '' !== $list ) {
			echo '<datalist id="' . esc_attr( $list ) . '">';

			foreach ( $field['suggestions'] as $suggestion ) {
				echo '<option value="' . esc_attr( $suggestion ) . '"></option>';
			}

			echo '</datalist>';
		}
	}

	/** The number a choice or card adds to a Total, as a data attribute (nothing when it has none). */
	private static function number_attr( array $option ): string {
		return isset( $option['number'] ) && null !== $option['number'] ? ' data-rfb-n="' . esc_attr( (string) (float) $option['number'] ) . '"' : '';
	}

	/** min, max and step of a date, time or date-and-time box, and the closed weekdays for the script. */
	private static function when_attributes( array $field ): string {
		$type = $field['type'];

		if ( ! in_array( $type, [ 'date', 'time', 'datetime' ], true ) ) {
			return '';
		}

		$out = '';

		if ( 'time' !== $type ) {
			$limits = Schema::when_limits( $field );
			$out .= $field['notice_hours'] > 0 ? ' min="' . esc_attr( 'date' === $type ? $limits['min_date'] : $limits['min_datetime'] ) . '"' : '';
			$out .= '' !== $limits['max_date'] ? ' max="' . esc_attr( 'date' === $type ? $limits['max_date'] : $limits['max_date'] . 'T23:59' ) . '"' : '';
			$out .= $field['closed_days'] ? ' data-rfb-closed="' . esc_attr( implode( ',', $field['closed_days'] ) ) . '"' : '';
		}

		if ( 'date' !== $type ) {
			$out .= 'time' === $type && '' !== $field['time_min'] ? ' min="' . esc_attr( $field['time_min'] ) . '"' : '';
			$out .= 'time' === $type && '' !== $field['time_max'] ? ' max="' . esc_attr( $field['time_max'] ) . '"' : '';
			$out .= '' !== $field['time_min'] || '' !== $field['time_max'] ? ' data-rfb-hours="' . esc_attr( ( '' !== $field['time_min'] ? $field['time_min'] : '00:00' ) . '-' . ( '' !== $field['time_max'] ? $field['time_max'] : '23:59' ) ) . '"' : '';
			$out .= $field['time_step'] > 0 ? ' step="' . (int) ( $field['time_step'] * 60 ) . '"' : '';
		}

		return $out;
	}

	/**
	 * A Total: the amount the answers come to, worked out by the script as the visitor answers (the formula and rules ride
	 * along as JSON) and again by the server, whose figure is stored. Nothing is posted.
	 */
	private static function total( array $field, $value, string $id, string $label_class, array $ctx ): void {
		$cfg = Money::config( (array) ( $ctx['money'] ?? [] ) );
		$per = Money::per_label( $field['per'], $field['per_label'] );
		$shown = is_numeric( $value ) ? Money::display( $value, $cfg, $field['per'], $field['per_label'] ) : $field['no_price'];
		$config = [
			'formula' => $field['formula'],
			'rules' => $field['rules'],
			'none' => $field['no_price'],
			'symbol' => $cfg['currency_symbol'],
			'after' => 'after' === $cfg['currency_position'],
			'per' => $per,
		];

		echo '<span class="' . esc_attr( $label_class ) . '" id="' . esc_attr( $id ) . '-label">' . esc_html( $field['label'] ) . '</span>' . self::description( $field, $id ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		echo '<output class="rfb-total" aria-labelledby="' . esc_attr( $id ) . '-label" aria-live="polite" data-rfb-total="' . esc_attr( (string) wp_json_encode( $config ) ) . '"><span class="rfb-total-amount">' . esc_html( $shown ) . '</span></output>';
	}

	/** The Amount input: a text box that writes 1,200.50 as you type, with the currency symbol and the period beside it. */
	private static function amount( array $field, $value, string $name, string $id, string $required, string $described_attr, array $ctx ): void {
		$cfg = Money::config( (array) ( $ctx['money'] ?? [] ) );
		$text = '' === (string) $value || ! is_numeric( $value ) ? (string) $value : Money::format( $value, $cfg );
		$per = Money::per_label( $field['per'], $field['per_label'] );
		$symbol = '' !== $cfg['currency_symbol'] ? '<span class="rfb-amount-affix rfb-amount-symbol" aria-hidden="true">' . esc_html( $cfg['currency_symbol'] ) . '</span>' : '';
		$limits = ( null !== $field['min'] ? ' data-rfb-min="' . esc_attr( (string) $field['min'] ) . '"' : '' ) . ( null !== $field['max'] ? ' data-rfb-max="' . esc_attr( (string) $field['max'] ) . '"' : '' );

		echo '<div class="rfb-amount' . ( 'after' === $cfg['currency_position'] ? ' is-after' : '' ) . '">' . ( 'after' === $cfg['currency_position'] ? '' : $symbol ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped above.
		echo '<input class="rfb-input rfb-amount-input" type="text" inputmode="decimal" autocomplete="off" data-rfb-amount id="' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '" value="' . esc_attr( $text ) . '" placeholder="' . esc_attr( $field['placeholder'] ) . '"' . $limits . $required . $described_attr . '>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		echo 'after' === $cfg['currency_position'] ? $symbol : ''; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped above.
		echo '' !== $per ? '<span class="rfb-amount-affix rfb-amount-per">' . esc_html( $per ) . '</span>' : '';
		echo '</div>';
	}

	/** The panel ids and open state helpers shared by Accordion and Tabs. */
	private static function host( array $field, array $values, string $prefix, array $errors, array $ctx, string $path ): void {
		$type = $field['type'];
		$id = 'rfb-' . $type . '-' . $field['key'] . '-' . substr( md5( $prefix . $path ), 0, 6 );
		$classes = [ 'rfb-field', 'rfb-w-' . $field['width'], 'rfb-t-' . $type, 'rfb-' . $type ];

		if ( 'tabs' === $type ) {
			$classes[] = 'rfb-tabs-' . $field['tab_look'];
		}

		if ( '' !== $field['css_class'] ) {
			$classes[] = $field['css_class'];
		}

		$attrs = ' class="' . esc_attr( implode( ' ', $classes ) ) . '" data-rfb-key="' . esc_attr( $field['key'] ) . '" data-rfb-type="' . esc_attr( $type ) . '"';
		$attrs .= ! empty( $field['conditions']['enabled'] ) ? ' data-rfb-cond="' . esc_attr( (string) wp_json_encode( $field['conditions'] ) ) . '"' : '';
		$attrs .= 'tabs' === $type ? ' data-rfb-tabs' : ( 'columns' === $type ? '' : ' data-rfb-accordion' . ( $field['multiple'] ? ' data-rfb-multiple' : '' ) );

		echo '<div' . $attrs . '>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts.

		if ( 'columns' !== $type && ( ! $field['hide_label'] || '' !== $field['description'] ) ) {
			echo self::heading( $field, 'rfb-host-title' ) . self::description( $field, $id ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		}

		$panels = $field['children'];

		if ( 'columns' === $type ) {
			echo '<div class="rfb-columns" style="--rfb-col-gap:' . (int) $field['col_gap'] . 'px">'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Number only.

			foreach ( $panels as $panel ) {
				$cond = ! empty( $panel['conditions']['enabled'] ) ? ' data-rfb-cond="' . esc_attr( (string) wp_json_encode( $panel['conditions'] ) ) . '"' : '';
				echo '<div class="rfb-column rfb-w-' . esc_attr( $panel['width'] ) . '" data-rfb-key="' . esc_attr( $panel['key'] ) . '"' . $cond . '><div class="rfb-form-grid" style="--rfb-col-gap:' . (int) $field['col_gap'] . 'px">'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped above.
				self::render_fields( $panel['children'], $values, $prefix, $errors, $ctx, $path );
				echo '</div></div>';
			}

			echo '</div></div>';
			return;
		}

		if ( 'tabs' === $type ) {
			echo '<div class="rfb-tablist" role="tablist" hidden>';

			foreach ( $panels as $i => $panel ) {
				echo '<button type="button" class="rfb-tab" role="tab" id="' . esc_attr( $id . '-t' . $i ) . '" aria-controls="' . esc_attr( $id . '-p' . $i ) . '" aria-selected="false" tabindex="-1" data-rfb-tab="' . esc_attr( $panel['key'] ) . '">' . esc_html( $panel['label'] ) . '</button>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			}

			echo '</div>';
		}

		foreach ( $panels as $i => $panel ) {
			$cond = ! empty( $panel['conditions']['enabled'] ) ? ' data-rfb-cond="' . esc_attr( (string) wp_json_encode( $panel['conditions'] ) ) . '"' : '';
			$title = esc_html( $panel['label'] );

			ob_start();
			echo '<div class="rfb-form-grid">';
			self::render_fields( $panel['children'], $values, $prefix, $errors, $ctx, $path );
			echo '</div>';
			$body = ob_get_clean();

			if ( 'tabs' === $type ) {
				echo '<div class="rfb-tabpanel rfb-t-panel" role="tabpanel" id="' . esc_attr( $id . '-p' . $i ) . '" aria-labelledby="' . esc_attr( $id . '-t' . $i ) . '" data-rfb-panel="' . esc_attr( $panel['key'] ) . '" data-rfb-key="' . esc_attr( $panel['key'] ) . '"' . $cond . '>' . $body . '</div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			} else {
				echo '<details class="rfb-acc-item rfb-t-panel" data-rfb-panel="' . esc_attr( $panel['key'] ) . '" data-rfb-key="' . esc_attr( $panel['key'] ) . '"' . $cond . ( $panel['open'] ? ' open' : '' ) . '><summary class="rfb-acc-head">' . $title . '</summary><div class="rfb-acc-body">' . $body . '</div></details>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			}
		}

		echo '</div>';
	}

	/**
	 * A set of choice cards. Each Group or Repeater child is a card the visitor picks (one, or several when the set allows
	 * it); the fields inside a card are shown for information only and are never posted.
	 */
	private static function choice_set( array $field, $value, string $name, string $id, array $errors, array $ctx, string $path ): void {
		$cfg = Money::config( (array) ( $ctx['money'] ?? [] ) );
		$picked = null === $value ? ( '' !== $field['default'] ? [ $field['default'] ] : [] ) : array_map( static function ( $pick ) {
			return is_array( $pick ) ? (string) ( $pick['key'] ?? '' ) : (string) $pick;
		}, (array) $value );
		$kind = $field['multiple'] ? 'checkbox' : 'radio';
		$described = '' !== $field['description'] ? ' aria-describedby="' . esc_attr( $id . '-desc' ) . '"' : '';

		echo '<fieldset class="rfb-choice rfb-cards' . ( $field['multiple'] ? ' is-multiple' : '' ) . '"' . $described . '><legend class="rfb-label' . ( $field['required'] ? ' is-required' : '' ) . ( $field['hide_label'] ? ' screen-reader-text' : '' ) . '">' . esc_html( $field['label'] ) . '</legend>' . self::description( $field, $id ) . '<div class="rfb-cc-list" style="--rfb-cc-gap:' . (int) $field['card_gap'] . 'px">'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped

		foreach ( $field['children'] as $i => $card ) {
			$card_id = $id . '-' . $i;
			$on = in_array( $card['key'], $picked, true );
			$cond = ! empty( $card['conditions']['enabled'] ) ? ' data-rfb-cond="' . esc_attr( (string) wp_json_encode( $card['conditions'] ) ) . '"' : '';
			$price = null !== $card['card_price'] ? '<span class="rfb-cc-amount">' . esc_html( Money::display( $card['card_price'], $cfg ) ) . '</span>' . ( '' !== Money::per_label( $card['per'], $card['per_label'] ) ? ' <span class="rfb-cc-per">' . esc_html( Money::per_label( $card['per'], $card['per_label'] ) ) . '</span>' : '' ) : ( '' !== $card['card_note'] ? '<span class="rfb-cc-note">' . esc_html( $card['card_note'] ) . '</span>' : '' );

			$percent = 'auto' === $card['card_width'] ? 100 / max( 1, (int) $field['card_columns'] ) : Schema::width_percent( $card['card_width'] );
			$basis = 'calc(' . round( $percent, 3 ) . '% - var(--rfb-cc-gap) * ' . round( 1 - $percent / 100, 4 ) . ')';

			$free = 'free' === $card['card_mode'];
			$pos = '' !== $card['marker_pos'] ? $card['marker_pos'] : $field['marker_pos'];
			$look = '' !== $card['marker_look'] ? $card['marker_look'] : $field['marker_look'];
			$classes = 'rfb-choice-card rfb-t-card' . ( $on ? ' is-selected' : '' ) . ( $free ? ' is-free rfb-mpos-' . $pos . ' rfb-mlook-' . $look : '' );

			echo '<div class="' . esc_attr( $classes ) . '" style="flex-basis:' . esc_attr( $basis ) . '" data-rfb-key="' . esc_attr( $card['key'] ) . '" data-rfb-type="card"' . $cond . '>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped

			if ( $free ) {
				// A free container: the pick control and whatever blocks the owner dropped in. The label stretches over the card so the whole card picks it.
				echo '<label class="rfb-cc-pick" for="' . esc_attr( $card_id ) . '"><input type="' . esc_attr( $kind ) . '" id="' . esc_attr( $card_id ) . '" name="' . esc_attr( $name . ( $field['multiple'] ? '[]' : '' ) ) . '" value="' . esc_attr( $card['key'] ) . '"' . self::number_attr( [ 'number' => $card['card_price'] ] ) . ' data-rfb-title="' . esc_attr( $card['label'] ) . '"' . checked( $on, true, false ) . ( $field['required'] && ! $field['multiple'] ? ' required' : '' ) . '><span class="rfb-cc-mark' . ( $field['multiple'] ? ' is-check' : '' ) . '" aria-hidden="true"></span><span class="screen-reader-text">' . esc_html( $card['label'] ) . '</span></label>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				echo '<div class="rfb-cc-content">' . self::locked( $card, $ctx, $path . '.' . $card['key'] ) . '</div></div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts.
				continue;
			}

			echo '<label class="rfb-cc-main" for="' . esc_attr( $card_id ) . '"><input type="' . esc_attr( $kind ) . '" id="' . esc_attr( $card_id ) . '" name="' . esc_attr( $name . ( $field['multiple'] ? '[]' : '' ) ) . '" value="' . esc_attr( $card['key'] ) . '"' . self::number_attr( [ 'number' => $card['card_price'] ] ) . ' data-rfb-title="' . esc_attr( $card['label'] ) . '"' . checked( $on, true, false ) . ( $field['required'] && ! $field['multiple'] ? ' required' : '' ) . '>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			echo '<span class="rfb-cc-body"><span class="rfb-cc-title">' . esc_html( $card['label'] ) . ( '' !== $card['card_badge'] ? ' <span class="rfb-cc-badge">' . esc_html( $card['card_badge'] ) . '</span>' : '' ) . '</span>' . ( '' !== $card['card_subtitle'] ? '<span class="rfb-cc-sub">' . esc_html( $card['card_subtitle'] ) . '</span>' : '' ) . '</span>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			echo '<span class="rfb-cc-price">' . $price . '</span></label>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped

			if ( $card['children'] && $card['card_inline'] ) {
				echo '<div class="rfb-cc-fields rfb-cc-inline">' . self::locked( $card, $ctx, $path . '.' . $card['key'] ) . '</div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts.
			} elseif ( $card['children'] ) {
				echo '<details class="rfb-cc-details"' . ( $card['card_details_open'] ? ' open' : '' ) . '><summary>' . esc_html( $card['card_details'] ) . '</summary><div class="rfb-cc-fields">' . self::locked( $card, $ctx, $path . '.' . $card['key'] ) . '</div></details>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			}

			echo '</div>';
		}

		echo '</div></fieldset>';
	}

	/** The fields of a card, shown but never editable: every control is disabled, so nothing in them is posted. */
	private static function locked( array $card, array $ctx, string $path ): string {
		$ctx['card'] = $card; // blocks inside (a heading with the card's name, a price) read it
		ob_start();

		if ( 'repeater' === $card['type'] ) {
			$rows = max( 1, $card['min_rows'] );
			echo '<div class="rfb-rows">';

			for ( $i = 0; $i < $rows; $i++ ) {
				echo '<div class="rfb-rep-row" data-rfb-scope><div class="rfb-form-grid">';
				self::render_fields( $card['children'], [], 'rfb_locked[' . $card['key'] . '][' . $i . ']', [], $ctx, $path . '.' . $i );
				echo '</div></div>';
			}

			echo '</div>';
		} else {
			echo '<div class="rfb-form-grid" data-rfb-scope>';
			self::render_fields( $card['children'], [], 'rfb_locked[' . $card['key'] . ']', [], $ctx, $path );
			echo '</div>';
		}

		$html = (string) ob_get_clean();

		return (string) preg_replace( '/<(input|select|textarea|button)\b/i', '<$1 disabled', $html );
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

	private static function name( array $field, array $value, string $name, string $id, string $label_class, string $described_attr ): void {
		$labels = [
			'prefix' => __( 'Prefix', 'refraction' ),
			'first' => __( 'First name', 'refraction' ),
			'middle' => __( 'Middle name', 'refraction' ),
			'last' => __( 'Last name', 'refraction' ),
		];
		$autocomplete = [ 'prefix' => 'honorific-prefix', 'first' => 'given-name', 'middle' => 'additional-name', 'last' => 'family-name' ];

		echo '<fieldset class="rfb-choice rfb-name"' . $described_attr . '><legend class="' . esc_attr( $label_class ) . '">' . esc_html( $field['label'] ) . '</legend>' . self::description( $field, $id ) . '<div class="rfb-name-row">'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped

		foreach ( Schema::NAME_PARTS as $part ) {
			if ( ! in_array( $part, $field['parts'], true ) ) {
				continue;
			}

			$part_id = $id . '-' . $part;
			$needed = $field['required'] && in_array( $part, [ 'first', 'last' ], true ) ? ' required aria-required="true"' : '';
			echo '<div class="rfb-name-part rfb-name-' . esc_attr( $part ) . '"><input class="rfb-input" type="text" id="' . esc_attr( $part_id ) . '" name="' . esc_attr( $name . '[' . $part . ']' ) . '" value="' . esc_attr( (string) ( $value[ $part ] ?? '' ) ) . '" autocomplete="' . esc_attr( $autocomplete[ $part ] ) . '"' . $needed . '><label class="rfb-sublabel" for="' . esc_attr( $part_id ) . '">' . esc_html( $labels[ $part ] ) . '</label></div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		}

		echo '</div></fieldset>';
	}

	/** A pad to draw on (see assets/js/frontend.js); the picture travels as a PNG data URL in a hidden input. */
	private static function signature( array $field, string $name, string $id, string $label_class, string $described_attr, string $path, array $ctx ): void {
		$existing = (array) ( $ctx['files'][ $path ] ?? [] );
		$hint = '' !== $field['placeholder'] ? $field['placeholder'] : __( 'Sign here', 'refraction' );

		echo '<span class="' . esc_attr( $label_class ) . '" id="' . esc_attr( $id ) . '-label">' . esc_html( $field['label'] ) . '</span>' . self::description( $field, $id ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped

		if ( $existing ) {
			foreach ( $existing as $file ) {
				$url = isset( $ctx['file_url'] ) ? (string) call_user_func( $ctx['file_url'], $file ) : '';
				echo '<div class="rfb-sig-saved">' . ( '' !== $url ? '<img src="' . esc_url( add_query_arg( 'inline', '1', $url ) ) . '" alt="' . esc_attr__( 'Saved signature', 'refraction' ) . '">' : '' ) . '<label class="rfb-check"><input type="checkbox" name="rfb_remove[]" value="' . esc_attr( (string) $file['id'] ) . '"><span>' . esc_html__( 'Remove the saved signature', 'refraction' ) . '</span></label></div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			}
		}

		echo '<div class="rfb-signature" data-rfb-signature' . ( $field['required'] && ! $existing ? ' data-rfb-required' : '' ) . ' style="--rfb-sig-height:' . (int) $field['sig_height'] . 'px"' . $described_attr . '>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		echo '<canvas class="rfb-sig-canvas" role="img" aria-labelledby="' . esc_attr( $id ) . '-label"></canvas><span class="rfb-sig-hint" aria-hidden="true">' . esc_html( $hint ) . '</span>';
		echo '<input type="hidden" name="' . esc_attr( $name ) . '" value="" data-rfb-sig-value></div>';
		echo '<button type="button" class="rfb-link-btn rfb-sig-clear" data-rfb-sig-clear hidden>' . esc_html__( 'Clear signature', 'refraction' ) . '</button>';
		echo '<noscript><p class="rfb-help">' . esc_html__( 'Drawing a signature needs JavaScript.', 'refraction' ) . '</p></noscript>';
		echo '<p class="rfb-error rfb-sig-error" role="alert" hidden>' . esc_html__( 'Please sign above.', 'refraction' ) . '</p>';
	}

	/** The Price block: the card's price (inside a choice card) or its own amount, in the collection's currency, with the period. Nothing when there is none. */
	private static function price( array $field, array $ctx ): string {
		$card = $field['price_card'] && isset( $ctx['card'] ) ? $ctx['card'] : null;
		$amount = $card ? $card['card_price'] : $field['price_amount'];

		if ( null === $amount ) {
			return '';
		}

		$source = $card ?: $field;
		$per = Money::per_label( $source['per'], $source['per_label'] );

		return '<span class="rfb-price"><span class="rfb-price-amount">' . esc_html( Money::display( $amount, Money::config( (array) ( $ctx['money'] ?? [] ) ) ) ) . '</span>' . ( '' !== $per ? ' <span class="rfb-price-per">' . esc_html( $per ) . '</span>' : '' ) . '</span>';
	}

	/** The Icon List block: items with an icon each (bundled icons only), as a column or a wrapping row. */
	private static function icon_list( array $field ): string {
		if ( ! $field['items'] ) {
			return '';
		}

		$out = '<ul class="rfb-il rfb-il-' . esc_attr( $field['list_layout'] ) . '">';

		foreach ( $field['items'] as $item ) {
			$inner = '<span class="rfb-il-icon" aria-hidden="true">' . Icons::svg( $item['icon'], [ 'size' => 20 ] ) . '</span><span class="rfb-il-text">' . esc_html( $item['text'] ) . '</span>';
			$out .= '<li class="rfb-il-item">' . ( '' !== $item['link'] ? '<a class="rfb-il-link" href="' . esc_url( $item['link'] ) . '">' . $inner . '</a>' : $inner ) . '</li>';
		}

		return $out . '</ul>';
	}

	/** The Image block: a media library image at the chosen size, width and alignment, optionally linked. */
	private static function image( array $field ): string {
		if ( ! $field['image_id'] || ! wp_attachment_is_image( $field['image_id'] ) ) {
			return '';
		}

		$img = wp_get_attachment_image( $field['image_id'], $field['image_size'], false, [ 'class' => 'rfb-image-el', 'alt' => '' !== $field['image_alt'] ? $field['image_alt'] : (string) get_post_meta( $field['image_id'], '_wp_attachment_image_alt', true ), 'loading' => 'lazy' ] );

		if ( '' === $img ) {
			return '';
		}

		if ( '' !== $field['image_link'] ) {
			$img = '<a href="' . esc_url( $field['image_link'] ) . '" rel="noopener noreferrer">' . $img . '</a>';
		}

		return '<figure class="rfb-image rfb-align-' . esc_attr( $field['image_align'] ) . '" style="--rfb-image-width:' . (int) $field['image_width'] . '%">' . $img . '</figure>';
	}

	private static function repeater( array $field, array $rows, string $name, array $errors, array $ctx, string $path, string $id ): void {
		$shown = max( count( $rows ), max( $field['min_rows'], 1 ) );

		echo '<fieldset class="rfb-repeater" data-rfb-min="' . (int) max( $field['min_rows'], $field['required'] ? 1 : 0 ) . '" data-rfb-max="' . (int) $field['max_rows'] . '"><legend class="rfb-legend">' . self::heading( $field, 'rfb-legend-text' ) . '</legend>' . self::description( $field, $id ) . '<div class="rfb-rows">';

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
	public static function cell( array $field, $value, array $money = [] ): string {
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
			case 'total':
				return '<span class="rfb-money">' . esc_html( Money::display( $text, Money::config( $money ), $field['per'], $field['per_label'] ) ) . '</span>';
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
