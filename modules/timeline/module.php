<?php
namespace Refraction\Modules\Timeline;

use Refraction\Core\Base\Module as BaseModule;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Timeline (0.139.0): entries along a line, each an empty container to design freely, with a marker on the line (a
 * dot, an icon, its number or a text such as a year). The line on the left, on the right or in the middle with the
 * entries on alternate sides, per screen size; the line can fill as the page scrolls.
 */
class Module extends BaseModule {

	public function get_name() {
		return 'timeline';
	}

	protected function get_widgets() {
		return [ 'Timeline' ];
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

	/** `assets/scss/frontend.scss` is built to `/assets/css/widget-timeline.min.css`. */
	public function register_styles() {
		wp_register_style(
			'widget-timeline',
			$this->get_css_assets_url( 'widget-timeline', null, true, true ),
			[ 'refraction-frontend' ],
			REFRACTION_VERSION
		);
	}
}
