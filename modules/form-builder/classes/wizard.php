<?php
namespace Refraction\Modules\FormBuilder\Classes;

use Refraction\Core\Utils\Icons;
use Refraction\Modules\FormBuilder\Documents\Form_Document;
use Refraction\Modules\FormBuilder\Module;
use Refraction\Plugin;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * The "new form" and "new event" wizards (0.106.0): a dialog in steps (name it, choose what it is, its options, a last
 * look) that makes the form or the event, puts it in its list and offers to edit it there. This class holds the dialog
 * shared by both (markup helpers, assets) and the form wizard; the event wizard is modules/events/classes/event-wizard.php.
 *
 * The dialog is a real form posted to admin-post.php: wizard.js shows one step at a time, checks a step's required
 * boxes before the next, fills the last look and handles the keyboard. Without the script the button keeps its link to
 * the editor.
 */
class Wizard {

	const ACTION = 'refraction_fb_wizard';
	const DIALOG = 'rf-wizard-form';

	public function __construct() {
		add_action( 'admin_post_' . self::ACTION, [ $this, 'handle' ] );
	}

	// ---------------------------------------------------------------- the shared dialog

	public static function enqueue(): void {
		$min = Utils::is_script_debug() ? '' : '.min';
		wp_enqueue_style( 'refraction-wizard', REFRACTION_ASSETS_URL . 'css/modules/form-builder/wizard' . $min . '.css', [], REFRACTION_VERSION );
		wp_enqueue_script( 'refraction-wizard', REFRACTION_ASSETS_URL . 'js/form-builder-wizard' . $min . '.js', [], REFRACTION_VERSION, true );
	}

	/** Attributes that make a link or button open a wizard (its href stays the way in without the script). */
	public static function opener( string $dialog ): string {
		return ' data-rf-wizard-open="' . esc_attr( $dialog ) . '"';
	}

	/**
	 * Prints a wizard dialog.
	 *
	 * @param string $id     The dialog's id.
	 * @param string $title  Its title.
	 * @param string $action The admin-post action it posts to (its nonce has the same name).
	 * @param array  $steps  [ [ title, short text, the step's HTML ], ... ]; the last one is the last look.
	 * @param string $submit The label of the button that makes it.
	 */
	public static function render( string $id, string $title, string $action, array $steps, string $submit ): void {
		$count = count( $steps );
		echo '<div class="rf-wizard" id="' . esc_attr( $id ) . '" hidden>';
		echo '<div class="rf-wizard__backdrop" data-rf-wizard-close></div>';
		echo '<form class="rf-wizard__dialog" role="dialog" aria-modal="true" aria-labelledby="' . esc_attr( $id ) . '-title" method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '" novalidate>';
		echo '<input type="hidden" name="action" value="' . esc_attr( $action ) . '">';
		wp_nonce_field( $action );
		echo '<header class="rf-wizard__head"><h2 id="' . esc_attr( $id ) . '-title">' . esc_html( $title ) . '</h2>';
		echo '<button type="button" class="rf-wizard__close" data-rf-wizard-close aria-label="' . esc_attr__( 'Close', 'refraction' ) . '">' . Icons::svg( 'close', [ 'size' => 20 ] ) . '</button></header>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Bundled icon.
		echo '<div class="rf-wizard__body"><ol class="rf-wizard__nav">';

		foreach ( $steps as $i => [ $step_title, $step_text ] ) {
			echo '<li class="rf-wizard__nav-item" data-rf-step="' . (int) $i . '"><button type="button" class="rf-wizard__nav-button" tabindex="-1"><span class="rf-wizard__num" aria-hidden="true"><span class="rf-wizard__digit">' . (int) ( $i + 1 ) . '</span>' . Icons::svg( 'check', [ 'size' => 16 ] ) . '</span><span class="rf-wizard__nav-text"><strong>' . esc_html( $step_title ) . '</strong><span>' . esc_html( $step_text ) . '</span></span></button></li>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Bundled icon.
		}

		echo '</ol><div class="rf-wizard__panes">';

		foreach ( $steps as $i => [ $step_title, , $html ] ) {
			echo '<section class="rf-wizard__pane" data-rf-step="' . (int) $i . '"' . ( $i ? ' hidden' : '' ) . ' aria-label="' . esc_attr( $step_title ) . '"><h3 class="rf-wizard__pane-title">' . esc_html( $step_title ) . '</h3>' . $html . '</section>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts.
		}

		echo '</div></div><footer class="rf-wizard__foot">';
		echo '<button type="button" class="rfb-btn rfb-btn-light" data-rf-wizard-back>' . esc_html__( 'Back', 'refraction' ) . '</button>';
		/* translators: 1: this step, 2: how many steps. */
		echo '<span class="rf-wizard__count" data-rf-wizard-count data-rf-of="' . esc_attr__( 'Step %1$d of %2$d', 'refraction' ) . '">' . esc_html( sprintf( __( 'Step %1$d of %2$d', 'refraction' ), 1, $count ) ) . '</span>';
		echo '<button type="button" class="rfb-btn rfb-btn-primary" data-rf-wizard-next>' . esc_html__( 'Continue', 'refraction' ) . '</button>';
		echo '<button type="submit" class="rfb-btn rfb-btn-primary" data-rf-wizard-submit hidden>' . esc_html( $submit ) . '</button>';
		echo '</footer></form></div>';
	}

	/**
	 * A text box. $args: type (text, email, datetime-local...), required, placeholder, value, help, summary (its name in
	 * the last look; default the label), show_if ("name=value" or "name!=value").
	 */
	public static function text( string $name, string $label, array $args = [] ): string {
		$args += [ 'type' => 'text', 'required' => false, 'placeholder' => '', 'value' => '', 'help' => '', 'summary' => $label, 'show_if' => '', 'textarea' => false ];
		$id = 'rfw-' . sanitize_html_class( $name );
		$attrs = 'id="' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '" class="rfb-input" data-rf-sum="' . esc_attr( $args['summary'] ) . '"' . ( $args['required'] ? ' required' : '' ) . ( '' !== $args['placeholder'] ? ' placeholder="' . esc_attr( $args['placeholder'] ) . '"' : '' );
		$box = $args['textarea']
			? '<textarea ' . $attrs . ' rows="3">' . esc_textarea( $args['value'] ) . '</textarea>'
			: '<input type="' . esc_attr( $args['type'] ) . '" ' . $attrs . ' value="' . esc_attr( $args['value'] ) . '">';

		return self::wrap( '<label class="rfb-label' . ( $args['required'] ? ' rfb-required' : '' ) . '" for="' . esc_attr( $id ) . '">' . esc_html( $label ) . '</label>' . $box . ( '' !== $args['help'] ? '<p class="rf-wizard__help">' . esc_html( $args['help'] ) . '</p>' : '' ), $args['show_if'] );
	}

	/**
	 * Cards to choose from (radio, or checkbox for several). $options: [ value => [ title, text, icon ] ]. $args:
	 * multiple, checked (value or list), summary, show_if, columns (2 or 3).
	 */
	public static function choices( string $name, string $label, array $options, array $args = [] ): string {
		$args += [ 'multiple' => false, 'checked' => '', 'summary' => $label, 'show_if' => '', 'columns' => 2 ];
		$type = $args['multiple'] ? 'checkbox' : 'radio';
		$checked = (array) $args['checked'];
		// The cards sit in a grid inside the fieldset: a legend does not take part in its fieldset's grid.
		$html = '<fieldset class="rf-wizard__choices rf-wizard__choices--' . (int) $args['columns'] . '" data-rf-sum="' . esc_attr( $args['summary'] ) . '"><legend class="rfb-label">' . esc_html( $label ) . '</legend><div class="rf-wizard__choice-grid">';

		foreach ( $options as $value => $option ) {
			[ $title, $text, $icon ] = array_pad( (array) $option, 3, '' );
			$html .= '<label class="rf-wizard__choice"><input type="' . $type . '" name="' . esc_attr( $name . ( $args['multiple'] ? '[]' : '' ) ) . '" value="' . esc_attr( (string) $value ) . '" data-rf-title="' . esc_attr( $title ) . '"' . checked( in_array( (string) $value, array_map( 'strval', $checked ), true ), true, false ) . '>';
			$html .= '<span class="rf-wizard__choice-box">' . ( '' !== $icon ? '<span class="rf-wizard__choice-icon">' . Icons::svg( $icon, [ 'size' => 22 ] ) . '</span>' : '' ) . '<span class="rf-wizard__choice-text"><strong>' . esc_html( $title ) . '</strong>' . ( '' !== $text ? '<span>' . esc_html( $text ) . '</span>' : '' ) . '</span></span></label>';
		}

		return self::wrap( $html . '</div></fieldset>', $args['show_if'] );
	}

	/** An on / off switch (posts "yes" when on). */
	public static function toggle( string $name, string $label, bool $on, string $help = '', string $show_if = '' ): string {
		$id = 'rfw-' . sanitize_html_class( $name );

		return self::wrap( '<label class="rf-wizard__toggle" for="' . esc_attr( $id ) . '"><input type="checkbox" id="' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '" value="yes" data-rf-sum="' . esc_attr( $label ) . '"' . checked( $on, true, false ) . '><span class="rf-wizard__switch" aria-hidden="true"></span><span><strong>' . esc_html( $label ) . '</strong>' . ( '' !== $help ? '<span class="rf-wizard__help">' . esc_html( $help ) . '</span>' : '' ) . '</span></label>', $show_if );
	}

	/** The last look: filled by the script from the steps before it. */
	public static function review( string $intro ): string {
		return '<p class="rf-wizard__intro">' . esc_html( $intro ) . '</p><dl class="rf-wizard__review" data-rf-wizard-review></dl>';
	}

	private static function wrap( string $html, string $show_if ): string {
		return '<div class="rf-wizard__field"' . ( '' !== $show_if ? ' data-rf-show-if="' . esc_attr( $show_if ) . '"' : '' ) . '>' . $html . '</div>';
	}

	// ---------------------------------------------------------------- the form wizard

	/** What a new form is for: its icon, what one record is called, its statuses and the fields it starts with. */
	public static function kinds(): array {
		return [
			'contact' => [
				'title' => __( 'Contact messages', 'refraction' ),
				'text' => __( 'A name, an email and a message.', 'refraction' ),
				'icon' => 'mail',
				'singular' => __( 'Message', 'refraction' ),
				'statuses' => [ [ __( 'New', 'refraction' ), 'primary' ], [ __( 'Replied', 'refraction' ), 'success' ] ],
				'fields' => [ [ 'name', __( 'Name', 'refraction' ), 'name', true ], [ 'email', __( 'Email', 'refraction' ), 'email', true ], [ 'textarea', __( 'Message', 'refraction' ), 'message', true ] ],
			],
			'booking' => [
				'title' => __( 'Bookings and appointments', 'refraction' ),
				'text' => __( 'Who, how to reach them, a day and a time.', 'refraction' ),
				'icon' => 'calendar-month',
				'singular' => __( 'Booking', 'refraction' ),
				'statuses' => [ [ __( 'Requested', 'refraction' ), 'warning' ], [ __( 'Confirmed', 'refraction' ), 'primary' ], [ __( 'Done', 'refraction' ), 'success' ], [ __( 'Cancelled', 'refraction' ), 'danger' ] ],
				'fields' => [ [ 'name', __( 'Name', 'refraction' ), 'name', true ], [ 'email', __( 'Email', 'refraction' ), 'email', true ], [ 'phone', __( 'Phone', 'refraction' ), 'phone', false ], [ 'date', __( 'Day', 'refraction' ), 'day', true ], [ 'time', __( 'Time', 'refraction' ), 'time', false ], [ 'textarea', __( 'Notes', 'refraction' ), 'notes', false ] ],
			],
			'order' => [
				'title' => __( 'Orders and requests', 'refraction' ),
				'text' => __( 'What they want, how many, and how to reach them.', 'refraction' ),
				'icon' => 'shopping-cart',
				'singular' => __( 'Order', 'refraction' ),
				'statuses' => [ [ __( 'New', 'refraction' ), 'primary' ], [ __( 'Paid', 'refraction' ), 'info' ], [ __( 'Sent', 'refraction' ), 'success' ] ],
				'fields' => [ [ 'name', __( 'Name', 'refraction' ), 'name', true ], [ 'email', __( 'Email', 'refraction' ), 'email', true ], [ 'phone', __( 'Phone', 'refraction' ), 'phone', false ], [ 'text', __( 'What would you like?', 'refraction' ), 'item', true ], [ 'number', __( 'How many', 'refraction' ), 'quantity', false ], [ 'textarea', __( 'Notes', 'refraction' ), 'notes', false ] ],
			],
			'registration' => [
				'title' => __( 'Sign-ups and registrations', 'refraction' ),
				'text' => __( 'People joining a class, a team or a list.', 'refraction' ),
				'icon' => 'badge',
				'singular' => __( 'Registration', 'refraction' ),
				'statuses' => [ [ __( 'New', 'refraction' ), 'primary' ], [ __( 'Approved', 'refraction' ), 'success' ], [ __( 'Declined', 'refraction' ), 'danger' ] ],
				'fields' => [ [ 'name', __( 'Name', 'refraction' ), 'name', true ], [ 'email', __( 'Email', 'refraction' ), 'email', true ], [ 'phone', __( 'Phone', 'refraction' ), 'phone', false ], [ 'country', __( 'Country', 'refraction' ), 'country', false ] ],
			],
			'survey' => [
				'title' => __( 'Surveys and feedback', 'refraction' ),
				'text' => __( 'A rating and what they think.', 'refraction' ),
				'icon' => 'checklist',
				'singular' => __( 'Response', 'refraction' ),
				'statuses' => [ [ __( 'New', 'refraction' ), 'primary' ], [ __( 'Read', 'refraction' ), 'success' ] ],
				'fields' => [ [ 'rating', __( 'How would you rate us?', 'refraction' ), 'rating', true ], [ 'textarea', __( 'What could we do better?', 'refraction' ), 'feedback', false ], [ 'email', __( 'Email (if you would like a reply)', 'refraction' ), 'email', false ] ],
			],
			'blank' => [
				'title' => __( 'Blank form', 'refraction' ),
				'text' => __( 'A name and an email to begin; add the rest in the editor.', 'refraction' ),
				'icon' => 'grid-view',
				'singular' => __( 'Record', 'refraction' ),
				'statuses' => [ [ __( 'New', 'refraction' ), 'primary' ], [ __( 'Done', 'refraction' ), 'success' ] ],
				'fields' => [ [ 'name', __( 'Name', 'refraction' ), 'name', true ], [ 'email', __( 'Email', 'refraction' ), 'email', true ] ],
			],
		];
	}

	/** The form wizard's dialog, printed once on the Builder page. */
	public static function render_form_wizard(): void {
		$kinds = [];

		foreach ( self::kinds() as $key => $kind ) {
			$kinds[ $key ] = [ $kind['title'], $kind['text'], $kind['icon'] ];
		}

		$starters = [];

		foreach ( Starters::all() as $key => $starter ) {
			$starters[ 'starter:' . $key ] = [ $starter['title'], wp_trim_words( $starter['text'], 16 ), 'layers' ];
		}

		$steps = [
			[
				__( 'Name it', 'refraction' ),
				__( 'What the form and its records are called', 'refraction' ),
				self::text( 'name', __( 'Form name', 'refraction' ), [ 'required' => true, 'placeholder' => __( 'Airport bookings', 'refraction' ), 'help' => __( 'Its name in Refraction > Builder, where its records are kept.', 'refraction' ) ] )
				. self::text( 'description', __( 'What it is for', 'refraction' ), [ 'placeholder' => __( 'Bookings from the airport page', 'refraction' ), 'summary' => __( 'Description', 'refraction' ) ] ),
			],
			[
				__( 'Choose its type', 'refraction' ),
				__( 'The fields and statuses it starts with', 'refraction' ),
				self::choices( 'kind', __( 'What will people send with it?', 'refraction' ), $kinds, [ 'checked' => 'contact', 'summary' => __( 'Type', 'refraction' ) ] )
				. ( $starters ? self::choices( 'kind', __( 'Or start from a ready-made form', 'refraction' ), $starters, [ 'summary' => __( 'Type', 'refraction' ), 'columns' => 1 ] ) : '' ),
			],
			[
				__( 'Options', 'refraction' ),
				__( 'Layout, who can send it and emails', 'refraction' ),
				self::choices( 'layout', __( 'Layout', 'refraction' ), [
					'single' => [ __( 'One page', 'refraction' ), __( 'Every field at once.', 'refraction' ), 'web' ],
					'steps' => [ __( 'In steps', 'refraction' ), __( 'Their details first, then the rest, with Back and Next.', 'refraction' ), 'linear-scale' ],
				], [ 'checked' => 'single', 'show_if' => 'kind!=starter:*' ] )
				. self::toggle( 'public_form', __( 'Accept submissions from visitors', 'refraction' ), true, __( 'Off: only you add records, from the admin.', 'refraction' ) )
				. self::toggle( 'notify', __( 'Email me each new entry', 'refraction' ), true )
				. self::text( 'notify_to', __( 'Send them to', 'refraction' ), [ 'type' => 'email', 'value' => (string) get_option( 'admin_email' ), 'show_if' => 'notify=yes', 'summary' => __( 'Emails go to', 'refraction' ) ] ),
			],
			[
				__( 'Last look', 'refraction' ),
				__( 'Check it, then make it', 'refraction' ),
				self::review( __( 'The form is made with these settings and added to your collections. You can open it in the editor from there to change its fields and design.', 'refraction' ) ),
			],
		];

		self::render( self::DIALOG, __( 'New form', 'refraction' ), self::ACTION, $steps, __( 'Create form', 'refraction' ) );
	}

	/**
	 * The page elements of a new form of this kind: its fields in one column, or in two steps (their details, then the
	 * rest) inside a Steps widget.
	 */
	public static function form_elements( string $kind, string $layout ): array {
		$id = static fn(): string => Utils::generate_random_string();
		$fields = array_map( static function ( array $field ) use ( $id ): array {
			[ $type, $label, $key, $required ] = $field;
			$settings = [ 'field_label' => $label, 'field_key' => $key ] + ( $required ? [ 'field_required' => 'yes' ] : [] );

			return [ 'id' => $id(), 'elType' => 'widget', 'widgetType' => 'rfb-field-' . $type, 'settings' => $settings, 'elements' => [] ];
		}, self::kinds()[ $kind ]['fields'] ?? self::kinds()['blank']['fields'] );
		$box = static fn( array $elements, array $settings = [] ): array => [ 'id' => $id(), 'elType' => 'container', 'isInner' => true, 'settings' => $settings + [ 'content_width' => 'full', 'flex_direction' => 'column' ], 'elements' => $elements ];

		if ( 'steps' === $layout && count( $fields ) > 1 ) {
			// Their details first (name, email, phone, country), the rest after; never an empty step.
			$details = array_values( array_filter( $fields, static fn( $f ) => in_array( substr( $f['widgetType'], 11 ), [ 'name', 'email', 'phone', 'country' ], true ) ) );
			$rest = array_values( array_filter( $fields, static fn( $f ) => ! in_array( $f, $details, true ) ) );

			if ( ! $details || ! $rest ) {
				$details = array_slice( $fields, 0, (int) ceil( count( $fields ) / 2 ) );
				$rest = array_slice( $fields, count( $details ) );
			}

			$inner = [
				'id' => $id(),
				'elType' => 'widget',
				'widgetType' => Editor_Forms::STEPS,
				'settings' => [ 'steps' => [ [ '_id' => $id(), 'step_title' => __( 'Your details', 'refraction' ) ], [ '_id' => $id(), 'step_title' => __( 'Your request', 'refraction' ) ] ] ],
				'elements' => [ $box( $details, [ '_title' => __( 'Step 1', 'refraction' ) ] ), $box( $rest, [ '_title' => __( 'Step 2', 'refraction' ) ] ) ],
			];
			$fields = [ $inner ];
		}

		return [ [ 'id' => $id(), 'elType' => 'container', 'isInner' => false, 'settings' => [ 'content_width' => 'full', 'flex_direction' => 'column' ], 'elements' => $fields ] ];
	}

	/** Makes the form from the wizard's answers: its Form page (which makes its collection), then back to the list. */
	public function handle(): void {
		if ( ! Module::can_manage() ) {
			wp_die( esc_html__( 'You do not have permission to manage the Builder.', 'refraction' ), 403 );
		}

		check_admin_referer( self::ACTION );

		// phpcs:disable WordPress.Security.NonceVerification.Missing -- Checked above.
		$get = static fn( string $key ): string => isset( $_POST[ $key ] ) ? trim( sanitize_text_field( wp_unslash( $_POST[ $key ] ) ) ) : '';
		$name = $get( 'name' );
		$kind = $get( 'kind' );
		$layout = 'steps' === $get( 'layout' ) ? 'steps' : 'single';
		$notify_to = sanitize_email( $get( 'notify_to' ) );
		// phpcs:enable

		if ( '' === $name ) {
			wp_safe_redirect( Admin_Page::url( [ 'wizard' => 'name' ] ) );
			exit;
		}

		$starter = 0 === strpos( $kind, 'starter:' ) ? substr( $kind, 8 ) : '';
		$data = '' !== $starter ? Starters::data( $starter ) : null;
		$kind = isset( self::kinds()[ $kind ] ) ? $kind : 'blank';
		$type = self::kinds()[ $kind ];
		$id = static fn(): string => Utils::generate_random_string();

		$settings = $data ? (array) $data['settings'] : [
			'rfb_singular' => $type['singular'],
			'rfb_icon' => $type['icon'],
			'rfb_statuses' => array_map( static fn( $s ) => [ '_id' => $id(), 'label' => $s[0], 'color' => $s[1] ], $type['statuses'] ),
		];
		$settings = array_merge( $settings, [
			'rfb_description' => $get( 'description' ) ?: ( $settings['rfb_description'] ?? '' ),
			'rfb_public_form' => 'yes' === $get( 'public_form' ) ? 'yes' : '',
			'rfb_notify_enabled' => 'yes' === $get( 'notify' ) && '' !== $notify_to ? 'yes' : '',
			'rfb_notify_to' => $notify_to,
		] );

		$document = Plugin::$instance->documents->create( Form_Document::TYPE, [ 'post_title' => $name, 'post_status' => 'publish' ] );

		if ( is_wp_error( $document ) || ! $document ) {
			wp_die( esc_html__( 'The form could not be made.', 'refraction' ) );
		}

		$document->save( [ 'elements' => $data ? $data['elements'] : self::form_elements( $kind, $layout ), 'settings' => $settings ] );
		$slug = (string) get_post_meta( (int) $document->get_main_id(), Editor_Forms::META_COLLECTION, true );

		wp_safe_redirect( Admin_Page::url( [ 'created' => $slug ] ) );
		exit;
	}
}
