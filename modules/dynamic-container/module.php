<?php
namespace Refraction\Modules\DynamicContainer;

use Refraction\Core\Base\Module as BaseModule;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Dynamic Container (0.120.0): a list of containers, each the same as a Container, laid out as a grid with its own
 * number of columns per screen size, or as a row that scrolls sideways (with no scrollbar, the next one peeking), by
 * default on phones.
 */
class Module extends BaseModule {

	public function get_name() {
		return 'dynamic-container';
	}

	protected function get_widgets() {
		return [ 'Dynamic_Container' ];
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
	 * At build time `/modules/dynamic-container/assets/scss/frontend.scss` is compiled to
	 * `/assets/css/widget-dynamic-container.min.css`.
	 */
	public function register_styles() {
		wp_register_style(
			'widget-dynamic-container',
			$this->get_css_assets_url( 'widget-dynamic-container', null, true, true ),
			[ 'refraction-frontend' ],
			REFRACTION_VERSION
		);
	}
}
