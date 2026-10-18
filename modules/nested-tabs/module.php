<?php
namespace Refraction\Modules\NestedTabs;

use Refraction\Plugin;
use Refraction\Modules\NestedElements\Module as NestedElementsModule;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Module extends \Refraction\Core\Base\Module {

	public static function is_active() {
		return Plugin::$instance->experiments->is_feature_active( 'container' );
	}

	public function get_name() {
		return 'nested-tabs';
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
	 * Register styles.
	 *
	 * At build time, Refraction compiles `/modules/nested-tabs/assets/scss/frontend.scss`
	 * to `/assets/css/widget-nested-tabs.min.css`.
	 *
	 * @return void
	 */
	public function register_styles() {
		$direction_suffix = is_rtl() ? '-rtl' : '';
		$has_custom_breakpoints = Plugin::$instance->breakpoints->has_custom_breakpoints();

		wp_register_style(
			'widget-nested-tabs',
			$this->get_frontend_file_url( "widget-nested-tabs{$direction_suffix}.min.css", $has_custom_breakpoints ),
			[ 'refraction-frontend' ],
			$has_custom_breakpoints ? null : REFRACTION_VERSION
		);
	}
}
