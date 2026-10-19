<?php
namespace Refraction\Modules\Gutenberg;

use Refraction\Core\Base\Module as BaseModule;
use Refraction\Core\Experiments\Manager as Experiments_Manager;
use Refraction\Plugin;
use Refraction\User;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Module extends BaseModule {

	protected $is_gutenberg_editor_active = false;

	/**
	 * @since 2.1.0
	 * @access public
	 */
	public function get_name() {
		return 'gutenberg';
	}

	/**
	 * @since 2.1.0
	 * @access public
	 * @static
	 */
	public static function is_active() {
		return function_exists( 'register_block_type' );
	}

	/**
	 * @since 2.1.0
	 * @access public
	 */
	public function register_refraction_rest_field() {
		register_rest_field( get_post_types( '', 'names' ),
			'gutenberg_refraction_mode', [
				'update_callback' => function( $request_value, $obj ) {
					if ( ! User::is_current_user_can_edit( $obj->ID ) ) {
						return false;
					}

					$document = Plugin::$instance->documents->get( $obj->ID );

					if ( ! $document ) {
						return false;
					}

					$document->set_is_built_with_refraction( false );

					return true;
				},
			]
		);
	}

	/**
	 * @since 2.1.0
	 * @access public
	 */
	public function enqueue_assets() {
		$document = Plugin::$instance->documents->get( get_the_ID() );

		if ( ! $document || ! $document->is_editable_by_current_user() ) {
			return;
		}

		$this->is_gutenberg_editor_active = true;

		$suffix = Utils::is_script_debug() ? '' : '.min';

		wp_enqueue_script( 'refraction-gutenberg', REFRACTION_ASSETS_URL . 'js/gutenberg' . $suffix . '.js', [ 'jquery' ], REFRACTION_VERSION, true );

		$refraction_settings = [
			'isRefractionMode' => $document->is_built_with_refraction(),
			'editLink' => $document->get_edit_url(),
		];
		Utils::print_js_config( 'refraction-gutenberg', 'RefractionGutenbergSettings', $refraction_settings );
	}

	/**
	 * @since 2.1.0
	 * @access public
	 */
	public function print_admin_js_template() {
		if ( ! $this->is_gutenberg_editor_active ) {
			return;
		}

		?>
		<script id="refraction-gutenberg-button-switch-mode" type="text/html">
			<div id="refraction-switch-mode">
				<button id="refraction-switch-mode-button" type="button" class="button button-primary button-large">
					<span class="refraction-switch-mode-on">
						<i class="rficon-wordpress" aria-hidden="true"></i>
						<?php echo esc_html__( 'Edit with WordPress', 'refraction' ); ?>
					</span>
					<span class="refraction-switch-mode-off">
						<i class="rficon-refraction-square" aria-hidden="true"></i>
						<?php echo esc_html__( 'Edit with Refraction', 'refraction' ); ?>
					</span>
				</button>
			</div>
		</script>

		<script id="refraction-gutenberg-panel" type="text/html">
			<div id="refraction-editor">
				<div id="refraction-go-to-edit-page-link">
					<button id="refraction-editor-button" class="button button-primary button-hero">
						<i class="rficon-refraction-square" aria-hidden="true"></i>
						<?php echo esc_html__( 'Edit with Refraction', 'refraction' ); ?>
					</button>
					<div class="refraction-loader-wrapper">
						<div class="refraction-loader">
							<div class="refraction-loader-boxes">
								<div class="refraction-loader-box"></div>
								<div class="refraction-loader-box"></div>
								<div class="refraction-loader-box"></div>
								<div class="refraction-loader-box"></div>
							</div>
						</div>
						<div class="refraction-loading-title"><?php echo esc_html__( 'Loading', 'refraction' ); ?></div>
					</div>
				</div>
			</div>
		</script>

		<script id="refraction-gutenberg-button-tmpl" type="text/html">
			<div id="refraction-edit-button-gutenberg">
				<button id="refraction-edit-mode-button" type="button" class="button button-primary button-large">
					<span class="refraction-edit-mode-gutenberg">
						<i class="rficon-refraction-square" aria-hidden="true"></i>
						<?php echo esc_html__( 'Edit with Refraction', 'refraction' ); ?>
					</span>
				</button>
			</div>
		</script>
		<?php
	}

	/**
	 * @since 2.1.0
	 * @access public
	 */
	public function __construct() {
		add_action( 'rest_api_init', [ $this, 'register_refraction_rest_field' ] );
		add_action( 'enqueue_block_editor_assets', [ $this, 'enqueue_assets' ] );
		add_action( 'admin_footer', [ $this, 'print_admin_js_template' ] );
		add_action( 'wp_enqueue_scripts', [ $this, 'dequeue_assets' ], 999 );
	}

	public function dequeue_assets() {
		if ( ! static::is_optimized_gutenberg_loading_enabled() ) {
			return;
		}

		if ( ! static::should_dequeue_gutenberg_assets() ) {
			return;
		}

		wp_dequeue_style( 'wp-block-library' );
		wp_dequeue_style( 'wp-block-library-theme' );
		wp_dequeue_style( 'wc-block-style' );
		wp_dequeue_style( 'wc-blocks-style' );
	}

	/**
	 * Check whether the "Optimized Gutenberg Loading" settings is enabled.
	 *
	 * The 'refraction_optimized_gutenberg_loading' option can be enabled/disabled from the Refraction settings.
	 * For BC, when the option has not been saved in the database, the default '1' value is returned.
	 *
	 * @since 3.21.0
	 * @access private
	 */
	private static function is_optimized_gutenberg_loading_enabled(): bool {
		return (bool) get_option( 'refraction_optimized_gutenberg_loading', '1' );
	}

	private static function should_dequeue_gutenberg_assets(): bool {
		$post = get_post();

		if ( empty( $post->ID ) ) {
			return false;
		}

		if ( ! static::is_built_with_refraction( $post ) ) {
			return false;
		}

		if ( static::is_gutenberg_in_post( $post ) ) {
			return false;
		}

		return true;
	}

	private static function is_built_with_refraction( $post ): bool {
		$document = Plugin::$instance->documents->get( $post->ID );

		if ( ! $document || ! $document->is_built_with_refraction() ) {
			return false;
		}

		return true;
	}

	private static function is_gutenberg_in_post( $post ): bool {
		if ( has_blocks( $post ) ) {
			return true;
		}

		if ( static::current_theme_is_fse_theme() ) {
			return true;
		}

		return false;
	}

	private static function current_theme_is_fse_theme(): bool {
		if ( function_exists( 'wp_is_block_theme' ) ) {
			return (bool) wp_is_block_theme();
		}
		if ( function_exists( 'gutenberg_is_fse_theme' ) ) {
			return (bool) gutenberg_is_fse_theme();
		}

		return false;
	}
}
