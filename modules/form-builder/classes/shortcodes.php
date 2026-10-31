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
 * Both only work for a collection that opted in (public_form / public_list). A submission is checked with a nonce, a
 * hidden honeypot, a minimum fill time and a per-visitor hourly limit, then stored through the same Schema validation
 * as the admin form. The public list shows only fields marked "Show publicly".
 */
class Shortcodes {

	const ACTION_SUBMIT = 'refraction_fb_submit';
	const MIN_SECONDS = 3;
	const HOURLY_LIMIT = 10;

	private Collections $collections;
	private Records $records;
	private bool $styled = false;

	public function __construct( Collections $collections, Records $records ) {
		$this->collections = $collections;
		$this->records = $records;

		add_shortcode( 'refraction_form', [ $this, 'form' ] );
		add_shortcode( 'refraction_records', [ $this, 'list' ] );
		add_action( 'admin_post_nopriv_' . self::ACTION_SUBMIT, [ $this, 'handle_submit' ] );
		add_action( 'admin_post_' . self::ACTION_SUBMIT, [ $this, 'handle_submit' ] );
	}

	private function enqueue(): void {
		if ( $this->styled ) {
			return;
		}

		$this->styled = true;
		$min = Utils::is_script_debug() ? '' : '.min';
		wp_enqueue_style( 'refraction-form-builder-front', REFRACTION_ASSETS_URL . 'css/modules/form-builder/front' . $min . '.css', [], REFRACTION_VERSION );
	}

	private function notice( string $message, string $type = 'info' ): string {
		return '<div class="rfb-front"><div class="rfb-alert rfb-alert-' . esc_attr( $type ) . '" role="status">' . esc_html( $message ) . '</div></div>';
	}

	/** Shown to administrators only, so a typo in the shortcode is easy to find; visitors see nothing. */
	private function admin_notice( string $message ): string {
		return current_user_can( 'manage_options' ) ? $this->notice( $message, 'warning' ) : '';
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

		$this->enqueue();
		$slug = $definition['slug'];
		$anchor = 'rfb-form-' . $slug;
		$state = $this->read_state();
		$out = '<div class="rfb-front" id="' . esc_attr( $anchor ) . '">';

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		if ( isset( $_GET['rfb_done'] ) && $slug === sanitize_text_field( wp_unslash( $_GET['rfb_done'] ) ) ) {
			return $out . '<div class="rfb-alert rfb-alert-success" role="status">' . esc_html( $definition['success_message'] ) . '</div></div>';
		}

		$values = $state && $state['collection'] === $slug ? $state['values'] : [];
		$errors = $state && $state['collection'] === $slug ? $state['errors'] : [];

		if ( $errors ) {
			$out .= '<div class="rfb-alert rfb-alert-error" role="alert">' . esc_html( ! empty( $errors['_form'] ) ? $errors['_form'] : __( 'Please fix the highlighted fields.', 'refraction' ) ) . '</div>';
		}

		ob_start();
		echo '<form class="rfb-form rfb-form-grid" method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '" novalidate>';
		echo '<input type="hidden" name="action" value="' . esc_attr( self::ACTION_SUBMIT ) . '"><input type="hidden" name="collection" value="' . esc_attr( $slug ) . '">';
		echo '<input type="hidden" name="rfb_t" value="' . esc_attr( $this->time_token() ) . '">';
		echo '<div class="rfb-hp" aria-hidden="true"><label>' . esc_html__( 'Leave this field empty', 'refraction' ) . '<input type="text" name="rfb_website" tabindex="-1" autocomplete="off"></label></div>';
		wp_nonce_field( self::ACTION_SUBMIT . $slug, '_rfb_nonce' );

		foreach ( $definition['fields'] as $field ) {
			Field_Renderer::render( $field, $values[ $field['key'] ] ?? ( $values ? ( 'checkbox' === $field['type'] ? [] : '' ) : null ), 'values', $errors[ $field['key'] ] ?? '' );
		}

		echo '<div class="rfb-field rfb-w-full"><button type="submit" class="rfb-btn rfb-btn-primary">' . esc_html__( 'Submit', 'refraction' ) . '</button></div></form>';

		return $out . ob_get_clean() . '</div>';
	}

	private function time_token(): string {
		$time = time();

		return $time . '.' . substr( wp_hash( 'rfb-time' . $time ), 0, 16 );
	}

	private function time_ok( string $token ): bool {
		$parts = explode( '.', $token, 2 );

		if ( 2 !== count( $parts ) || ! ctype_digit( $parts[0] ) || ! hash_equals( substr( wp_hash( 'rfb-time' . $parts[0] ), 0, 16 ), $parts[1] ) ) {
			return false;
		}

		$age = time() - (int) $parts[0];

		return $age >= self::MIN_SECONDS && $age <= DAY_IN_SECONDS * 2;
	}

	/** Errors and the visitor's input travel through a short-lived transient named by a random token in the URL. */
	private function read_state(): ?array {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$token = isset( $_GET['rfb_e'] ) ? preg_replace( '/[^a-zA-Z0-9]/', '', wp_unslash( $_GET['rfb_e'] ) ) : '';
		$state = '' !== $token ? get_transient( 'rfb_state_' . $token ) : false;

		return is_array( $state ) ? $state : null;
	}

	private function over_limit(): bool {
		$ip = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
		$key = 'rfb_rate_' . substr( wp_hash( $ip ), 0, 20 );
		$count = (int) get_transient( $key );

		if ( $count >= self::HOURLY_LIMIT ) {
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

		if ( '' !== $honeypot ) {
			// A bot filled the hidden field: pretend it worked so it does not retry.
			wp_safe_redirect( add_query_arg( 'rfb_done', $slug, $back ) . '#rfb-form-' . $slug );
			exit;
		}

		if ( ! wp_verify_nonce( $nonce, self::ACTION_SUBMIT . $slug ) ) {
			$fail( [ '_form' => __( 'This page expired. Please try again.', 'refraction' ) ], [] );
		}

		if ( ! $this->time_ok( $token ) ) {
			$fail( [ '_form' => __( 'That was submitted too quickly. Please try again.', 'refraction' ) ], $this->safe_values( $definition, $input ) );
		}

		if ( $this->over_limit() ) {
			$fail( [ '_form' => __( 'Too many submissions from your connection. Please try again later.', 'refraction' ) ], $this->safe_values( $definition, $input ) );
		}

		$result = Schema::validate( $definition, $input );

		if ( $result['errors'] ) {
			$fail( $result['errors'], $result['values'] );
		}

		$id = $this->records->insert( $definition, $result['values'], $definition['default_status'] );

		if ( ! $id ) {
			$fail( [ '_form' => __( 'Your submission could not be saved. Please try again.', 'refraction' ) ], $result['values'] );
		}

		/**
		 * Fires after a visitor's submission is saved.
		 *
		 * @param int   $id         Record id.
		 * @param array $definition Collection definition.
		 * @param array $values     Saved values.
		 */
		do_action( 'refraction/form_builder/submitted', $id, $definition, $result['values'] );

		wp_safe_redirect( add_query_arg( 'rfb_done', $slug, $back ) . '#rfb-form-' . $slug );
		exit;
	}

	private function safe_values( array $definition, array $input ): array {
		return Schema::validate( $definition, $input )['values'];
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

		$fields = array_values( array_filter( $definition['fields'], static function ( $field ) {
			return $field['public'];
		} ) );

		if ( ! $fields ) {
			return $this->admin_notice( __( 'Refraction records: mark at least one field "Show publicly".', 'refraction' ) );
		}

		$this->enqueue();
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
