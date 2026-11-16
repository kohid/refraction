<?php
namespace Refraction\Modules\Events\Classes;

use Refraction\Modules\Events\Documents\Event;
use Refraction\Modules\Events\Module;
use Refraction\Modules\FormBuilder\Classes\Wizard;
use Refraction\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * The "new event" wizard (0.106.0): name it, choose its type and categories, when and where, a last look; the event is
 * then made (a draft or published), added to the Events list and offered there to edit in the editor. The dialog is the
 * Builder's (modules/form-builder/classes/wizard.php).
 */
class Event_Wizard {

	const ACTION = 'refraction_event_wizard';
	const DIALOG = 'rf-wizard-event';

	public function __construct() {
		add_action( 'admin_post_' . self::ACTION, [ $this, 'handle' ] );
		add_action( 'admin_enqueue_scripts', [ $this, 'enqueue' ] );
		add_action( 'admin_footer-edit.php', [ $this, 'print_dialog' ] );
		add_action( 'admin_notices', [ $this, 'notice' ] );
	}

	private static function on_list(): bool {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;

		return $screen && 'edit-' . Module::CPT === $screen->id && current_user_can( 'edit_posts' );
	}

	public function enqueue(): void {
		if ( self::on_list() ) {
			Wizard::enqueue();
			// "Add New Event" at the top of the list opens the wizard; its link (a new tab, a middle click) is the editor.
			wp_add_inline_script( 'refraction-wizard', 'document.querySelectorAll(".page-title-action").forEach(function(a){a.setAttribute("data-rf-wizard-open","' . esc_js( self::DIALOG ) . '");a.setAttribute("href",' . wp_json_encode( Module::new_event_url() ) . ');});' );
		}
	}

	public function print_dialog(): void {
		if ( ! self::on_list() ) {
			return;
		}

		$types = [ '' => [ __( 'No type', 'refraction' ), __( 'A plain event, without a sign-up form.', 'refraction' ), 'event' ] ];

		foreach ( Event_Types::types() as $slug => $label ) {
			$types[ $slug ] = [ $label, __( 'Its own form, page design and address.', 'refraction' ), 'layers' ];
		}

		$categories = [];
		$terms = get_terms( [ 'taxonomy' => Module::TAXONOMY, 'hide_empty' => false ] );

		foreach ( is_array( $terms ) ? $terms : [] as $term ) {
			$categories[ (string) $term->term_id ] = [ $term->name, '', 'label' ];
		}

		$steps = [
			[
				__( 'Name it', 'refraction' ),
				__( 'What people will see', 'refraction' ),
				Wizard::text( 'title', __( 'Event name', 'refraction' ), [ 'required' => true, 'placeholder' => __( 'Summer open day', 'refraction' ) ] )
				. Wizard::text( 'excerpt', __( 'Short description', 'refraction' ), [ 'textarea' => true, 'placeholder' => __( 'One or two lines for the lists and the calendar.', 'refraction' ), 'summary' => __( 'Description', 'refraction' ) ] ),
			],
			[
				__( 'Type and category', 'refraction' ),
				__( 'How it is sorted and booked', 'refraction' ),
				Wizard::choices( 'type', __( 'Event type', 'refraction' ), $types, [ 'checked' => '', 'summary' => __( 'Type', 'refraction' ) ] )
				. ( $categories ? Wizard::choices( 'categories', __( 'Categories', 'refraction' ), $categories, [ 'multiple' => true, 'columns' => 3, 'summary' => __( 'Categories', 'refraction' ) ] ) : '' )
				. Wizard::text( 'new_category', $categories ? __( 'Or a new category', 'refraction' ) : __( 'Category', 'refraction' ), [ 'placeholder' => __( 'Workshops', 'refraction' ), 'summary' => __( 'New category', 'refraction' ) ] ),
			],
			[
				__( 'When and where', 'refraction' ),
				__( 'Its day, time and place', 'refraction' ),
				Wizard::text( 'start', __( 'Starts', 'refraction' ), [ 'type' => 'datetime-local', 'required' => true ] )
				. Wizard::text( 'end', __( 'Ends', 'refraction' ), [ 'type' => 'datetime-local', 'help' => __( 'Empty: it ends when it starts.', 'refraction' ) ] )
				. Wizard::toggle( 'all_day', __( 'All day', 'refraction' ), false )
				. Wizard::text( 'venue', __( 'Venue', 'refraction' ), [ 'placeholder' => __( 'Town hall, Inverness', 'refraction' ) ] ),
			],
			[
				__( 'Last look', 'refraction' ),
				__( 'Check it, then make it', 'refraction' ),
				Wizard::choices( 'status', __( 'Make it', 'refraction' ), [
					'draft' => [ __( 'A draft', 'refraction' ), __( 'Not on the site until you publish it.', 'refraction' ), 'edit' ],
					'publish' => [ __( 'Published', 'refraction' ), __( 'On the site and in the calendar now.', 'refraction' ), 'public' ],
				], [ 'checked' => 'draft', 'summary' => __( 'Status', 'refraction' ) ] )
				. Wizard::review( __( 'The event is made with these details and added to your events. Open it in the editor from there to design its page.', 'refraction' ) ),
			],
		];

		Wizard::render( self::DIALOG, __( 'New event', 'refraction' ), self::ACTION, $steps, __( 'Create event', 'refraction' ) );
	}

	/** Makes the event from the wizard's answers, then back to the Events list. */
	public function handle(): void {
		if ( ! current_user_can( 'edit_posts' ) ) {
			wp_die( esc_html__( 'You are not allowed to do that.', 'refraction' ), 403 );
		}

		check_admin_referer( self::ACTION );

		// phpcs:disable WordPress.Security.NonceVerification.Missing -- Checked above.
		$get = static fn( string $key ): string => isset( $_POST[ $key ] ) ? trim( sanitize_text_field( wp_unslash( $_POST[ $key ] ) ) ) : '';
		$title = $get( 'title' );
		$excerpt = isset( $_POST['excerpt'] ) ? sanitize_textarea_field( wp_unslash( $_POST['excerpt'] ) ) : '';
		$categories = isset( $_POST['categories'] ) ? array_map( 'absint', (array) wp_unslash( $_POST['categories'] ) ) : [];
		// phpcs:enable
		$list = admin_url( Module::ADMIN_SLUG );

		if ( '' === $title || '' === $get( 'start' ) ) {
			wp_safe_redirect( add_query_arg( 'wizard', 'missing', $list ) );
			exit;
		}

		$status = 'publish' === $get( 'status' ) && current_user_can( 'publish_posts' ) ? 'publish' : 'draft';
		$id = wp_insert_post( [ 'post_type' => Module::CPT, 'post_title' => $title, 'post_excerpt' => $excerpt, 'post_status' => $status ], true );

		if ( is_wp_error( $id ) ) {
			wp_die( esc_html( $id->get_error_message() ) );
		}

		// Its page opens in the editor with the title, the Event Details box and the description, like a new event.
		update_post_meta( $id, '_refraction_edit_mode', 'builder' );
		update_post_meta( $id, '_refraction_template_type', Module::DOCUMENT_TYPE );
		update_post_meta( $id, '_refraction_version', REFRACTION_VERSION );
		update_post_meta( $id, '_refraction_data', wp_slash( (string) wp_json_encode( Module::starter_elements( [ 'excerpt' => '' !== $excerpt ] ) ) ) );

		$type = $get( 'type' );
		Event_Data::save( $id, [
			'start' => $get( 'start' ),
			'end' => $get( 'end' ),
			'all_day' => 'yes' === $get( 'all_day' ) ? 'yes' : '',
			'venue' => $get( 'venue' ),
			'type' => isset( Event_Types::types()[ $type ] ) ? $type : '',
		] );

		$new_category = $get( 'new_category' );

		if ( '' !== $new_category && current_user_can( 'manage_categories' ) ) {
			$term = term_exists( $new_category, Module::TAXONOMY ) ?: wp_insert_term( $new_category, Module::TAXONOMY );

			if ( is_array( $term ) ) {
				$categories[] = (int) $term['term_id'];
			}
		}

		$categories = array_values( array_filter( $categories ) );

		if ( $categories ) {
			wp_set_object_terms( $id, $categories, Module::TAXONOMY );
		}

		Event::sync_to_settings( $id );

		wp_safe_redirect( add_query_arg( 'rfe_created', $id, $list ) );
		exit;
	}

	/** Above the list after making one: it is there, with its editor, its details and its page. */
	public function notice(): void {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$id = isset( $_GET['rfe_created'] ) ? absint( $_GET['rfe_created'] ) : 0;

		if ( ! $id || ! self::on_list() || Module::CPT !== get_post_type( $id ) || ! current_user_can( 'edit_post', $id ) ) {
			return;
		}

		$document = Plugin::$instance->documents->get( $id );
		$links = [];

		if ( $document ) {
			$links[] = '<a class="button button-primary" href="' . esc_url( $document->get_edit_url() ) . '">' . esc_html__( 'Edit in the editor', 'refraction' ) . '</a>';
		}

		$links[] = '<a class="button" href="' . esc_url( (string) get_edit_post_link( $id ) ) . '">' . esc_html__( 'Edit the details', 'refraction' ) . '</a>';
		$links[] = '<a class="button" href="' . esc_url( (string) get_permalink( $id ) ) . '">' . esc_html( 'publish' === get_post_status( $id ) ? __( 'View', 'refraction' ) : __( 'Preview', 'refraction' ) ) . '</a>';

		echo '<div class="notice notice-success rf-event-created"><p><strong>' . esc_html( sprintf( /* translators: %s: event name. */ __( '"%s" is in your events.', 'refraction' ), get_the_title( $id ) ) ) . '</strong> ' . esc_html( 'publish' === get_post_status( $id ) ? __( 'It is published.', 'refraction' ) : __( 'It is a draft until you publish it.', 'refraction' ) ) . '</p><p class="rf-event-created__actions">' . implode( ' ', $links ) . '</p></div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts.
		// Two ids, so the mark wins over the admin design's table rows (0.107.0); a theme's own green tint when one is chosen.
		echo '<style>#wpbody-content #post-' . (int) $id . ' > * { background: var(--rf-pass-soft, #e8fff3); } .rf-event-created__actions .button { margin-inline-end: 6px; }</style>';
	}
}
