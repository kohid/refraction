<?php
namespace Refraction\Modules\ShowcaseWheel;

use Refraction\Core\Base\Module as BaseModule;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Showcase Wheel (0.113.0): a product slider. Each slide is a container (its own background, overlay and border)
 * holding a content container on one side; the slide's picture sits on the other, with an optional arc or blob behind
 * it. Moving on, the pictures swing along a large wheel (the old one out, the new one in) while the slides cross-fade;
 * thumbnails below pick a slide.
 */
class Module extends BaseModule {

	public function get_name() {
		return 'showcase-wheel';
	}

	protected function get_widgets() {
		return [ 'Showcase_Wheel' ];
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
	 * At build time `/modules/showcase-wheel/assets/scss/frontend.scss` is compiled to `/assets/css/widget-showcase-wheel.min.css`.
	 */
	public function register_styles() {
		wp_register_style(
			'widget-showcase-wheel',
			$this->get_css_assets_url( 'widget-showcase-wheel', null, true, true ),
			[ 'refraction-frontend' ],
			REFRACTION_VERSION
		);
	}
}
