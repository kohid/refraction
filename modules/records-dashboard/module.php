<?php
namespace Refraction\Modules\RecordsDashboard;

use Refraction\Core\Base\Module as BaseModule;
use Refraction\Modules\RecordsDashboard\Classes\Ajax;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Records Dashboard (0.129.0): pages for working with Form Builder records (bookings and the like) on the site.
 *
 * - Sidebar Panel: a container docked to the left or right edge, floating beside it or kept in the page, that folds
 *   into a button and a drawer on small screens (a menu on the left, details on the right).
 * - Records Table: a collection's records with the columns you arrange, search, status and date filters, sorting,
 *   pages and a CSV export; a row opens an Off-Canvas and shows the record in Record Details.
 * - Record Details: the chosen record laid out in sections, with Call / Email and status buttons.
 *
 * Records are never public: each widget says who may see them (signed in at least) and the server checks it again.
 */
class Module extends BaseModule {

	const CATEGORY = 'refraction-records';

	public function get_name() {
		return 'records-dashboard';
	}

	protected function get_widgets() {
		return [ 'Sidebar_Panel', 'Records_Table', 'Record_Details' ];
	}

	public function __construct() {
		parent::__construct();

		new Ajax();

		add_action( 'refraction/frontend/after_register_styles', [ $this, 'register_styles' ] );

		add_action( 'refraction/elements/categories_registered', static function ( $elements_manager ) {
			$elements_manager->add_category( self::CATEGORY, [
				'title' => esc_html__( 'Records', 'refraction' ),
				'icon' => 'rficon-table',
				'active' => true,
			] );
		} );

		add_action( 'refraction/editor/before_enqueue_scripts', function () {
			wp_enqueue_script( $this->get_name(), $this->get_js_assets_url( $this->get_name() ), [
				'nested-elements',
			], REFRACTION_VERSION, true );
		} );
	}

	/**
	 * At build time `/modules/records-dashboard/assets/scss/frontend.scss` is compiled to
	 * `/assets/css/widget-records-dashboard.min.css`.
	 */
	public function register_styles() {
		wp_register_style(
			'widget-records-dashboard',
			$this->get_css_assets_url( 'widget-records-dashboard', null, true, true ),
			[ 'refraction-frontend' ],
			REFRACTION_VERSION
		);
	}
}
