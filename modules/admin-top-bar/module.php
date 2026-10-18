<?php
namespace Refraction\Modules\AdminTopBar;

use Refraction\Core\Admin\Admin;
use Refraction\Core\Base\App as BaseApp;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Module extends BaseApp {

	/**
	 * @return bool
	 */
	public static function is_active() {
		return is_admin();
	}

	/**
	 * @return string
	 */
	public function get_name() {
		return 'admin-top-bar';
	}

	private function render_admin_top_bar() {
		?>
		<div id="e-admin-top-bar-root">
		</div>
		<?php
	}

	/**
	 * Enqueue admin scripts
	 */
	private function enqueue_scripts() {
		wp_enqueue_style( 'refraction-admin-top-bar-fonts', 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap', [], REFRACTION_VERSION );

		wp_enqueue_style( 'refraction-admin-top-bar', $this->get_css_assets_url( 'admin-top-bar' ), [], REFRACTION_VERSION );

		/**
		 * Before admin top bar enqueue scripts.
		 *
		 * Fires before Refraction admin top bar scripts are enqueued.
		 *
		 * @since 3.19.0
		 */
		do_action( 'refraction/admin_top_bar/before_enqueue_scripts', $this );

		wp_enqueue_script( 'refraction-admin-top-bar', $this->get_js_assets_url( 'admin-top-bar' ), [
			'refraction-common',
			'react',
			'react-dom',
			'tipsy',
		], REFRACTION_VERSION, true );

		wp_set_script_translations( 'refraction-admin-top-bar', 'refraction' );

		$min_suffix = Utils::is_script_debug() ? '' : '.min';

		wp_enqueue_script( 'tipsy', REFRACTION_ASSETS_URL . 'lib/tipsy/tipsy' . $min_suffix . '.js', [
			'jquery',
		], '1.0.0', true );

		$this->print_config();
	}

	private function add_frontend_settings() {
		$settings = [];
		$settings['is_administrator'] = current_user_can( 'manage_options' );

		$this->set_settings( $settings );

		do_action( 'refraction/admin-top-bar/init', $this );
	}

	private function is_top_bar_active() {
		$current_screen = get_current_screen();

		return apply_filters(
			'refraction/admin-top-bar/is-active',
			Admin::is_refraction_admin_page( $current_screen ),
			$current_screen
		);
	}

	/**
	 * Module constructor.
	 */
	public function __construct() {
		parent::__construct();

		add_action( 'current_screen', function () {
			if ( ! $this->is_top_bar_active() ) {
				return;
			}

			$this->add_frontend_settings();

			add_action( 'in_admin_header', function () {
				$this->render_admin_top_bar();
			} );

			add_action( 'admin_enqueue_scripts', function () {
				$this->enqueue_scripts();
			} );
		} );
	}
}
