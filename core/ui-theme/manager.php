<?php

namespace Refraction\Core\Ui_Theme;

use Refraction\Core\Utils\Icons;
use Refraction\Plugin;
use Refraction\Settings;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Per-user UI theme for Refraction's own screens (admin pages and the editor UI).
 *
 * - the choice lives in user meta `refraction_ui_theme`; a site-wide default (option `refraction_ui_theme_default`)
 *   applies to users who have not chosen;
 * - the theme is printed server-side as `data-refraction-theme` on <html> (no flash), only on Refraction admin
 *   screens and in the editor window, never in the preview iframe or on the site;
 * - "Automatic" prints nothing, so nothing in assets/ui-theme applies and the UI looks exactly as it always did.
 *
 * Design adapted from Framify (kohid/Framify).
 */
class Manager {

	const AJAX_ACTION = 'refraction_save_ui_theme';

	const NONCE_ACTION = 'refraction_ui_theme';

	const TAB_ID = 'theme';

	public function __construct() {
		add_filter( 'language_attributes', [ $this, 'filter_language_attributes' ] );
		add_action( 'wp_ajax_' . self::AJAX_ACTION, [ $this, 'ajax_save' ] );

		if ( is_admin() ) {
			add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_admin_assets' ], 20 );
			add_action( 'refraction/admin/after_create_settings/' . Settings::PAGE_ID, [ $this, 'register_settings_tab' ], 12 );
		}

		add_action( 'refraction/editor/after_enqueue_styles', [ $this, 'enqueue_editor_styles' ] );
	}

	/* ---------- state ---------- */

	public static function user_choice( int $user_id = 0 ) {
		$user_id = $user_id ? $user_id : get_current_user_id();

		return $user_id ? get_user_meta( $user_id, Registry::USER_META, true ) : '';
	}

	public static function site_default(): string {
		return Registry::sanitize( get_option( Registry::SITE_OPTION, '' ) );
	}

	/** The theme to paint for a user (default: the current one). */
	public static function current( int $user_id = 0 ): string {
		return Registry::resolve( self::user_choice( $user_id ), self::site_default() );
	}

	/* ---------- where the theme applies ---------- */

	/** True on Refraction's own wp-admin screens. */
	public function is_refraction_screen(): bool {
		if ( ! is_admin() || ! function_exists( 'get_current_screen' ) ) {
			return false;
		}

		$screen = get_current_screen();

		if ( ! $screen ) {
			return false;
		}

		$post_types = apply_filters( 'refraction/ui_theme/admin_post_types', [ 'e-floating-buttons', 'e-landing-page' ] );
		$post_type = (string) $screen->post_type;
		$is_ours = false !== strpos( (string) $screen->id, 'refraction' )
			|| 0 === strpos( $post_type, 'refraction' )
			|| in_array( $post_type, $post_types, true );

		return (bool) apply_filters( 'refraction/ui_theme/is_admin_screen', $is_ours, $screen );
	}

	/** True in the editor window; false in the preview iframe (a separate request) and on the site. */
	public function is_editor_window(): bool {
		$editor = Plugin::$instance->editor;

		return $editor && $editor->is_edit_mode() && ! Plugin::$instance->preview->is_preview_mode();
	}

	public function filter_language_attributes( $output ) {
		if ( ! $this->is_refraction_screen() && ! $this->is_editor_window() ) {
			return $output;
		}

		return $output . Registry::html_attribute( self::current() );
	}

	/* ---------- assets ---------- */

	private function url( string $file ): string {
		return REFRACTION_ASSETS_URL . 'ui-theme/' . $file;
	}

	private function script_data(): array {
		return [
			'ajaxUrl' => admin_url( 'admin-ajax.php' ),
			'action' => self::AJAX_ACTION,
			'nonce' => wp_create_nonce( self::NONCE_ACTION ),
			'current' => self::current(),
			'themes' => array_keys( Registry::choices() ),
			'i18n' => [
				'saved' => __( 'Saved to your account.', 'refraction' ),
				'saving' => __( 'Saving…', 'refraction' ),
				'error' => __( 'Could not save the theme. Your previous theme is back.', 'refraction' ),
			],
		];
	}

	public function enqueue_admin_assets() {
		if ( ! $this->is_refraction_screen() ) {
			return;
		}

		wp_register_style( 'refraction-ui-themes', $this->url( 'ui-themes.css' ), [], REFRACTION_VERSION );

		// The tokens print before Refraction's own admin CSS, the skin after it.
		$admin = wp_styles()->query( 'refraction-admin', 'registered' );

		if ( $admin && ! in_array( 'refraction-ui-themes', $admin->deps, true ) ) {
			array_unshift( $admin->deps, 'refraction-ui-themes' );
		}

		wp_register_style( 'refraction-ui-theme-bridge', $this->url( 'ui-theme-bridge.css' ), [ 'refraction-ui-themes' ], REFRACTION_VERSION );
		wp_enqueue_style( 'refraction-ui-theme-admin', $this->url( 'ui-theme-admin.css' ), [ 'refraction-ui-themes', 'refraction-ui-theme-bridge', 'refraction-admin' ], REFRACTION_VERSION );
		wp_enqueue_script( 'refraction-ui-theme', $this->url( 'ui-theme.js' ), [], REFRACTION_VERSION, true );
		wp_localize_script( 'refraction-ui-theme', 'refractionUiTheme', $this->script_data() );
	}

	public function enqueue_editor_styles() {
		wp_enqueue_style( 'refraction-ui-themes', $this->url( 'ui-themes.css' ), [], REFRACTION_VERSION );
		wp_enqueue_style( 'refraction-ui-theme-bridge', $this->url( 'ui-theme-bridge.css' ), [ 'refraction-ui-themes' ], REFRACTION_VERSION );
		wp_enqueue_style( 'refraction-ui-theme-editor', $this->url( 'ui-theme-editor.css' ), [ 'refraction-ui-theme-bridge', 'refraction-editor', 'e-theme-ui-light', 'e-theme-ui-dark' ], REFRACTION_VERSION );
	}

	/* ---------- saving ---------- */

	/** Store a user's choice. Returns the stored value, or '' when the value is not on the whitelist. */
	public static function save_user_choice( int $user_id, $value ): string {
		$value = Registry::sanitize( $value );

		if ( '' === $value || ! $user_id ) {
			return '';
		}

		update_user_meta( $user_id, Registry::USER_META, $value );

		return $value;
	}

	public function ajax_save() {
		check_ajax_referer( self::NONCE_ACTION, 'nonce' );

		if ( ! current_user_can( 'edit_posts' ) ) {
			wp_send_json_error( [ 'message' => 'forbidden' ], 403 );
		}

		$scope = isset( $_POST['scope'] ) && 'site' === $_POST['scope'] ? 'site' : 'user'; // phpcs:ignore WordPress.Security.NonceVerification
		$theme = isset( $_POST['theme'] ) ? Registry::sanitize( wp_unslash( $_POST['theme'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification

		if ( '' === $theme ) {
			wp_send_json_error( [ 'message' => 'unknown theme' ], 400 );
		}

		if ( 'site' === $scope ) {
			if ( ! current_user_can( 'manage_options' ) ) {
				wp_send_json_error( [ 'message' => 'forbidden' ], 403 );
			}

			update_option( Registry::SITE_OPTION, $theme );
		} else {
			self::save_user_choice( get_current_user_id(), $theme );
		}

		wp_send_json_success( [ 'theme' => $theme, 'scope' => $scope, 'resolved' => self::current() ] );
	}

	/* ---------- settings tab ---------- */

	public function register_settings_tab( Settings $settings ) {
		$settings->add_tab(
			self::TAB_ID,
			[
				'label' => esc_html__( 'Theme', 'refraction' ),
				'sections' => [
					'ui_theme' => [
						'callback' => [ $this, 'render_picker' ],
						'fields' => [
							'ui_theme_default' => [
								'label' => esc_html__( 'Default for new users', 'refraction' ),
								'field_args' => [
									'type' => 'select',
									'std' => Registry::AUTO,
									'options' => Registry::choices(),
									'desc' => esc_html__( 'Used for people who have not picked a theme of their own. Anyone can still choose theirs above.', 'refraction' ),
								],
								'full_field_id' => Registry::SITE_OPTION,
								'setting_args' => [
									'sanitize_callback' => [ Registry::class, 'sanitize' ],
									'default' => '',
								],
							],
						],
					],
				],
			]
		);
	}

	public function render_picker() {
		$current = Registry::sanitize( self::user_choice() );
		$current = '' === $current ? self::current() : $current;
		$choices = Registry::choices();
		$themes = Registry::themes();
		?>
		<div class="refraction-ui-theme" id="refraction-ui-theme">
			<h2 id="refraction-ui-theme-label"><?php echo esc_html__( 'Interface theme', 'refraction' ); ?></h2>
			<p class="refraction-ui-theme__intro">
				<?php echo esc_html__( 'Choose how Refraction looks: its admin screens and the editor panel, top bar, navigator and library. Your site and the page you are designing are never changed.', 'refraction' ); ?>
				<strong><?php echo esc_html__( 'This applies to your account.', 'refraction' ); ?></strong>
			</p>
			<div class="refraction-ui-theme__grid" role="radiogroup" aria-labelledby="refraction-ui-theme-label">
				<?php foreach ( $choices as $id => $label ) :
					$is_auto = Registry::AUTO === $id;
					$checked = $id === $current;
					$blurb = $is_auto ? __( 'Matches WordPress and your system', 'refraction' ) : $themes[ $id ]['blurb'];
					$icon = $is_auto ? 'contrast' : $themes[ $id ]['icon'];
					?>
					<button type="button" class="refraction-ui-theme__card" role="radio"
						data-theme="<?php echo esc_attr( $id ); ?>"
						aria-checked="<?php echo $checked ? 'true' : 'false'; ?>"
						tabindex="<?php echo $checked ? '0' : '-1'; ?>">
						<?php $this->render_miniature( $id ); ?>
						<span class="refraction-ui-theme__meta">
							<span class="refraction-ui-theme__icon"><?php echo Icons::svg( $icon, [ 'size' => 18 ] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></span>
							<span class="refraction-ui-theme__text">
								<span class="refraction-ui-theme__name"><?php echo $is_auto ? esc_html__( 'Automatic', 'refraction' ) : esc_html( $label ); ?></span>
								<span class="refraction-ui-theme__blurb"><?php echo esc_html( $blurb ); ?></span>
							</span>
							<span class="refraction-ui-theme__check"><?php echo Icons::svg( 'check', [ 'size' => 16 ] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></span>
						</span>
					</button>
				<?php endforeach; ?>
			</div>
			<p class="refraction-ui-theme__status" id="refraction-ui-theme-status" role="status" aria-live="polite"></p>
			<hr>
		</div>
		<?php
	}

	/** A miniature of the editor drawn in the card's own theme (decorative). */
	private function render_miniature( string $id ) {
		$attr = Registry::AUTO === $id ? 'data-auto="1"' : 'data-preview-theme="' . esc_attr( $id ) . '"';
		?>
		<span class="refraction-mini" <?php echo $attr; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?> aria-hidden="true">
			<?php if ( Registry::AUTO === $id ) : ?>
				<span class="refraction-mini__half refraction-mini__half--light"></span>
				<span class="refraction-mini__half refraction-mini__half--dark"></span>
			<?php endif; ?>
			<span class="refraction-mini__bar"><i></i><i></i><i></i><b></b></span>
			<span class="refraction-mini__body">
				<span class="refraction-mini__panel"><b class="is-on"></b><b></b><b></b><em></em></span>
				<span class="refraction-mini__canvas">
					<span class="refraction-mini__page"><b></b><b></b><b></b><u></u></span>
					<span class="refraction-mini__dots"><s class="p"></s><s class="w"></s><s class="f"></s></span>
				</span>
			</span>
		</span>
		<?php
	}
}
