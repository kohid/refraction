<?php
namespace Refraction\Modules\Events;

use Refraction\Core\Base\Module as BaseModule;
use Refraction\Modules\EditorOne\Classes\Menu_Data_Provider;
use Refraction\Modules\Events\AdminMenuItems\Editor_One_Event_Types_Menu;
use Refraction\Modules\Events\AdminMenuItems\Editor_One_Events_Menu;
use Refraction\Modules\Events\Classes\Bookings;
use Refraction\Modules\Events\Classes\Calendar;
use Refraction\Modules\Events\Classes\Event_Data;
use Refraction\Modules\Events\Classes\Event_Types;
use Refraction\Modules\Events\Documents\Event;
use Refraction\Modules\Events\Widgets\Event_Details;
use Refraction\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Events: an Event post type whose pages are built in the editor (each event's dates, venue and tickets are in its page
 * settings, see Documents\Event), Event Categories with colors, and three widgets: Event Calendar (month, list and day
 * views with search and "add to calendar"), Events List and Event Details. See docs/refraction/events.md.
 */
class Module extends BaseModule {

	const CPT = 'refraction_event';
	const TAXONOMY = 'refraction_event_cat';
	const TYPE_TAXONOMY = 'refraction_event_type';
	const DOCUMENT_TYPE = 'refraction-event';
	const WIDGET_CATEGORY = 'refraction-events';
	const ADMIN_SLUG = 'edit.php?post_type=' . self::CPT;
	const NONCE = 'refraction_event_details';
	const TYPES_SLUG = 'refraction-event-types';

	public function get_name() {
		return 'events';
	}

	protected function get_widgets() {
		return [
			'Event_Calendar', 'Events_List', 'Event_Details', 'Event_Button', 'Event_Gallery',
			// The event form's fields (Classes\Event_Types).
			'Event_Field_Title', 'Event_Field_Start', 'Event_Field_End', 'Event_Field_All_Day', 'Event_Field_Category', 'Event_Field_Venue',
			'Event_Field_Address', 'Event_Field_Price', 'Event_Field_Ticket_Limit', 'Event_Field_Tickets_Per_Person', 'Event_Field_Total_Amount',
			'Event_Field_Organizer', 'Event_Field_Image', 'Event_Field_Gallery', 'Event_Field_Description', 'Event_Field_Button',
		];
	}

	public function __construct() {
		parent::__construct();

		add_action( 'init', [ $this, 'register_types' ], 5 );
		Event_Types::register();
		Bookings::register();
		add_action( 'init', [ $this, 'maybe_flush_rewrites' ], 99 );

		add_action( 'refraction/documents/register', static function ( $documents_manager ) {
			$documents_manager->register_document_type( self::DOCUMENT_TYPE, Event::get_class_full_name() );
		} );
		add_action( 'refraction/elements/categories_registered', static function ( $elements_manager ) {
			$elements_manager->add_category( self::WIDGET_CATEGORY, [
				'title' => esc_html__( 'Events', 'refraction' ),
				'icon' => 'rficon-calendar',
			] );
		} );
		add_action( 'refraction/editor-one/menu/register', static function ( Menu_Data_Provider $menu_data_provider ) {
			$menu_data_provider->register_menu( new Editor_One_Events_Menu() );
			$menu_data_provider->register_menu( new Editor_One_Event_Types_Menu() );
		} );
		add_filter( 'refraction/editor-one/menu/refraction_post_types', static function ( array $post_types ): array {
			$post_types[ self::CPT ] = [ 'menu_slug' => 'refraction-editor-templates', 'child_slug' => self::ADMIN_SLUG ];

			return $post_types;
		} );

		add_action( 'refraction/frontend/after_register_styles', [ $this, 'register_styles' ] );
		add_action( 'refraction/dynamic_tags/register', [ $this, 'register_tags' ] );
		add_action( 'rest_api_init', [ $this, 'register_routes' ] );
		add_action( 'wp_head', [ $this, 'print_schema' ] );
		add_filter( 'the_content', [ $this, 'details_for_classic_events' ], 9 );

		if ( is_admin() ) {
			add_action( 'add_meta_boxes_' . self::CPT, [ $this, 'add_meta_box' ] );
			add_action( 'save_post_' . self::CPT, [ $this, 'save_meta_box' ] );
			add_filter( 'views_edit-' . self::CPT, [ $this, 'list_links' ] );
			add_filter( 'manage_' . self::CPT . '_posts_columns', [ $this, 'columns' ] );
			add_action( 'manage_' . self::CPT . '_posts_custom_column', [ $this, 'column' ], 10, 2 );
			add_filter( 'manage_edit-' . self::CPT . '_sortable_columns', [ $this, 'sortable_columns' ] );
			add_action( 'pre_get_posts', [ $this, 'admin_order' ] );
			add_action( self::TAXONOMY . '_add_form_fields', [ $this, 'term_color_add' ] );
			add_action( self::TAXONOMY . '_edit_form_fields', [ $this, 'term_color_edit' ] );
			add_action( 'created_' . self::TAXONOMY, [ $this, 'term_color_save' ] );
			add_action( 'edited_' . self::TAXONOMY, [ $this, 'term_color_save' ] );
		}
	}

	public function register_types(): void {
		register_post_type( self::CPT, [
			'labels' => [
				'name' => esc_html__( 'Events', 'refraction' ),
				'singular_name' => esc_html__( 'Event', 'refraction' ),
				'add_new' => esc_html__( 'Add New Event', 'refraction' ),
				'add_new_item' => esc_html__( 'Add New Event', 'refraction' ),
				'edit_item' => esc_html__( 'Edit Event', 'refraction' ),
				'new_item' => esc_html__( 'New Event', 'refraction' ),
				'all_items' => esc_html__( 'All Events', 'refraction' ),
				'view_item' => esc_html__( 'View Event', 'refraction' ),
				'search_items' => esc_html__( 'Search Events', 'refraction' ),
				'not_found' => esc_html__( 'No events found', 'refraction' ),
				'not_found_in_trash' => esc_html__( 'No events found in trash', 'refraction' ),
				'menu_name' => esc_html__( 'Events', 'refraction' ),
			],
			'public' => true,
			'has_archive' => true,
			'rewrite' => [ 'slug' => 'events', 'with_front' => false ],
			'show_in_menu' => false,
			'show_in_rest' => true,
			'menu_icon' => 'dashicons-calendar-alt',
			'capability_type' => 'post',
			'supports' => [ 'title', 'editor', 'excerpt', 'thumbnail', 'author', 'revisions', 'custom-fields', 'refraction' ],
		] );

		register_taxonomy( self::TAXONOMY, self::CPT, [
			'labels' => [
				'name' => esc_html__( 'Event Categories', 'refraction' ),
				'singular_name' => esc_html__( 'Event Category', 'refraction' ),
				'menu_name' => esc_html__( 'Categories', 'refraction' ),
				'add_new_item' => esc_html__( 'Add New Event Category', 'refraction' ),
				'edit_item' => esc_html__( 'Edit Event Category', 'refraction' ),
			],
			'public' => true,
			'hierarchical' => true,
			'show_admin_column' => true,
			'show_in_rest' => true,
			'rewrite' => [ 'slug' => 'event-category', 'with_front' => false ],
		] );

		// Each event's type (the event form that made it), as a term: the type's archive (/workshop/) and the Theme
		// Builder conditions ("In Event Types: Workshop") use it. Kept in step by Event_Types; not edited by hand.
		register_taxonomy( self::TYPE_TAXONOMY, self::CPT, [
			'labels' => [
				'name' => esc_html__( 'Event Types', 'refraction' ),
				'singular_name' => esc_html__( 'Event Type', 'refraction' ),
			],
			'public' => true,
			'hierarchical' => false,
			'show_ui' => false,
			'show_in_rest' => true,
			'rewrite' => [ 'slug' => 'event-type', 'with_front' => false ],
		] );

		foreach ( array_keys( Event_Data::FIELDS ) as $key ) {
			register_post_meta( self::CPT, Event_Data::META_PREFIX . $key, [
				'type' => 'string',
				'single' => true,
				'show_in_rest' => true,
				'auth_callback' => static fn( $allowed, $meta_key, $post_id ) => current_user_can( 'edit_post', $post_id ),
			] );
		}
	}

	/** The new /events/ addresses work without visiting Settings > Permalinks. */
	public function maybe_flush_rewrites(): void {
		if ( get_option( 'refraction_events_rewrites' ) !== REFRACTION_VERSION ) {
			flush_rewrite_rules( false );
			update_option( 'refraction_events_rewrites', REFRACTION_VERSION, true );
		}
	}

	/** The Event group of dynamic tags: an event's details, links, form answers and gallery, for designing its pages. */
	public function register_tags( $dynamic_tags ): void {
		$dynamic_tags->register_group( 'event', [ 'title' => esc_html__( 'Event', 'refraction' ) ] );

		foreach ( [ 'Event_Detail', 'Event_Link', 'Event_Form_Field', 'Event_Gallery_Tag', 'Event_Start_Date' ] as $tag ) {
			$class = __NAMESPACE__ . '\\Tags\\' . $tag;
			$dynamic_tags->register( new $class() );
		}
	}

	/** At build time `assets/scss/frontend.scss` becomes `assets/css/widget-events.min.css`. */
	public function register_styles(): void {
		wp_register_style( 'widget-events', $this->get_css_assets_url( 'widget-events', null, true, true ), [ 'refraction-frontend' ], REFRACTION_VERSION );
	}

	/** The editor's "new event" address: makes the event and opens it in the editor. */
	public static function new_event_url(): string {
		return Plugin::$instance->documents->get_create_new_post_url( self::CPT, self::DOCUMENT_TYPE );
	}

	/**
	 * What a new event starts with in the editor: its title (from the event), the Event Details box and a text. An event
	 * made by an event form also shows its picture and its description (the excerpt).
	 *
	 * @param array $options image, excerpt (bool).
	 */
	public static function starter_elements( array $options = [] ): array {
		$id = static fn() => \Refraction\Utils::generate_random_string();
		$tag = static fn( string $name ) => '[refraction-tag id="' . substr( md5( (string) wp_rand() ), 0, 7 ) . '" name="' . $name . '" settings="%7B%7D"]';
		$widgets = [
			[ 'id' => $id(), 'elType' => 'widget', 'widgetType' => 'heading', 'settings' => [ 'title' => get_the_title() ?: __( 'Event title', 'refraction' ), 'header_size' => 'h1', '__dynamic__' => [ 'title' => $tag( 'post-title' ) ] ], 'elements' => [] ],
		];

		if ( ! empty( $options['image'] ) ) {
			$widgets[] = [ 'id' => $id(), 'elType' => 'widget', 'widgetType' => 'image', 'settings' => [ 'image' => [ 'url' => '', 'id' => '' ], 'image_size' => 'large', '__dynamic__' => [ 'image' => $tag( 'post-featured-image' ) ] ], 'elements' => [] ];
		}

		$widgets[] = [ 'id' => $id(), 'elType' => 'widget', 'widgetType' => 'refraction-event-details', 'settings' => [], 'elements' => [] ];

		if ( ! empty( $options['gallery'] ) ) {
			$widgets[] = [ 'id' => $id(), 'elType' => 'widget', 'widgetType' => 'refraction-event-gallery', 'settings' => [], 'elements' => [] ];
		}
		$widgets[] = ! empty( $options['excerpt'] )
			? [ 'id' => $id(), 'elType' => 'widget', 'widgetType' => 'text-editor', 'settings' => [ 'editor' => '', '__dynamic__' => [ 'editor' => $tag( 'post-excerpt' ) ] ], 'elements' => [] ]
			: [ 'id' => $id(), 'elType' => 'widget', 'widgetType' => 'text-editor', 'settings' => [ 'editor' => '<p>' . esc_html__( 'Tell people what the event is about. Set its date, venue and tickets in the page settings (the cog), under Event details.', 'refraction' ) . '</p>' ], 'elements' => [] ];

		return [ [
			'id' => $id(),
			'elType' => 'container',
			'settings' => [ 'flex_gap' => [ 'unit' => 'px', 'size' => 24, 'column' => '24', 'row' => '24', 'isLinked' => true ] ],
			'elements' => $widgets,
		] ];
	}

	// ---------------------------------------------------------------- calendar route

	public function register_routes(): void {
		register_rest_route( 'refraction/v1', '/events/calendar', [
			'methods' => \WP_REST_Server::READABLE,
			// Published events only, as the calendar shows them to anyone.
			'permission_callback' => '__return_true',
			'args' => [
				'date' => [ 'type' => 'string' ],
				'search' => [ 'type' => 'string' ],
				'categories' => [ 'type' => 'string' ],
				'types' => [ 'type' => 'string' ],
				'week_start' => [ 'type' => 'integer' ],
				'per_day' => [ 'type' => 'integer' ],
				'times' => [ 'type' => 'string' ],
			],
			'callback' => static function ( \WP_REST_Request $request ) {
				$calendar = new Calendar( [
					'search' => (string) $request->get_param( 'search' ),
					'categories' => (string) $request->get_param( 'categories' ),
					'types' => (string) $request->get_param( 'types' ),
					'week_start' => $request->get_param( 'week_start' ) ?? 1,
					'per_day' => $request->get_param( 'per_day' ) ?? 3,
					'times' => $request->get_param( 'times' ) ?? '1',
				] );

				return rest_ensure_response( $calendar->views( (string) $request->get_param( 'date' ) ) );
			},
		] );
	}

	// ---------------------------------------------------------------- site

	/** schema.org Event data on an event's page, so search engines can show its date and place. */
	public function print_schema(): void {
		if ( ! is_singular( self::CPT ) ) {
			return;
		}

		$card = Event_Data::card( (int) get_queried_object_id() );

		if ( ! $card['start'] ) {
			return;
		}

		// The stored wall-clock time, in the site's time zone.
		$when = static function ( int $ts ) use ( $card ): string {
			$date = new \DateTime( gmdate( 'Y-m-d H:i:s', $ts ), wp_timezone() );

			return $card['all_day'] ? $date->format( 'Y-m-d' ) : $date->format( 'c' );
		};
		$schema = [
			'@context' => 'https://schema.org',
			'@type' => 'Event',
			'name' => $card['title'],
			'startDate' => $when( $card['start'] ),
			'endDate' => $when( $card['end'] ),
			'url' => $card['url'],
			'eventStatus' => 'https://schema.org/EventScheduled',
			'eventAttendanceMode' => 'https://schema.org/OfflineEventAttendanceMode',
		];

		if ( '' !== $card['excerpt'] ) {
			$schema['description'] = $card['excerpt'];
		}

		if ( '' !== $card['thumb'] ) {
			$schema['image'] = [ $card['thumb'] ];
		}

		if ( '' !== $card['venue'] || '' !== $card['address'] ) {
			$schema['location'] = [ '@type' => 'Place', 'name' => '' !== $card['venue'] ? $card['venue'] : $card['address'], 'address' => '' !== $card['address'] ? $card['address'] : $card['venue'] ];
		}

		if ( '' !== $card['data']['organizer'] ) {
			$schema['organizer'] = [ '@type' => 'Organization', 'name' => $card['data']['organizer'] ];
		}

		if ( '' !== $card['data']['ticket_url'] ) {
			$schema['offers'] = [ '@type' => 'Offer', 'url' => $card['data']['ticket_url'] ];
		}

		echo '<script type="application/ld+json">' . wp_json_encode( $schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG ) . '</script>' . "\n";
	}

	/** An event written in the WordPress editor (not built in the page editor) still shows its details above the text. */
	public function details_for_classic_events( $content ) {
		if ( ! is_singular( self::CPT ) || ! in_the_loop() || ! is_main_query() || get_the_ID() !== get_queried_object_id() ) {
			return $content;
		}

		$document = Plugin::$instance->documents->get( get_the_ID() );

		if ( $document && $document->is_built_with_refraction() ) {
			return $content;
		}

		wp_enqueue_style( 'widget-events' );

		return Event_Details::markup( Event_Data::card( (int) get_the_ID() ), [] ) . $content;
	}

	// ---------------------------------------------------------------- admin

	/** Refraction > Event types: each event form, its events, and the links to design it, use it and make a new one. */
	public function render_types_page(): void {
		$types = Event_Types::types();
		?>
		<div class="wrap">
			<h1 class="wp-heading-inline"><?php esc_html_e( 'Event types', 'refraction' ); ?></h1>
			<hr class="wp-header-end">
			<?php echo Event_Types::new_type_form(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts. ?>
			<p><?php esc_html_e( 'Each event type is a form you design in the editor with the Event Form fields (start, end, venue, tickets, price...). Your staff use the form to make events of that type: put it on a page with the Form Canvas widget (or a Shortcode widget with "Form Builder form"). Calendars and lists can show only some types.', 'refraction' ); ?></p>
			<table class="widefat striped">
				<thead><tr><th><?php esc_html_e( 'Event type', 'refraction' ); ?></th><th><?php esc_html_e( 'Who can use the form', 'refraction' ); ?></th><th><?php esc_html_e( 'Events', 'refraction' ); ?></th><th><?php esc_html_e( 'Shortcode', 'refraction' ); ?></th><th></th></tr></thead>
				<tbody>
				<?php if ( ! $types ) : ?>
					<tr><td colspan="5"><?php esc_html_e( 'No event types yet. Name one above and press "New event type".', 'refraction' ); ?></td></tr>
				<?php endif; ?>
				<?php foreach ( $types as $slug => $label ) :
					$settings = Event_Types::settings( $slug );
					$count = count( get_posts( [ 'post_type' => self::CPT, 'post_status' => 'any', 'posts_per_page' => -1, 'fields' => 'ids', 'meta_key' => Event_Data::META_PREFIX . 'type', 'meta_value' => $slug ] ) );
					$who = [ 'staff' => __( 'Staff', 'refraction' ), 'logged_in' => __( 'Anyone logged in', 'refraction' ), 'anyone' => __( 'Anyone', 'refraction' ) ][ $settings['who'] ];
					?>
					<tr data-type="<?php echo esc_attr( $slug ); ?>">
						<td><strong><?php echo esc_html( $label ); ?></strong></td>
						<td><?php echo esc_html( $who ); ?></td>
						<td><a href="<?php echo esc_url( admin_url( self::ADMIN_SLUG . '&rfe_type=' . $slug ) ); ?>"><?php echo esc_html( number_format_i18n( $count ) ); ?></a></td>
						<td><code>[refraction_form collection="<?php echo esc_html( $slug ); ?>"]</code></td>
						<td>
							<?php if ( $settings['doc'] ) : ?>
								<a class="button" href="<?php echo esc_url( \Refraction\Modules\FormBuilder\Classes\Editor_Forms::edit_url( $settings['doc'] ) ); ?>"><?php esc_html_e( 'Design the form', 'refraction' ); ?></a>
								<a class="button" href="<?php echo esc_url( (string) get_permalink( $settings['doc'] ) ); ?>"><?php esc_html_e( 'Use the form', 'refraction' ); ?></a>
								<a class="button" href="<?php echo esc_url( Event_Types::design_url( $slug, 'single' ) ); ?>"><?php esc_html_e( 'Design the event page', 'refraction' ); ?></a>
								<a class="button" href="<?php echo esc_url( Event_Types::design_url( $slug, 'archive' ) ); ?>"><?php esc_html_e( 'Design the archive', 'refraction' ); ?></a>
								<a href="<?php echo esc_url( (string) get_term_link( Event_Types::term_id( $slug ), self::TYPE_TAXONOMY ) ); ?>"><?php echo esc_html( '/' . ( Event_Types::bases()[ $slug ] ?? $slug ) . '/' ); ?></a>
							<?php endif; ?>
						</td>
					</tr>
				<?php endforeach; ?>
				</tbody>
			</table>
		</div>
		<?php
	}

	public function add_meta_box(): void {
		add_meta_box( 'refraction-event-details', esc_html__( 'Event details', 'refraction' ), [ $this, 'meta_box' ], self::CPT, 'normal', 'high' );
	}

	public function meta_box( \WP_Post $post ): void {
		$data = Event_Data::get( $post->ID );
		$field = static function ( string $key, string $label, string $type = 'text', string $hint = '' ) use ( $data ): void {
			$value = $data[ $key ];

			if ( 'datetime-local' === $type && '' !== $value ) {
				$value = str_replace( ' ', 'T', $value );
			}

			echo '<p><label for="rfe-' . esc_attr( $key ) . '"><strong>' . esc_html( $label ) . '</strong></label><br>';

			if ( 'textarea' === $type ) {
				echo '<textarea class="widefat" rows="2" id="rfe-' . esc_attr( $key ) . '" name="rfe[' . esc_attr( $key ) . ']">' . esc_textarea( $value ) . '</textarea>';
			} else {
				echo '<input class="widefat" type="' . esc_attr( $type ) . '" id="rfe-' . esc_attr( $key ) . '" name="rfe[' . esc_attr( $key ) . ']" value="' . esc_attr( $value ) . '">';
			}

			echo '' !== $hint ? '<span class="description">' . esc_html( $hint ) . '</span>' : '';
			echo '</p>';
		};

		wp_nonce_field( self::NONCE, '_rfe_nonce' );
		echo '<p>' . esc_html__( 'These are also in the page editor: page settings (the cog) > Event details.', 'refraction' ) . '</p>';
		$field( 'start', __( 'Starts', 'refraction' ), 'datetime-local' );
		$field( 'end', __( 'Ends', 'refraction' ), 'datetime-local', __( 'Empty: the same as the start.', 'refraction' ) );
		echo '<p><label><input type="checkbox" name="rfe[all_day]" value="yes"' . checked( 'yes', $data['all_day'], false ) . '> ' . esc_html__( 'All day', 'refraction' ) . '</label></p>';
		$field( 'venue', __( 'Venue', 'refraction' ) );
		$field( 'address', __( 'Address', 'refraction' ), 'textarea' );
		$field( 'price', __( 'Price', 'refraction' ) );
		$field( 'ticket_url', __( 'Tickets or booking link', 'refraction' ), 'url' );
		$field( 'ticket_label', __( 'Button text', 'refraction' ) );
		$field( 'organizer', __( 'Organizer', 'refraction' ) );
	}

	public function save_meta_box( int $post_id ): void {
		if ( ! isset( $_POST['_rfe_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['_rfe_nonce'] ) ), self::NONCE ) ) {
			return;
		}

		if ( ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) || wp_is_post_revision( $post_id ) || ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}

		$raw = isset( $_POST['rfe'] ) && is_array( $_POST['rfe'] ) ? wp_unslash( $_POST['rfe'] ) : []; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- Cleaned by Event_Data::clean().
		$raw += [ 'all_day' => '' ];

		// Categories are saved by WordPress after this; write the page settings once they are.
		Event_Data::save( $post_id, $raw );
		add_action( 'set_object_terms', static function ( $object_id ) use ( $post_id ) {
			if ( (int) $object_id === $post_id ) {
				Event::sync_to_settings( $post_id );
			}
		} );
		Event::sync_to_settings( $post_id );
	}

	/** Above the events table: make a new event in the page editor, and the categories. */
	public function list_links( array $views ): array {
		$views['rfe_new'] = '<a class="button button-primary" href="' . esc_url( self::new_event_url() ) . '">' . esc_html__( 'New event in the editor', 'refraction' ) . '</a>';
		$views['rfe_bookings'] = '<a href="' . esc_url( Bookings::admin_url() ) . '">' . esc_html__( 'Bookings', 'refraction' ) . '</a>';
		$views['rfe_types'] = '<a href="' . esc_url( admin_url( 'admin.php?page=' . self::TYPES_SLUG ) ) . '">' . esc_html__( 'Event types and their forms', 'refraction' ) . '</a>';
		$views['rfe_categories'] = '<a href="' . esc_url( admin_url( 'edit-tags.php?taxonomy=' . self::TAXONOMY . '&post_type=' . self::CPT ) ) . '">' . esc_html__( 'Categories and colors', 'refraction' ) . '</a>';

		return $views;
	}

	public function columns( array $columns ): array {
		$out = [];

		foreach ( $columns as $key => $label ) {
			$out[ $key ] = $label;

			if ( 'title' === $key ) {
				$out['rfe_when'] = esc_html__( 'When', 'refraction' );
				$out['rfe_venue'] = esc_html__( 'Venue', 'refraction' );
				$out['rfe_type'] = esc_html__( 'Type', 'refraction' );
				$out['rfe_booked'] = esc_html__( 'Booked', 'refraction' );
			}
		}

		unset( $out['date'] );

		return $out;
	}

	public function column( string $column, int $post_id ): void {
		$data = Event_Data::get( $post_id );

		if ( 'rfe_when' === $column ) {
			echo '' === $data['start'] ? '<em>' . esc_html__( 'No date yet', 'refraction' ) . '</em>' : esc_html( Event_Data::date_range( $data ) . ' · ' . Event_Data::time_range( $data ) );
		} elseif ( 'rfe_venue' === $column ) {
			echo esc_html( $data['venue'] );
		} elseif ( 'rfe_booked' === $column ) {
			if ( Bookings::enabled( $post_id ) ) {
				$limit = (int) $data['ticket_limit'];
				echo '<a href="' . esc_url( Bookings::admin_url( $post_id ) ) . '">' . esc_html( Bookings::booked( $post_id ) . ( $limit ? ' / ' . $limit : '' ) ) . '</a>';
			} else {
				echo '—';
			}
		} elseif ( 'rfe_type' === $column ) {
			echo esc_html( Event_Types::types()[ $data['type'] ] ?? '—' );
		}
	}

	public function sortable_columns( array $columns ): array {
		$columns['rfe_when'] = 'rfe_when';

		return $columns;
	}

	/** The events table lists the next events first, and sorts by date when asked. */
	public function admin_order( \WP_Query $query ): void {
		if ( ! $query->is_main_query() || self::CPT !== $query->get( 'post_type' ) ) {
			return;
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- A list filter.
		$type = isset( $_GET['rfe_type'] ) ? sanitize_key( wp_unslash( $_GET['rfe_type'] ) ) : '';

		if ( '' !== $type ) {
			$query->set( 'meta_query', [ [ 'key' => Event_Data::META_PREFIX . 'type', 'value' => $type ] ] );
		}

		$orderby = $query->get( 'orderby' );

		if ( 'rfe_when' === $orderby || '' === $orderby ) {
			$query->set( 'meta_key', Event_Data::META_PREFIX . 'start' );
			$query->set( 'orderby', 'meta_value' );
			$query->set( 'order', $query->get( 'order' ) ?: 'DESC' );
		}
	}

	public function term_color_add(): void {
		echo '<div class="form-field"><label for="rfe-color">' . esc_html__( 'Color on the calendar', 'refraction' ) . '</label><input type="color" id="rfe-color" name="rfe_color" value="#2b6344"></div>';
		wp_nonce_field( self::NONCE, '_rfe_term_nonce' );
	}

	public function term_color_edit( \WP_Term $term ): void {
		$color = Event_Data::category_color( $term );
		echo '<tr class="form-field"><th scope="row"><label for="rfe-color">' . esc_html__( 'Color on the calendar', 'refraction' ) . '</label></th><td><input type="color" id="rfe-color" name="rfe_color" value="' . esc_attr( $color ) . '">';
		wp_nonce_field( self::NONCE, '_rfe_term_nonce' );
		echo '</td></tr>';
	}

	public function term_color_save( int $term_id ): void {
		if ( ! isset( $_POST['_rfe_term_nonce'], $_POST['rfe_color'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['_rfe_term_nonce'] ) ), self::NONCE ) || ! current_user_can( 'manage_categories' ) ) {
			return;
		}

		$color = sanitize_hex_color( sanitize_text_field( wp_unslash( $_POST['rfe_color'] ) ) );

		if ( $color ) {
			update_term_meta( $term_id, Event_Data::TERM_COLOR, $color );
		}
	}
}
