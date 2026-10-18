<?php
namespace Refraction\Modules\WebCli;

use Refraction\Core\Base\App;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Module extends App {

	public function get_name() {
		return 'web-cli';
	}

	public function __construct() {
		add_action( 'refraction/editor/before_enqueue_scripts', [ $this, 'register_scripts' ] );
		add_action( 'admin_enqueue_scripts', [ $this, 'register_scripts' ] );
		add_action( 'wp_enqueue_scripts', [ $this, 'register_scripts' ] );
		add_action( 'refraction/frontend/after_register_scripts', [ $this, 'register_scripts' ] );
	}

	public function register_scripts() {
		wp_register_script(
			'refraction-web-cli',
			$this->get_js_assets_url( 'web-cli' ),
			[
				'refraction-vendors-redux',
				'jquery',
			],
			REFRACTION_VERSION,
			true
		);

		$this->print_config( 'refraction-web-cli' );
	}

	protected function get_init_settings() {
		return [
			'isDebug' => ( defined( 'WP_DEBUG' ) && WP_DEBUG ),
			'urls' => [
				'rest' => get_rest_url(),
				'assets' => REFRACTION_ASSETS_URL,
			],
			'nonce' => wp_create_nonce( 'wp_rest' ),
			'version' => REFRACTION_VERSION,
		];
	}
}
