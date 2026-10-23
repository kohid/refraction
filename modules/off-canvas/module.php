<?php
namespace Refraction\Modules\OffCanvas;

use Refraction\Core\Base\Module as BaseModule;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Off-Canvas: a panel (one container with any widgets) that slides in from a side or opens as an overlay.
 */
class Module extends BaseModule {

	public function get_name() {
		return 'off-canvas';
	}

	protected function get_widgets() {
		return [ 'Off_Canvas' ];
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
	 * At build time `/modules/off-canvas/assets/scss/frontend.scss` is compiled to `/assets/css/widget-off-canvas.min.css`.
	 */
	public function register_styles() {
		wp_register_style(
			'widget-off-canvas',
			$this->get_css_assets_url( 'widget-off-canvas', null, true, true ),
			[ 'refraction-frontend' ],
			REFRACTION_VERSION
		);
	}
}
