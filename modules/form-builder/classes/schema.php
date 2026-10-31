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
		$types = [];

		foreach ( self::palette() as $group ) {
			$types += $group['types'];
		}

		return $types;
	}

	/** The builder palette: groups of field types. */
	public static function palette(): array {
		return [
			'basic' => [
				'label' => self::t( 'Basic fields' ),
				'types' => [
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
				],
			],
			'choice' => [
				'label' => self::t( 'Choices' ),
				'types' => [
					'select' => self::t( 'Dropdown' ),
					'radio' => self::t( 'Choice (one)' ),
					'checkbox' => self::t( 'Choices (many)' ),
					'toggle' => self::t( 'Yes / No switch' ),
					'rating' => self::t( 'Rating (1 to 5)' ),
				],
			],
			'advanced' => [
				'label' => self::t( 'Advanced' ),
				'types' => [
					'file' => self::t( 'File upload' ),
					'hidden' => self::t( 'Hidden field' ),
					'group' => self::t( 'Group' ),
					'repeater' => self::t( 'Repeater' ),
				],
			],
			'layout' => [
				'label' => self::t( 'Layout' ),
				'types' => [
					'step' => self::t( 'Step (new page)' ),
					'heading' => self::t( 'Heading' ),
					'paragraph' => self::t( 'Paragraph' ),
					'html' => self::t( 'Custom HTML' ),
					'divider' => self::t( 'Divider' ),
				],
			],
		];
	}

	/** Types that only decorate the form and never hold a value. */
	public static function is_layout( string $type ): bool {
		return in_array( $type, [ 'heading', 'paragraph', 'html', 'divider' ], true );
	}

	public static function is_step( string $type ): bool {
		return 'step' === $type;
	}

	public static function is_container( string $type ): bool {
		return in_array( $type, [ 'group', 'repeater' ], true );
	}

	/** True for every type that has a stored value (containers hold their children's values). */
	public static function has_value( string $type ): bool {
		return ! self::is_layout( $type ) && ! self::is_step( $type );
	}

	/** True for a value that fits in a table cell and can be sorted or filtered. */
	public static function is_scalar_type( string $type ): bool {
		return self::has_value( $type ) && ! self::is_container( $type ) && 'file' !== $type && 'checkbox' !== $type;
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

	/** Allowed upload extensions (a field picks a subset). */
	const FILE_TYPES = [ 'jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'zip', 'mp3', 'mp4' ];
	const HIDDEN_SOURCES = [ 'static', 'query', 'page_url', 'referrer', 'user_id', 'user_email', 'date' ];

	/** Content that may appear in a Custom HTML block: post-level HTML, no scripts or event handlers. */
	public static function html( $value ): string {
		$value = is_scalar( $value ) ? (string) $value : '';
		$value = substr( $value, 0, 20000 );

		if ( function_exists( 'wp_kses_post' ) ) {
			return trim( wp_kses_post( $value ) );
		}

		// Fallback for tests outside WordPress: drop script and style blocks, then keep a few tags without attributes.
		$value = preg_replace( '~<(script|style)\b.*?</\1\s*>~is', '', $value );
		$value = strip_tags( (string) $value, '<p><br><a><strong><em><b><i><ul><ol><li><h2><h3><h4><span><div><hr>' );

		return trim( (string) preg_replace( '~<(\w+)\s+[^>]*>~', '<$1>', $value ) );
	}

	/** Cleans one field. Containers clean their children; use clean_tree() for a whole list. */
	public static function clean_field( $raw, int $depth = 0, string $parent = '' ): ?array {
		if ( ! is_array( $raw ) ) {
			return null;
		}

		$type = isset( $raw['type'] ) && isset( self::types()[ $raw['type'] ] ) ? $raw['type'] : 'text';

		// Containers and steps only exist at the top level; a repeater can not hold uploads.
		if ( $depth > 0 && ( self::is_container( $type ) || self::is_step( $type ) || ( 'repeater' === $parent && 'file' === $type ) ) ) {
			return null;
		}

		$label = self::text( $raw['label'] ?? '', 80 );
		$has_value = self::has_value( $type );

		if ( '' === $label && $has_value ) {
			return null;
		}

		$key = self::key( '' !== (string) ( $raw['key'] ?? '' ) ? $raw['key'] : ( $has_value ? $label : $type ) );

		if ( '' === $key ) {
			return null;
		}

		$accept = $raw['accept'] ?? [ 'jpg', 'jpeg', 'png', 'pdf' ];
		$accept = array_values( array_intersect( self::FILE_TYPES, array_map( 'strtolower', array_map( 'trim', is_array( $accept ) ? $accept : explode( ',', (string) $accept ) ) ) ) );
		$classes = array_slice( array_filter( preg_split( '/\s+/', (string) ( $raw['css_class'] ?? '' ) ), static function ( $c ) {
			return 1 === preg_match( '/^[A-Za-z][A-Za-z0-9_-]{0,39}$/', $c );
		} ), 0, 3 );
		$source = in_array( $raw['source'] ?? '', self::HIDDEN_SOURCES, true ) ? $raw['source'] : 'static';
		$layout_text = 'html' === $type ? self::html( $raw['content'] ?? '' ) : ( 'paragraph' === $type ? self::textarea( $raw['content'] ?? '', 2000 ) : self::text( $raw['content'] ?? '', 300 ) );

		return [
			'key' => $key,
			'label' => '' !== $label ? $label : ( self::types()[ $type ] ?? '' ),
			'type' => $type,
			'required' => $has_value && ! self::is_container( $type ) && 'hidden' !== $type && ! empty( $raw['required'] ),
			'options' => self::has_options( $type ) ? self::options( $raw['options'] ?? [] ) : [],
			'placeholder' => self::text( $raw['placeholder'] ?? '', 120 ),
			'help' => self::text( $raw['help'] ?? '', 200 ),
			'width' => in_array( $raw['width'] ?? '', self::WIDTHS, true ) ? $raw['width'] : 'full',
			'in_table' => self::is_scalar_type( $type ) && 'hidden' !== $type && ! empty( $raw['in_table'] ),
			'filter' => ! empty( $raw['filter'] ) && self::has_options( $type ) && 'checkbox' !== $type,
			'public' => ! empty( $raw['public'] ) && self::is_scalar_type( $type ) && 'hidden' !== $type,
			'default' => self::text( $raw['default'] ?? '', 255 ),
			'min' => self::number_or_null( $raw['min'] ?? null ),
			'max' => self::number_or_null( $raw['max'] ?? null ),
			'content' => $layout_text,
			'level' => max( 2, min( 6, (int) ( $raw['level'] ?? 3 ) ) ),
			'conditions' => Conditions::clean( $raw['conditions'] ?? [] ),
			'css_class' => implode( ' ', $classes ),
			'hide_label' => ! empty( $raw['hide_label'] ),
			'accept' => $accept ?: [ 'jpg', 'jpeg', 'png', 'pdf' ],
			'max_size' => (float) max( 0.1, min( 64.0, is_numeric( $raw['max_size'] ?? null ) ? (float) $raw['max_size'] : 5.0 ) ),
			'max_files' => max( 1, min( 10, (int) ( $raw['max_files'] ?? 1 ) ) ),
			'children' => [],
			'min_rows' => max( 0, min( 20, (int) ( $raw['min_rows'] ?? 0 ) ) ),
			'max_rows' => max( 1, min( 50, (int) ( $raw['max_rows'] ?? 10 ) ) ),
			'add_label' => self::text( $raw['add_label'] ?? '', 40 ) ?: self::t( 'Add row' ),
			'source' => 'hidden' === $type ? $source : 'static',
		];
	}

	private static function number_or_null( $value ): ?float {
		return is_numeric( $value ) ? (float) $value : null;
	}

	/**
	 * Cleans a list of fields (and the children of containers), dropping junk and duplicate keys.
	 *
	 * @param array  $raw    Raw fields.
	 * @param array  $used   Keys already taken anywhere in the form (by reference).
	 * @param int    $budget Fields left before the form-wide cap (by reference).
	 */
	public static function clean_tree( $raw, array &$used, int &$budget, int $depth = 0, string $parent = '' ): array {
		$fields = [];

		foreach ( (array) $raw as $item ) {
			if ( $budget <= 0 ) {
				break;
			}

			$field = self::clean_field( $item, $depth, $parent );

			if ( ! $field ) {
				continue;
			}

			// A field without its own key gets a free one (Heading, Heading 2...); a clash on a value field is dropped.
			$explicit = '' !== (string) ( $item['key'] ?? '' );
			$base = $field['key'];

			if ( isset( $used[ $base ] ) ) {
				if ( self::has_value( $field['type'] ) && $explicit ) {
					continue;
				}

				for ( $i = 2; isset( $used[ $base . '_' . $i ] ); $i++ ) {
					continue;
				}

				$field['key'] = substr( $base, 0, 36 ) . '_' . $i;
			}

			$used[ $field['key'] ] = true;
			$budget--;

			if ( self::is_container( $field['type'] ) ) {
				$field['children'] = self::clean_tree( $item['children'] ?? [], $used, $budget, $depth + 1, $field['type'] );
			}

			$fields[] = $field;
		}

		return $fields;
	}

	/** Every field of the form, containers followed by their children, in order. */
	public static function walk( array $fields ): array {
		$all = [];

		foreach ( $fields as $field ) {
			$all[] = $field;

			if ( $field['children'] ) {
				$all = array_merge( $all, self::walk( $field['children'] ) );
			}
		}

		return $all;
	}

	/** Top-level fields that store a value (including groups and repeaters). */
	public static function value_fields( array $definition ): array {
		return array_values( array_filter( $definition['fields'], static function ( $field ) {
			return self::has_value( $field['type'] );
		} ) );
	}

	/** The form split into steps: a list of field lists. One step when the form has no Step field. */
	public static function steps( array $definition ): array {
		$steps = [ [ 'title' => '', 'fields' => [] ] ];

		foreach ( $definition['fields'] as $field ) {
			if ( self::is_step( $field['type'] ) ) {
				if ( $steps[0]['fields'] || count( $steps ) > 1 ) {
					$steps[] = [ 'title' => $field['label'], 'fields' => [] ];
				} else {
					$steps[0]['title'] = $field['label'];
				}

				continue;
			}

			$steps[ count( $steps ) - 1 ]['fields'][] = $field;
		}

		return $steps;
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
		$used = [];
		$budget = self::MAX_FIELDS;
		$fields = self::clean_tree( $raw['fields'] ?? [], $used, $budget );

		$statuses = self::clean_statuses( $raw['statuses'] ?? [] );

		if ( ! $statuses ) {
			$statuses = [ [ 'key' => 'new', 'label' => self::t( 'New' ), 'color' => 'primary' ] ];
		}

		$status_keys = array_column( $statuses, 'key' );
		$default_status = in_array( $raw['default_status'] ?? '', $status_keys, true ) ? $raw['default_status'] : $status_keys[0];
		$titles = array_values( array_filter( $fields, static function ( $field ) {
			return self::is_scalar_type( $field['type'] ) && 'hidden' !== $field['type'];
		} ) );
		$title_keys = array_column( $titles, 'key' );
		$title_field = in_array( $raw['title_field'] ?? '', $title_keys, true ) ? $raw['title_field'] : ( $title_keys[0] ?? '' );

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
			'style' => Style::clean( $raw['style'] ?? [] ),
			'settings' => Settings::clean( $raw['settings'] ?? [] ),
		];
	}

	/** Only icons bundled with the plugin are accepted; the admin falls back to a default when it is missing. */
	public static function icon( $value ): string {
		return preg_match( '/^[a-z0-9][a-z0-9-]*$/', (string) $value ) ? (string) $value : 'grid-view';
	}

	public static function field( array $definition, string $key ): ?array {
		foreach ( self::walk( $definition['fields'] ) as $field ) {
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
	 * Fields hidden by their visibility rules are skipped: never required, never stored. Group values are keyed by
	 * their children, repeater values are a list of rows, and file values come from $files (already checked and stored
	 * by Uploads; the form post never supplies them).
	 *
	 * @param array $definition A cleaned definition.
	 * @param array $input      Raw values keyed by field key (typically unslashed $_POST data).
	 * @param array $only       When set, only these top-level field keys are read.
	 * @param array $files      Accepted file descriptors, keyed by field path ("photo", "group.photo").
	 *
	 * @return array{values:array,errors:array<string,string>} Errors are keyed by field path ("key", "group.child", "rows.0.child").
	 */
	public static function validate( array $definition, array $input, array $only = [], array $files = [] ): array {
		$values = [];
		$errors = [];
		$hidden = [];

		self::validate_scope( $definition['fields'], $input, $input, '', $only, $files, $values, $errors, $hidden );

		return [ 'values' => $values, 'errors' => $errors ];
	}

	/** Value of a field as the visibility rules see it: hidden fields count as empty. */
	private static function seen( array $scope, array $root, array $hidden, string $key ) {
		if ( isset( $hidden[ $key ] ) ) {
			return '';
		}

		$value = $scope[ $key ] ?? ( $root[ $key ] ?? '' );

		return is_array( $value ) ? array_map( 'strval', array_filter( $value, 'is_scalar' ) ) : ( is_scalar( $value ) ? (string) $value : '' );
	}

	private static function validate_scope( array $fields, array $scope, array $root, string $path, array $only, array $files, array &$values, array &$errors, array &$hidden ): void {
		foreach ( $fields as $field ) {
			$key = $field['key'];

			if ( ! self::has_value( $field['type'] ) || ( '' === $path && $only && ! in_array( $key, $only, true ) ) ) {
				continue;
			}

			$lookup = static function ( string $name ) use ( $scope, $root, &$hidden ) {
				return self::seen( $scope, $root, $hidden, $name );
			};

			if ( ! Conditions::is_visible( $field['conditions'], $lookup ) ) {
				$hidden[ $key ] = true;
				continue;
			}

			$here = '' === $path ? $key : $path . '.' . $key;
			$raw = $scope[ $key ] ?? null;

			if ( 'group' === $field['type'] ) {
				$child_values = [];
				self::validate_scope( $field['children'], is_array( $raw ) ? $raw : [], $root, $here, [], $files, $child_values, $errors, $hidden );
				$values[ $key ] = $child_values;
				continue;
			}

			if ( 'repeater' === $field['type'] ) {
				$values[ $key ] = self::validate_rows( $field, is_array( $raw ) ? $raw : [], $root, $here, $files, $errors, $hidden );
				continue;
			}

			if ( 'file' === $field['type'] ) {
				$list = isset( $files[ $here ] ) && is_array( $files[ $here ] ) ? array_values( $files[ $here ] ) : [];
				$values[ $key ] = $list;

				if ( ! $list && $field['required'] ) {
					$errors[ $here ] = self::t( 'Please choose a file.' );
				}

				continue;
			}

			if ( 'hidden' === $field['type'] ) {
				$values[ $key ] = self::text( $raw ?? $field['default'], 255 );
				continue;
			}

			$result = self::clean_value( $field, $raw ?? ( 'toggle' === $field['type'] ? '0' : '' ) );

			if ( null === $result['error'] && $result['empty'] && $field['required'] ) {
				$result['error'] = self::t( 'This field is required.' );
			}

			if ( null !== $result['error'] ) {
				$errors[ $here ] = $result['error'];
			}

			$values[ $key ] = $result['value'];
		}
	}

	private static function validate_rows( array $field, array $rows, array $root, string $path, array $files, array &$errors, array &$hidden ): array {
		$clean = [];

		foreach ( array_values( $rows ) as $row ) {
			if ( ! is_array( $row ) || count( $clean ) >= $field['max_rows'] ) {
				continue;
			}

			$index = count( $clean );
			$row_values = [];
			$row_errors = [];
			$row_hidden = [];
			self::validate_scope( $field['children'], $row, $root, $path . '.' . $index, [], $files, $row_values, $row_errors, $row_hidden );

			// A row nobody touched (every answer empty) is dropped instead of reported.
			$filled = array_filter( $row_values, static function ( $value ) {
				return is_array( $value ) ? (bool) array_filter( $value ) : ( '' !== $value && '0' !== $value );
			} );

			if ( ! $filled ) {
				continue;
			}

			$errors += $row_errors;
			$clean[] = $row_values;
		}

		$minimum = max( $field['min_rows'], $field['required'] ? 1 : 0 );

		if ( count( $clean ) < $minimum ) {
			$errors[ $path ] = sprintf( self::t( 'Add at least %d.' ), $minimum );
		}

		return $clean;
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

	private static function textarea( $raw, int $max = 5000 ): string {
		$value = is_scalar( $raw ) ? (string) $raw : '';
		$value = strip_tags( str_replace( "\r\n", "\n", $value ) );
		$value = preg_replace( '/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $value );

		return trim( function_exists( 'mb_substr' ) ? mb_substr( $value, 0, $max ) : substr( $value, 0, $max ) );
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
		if ( 'file' === $field['type'] ) {
			return implode( ', ', array_filter( array_map( static function ( $file ) {
				return is_array( $file ) ? (string) ( $file['name'] ?? '' ) : '';
			}, (array) $value ) ) );
		}

		if ( 'group' === $field['type'] ) {
			return self::summary( $field['children'], is_array( $value ) ? $value : [], '; ', true );
		}

		if ( 'repeater' === $field['type'] ) {
			$rows = array_map( function ( $row ) use ( $field ) {
				return self::summary( $field['children'], is_array( $row ) ? $row : [], ', ', false );
			}, is_array( $value ) ? $value : [] );

			return implode( ' | ', array_filter( $rows ) );
		}

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

	private static function summary( array $children, array $values, string $glue, bool $labelled ): string {
		$parts = [];

		foreach ( $children as $child ) {
			if ( ! self::has_value( $child['type'] ) || 'hidden' === $child['type'] ) {
				continue;
			}

			$text = self::display( $child, $values[ $child['key'] ] ?? '' );

			if ( '' !== $text && ! ( 'toggle' === $child['type'] && '0' === (string) ( $values[ $child['key'] ] ?? '' ) ) ) {
				$parts[] = $labelled ? $child['label'] . ': ' . $text : $text;
			}
		}

		return implode( $glue, $parts );
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

		foreach ( self::value_fields( $definition ) as $field ) {
			$text = self::display( $field, $values[ $field['key'] ] ?? '' );

			if ( '' !== $text && 'toggle' !== $field['type'] && 'hidden' !== $field['type'] ) {
				$parts[] = $text;
			}
		}

		return implode( "\n", $parts );
	}

	/** The title of a record: its title field, else the first filled text-like field, else "#id". */
	public static function title( array $definition, array $values, int $id = 0 ): string {
		$candidates = array_merge( [ $definition['title_field'] ], array_column( self::value_fields( $definition ), 'key' ) );

		foreach ( $candidates as $key ) {
			$field = self::field( $definition, (string) $key );
			$text = $field && self::is_scalar_type( $field['type'] ) && ! in_array( $field['type'], [ 'toggle', 'hidden' ], true ) ? self::text( self::display( $field, $values[ $key ] ?? '' ), 120 ) : '';

			if ( '' !== $text ) {
				return $text;
			}
		}

		return $id ? '#' . $id : self::t( 'Untitled' );
	}

	/** CSV columns: one per stored value, group children get their own column ("Group > Child"). */
	public static function csv_columns( array $definition ): array {
		$columns = [];

		foreach ( self::value_fields( $definition ) as $field ) {
			if ( 'group' === $field['type'] ) {
				foreach ( $field['children'] as $child ) {
					if ( self::has_value( $child['type'] ) ) {
						$columns[] = [ 'label' => $field['label'] . ' > ' . $child['label'], 'field' => $child, 'path' => [ $field['key'], $child['key'] ] ];
					}
				}
			} else {
				$columns[] = [ 'label' => $field['label'], 'field' => $field, 'path' => [ $field['key'] ] ];
			}
		}

		return $columns;
	}

	/**
	 * CSV rows (header first). Cells that start with = + - @ get a leading apostrophe so spreadsheets never run them.
	 *
	 * @param array[] $records Each: id, status, created, values.
	 */
	public static function csv_rows( array $definition, array $records ): array {
		$columns = self::csv_columns( $definition );
		$header = [ 'ID' ];

		foreach ( $columns as $column ) {
			$header[] = $column['label'];
		}

		$header[] = self::t( 'Status' );
		$header[] = self::t( 'Created' );
		$rows = [ $header ];

		foreach ( $records as $record ) {
			$row = [ (string) $record['id'] ];

			foreach ( $columns as $column ) {
				$value = $record['values'];

				foreach ( $column['path'] as $step ) {
					$value = is_array( $value ) ? ( $value[ $step ] ?? '' ) : '';
				}

				$row[] = self::csv_cell( self::display( $column['field'], $value ) );
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
