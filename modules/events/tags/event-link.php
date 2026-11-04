<?php
namespace Refraction\Modules\Events\Tags;

use Refraction\Controls_Manager;
use Refraction\Core\DynamicTags\Data_Tag;
use Refraction\Modules\DynamicTags\Classes\Context;
use Refraction\Modules\DynamicTags\Module as Tags;
use Refraction\Modules\Events\Classes\Event_Data;
use Refraction\Modules\Events\Module;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** Event Link: a link of the current event, for any button or link: tickets, payment, map, its page, add to a calendar. */
class Event_Link extends Data_Tag {

	public function get_name() {
		return 'refraction-event-link';
	}

	public function get_title() {
		return esc_html__( 'Event Link', 'refraction' );
	}

	public function get_group() {
		return 'event';
	}

	public function get_categories() {
		return [ Tags::URL_CATEGORY ];
	}

	public static function links(): array {
		return [
			'ticket' => esc_html__( 'Tickets', 'refraction' ),
			'payment' => esc_html__( 'Payment', 'refraction' ),
			'map' => esc_html__( 'Map of the venue', 'refraction' ),
			'page' => esc_html__( 'Event page', 'refraction' ),
			'google' => esc_html__( 'Add to Google Calendar', 'refraction' ),
			'o365' => esc_html__( 'Add to Outlook 365', 'refraction' ),
			'olive' => esc_html__( 'Add to Outlook.com', 'refraction' ),
		];
	}

	public function get_panel_template_setting_key() {
		return 'link';
	}

	protected function register_controls() {
		$this->add_control( 'link', [
			'label' => esc_html__( 'Link', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'ticket',
			'options' => self::links(),
		] );
	}

	/** The address of a link of an event; '' when it has none. */
	public static function url( int $post_id, string $link ): string {
		$card = Event_Data::card( $post_id );

		switch ( $link ) {
			case 'ticket':
				return $card['data']['ticket_url'];
			case 'payment':
				return $card['data']['payment_url'];
			case 'page':
				return $card['url'];
			case 'map':
				$query = trim( $card['venue'] . ', ' . str_replace( "\n", ', ', $card['address'] ), ', ' );

				return '' !== $query ? 'https://www.google.com/maps/search/?api=1&query=' . rawurlencode( $query ) : '';
			default:
				return (string) ( $card['links'][ $link ] ?? '' );
		}
	}

	public function get_value( array $options = [] ) {
		$post = Context::get_post();

		if ( ! Context::can_read( $post ) || Module::CPT !== $post->post_type ) {
			return '';
		}

		return esc_url_raw( self::url( $post->ID, (string) $this->get_settings( 'link' ) ) );
	}
}
