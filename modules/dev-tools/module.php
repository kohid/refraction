<?php
namespace Refraction\Modules\DevTools;

use Refraction\Core\Base\App;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Fix issue with 'Potentially polymorphic call. The code may be inoperable depending on the actual class instance passed as the argument.'.
 * Its tells to the editor that instance() return right module. instead of base module.
 *
 * @method Module instance()
 */
class Module extends App {
	/**
	 * @var Deprecation
	 */
	public $deprecation;

	public function __construct() {
		$this->deprecation = new Deprecation( REFRACTION_VERSION );

		add_action( 'refraction/editor/before_enqueue_scripts', [ $this, 'register_scripts' ] );
		add_action( 'admin_enqueue_scripts', [ $this, 'register_scripts' ] );
		add_action( 'wp_enqueue_scripts', [ $this, 'register_scripts' ] );
		add_action( 'refraction/frontend/after_register_scripts', [ $this, 'register_scripts' ] );
		add_action( 'refraction/common/after_register_scripts', [ $this, 'register_scripts' ] );
	}

	public function get_name() {
		return 'dev-tools';
	}

	public function register_scripts() {
		wp_register_script(
			'refraction-dev-tools',
			$this->get_js_assets_url( 'dev-tools' ),
			[],
			REFRACTION_VERSION,
			true
		);

		$this->print_config( 'refraction-dev-tools' );
	}

	protected function get_init_settings() {
		return [
			'isDebug' => ( defined( 'WP_DEBUG' ) && WP_DEBUG ),
			'urls' => [
				'assets' => REFRACTION_ASSETS_URL,
			],
			'deprecation' => $this->deprecation->get_settings(),
		];
	}
}
