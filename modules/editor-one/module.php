<?php

namespace Refraction\Modules\EditorOne;

use Refraction\Core\Admin\EditorOneMenu\Refraction_One_Menu_Manager;
use Refraction\Core\Base\Module as BaseModule;
use Refraction\Modules\EditorOne\Classes\Menu_Config;
use Refraction\Modules\EditorOne\Classes\Menu_Data_Provider;
use Refraction\Modules\EditorOne\Components\Top_Bar_Handler;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
class Module extends BaseModule {

	const CUSTOM_REACT_APP_PAGES = [
		'refraction-element-manager',
	];

	public function get_name(): string {
		return 'editor-one';
	}

	public function __construct() {
		parent::__construct();

		if ( is_admin() ) {
			$this->add_component( 'editor-one-menu-manager', new Refraction_One_Menu_Manager() );
			// The in-page React sidebar duplicated the WordPress submenu (and carried an upgrade CTA), so it is not loaded.
			$this->add_component( 'top-bar-handler', new Top_Bar_Handler() );
		}

		add_action( 'current_screen', function () {
			$menu_data_provider = Menu_Data_Provider::instance();

			if ( ! $menu_data_provider->is_editor_one_admin_page() ) {
				return;
			}

			add_action( 'admin_enqueue_scripts', function () {
				$this->enqueue_styles();
			} );
		} );

		add_filter( 'refraction/admin-top-bar/is-active', function ( $_is_active ) {
			return false;
		} );
	}

	/**
	 * Check if current page has a custom React app that uses @elementor/ui
	 *
	 * @return bool
	 */
	private function is_custom_react_app_page() {
		$current_screen = get_current_screen();

		if ( ! $current_screen ) {
			return false;
		}

		foreach ( self::CUSTOM_REACT_APP_PAGES as $page_slug ) {
			if ( str_contains( $current_screen->id ?? '', $page_slug ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Enqueue admin styles
	 */
	private function enqueue_styles() {

		wp_enqueue_style( 'refraction-admin' );

		wp_enqueue_style(
			'refraction-editor-one-common',
			$this->get_css_assets_url( 'editor-one-common' ),
			[ 'refraction-admin' ],
			REFRACTION_VERSION
		);

		if ( ! $this->is_custom_react_app_page() ) {
			wp_enqueue_style(
				'refraction-editor-one-elements',
				$this->get_css_assets_url( 'editor-one-elements' ),
				[ 'refraction-editor-one-common' ],
				REFRACTION_VERSION
			);

			wp_enqueue_style(
				'refraction-editor-one-tables',
				$this->get_css_assets_url( 'editor-one-tables' ),
				[ 'refraction-editor-one-common' ],
				REFRACTION_VERSION
			);
		}

		wp_enqueue_script(
			'editor-one-admin',
			$this->get_js_assets_url( 'editor-one-admin' ),
			[ 'jquery' ],
			REFRACTION_VERSION,
			true
		);
	}
}
