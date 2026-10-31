<?php
namespace Refraction\Modules\FormBuilder\Classes;

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

		return 'open' === $state && $settings['require_login'] && ! is_user_logged_in() ? 'login' : $state;
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
		$css = Style::scoped_css( $style, '#' . $anchor );
		$wrap .= '' !== $css ? '<style>' . $css . '</style>' : ''; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Sanitised by Css_Sanitizer; no markup survives it.

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		if ( isset( $_GET['rfb_done'] ) && $slug === sanitize_text_field( wp_unslash( $_GET['rfb_done'] ) ) ) {
			return $wrap . '<div class="rfb-alert rfb-alert-success" role="status">' . esc_html( $definition['success_message'] ) . '</div></div>';
		}

		$availability = $this->availability( $definition );

		if ( 'login' === $availability ) {
			return $wrap . '<div class="rfb-alert rfb-alert-info" role="status">' . sprintf( /* translators: %s: login link. */ esc_html__( 'Please %s to use this form.', 'refraction' ), '<a href="' . esc_url( wp_login_url( get_permalink() ?: home_url( '/' ) ) ) . '">' . esc_html__( 'log in', 'refraction' ) . '</a>' ) . '</div></div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
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
		$ctx = [ 'hidden' => $this->hidden_values( $definition ) ];
		$i18n = [
			'required' => __( 'This field is required.', 'refraction' ),
			'tooBig' => __( '%s is larger than the allowed size.', 'refraction' ),
			'badType' => __( '%s is not an allowed file type.', 'refraction' ),
			'tooMany' => __( 'You can choose at most %d files.', 'refraction' ),
			'step' => __( 'Step %1$d of %2$d', 'refraction' ),
			'progress' => __( 'Form progress', 'refraction' ),
		];

		ob_start();
		echo '<form class="rfb-form" method="post" enctype="multipart/form-data" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '" novalidate data-rfb-form data-rfb-progress="' . esc_attr( $settings['progress'] ) . '" data-rfb-next="' . esc_attr( $settings['next_text'] ) . '" data-rfb-back="' . esc_attr( $settings['back_text'] ) . '" data-rfb-i18n="' . esc_attr( (string) wp_json_encode( $i18n ) ) . '">';
		echo '<input type="hidden" name="action" value="' . esc_attr( self::ACTION_SUBMIT ) . '"><input type="hidden" name="collection" value="' . esc_attr( $slug ) . '"><input type="hidden" name="rfb_t" value="' . esc_attr( $this->time_token() ) . '">';

		if ( $settings['honeypot'] ) {
			echo '<div class="rfb-hp" aria-hidden="true"><label>' . esc_html__( 'Leave this field empty', 'refraction' ) . '<input type="text" name="rfb_website" tabindex="-1" autocomplete="off"></label></div>';
		}

		wp_nonce_field( self::ACTION_SUBMIT . $slug, '_rfb_nonce' );

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

		wp_safe_redirect( add_query_arg( 'rfb_done', $slug, $back ) . '#rfb-form-' . $slug );
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
					$out .= '<td data-label="' . esc_attr( $field['label'] ) . '">' . Field_Renderer::cell( $field, $record['values'][ $field['key'] ] ?? '' ) . '</td>';
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

					$cell = Field_Renderer::cell( $field, $record['values'][ $field['key'] ] ?? '' );
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
