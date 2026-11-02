<?php
namespace Refraction\Modules\TimedSlides;

use Refraction\Core\Base\Module as BaseModule;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Timed Slides: the "Timed cards" slider with a container per slide (any widgets), and the content and the cards
 * placed separately. It shares the styles and the engine of the Slides widget's Timed cards layout (card-motion).
 */
class Module extends BaseModule {

	public function get_name() {
		return 'timed-slides';
	}

	protected function get_widgets() {
		return [ 'Timed_Slides' ];
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
	 * At build time `/modules/timed-slides/assets/scss/frontend.scss` is compiled to `/assets/css/widget-timed-slides.min.css`.
	 */
	public function register_styles() {
		wp_register_style(
			'widget-timed-slides',
			$this->get_css_assets_url( 'widget-timed-slides', null, true, true ),
			[ 'refraction-frontend' ],
			REFRACTION_VERSION
		);
	}
}
