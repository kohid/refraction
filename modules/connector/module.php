<?php
namespace Refraction\Modules\Connector;

use Refraction\Core\Base\Module as BaseModule;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Connector (0.140.0): an arrow from one element to another (by default from the container holding the widget to the
 * container after it), drawn from where they are on the page and drawn again when the layout changes.
 */
class Module extends BaseModule {

	public function get_name() {
		return 'connector';
	}

	protected function get_widgets() {
		return [ 'Connector' ];
	}

	public function __construct() {
		parent::__construct();

		add_action( 'refraction/frontend/after_register_styles', [ $this, 'register_styles' ] );
	}

	/** `assets/scss/frontend.scss` is built to `/assets/css/widget-connector.min.css`. */
	public function register_styles() {
		wp_register_style(
			'widget-connector',
			$this->get_css_assets_url( 'widget-connector', null, true, true ),
			[ 'refraction-frontend' ],
			REFRACTION_VERSION
		);
	}
}
