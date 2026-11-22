<?php
namespace Refraction\Modules\PinBoard;

use Refraction\Core\Base\Module as BaseModule;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Pin Board (0.143.0): notes pinned to a board, each an empty container to design, in a zigzag (one per row, left and
 * right) or a grid, per screen size, joined by dashed lines from each note to the next.
 */
class Module extends BaseModule {

	public function get_name() {
		return 'pin-board';
	}

	protected function get_widgets() {
		return [ 'Pin_Board' ];
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

	/** `assets/scss/frontend.scss` is built to `/assets/css/widget-pin-board.min.css`. */
	public function register_styles() {
		wp_register_style(
			'widget-pin-board',
			$this->get_css_assets_url( 'widget-pin-board', null, true, true ),
			[ 'refraction-frontend' ],
			REFRACTION_VERSION
		);
	}
}
