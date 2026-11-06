<?php
namespace Refraction\Modules\Events\Classes;

use Refraction\Controls_Manager;
use Refraction\Modules\Events\Documents\Event;
use Refraction\Modules\Events\Module;
use Refraction\Modules\FormBuilder\Classes\Collections;
use Refraction\Modules\FormBuilder\Classes\Editor_Forms;
use Refraction\Modules\FormBuilder\Classes\Money;
use Refraction\Modules\FormBuilder\Classes\Schema;
use Refraction\Modules\FormBuilder\Classes\Uploads;
use Refraction\Modules\FormBuilder\Documents\Form_Document;
use Refraction\Modules\PageTemplates\Module as Page_Templates_Module;
use Refraction\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Event types: a Form Builder form (a Form page built in the editor) with event fields (Event form category: name,
 * start, end, all day, category, venue, address, price, ticket limit, tickets per person, total amount, organizer,
 * image, description, and the Event button for a ticket link, a payment link or the submit). Each form is one type of
 * event with its own form design. When the form is sent, the Form Builder checks and saves it as usual, then an event
 * of that type is made from the answers: its details, category, picture and page (the type's event page design).
 * Who may use the form, the new event's status and its page design are in the form's page settings, under Events.
 */
class Event_Types {

	/** Panel category of the event fields (on Form pages). */
	const WIDGET_CATEGORY = 'refraction-event-fields';

	/** Every event field's key starts with this: event_start, event_venue... */
	const KEY_PREFIX = 'event_';

	/** On a record: the event it made. On an event: the record (submission) it came from. */
	const META_EVENT = '_rfe_event';
	const META_RECORD = '_rfe_record';

	const NEW_ACTION = 'refraction_new_event_type';
	const DESIGN_ACTION = 'refraction_event_type_design';

	public static function register(): void {
		add_action( 'refraction/elements/categories_registered', static function ( $elements_manager ) {
			$elements_manager->add_category( self::WIDGET_CATEGORY, [
				'title' => esc_html__( 'Event Form', 'refraction' ),
				'icon' => 'rficon-calendar',
				'active' => true,
			] );
		} );
		add_action( 'refraction/documents/register_controls', [ __CLASS__, 'register_controls' ] );
		add_filter( 'refraction/form_builder/definition', [ __CLASS__, 'fresh_definition' ] );
		add_filter( 'refraction/form_builder/availability', [ __CLASS__, 'availability' ], 10, 2 );
		add_action( 'refraction/form_builder/submitted', [ __CLASS__, 'make_event' ], 10, 3 );
		add_filter( 'refraction/form_builder/done_url', [ __CLASS__, 'done_url' ], 10, 3 );
		add_filter( 'refraction/form_builder/success_html', [ __CLASS__, 'success_html' ], 10, 2 );
		add_action( 'admin_post_' . self::NEW_ACTION, [ __CLASS__, 'new_type' ] );
		add_action( 'admin_post_' . self::DESIGN_ACTION, [ __CLASS__, 'design_template' ] );

		// Each type has an address of its own: /workshop/ lists its events, /workshop/<event>/ is one of them.
		add_action( 'init', [ __CLASS__, 'add_rewrites' ], 20 );
		add_filter( 'post_type_link', [ __CLASS__, 'event_link' ], 10, 2 );
		add_filter( 'term_link', [ __CLASS__, 'type_link' ], 10, 3 );
		// While an event template is edited, its tags and widgets show an event (the template may preview a blog post).
		add_filter( 'refraction/dynamic_tags/context_post_id', [ __CLASS__, 'preview_context' ], 20 );
		// An event follows a Single template made for it (its type's), whatever page template it has itself.
		add_filter( 'refraction/theme_builder/keep_own_page_template', static fn( $keeps, $post_id ) => Module::CPT === get_post_type( $post_id ) ? false : $keeps, 10, 2 );
		add_action( 'refraction/document/after_save', static function ( $document ) {
			if ( $document instanceof Form_Document ) {
				self::sync_terms();
			}
		}, 20 );
	}

	// ---------------------------------------------------------------- addresses and the type taxonomy

	/** Event types => the first part of their events' addresses (the "Address" setting, else the type's key). */
	public static function bases(): array {
		$bases = [];

		foreach ( array_keys( self::types() ) as $slug ) {
			$base = self::settings( $slug )['base'];
			$bases[ $slug ] = '' !== $base ? $base : $slug;
		}

		return $bases;
	}

	public static function add_rewrites(): void {
		$bases = self::bases();

		foreach ( $bases as $slug => $base ) {
			$base = preg_quote( $base, '#' );
			add_rewrite_rule( '^' . $base . '/?$', 'index.php?' . Module::TYPE_TAXONOMY . '=' . $slug, 'top' );
			add_rewrite_rule( '^' . $base . '/page/([0-9]{1,})/?$', 'index.php?' . Module::TYPE_TAXONOMY . '=' . $slug . '&paged=$matches[1]', 'top' );
			add_rewrite_rule( '^' . $base . '/([^/]+)/?$', 'index.php?' . Module::CPT . '=$matches[1]', 'top' );
		}

		// New or changed addresses work without visiting Settings > Permalinks.
		$fingerprint = md5( (string) wp_json_encode( $bases ) . REFRACTION_VERSION );

		if ( get_option( 'refraction_event_type_rewrites' ) !== $fingerprint ) {
			update_option( 'refraction_event_type_rewrites', $fingerprint, true );
			flush_rewrite_rules( false );
		}
	}

	/** An event of a type lives under the type's address. */
	public static function event_link( $link, $post ) {
		if ( ! $post instanceof \WP_Post || Module::CPT !== $post->post_type || ! get_option( 'permalink_structure' ) || in_array( $post->post_status, [ 'draft', 'pending', 'auto-draft' ], true ) ) {
			return $link;
		}

		$type = (string) get_post_meta( $post->ID, Event_Data::META_PREFIX . 'type', true );
		$base = '' !== $type ? ( self::bases()[ $type ] ?? '' ) : '';

		return '' !== $base ? home_url( user_trailingslashit( $base . '/' . $post->post_name ) ) : $link;
	}

	public static function type_link( $link, $term, $taxonomy ) {
		if ( Module::TYPE_TAXONOMY !== $taxonomy || ! get_option( 'permalink_structure' ) ) {
			return $link;
		}

		$base = self::bases()[ $term->slug ] ?? '';

		return '' !== $base ? home_url( user_trailingslashit( $base ) ) : $link;
	}

	/** Puts an event in its type's term (made, and named after the type, when needed); no type, no term. */
	public static function assign_term( int $post_id, string $slug ): void {
		if ( '' === $slug ) {
			wp_set_object_terms( $post_id, [], Module::TYPE_TAXONOMY );

			return;
		}

		$term = get_term_by( 'slug', $slug, Module::TYPE_TAXONOMY );

		if ( ! $term ) {
			$made = wp_insert_term( self::types()[ $slug ] ?? $slug, Module::TYPE_TAXONOMY, [ 'slug' => $slug ] );
			$term = is_wp_error( $made ) ? null : get_term( (int) $made['term_id'], Module::TYPE_TAXONOMY );
		}

		if ( $term instanceof \WP_Term ) {
			wp_set_object_terms( $post_id, [ (int) $term->term_id ], Module::TYPE_TAXONOMY );
		}
	}

	/** A term for every type, named as the type is (a renamed form renames its term). */
	public static function sync_terms(): void {
		foreach ( ( new Collections() )->all() as $slug => $definition ) {
			if ( ! self::is_type( $definition ) ) {
				continue;
			}

			$term = get_term_by( 'slug', $slug, Module::TYPE_TAXONOMY );

			if ( ! $term ) {
				wp_insert_term( $definition['label'], Module::TYPE_TAXONOMY, [ 'slug' => $slug ] );
			} elseif ( $term->name !== $definition['label'] ) {
				wp_update_term( $term->term_id, Module::TYPE_TAXONOMY, [ 'name' => $definition['label'] ] );
			}
		}
	}

	public static function term_id( string $slug ): int {
		self::sync_terms();
		$term = get_term_by( 'slug', $slug, Module::TYPE_TAXONOMY );

		return $term ? (int) $term->term_id : 0;
	}

	// ---------------------------------------------------------------- the editor's sample event

	private static function editing(): bool {
		$plugin = Plugin::$instance;

		return $plugin->editor->is_edit_mode() || $plugin->preview->is_preview_mode() || ( wp_doing_ajax() && current_user_can( 'edit_posts' ) && isset( $_REQUEST['action'] ) && 'refraction_ajax' === $_REQUEST['action'] ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Only decides what the editor previews.
	}

	/** The newest published event (of an Event Types term when given), to show while designing. 0 when there is none. */
	public static function sample_event( int $term = 0 ): int {
		$args = [ 'post_type' => Module::CPT, 'post_status' => 'publish', 'numberposts' => 1, 'fields' => 'ids', 'orderby' => 'date', 'order' => 'DESC' ];

		if ( $term ) {
			$args['tax_query'] = [ [ 'taxonomy' => Module::TYPE_TAXONOMY, 'terms' => $term ] ];
		}

		$found = get_posts( $args );

		return $found ? (int) $found[0] : ( $term ? self::sample_event() : 0 );
	}

	/** The event a template being edited is about: from its conditions (its type), else the newest event. */
	public static function sample_for_document( $document ): int {
		$rules = $document ? (array) get_post_meta( (int) $document->get_main_id(), '_refraction_conditions', true ) : [];
		$term = 0;

		foreach ( $rules as $rule ) {
			if ( preg_match( '#' . Module::TYPE_TAXONOMY . '/(\d+)#', (string) $rule, $m ) ) {
				$term = (int) $m[1];
				break;
			}
		}

		return self::sample_event( $term );
	}

	/** In the editor, a Single template made for events speaks about an event, whatever post it previews. */
	public static function preview_context( $post_id ) {
		if ( Module::CPT === get_post_type( (int) $post_id ) || ! self::editing() ) {
			return $post_id;
		}

		$document = Plugin::$instance->documents->get_current();
		$rules = $document ? implode( ' ', (array) get_post_meta( (int) $document->get_main_id(), '_refraction_conditions', true ) ) : '';

		if ( false === strpos( $rules, Module::CPT ) && false === strpos( $rules, Module::TYPE_TAXONOMY ) ) {
			return $post_id;
		}

		return self::sample_for_document( $document ) ?: $post_id;
	}

	// ---------------------------------------------------------------- single and archive templates

	/** Opens (or first makes) the Theme Builder template for a type's event pages or its archive. */
	public static function design_url( string $slug, string $kind ): string {
		return wp_nonce_url( admin_url( 'admin-post.php?action=' . self::DESIGN_ACTION . '&type=' . rawurlencode( $slug ) . '&kind=' . $kind ), self::DESIGN_ACTION );
	}

	/** The Theme Builder template already showing this type's events (single) or its archive, if there is one. */
	public static function template_for( string $slug, string $kind ): int {
		$rule = self::template_rule( $slug, $kind );
		$found = get_posts( [ 'post_type' => 'refraction_library', 'post_status' => [ 'publish', 'draft' ], 'posts_per_page' => 1, 'fields' => 'ids', 'meta_query' => [ [ 'key' => '_refraction_template_type', 'value' => $kind ], [ 'key' => '_refraction_conditions', 'value' => $rule, 'compare' => 'LIKE' ] ] ] );

		return $found ? (int) $found[0] : 0;
	}

	private static function template_rule( string $slug, string $kind ): string {
		$term = self::term_id( $slug );

		return 'single' === $kind
			? 'include/singular/in_' . Module::TYPE_TAXONOMY . '/' . $term
			: 'include/archive/tax/' . Module::TYPE_TAXONOMY . '/' . $term;
	}

	public static function design_template(): void {
		check_admin_referer( self::DESIGN_ACTION );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You are not allowed to do that.', 'refraction' ), 403 );
		}

		$slug = isset( $_GET['type'] ) ? sanitize_key( wp_unslash( $_GET['type'] ) ) : '';
		$kind = isset( $_GET['kind'] ) && 'archive' === $_GET['kind'] ? 'archive' : 'single';
		$label = self::types()[ $slug ] ?? '';

		if ( '' === $label ) {
			wp_safe_redirect( admin_url( 'admin.php?page=' . Module::TYPES_SLUG ) );
			exit;
		}

		$id = self::template_for( $slug, $kind );

		if ( ! $id ) {
			$id = wp_insert_post( [
				'post_type' => 'refraction_library',
				'post_status' => 'publish',
				/* translators: %s: event type. */
				'post_title' => sprintf( 'single' === $kind ? __( '%s: event page', 'refraction' ) : __( '%s: archive', 'refraction' ), $label ),
			], true );

			if ( is_wp_error( $id ) ) {
				wp_die( esc_html( $id->get_error_message() ) );
			}

			update_post_meta( $id, '_refraction_edit_mode', 'builder' );
			update_post_meta( $id, '_refraction_template_type', $kind );
			update_post_meta( $id, '_refraction_version', REFRACTION_VERSION );
			update_post_meta( $id, '_refraction_data', wp_slash( (string) wp_json_encode( 'single' === $kind ? self::single_starter() : self::archive_starter( $slug ) ) ) );
			wp_set_object_terms( $id, $kind, 'refraction_library_type' );

			// Preview Settings: an event of the type (Single), or the type's archive (Archive).
			$term = self::term_id( $slug );
			$sample = self::sample_event( $term );
			update_post_meta( $id, '_refraction_page_settings', [
				'refraction_preview_target' => 'single' === $kind
					? [ 'source' => 'post:' . Module::CPT, 'id' => $sample ]
					: [ 'source' => 'term:' . Module::TYPE_TAXONOMY, 'id' => $term ],
			] );
			Plugin::$instance->modules_manager->get_modules( 'theme-builder' )->get_store()->save_rules( $id, $kind, [ self::template_rule( $slug, $kind ) ] );
		}

		$document = Plugin::$instance->documents->get( $id );
		wp_safe_redirect( $document ? $document->get_edit_url() : admin_url( 'edit.php?post_type=refraction_library' ) );
		exit;
	}

	private static function tag( string $name, array $settings = [] ): string {
		return '[refraction-tag id="' . substr( md5( (string) wp_rand() ), 0, 7 ) . '" name="' . $name . '" settings="' . rawurlencode( (string) wp_json_encode( (object) $settings ) ) . '"]';
	}

	/** A type's event page to start from: title, picture, details, buttons, gallery and description, all from the event. */
	public static function single_starter(): array {
		$id = static fn() => \Refraction\Utils::generate_random_string();
		$widget = static fn( string $type, array $settings ) => [ 'id' => $id(), 'elType' => 'widget', 'widgetType' => $type, 'settings' => $settings, 'elements' => [] ];

		return [ [
			'id' => $id(),
			'elType' => 'container',
			'settings' => [ 'flex_gap' => [ 'unit' => 'px', 'size' => 24, 'column' => '24', 'row' => '24', 'isLinked' => true ] ],
			'elements' => [
				$widget( 'heading', [ 'title' => __( 'Event title', 'refraction' ), 'header_size' => 'h1', '__dynamic__' => [ 'title' => self::tag( 'post-title' ) ] ] ),
				$widget( 'heading', [ 'title' => __( 'Date', 'refraction' ), 'header_size' => 'p', '__dynamic__' => [ 'title' => self::tag( 'refraction-event-detail', [ 'detail' => 'when' ] ) ] ] ),
				$widget( 'image', [ 'image' => [ 'url' => '', 'id' => '' ], 'image_size' => 'large', '__dynamic__' => [ 'image' => self::tag( 'post-featured-image' ) ] ] ),
				$widget( 'refraction-event-details', [] ),
				$widget( 'refraction-event-button', [ 'action' => 'payment' ] ),
				$widget( 'refraction-event-gallery', [] ),
				$widget( 'text-editor', [ 'editor' => '', '__dynamic__' => [ 'editor' => self::tag( 'post-excerpt' ) ] ] ),
			],
		] ];
	}

	/** A type's archive to start from: its name and its events. */
	public static function archive_starter( string $slug ): array {
		$id = static fn() => \Refraction\Utils::generate_random_string();

		return [ [
			'id' => $id(),
			'elType' => 'container',
			'settings' => [ 'flex_gap' => [ 'unit' => 'px', 'size' => 24, 'column' => '24', 'row' => '24', 'isLinked' => true ] ],
			'elements' => [
				[ 'id' => $id(), 'elType' => 'widget', 'widgetType' => 'heading', 'settings' => [ 'title' => self::types()[ $slug ] ?? '', 'header_size' => 'h1', '__dynamic__' => [ 'title' => self::tag( 'archive-title', [ 'include_context' => '' ] ) ] ], 'elements' => [] ],
				[ 'id' => $id(), 'elType' => 'widget', 'widgetType' => 'refraction-events-list', 'settings' => [ 'source' => 'archive', 'count' => 12 ], 'elements' => [] ],
			],
		] ];
	}

	// ---------------------------------------------------------------- what is an event type

	public static function is_type( ?array $definition ): bool {
		if ( ! $definition ) {
			return false;
		}

		foreach ( Schema::walk( $definition['fields'] ) as $field ) {
			if ( self::KEY_PREFIX . 'start' === $field['key'] ) {
				return true;
			}
		}

		return false;
	}

	/** Event types: collection slug => name. */
	public static function types(): array {
		static $types = null;

		if ( null === $types ) {
			$types = [];

			foreach ( ( new Collections() )->all() as $slug => $definition ) {
				if ( self::is_type( $definition ) ) {
					$types[ $slug ] = $definition['label'];
				}
			}
		}

		return $types;
	}

	/** The event type's settings (Events section of its Form page's page settings). */
	public static function settings( string $slug ): array {
		$doc_id = Editor_Forms::doc_for( $slug );
		$saved = $doc_id ? get_post_meta( $doc_id, Form_Document::PAGE_META_KEY, true ) : [];
		$saved = is_array( $saved ) ? $saved : [];

		return [
			'who' => in_array( $saved['rfe_who'] ?? '', [ 'anyone', 'logged_in', 'staff' ], true ) ? $saved['rfe_who'] : 'staff',
			'status' => in_array( $saved['rfe_status'] ?? '', [ 'publish', 'pending', 'draft' ], true ) ? $saved['rfe_status'] : 'publish',
			'design' => (int) ( $saved['rfe_design'] ?? 0 ),
			'base' => sanitize_title( (string) ( $saved['rfe_base'] ?? '' ) ),
			'doc' => $doc_id,
		];
	}

	/** The settings of the event form's own widgets (button texts, the categories to choose from), from its Form page. */
	private static function widget_settings( int $doc_id ): array {
		$found = [ 'ticket_label' => '', 'payment_label' => '', 'payment_note' => '', 'payment_qr' => '', 'booking' => '', 'booking_label' => '', 'category_terms' => [] ];
		$walk = static function ( array $elements ) use ( &$walk, &$found ): void {
			foreach ( $elements as $element ) {
				$type = (string) ( $element['widgetType'] ?? '' );
				$settings = (array) ( $element['settings'] ?? [] );

				if ( 'rfb-field-event-button' === $type ) {
					$kind = (string) ( $settings['button_kind'] ?? 'ticket' );

					if ( in_array( $kind, [ 'ticket', 'payment' ], true ) ) {
						$found[ $kind . '_label' ] = sanitize_text_field( (string) ( $settings['page_button_text'] ?? '' ) );

						if ( 'payment' === $kind ) {
							$found['payment_note'] = sanitize_textarea_field( (string) ( $settings['payment_note'] ?? '' ) );
							$found['payment_qr'] = (string) absint( $settings['payment_qr']['id'] ?? 0 );
						}
					} elseif ( 'book' === $kind ) {
						$found['booking'] = 'yes';
						$found['booking_label'] = sanitize_text_field( (string) ( $settings['page_button_text'] ?? '' ) );
					}
				} elseif ( 'rfb-field-event-category' === $type ) {
					$found['category_terms'] = array_map( 'intval', (array) ( $settings['category_terms'] ?? [] ) );
				}

				$walk( (array) ( $element['elements'] ?? [] ) );
			}
		};

		$walk( (array) json_decode( (string) get_post_meta( $doc_id, '_refraction_data', true ), true ) );

		return $found;
	}

	/** Category choices as the Form Builder writes them: one "term id|Name" per line. */
	public static function category_choices( array $only = [] ): string {
		$terms = get_terms( [ 'taxonomy' => Module::TAXONOMY, 'hide_empty' => false, 'include' => array_filter( array_map( 'intval', $only ) ) ] );
		$lines = [];

		foreach ( is_array( $terms ) ? $terms : [] as $term ) {
			$lines[] = $term->term_id . '|' . $term->name;
		}

		return implode( "\n", $lines );
	}

	// ---------------------------------------------------------------- the form

	/** An event form's category field always offers the current Event Categories. */
	public static function fresh_definition( array $definition ): array {
		if ( ! self::is_type( $definition ) ) {
			return $definition;
		}

		$doc_id = Editor_Forms::doc_for( $definition['slug'] );
		$only = $doc_id ? self::widget_settings( $doc_id )['category_terms'] : [];
		$refresh = static function ( array $fields ) use ( &$refresh, $only ): array {
			foreach ( $fields as $i => $field ) {
				if ( self::KEY_PREFIX . 'category' === $field['key'] ) {
					$clean = Schema::clean_field( [ 'type' => $field['type'], 'key' => $field['key'], 'label' => $field['label'], 'options' => self::category_choices( $only ) ] );
					$fields[ $i ]['options'] = $clean ? $clean['options'] : [];
				}

				if ( ! empty( $field['children'] ) ) {
					$fields[ $i ]['children'] = $refresh( $field['children'] );
				}
			}

			return $fields;
		};
		$definition['fields'] = $refresh( $definition['fields'] );

		return $definition;
	}

	/** An event form for staff (or for logged-in people) refuses everyone else. */
	public static function availability( string $state, array $definition ): string {
		if ( 'open' !== $state || ! self::is_type( $definition ) ) {
			return $state;
		}

		$who = self::settings( $definition['slug'] )['who'];

		if ( 'staff' === $who && ! current_user_can( 'edit_posts' ) ) {
			return is_user_logged_in() ? 'denied' : 'login';
		}

		return 'logged_in' === $who && ! is_user_logged_in() ? 'login' : $state;
	}

	/** Page settings of a Form page: Events (who may use it, the new event's status and page design). */
	public static function register_controls( $document ): void {
		if ( ! $document instanceof Form_Document ) {
			return;
		}

		$designs = [ '0' => esc_html__( 'Standard: title, picture, details, description', 'refraction' ) ];

		foreach ( get_posts( [ 'post_type' => Module::CPT, 'post_status' => [ 'publish', 'draft', 'pending', 'future' ], 'posts_per_page' => 100, 'meta_key' => '_refraction_edit_mode', 'meta_value' => 'builder' ] ) as $post ) {
			/* translators: %s: event title. */
			$designs[ (string) $post->ID ] = sprintf( __( 'Like the event "%s"', 'refraction' ), get_the_title( $post ) );
		}

		$document->start_controls_section( 'section_rfe_events', [
			'label' => esc_html__( 'Events', 'refraction' ),
			'tab' => Controls_Manager::TAB_SETTINGS,
		] );

		$document->add_control( 'rfe_events_note', [
			'type' => Controls_Manager::RAW_HTML,
			'raw' => esc_html__( 'A form with a "Start date and time" field (Event Form category) is an event type: sending it makes an event of this type.', 'refraction' ),
			'content_classes' => 'refraction-descriptor',
		] );

		$document->add_control( 'rfe_who', [
			'label' => esc_html__( 'Who can use this event form', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'staff',
			'options' => [
				'staff' => esc_html__( 'Staff (people who can write posts)', 'refraction' ),
				'logged_in' => esc_html__( 'Anyone logged in', 'refraction' ),
				'anyone' => esc_html__( 'Anyone', 'refraction' ),
			],
		] );

		$document->add_control( 'rfe_status', [
			'label' => esc_html__( 'New events are', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'publish',
			'options' => [
				'publish' => esc_html__( 'Published at once', 'refraction' ),
				'pending' => esc_html__( 'Waiting for review', 'refraction' ),
				'draft' => esc_html__( 'Drafts', 'refraction' ),
			],
		] );

		$document->add_control( 'rfe_base', [
			'label' => esc_html__( 'Address of its events', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'placeholder' => esc_html__( 'workshops', 'refraction' ),
			'description' => esc_html__( 'Its events live at /this-address/event-name/ and /this-address/ lists them. Empty: the type\'s own name. Keep it different from your pages\' addresses.', 'refraction' ),
		] );

		$document->add_control( 'rfe_design', [
			'label' => esc_html__( 'Event page design', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '0',
			'options' => $designs,
			'description' => esc_html__( 'Used when the type has no Single template. For one design kept in one place, use "Design the event page" under Refraction > Event types (a Theme Builder template with the Event tags).', 'refraction' ),
		] );

		$document->end_controls_section();
	}

	// ---------------------------------------------------------------- the event

	/**
	 * After an event form was sent and saved: the event of that type, from the answers.
	 *
	 * @param int   $record_id
	 * @param array $definition
	 * @param array $values
	 */
	public static function make_event( $record_id, $definition, $values ): void {
		if ( ! self::is_type( $definition ) ) {
			return;
		}

		$slug = $definition['slug'];
		$settings = self::settings( $slug );
		$labels = $settings['doc'] ? self::widget_settings( $settings['doc'] ) : [ 'ticket_label' => '', 'payment_label' => '', 'payment_note' => '', 'payment_qr' => '', 'booking' => '', 'booking_label' => '' ];
		$value = static fn( string $role ) => $values[ self::KEY_PREFIX . $role ] ?? '';
		$description = trim( (string) $value( 'description' ) );
		$title = trim( (string) $value( 'title' ) );
		$start = Event_Data::clean_datetime( (string) $value( 'start' ) );
		$total = (string) $value( 'total_amount' );

		$event_id = wp_insert_post( [
			'post_type' => Module::CPT,
			'post_status' => $settings['status'],
			/* translators: 1: event type, 2: date. */
			'post_title' => '' !== $title ? $title : sprintf( __( '%1$s on %2$s', 'refraction' ), $definition['singular'] ?: $definition['label'], $start ),
			'post_content' => '' !== $description ? wpautop( esc_html( $description ) ) : '',
			'post_excerpt' => $description,
			'post_author' => get_current_user_id(),
		], true );

		if ( is_wp_error( $event_id ) || ! $event_id ) {
			return;
		}

		Event_Data::save( $event_id, [
			'start' => $start,
			'end' => (string) $value( 'end' ),
			'all_day' => '1' === (string) $value( 'all_day' ) ? 'yes' : '',
			'venue' => (string) $value( 'venue' ),
			'address' => (string) $value( 'address' ),
			'price' => (string) $value( 'price' ),
			'ticket_url' => (string) $value( 'ticket_url' ),
			'ticket_label' => $labels['ticket_label'],
			'payment_url' => (string) $value( 'payment_url' ),
			'payment_label' => $labels['payment_label'],
			'payment_note' => $labels['payment_note'],
			'payment_qr' => $labels['payment_qr'],
			'booking' => $labels['booking'],
			'booking_label' => $labels['booking_label'],
			'ticket_limit' => (string) $value( 'ticket_limit' ),
			'tickets_per_person' => (string) $value( 'tickets_per_person' ),
			'total_amount' => '' !== $total ? Money::display( $total, Money::config( $definition['settings'] ) ) : '',
			'organizer' => (string) $value( 'organizer' ),
			'type' => $slug,
		] );

		$categories = array_filter( array_map( 'intval', (array) $value( 'category' ) ) );

		if ( $categories ) {
			wp_set_object_terms( $event_id, $categories, Module::TAXONOMY );
		}

		$image = self::image( $slug, (array) $value( 'image' ), $event_id );

		if ( $image ) {
			set_post_thumbnail( $event_id, $image );
		}

		// The gallery pictures: into the media library too, kept in order.
		$gallery = [];

		foreach ( (array) $value( 'gallery' ) as $file ) {
			$id = is_array( $file ) ? self::image( $slug, [ $file ], $event_id ) : 0;

			if ( $id ) {
				$gallery[] = $id;
			}
		}

		if ( $gallery ) {
			update_post_meta( $event_id, Event_Data::META_PREFIX . 'gallery', implode( ',', $gallery ) );
		}

		self::give_page( $event_id, $settings['design'], (bool) $image, (bool) $gallery );
		Event::sync_to_settings( $event_id );

		update_post_meta( $event_id, self::META_RECORD, (int) $record_id );
		update_post_meta( (int) $record_id, self::META_EVENT, $event_id );
		self::$made = $event_id;

		/**
		 * Fires after an event form made an event.
		 *
		 * @param int   $event_id
		 * @param int   $record_id
		 * @param array $definition
		 */
		do_action( 'refraction/events/created_from_form', $event_id, (int) $record_id, $definition );
	}

	/**
	 * Fills what an event lacks from the answers of the event form that made it (once, Event_Data::get): the total
	 * amount from the form's first Amount field, the payment link from a link field about paying, and the gallery from
	 * the pictures of its upload fields (copied into the media library). For events made before those event fields
	 * existed, or forms that use fields of their own.
	 */
	public static function backfill( int $event_id ): void {
		$slug = (string) get_post_meta( $event_id, Event_Data::META_PREFIX . 'type', true );
		$definition = '' !== $slug ? ( new Collections() )->get( $slug ) : null;
		$record = $definition ? ( new \Refraction\Modules\FormBuilder\Classes\Records() )->get( (int) get_post_meta( $event_id, self::META_RECORD, true ), $slug ) : null;

		if ( ! $record ) {
			return;
		}

		$values = $record['values'];
		$meta = static fn( string $key ) => (string) get_post_meta( $event_id, Event_Data::META_PREFIX . $key, true );
		$fields = Schema::walk( $definition['fields'] );

		foreach ( $fields as $field ) {
			$value = $values[ $field['key'] ] ?? '';

			if ( '' === $meta( 'total_amount' ) && 'currency' === $field['type'] && is_scalar( $value ) && '' !== (string) $value ) {
				update_post_meta( $event_id, Event_Data::META_PREFIX . 'total_amount', Money::display( (string) $value, Money::config( $definition['settings'] ) ) );
			}

			if ( '' === $meta( 'payment_url' ) && 'url' === $field['type'] && is_string( $value ) && '' !== $value && preg_match( '/pay|gcash|checkout/i', $field['key'] . ' ' . $field['label'] ) ) {
				update_post_meta( $event_id, Event_Data::META_PREFIX . 'payment_url', esc_url_raw( $value ) );
			}
		}

		// No currency field: a number or text field named as the total amount ("Total", "Amount to pay").
		foreach ( $fields as $field ) {
			$value = $values[ $field['key'] ] ?? '';

			if ( '' === $meta( 'total_amount' ) && in_array( $field['type'], [ 'number', 'text' ], true ) && is_scalar( $value ) && preg_match( '/\d/', (string) $value ) && preg_match( '/total|amount/i', $field['key'] . ' ' . $field['label'] ) ) {
				update_post_meta( $event_id, Event_Data::META_PREFIX . 'total_amount', sanitize_text_field( (string) $value ) );
			}
		}

		if ( '' === $meta( 'gallery' ) ) {
			$ids = [];

			foreach ( $fields as $field ) {
				if ( 'file' !== $field['type'] || self::KEY_PREFIX . 'image' === $field['key'] ) {
					continue;
				}

				foreach ( (array) ( $values[ $field['key'] ] ?? [] ) as $file ) {
					$id = is_array( $file ) && in_array( strtolower( (string) ( $file['ext'] ?? '' ) ), [ 'jpg', 'jpeg', 'png', 'gif', 'webp' ], true ) ? self::image( $slug, [ $file ], $event_id ) : 0;

					if ( $id ) {
						$ids[] = $id;
					}
				}
			}

			if ( $ids ) {
				update_post_meta( $event_id, Event_Data::META_PREFIX . 'gallery', implode( ',', $ids ) );
			}
		}
	}

	/** The event just made in this request (for the address after sending). */
	private static int $made = 0;

	/** The uploaded picture (a private Form Builder file) as a media library image of the event; 0 when there is none. */
	private static function image( string $slug, array $files, int $event_id ): int {
		$file = $files[0] ?? null;
		$path = is_array( $file ) ? Uploads::path( $slug, $file ) : '';

		if ( '' === $path || ! is_readable( $path ) ) {
			return 0;
		}

		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';

		$tmp = wp_tempnam( $path );

		if ( ! $tmp || ! copy( $path, $tmp ) ) {
			return 0;
		}

		$name = sanitize_file_name( (string) ( $file['name'] ?? '' ) ) ?: 'event.' . $file['ext'];
		$id = media_handle_sideload( [ 'name' => $name, 'tmp_name' => $tmp ], $event_id );

		if ( is_wp_error( $id ) ) {
			wp_delete_file( $tmp );

			return 0;
		}

		return (int) $id;
	}

	/** The new event's page: a copy of the type's design event, or the standard layout. */
	private static function give_page( int $event_id, int $design, bool $has_image, bool $has_gallery = false ): void {
		$elements = null;
		$template = Page_Templates_Module::TEMPLATE_HEADER_FOOTER;

		if ( $design && Module::CPT === get_post_type( $design ) ) {
			$copy = json_decode( (string) get_post_meta( $design, '_refraction_data', true ), true );

			if ( is_array( $copy ) && $copy ) {
				$elements = self::new_ids( $copy );
				$template = (string) get_post_meta( $design, '_wp_page_template', true ) ?: $template;
				$page = get_post_meta( $design, Event::PAGE_META_KEY, true );

				if ( is_array( $page ) ) {
					update_post_meta( $event_id, Event::PAGE_META_KEY, $page );
				}
			}
		}

		if ( null === $elements ) {
			$elements = Module::starter_elements( [ 'image' => $has_image, 'excerpt' => true, 'gallery' => $has_gallery ] );
		}

		update_post_meta( $event_id, '_refraction_edit_mode', 'builder' );
		update_post_meta( $event_id, '_refraction_template_type', Module::DOCUMENT_TYPE );
		update_post_meta( $event_id, '_wp_page_template', $template );
		update_post_meta( $event_id, '_refraction_version', REFRACTION_VERSION );
		update_post_meta( $event_id, '_refraction_data', wp_slash( (string) wp_json_encode( $elements ) ) );
	}

	/** A copied page gets ids of its own. */
	private static function new_ids( array $elements ): array {
		foreach ( $elements as $i => $element ) {
			if ( is_array( $element ) ) {
				$elements[ $i ]['id'] = \Refraction\Utils::generate_random_string();
				$elements[ $i ]['elements'] = self::new_ids( (array) ( $element['elements'] ?? [] ) );
			}
		}

		return $elements;
	}

	/** After sending, the form's page says so and links to the new event. */
	public static function done_url( $url, $record_id, $definition ) {
		return self::$made && self::is_type( $definition ) ? add_query_arg( 'rfe_event', self::$made, $url ) : $url;
	}

	public static function success_html( $html, $definition ) {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Only a link is shown, to someone who may see the event.
		$id = isset( $_GET['rfe_event'] ) ? absint( $_GET['rfe_event'] ) : 0;

		if ( ! $id || Module::CPT !== get_post_type( $id ) || ! self::is_type( $definition ) || ( 'publish' !== get_post_status( $id ) && ! current_user_can( 'edit_post', $id ) ) ) {
			return $html;
		}

		$link = 'publish' === get_post_status( $id ) ? get_permalink( $id ) : get_preview_post_link( $id );
		$text = 'publish' === get_post_status( $id ) ? __( 'View the event', 'refraction' ) : __( 'Preview the event', 'refraction' );

		return $html . ' <a class="rfe-made-link" href="' . esc_url( $link ) . '">' . esc_html( $text ) . ' →</a>';
	}

	// ---------------------------------------------------------------- a new event type

	/** The "New event type" form: a name, then the editor. */
	public static function new_type_form(): string {
		return '<form class="rfe-new-type" method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '">'
			. '<input type="hidden" name="action" value="' . esc_attr( self::NEW_ACTION ) . '">'
			. wp_nonce_field( self::NEW_ACTION, '_wpnonce', true, false )
			. '<label class="screen-reader-text" for="rfe-name">' . esc_html__( 'Name of the event type', 'refraction' ) . '</label>'
			. '<input type="text" id="rfe-name" name="rfe_name" required placeholder="' . esc_attr__( 'Workshop, Concert, Market...', 'refraction' ) . '"> '
			. '<button type="submit" class="button button-primary">' . esc_html__( 'New event type', 'refraction' ) . '</button></form>';
	}

	/** Makes a Form page with every event field already placed (in a sensible order) and opens it in the editor. */
	public static function new_type(): void {
		check_admin_referer( self::NEW_ACTION );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You are not allowed to do that.', 'refraction' ), 403 );
		}

		// The name gives the type its key (kept when it is renamed later, as events are tied to it).
		$name = isset( $_POST['rfe_name'] ) ? sanitize_text_field( wp_unslash( $_POST['rfe_name'] ) ) : '';
		$id = wp_insert_post( [ 'post_type' => 'refraction_library', 'post_status' => 'publish', 'post_title' => '' !== $name ? $name : __( 'New event type', 'refraction' ) ], true );

		if ( is_wp_error( $id ) ) {
			wp_die( esc_html( $id->get_error_message() ) );
		}

		update_post_meta( $id, '_refraction_edit_mode', 'builder' );
		update_post_meta( $id, Form_Document::TYPE_META_KEY, Form_Document::TYPE );
		update_post_meta( $id, '_refraction_version', REFRACTION_VERSION );
		update_post_meta( $id, '_refraction_data', wp_slash( (string) wp_json_encode( self::starter_form() ) ) );
		wp_set_object_terms( $id, Form_Document::TYPE, 'refraction_library_type' );

		$document = Plugin::$instance->documents->get( $id, false );

		if ( $document instanceof Form_Document ) {
			( new Editor_Forms( new Collections() ) )->sync( $document );
		}

		wp_safe_redirect( Editor_Forms::edit_url( $id ) ?: admin_url( Module::ADMIN_SLUG ) );
		exit;
	}

	/** A new event type's form: every event field, two to a row where they pair up, and the submit button. */
	public static function starter_form(): array {
		$id = static fn() => \Refraction\Utils::generate_random_string();
		$field = static fn( string $widget, array $settings = [] ) => [ 'id' => $id(), 'elType' => 'widget', 'widgetType' => 'rfb-field-event-' . $widget, 'settings' => $settings, 'elements' => [] ];
		$row = static fn( array ...$widgets ) => [ 'id' => $id(), 'elType' => 'container', 'isInner' => true, 'settings' => [ 'flex_direction' => 'row', 'content_width' => 'full', 'flex_wrap' => 'wrap', 'padding' => [ 'unit' => 'px', 'top' => '0', 'right' => '0', 'bottom' => '0', 'left' => '0', 'isLinked' => true ] ], 'elements' => array_map( static fn( $w ) => $w + [ 'settings' => [] ], $widgets ) ];
		$half = [ '_element_width' => 'initial', '_element_custom_width' => [ 'unit' => '%', 'size' => 48 ], '_element_custom_width_mobile' => [ 'unit' => '%', 'size' => 100 ] ];

		return [ [
			'id' => $id(),
			'elType' => 'container',
			'settings' => [ 'flex_gap' => [ 'unit' => 'px', 'size' => 16, 'column' => '16', 'row' => '16', 'isLinked' => true ] ],
			'elements' => [
				[ 'id' => $id(), 'elType' => 'widget', 'widgetType' => 'heading', 'settings' => [ 'title' => __( 'New event', 'refraction' ), 'header_size' => 'h2' ], 'elements' => [] ],
				$field( 'title', [ 'field_required' => 'yes' ] ),
				$row( $field( 'start', $half + [ 'field_required' => 'yes' ] ), $field( 'end', $half ) ),
				$field( 'all-day' ),
				$field( 'category' ),
				$row( $field( 'venue', $half ), $field( 'organizer', $half ) ),
				$field( 'address' ),
				$row( $field( 'price', $half ), $field( 'total-amount', $half ) ),
				$row( $field( 'ticket-limit', $half ), $field( 'tickets-per-person', $half ) ),
				$field( 'button', [ 'button_kind' => 'ticket', 'page_button_text' => __( 'Get tickets', 'refraction' ) ] ),
				$field( 'button', [ 'button_kind' => 'payment', 'page_button_text' => __( 'Pay now', 'refraction' ) ] ),
				$field( 'button', [ 'button_kind' => 'book', 'page_button_text' => __( 'Book now', 'refraction' ) ] ),
				$field( 'image' ),
				$field( 'gallery', [ 'file_max_files' => 6 ] ),
				$field( 'description' ),
				$field( 'button', [ 'button_kind' => 'submit', 'submit_text' => __( 'Create event', 'refraction' ) ] ),
			],
		] ];
	}
}
