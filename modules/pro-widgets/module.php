<?php
namespace Refraction\Modules\ProWidgets;

use Refraction\Core\Base\Module as BaseModule;
use Refraction\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Pro-style widgets, always on: Nav Menu, Slides, Price List, Price Table, Flip Box, Call to Action,
 * Animated Headline, Countdown, Share Buttons, Blockquote, Progress Tracker, Table of Contents.
 */
class Module extends BaseModule {

	const CATEGORY = 'refraction-advanced';

	public function get_name() {
		return 'pro-widgets';
	}

	protected function get_widgets() {
		return [
			'Nav_Menu',
			'Slides',
			'Price_List',
			'Price_Table',
			'Flip_Box',
			'Call_To_Action',
			'Animated_Headline',
			'Countdown',
			'Share_Buttons',
			'Blockquote',
			'Progress_Tracker',
			'Table_Of_Contents',
		];
	}

	/**
	 * Style handles (without the `widget-` prefix), one per compiled `assets/scss/widgets/<name>.scss`.
	 */
	public static function get_style_names(): array {
		return [
			'nav-menu',
			'slides',
			'price-list',
			'price-table',
			'flip-box',
			'call-to-action',
			'animated-headline',
			'countdown',
			'share-buttons',
			'blockquote',
			'progress-tracker',
			'table-of-contents',
		];
	}

	public function __construct() {
		parent::__construct();

		add_action( 'refraction/elements/categories_registered', [ $this, 'register_category' ] );
		add_action( 'refraction/frontend/after_register_styles', [ $this, 'register_styles' ] );
	}

	public function register_category( $elements_manager ) {
		$elements_manager->add_category( self::CATEGORY, [
			'title' => esc_html__( 'Advanced', 'refraction' ),
			'icon' => 'rficon-font',
		] );
	}

	/**
	 * At build time every `modules/pro-widgets/assets/scss/widgets/<name>.scss` is compiled to
	 * `/assets/css/widget-<name>.min.css` (plus a template for custom breakpoints when it has media queries).
	 */
	public function register_styles() {
		$direction_suffix = is_rtl() ? '-rtl' : '';
		$has_custom_breakpoints = Plugin::$instance->breakpoints->has_custom_breakpoints();
		$responsive = $this->get_responsive_styles();

		foreach ( self::get_style_names() as $name ) {
			$is_responsive = ! empty( $responsive[ $name ] ) && $has_custom_breakpoints;

			wp_register_style(
				'widget-' . $name,
				$this->get_frontend_file_url( "widget-{$name}{$direction_suffix}.min.css", $is_responsive ),
				[ 'refraction-frontend' ],
				$is_responsive ? null : REFRACTION_VERSION
			);
		}
	}

	private function get_responsive_styles(): array {
		static $list = null;

		if ( null === $list ) {
			$file = REFRACTION_ASSETS_PATH . 'data/responsive-widgets.json';
			$data = is_readable( $file ) ? json_decode( (string) file_get_contents( $file ), true ) : null; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
			$list = is_array( $data ) ? $data : [];
		}

		return $list;
	}
}
