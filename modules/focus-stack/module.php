<?php
namespace Refraction\Modules\FocusStack;

use Refraction\Core\Base\Module as BaseModule;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Focus Stack (0.110.0): a stack of slides where the current one is a whole card (header, content and footer
 * containers) and the slides before and after it wait as slim cards showing only their header or footer. Moving on,
 * the waiting card grows into the current one while the old one folds away into its own slim card.
 */
class Module extends BaseModule {

	public function get_name() {
		return 'focus-stack';
	}

	protected function get_widgets() {
		return [ 'Focus_Stack' ];
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
	 * At build time `/modules/focus-stack/assets/scss/frontend.scss` is compiled to `/assets/css/widget-focus-stack.min.css`.
	 */
	public function register_styles() {
		wp_register_style(
			'widget-focus-stack',
			$this->get_css_assets_url( 'widget-focus-stack', null, true, true ),
			[ 'refraction-frontend' ],
			REFRACTION_VERSION
		);
	}
}
