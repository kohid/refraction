<?php
namespace Refraction\Modules\RecordsDashboard\Classes;

use Refraction\Core\Utils\Icons;
use Refraction\Modules\FormBuilder\Classes\Collections;
use Refraction\Modules\FormBuilder\Classes\Money;
use Refraction\Modules\FormBuilder\Classes\Records;
use Refraction\Modules\FormBuilder\Classes\Schema;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * What the Records Table and Record Details widgets share (0.129.0): who may see a collection's records, the signed
 * settings their scripts send back, and the HTML of rows, cells and details, written the same way when the page is
 * drawn, in Edit Mode and when the scripts ask for more.
 */
class Records_View {

	/** Record parts every collection has, offered beside its own fields. */
	const SPECIAL = [ '_title', '_reference', '_created', '_modified', '_status' ];

	/** Status colours of the Builder, as the tables show them. */
	const COLORS = [
		'primary' => '#3654d1',
		'success' => '#1f8a4c',
		'danger' => '#c8323a',
		'warning' => '#b86e00',
		'info' => '#1679b8',
		'dark' => '#2b2f36',
		'secondary' => '#6b7280',
	];

	private static ?Collections $collections = null;
	private static ?Records $records = null;

	public static function collections(): Collections {
		return self::$collections ??= new Collections();
	}

	public static function records(): Records {
		return self::$records ??= new Records();
	}

	/** @return array<string,string> slug => label, for the Collection setting. */
	public static function collection_options(): array {
		$options = [ '' => esc_html__( '— Choose —', 'refraction' ) ];

		foreach ( self::collections()->all() as $slug => $definition ) {
			$options[ $slug ] = $definition['label'];
		}

		return $options;
	}

	/**
	 * Each collection's own fields, slug => [ key => label ] (0.147.0): the editor script keeps a widget's field
	 * choices to the collection it shows (assets/js/editor/collection-fields.js).
	 *
	 * @return array<string,array<string,string>>
	 */
	public static function fields_by_collection(): array {
		$map = [];

		foreach ( self::collections()->all() as $slug => $definition ) {
			$map[ $slug ] = [];

			foreach ( Schema::value_fields( $definition ) as $field ) {
				$map[ $slug ][ $field['key'] ] = '' !== $field['label'] ? $field['label'] : $field['key'];
			}
		}

		return $map;
	}

	/**
	 * Every field of every collection (the panel cannot know the collection chosen a moment ago), plus the record's
	 * own parts. A key used by more than one collection is listed once.
	 *
	 * @return array<string,string>
	 */
	public static function field_options( bool $empty = true ): array {
		$options = $empty ? [ '' => esc_html__( '— None —', 'refraction' ) ] : [];
		$options += [
			'_reference' => esc_html__( 'Reference number', 'refraction' ),
			'_title' => esc_html__( 'Record title', 'refraction' ),
			'_created' => esc_html__( 'Date booked (created)', 'refraction' ),
			'_modified' => esc_html__( 'Last changed', 'refraction' ),
			'_status' => esc_html__( 'Status', 'refraction' ),
		];

		foreach ( self::collections()->all() as $definition ) {
			foreach ( Schema::value_fields( $definition ) as $field ) {
				if ( ! isset( $options[ $field['key'] ] ) ) {
					$options[ $field['key'] ] = sprintf( '%s: %s', $definition['label'], '' !== $field['label'] ? $field['label'] : $field['key'] );
				}
			}
		}

		return $options;
	}

	/** @return array<string,string> */
	public static function access_options(): array {
		return [
			'admins' => esc_html__( 'Administrators', 'refraction' ),
			'editors' => esc_html__( 'Editors and administrators', 'refraction' ),
			'logged' => esc_html__( 'Anyone signed in', 'refraction' ),
		];
	}

	/** Records are never public: the widest choice is "anyone signed in". */
	public static function can_view( string $access ): bool {
		switch ( $access ) {
			case 'logged':
				return is_user_logged_in();
			case 'editors':
				return current_user_can( 'edit_others_posts' );
			default:
				return current_user_can( 'manage_options' );
		}
	}

	/** Changing a status also needs an editor's rights, whatever the widget lets people see. */
	public static function can_change( string $access ): bool {
		return self::can_view( $access ) && current_user_can( 'edit_others_posts' );
	}

	public static function sign( array $config ): array {
		$json = (string) wp_json_encode( $config );

		return [ 'config' => $json, 'sig' => self::signature( $json ) ];
	}

	/** The settings a script sent back, when they are the ones this site wrote. */
	public static function verify( string $json, string $sig ): ?array {
		if ( '' === $json || ! hash_equals( self::signature( $json ), $sig ) ) {
			return null;
		}

		$config = json_decode( $json, true );

		return is_array( $config ) ? $config : null;
	}

	private static function signature( string $json ): string {
		return hash_hmac( 'sha256', $json, wp_salt( 'nonce' ) . '|refraction-records' );
	}

	public static function ajax_attributes(): array {
		return [
			'data-ajax' => admin_url( 'admin-ajax.php' ),
			'data-nonce' => wp_create_nonce( Ajax::ACTION ),
		];
	}

	/* ---------------------------------------------------------------- values */

	public static function field( array $definition, string $key ): ?array {
		return '' === $key || in_array( $key, self::SPECIAL, true ) ? null : Schema::field( $definition, $key );
	}

	/** A record's value as plain text: its own parts, or a field as the Builder writes it. */
	public static function text( array $definition, array $record, string $key ): string {
		switch ( $key ) {
			case '':
				return '';
			case '_title':
				return (string) $record['title'];
			case '_reference':
				// The reference the form gave the record (0.147.0); records made before it had one show nothing.
				return (string) ( $record['reference'] ?? '' );
			case '_created':
			case '_modified':
				return self::when( (string) $record[ ltrim( $key, '_' ) ] );
			case '_status':
				$status = Schema::status( $definition, (string) $record['status'] );

				return $status ? $status['label'] : (string) $record['status'];
		}

		$field = self::field( $definition, $key );
		$value = $record['values'][ $key ] ?? '';

		if ( ! $field ) {
			return is_scalar( $value ) ? (string) $value : '';
		}

		if ( in_array( $field['type'], [ 'currency', 'total' ], true ) ) {
			return self::money( $definition, $field, $value );
		}

		if ( in_array( $field['type'], [ 'date', 'datetime' ], true ) && is_string( $value ) && '' !== $value ) {
			return self::when( $value, 'date' === $field['type'] );
		}

		return Schema::display( $field, $value );
	}

	public static function money( array $definition, ?array $field, $value ): string {
		if ( '' === (string) ( is_scalar( $value ) ? $value : '' ) || ! is_numeric( $value ) ) {
			return is_scalar( $value ) ? (string) $value : '';
		}

		$cfg = Money::config( $definition['settings'] ?? [] );

		return $field ? Money::display( $value, Money::for_field( $cfg, $field ), (string) ( $field['per'] ?? '' ), (string) ( $field['per_label'] ?? '' ) ) : Money::display( $value, $cfg );
	}

	/** "Mon 13 Jul 2026, 09:30" in the site's own formats. */
	public static function when( string $value, bool $date_only = false ): string {
		$time = strtotime( $value );

		if ( ! $time ) {
			return $value;
		}

		$has_time = ! $date_only && preg_match( '/\d{1,2}:\d{2}/', $value );

		return date_i18n( get_option( 'date_format' ), $time ) . ( $has_time ? ', ' . date_i18n( get_option( 'time_format' ), $time ) : '' );
	}

	/** Places on a journey: the from field, every stop, the to field. @return string[] */
	public static function journey( array $definition, array $record, string $from, string $stops, string $to ): array {
		$places = [];
		$add = static function ( $text ) use ( &$places ) {
			$text = trim( (string) $text );

			if ( '' !== $text ) {
				$places[] = $text;
			}
		};

		$add( self::text( $definition, $record, $from ) );

		if ( '' !== $stops ) {
			$value = $record['values'][ $stops ] ?? '';

			if ( is_array( $value ) ) {
				foreach ( $value as $item ) {
					$add( is_array( $item ) ? implode( ', ', array_filter( array_map( static function ( $part ) {
						return is_scalar( $part ) ? trim( (string) $part ) : '';
					}, $item ) ) ) : $item );
				}
			} else {
				foreach ( preg_split( '/\r\n|\r|\n|;|\|/', (string) $value ) as $stop ) {
					$add( $stop );
				}
			}
		}

		$add( self::text( $definition, $record, $to ) );

		return $places;
	}

	/* ------------------------------------------------------------------ html */

	public static function icon( string $name, int $size = 18 ): string {
		$svg = Icons::svg( $name, [ 'size' => $size ] );

		if ( '' !== $svg ) {
			return $svg;
		}

		$paths = [
			'refresh' => 'M17.65 6.35A7.96 7.96 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z',
			'chevron-left' => 'M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z',
			'chevron-right' => 'M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z',
		];

		return isset( $paths[ $name ] ) ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="' . $size . '" height="' . $size . '" aria-hidden="true" focusable="false"><path d="' . $paths[ $name ] . '"/></svg>' : '';
	}

	public static function badge( array $definition, array $record, string $key = '' ): string {
		if ( '' === $key || '_status' === $key ) {
			$status = Schema::status( $definition, (string) $record['status'] );
			$label = $status ? $status['label'] : (string) $record['status'];
			$color = self::COLORS[ $status['color'] ?? '' ] ?? ( $status['color'] ?? self::COLORS['secondary'] );
		} else {
			$label = self::text( $definition, $record, $key );
			$color = self::COLORS['secondary'];
		}

		if ( '' === $label ) {
			return '<span class="rf-rec-muted">&mdash;</span>';
		}

		return '<span class="rf-rec-badge" style="--rf-rec-badge:' . esc_attr( $color ) . '">' . esc_html( $label ) . '</span>';
	}

	public static function initials( string $name ): string {
		$words = preg_split( '/\s+/', trim( $name ) );
		$letters = '';

		foreach ( array_slice( array_filter( (array) $words ), 0, 2 ) as $word ) {
			$letters .= function_exists( 'mb_substr' ) ? mb_strtoupper( mb_substr( $word, 0, 1 ) ) : strtoupper( substr( $word, 0, 1 ) );
		}

		return '' !== $letters ? $letters : '?';
	}

	public static function person( string $name, string $sub ): string {
		if ( '' === $name && '' === $sub ) {
			return '<span class="rf-rec-muted">&mdash;</span>';
		}

		return '<span class="rf-rec-person"><span class="rf-rec-avatar" aria-hidden="true">' . esc_html( self::initials( $name ) ) . '</span><span class="rf-rec-stack"><span class="rf-rec-main">' . esc_html( $name ) . '</span>'
			. ( '' !== $sub ? '<span class="rf-rec-sub">' . esc_html( $sub ) . '</span>' : '' ) . '</span></span>';
	}

	/** A to B, with numbered stops between: the markers are a, 1, 2... b. */
	public static function journey_html( array $places, string $class = '' ): string {
		if ( ! $places ) {
			return '<span class="rf-rec-muted">&mdash;</span>';
		}

		$html = '<ol class="rf-rec-journey ' . esc_attr( $class ) . '">';
		$last = count( $places ) - 1;

		foreach ( $places as $i => $place ) {
			$kind = 0 === $i ? 'start' : ( $i === $last ? 'end' : 'stop' );
			$mark = 'start' === $kind ? 'A' : ( 'end' === $kind ? 'B' : (string) $i );
			$html .= '<li class="rf-rec-place is-' . $kind . '"><span class="rf-rec-mark" aria-hidden="true">' . esc_html( $mark ) . '</span><span class="rf-rec-place-text">' . esc_html( $place ) . '</span></li>';
		}

		return $html . '</ol>';
	}

	/** One table cell. */
	public static function cell( array $definition, array $record, array $col ): string {
		$type = (string) ( $col['t'] ?? 'text' );
		$key = (string) ( $col['f'] ?? '' );
		$sub = '' !== (string) ( $col['sub'] ?? '' ) ? self::text( $definition, $record, (string) $col['sub'] ) : '';

		switch ( $type ) {
			case 'reference':
				// No field chosen: the reference number, or the record title when the form gives no reference.
				$main = self::text( $definition, $record, '' !== $key ? $key : ( '' !== (string) ( $record['reference'] ?? '' ) ? '_reference' : '_title' ) );
				$sub = '' !== (string) ( $col['sub'] ?? '' ) ? $sub : self::text( $definition, $record, '_created' );

				return self::stack( $main, $sub, 'rf-rec-ref' );
			case 'person':
				return self::person( self::text( $definition, $record, $key ), $sub );
			case 'journey':
				return self::journey_html( self::journey( $definition, $record, '' !== $key ? $key : (string) ( $col['from'] ?? '' ), (string) ( $col['stops'] ?? '' ), (string) ( $col['to'] ?? '' ) ), 'is-compact' );
			case 'badge':
				return self::badge( $definition, $record, $key );
			case 'money':
				$field = self::field( $definition, $key );
				$text = $field && ! in_array( $field['type'], [ 'currency', 'total' ], true ) ? self::money( $definition, null, $record['values'][ $key ] ?? '' ) : self::text( $definition, $record, $key );

				return self::stack( $text, $sub, 'rf-rec-money' );
			case 'created':
				return self::stack( self::text( $definition, $record, '_created' ), $sub );
			default:
				return self::stack( self::text( $definition, $record, $key ), $sub );
		}
	}

	private static function stack( string $main, string $sub, string $class = '' ): string {
		if ( '' === $main && '' === $sub ) {
			return '<span class="rf-rec-muted">&mdash;</span>';
		}

		return '<span class="rf-rec-stack ' . esc_attr( $class ) . '"><span class="rf-rec-main">' . esc_html( $main ) . '</span>'
			. ( '' !== $sub ? '<span class="rf-rec-sub">' . esc_html( $sub ) . '</span>' : '' ) . '</span>';
	}

	/** Columns the table has when none are set yet: the reference, the date booked and the status. */
	public static function columns( array $config ): array {
		$cols = array_values( array_filter( (array) ( $config['cols'] ?? [] ), 'is_array' ) );

		return $cols ? $cols : [
			[ 't' => 'reference', 'label' => __( 'Reference', 'refraction' ), 'f' => '' ],
			[ 't' => 'created', 'label' => __( 'Booked', 'refraction' ) ],
			[ 't' => 'badge', 'label' => __( 'Status', 'refraction' ), 'f' => '_status' ],
		];
	}

	/** Query arguments a table may ask for, kept in range. */
	public static function query_args( array $config, array $raw ): array {
		$orderby = (string) ( $raw['orderby'] ?? ( $config['ob'] ?? '' ) );
		$orderby = '_created' === $orderby || '' === $orderby ? 'date' : ( '_status' === $orderby ? 'status' : ( '_reference' === $orderby ? 'reference' : $orderby ) );

		return [
			'search' => sanitize_text_field( (string) ( $raw['search'] ?? '' ) ),
			'status' => sanitize_key( (string) ( $raw['status'] ?? '' ) ),
			'from' => (string) ( $raw['from'] ?? '' ),
			'to' => (string) ( $raw['to'] ?? '' ),
			'orderby' => $orderby,
			'order' => 'asc' === strtolower( (string) ( $raw['order'] ?? ( $config['o'] ?? 'desc' ) ) ) ? 'asc' : 'desc',
			'page' => max( 1, (int) ( $raw['page'] ?? 1 ) ),
			'per_page' => max( 1, min( 100, (int) ( $config['pp'] ?? 10 ) ) ),
		];
	}

	/** @return array{html:string,total:int,pages:int,page:int,summary:string} */
	public static function rows( array $definition, array $config, array $args, int $selected = 0 ): array {
		$result = self::records()->query( $definition, $args );
		$cols = self::columns( $config );
		$html = '';

		foreach ( $result['items'] as $record ) {
			$html .= '<tr class="rf-rec-row' . ( $selected === (int) $record['id'] ? ' is-selected' : '' ) . '" data-id="' . (int) $record['id'] . '" tabindex="0" aria-label="' . esc_attr( '' !== $record['title'] ? $record['title'] : '#' . $record['id'] ) . '">';

			foreach ( $cols as $i => $col ) {
				$html .= '<td data-col="' . (int) $i . '" data-align="' . esc_attr( (string) ( $col['al'] ?? 'start' ) ) . '" data-label="' . esc_attr( (string) ( $col['label'] ?? '' ) ) . '">' . self::cell( $definition, $record, $col ) . '</td>';
			}

			$html .= '</tr>';
		}

		if ( '' === $html ) {
			$html = '<tr class="rf-rec-empty-row"><td colspan="' . count( $cols ) . '">' . esc_html( '' !== (string) ( $config['empty'] ?? '' ) ? $config['empty'] : __( 'No records match.', 'refraction' ) ) . '</td></tr>';
		}

		$first = $result['total'] ? ( $args['page'] - 1 ) * $args['per_page'] + 1 : 0;
		$last = min( $result['total'], $args['page'] * $args['per_page'] );

		return [
			'html' => $html,
			'total' => $result['total'],
			'pages' => max( 1, $result['pages'] ),
			'page' => min( $args['page'], max( 1, $result['pages'] ) ),
			/* translators: 1: page, 2: number of pages. */
			'pager' => sprintf( __( 'Page %1$d of %2$d', 'refraction' ), min( $args['page'], max( 1, $result['pages'] ) ), max( 1, $result['pages'] ) ),
			/* translators: 1: first row, 2: last row, 3: number of records. */
			'summary' => sprintf( __( '%1$d–%2$d of %3$d', 'refraction' ), $first, $last, $result['total'] ),
		];
	}

	/** The newest record, for Edit Mode. */
	public static function latest( array $definition ): ?array {
		$result = self::records()->query( $definition, [ 'per_page' => 1 ] );

		return $result['items'][0] ?? null;
	}

	/** Record Details' body for one record. */
	public static function details( array $definition, array $config, array $record ): string {
		$can_change = self::can_change( (string) ( $config['a'] ?? 'admins' ) );
		$title = self::text( $definition, $record, '' !== (string) ( $config['tf'] ?? '' ) ? $config['tf'] : '_title' );
		$html = '<div class="rf-rd-head"><div class="rf-rd-title">' . esc_html( '' !== $title ? $title : '#' . $record['id'] ) . '</div>';

		if ( 'yes' === ( $config['booked'] ?? 'yes' ) ) {
			/* translators: %s: the date the record was made. */
			$html .= '<div class="rf-rd-booked">' . esc_html( sprintf( '' !== (string) ( $config['bl'] ?? '' ) ? $config['bl'] . ' %s' : __( 'Booked %s', 'refraction' ), self::text( $definition, $record, '_created' ) ) ) . '</div>';
		}

		$html .= '</div><div class="rf-rd-body">';

		foreach ( (array) ( $config['secs'] ?? [] ) as $sec ) {
			$html .= self::section( $definition, $record, is_array( $sec ) ? $sec : [], $can_change );
		}

		$html .= '</div>';

		if ( 'yes' === ( $config['admin'] ?? '' ) && current_user_can( 'manage_options' ) && class_exists( '\Refraction\Modules\FormBuilder\Classes\Admin_Page' ) ) {
			$url = \Refraction\Modules\FormBuilder\Classes\Admin_Page::url( [ 'view' => 'record', 'collection' => $definition['slug'], 'record' => $record['id'] ] );
			$html .= '<a class="rf-rd-admin" href="' . esc_url( $url ) . '">' . self::icon( 'open-in-new', 16 ) . '<span>' . esc_html__( 'Open in the Builder', 'refraction' ) . '</span></a>';
		}

		return $html;
	}

	private static function section( array $definition, array $record, array $sec, bool $can_change ): string {
		$type = (string) ( $sec['t'] ?? 'field' );
		$label = (string) ( $sec['label'] ?? '' );
		$width = 'half' === ( $sec['w'] ?? '' ) ? ' is-half' : '';

		switch ( $type ) {
			case 'heading':
				return '<h4 class="rf-rd-heading">' . esc_html( $label ) . '</h4>';
			case 'divider':
				return '<hr class="rf-rd-divider">';
			case 'journey':
				$places = self::journey( $definition, $record, (string) ( $sec['from'] ?? '' ), (string) ( $sec['stops'] ?? '' ), (string) ( $sec['to'] ?? '' ) );

				return '<div class="rf-rd-item is-journey">' . ( '' !== $label ? '<div class="rf-rd-label">' . esc_html( $label ) . '</div>' : '' ) . self::journey_html( $places ) . '</div>';
			case 'person':
				$name = self::text( $definition, $record, (string) ( $sec['f'] ?? '' ) );
				$phone = self::text( $definition, $record, (string) ( $sec['phone'] ?? '' ) );
				$email = self::text( $definition, $record, (string) ( $sec['email'] ?? '' ) );
				$sub = implode( ' · ', array_filter( [ $phone, $email ] ) );
				$html = '<div class="rf-rd-item is-person">' . ( '' !== $label ? '<div class="rf-rd-label">' . esc_html( $label ) . '</div>' : '' ) . self::person( $name, $sub );
				$buttons = '';

				if ( '' !== $phone ) {
					$buttons .= '<a class="rf-rd-btn" href="' . esc_url( 'tel:' . preg_replace( '/[^0-9+]/', '', $phone ) ) . '">' . self::icon( 'call', 16 ) . '<span>' . esc_html( '' !== (string) ( $sec['call'] ?? '' ) ? $sec['call'] : __( 'Call', 'refraction' ) ) . '</span></a>';
				}

				if ( '' !== $email && is_email( $email ) ) {
					$buttons .= '<a class="rf-rd-btn" href="' . esc_url( 'mailto:' . $email ) . '">' . self::icon( 'mail', 16 ) . '<span>' . esc_html( '' !== (string) ( $sec['mail'] ?? '' ) ? $sec['mail'] : __( 'Email', 'refraction' ) ) . '</span></a>';
				}

				return $html . ( '' !== $buttons ? '<div class="rf-rd-actions">' . $buttons . '</div>' : '' ) . '</div>';
			case 'status':
				$html = '<div class="rf-rd-item is-status">' . ( '' !== $label ? '<div class="rf-rd-label">' . esc_html( $label ) . '</div>' : '' ) . '<div class="rf-rd-statuses" role="group" aria-label="' . esc_attr( '' !== $label ? $label : __( 'Status', 'refraction' ) ) . '">';

				foreach ( $definition['statuses'] as $status ) {
					$current = $status['key'] === $record['status'];
					$color = self::COLORS[ $status['color'] ] ?? self::COLORS['secondary'];
					$html .= '<button type="button" class="rf-rd-status' . ( $current ? ' is-current' : '' ) . '" style="--rf-rec-badge:' . esc_attr( $color ) . '" data-status="' . esc_attr( $status['key'] ) . '" aria-pressed="' . ( $current ? 'true' : 'false' ) . '"' . ( $can_change ? '' : ' disabled' ) . '>' . esc_html( $status['label'] ) . '</button>';
				}

				return $html . '</div></div>';
			default:
				$key = (string) ( $sec['f'] ?? '' );
				$look = (string) ( $sec['look'] ?? 'plain' );

				if ( 'badge' === $look ) {
					$value = self::badge( $definition, $record, $key );
				} else {
					$field = self::field( $definition, $key );
					$text = in_array( $look, [ 'money', 'total' ], true ) && $field && ! in_array( $field['type'], [ 'currency', 'total' ], true ) ? self::money( $definition, null, $record['values'][ $key ] ?? '' ) : self::text( $definition, $record, $key );
					$value = '' !== $text ? '<span class="rf-rd-value">' . nl2br( esc_html( $text ) ) . '</span>' : '<span class="rf-rec-muted">&mdash;</span>';
				}

				$own = '' === $label ? self::field( $definition, $key ) : null;
				$label = $own ? $own['label'] : $label;

				return '<div class="rf-rd-item is-field is-' . esc_attr( $look ) . $width . '"><div class="rf-rd-label">' . esc_html( $label ) . '</div>' . $value . '</div>';
		}
	}
}
