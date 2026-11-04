<?php
namespace Refraction\Modules\FormBuilder\Classes;

use Refraction\Plugin;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * The public side: [refraction_form collection="slug"] prints the submission form, [refraction_records collection="slug"
 * status="published" view="cards|table"] prints the records the owner chose to show.
 *
 * Both only work for a collection that opted in (public_form / public_list). A submission is checked with a nonce, an
 * optional honeypot, a minimum fill time and a per-visitor hourly limit (all set in the collection's Advanced tab), the
 * form's opening window and submission cap, then validated by Schema, its uploads checked by Uploads, and stored. The
 * public list shows only fields marked "Show publicly".
 */
class Shortcodes {

	const ACTION_SUBMIT = 'refraction_fb_submit';
	const ACTION_TOKEN = 'refraction_fb_token';

	private Collections $collections;
	private Records $records;
	private Uploads $uploads;
	private bool $styled = false;

	public function __construct( Collections $collections, Records $records ) {
		$this->collections = $collections;
		$this->records = $records;
		$this->uploads = new Uploads();

		add_shortcode( 'refraction_form', [ $this, 'form' ] );
		add_shortcode( 'refraction_records', [ $this, 'list' ] );
		add_action( 'admin_post_nopriv_' . self::ACTION_SUBMIT, [ $this, 'handle_submit' ] );
		add_action( 'admin_post_' . self::ACTION_SUBMIT, [ $this, 'handle_submit' ] );
		add_action( 'wp_ajax_nopriv_' . self::ACTION_TOKEN, [ $this, 'fresh_token' ] );
		add_action( 'wp_ajax_' . self::ACTION_TOKEN, [ $this, 'fresh_token' ] );
	}

	/**
	 * A fresh nonce and time token for a form on a page that came from a page cache (LiteSpeed and the like keep the
	 * page for days, while a nonce lasts a day): frontend.js asks for them when the page is older than a few minutes.
	 * Only for a collection that takes submissions; it reveals nothing else.
	 */
	public function fresh_token(): void {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- This hands out the nonce.
		$slug = isset( $_REQUEST['collection'] ) ? Schema::slug( wp_unslash( $_REQUEST['collection'] ) ) : '';
		$definition = '' !== $slug ? $this->collections->get( $slug ) : null;

		nocache_headers();

		if ( ! $definition || ! $definition['public_form'] ) {
			wp_send_json_error( null, 404 );
		}

		wp_send_json_success( [ 'nonce' => wp_create_nonce( self::ACTION_SUBMIT . $slug ), 't' => $this->time_token(), 'issued' => time() ] );
	}

	public static function enqueue(): void {
		static $done = false;

		if ( $done ) {
			return;
		}

		$done = true;
		$min = Utils::is_script_debug() ? '' : '.min';
		wp_enqueue_style( 'refraction-form-builder-front', REFRACTION_ASSETS_URL . 'css/modules/form-builder/front' . $min . '.css', [], REFRACTION_VERSION );
		wp_enqueue_script( 'refraction-form-builder-front', REFRACTION_ASSETS_URL . 'js/form-builder-frontend' . $min . '.js', [], REFRACTION_VERSION, true );
	}

	private function notice( string $message, string $type = 'info' ): string {
		return '<div class="rfb-front"><div class="rfb-alert rfb-alert-' . esc_attr( $type ) . '" role="status">' . esc_html( $message ) . '</div></div>';
	}

	/** Shown to administrators only, so a typo in the shortcode is easy to find; visitors see nothing. */
	private function admin_notice( string $message ): string {
		return current_user_can( 'manage_options' ) ? $this->notice( $message, 'warning' ) : '';
	}

	private function now(): string {
		return wp_date( 'Y-m-d H:i' );
	}

	/** open | not_yet | closed | full | login */
	private function availability( array $definition ): string {
		$settings = $definition['settings'];
		$state = Settings::availability( $settings, $this->now(), '' !== $settings['opens'] || $settings['max_submissions'] > 0 ? $this->records->count( $definition['slug'] ) : 0 );

		$state = 'open' === $state && $settings['require_login'] && ! is_user_logged_in() ? 'login' : $state;

		/**
		 * Whether the form takes a submission now: open, not_yet, closed, full, login, or denied (the visitor may not
		 * use it, as an event form for staff only).
		 *
		 * @param string $state
		 * @param array  $definition
		 */
		return (string) apply_filters( 'refraction/form_builder/availability', $state, $definition );
	}

	// ---------------------------------------------------------------- form

	public function form( $atts ): string {
		$atts = shortcode_atts( [ 'collection' => '' ], (array) $atts, 'refraction_form' );
		$definition = $this->collections->get( Schema::slug( $atts['collection'] ) );

		if ( ! $definition ) {
			return $this->admin_notice( __( 'Refraction form: that collection does not exist.', 'refraction' ) );
		}

		if ( ! $definition['public_form'] ) {
			return $this->admin_notice( __( 'Refraction form: turn on "Accept submissions from visitors" in the collection design first.', 'refraction' ) );
		}

		self::enqueue();
		$slug = $definition['slug'];
		$settings = $definition['settings'];
		$anchor = 'rfb-form-' . $slug;
		$style = $definition['style'];
		$wrap = '<div class="rfb-front rfb-form-wrap ' . esc_attr( Style::classes( $style ) ) . '" id="' . esc_attr( $anchor ) . '" style="' . esc_attr( Style::inline( $style ) ) . '">';
		$css = Field_Style::css( $definition, '#' . $anchor ) . Style::scoped_css( $style, '#' . $anchor );
		$wrap .= '' !== $css ? '<style>' . $css . '</style>' : ''; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Sanitised by Css_Sanitizer; no markup survives it.

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		if ( isset( $_GET['rfb_done'] ) && $slug === sanitize_text_field( wp_unslash( $_GET['rfb_done'] ) ) ) {
			/**
			 * The success message after a submission (escaped text); modules can add to it, such as a link to the event
			 * an event form made.
			 *
			 * @param string $html
			 * @param array  $definition
			 */
			return $wrap . '<div class="rfb-alert rfb-alert-success" role="status">' . apply_filters( 'refraction/form_builder/success_html', esc_html( $definition['success_message'] ), $definition ) . '</div></div>';
		}

		$availability = $this->availability( $definition );

		if ( 'login' === $availability ) {
			return $wrap . '<div class="rfb-alert rfb-alert-info" role="status">' . sprintf( /* translators: %s: login link. */ esc_html__( 'Please %s to use this form.', 'refraction' ), '<a href="' . esc_url( wp_login_url( get_permalink() ?: home_url( '/' ) ) ) . '">' . esc_html__( 'log in', 'refraction' ) . '</a>' ) . '</div></div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		}

		if ( 'denied' === $availability ) {
			return $wrap . '<div class="rfb-alert rfb-alert-info" role="status">' . esc_html__( 'This form is only for the site\'s staff.', 'refraction' ) . '</div></div>';
		}

		if ( 'open' !== $availability ) {
			return $wrap . '<div class="rfb-alert rfb-alert-info" role="status">' . esc_html( $settings['closed_message'] ) . '</div></div>';
		}

		$state = $this->read_state();
		$values = $state && $state['collection'] === $slug ? $state['values'] : [];
		$errors = $state && $state['collection'] === $slug ? $state['errors'] : [];
		$out = $wrap;

		if ( $errors ) {
			$out .= '<div class="rfb-alert rfb-alert-error" role="alert">' . esc_html( ! empty( $errors['_form'] ) ? $errors['_form'] : __( 'Please fix the highlighted fields.', 'refraction' ) ) . '</div>';
		}

		$steps = Schema::steps( $definition );
		$ctx = [ 'hidden' => $this->hidden_values( $definition ), 'type_styles' => $definition['type_styles'], 'money' => $settings ];
		$i18n = [
			'required' => __( 'This field is required.', 'refraction' ),
			'tooBig' => __( '%s is larger than the allowed size.', 'refraction' ),
			'badType' => __( '%s is not an allowed file type.', 'refraction' ),
			'tooMany' => __( 'You can choose at most %d files.', 'refraction' ),
			'number' => __( 'Enter a number.', 'refraction' ),
			'lowest' => __( 'The lowest allowed value is %s.', 'refraction' ),
			'highest' => __( 'The highest allowed value is %s.', 'refraction' ),
			'step' => __( 'Step %1$d of %2$d', 'refraction' ),
			'progress' => __( 'Form progress', 'refraction' ),
		];

		$doc_id = Editor_Forms::doc_for( $slug );

		// A form built in the page editor prints its page inside the form; its field widgets read the answers and errors here.
		if ( $doc_id ) {
			Editor_Forms::begin( [ 'definition' => $definition, 'keys' => (array) get_post_meta( $doc_id, Editor_Forms::META_KEYS, true ), 'values' => $values, 'errors' => $errors, 'ctx' => $ctx ] );
			ob_start();
			$this->form_open( $slug, $settings, $i18n, 'rfb-form-editor' );
			// Printed live (see Form_Document::print_elements), and no field is put off as a cached placeholder either.
			add_filter( 'refraction/element/should_render_shortcode', '__return_false', 999 );
			// On the Form page's own address the builder's recursion guard would print nothing: the page is printed
			// directly (Form_Document::print_elements prints its elements as usual while this form is rendering).
			$frontend = Plugin::$instance->frontend;
			echo get_the_ID() === $doc_id ? $frontend->get_builder_content( $doc_id, true ) : $frontend->get_builder_content_for_display( $doc_id, true ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Rendered by the editor's own widgets.
			remove_filter( 'refraction/element/should_render_shortcode', '__return_false', 999 );

			if ( ! Editor_Forms::has_submit( (array) json_decode( (string) get_post_meta( $doc_id, '_refraction_data', true ), true ) ) ) {
				echo '<div class="rfb-actions"><button type="submit" class="rfb-btn rfb-btn-primary rfb-submit">' . esc_html( $settings['submit_text'] ) . '</button></div>';
			}

			echo '</form>';
			Editor_Forms::end();

			return $out . ob_get_clean() . '</div>';
		}

		ob_start();
		$this->form_open( $slug, $settings, $i18n, 'rfb-form' );

		foreach ( $steps as $step ) {
			echo '<section class="rfb-step" data-rfb-step data-rfb-title="' . esc_attr( $step['title'] ) . '">';
			echo count( $steps ) > 1 && $step['step'] ? Field_Renderer::step_head( $step['step'] ) : ''; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts.
			echo '<div class="rfb-form-grid">';
			Field_Renderer::render_fields( $step['fields'], $values, 'values', $errors, $ctx );
			echo '</div></section>';
		}

		echo '<div class="rfb-actions"><button type="submit" class="rfb-btn rfb-btn-primary rfb-submit">' . esc_html( $settings['submit_text'] ) . '</button></div></form>';

		return $out . ob_get_clean() . '</div>';
	}

	/** The opening form tag with everything the submit handler checks (action, collection, time token, honeypot, nonce). */
	private function form_open( string $slug, array $settings, array $i18n, string $class ): void {
		echo '<form class="' . esc_attr( $class ) . '" method="post" enctype="multipart/form-data" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '" novalidate data-rfb-form data-rfb-issued="' . esc_attr( (string) time() ) . '" data-rfb-token-url="' . esc_url( add_query_arg( [ 'action' => self::ACTION_TOKEN, 'collection' => $slug ], admin_url( 'admin-ajax.php' ) ) ) . '" data-rfb-progress="' . esc_attr( $settings['progress'] ) . '" data-rfb-next="' . esc_attr( $settings['next_text'] ) . '" data-rfb-back="' . esc_attr( $settings['back_text'] ) . '" data-rfb-money="' . esc_attr( (string) wp_json_encode( Money::js( Money::config( $settings ) ) ) ) . '" data-rfb-i18n="' . esc_attr( (string) wp_json_encode( $i18n ) ) . '">';
		echo '<input type="hidden" name="action" value="' . esc_attr( self::ACTION_SUBMIT ) . '"><input type="hidden" name="collection" value="' . esc_attr( $slug ) . '"><input type="hidden" name="rfb_t" value="' . esc_attr( $this->time_token() ) . '">';

		if ( $settings['honeypot'] ) {
			echo '<div class="rfb-hp" aria-hidden="true"><label>' . esc_html__( 'Leave this field empty', 'refraction' ) . '<input type="text" name="rfb_website" tabindex="-1" autocomplete="off"></label></div>';
		}

		wp_nonce_field( self::ACTION_SUBMIT . $slug, '_rfb_nonce' );
	}

	/** Values for hidden fields that read from the request (query string, page address, referrer, user, date). */
	private function hidden_values( array $definition ): array {
		$resolved = [];

		foreach ( Schema::walk( $definition['fields'] ) as $field ) {
			if ( 'hidden' !== $field['type'] ) {
				continue;
			}

			switch ( $field['source'] ) {
				case 'query':
					// phpcs:ignore WordPress.Security.NonceVerification.Recommended
					$param = Schema::key( $field['default'] );
					$resolved[ $field['key'] ] = '' !== $param && isset( $_GET[ $param ] ) && is_scalar( $_GET[ $param ] ) ? Schema::text( wp_unslash( $_GET[ $param ] ), 255 ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
					break;
				case 'page_url':
					$resolved[ $field['key'] ] = Schema::text( esc_url_raw( remove_query_arg( [ 'rfb_e', 'rfb_done' ], home_url( add_query_arg( [] ) ) ) ), 255 );
					break;
				case 'referrer':
					$resolved[ $field['key'] ] = Schema::text( (string) wp_get_raw_referer(), 255 );
					break;
				case 'user_id':
					$resolved[ $field['key'] ] = is_user_logged_in() ? (string) get_current_user_id() : '';
					break;
				case 'user_email':
					$user = wp_get_current_user();
					$resolved[ $field['key'] ] = $user->exists() ? $user->user_email : '';
					break;
				case 'date':
					$resolved[ $field['key'] ] = wp_date( 'Y-m-d' );
					break;
				default:
					$resolved[ $field['key'] ] = $field['default'];
			}
		}

		return $resolved;
	}

	private function time_token(): string {
		$time = time();

		return $time . '.' . substr( wp_hash( 'rfb-time' . $time ), 0, 16 );
	}

	private function time_ok( string $token, int $minimum ): bool {
		$parts = explode( '.', $token, 2 );

		if ( 2 !== count( $parts ) || ! ctype_digit( $parts[0] ) || ! hash_equals( substr( wp_hash( 'rfb-time' . $parts[0] ), 0, 16 ), $parts[1] ) ) {
			return false;
		}

		$age = time() - (int) $parts[0];

		return $age >= $minimum && $age <= DAY_IN_SECONDS * 2;
	}

	/** Errors and the visitor's input travel through a short-lived transient named by a random token in the URL. */
	private function read_state(): ?array {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$token = isset( $_GET['rfb_e'] ) ? preg_replace( '/[^a-zA-Z0-9]/', '', wp_unslash( $_GET['rfb_e'] ) ) : '';
		$state = '' !== $token ? get_transient( 'rfb_state_' . $token ) : false;

		return is_array( $state ) ? $state : null;
	}

	private function over_limit( int $limit ): bool {
		if ( $limit < 1 ) {
			return false;
		}

		$ip = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
		$key = 'rfb_rate_' . substr( wp_hash( $ip ), 0, 20 );
		$count = (int) get_transient( $key );

		if ( $count >= $limit ) {
			return true;
		}

		set_transient( $key, $count + 1, HOUR_IN_SECONDS );

		return false;
	}

	public function handle_submit(): void {
		// phpcs:disable WordPress.Security.NonceVerification.Missing -- The nonce is verified below, after the collection is known.
		$slug = isset( $_POST['collection'] ) ? Schema::slug( wp_unslash( $_POST['collection'] ) ) : '';
		$definition = $this->collections->get( $slug );
		$back = wp_validate_redirect( (string) wp_get_referer(), home_url( '/' ) );
		$back = remove_query_arg( [ 'rfb_done', 'rfb_e' ], $back );

		if ( ! $definition || ! $definition['public_form'] ) {
			wp_safe_redirect( $back );
			exit;
		}

		$settings = $definition['settings'];
		$fail = function ( array $errors, array $values ) use ( $slug, $back ): void {
			$token = wp_generate_password( 12, false );
			set_transient( 'rfb_state_' . $token, [ 'collection' => $slug, 'values' => $values, 'errors' => $errors ], 10 * MINUTE_IN_SECONDS );
			wp_safe_redirect( add_query_arg( 'rfb_e', $token, $back ) . '#rfb-form-' . $slug );
			exit;
		};

		$input = isset( $_POST['values'] ) ? (array) wp_unslash( $_POST['values'] ) : [];
		$nonce = isset( $_POST['_rfb_nonce'] ) ? sanitize_text_field( wp_unslash( $_POST['_rfb_nonce'] ) ) : '';
		$token = isset( $_POST['rfb_t'] ) ? sanitize_text_field( wp_unslash( $_POST['rfb_t'] ) ) : '';
		$honeypot = isset( $_POST['rfb_website'] ) ? (string) wp_unslash( $_POST['rfb_website'] ) : '';
		// phpcs:enable

		if ( $settings['honeypot'] && '' !== $honeypot ) {
			// A bot filled the hidden field: pretend it worked so it does not retry.
			wp_safe_redirect( add_query_arg( 'rfb_done', $slug, $back ) . '#rfb-form-' . $slug );
			exit;
		}

		if ( ! wp_verify_nonce( $nonce, self::ACTION_SUBMIT . $slug ) ) {
			$fail( [ '_form' => __( 'This page expired. Please try again.', 'refraction' ) ], [] );
		}

		$availability = $this->availability( $definition );

		if ( 'login' === $availability ) {
			$fail( [ '_form' => __( 'Please log in to use this form.', 'refraction' ) ], [] );
		}

		if ( 'denied' === $availability ) {
			$fail( [ '_form' => __( 'This form is only for the site\'s staff.', 'refraction' ) ], [] );
		}

		if ( 'open' !== $availability ) {
			$fail( [ '_form' => $settings['closed_message'] ], [] );
		}

		if ( ! $this->time_ok( $token, $settings['min_seconds'] ) ) {
			$fail( [ '_form' => __( 'That was submitted too quickly. Please try again.', 'refraction' ) ], Schema::validate( $definition, $input )['values'] );
		}

		if ( $this->over_limit( $settings['hourly_limit'] ) ) {
			$fail( [ '_form' => __( 'Too many submissions from your connection. Please try again later.', 'refraction' ) ], Schema::validate( $definition, $input )['values'] );
		}

		$stored = $this->uploads->process( $definition, $_FILES, [], [], $input ); // phpcs:ignore WordPress.Security.NonceVerification.Missing, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- Nonce checked above; Uploads validates every entry.
		$result = Schema::validate( $definition, $input, [], $stored['files'] );
		// An upload's own message (wrong type, too large) is more helpful than the generic "choose a file".
		$errors = $stored['errors'] + $result['errors'];

		// Files of fields that ended up hidden by a condition, or of a submission that failed, are not kept.
		Uploads::prune( $slug, $stored['added'], $errors ? [] : $result['values'] );

		if ( $errors ) {
			$fail( $errors, $result['values'] );
		}

		$id = $this->records->insert( $definition, $result['values'], $definition['default_status'] );

		if ( ! $id ) {
			Uploads::prune( $slug, $stored['added'], [] );
			$fail( [ '_form' => __( 'Your submission could not be saved. Please try again.', 'refraction' ) ], $result['values'] );
		}

		$this->notify( $id, $definition, $result['values'] );
		$this->webhook( $id, $definition, $result['values'] );

		/**
		 * Fires after a visitor's submission is saved.
		 *
		 * @param int   $id         Record id.
		 * @param array $definition Collection definition.
		 * @param array $values     Saved values.
		 */
		do_action( 'refraction/form_builder/submitted', $id, $definition, $result['values'] );

		if ( '' !== $settings['redirect_url'] ) {
			wp_redirect( $settings['redirect_url'] ); // phpcs:ignore WordPress.Security.SafeRedirect.wp_redirect_wp_redirect -- An address the site owner chose in the collection settings.
			exit;
		}

		/**
		 * Where the visitor goes after a saved submission (the form's page, which shows the success message).
		 *
		 * @param string $url
		 * @param int    $id         Record id.
		 * @param array  $definition
		 */
		$done = (string) apply_filters( 'refraction/form_builder/done_url', add_query_arg( 'rfb_done', $slug, $back ), $id, $definition );
		wp_safe_redirect( $done . '#rfb-form-' . $slug );
		exit;
	}

	/** Email the people named in the Advanced tab: every answer, plus a link to the record in the admin. */
	private function notify( int $id, array $definition, array $values ): void {
		$settings = $definition['settings'];

		if ( ! $settings['notify_enabled'] ) {
			return;
		}

		$lines = [];

		foreach ( Schema::value_fields( $definition ) as $field ) {
			if ( 'hidden' === $field['type'] ) {
				continue;
			}

			$lines[] = $field['label'] . ': ' . Schema::display( $field, $values[ $field['key'] ] ?? '' );
		}

		$title = Schema::title( $definition, $values, $id );
		$subject = '' !== $settings['notify_subject'] ? $settings['notify_subject'] : sprintf( /* translators: 1: record type, 2: title. */ __( 'New %1$s: %2$s', 'refraction' ), $definition['singular'], $title );
		$subject = preg_replace( '/[\r\n]+/', ' ', $subject );
		$body = implode( "\n", $lines ) . "\n\n" . add_query_arg( [ 'view' => 'record', 'collection' => $definition['slug'], 'record' => $id ], admin_url( 'admin.php?page=' . Admin_Page::SLUG ) );
		$headers = [];
		$reply_to = $settings['reply_to_field'] ? (string) ( $values[ $settings['reply_to_field'] ] ?? '' ) : '';

		if ( '' !== $reply_to && false !== filter_var( $reply_to, FILTER_VALIDATE_EMAIL ) ) {
			$headers[] = 'Reply-To: ' . $reply_to;
		}

		wp_mail( $settings['notify_to'], $subject, $body, $headers );
	}

	/** POST the submission as JSON to the address the site owner configured (never blocks the visitor, never follows redirects to private hosts). */
	private function webhook( int $id, array $definition, array $values ): void {
		$url = $definition['settings']['webhook_url'];

		if ( '' === $url ) {
			return;
		}

		$labelled = [];

		foreach ( Schema::value_fields( $definition ) as $field ) {
			if ( 'hidden' !== $field['type'] || isset( $values[ $field['key'] ] ) ) {
				$labelled[ $field['key'] ] = [ 'label' => $field['label'], 'value' => 'file' === $field['type'] ? array_column( (array) ( $values[ $field['key'] ] ?? [] ), 'name' ) : ( $values[ $field['key'] ] ?? '' ) ];
			}
		}

		wp_safe_remote_post(
			$url,
			[
				'timeout' => 5,
				'blocking' => false,
				'redirection' => 0,
				'headers' => [ 'Content-Type' => 'application/json' ],
				'body' => wp_json_encode( [ 'collection' => $definition['slug'], 'record' => $id, 'submitted' => gmdate( 'c' ), 'fields' => $labelled ] ),
			]
		);
	}

	// ---------------------------------------------------------------- list

	public function list( $atts ): string {
		$atts = shortcode_atts(
			[ 'collection' => '', 'status' => '', 'view' => 'cards', 'per_page' => 12, 'orderby' => '', 'order' => 'desc' ],
			(array) $atts,
			'refraction_records'
		);
		$definition = $this->collections->get( Schema::slug( $atts['collection'] ) );

		if ( ! $definition ) {
			return $this->admin_notice( __( 'Refraction records: that collection does not exist.', 'refraction' ) );
		}

		if ( ! $definition['public_list'] ) {
			return $this->admin_notice( __( 'Refraction records: turn on "Show records publicly" in the collection design first.', 'refraction' ) );
		}

		$fields = array_values( array_filter( Schema::value_fields( $definition ), static function ( $field ) {
			return $field['public'];
		} ) );

		if ( ! $fields ) {
			return $this->admin_notice( __( 'Refraction records: mark at least one field "Show publicly".', 'refraction' ) );
		}

		self::enqueue();
		$status = Schema::status( $definition, sanitize_key( $atts['status'] ) ) ? sanitize_key( $atts['status'] ) : '';
		$per_page = max( 1, min( 60, (int) $atts['per_page'] ) );
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$page = isset( $_GET['rfbp'] ) ? max( 1, absint( $_GET['rfbp'] ) ) : 1;
		$result = $this->records->query(
			$definition,
			[
				'status' => $status,
				'orderby' => Schema::key( $atts['orderby'] ),
				'order' => $atts['order'],
				'page' => $page,
				'per_page' => $per_page,
			]
		);

		if ( ! $result['items'] ) {
			return $this->notice( __( 'Nothing to show yet.', 'refraction' ) );
		}

		$table = 'table' === $atts['view'];
		$out = '<div class="rfb-front"><div class="' . ( $table ? 'rfb-public-table-wrap' : 'rfb-public-cards' ) . '">';

		if ( $table ) {
			$out .= '<table class="rfb-table"><thead><tr>';

			foreach ( $fields as $field ) {
				$out .= '<th scope="col">' . esc_html( $field['label'] ) . '</th>';
			}

			$out .= '</tr></thead><tbody>';

			foreach ( $result['items'] as $record ) {
				$out .= '<tr>';

				foreach ( $fields as $field ) {
					$out .= '<td data-label="' . esc_attr( $field['label'] ) . '">' . Field_Renderer::cell( $field, $record['values'][ $field['key'] ] ?? '', $definition['settings'] ) . '</td>';
				}

				$out .= '</tr>';
			}

			$out .= '</tbody></table>';
		} else {
			foreach ( $result['items'] as $record ) {
				$title_field = Schema::field( $definition, $definition['title_field'] );
				$title_public = $title_field && $title_field['public'];
				$out .= '<article class="rfb-public-card"><div class="rfb-card-body">';

				if ( $title_public ) {
					$out .= '<h3>' . esc_html( $record['title'] ) . '</h3>';
				}

				foreach ( $fields as $field ) {
					if ( $title_public && $field['key'] === $definition['title_field'] ) {
						continue;
					}

					$cell = Field_Renderer::cell( $field, $record['values'][ $field['key'] ] ?? '', $definition['settings'] );
					$out .= '<div class="rfb-public-row"><span class="rfb-public-label">' . esc_html( $field['label'] ) . '</span><span>' . $cell . '</span></div>';
				}

				$out .= '</div></article>';
			}
		}

		$out .= '</div>';

		if ( $result['pages'] > 1 ) {
			$out .= '<nav class="rfb-pagination" aria-label="' . esc_attr__( 'Pagination', 'refraction' ) . '">';

			for ( $number = 1; $number <= $result['pages']; $number++ ) {
				$out .= '<a class="rfb-page' . ( $number === $page ? ' is-active' : '' ) . '" href="' . esc_url( add_query_arg( 'rfbp', $number > 1 ? $number : false ) ) . '"' . ( $number === $page ? ' aria-current="page"' : '' ) . '>' . (int) $number . '</a>';
			}

			$out .= '</nav>';
		}

		return $out . '</div>';
	}
}
