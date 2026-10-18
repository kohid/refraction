<?php

namespace Refraction\Modules\EditorOne\Components;

use Refraction\Modules\EditorOne\Classes\Menu_Data_Provider;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Top_Bar_Handler {

	private Menu_Data_Provider $menu_data_provider;

	public function __construct() {
		$this->menu_data_provider = Menu_Data_Provider::instance();
		$this->register_actions();
	}

	private function register_actions(): void {
		add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_assets' ] );
		add_action( 'in_admin_header', [ $this, 'render_top_bar_container' ] );
	}

	public function enqueue_assets(): void {
		if ( ! $this->menu_data_provider->is_editor_one_admin_page() ) {
			return;
		}

		$min_suffix = Utils::is_script_debug() ? '' : '.min';

		wp_enqueue_style(
			'refraction-one-top-bar',
			REFRACTION_ASSETS_URL . 'css/modules/editor-one/top-bar' . $min_suffix . '.css',
			[],
			REFRACTION_VERSION
		);

		wp_enqueue_script(
			'editor-one-top-bar',
			REFRACTION_ASSETS_URL . 'js/editor-one-top-bar' . $min_suffix . '.js',
			[
				'react',
				'react-dom',
				'refraction-common',
				'refraction-v2-ui',
				'refraction-v2-icons',
			],
			REFRACTION_VERSION,
			true
		);

		wp_localize_script(
			'editor-one-top-bar',
			'refractionOneTopBarConfig',
			[
				'version' => REFRACTION_VERSION,
				'title' => __( 'website builder', 'refraction' ),
				'logoUrl' => REFRACTION_ASSETS_URL . 'images/logo-icon.png',
			]
		);
	}

	public function render_top_bar_container(): void {
		if ( ! $this->menu_data_provider->is_editor_one_admin_page() ) {
			return;
		}

		echo '<div id="editor-one-top-bar"></div>';
	}
}
