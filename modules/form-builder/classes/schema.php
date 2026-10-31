<?php
namespace Refraction\Modules\FormBuilder\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * The shape of a Form Builder collection (Booking, Listing, Transaction...) and the rules for its records.
 * Pure logic: no WordPress storage, so it is tested on its own (scripts/test-form-builder.php).
 *
 * A collection definition is:
 *   slug, label, singular, description, icon, title_field, default_status, public_form, public_list, success_message,
 *   fields:   [ { key, label, type, required, options[{value,label}], placeholder, help, width, in_table, filter, public, default, min, max } ]
 *   statuses: [ { key, label, color } ]
 */
class Schema {

	const MAX_FIELDS = 60;
	const MAX_OPTIONS = 100;
	const MAX_STATUSES = 12;
	const COLORS = [ 'primary', 'success', 'danger', 'warning', 'info', 'dark', 'secondary' ];
	const WIDTHS = [ 'full', 'half', 'third' ];

	/** @return array<string,string> field type => label */
	public static function types(): array {
		return [
			'text' => self::t( 'Text' ),
			'textarea' => self::t( 'Long text' ),
			'number' => self::t( 'Number' ),
			'currency' => self::t( 'Amount (money)' ),
			'email' => self::t( 'Email' ),
			'phone' => self::t( 'Phone' ),
			'url' => self::t( 'Website link' ),
			'date' => self::t( 'Date' ),
			'time' => self::t( 'Time' ),
			'datetime' => self::t( 'Date and time' ),
			'select' => self::t( 'Dropdown' ),
			'radio' => self::t( 'Choice (one)' ),
			'checkbox' => self::t( 'Choices (many)' ),
			'toggle' => self::t( 'Yes / No switch' ),
			'rating' => self::t( 'Rating (1 to 5)' ),
		];
	}

	public static function has_options( string $type ): bool {
		return in_array( $type, [ 'select', 'radio', 'checkbox' ], true );
	}

	public static function is_numeric_type( string $type ): bool {
		return in_array( $type, [ 'number', 'currency', 'rating' ], true );
	}

	public static function t( string $text ): string {
		return function_exists( '__' ) ? __( $text, 'refraction' ) : $text; // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralText
	}

	/** A key is lowercase letters, digits and underscores, starting with a letter. */
	public static function key( $value, int $max = 40 ): string {
		$key = strtolower( trim( (string) $value ) );
		$key = preg_replace( '/[^a-z0-9_]+/', '_', $key );
		$key = trim( (string) $key, '_' );

		if ( '' !== $key && ! ctype_alpha( $key[0] ) ) {
			$key = 'f_' . $key;
		}

		return substr( $key, 0, $max );
	}

	/** A slug is lowercase letters, digits and dashes. */
	public static function slug( $value ): string {
		$slug = strtolower( trim( (string) $value ) );
		$slug = trim( (string) preg_replace( '/[^a-z0-9]+/', '-', $slug ), '-' );

		return substr( $slug, 0, 40 );
	}

	public static function text( $value, int $max = 255 ): string {
		$value = is_scalar( $value ) ? (string) $value : '';
		$value = strip_tags( $value );
		$value = preg_replace( '/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $value );
		$value = trim( (string) preg_replace( '/[ \t]+/', ' ', $value ) );

		return function_exists( 'mb_substr' ) ? mb_substr( $value, 0, $max ) : substr( $value, 0, $max );
	}

	public static function color( $value ): string {
		return in_array( $value, self::COLORS, true ) ? $value : 'secondary';
	}

	/**
	 * "value|Label" or just "Label" per line (or an array of the same / of {value,label}) into option objects.
	 *
	 * @param string|array $raw
	 */
	public static function options( $raw ): array {
		$lines = is_array( $raw ) ? $raw : preg_split( '/\r\n|\r|\n/', (string) $raw );
		$options = [];
		$seen = [];

		foreach ( (array) $lines as $line ) {
			if ( is_array( $line ) ) {
				$value = (string) ( $line['value'] ?? '' );
				$label = (string) ( $line['label'] ?? $value );
			} else {
				$parts = explode( '|', (string) $line, 2 );
				$label = isset( $parts[1] ) ? $parts[1] : $parts[0];
				$value = $parts[0];
			}

			$label = self::text( $label, 120 );
			$value = self::text( $value, 120 );

			if ( '' === $label ) {
				continue;
			}

			if ( '' === $value ) {
				$value = $label;
			}

			if ( isset( $seen[ $value ] ) ) {
				continue;
			}

			$seen[ $value ] = true;
			$options[] = [ 'value' => $value, 'label' => $label ];

			if ( count( $options ) >= self::MAX_OPTIONS ) {
				break;
			}
		}

		return $options;
	}

	public static function options_to_text( array $options ): string {
		return implode(
			"\n",
			array_map(
				static function ( $option ) {
					return $option['value'] === $option['label'] ? $option['label'] : $option['value'] . '|' . $option['label'];
				},
				$options
			)
		);
	}

	public static function clean_field( $raw ): ?array {
		if ( ! is_array( $raw ) ) {
			return null;
		}

		$label = self::text( $raw['label'] ?? '', 80 );
		$key = self::key( '' !== (string) ( $raw['key'] ?? '' ) ? $raw['key'] : $label );

		if ( '' === $key || '' === $label ) {
			return null;
		}

		$type = isset( $raw['type'] ) && isset( self::types()[ $raw['type'] ] ) ? $raw['type'] : 'text';
		$width = in_array( $raw['width'] ?? '', self::WIDTHS, true ) ? $raw['width'] : 'full';
		$field = [
			'key' => $key,
			'label' => $label,
			'type' => $type,
			'required' => ! empty( $raw['required'] ),
			'options' => self::has_options( $type ) ? self::options( $raw['options'] ?? [] ) : [],
			'placeholder' => self::text( $raw['placeholder'] ?? '', 120 ),
			'help' => self::text( $raw['help'] ?? '', 200 ),
			'width' => $width,
			'in_table' => ! empty( $raw['in_table'] ),
			'filter' => ! empty( $raw['filter'] ) && self::has_options( $type ),
			'public' => ! empty( $raw['public'] ),
			'default' => self::text( $raw['default'] ?? '', 255 ),
			'min' => self::number_or_null( $raw['min'] ?? null ),
			'max' => self::number_or_null( $raw['max'] ?? null ),
		];

		return $field;
	}

	private static function number_or_null( $value ): ?float {
		return is_numeric( $value ) ? (float) $value : null;
	}

	/** @return array{key:string,label:string,color:string}[] */
	public static function clean_statuses( $raw ): array {
		$statuses = [];
		$seen = [];

		foreach ( (array) $raw as $status ) {
			if ( ! is_array( $status ) ) {
				continue;
			}

			$label = self::text( $status['label'] ?? '', 40 );
			$key = self::key( '' !== (string) ( $status['key'] ?? '' ) ? $status['key'] : $label, 30 );

			if ( '' === $label || '' === $key || isset( $seen[ $key ] ) ) {
				continue;
			}

			$seen[ $key ] = true;
			$statuses[] = [ 'key' => $key, 'label' => $label, 'color' => self::color( $status['color'] ?? '' ) ];

			if ( count( $statuses ) >= self::MAX_STATUSES ) {
				break;
			}
		}

		return $statuses;
	}

	/** Cleans a whole collection definition; unknown keys are dropped and every value is forced into range. */
	public static function definition( $raw ): array {
		$raw = is_array( $raw ) ? $raw : [];
		$label = self::text( $raw['label'] ?? '', 60 );
		$slug = self::slug( '' !== (string) ( $raw['slug'] ?? '' ) ? $raw['slug'] : $label );
		$fields = [];
		$keys = [];

		foreach ( (array) ( $raw['fields'] ?? [] ) as $field ) {
			$field = self::clean_field( $field );

			if ( ! $field || isset( $keys[ $field['key'] ] ) ) {
				continue;
			}

			$keys[ $field['key'] ] = true;
			$fields[] = $field;

			if ( count( $fields ) >= self::MAX_FIELDS ) {
				break;
			}
		}

		$statuses = self::clean_statuses( $raw['statuses'] ?? [] );

		if ( ! $statuses ) {
			$statuses = [ [ 'key' => 'new', 'label' => self::t( 'New' ), 'color' => 'primary' ] ];
		}

		$status_keys = array_column( $statuses, 'key' );
		$default_status = in_array( $raw['default_status'] ?? '', $status_keys, true ) ? $raw['default_status'] : $status_keys[0];
		$title_field = isset( $keys[ $raw['title_field'] ?? '' ] ) ? $raw['title_field'] : ( $fields ? $fields[0]['key'] : '' );

		return [
			'slug' => $slug,
			'label' => $label,
			'singular' => self::text( $raw['singular'] ?? '', 60 ) ?: $label,
			'description' => self::text( $raw['description'] ?? '', 200 ),
			'icon' => self::icon( $raw['icon'] ?? '' ),
			'title_field' => $title_field,
			'default_status' => $default_status,
			'public_form' => ! empty( $raw['public_form'] ),
			'public_list' => ! empty( $raw['public_list'] ),
			'success_message' => self::text( $raw['success_message'] ?? '', 300 ) ?: self::t( 'Thank you. We received your submission.' ),
			'fields' => $fields,
			'statuses' => $statuses,
		];
	}

	/** Only icons bundled with the plugin are accepted; the admin falls back to a default when it is missing. */
	public static function icon( $value ): string {
		return preg_match( '/^[a-z0-9][a-z0-9-]*$/', (string) $value ) ? (string) $value : 'grid-view';
	}

	public static function field( array $definition, string $key ): ?array {
		foreach ( $definition['fields'] as $field ) {
			if ( $field['key'] === $key ) {
				return $field;
			}
		}

		return null;
	}

	public static function status( array $definition, string $key ): ?array {
		foreach ( $definition['statuses'] as $status ) {
			if ( $status['key'] === $key ) {
				return $status;
			}
		}

		return null;
	}

	/**
	 * Validate and normalise the submitted values of one record.
	 *
	 * @param array $definition A cleaned definition.
	 * @param array $input      Raw values keyed by field key (typically unslashed $_POST data).
	 * @param array $only       When set, only these field keys are read (public forms accept only the fields they show).
	 *
	 * @return array{values:array,errors:array<string,string>}
	 */
	public static function validate( array $definition, array $input, array $only = [] ): array {
		$values = [];
		$errors = [];

		foreach ( $definition['fields'] as $field ) {
			$key = $field['key'];

			if ( $only && ! in_array( $key, $only, true ) ) {
				continue;
			}

			$raw = $input[ $key ] ?? ( 'toggle' === $field['type'] ? '0' : '' );
			$result = self::clean_value( $field, $raw );

			if ( null === $result['error'] && $result['empty'] && $field['required'] ) {
				$result['error'] = self::t( 'This field is required.' );
			}

			if ( null !== $result['error'] ) {
				$errors[ $key ] = $result['error'];
			}

			$values[ $key ] = $result['value'];
		}

		return [ 'values' => $values, 'errors' => $errors ];
	}

	/** @return array{value:string|array,empty:bool,error:?string} */
	private static function clean_value( array $field, $raw ): array {
		$type = $field['type'];
		$out = static function ( $value, bool $empty, ?string $error = null ): array {
			return [ 'value' => $value, 'empty' => $empty, 'error' => $error ];
		};

		if ( 'checkbox' === $type ) {
			$allowed = array_column( $field['options'], 'value' );
			$picked = array_values( array_intersect( $allowed, array_map( 'strval', (array) $raw ) ) );

			return $out( $picked, ! $picked );
		}

		if ( is_array( $raw ) ) {
			return $out( '', true, self::t( 'This value is not valid.' ) );
		}

		$value = 'textarea' === $type ? self::textarea( $raw ) : self::text( $raw );

		if ( 'toggle' === $type ) {
			$on = in_array( (string) $raw, [ '1', 'on', 'yes', 'true' ], true );

			return $out( $on ? '1' : '0', ! $on );
		}

		if ( '' === $value ) {
			return $out( '', true );
		}

		switch ( $type ) {
			case 'number':
			case 'currency':
			case 'rating':
				$normalised = str_replace( ',', '', $value );

				if ( ! is_numeric( $normalised ) ) {
					return $out( $value, false, self::t( 'Enter a number.' ) );
				}

				$number = (float) $normalised;
				$min = 'rating' === $type ? 1.0 : $field['min'];
				$max = 'rating' === $type ? 5.0 : $field['max'];

				if ( null !== $min && $number < $min ) {
					return $out( $value, false, sprintf( self::t( 'The lowest allowed value is %s.' ), self::number_text( $min ) ) );
				}

				if ( null !== $max && $number > $max ) {
					return $out( $value, false, sprintf( self::t( 'The highest allowed value is %s.' ), self::number_text( $max ) ) );
				}

				if ( 'rating' === $type ) {
					return $out( (string) (int) round( $number ), false );
				}

				return $out( 'currency' === $type ? number_format( $number, 2, '.', '' ) : self::number_text( $number ), false );

			case 'email':
				return false === filter_var( $value, FILTER_VALIDATE_EMAIL )
					? $out( $value, false, self::t( 'Enter a valid email address.' ) )
					: $out( $value, false );

			case 'phone':
				return 1 === preg_match( '/^[0-9+()\-.\s]{5,30}$/', $value )
					? $out( $value, false )
					: $out( $value, false, self::t( 'Enter a valid phone number.' ) );

			case 'url':
				$scheme = strtolower( (string) parse_url( $value, PHP_URL_SCHEME ) );

				return false !== filter_var( $value, FILTER_VALIDATE_URL ) && in_array( $scheme, [ 'http', 'https' ], true )
					? $out( $value, false )
					: $out( $value, false, self::t( 'Enter a link that starts with http:// or https://.' ) );

			case 'date':
				return self::valid_date( 'Y-m-d', $value )
					? $out( $value, false )
					: $out( $value, false, self::t( 'Enter a valid date.' ) );

			case 'time':
				return self::valid_date( 'H:i', $value )
					? $out( $value, false )
					: $out( $value, false, self::t( 'Enter a valid time.' ) );

			case 'datetime':
				$value = str_replace( ' ', 'T', $value );

				return self::valid_date( 'Y-m-d\TH:i', $value )
					? $out( $value, false )
					: $out( $value, false, self::t( 'Enter a valid date and time.' ) );

			case 'select':
			case 'radio':
				return in_array( $value, array_column( $field['options'], 'value' ), true )
					? $out( $value, false )
					: $out( $value, false, self::t( 'Choose one of the listed options.' ) );
		}

		return $out( $value, false );
	}

	private static function textarea( $raw ): string {
		$value = is_scalar( $raw ) ? (string) $raw : '';
		$value = strip_tags( str_replace( "\r\n", "\n", $value ) );
		$value = preg_replace( '/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $value );

		return trim( function_exists( 'mb_substr' ) ? mb_substr( $value, 0, 5000 ) : substr( $value, 0, 5000 ) );
	}

	private static function number_text( float $number ): string {
		return rtrim( rtrim( number_format( $number, 6, '.', '' ), '0' ), '.' );
	}

	private static function valid_date( string $format, string $value ): bool {
		$date = \DateTime::createFromFormat( '!' . $format, $value );

		return $date && $date->format( $format ) === $value;
	}

	/** Plain-text version of a stored value, for the CSV export, the search text and aria labels. */
	public static function display( array $field, $value ): string {
		if ( is_array( $value ) ) {
			$labels = [];

			foreach ( $value as $item ) {
				$labels[] = self::option_label( $field, (string) $item );
			}

			return implode( ', ', $labels );
		}

		$value = (string) $value;

		if ( 'toggle' === $field['type'] ) {
			return '1' === $value ? self::t( 'Yes' ) : self::t( 'No' );
		}

		if ( in_array( $field['type'], [ 'select', 'radio' ], true ) ) {
			return self::option_label( $field, $value );
		}

		if ( 'rating' === $field['type'] && '' !== $value ) {
			return $value . ' / 5';
		}

		return $value;
	}

	private static function option_label( array $field, string $value ): string {
		foreach ( $field['options'] as $option ) {
			if ( $option['value'] === $value ) {
				return $option['label'];
			}
		}

		return $value;
	}

	/** The words the list search looks through. */
	public static function search_text( array $definition, array $values ): string {
		$parts = [];

		foreach ( $definition['fields'] as $field ) {
			$text = self::display( $field, $values[ $field['key'] ] ?? '' );

			if ( '' !== $text && 'toggle' !== $field['type'] ) {
				$parts[] = $text;
			}
		}

		return implode( "\n", $parts );
	}

	/** The title of a record: its title field, else the first filled field, else "#id". */
	public static function title( array $definition, array $values, int $id = 0 ): string {
		$candidates = array_merge( [ $definition['title_field'] ], array_column( $definition['fields'], 'key' ) );

		foreach ( $candidates as $key ) {
			$field = self::field( $definition, (string) $key );
			$text = $field && 'toggle' !== $field['type'] ? self::text( self::display( $field, $values[ $key ] ?? '' ), 120 ) : '';

			if ( '' !== $text ) {
				return $text;
			}
		}

		return $id ? '#' . $id : self::t( 'Untitled' );
	}

	/**
	 * CSV rows (header first). Cells that start with = + - @ get a leading apostrophe so spreadsheets never run them.
	 *
	 * @param array[] $records Each: id, status, created, values.
	 */
	public static function csv_rows( array $definition, array $records ): array {
		$header = [ 'ID' ];

		foreach ( $definition['fields'] as $field ) {
			$header[] = $field['label'];
		}

		$header[] = self::t( 'Status' );
		$header[] = self::t( 'Created' );
		$rows = [ $header ];

		foreach ( $records as $record ) {
			$row = [ (string) $record['id'] ];

			foreach ( $definition['fields'] as $field ) {
				$row[] = self::csv_cell( self::display( $field, $record['values'][ $field['key'] ] ?? '' ) );
			}

			$status = self::status( $definition, (string) $record['status'] );
			$row[] = self::csv_cell( $status ? $status['label'] : (string) $record['status'] );
			$row[] = (string) $record['created'];
			$rows[] = $row;
		}

		return $rows;
	}

	public static function csv_cell( string $text ): string {
		return 1 === preg_match( '/^[=+\-@\t\r]/', $text ) ? "'" . $text : $text;
	}

	/** Two letters for the round avatar in the table (Metronic symbol). */
	public static function initials( string $text ): string {
		$words = preg_split( '/\s+/', trim( $text ) );
		$letters = '';

		foreach ( array_slice( array_filter( (array) $words ), 0, 2 ) as $word ) {
			$letters .= function_exists( 'mb_substr' ) ? mb_substr( $word, 0, 1 ) : substr( $word, 0, 1 );
		}

		$letters = function_exists( 'mb_strtoupper' ) ? mb_strtoupper( $letters ) : strtoupper( $letters );

		return '' === $letters ? '#' : $letters;
	}
}
