<?php
namespace Refraction\Modules\Events\Classes;

use Refraction\Modules\Events\Module;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * An event's details (dates, venue, tickets), stored as post meta on the event, and the queries and links built from
 * them. Dates are the site's local wall-clock time as 'Y-m-d H:i' strings, so they sort and compare as text and are
 * shown as typed (date_i18n formats a timestamp without moving it to another time zone).
 */
class Event_Data {

	/** Detail key => default. Stored as post meta `_rfe_<key>`. */
	const FIELDS = [
		'start' => '',
		'end' => '',
		'all_day' => '',
		'venue' => '',
		'address' => '',
		'price' => '',
		'ticket_url' => '',
		'ticket_label' => '',
		'payment_url' => '',
		'payment_label' => '',
		'ticket_limit' => '',
		'tickets_per_person' => '',
		'total_amount' => '',
		'organizer' => '',
		'type' => '',
	];

	const META_PREFIX = '_rfe_';

	/** Category term meta: its color on the calendar. */
	const TERM_COLOR = '_rfe_color';

	/** Colors given to categories without one of their own (the same name always gets the same color). */
	const PALETTE = [ '#2b6344', '#1e6b7a', '#c47b1a', '#6b2ba8', '#b84a35', '#2b6387', '#9c2c4b', '#3a7d5a', '#7a5b1e', '#4c5bd4' ];

	/** A date and time as typed in a form ('Y-m-d H:i', 'Y-m-d\TH:i', 'Y-m-d') => 'Y-m-d H:i', or '' when it is not one. */
	public static function clean_datetime( $value, bool $end_of_day = false ): string {
		$value = trim( str_replace( 'T', ' ', (string) $value ) );

		if ( preg_match( '/^(\d{4})-(\d{2})-(\d{2})(?: (\d{1,2}):(\d{2})(?::\d{2})?)?$/', $value, $m ) && checkdate( (int) $m[2], (int) $m[3], (int) $m[1] ) ) {
			$hour = isset( $m[4] ) ? min( 23, (int) $m[4] ) : ( $end_of_day ? 23 : 0 );
			$minute = isset( $m[5] ) ? min( 59, (int) $m[5] ) : ( $end_of_day ? 59 : 0 );

			return sprintf( '%s-%s-%s %02d:%02d', $m[1], $m[2], $m[3], $hour, $minute );
		}

		return '';
	}

	/** Cleans raw details (from the editor's page settings or the admin box) into what is stored. */
	public static function clean( array $raw ): array {
		$out = [];

		foreach ( self::FIELDS as $key => $default ) {
			$value = $raw[ $key ] ?? $default;

			switch ( $key ) {
				case 'start':
					$out[ $key ] = self::clean_datetime( $value );
					break;
				case 'end':
					$out[ $key ] = self::clean_datetime( $value, true );
					break;
				case 'all_day':
					$out[ $key ] = in_array( $value, [ 'yes', '1', 1, true ], true ) ? 'yes' : '';
					break;
				case 'ticket_url':
				case 'payment_url':
					$out[ $key ] = esc_url_raw( trim( (string) $value ), [ 'http', 'https' ] );
					break;
				case 'ticket_limit':
				case 'tickets_per_person':
					$out[ $key ] = is_numeric( $value ) && (int) $value > 0 ? (string) (int) $value : '';
					break;
				case 'type':
					$out[ $key ] = sanitize_key( (string) $value );
					break;
				case 'address':
					$out[ $key ] = sanitize_textarea_field( (string) $value );
					break;
				default:
					$out[ $key ] = sanitize_text_field( (string) $value );
			}
		}

		// An end before the start (or none) is the start: one moment, or one whole day.
		if ( '' !== $out['start'] && ( '' === $out['end'] || $out['end'] < $out['start'] ) ) {
			$out['end'] = 'yes' === $out['all_day'] ? substr( $out['start'], 0, 10 ) . ' 23:59' : $out['start'];
		}

		if ( 'yes' === $out['all_day'] && '' !== $out['start'] ) {
			$out['start'] = substr( $out['start'], 0, 10 ) . ' 00:00';
			$out['end'] = substr( $out['end'], 0, 10 ) . ' 23:59';
		}

		return $out;
	}

	public static function save( int $post_id, array $raw ): array {
		$clean = self::clean( $raw );

		foreach ( $clean as $key => $value ) {
			update_post_meta( $post_id, self::META_PREFIX . $key, $value );
		}

		return $clean;
	}

	public static function get( int $post_id ): array {
		$out = [];

		foreach ( self::FIELDS as $key => $default ) {
			$value = get_post_meta( $post_id, self::META_PREFIX . $key, true );
			$out[ $key ] = '' === $value || false === $value ? $default : (string) $value;
		}

		return $out;
	}

	/** Timestamps of the start and end (wall clock, see the class note); null when the event has no date yet. */
	public static function times( array $data ): ?array {
		if ( '' === $data['start'] ) {
			return null;
		}

		$start = strtotime( $data['start'] . ' UTC' );
		$end = strtotime( ( '' !== $data['end'] ? $data['end'] : $data['start'] ) . ' UTC' );

		return [ $start, max( $start, $end ) ];
	}

	public static function is_multiday( array $data ): bool {
		return '' !== $data['start'] && substr( $data['start'], 0, 10 ) !== substr( $data['end'] ?: $data['start'], 0, 10 );
	}

	/** "10:00 – 12:30", "All day", or "" for an event without a date. */
	public static function time_range( array $data ): string {
		$times = self::times( $data );

		if ( ! $times ) {
			return '';
		}

		if ( 'yes' === $data['all_day'] || self::is_multiday( $data ) ) {
			return __( 'All day', 'refraction' );
		}

		$format = get_option( 'time_format', 'H:i' );

		return date_i18n( $format, $times[0] ) . ( $times[1] > $times[0] ? ' – ' . date_i18n( $format, $times[1] ) : '' );
	}

	/** "Friday, 6 November 2026", or "6 – 8 November 2026" style ranges over several days. */
	public static function date_range( array $data ): string {
		$times = self::times( $data );

		if ( ! $times ) {
			return '';
		}

		$format = get_option( 'date_format', 'F j, Y' );

		if ( ! self::is_multiday( $data ) ) {
			return date_i18n( 'l, ' . $format, $times[0] );
		}

		return date_i18n( $format, $times[0] ) . ' – ' . date_i18n( $format, $times[1] );
	}

	/** The color of a category: its own, else one picked from the palette by its name. */
	public static function category_color( ?\WP_Term $term ): string {
		if ( ! $term ) {
			return self::PALETTE[0];
		}

		$own = sanitize_hex_color( (string) get_term_meta( $term->term_id, self::TERM_COLOR, true ) );

		return $own ? $own : self::PALETTE[ abs( crc32( $term->name ) ) % count( self::PALETTE ) ];
	}

	public static function first_category( int $post_id ): ?\WP_Term {
		$terms = get_the_terms( $post_id, Module::TAXONOMY );

		return $terms && ! is_wp_error( $terms ) ? $terms[0] : null;
	}

	/**
	 * Published events that overlap [from, to] (dates 'Y-m-d'), oldest first.
	 *
	 * @param string $from
	 * @param string $to
	 * @param string $search Words in the title.
	 * @param int[]  $categories Category ids (any of them); empty for all.
	 * @param int    $limit -1 for all.
	 * @return int[] Event ids.
	 */
	public static function query( string $from, string $to, string $search = '', array $categories = [], int $limit = -1, array $types = [] ): array {
		$args = [
			'post_type' => Module::CPT,
			'post_status' => 'publish',
			'posts_per_page' => $limit,
			'fields' => 'ids',
			'no_found_rows' => true,
			'meta_key' => self::META_PREFIX . 'start',
			'orderby' => 'meta_value',
			'order' => 'ASC',
			'meta_query' => [
				'relation' => 'AND',
				[ 'key' => self::META_PREFIX . 'start', 'value' => $to . ' 23:59', 'compare' => '<=', 'type' => 'CHAR' ],
				[ 'key' => self::META_PREFIX . 'end', 'value' => $from . ' 00:00', 'compare' => '>=', 'type' => 'CHAR' ],
				[ 'key' => self::META_PREFIX . 'start', 'value' => '', 'compare' => '!=' ],
			],
		];

		if ( '' !== $search ) {
			$args['s'] = $search;
		}

		$types = array_values( array_filter( array_map( 'sanitize_key', $types ) ) );

		// Event types: the event forms they were made with (Event_Types); "manual" is events made in the editor or admin.
		if ( $types ) {
			$type_query = [ 'relation' => 'OR', [ 'key' => self::META_PREFIX . 'type', 'value' => $types, 'compare' => 'IN' ] ];

			if ( in_array( 'manual', $types, true ) ) {
				$type_query[] = [ 'key' => self::META_PREFIX . 'type', 'value' => '' ];
				$type_query[] = [ 'key' => self::META_PREFIX . 'type', 'compare' => 'NOT EXISTS' ];
			}

			$args['meta_query'][] = $type_query;
		}

		$categories = array_filter( array_map( 'absint', $categories ) );

		if ( $categories ) {
			$args['tax_query'] = [ [ 'taxonomy' => Module::TAXONOMY, 'field' => 'term_id', 'terms' => $categories ] ];
		}

		return array_map( 'intval', get_posts( $args ) );
	}

	/** Everything a calendar, list or details box shows about one event. */
	public static function card( int $post_id ): array {
		$data = self::get( $post_id );
		$times = self::times( $data );
		$term = self::first_category( $post_id );
		$excerpt = trim( (string) get_post_field( 'post_excerpt', $post_id ) );

		if ( '' === $excerpt ) {
			$excerpt = (string) get_post_field( 'post_content', $post_id );
		}

		$title = html_entity_decode( get_the_title( $post_id ), ENT_QUOTES, 'UTF-8' );
		$excerpt = wp_trim_words( wp_strip_all_tags( strip_shortcodes( $excerpt ) ), 26 );

		return [
			'id' => $post_id,
			'title' => $title,
			'url' => (string) get_permalink( $post_id ),
			'thumb' => (string) get_the_post_thumbnail_url( $post_id, 'medium_large' ),
			'excerpt' => $excerpt,
			'venue' => $data['venue'],
			'address' => $data['address'],
			'data' => $data,
			'start' => $times ? $times[0] : 0,
			'end' => $times ? $times[1] : 0,
			'time' => self::time_range( $data ),
			'date' => self::date_range( $data ),
			'multiday' => self::is_multiday( $data ),
			'all_day' => 'yes' === $data['all_day'],
			'category' => $term ? $term->name : '',
			'color' => self::category_color( $term ),
			'links' => $times ? self::calendar_links( $post_id, $title, $times[0], $times[1], 'yes' === $data['all_day'] || self::is_multiday( $data ), trim( $data['venue'] . ( '' !== $data['address'] ? ', ' . $data['address'] : '' ), ', ' ), $excerpt ) : [],
		];
	}

	/**
	 * "Add to calendar" links: Google Calendar, Outlook (Office 365 and Live) and an iCalendar (.ics) file as a data
	 * address. Times are the site's wall clock, tagged with its time zone where the service takes one. All-day events
	 * are dates only, with the day after as the (exclusive) end.
	 */
	public static function calendar_links( int $post_id, string $title, int $start, int $end, bool $all_day, string $location, string $details ): array {
		if ( ! $all_day && $end <= $start ) {
			$end = $start + HOUR_IN_SECONDS;
		}

		$tz = wp_timezone_string();
		$after = $end + DAY_IN_SECONDS;
		$google = [
			'action' => 'TEMPLATE',
			'text' => $title,
			'dates' => $all_day ? gmdate( 'Ymd', $start ) . '/' . gmdate( 'Ymd', $after ) : gmdate( 'Ymd\THis', $start ) . '/' . gmdate( 'Ymd\THis', $end ),
			'details' => $details,
			'location' => $location,
		];

		if ( ! $all_day && preg_match( '~^[A-Za-z_]+/[A-Za-z_/+-]+$~', $tz ) ) {
			$google['ctz'] = $tz;
		}

		$outlook = [
			'path' => '/calendar/action/compose',
			'rru' => 'addevent',
			'subject' => $title,
			'startdt' => $all_day ? gmdate( 'Y-m-d', $start ) : gmdate( 'Y-m-d\TH:i:s', $start ),
			'enddt' => $all_day ? gmdate( 'Y-m-d', $after ) : gmdate( 'Y-m-d\TH:i:s', $end ),
			'body' => $details,
			'location' => $location,
		];

		if ( $all_day ) {
			$outlook['allday'] = 'true';
		}

		$esc = static function ( string $text ): string {
			return str_replace( [ "\r\n", "\n", "\r" ], '\\n', addcslashes( $text, '\\,;' ) );
		};
		$when = $all_day
			? 'DTSTART;VALUE=DATE:' . gmdate( 'Ymd', $start ) . "\r\nDTEND;VALUE=DATE:" . gmdate( 'Ymd', $after )
			: 'DTSTART:' . gmdate( 'Ymd\THis', $start ) . "\r\nDTEND:" . gmdate( 'Ymd\THis', $end );
		$host = (string) wp_parse_url( home_url(), PHP_URL_HOST );
		$ics = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Refraction//Events//EN\r\nBEGIN:VEVENT\r\n"
			. 'UID:refraction-event-' . $post_id . '@' . $host . "\r\nDTSTAMP:" . gmdate( 'Ymd\THis\Z' ) . "\r\n" . $when . "\r\n"
			. 'SUMMARY:' . $esc( $title ) . "\r\nLOCATION:" . $esc( $location ) . "\r\nDESCRIPTION:" . $esc( $details )
			. "\r\nURL:" . $esc( (string) get_permalink( $post_id ) ) . "\r\nEND:VEVENT\r\nEND:VCALENDAR";

		return [
			'google' => 'https://calendar.google.com/calendar/render?' . http_build_query( $google ),
			'ics' => 'data:text/calendar;charset=utf-8,' . rawurlencode( $ics ),
			'o365' => 'https://outlook.office.com/calendar/0/deeplink/compose?' . http_build_query( $outlook ),
			'olive' => 'https://outlook.live.com/calendar/0/deeplink/compose?' . http_build_query( $outlook ),
		];
	}

	/** The provider names of calendar_links(), in the order the menus show them. */
	public static function calendar_labels(): array {
		return [
			'google' => __( 'Google Calendar', 'refraction' ),
			'ics' => __( 'Apple / iCalendar (.ics)', 'refraction' ),
			'o365' => __( 'Outlook 365', 'refraction' ),
			'olive' => __( 'Outlook.com', 'refraction' ),
		];
	}
}
