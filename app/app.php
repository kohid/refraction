<?php
namespace Refraction\App;

use Refraction\Core\Experiments\Manager as ExperimentsManager;
use Refraction\Modules\WebCli\Module as WebCLIModule;
use Refraction\Core\Base\App as BaseApp;
use Refraction\Core\Settings\Manager as SettingsManager;
use Refraction\Plugin;
use Refraction\User;
use Refraction\Utils;
use Refraction\Core\Utils\Assets_Config_Provider;
use Refraction\Core\Utils\Collection;
use Refraction\Core\Utils\Assets_Translation_Loader;

use Refraction\App\Modules\ImportExport\Module as ImportExportModule;
use Refraction\App\Modules\ImportExportCustomization\Module as ImportExportCustomizationModule;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class App extends BaseApp {

	const PAGE_ID = 'refraction-app';

	/**
	 * Get module name.
	 *
	 * Retrieve the module name.
	 *
	 * @since 3.0.0
	 * @access public
	 *
	 * @return string Module name.
	 */
	public function get_name() {
		return 'app';
	}

	public function get_base_url() {
		return admin_url( 'admin.php?page=' . self::PAGE_ID . '&ver=' . REFRACTION_VERSION );
	}

	public function is_current() {
		return ( ! empty( $_GET['page'] ) && self::PAGE_ID === $_GET['page'] );
	}

	public function admin_init() {
		do_action( 'refraction/app/init', $this );

		// Add the introduction and user settings only when it is needed (when loading the app and not in the editor or admin pages)
		$this->set_settings( 'user', [
			'introduction' => (object) User::get_introduction_meta(),
			'is_administrator' => current_user_can( 'manage_options' ),
			'restrictions' => Plugin::$instance->role_manager->get_user_restrictions_array(),
		] );

		$this->enqueue_assets();

		remove_action( 'wp_print_styles', 'print_emoji_styles' );

		// Setup default heartbeat options
		// TODO: Enable heartbeat.
		add_filter( 'heartbeat_settings', function( $settings ) {
			$settings['interval'] = 15;
			return $settings;
		} );

		$this->render();
		die;
	}

	protected function get_init_settings() {
		$referer = wp_get_referer();

		return [
			'assets_url' => REFRACTION_ASSETS_URL,
			'pages_url' => admin_url( 'edit.php?post_type=page' ),
			'return_url' => $referer ? $referer : admin_url(),
			'hasPro' => Utils::has_pro(),
			'admin_url' => admin_url(),
			'login_url' => wp_login_url(),
			'base_url' => $this->get_base_url(),
			'home_url' => home_url(),
		];
	}

	private function render() {
		require __DIR__ . '/view.php';
	}

	/**
	 * Get Refraction editor theme color preference.
	 *
	 * Retrieve the user theme color preference as defined by editor preferences manager.
	 *
	 * @since 3.0.0
	 * @access private
	 *
	 * @return string Preferred editor theme.
	 */
	private function get_refraction_ui_theme_preference() {
		$editor_preferences = SettingsManager::get_settings_managers( 'editorPreferences' );

		return $editor_preferences->get_model()->get_settings( 'ui_theme' );
	}

	/**
	 * Enqueue dark theme detection script.
	 *
	 * Enqueues an inline script that detects user-agent settings for dark mode and adds a complimentary class to the body tag.
	 *
	 * @since 3.0.0
	 * @access private
	 */
	private function enqueue_dark_theme_detection_script() {
		if ( 'auto' === $this->get_refraction_ui_theme_preference() ) {
			wp_add_inline_script( 'refraction-app',
				'if ( window.matchMedia && window.matchMedia( `(prefers-color-scheme: dark)` ).matches )
							{ document.body.classList.add( `eps-theme-dark` ); }' );
		}
	}

	private function register_packages() {
		$assets_config_provider = ( new Assets_Config_Provider() )
			->set_path_resolver( function ( $name ) {
				return REFRACTION_ASSETS_PATH . "js/packages/{$name}/{$name}.asset.php";
			} );

		Collection::make( [ 'ui', 'icons', 'store', 'query', 'utils', 'events', 'schema' ] )
			->each( function( $package ) use ( $assets_config_provider ) {
				$suffix = Utils::is_script_debug() ? '' : '.min';
				$config = $assets_config_provider->load( $package )->get( $package );

				if ( ! $config ) {
					return;
				}

				wp_register_script(
					$config['handle'],
					REFRACTION_ASSETS_URL . "js/packages/{$package}/{$package}{$suffix}.js",
					$config['deps'],
					REFRACTION_VERSION,
					true
				);
			} );
	}

	private function enqueue_assets() {
		Plugin::$instance->init_common();

		$this->register_packages();

		/** @var WebCLIModule $web_cli */
		$web_cli = Plugin::$instance->modules_manager->get_modules( 'web-cli' );
		$web_cli->register_scripts();

		Plugin::$instance->common->register_scripts();

		wp_register_style(
			'select2',
			$this->get_css_assets_url( 'e-select2', 'assets/lib/e-select2/css/' ),
			[],
			'4.0.6-rc.1'
		);

		Plugin::$instance->common->register_styles();

		wp_register_style(
			'select2',
			REFRACTION_ASSETS_URL . 'lib/e-select2/css/e-select2.css',
			[],
			'4.0.6-rc.1'
		);

		wp_enqueue_style(
			'refraction-app',
			$this->get_css_assets_url( 'app', null, 'default', true ),
			[
				'select2',
				'refraction-icons',
				'refraction-common',
				'select2',
			],
			REFRACTION_VERSION
		);

		wp_enqueue_script(
			'refraction-app-packages',
			$this->get_js_assets_url( 'app-packages' ),
			[
				'wp-i18n',
				'react',
			],
			REFRACTION_VERSION,
			true
		);

		wp_register_script(
			'select2',
			$this->get_js_assets_url( 'e-select2.full', 'assets/lib/e-select2/js/' ),
			[
				'jquery',
			],
			'4.0.6-rc.1',
			true
		);

		wp_enqueue_script(
			'refraction-app',
			$this->get_js_assets_url( 'app' ),
			[
				'wp-url',
				'wp-i18n',
				'refraction-v2-ui',
				'refraction-v2-icons',
				'react',
				'react-dom',
				'select2',
			],
			REFRACTION_VERSION,
			true
		);

		$this->enqueue_dark_theme_detection_script();

		Assets_Translation_Loader::for_handles( [ 'refraction-app-packages', 'refraction-app' ], 'refraction' );

		$this->print_config();
	}

	public function enqueue_app_loader() {
		wp_enqueue_script(
			'refraction-app-loader',
			$this->get_js_assets_url( 'app-loader' ),
			[
				'refraction-common',
			],
			REFRACTION_VERSION,
			true
		);

		$this->print_config( 'refraction-app-loader' );
	}

	private function register_import_export_customization_experiment() {
		Plugin::$instance->experiments->add_feature( [
			'name' => 'import-export-customization',
			'title' => esc_html__( 'Import/Export Customization', 'refraction' ),
			'description' => esc_html__( 'Enhanced import/export for website templates. Selectively include site content, templates, and settings with advanced granular control.', 'refraction' ),
			'release_status' => ExperimentsManager::RELEASE_STATUS_BETA,
			'default' => ExperimentsManager::STATE_ACTIVE,
			'hidden' => true,
			'mutable' => false,
		] );
	}

	public function register_hidden_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		// 'options.php' has no sidebar entry, so the page is reachable but not listed.
		add_submenu_page(
			'options.php',
			esc_html__( 'Website Templates', 'refraction' ),
			'',
			'manage_options',
			self::PAGE_ID,
			'__return_null'
		);
	}

	public function __construct() {
		$this->register_import_export_customization_experiment();

		if ( current_user_can( 'manage_options' ) || Utils::is_wp_cli() ) {
			$this->add_component( 'import-export', new ImportExportModule() );

			if ( Plugin::$instance->experiments->is_feature_active( 'import-export-customization' ) ) {
				$this->add_component( 'import-export-customization', new ImportExportCustomizationModule() );
			}
		}

		// The app page has no menu entry (Tools > Website Templates links to it), but WordPress only lets users open
		// admin.php?page=... for registered pages. The upstream registered it through the removed Theme Builder menu item.
		add_action( 'admin_menu', [ $this, 'register_hidden_page' ] );

		if ( $this->is_current() ) {
			add_action( 'admin_init', [ $this, 'admin_init' ], 0 );
		} else {
			add_action( 'refraction/common/after_register_scripts', [ $this, 'enqueue_app_loader' ] );
		}
	}
}
