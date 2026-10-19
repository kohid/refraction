<?php
namespace Refraction\Modules\MegaMenu;

use Refraction\Core\Base\Module as BaseModule;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Mega Menu: a menu whose items open a dropdown container with any widgets.
 */
class Module extends BaseModule {

	public function get_name() {
		return 'mega-menu';
	}

	protected function get_widgets() {
		return [ 'Mega_Menu' ];
	}

	public function __construct() {
		parent::__construct();

		add_action( 'refraction/frontend/after_register_styles', [ $this, 'register_styles' ] );

		add_action( 'refraction/editor/before_enqueue_scripts', function () {
			wp_enqueue_script( $this->get_name(), $this->get_js_assets_url( $this->get_name() ), [
				'nested-elements',
			], REFRACTION_VERSION, true );
		} );
	}

	/**
	 * At build time `/modules/mega-menu/assets/scss/frontend.scss` is compiled to `/assets/css/widget-mega-menu.min.css`.
	 */
	public function register_styles() {
		wp_register_style(
			'widget-mega-menu',
			$this->get_css_assets_url( 'widget-mega-menu', null, true, true ),
			[ 'refraction-frontend' ],
			REFRACTION_VERSION
		);
	}
}
