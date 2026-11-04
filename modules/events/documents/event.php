<?php
namespace Refraction\Modules\Events\Documents;

use Refraction\Controls_Manager;
use Refraction\Core\DocumentTypes\PageBase;
use Refraction\Modules\Events\Classes\Event_Data;
use Refraction\Modules\Events\Module;
use Refraction\Modules\PageTemplates\Module as Page_Templates_Module;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * An event page, built in the editor like any page. Its details (dates, venue, tickets, categories) are in the page
 * settings under "Event details" and are saved as the event's post meta (Event_Data), which the calendar, the list
 * and the Event Details widget read. A new event starts with its title, an Event Details box and some text.
 */
class Event extends PageBase {

	/** Page setting key => Event_Data key. */
	const SETTINGS = [
		'rfe_start' => 'start',
		'rfe_end' => 'end',
		'rfe_all_day' => 'all_day',
		'rfe_venue' => 'venue',
		'rfe_address' => 'address',
		'rfe_price' => 'price',
		'rfe_ticket_url' => 'ticket_url',
		'rfe_ticket_label' => 'ticket_label',
		'rfe_payment_url' => 'payment_url',
		'rfe_payment_label' => 'payment_label',
		'rfe_ticket_limit' => 'ticket_limit',
		'rfe_tickets_per_person' => 'tickets_per_person',
		'rfe_total_amount' => 'total_amount',
		'rfe_organizer' => 'organizer',
		'rfe_type' => 'type',
	];

	public static function get_properties() {
		$properties = parent::get_properties();
		$properties['support_kit'] = true;
		$properties['cpt'] = [ Module::CPT ];

		return $properties;
	}

	public static function get_type() {
		return Module::DOCUMENT_TYPE;
	}

	public function get_name() {
		return Module::DOCUMENT_TYPE;
	}

	public static function get_title() {
		return esc_html__( 'Event', 'refraction' );
	}

	public static function get_plural_title() {
		return esc_html__( 'Events', 'refraction' );
	}

	protected function register_controls() {
		parent::register_controls();

		$this->start_controls_section( 'section_rfe_event', [
			'label' => esc_html__( 'Event details', 'refraction' ),
			'tab' => Controls_Manager::TAB_SETTINGS,
		] );

		$this->add_control( 'rfe_start', [
			'label' => esc_html__( 'Starts', 'refraction' ),
			'type' => Controls_Manager::DATE_TIME,
			'picker_options' => [ 'enableTime' => true, 'time_24hr' => true ],
			'label_block' => true,
		] );

		$this->add_control( 'rfe_end', [
			'label' => esc_html__( 'Ends', 'refraction' ),
			'type' => Controls_Manager::DATE_TIME,
			'picker_options' => [ 'enableTime' => true, 'time_24hr' => true ],
			'label_block' => true,
			'description' => esc_html__( 'Empty: the same as the start. Over several days, the event shows on each of them.', 'refraction' ),
		] );

		$this->add_control( 'rfe_all_day', [
			'label' => esc_html__( 'All day', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
		] );

		$terms = get_terms( [ 'taxonomy' => Module::TAXONOMY, 'hide_empty' => false ] );

		$this->add_control( 'rfe_categories', [
			'label' => esc_html__( 'Categories', 'refraction' ),
			'type' => Controls_Manager::SELECT2,
			'multiple' => true,
			'label_block' => true,
			'options' => is_array( $terms ) ? wp_list_pluck( $terms, 'name', 'term_id' ) : [],
			'description' => esc_html__( 'The first one gives the event its color on the calendar. Add categories and their colors under Events > Categories.', 'refraction' ),
			'separator' => 'before',
		] );

		$this->add_control( 'rfe_venue', [
			'label' => esc_html__( 'Venue', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'label_block' => true,
			'separator' => 'before',
		] );

		$this->add_control( 'rfe_address', [
			'label' => esc_html__( 'Address', 'refraction' ),
			'type' => Controls_Manager::TEXTAREA,
			'rows' => 2,
		] );

		$this->add_control( 'rfe_price', [
			'label' => esc_html__( 'Price', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'placeholder' => esc_html__( 'Free, £12, From $20...', 'refraction' ),
			'separator' => 'before',
		] );

		$this->add_control( 'rfe_ticket_url', [
			'label' => esc_html__( 'Tickets or booking link', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'input_type' => 'url',
			'placeholder' => 'https://',
			'label_block' => true,
		] );

		$this->add_control( 'rfe_ticket_label', [
			'label' => esc_html__( 'Button text', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'placeholder' => esc_html__( 'Get tickets', 'refraction' ),
		] );

		$this->add_control( 'rfe_payment_url', [
			'label' => esc_html__( 'Payment link', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'input_type' => 'url',
			'placeholder' => 'https://',
			'label_block' => true,
		] );

		$this->add_control( 'rfe_payment_label', [
			'label' => esc_html__( 'Payment button text', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'placeholder' => esc_html__( 'Pay now', 'refraction' ),
		] );

		$this->add_control( 'rfe_ticket_limit', [
			'label' => esc_html__( 'Ticket limit', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'min' => 1,
		] );

		$this->add_control( 'rfe_tickets_per_person', [
			'label' => esc_html__( 'Tickets per person', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'min' => 1,
		] );

		$this->add_control( 'rfe_total_amount', [
			'label' => esc_html__( 'Total amount', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'placeholder' => esc_html__( '£1,250.00', 'refraction' ),
		] );

		$this->add_control( 'rfe_organizer', [
			'label' => esc_html__( 'Organizer', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'label_block' => true,
		] );

		$this->add_control( 'rfe_type', [
			'label' => esc_html__( 'Event type', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'options' => [ '' => esc_html__( 'None', 'refraction' ) ] + \Refraction\Modules\Events\Classes\Event_Types::types(),
			'description' => esc_html__( 'Set by the event form that made the event. Calendars and lists can show only some types.', 'refraction' ),
			'separator' => 'before',
		] );

		$this->end_controls_section();
	}

	public function save( $data ) {
		// A new event uses the full-width template: the theme's header and footer around the page, without the theme's
		// own title and post details (the event page has its own title).
		if ( ! get_post_meta( $this->get_main_id(), '_wp_page_template', true ) && empty( $data['settings']['template'] ) ) {
			$data['settings']['template'] = Page_Templates_Module::TEMPLATE_HEADER_FOOTER;
		}

		$saved = parent::save( $data );

		if ( $saved && isset( $data['settings'] ) && is_array( $data['settings'] ) ) {
			self::sync_from_settings( (int) $this->get_main_id(), $data['settings'] );
		}

		return $saved;
	}

	/** Copies the page settings into the event's details and categories. */
	public static function sync_from_settings( int $post_id, array $settings ): void {
		$raw = [];

		foreach ( self::SETTINGS as $setting => $key ) {
			$raw[ $key ] = $settings[ $setting ] ?? '';
		}

		Event_Data::save( $post_id, $raw );

		if ( array_key_exists( 'rfe_categories', $settings ) ) {
			wp_set_object_terms( $post_id, array_map( 'intval', (array) $settings['rfe_categories'] ), Module::TAXONOMY );
		}
	}

	/** The other way: details saved in the admin box are written into the page settings, so the editor shows them. */
	public static function sync_to_settings( int $post_id ): void {
		$settings = get_post_meta( $post_id, self::PAGE_META_KEY, true );
		$settings = is_array( $settings ) ? $settings : [];
		$data = Event_Data::get( $post_id );

		foreach ( self::SETTINGS as $setting => $key ) {
			$settings[ $setting ] = $data[ $key ];
		}

		$terms = wp_get_object_terms( $post_id, Module::TAXONOMY, [ 'fields' => 'ids' ] );
		$settings['rfe_categories'] = is_array( $terms ) ? array_map( 'strval', $terms ) : [];

		update_post_meta( $post_id, self::PAGE_META_KEY, $settings );
	}

	/** A new, empty event opens with its title, an Event Details box and a text to replace. */
	public function convert_to_refraction() {
		if ( '' !== trim( (string) $this->post->post_content ) ) {
			return parent::convert_to_refraction();
		}

		$this->save( [] );

		return Module::starter_elements();
	}
}
