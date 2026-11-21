<?php
namespace Refraction\Modules\ConnectorSteps;

use Refraction\Core\Base\Module as BaseModule;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Connector (0.142.0): steps (each an empty container to design) with an arrow from each to the next: a row on wide
 * screens, one under another on phones (the arrows pointing down). The arrows are part of the widget's markup and
 * placed by CSS, so they follow the steps as they are added, moved or removed.
 */
class Module extends BaseModule {

	public function get_name() {
		return 'connector-steps';
	}

	protected function get_widgets() {
		return [ 'Connector_Steps' ];
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

	/** `assets/scss/frontend.scss` is built to `/assets/css/widget-connector-steps.min.css`. */
	public function register_styles() {
		wp_register_style(
			'widget-connector-steps',
			$this->get_css_assets_url( 'widget-connector-steps', null, true, true ),
			[ 'refraction-frontend' ],
			REFRACTION_VERSION
		);
	}
}
