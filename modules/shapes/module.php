<?php

namespace Refraction\Modules\Shapes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Module extends \Refraction\Core\Base\Module {

	public function __construct() {
		parent::__construct();

		add_action( 'refraction/frontend/after_register_styles', [ $this, 'register_styles' ] );
	}

	/**
	 * Register styles.
	 *
	 * At build time, Refraction compiles `/modules/shapes/assets/scss/frontend.scss`
	 * to `/assets/css/widget-shapes.min.css`.
	 *
	 * @return void
	 */
	public function register_styles() {
		wp_register_style(
			'widget-text-path',
			$this->get_css_assets_url( 'widget-text-path', null, true, true ),
			[ 'refraction-frontend' ],
			REFRACTION_VERSION
		);
	}

	/**
	 * Return a translated user-friendly list of the available SVG shapes.
	 *
	 * @param bool $add_custom Determine if the output should include the `Custom` option.
	 *
	 * @return array List of paths.
	 */
	public static function get_paths( $add_custom = true ) {
		$paths = [
			'wave' => esc_html__( 'Wave', 'refraction' ),
			'arc' => esc_html__( 'Arc', 'refraction' ),
			'circle' => esc_html__( 'Circle', 'refraction' ),
			'line' => esc_html__( 'Line', 'refraction' ),
			'oval' => esc_html__( 'Oval', 'refraction' ),
			'spiral' => esc_html__( 'Spiral', 'refraction' ),
		];

		if ( $add_custom ) {
			$paths['custom'] = esc_html__( 'Custom', 'refraction' );
		}

		return $paths;
	}

	/**
	 * Get an SVG Path URL from the pre-defined ones.
	 *
	 * @param string $path - Path name.
	 *
	 * @return string
	 */
	public static function get_path_url( $path ) {
		return REFRACTION_ASSETS_URL . 'svg-paths/' . $path . '.svg';
	}

	/**
	 * Get the module's associated widgets.
	 *
	 * @return string[]
	 */
	protected function get_widgets() {
		return [
			'TextPath',
		];
	}

	/**
	 * Retrieve the module name.
	 *
	 * @return string
	 */
	public function get_name() {
		return 'shapes';
	}
}
