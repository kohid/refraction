<?php
namespace Refraction\Modules\Events\Tags;

use Refraction\Controls_Manager;
use Refraction\Core\DynamicTags\Tag;
use Refraction\Modules\DynamicTags\Classes\Context;
use Refraction\Modules\DynamicTags\Module as Tags;
use Refraction\Modules\Events\Classes\Event_Data;
use Refraction\Modules\Events\Classes\Event_Types;
use Refraction\Modules\Events\Module;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** Event Detail: one detail of the current event as text (its date, time, venue, price, tickets, organizer...). */
class Event_Detail extends Tag {

	/** Dates read as "November 5, 2026" unless a format is set. */
	const DATE_FORMAT = Event_Data::DATE_FORMAT;

	public function get_name() {
		return 'refraction-event-detail';
	}

	public function get_title() {
		return esc_html__( 'Event Detail', 'refraction' );
	}

	public function get_group() {
		return 'event';
	}

	public function get_categories() {
		return [ Tags::TEXT_CATEGORY ];
	}

	public static function details(): array {
		return [
			'when' => esc_html__( 'Date and time', 'refraction' ),
			'date' => esc_html__( 'Date', 'refraction' ),
			'time' => esc_html__( 'Time', 'refraction' ),
			'start' => esc_html__( 'Start date and time', 'refraction' ),
			'start_date' => esc_html__( 'Start date', 'refraction' ),
			'start_time' => esc_html__( 'Start time', 'refraction' ),
			'end' => esc_html__( 'End date and time', 'refraction' ),
			'end_date' => esc_html__( 'End date', 'refraction' ),
			'end_time' => esc_html__( 'End time', 'refraction' ),
			'venue' => esc_html__( 'Venue', 'refraction' ),
			'address' => esc_html__( 'Address', 'refraction' ),
			'price' => esc_html__( 'Price', 'refraction' ),
			'ticket_limit' => esc_html__( 'Ticket limit', 'refraction' ),
			'tickets_per_person' => esc_html__( 'Tickets per person', 'refraction' ),
			'total_amount' => esc_html__( 'Total amount', 'refraction' ),
			'organizer' => esc_html__( 'Organizer', 'refraction' ),
			'categories' => esc_html__( 'Categories', 'refraction' ),
			'type' => esc_html__( 'Event type', 'refraction' ),
		];
	}

	public function get_panel_template_setting_key() {
		return 'detail';
	}

	protected function register_controls() {
		$this->add_control( 'detail', [
			'label' => esc_html__( 'Detail', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'when',
			'options' => self::details(),
		] );

		$this->add_control( 'date_format', [
			'label' => esc_html__( 'Date format', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'placeholder' => 'F j, Y',
			'description' => esc_html__( 'PHP date letters, as in Settings > General: F j, Y is "November 5, 2026", g:i A is "7:00 PM". Empty: November 5, 2026 for dates and the site\'s time format for times.', 'refraction' ),
			'condition' => [ 'detail' => [ 'start', 'start_date', 'start_time', 'end', 'end_date', 'end_time' ] ],
		] );
	}

	/** The text of a detail of an event; '' when it has none. */
	public static function text( int $post_id, string $detail, string $format = '' ): string {
		$card = Event_Data::card( $post_id );
		$data = $card['data'];

		switch ( $detail ) {
			case 'when':
				return trim( $card['date'] . ( '' !== $card['time'] ? ' · ' . $card['time'] : '' ), ' ·' );
			case 'date':
				return $card['date'];
			case 'time':
				return $card['time'];
			case 'start':
			case 'end':
			case 'start_date':
			case 'end_date':
			case 'start_time':
			case 'end_time':
				$ts = 0 === strpos( $detail, 'start' ) ? $card['start'] : $card['end'];
				$part = substr( $detail, strpos( $detail, '_' ) ?: strlen( $detail ) );

				if ( '' === $format ) {
					$format = [ '_date' => self::DATE_FORMAT, '_time' => get_option( 'time_format', 'H:i' ) ][ $part ] ?? self::DATE_FORMAT . ' ' . get_option( 'time_format', 'H:i' );
				}

				return $ts ? date_i18n( $format, $ts ) : '';
			case 'ticket_limit':
			case 'tickets_per_person':
				return '' !== $data[ $detail ] ? number_format_i18n( (int) $data[ $detail ] ) : '';
			case 'categories':
				$terms = get_the_terms( $post_id, Module::TAXONOMY );

				return $terms && ! is_wp_error( $terms ) ? implode( ', ', wp_list_pluck( $terms, 'name' ) ) : '';
			case 'type':
				return Event_Types::types()[ $data['type'] ] ?? '';
			default:
				return isset( $data[ $detail ] ) && ! in_array( $detail, [ 'gallery', 'all_day' ], true ) ? (string) $data[ $detail ] : '';
		}
	}

	public function render() {
		$post = Context::get_post();

		if ( ! Context::can_read( $post ) || Module::CPT !== $post->post_type ) {
			return;
		}

		echo nl2br( esc_html( self::text( $post->ID, (string) $this->get_settings( 'detail' ), (string) $this->get_settings( 'date_format' ) ) ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped, then line breaks.
	}
}
