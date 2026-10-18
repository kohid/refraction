<?php
namespace Refraction\Core\Debug;

use Refraction\Settings;
use Refraction\Tools;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Inspector {

	protected $is_enabled = false;

	protected $log = [];

	/**
	 * @since 2.1.2
	 * @access public
	 */
	public function __construct() {
		$is_debug = ( defined( 'WP_DEBUG' ) && WP_DEBUG );
		$option = get_option( 'refraction_enable_inspector', null );

		$this->is_enabled = is_null( $option ) ? $is_debug : 'enable' === $option;

		if ( $this->is_enabled ) {
			add_action( 'admin_bar_menu', [ $this, 'add_menu_in_admin_bar' ], 201 );
		}

		add_action( 'refraction/admin/after_create_settings/' . Tools::PAGE_ID, [ $this, 'register_admin_tools_fields' ], 50 );
	}

	/**
	 * @since 2.1.3
	 * @access public
	 */
	public function is_enabled() {
		return $this->is_enabled;
	}

	/**
	 * @since 2.1.3
	 * @access public
	 */
	public function register_admin_tools_fields( Tools $tools ) {
		$tools->add_fields( Settings::TAB_GENERAL, 'tools', [
			'enable_inspector' => [
				'label' => esc_html__( 'Debug Bar', 'refraction' ),
				'field_args' => [
					'type' => 'select',
					'std' => $this->is_enabled ? 'enable' : '',
					'options' => [
						'' => esc_html__( 'Disable', 'refraction' ),
						'enable' => esc_html__( 'Enable', 'refraction' ),
					],
					'desc' => esc_html__( 'Debug Bar adds an admin bar menu that lists all the templates that are used on a page that is being displayed.', 'refraction' ),
				],
			],
		] );
	}

	/**
	 * @since 2.1.2
	 * @access public
	 */
	public function parse_template_path( $template ) {
		// `untrailingslashit` for windows path style.
		if ( 0 === strpos( $template, untrailingslashit( REFRACTION_PATH ) ) ) {
			return 'Refraction - ' . basename( $template );
		}

		if ( 0 === strpos( $template, get_stylesheet_directory() ) ) {
			return wp_get_theme()->get( 'Name' ) . ' - ' . basename( $template );
		}

		$plugins_dir = dirname( REFRACTION_PATH );
		if ( 0 === strpos( $template, $plugins_dir ) ) {
			return ltrim( str_replace( $plugins_dir, '', $template ), '/\\' );
		}

		return str_replace( WP_CONTENT_DIR, '', $template );
	}

	/**
	 * @since 2.1.2
	 * @access public
	 */
	public function add_log( $module, $title, $url = '' ) {
		if ( ! $this->is_enabled ) {
			return;
		}

		if ( ! isset( $this->log[ $module ] ) ) {
			$this->log[ $module ] = [];
		}

		$this->log[ $module ][] = [
			'title' => $title,
			'url' => $url,
		];
	}

	/**
	 * @since 2.1.2
	 * @access public
	 */
	public function add_menu_in_admin_bar( \WP_Admin_Bar $wp_admin_bar ) {
		if ( empty( $this->log ) ) {
			return;
		}

		$wp_admin_bar->add_node( [
			'id' => 'refraction_inspector',
			'title' => esc_html__( 'Refraction Debugger', 'refraction' ),
		] );

		foreach ( $this->log as $module => $log ) {
			$module_id = sanitize_key( $module );

			$wp_admin_bar->add_menu( [
				'id' => 'refraction_inspector_' . $module_id,
				'parent' => 'refraction_inspector',
				'title' => $module,
			] );

			foreach ( $log as $index => $row ) {
				$url = $row['url'];

				unset( $row['url'] );

				$wp_admin_bar->add_menu( [
					'id' => 'refraction_inspector_log_' . $module_id . '_' . $index,
					'parent' => 'refraction_inspector_' . $module_id,
					'href' => $url,
					'title' => implode( ' > ', $row ),
					'meta' => [
						'target' => '_blank',
					],
				] );
			}
		}
	}
}
