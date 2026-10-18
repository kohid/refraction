<?php
namespace Refraction\App\Modules\ImportExport;

use Refraction\App\Modules\ImportExport\Processes\Export;
use Refraction\App\Modules\ImportExport\Processes\Import;
use Refraction\App\Modules\ImportExport\Processes\Revert;
use Refraction\Core\Base\Module as BaseModule;
use Refraction\Core\Common\Modules\Ajax\Module as Ajax;
use Refraction\Core\Files\Uploads_Manager;
use Refraction\Modules\System_Info\Reporters\Server;
use Refraction\Plugin;
use Refraction\Tools;
use Refraction\Utils as RefractionUtils;
use Refraction\App\Modules\ImportExport\Utils as ImportExportUtils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Import Export Module
 *
 * Responsible for initializing Refraction App functionality
 */
class Module extends BaseModule {
	const FORMAT_VERSION = '2.0';

	const EXPORT_TRIGGER_KEY = 'refraction_export_kit';

	const UPLOAD_TRIGGER_KEY = 'refraction_upload_kit';

	const IMPORT_TRIGGER_KEY = 'refraction_import_kit';

	const IMPORT_RUNNER_TRIGGER_KEY = 'refraction_import_kit__runner';

	const REFERRER_LOCAL = 'local';

	const PLUGIN_PERMISSIONS_ERROR_KEY = 'plugin-installation-permissions-error';

	const NO_WRITE_PERMISSIONS_KEY = 'no-write-permissions';

	const THIRD_PARTY_ERROR = 'third-party-error';

	const DOMDOCUMENT_MISSING = 'domdocument-missing';

	const OPTION_KEY_REFRACTION_IMPORT_SESSIONS = 'refraction_import_sessions';

	const OPTION_KEY_REFRACTION_REVERT_SESSIONS = 'refraction_revert_sessions';

	const META_KEY_REFRACTION_IMPORT_SESSION_ID = '_refraction_import_session_id';

	const META_KEY_REFRACTION_EDIT_MODE = '_refraction_edit_mode';
	const IMPORT_PLUGINS_ACTION = 'import-plugins';
	const EXPORT_SOURCE_FILE = 'file';

	/**
	 * Assigning the export process to a property, so we can use the process from outside the class.
	 *
	 * @var Export
	 */
	public $export;

	/**
	 * Assigning the import process to a property, so we can use the process from outside the class.
	 *
	 * @var Import
	 */
	public $import;

	/**
	 * Assigning the revert process to a property, so we can use the process from outside the class.
	 *
	 * @var Revert
	 */
	public $revert;

	/**
	 * Get name.
	 *
	 * @access public
	 *
	 * @return string
	 */
	public function get_name() {
		return 'import-export';
	}

	public function __construct() {
		$this->register_actions();

		if ( RefractionUtils::is_wp_cli() ) {
			\WP_CLI::add_command( 'refraction kit', WP_CLI::class );
		}


		$this->revert = new Revert();
	}

	public function get_init_settings() {
		if ( ! Plugin::$instance->app->is_current() ) {
			return [];
		}

		return $this->get_config_data();
	}

	/**
	 * Register the import/export tab in refraction tools.
	 */
	public function register_settings_tab( Tools $tools ) {
		$tools->add_tab( 'import-export-kit', [
			'label' => esc_html__( 'Website Templates', 'refraction' ),
			'sections' => [
				'intro' => [
					'label' => esc_html__( 'Website Templates', 'refraction' ),
					'callback' => function() {
						$this->render_import_export_tab_content();
					},
					'fields' => [],
				],
			],
		] );
	}

	/**
	 * Render the import/export tab content.
	 */
	private function render_import_export_tab_content() {
		$content_data = [
			'export' => [
				'title' => esc_html__( 'Export this website', 'refraction' ),
				'button' => [
					'url' => Plugin::$instance->app->get_base_url() . '#/export',
					'text' => esc_html__( 'Export', 'refraction' ),
					'id' => 'refraction-import-export__export',
				],
				'description' => esc_html__( 'You can download this website as a .zip file.', 'refraction' ),
			],
			'import' => [
				'title' => esc_html__( 'Import website templates', 'refraction' ),
				'button' => [
					'url' => Plugin::$instance->app->get_base_url() . '#/import',
					'text' => esc_html__( 'Import', 'refraction' ),
					'id' => 'refraction-import-export__import',
				],
				'description' => esc_html__( 'You can import design and settings from a .zip file.', 'refraction' ),
			],
		];

		$last_imported_kit = $this->revert->get_last_import_session();
		$penultimate_imported_kit = $this->revert->get_penultimate_import_session();

		$user_date_format = get_option( 'date_format' );
		$user_time_format = get_option( 'time_format' );
		$date_format = $user_date_format . ' ' . $user_time_format;

		$should_show_revert_section = $this->should_show_revert_section( $last_imported_kit );

		if ( $should_show_revert_section ) {
			if ( ! empty( $penultimate_imported_kit ) ) {
				$revert_text = sprintf(
					/* translators: 1: Last imported kit title, 2: Last imported kit date, 3: Line break <br>, 4: Penultimate imported kit title, 5: Penultimate imported kit date. */
					esc_html__( 'Remove all the content and site settings that came with "%1$s" on %2$s %3$s and revert to the site setting that came with "%4$s" on %5$s.', 'refraction' ),
					! empty( $last_imported_kit['kit_title'] ) ? $last_imported_kit['kit_title'] : esc_html__( 'imported kit', 'refraction' ),
					gmdate( $date_format, $last_imported_kit['start_timestamp'] ),
					'<br>',
					! empty( $penultimate_imported_kit['kit_title'] ) ? $penultimate_imported_kit['kit_title'] : esc_html__( 'imported kit', 'refraction' ),
					gmdate( $date_format, $penultimate_imported_kit['start_timestamp'] )
				);
			} else {
				$revert_text = sprintf(
					/* translators: 1: Last imported kit title, 2: Last imported kit date, 3: Line break <br>. */
					esc_html__( 'Remove all the content and site settings that came with "%1$s" on %2$s.%3$s Your original site settings will be restored.', 'refraction' ),
					! empty( $last_imported_kit['kit_title'] ) ? $last_imported_kit['kit_title'] : esc_html__( 'imported kit', 'refraction' ),
					gmdate( $date_format, $last_imported_kit['start_timestamp'] ),
					'<br>'
				);
			}
		}
		?>

		<div class="tab-import-export-kit__content">
			<p class="tab-import-export-kit__info">
				<?php
				echo esc_html__( 'Here’s where you can export this website as a .zip file, or import a template .zip file into your site.', 'refraction' );
				?>
			</p>

			<div class="tab-import-export-kit__wrapper">
				<?php foreach ( $content_data as $data ) {
					$this->print_item_content( $data );
				} ?>
			</div>

			<?php
			if ( $should_show_revert_section ) {

				$link_attributes = [
					'href' => $this->get_revert_href(),
					'id' => 'refraction-import-export__revert_kit',
					'class' => 'button',
				];
				?>
				<div class="tab-import-export-kit__revert">
					<h2>
						<?php echo esc_html__( 'Remove the most recent Website Template', 'refraction' ); ?>
					</h2>
					<p class="tab-import-export-kit__info">
						<?php RefractionUtils::print_unescaped_internal_string( $revert_text ); ?>
					</p>
					<?php $this->render_last_kit_thumbnail( $last_imported_kit ); ?>
					<a <?php RefractionUtils::print_html_attributes( $link_attributes ); ?> >
						<?php echo esc_html__( 'Remove Website Template', 'refraction' ); ?>
					</a>
				</div>
			<?php } ?>
		</div>
		<?php
	}

	private function print_item_content( $data ) {
		?>
		<div class="tab-import-export-kit__container">
			<div class="tab-import-export-kit__box">
				<h3><?php RefractionUtils::print_unescaped_internal_string( $data['title'] ); ?></h3>
			</div>
			<p class="description"><?php RefractionUtils::print_unescaped_internal_string( $data['description'] ); ?></p>

			<?php if ( ! empty( $data['link'] ) ) : ?>
				<a href="<?php RefractionUtils::print_unescaped_internal_string( $data['link']['url'] ); ?>" target="_blank"><?php RefractionUtils::print_unescaped_internal_string( $data['link']['text'] ); ?></a>
			<?php endif; ?>
			<div class="tab-import-export-kit__box action-buttons">
				<?php if ( ! empty( $data['button_secondary'] ) ) : ?>
					<a href="<?php RefractionUtils::print_unescaped_internal_string( $data['button_secondary']['url'] ); ?>" class="refraction-button e-btn-txt e-btn-txt-border">
						<?php RefractionUtils::print_unescaped_internal_string( $data['button_secondary']['text'] ); ?>
					</a>
				<?php endif; ?>
				<a <?php RefractionUtils::print_html_attributes( [ 'id' => $data['button']['id'] ] ); ?> href="<?php RefractionUtils::print_unescaped_internal_string( $data['button']['url'] ); ?>" class="refraction-button e-primary">
					<?php RefractionUtils::print_unescaped_internal_string( $data['button']['text'] ); ?>
				</a>
			</div>
		</div>
		<?php
	}

	private function get_revert_href(): string {
		$admin_post_url = admin_url( 'admin-post.php?action=refraction_revert_kit' );
		$nonced_admin_post_url = wp_nonce_url( $admin_post_url, 'refraction_revert_kit' );
		return $this->maybe_add_referrer_param( $nonced_admin_post_url );
	}

	/**
	 * Checks if referred by a kit and adds the referrer ID to the href
	 *
	 * @param string $href
	 *
	 * @return string
	 */
	private function maybe_add_referrer_param( string $href ): string {
		$param_name = 'referrer_kit';

		if ( empty( $_GET[ $param_name ] ) ) {
			return $href;
		}

		return add_query_arg( $param_name, sanitize_key( $_GET[ $param_name ] ), $href );
	}

	/**
	 * Render the last kit thumbnail if exists
	 *
	 * @param $last_imported_kit
	 *
	 * @return void
	 */
	private function render_last_kit_thumbnail( $last_imported_kit ) {
		if ( empty( $last_imported_kit['kit_thumbnail'] ) ) {
			return;
		}

		?>
		<div class="tab-import-export-kit__kit-item-row">
			<article class="tab-import-export-kit__kit-item">
				<header>
					<h3>
						<?php echo esc_html( $last_imported_kit['kit_title'] ); ?>
					</h3>
				</header>
				<img
					src="<?php echo esc_url( $last_imported_kit['kit_thumbnail'] ); ?>"
					alt="<?php echo esc_attr( $last_imported_kit['kit_title'] ); ?>"
					loading="lazy"
				>
			</article>
		</div>
		<?php
	}

	/**
	 * Upload a kit zip file and get the kit data.
	 *
	 * Assigning the Import process to the 'import' property,
	 * so it will be available to use in different places such as: WP_Cli, Pro, etc.
	 *
	 * @param string $file Path to the file.
	 * @param string $referrer Referrer of the file 'local' or 'kit-library'.
	 * @param string $kit_id
	 * @return array
	 * @throws \Exception If export validation fails or processing errors occur.
	 */
	public function upload_kit( $file, $referrer, $kit_id = null ) {
		$this->ensure_writing_permissions();

		$this->import = new Import( $file, [
			'referrer' => $referrer,
			'id' => $kit_id,
		] );

		return [
			'session' => $this->import->get_session_id(),
			'manifest' => $this->import->get_manifest(),
			'conflicts' => $this->import->get_settings_conflicts(),
		];
	}

	/**
	 * Import a kit by session_id.
	 * Upload and import a kit by kit zip file.
	 *
	 * If the split_to_chunks flag is true, the process won't start
	 * It will initialize the import process and return the session_id and the runners.
	 *
	 * Assigning the Import process to the 'import' property,
	 * so it will be available to use in different places such as: WP_Cli, Pro, etc.
	 *
	 * @param string $path Path to the file or session_id.
	 * @param array  $settings Settings the import use to determine which content to import.
	 *       (e.g: include, selected_plugins, selected_cpt, selected_override_conditions, etc.)
	 * @param bool   $split_to_chunks Determine if the import process should be split into chunks.
	 * @return array
	 * @throws \Exception If export configuration is invalid or processing fails.
	 */
	public function import_kit( string $path, array $settings, bool $split_to_chunks = false ): array {
		$this->ensure_writing_permissions();
		$this->ensure_DOMDocument_exists();

		$this->import = new Import( $path, $settings );
		$this->import->register_default_runners();

		remove_filter( 'refraction/document/save/data', [ Plugin::$instance->modules_manager->get_modules( 'content-sanitizer' ), 'sanitize_content' ] );
		do_action( 'refraction/import-export/import-kit', $this->import );

		if ( $split_to_chunks ) {
			$this->import->init_import_session( true );

			return [
				'session' => $this->import->get_session_id(),
				'runners' => $this->import->get_runners_name(),
			];
		}

		return $this->import->run();
	}

	/**
	 * Resuming import process by re-creating the import instance and running the specific runner.
	 *
	 * @param string $session_id The id off the import session.
	 * @param string $runner_name The specific runner that we want to run.
	 *
	 * @return array Two types of response.
	 *      1. The status and the runner name.
	 *      2. The imported data. (Only if the runner is the last one in the import process)
	 * @throws \Exception If import configuration is invalid or processing fails.
	 */
	public function import_kit_by_runner( string $session_id, string $runner_name ): array {
		// Check session_id
		$this->import = Import::from_session( $session_id );
		$runners = $this->import->get_runners_name();

		$run = $this->import->run_runner( $runner_name );

		if ( end( $runners ) === $run['runner'] ) {
			return $this->import->get_imported_data();
		}

		return $run;
	}

	/**
	 * Export a kit.
	 *
	 * Assigning the Export process to the 'export' property,
	 * so it will be available to use in different places such as: WP_Cli, Pro, etc.
	 *
	 * @param array $settings Settings the export use to determine which content to export.
	 *      (e.g: include, kit_info, selected_plugins, selected_cpt, etc.)
	 * @return array
	 * @throws \Exception If import/export process fails or validation errors occur.
	 */
	public function export_kit( array $settings ) {
		$this->ensure_writing_permissions();

		$this->export = new Export( $settings );
		$this->export->register_default_runners();

		do_action( 'refraction/import-export/export-kit', $this->export );

		return $this->export->run();
	}

	/**
	 * Handle revert kit ajax request.
	 */
	public function revert_last_imported_kit() {
		$this->revert = new Revert();
		$this->revert->register_default_runners();

		do_action( 'refraction/import-export/revert-kit', $this->revert );

		$this->revert->run();
	}


	/**
	 * Handle revert last imported kit ajax request.
	 */
	public function handle_revert_last_imported_kit() {
		check_admin_referer( 'refraction_revert_kit' );

		$this->revert_last_imported_kit();

		wp_safe_redirect( admin_url( 'admin.php?page=' . Tools::PAGE_ID . '#tab-import-export-kit' ) );
		die;
	}

	/**
	 * Register appropriate actions.
	 */
	private function register_actions() {
		add_action( 'admin_init', function() {
			if ( wp_doing_ajax() &&
				isset( $_POST['action'] ) &&
				wp_verify_nonce( RefractionUtils::get_super_global_value( $_POST, '_nonce' ), Ajax::NONCE_KEY ) &&
				current_user_can( 'manage_options' )
			) {
				$this->maybe_handle_ajax();
			}
		} );

		add_action( 'admin_post_refraction_revert_kit', [ $this, 'handle_revert_last_imported_kit' ] );

		add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_scripts' ] );

		if ( ! Plugin::$instance->experiments->is_feature_active( 'import-export-customization' ) ) {
			$page_id = Tools::PAGE_ID;

			add_action( "refraction/admin/after_create_settings/{$page_id}", [ $this, 'register_settings_tab' ] );
		}

		// TODO 18/04/2023 : This needs to be moved to the runner itself after https://elementor.atlassian.net/browse/HTS-434 is done.
		if ( self::IMPORT_PLUGINS_ACTION === RefractionUtils::get_super_global_value( $_SERVER, 'HTTP_X_REFRACTION_ACTION' ) ) {
			add_filter( 'woocommerce_create_pages', [ $this, 'empty_pages' ], 10, 0 );
		}
		// TODO ^^^
	}

	/**
	 * Prevent the creation of the default WooCommerce pages (Cart, Checkout, etc.)
	 *
	 * TODO 18/04/2023 : This needs to be moved to the runner itself after https://elementor.atlassian.net/browse/HTS-434 is done.
	 *
	 * @return array
	 */
	public function empty_pages(): array {
		return [];
	}

	private function ensure_writing_permissions() {
		$server = new Server();

		$paths_to_check = [
			Server::KEY_PATH_WP_CONTENT_DIR => $server->get_system_path( Server::KEY_PATH_WP_CONTENT_DIR ),
			Server::KEY_PATH_UPLOADS_DIR => $server->get_system_path( Server::KEY_PATH_UPLOADS_DIR ),
			Server::KEY_PATH_REFRACTION_UPLOADS_DIR => $server->get_system_path( Server::KEY_PATH_REFRACTION_UPLOADS_DIR ),
		];

		$permissions = $server->get_paths_permissions( $paths_to_check );

		// WP Content dir has to be exists and writable.
		if ( ! $permissions[ Server::KEY_PATH_WP_CONTENT_DIR ]['write'] ) {
			throw new \Error( self::NO_WRITE_PERMISSIONS_KEY ); // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped
		}

		// WP Uploads dir has to be exists and writable.
		if ( ! $permissions[ Server::KEY_PATH_UPLOADS_DIR ]['write'] ) {
			throw new \Error( self::NO_WRITE_PERMISSIONS_KEY ); // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped
		}

		// Refraction uploads dir permissions is divided to 2 cases:
		// 1. If the dir exists, it has to be writable.
		// 2. If the dir doesn't exist, the parent dir has to be writable (wp uploads dir), so we can create it.
		if ( $permissions[ Server::KEY_PATH_REFRACTION_UPLOADS_DIR ]['exists'] && ! $permissions[ Server::KEY_PATH_REFRACTION_UPLOADS_DIR ]['write'] ) {
			throw new \Error( self::NO_WRITE_PERMISSIONS_KEY ); // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped
		}
	}

	private function ensure_DOMDocument_exists() {
		if ( ! class_exists( 'DOMDocument' ) ) {
			throw new \Error( self::DOMDOCUMENT_MISSING ); // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped
		}
	}

	/**
	 * Enqueue admin scripts
	 */
	public function enqueue_scripts() {
		wp_enqueue_script(
			'refraction-import-export-admin',
			$this->get_js_assets_url( 'import-export-admin' ),
			[ 'refraction-common' ],
			REFRACTION_VERSION,
			true
		);

		wp_localize_script(
			'refraction-import-export-admin',
			'refractionImportExport',
			[
				'lastImportedSession' => $this->revert->get_last_import_session(),
				'appUrl' => Plugin::$instance->app->get_base_url(),
			]
		);
	}

	/**
	 * Assign each ajax action to a method.
	 */
	private function maybe_handle_ajax() {
		// phpcs:ignore WordPress.Security.NonceVerification.Missing
		$action = RefractionUtils::get_super_global_value( $_POST, 'action' );

		try {
			switch ( $action ) {
				case static::EXPORT_TRIGGER_KEY:
					$this->handle_export_kit();
					break;

				case static::UPLOAD_TRIGGER_KEY:
					$this->handle_upload_kit();
					break;

				case static::IMPORT_TRIGGER_KEY:
					$this->handle_import_kit();
					break;

				case static::IMPORT_RUNNER_TRIGGER_KEY:
					$this->handle_import_kit__runner();
					break;

				default:
					break;
			}
		} catch ( \Error $e ) {
			if ( isset( $this->import ) ) {
				$this->import->finalize_import_session_option();
			}

			Plugin::$instance->logger->get_logger()->error( $e->getMessage(), [
				'meta' => [
					'trace' => $e->getTraceAsString(),
				],
			] );

			if ( isset( $this->import ) && $this->is_third_party_class( $e->getTrace()[0]['class'] ) ) {
				wp_send_json_error( self::THIRD_PARTY_ERROR, 500 );
			}

			wp_send_json_error( $e->getMessage(), 500 );
		}
	}

	/**
	 * Handle upload kit ajax request.
	 *
	 * @throws \Error If operation validation fails or processing errors occur.
	 */
	private function handle_upload_kit() {
		// PHPCS - Already validated in caller function
		$kit_id = RefractionUtils::get_super_global_value( $_POST, 'kit_id' ); // phpcs:ignore WordPress.Security.NonceVerification.Missing

		$import_result = [
			'file_name' => RefractionUtils::get_super_global_value( $_FILES, 'e_import_file' )['tmp_name'],
			'referrer' => static::REFERRER_LOCAL,
		];

		Plugin::$instance->logger->get_logger()->info( 'Uploading Kit: ', [
			'meta' => [
				'kit_id' => $kit_id,
				'referrer' => $import_result['referrer'],
			],
		] );

		$uploaded_kit = $this->upload_kit( $import_result['file_name'], $import_result['referrer'], $kit_id );

		$session_dir = $uploaded_kit['session'];
		$manifest = $uploaded_kit['manifest'];
		$conflicts = $uploaded_kit['conflicts'];

		if ( isset( $manifest['plugins'] ) && ! current_user_can( 'install_plugins' ) ) {
			throw new \Error( static::PLUGIN_PERMISSIONS_ERROR_KEY ); // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped
		}

		$result = [
			'session' => $session_dir,
			'manifest' => $manifest,
		];

		if ( ! empty( $conflicts ) ) {
			$result['conflicts'] = $conflicts;
		} else {
			// Moved into the IE process \Refraction\App\Modules\ImportExport\Processes\Import::get_default_settings_conflicts
			// TODO: remove in 3.10.0
			$result = apply_filters( 'refraction/import/stage_1/result', $result );
		}

		wp_send_json_success( $result );
	}

	/**
	 * Handle import kit ajax request.
	 */
	private function handle_import_kit() {
		// PHPCS - Already validated in caller function
		$settings = json_decode( RefractionUtils::get_super_global_value( $_POST, 'data' ), true ); // phpcs:ignore WordPress.Security.NonceVerification.Missing
		$tmp_folder_id = $settings['session'];

		$import = $this->import_kit( $tmp_folder_id, $settings, true );

		// get_settings_config() added manually because the frontend Ajax request doesn't trigger the get_init_settings().
		$import['configData'] = $this->get_config_data();

		Plugin::$instance->logger->get_logger()->info(
			sprintf( 'Selected import runners: %1$s',
				implode( ', ', $import['runners'] )
			)
		);

		wp_send_json_success( $import );
	}

	/**
	 * Handle ajax request for running specific runner in the import kit process.
	 */
	private function handle_import_kit__runner() {
		// PHPCS - Already validated in caller function
		$settings = json_decode( RefractionUtils::get_super_global_value( $_POST, 'data' ), true ); // phpcs:ignore WordPress.Security.NonceVerification.Missing
		$session_id = $settings['session'];
		$runner = $settings['runner'];

		$import = $this->import_kit_by_runner( $session_id, $runner );

		// get_settings_config() added manually because the frontend Ajax request doesn't trigger the get_init_settings().
		$import['configData'] = $this->get_config_data();

		if ( ! empty( $import['status'] ) ) {
			Plugin::$instance->logger->get_logger()->info(
				sprintf( 'Import runner completed: %1$s %2$s',
					$import['runner'],
					( 'success' === $import['status'] ? '✓' : '✗' )
				)
			);
		}

		do_action( 'refraction/import-export/import-kit/runner/after-run', $import );

		wp_send_json_success( $import );
	}

	/**
	 * Handle export kit ajax request.
	 *
	 * @throws \Error If cleanup process fails or file system errors occur.
	 */
	private function handle_export_kit() {
		// PHPCS - Already validated in caller function
		$settings = json_decode( RefractionUtils::get_super_global_value( $_POST, 'data' ), true ); // phpcs:ignore WordPress.Security.NonceVerification.Missing
		$source = $settings['kitInfo']['source'];

		$export = $this->export_kit( $settings );

		$file_name = $export['file_name'];
		$file_size = filesize( $file_name );
		$file = RefractionUtils::file_get_contents( $file_name );

		if ( ! $file ) {
			throw new \Error( 'Could not read the exported file.' );
		}

		Plugin::$instance->uploads_manager->remove_file_or_dir( dirname( $file_name ) );

		$result = apply_filters(
			'refraction/export/kit/export-result',
			[
				'manifest' => $export['manifest'],
				'file' => base64_encode( $file ),
			],
			$source,
			$export,
			$settings,
			$file,
			$file_size,
		);

		if ( is_wp_error( $result ) ) {
			wp_send_json_error( $result );
		}

		wp_send_json_success( $result );
	}

	/**
	 * Get config data that will be exposed to the frontend.
	 */
	private function get_config_data() {
		$export_nonce = wp_create_nonce( 'refraction_export' );
		$export_url = add_query_arg( [ '_nonce' => $export_nonce ], Plugin::$instance->app->get_base_url() );

		return [
			'exportURL' => $export_url,
			'summaryTitles' => $this->get_summary_titles(),
			'builtinWpPostTypes' => ImportExportUtils::get_builtin_wp_post_types(),
			'refractionPostTypes' => ImportExportUtils::get_refraction_post_types(),
			'isUnfilteredFilesEnabled' => Uploads_Manager::are_unfiltered_uploads_enabled(),
			'refractionHomePageUrl' => $this->get_refraction_home_page_url(),
			'recentlyEditedRefractionPageUrl' => $this->get_recently_edited_refraction_page_url(),
			'tools_url' => Tools::get_url(),
			'importSessions' => Revert::get_import_sessions(),
			'lastImportedSession' => $this->revert->get_last_import_session(),
			'kitPreviewNonce' => wp_create_nonce( 'kit_thumbnail' ),
		];
	}

	/**
	 * Get labels of Refraction document types, Refraction Post types, WordPress Post types and Custom Post types.
	 */
	private function get_summary_titles() {
		$summary_titles = [];

		$document_types = Plugin::$instance->documents->get_document_types();

		foreach ( $document_types as $name => $document_type ) {
			$summary_titles['templates'][ $name ] = [
				'single' => $document_type::get_title(),
				'plural' => $document_type::get_plural_title(),
			];
		}

		$refraction_post_types = ImportExportUtils::get_refraction_post_types();
		$wp_builtin_post_types = ImportExportUtils::get_builtin_wp_post_types();
		$post_types = array_merge( $refraction_post_types, $wp_builtin_post_types );

		foreach ( $post_types as $post_type ) {
			$post_type_object = get_post_type_object( $post_type );

			$summary_titles['content'][ $post_type ] = [
				'single' => $post_type_object->labels->singular_name ?? '',
				'plural' => $post_type_object->label ?? '',
			];
		}

		$custom_post_types = ImportExportUtils::get_registered_cpt_names();
		if ( ! empty( $custom_post_types ) ) {
			foreach ( $custom_post_types as $custom_post_type ) {

				$custom_post_types_object = get_post_type_object( $custom_post_type );
				// CPT data appears in two arrays:
				// 1. content object: in order to show the export summary when completed in getLabel function
				$summary_titles['content'][ $custom_post_type ] = [
					'single' => $custom_post_types_object->labels->singular_name ?? '',
					'plural' => $custom_post_types_object->label ?? '',
				];

				// 2. customPostTypes object: in order to actually export the data
				$summary_titles['content']['customPostTypes'][ $custom_post_type ] = [
					'single' => $custom_post_types_object->labels->singular_name ?? '',
					'plural' => $custom_post_types_object->label ?? '',
				];
			}
		}

		$active_kit = Plugin::$instance->kits_manager->get_active_kit();

		foreach ( $active_kit->get_tabs() as $key => $tab ) {
			$summary_titles['site-settings'][ $key ] = $tab->get_title();
		}

		return $summary_titles;
	}

	public function should_show_revert_section( $last_imported_kit ) {
		if ( empty( $last_imported_kit ) ) {
			return false;
		}

		// TODO: BC - remove in the future
		// The 'templates' runner was in core and moved to the Pro plugin. (Part of it still exits in the Core for BC)
		// The runner that is in the core version is missing the revert functionality,
		// therefore we shouldn't display the revert section if the import process done with the core version.
		$is_import_templates_ran = isset( $last_imported_kit['runners']['templates'] );
		if ( $this->has_pro() && $is_import_templates_ran ) {
			$has_imported_templates = ! empty( $last_imported_kit['runners']['templates'] );

			return $has_imported_templates;
		}

		return true;
	}

	public function has_pro(): bool {
		return RefractionUtils::has_pro();
	}

	private function get_refraction_editor_home_page_url() {
		if ( 'page' !== get_option( 'show_on_front' ) ) {
			return '';
		}

		$frontpage_id = get_option( 'page_on_front' );

		return $this->get_refraction_editor_page_url( $frontpage_id );
	}

	private function get_refraction_home_page_url() {
		if ( 'page' !== get_option( 'show_on_front' ) ) {
			return '';
		}

		$frontpage_id = get_option( 'page_on_front' );

		return $this->get_refraction_page_url( $frontpage_id );
	}

	private function get_recently_edited_refraction_page_url() {
		$query = RefractionUtils::get_recently_edited_posts_query( [ 'posts_per_page' => 1 ] );

		if ( ! isset( $query->post ) ) {
			return '';
		}

		return $this->get_refraction_page_url( $query->post->ID );
	}

	private function get_recently_edited_refraction_editor_page_url() {
		$query = RefractionUtils::get_recently_edited_posts_query( [ 'posts_per_page' => 1 ] );

		if ( ! isset( $query->post ) ) {
			return '';
		}

		return $this->get_refraction_editor_page_url( $query->post->ID );
	}

	private function get_refraction_document( $page_id ) {
		$document = Plugin::$instance->documents->get( $page_id );

		if ( ! $document || ! $document->is_built_with_refraction() ) {
			return false;
		}

		return $document;
	}

	private function get_refraction_page_url( $page_id ) {
		$document = $this->get_refraction_document( $page_id );

		return $document ? $document->get_preview_url() : '';
	}

	private function get_refraction_editor_page_url( $page_id ) {
		$document = $this->get_refraction_document( $page_id );

		return $document ? $document->get_edit_url() : '';
	}

	/**
	 * @param string $class_name
	 *
	 * @return bool
	 */
	public function is_third_party_class( $class_name ) {
		$allowed_classes = [
			'Refraction\\',
			'RefractionPro\\',
			'WP_',
			'wp_',
		];

		foreach ( $allowed_classes as $allowed_class ) {
			if ( str_starts_with( $class_name, $allowed_class ) ) {
				return false;
			}
		}

		return true;
	}
}
