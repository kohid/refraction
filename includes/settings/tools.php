<?php
namespace Elementor;

use Elementor\Core\Admin\Menu\Admin_Menu_Manager;
use Elementor\Core\Kits\Manager;
use Elementor\Modules\EditorOne\Classes\Menu_Data_Provider;
use Elementor\Includes\Settings\AdminMenuItems\Editor_One_Tools_Menu;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Elementor "Tools" page in WordPress Dashboard.
 *
 * Elementor settings page handler class responsible for creating and displaying
 * Elementor "Tools" page in WordPress dashboard.
 *
 * @since 1.0.0
 */
class Tools extends Settings_Page {

	const CAPABILITY = 'manage_options';

	/**
	 * Settings page ID for Elementor tools.
	 */
	const PAGE_ID = 'elementor-tools';

	/**
	 * Clear cache.
	 *
	 * Delete post meta containing the post CSS file data. And delete the actual
	 * CSS files from the upload directory.
	 *
	 * Fired by `wp_ajax_elementor_clear_cache` action.
	 *
	 * @since 1.0.0
	 * @access public
	 */
	public function ajax_elementor_clear_cache() {
		check_ajax_referer( 'elementor_clear_cache', '_nonce' );

		if ( ! current_user_can( static::CAPABILITY ) ) {
			wp_send_json_error( 'Permission denied' );
		}

		Plugin::$instance->files_manager->clear_cache();

		wp_send_json_success();
	}

	public function admin_post_elementor_site_clear_cache() {
		check_ajax_referer( 'elementor_site_clear_cache' );

		if ( ! current_user_can( static::CAPABILITY ) ) {
			wp_die( 'Permission denied' );
		}

		Plugin::$instance->files_manager->clear_cache();

		$http_referer = wp_get_raw_referer();
		if ( empty( $http_referer ) ) {
			$http_referer = admin_url( 'admin.php?page=' . static::PAGE_ID );
		}

		wp_safe_redirect( $http_referer );
		die;
	}

	/**
	 * Recreate kit.
	 *
	 * Recreate default kit (only when default kit does not exist).
	 *
	 * Fired by `wp_ajax_elementor_recreate_kit` action.
	 *
	 * @since 1.0.0
	 * @access public
	 */
	public function ajax_elementor_recreate_kit() {
		check_ajax_referer( 'elementor_recreate_kit', '_nonce' );

		if ( ! current_user_can( static::CAPABILITY ) ) {
			wp_send_json_error( 'Permission denied' );
		}

		$kit = Plugin::$instance->kits_manager->get_active_kit();

		if ( $kit->get_id() ) {
			wp_send_json_error( [ 'message' => esc_html__( 'There\'s already an active kit.', 'elementor' ) ], 400 );
		}

		$created_default_kit = Plugin::$instance->kits_manager->create_default();

		if ( ! $created_default_kit ) {
			wp_send_json_error( [ 'message' => esc_html__( 'An error occurred while trying to create a kit.', 'elementor' ) ], 500 );
		}

		update_option( Manager::OPTION_ACTIVE, $created_default_kit );

		wp_send_json_success( esc_html__( 'New kit have been created successfully', 'elementor' ) );
	}

	/**
	 * Replace URLs.
	 *
	 * Sends an ajax request to replace old URLs to new URLs. This method also
	 * updates all the Elementor data.
	 *
	 * Fired by `wp_ajax_elementor_replace_url` action.
	 *
	 * @since 1.1.0
	 * @access public
	 */
	public function ajax_elementor_replace_url() {
		check_ajax_referer( 'elementor_replace_url', '_nonce' );

		if ( ! current_user_can( static::CAPABILITY ) ) {
			wp_send_json_error( 'Permission denied' );
		}

		$from = Utils::get_super_global_value( $_POST, 'from' ) ?? '';
		$to = Utils::get_super_global_value( $_POST, 'to' ) ?? '';

		try {
			$results = Utils::replace_urls( $from, $to );
			wp_send_json_success( $results );
		} catch ( \Exception $e ) {
			wp_send_json_error( $e->getMessage() );
		}
	}

	/**
	 * Tools page constructor.
	 *
	 * Initializing Elementor "Tools" page.
	 *
	 * @since 1.0.0
	 * @access public
	 */
	public function __construct() {
		parent::__construct();

		add_action( 'elementor/editor-one/menu/register', function ( Menu_Data_Provider $menu_data_provider ) {
			$this->register_editor_one_menu( $menu_data_provider );
		} );

		add_action( 'wp_ajax_elementor_clear_cache', [ $this, 'ajax_elementor_clear_cache' ] );
		add_action( 'admin_post_elementor_site_clear_cache', [ $this, 'admin_post_elementor_site_clear_cache' ] );
		add_action( 'wp_ajax_elementor_replace_url', [ $this, 'ajax_elementor_replace_url' ] );
		add_action( 'wp_ajax_elementor_recreate_kit', [ $this, 'ajax_elementor_recreate_kit' ] );
	}

	private function register_editor_one_menu( Menu_Data_Provider $menu_data_provider ) {
		$menu_data_provider->register_menu( new Editor_One_Tools_Menu() );
	}

	public function get_warning_span( string $text ): string {
		$color = 'var(--e-one-palette-error-main)';
		return sprintf( '<span style="color: %s;">%s</span>', esc_attr( $color ), esc_html( $text ) );
	}

	/**
	 * Create tabs.
	 *
	 * Return the tools page tabs, sections and fields.
	 *
	 * @since 1.5.0
	 * @access protected
	 *
	 * @return array An array with the page tabs, sections and fields.
	 */
	protected function create_tabs() {
		$tabs = [
			'general' => [
				'label' => esc_html__( 'General', 'elementor' ),
				'sections' => [
					'tools' => [
						'fields' => [
							'clear_cache' => [
								'label' => esc_html__( 'Elementor Cache', 'elementor' ),
								'field_args' => [
									'type' => 'raw_html',
									'html' => sprintf( '<button data-nonce="%s" data-id="elementor-tools-general-button-clear-files-data" class="button elementor-button-spinner" id="elementor-clear-cache-button">%s</button>', wp_create_nonce( 'elementor_clear_cache' ), esc_html__( 'Clear Files & Data', 'elementor' ) ),
									'desc' => esc_html__( "Clear outdated CSS files and cached data in the database (rendered HTML, JS/CSS assets, etc.). We'll regenerate those files the next time someone visits any page on your website.", 'elementor' ),
								],
							],
						],
					],
				],
			],
			'replace_url' => [
				'label' => esc_html__( 'Replace URL', 'elementor' ),
				'sections' => [
					'replace_url' => [
						'callback' => function() {
							echo '<h2>' . esc_html__( 'Replace URL', 'elementor' ) . '</h2>';
							printf(
								'<p><strong>%1$s</strong> %2$s</p>',
								esc_html__( 'Important:', 'elementor' ),
								esc_html__( 'It is strongly recommended to back up the database before replacing URLs.', 'elementor' )
							);
						},
						'fields' => [
							'replace_url' => [
								'label' => esc_html__( 'Update Site Address (URL)', 'elementor' ),
								'field_args' => [
									'type' => 'raw_html',
									'html' => sprintf( '<input type="text" name="from" placeholder="https://old.example.com" class="large-text"><input type="text" name="to" placeholder="https://new.example.com" class="large-text"><button data-nonce="%s" data-id="elementor-tools-replace_url-button-replace-url" class="button elementor-button-spinner" id="elementor-replace-url-button">%s</button>', wp_create_nonce( 'elementor_replace_url' ), esc_html__( 'Replace URL', 'elementor' ) ),
									'desc' => esc_html__( 'Enter your old and new URLs for your WordPress installation, to update all Elementor data (Relevant for domain transfers or move to \'HTTPS\').', 'elementor' ),
								],
							],
						],
					],
				],
			],
		];

		if ( ! Plugin::$instance->kits_manager->get_active_kit()->get_id() ) {
			$tabs['general']['sections']['tools']['fields']['recreate_kit'] = [
				'label' => esc_html__( 'Recreate Kit', 'elementor' ),
				'field_args' => [
					'type' => 'raw_html',
					'html' => sprintf( '<button data-nonce="%s" class="button elementor-button-spinner" id="elementor-recreate-kit-button">%s</button>', wp_create_nonce( 'elementor_recreate_kit' ), esc_html__( 'Recreate Kit', 'elementor' ) ),
					'desc' => esc_html__( 'It seems like your site doesn\'t have any active Kit. The active Kit includes all of your Site Settings. By recreating your Kit you will able to start edit your Site Settings again.', 'elementor' ),
				],
			];
		}
		return $tabs;
	}

	/**
	 * Get tools page title.
	 *
	 * Retrieve the title for the tools page.
	 *
	 * @since 1.5.0
	 * @access protected
	 *
	 * @return string Tools page title.
	 */
	protected function get_page_title() {
		return esc_html__( 'Tools', 'elementor' );
	}
}
