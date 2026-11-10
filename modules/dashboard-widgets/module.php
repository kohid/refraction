<?php
namespace Refraction\Modules\DashboardWidgets;

use Refraction\Core\Base\Module as BaseModule;
use Refraction\Modules\DashboardWidgets\Tags\Site_Statistic;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Dashboard widgets: Chart (bar, horizontal bar, line, area, pie, donut; drawn on the server as HTML and SVG, no
 * chart library), Data Table (sortable, searchable, paged, readable on phones) and Stat Card (a big number with its
 * change and a sparkline), every value open to Dynamic Tags; and the Site Statistic dynamic tag. A clean admin
 * dashboard look: white cards with soft shadows, muted labels, dashed table rows and tinted badges.
 */
class Module extends BaseModule {

	const CATEGORY = 'refraction-dashboard';

	public function get_name() {
		return 'dashboard-widgets';
	}

	protected function get_widgets() {
		return [ 'Chart', 'Data_Table', 'Stat_Card' ];
	}

	public function __construct() {
		parent::__construct();

		add_action( 'refraction/frontend/after_register_scripts', [ $this, 'register_assets' ] );
		add_action( 'refraction/frontend/after_register_styles', [ $this, 'register_assets' ] );
		add_action( 'refraction/preview/enqueue_scripts', [ $this, 'enqueue_for_preview' ] );
		add_action( 'refraction/dynamic_tags/register', [ $this, 'register_tags' ] );
		add_action( 'refraction/elements/categories_registered', [ $this, 'register_category' ] );
	}

	public function register_category( $elements_manager ) {
		$elements_manager->add_category( self::CATEGORY, [
			'title' => esc_html__( 'Dashboard', 'refraction' ),
			'icon' => 'rficon-dashboard',
		] );
	}

	public function register_assets() {
		if ( wp_style_is( 'refraction-dashboard', 'registered' ) ) {
			return;
		}

		$min = Utils::is_script_debug() ? '' : '.min';
		wp_register_style( 'refraction-dashboard', REFRACTION_ASSETS_URL . 'css/modules/dashboard-widgets/frontend' . $min . '.css', [], REFRACTION_VERSION );
		wp_register_script( 'refraction-dashboard', REFRACTION_ASSETS_URL . 'js/dashboard-frontend' . $min . '.js', [], REFRACTION_VERSION, true );
	}

	public function enqueue_for_preview() {
		$this->register_assets();
		wp_enqueue_style( 'refraction-dashboard' );
		wp_enqueue_script( 'refraction-dashboard' );
	}

	public function register_tags( $dynamic_tags ) {
		$dynamic_tags->register( new Site_Statistic() );
	}
}
