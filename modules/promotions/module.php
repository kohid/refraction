<?php

namespace Elementor\Modules\Promotions;

use Elementor\Api;
use Elementor\Controls_Manager;
use Elementor\Core\Base\Module as Base_Module;
use Elementor\Core\Utils\Promotions\Filtered_Promotions_Manager;
use Elementor\Modules\Promotions\AdminMenuItems\Editor_One_Custom_Code_Menu;
use Elementor\Modules\Promotions\AdminMenuItems\Editor_One_Custom_Elements_Menu;
use Elementor\Modules\Promotions\AdminMenuItems\Editor_One_Fonts_Menu;
use Elementor\Modules\Promotions\AdminMenuItems\Editor_One_Icons_Menu;
use Elementor\Modules\Promotions\AdminMenuItems\Editor_One_Popups_Menu;
use Elementor\Modules\Promotions\AdminMenuItems\Editor_One_Submissions_Menu;
use Elementor\Modules\Promotions\AdminMenuItems\Go_Pro_Promotion_Item;
use Elementor\Modules\Promotions\Conversion_Banner;
use Elementor\Modules\Promotions\Pointers\Birthday;
use Elementor\Modules\Promotions\Pointers\Promotional_Pointer;
use Elementor\Widgets_Manager;
use Elementor\Utils;
use Elementor\Includes\EditorAssetsAPI;
use Elementor\Modules\EditorOne\Classes\Menu_Config;
use Elementor\Modules\EditorOne\Classes\Menu_Data_Provider;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Module extends Base_Module {

	const ADMIN_MENU_PRIORITY = 100;

	const ADMIN_MENU_PROMOTIONS_PRIORITY = 120;

	public static function is_active() {
		if ( Utils::has_pro() ) {
			return true;
		}

		return ! Utils::is_license_active();
	}

	public function get_name() {
		return 'promotions';
	}

	public function __construct() {
		parent::__construct();

		if ( Utils::has_pro() ) {
			add_action( 'elementor/editor/before_enqueue_scripts', [ $this, 'enqueue_react_data' ] );
			return;
		}

		add_action( 'admin_init', function () {
			$this->handle_external_redirects();
		} );

		add_action( 'elementor/editor-one/menu/register', function ( Menu_Data_Provider $menu_data_provider ) {
			$this->register_editor_one_menu_items( $menu_data_provider );
		} );

		add_filter( 'add_menu_classes', [ $this, 'override_one_menu_upgrade_label_during_sale' ] );
		add_filter( 'elementor_one/upgrade_url', [ $this, 'override_one_menu_upgrade_url' ] );

		add_action( 'elementor/widgets/register', function( Widgets_Manager $manager ) {
			foreach ( Api::get_promotion_widgets() as $widget_data ) {
				$manager->register( new Widgets\Pro_Widget_Promotion( [], [
					'widget_name' => $widget_data['name'],
					'widget_title' => $widget_data['title'],
				] ) );
			}
		} );

		if ( Birthday::should_display_notice() ) {
			new Birthday();
		}

		if ( Promotional_Pointer::should_display_notice() ) {
			new Promotional_Pointer();
		}

		if ( ! Utils::has_pro() ) {
			Conversion_Banner::register_cache_invalidation_hooks();

			if ( Conversion_Banner::should_display_banner() ) {
				new Conversion_Banner();
			}
		}

		add_filter( 'elementor/editor/localize_settings', [ $this, 'add_editing_panel_sticky_promotion' ] );

		add_action( 'elementor/controls/register', function ( Controls_Manager $controls_manager ) {
			$controls_manager->register( new Controls\Promotion_Control() );
		} );

		add_action( 'elementor/editor/before_enqueue_scripts', [ $this, 'enqueue_react_data' ] );
	}

	private function handle_external_redirects() {
		$page = filter_input( INPUT_GET, 'page', FILTER_SANITIZE_FULL_SPECIAL_CHARS );
		if ( empty( $page ) ) {
			return;
		}

		if ( in_array( $page, [ 'go_elementor_pro', 'elementor-one-upgrade' ], true ) ) {
			add_filter( 'allowed_redirect_hosts', function ( $hosts, $host ) {
				if ( 'elementor.com' === $host || str_ends_with( $host, '.elementor.com' ) ) {
					$hosts[] = $host;
				}
				return $hosts;
			}, 10, 2 );
			wp_safe_redirect( Go_Pro_Promotion_Item::get_url() );
			die;
		}
	}

	public function override_one_menu_upgrade_label_during_sale( $menu ) {
		$assets_data = Go_Pro_Promotion_Item::get_side_menu_assets_data();

		if ( empty( $assets_data['is_active'] ) || empty( $assets_data['label'] ) ) {
			return $menu;
		}

		global $submenu;

		$parent_slug = Menu_Config::ELEMENTOR_HOME_MENU_SLUG;
		$upgrade_slug = 'elementor-one-upgrade';

		if ( empty( $submenu[ $parent_slug ] ) ) {
			return $menu;
		}

		foreach ( $submenu[ $parent_slug ] as &$item ) {
			if ( isset( $item[2] ) && $upgrade_slug === $item[2] ) {
				$item[0] = esc_html( $assets_data['label'] ); // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
				break;
			}
		}

		return $menu;
	}

	public function override_one_menu_upgrade_url( string $url ): string {
		$assets_data = Go_Pro_Promotion_Item::get_side_menu_assets_data();

		if ( ! empty( $assets_data['is_active'] ) ) {
			return Go_Pro_Promotion_Item::get_url();
		}

		return $url;
	}

	private function register_editor_one_menu_items( Menu_Data_Provider $menu_data_provider ) {
		$menu_data_provider->register_menu( new Editor_One_Custom_Elements_Menu() );
		$menu_data_provider->register_menu( new Editor_One_Submissions_Menu() );
		$menu_data_provider->register_menu( new Editor_One_Fonts_Menu() );
		$menu_data_provider->register_menu( new Editor_One_Icons_Menu() );
		$menu_data_provider->register_menu( new Editor_One_Custom_Code_Menu() );
		$menu_data_provider->register_menu( new Editor_One_Popups_Menu() );
	}

	public function enqueue_react_data(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$min_suffix = Utils::is_script_debug() ? '' : '.min';

		wp_enqueue_script(
			'e-react-promotions',
			ELEMENTOR_ASSETS_URL . 'js/e-react-promotions' . $min_suffix . '.js',
			[
				'react',
				'react-dom',
				'backbone-marionette',
				'elementor-editor-modules',
				'elementor-v2-ui',
				'elementor-v2-icons',
			],
			ELEMENTOR_VERSION,
			true
		);

		wp_set_script_translations( 'e-react-promotions', 'elementor' );

		wp_localize_script(
			'e-react-promotions',
			'elementorPromotionsData',
			$this->get_app_js_config()
		);
	}

	private function get_app_js_config(): array {
		$editor_assets_api = new EditorAssetsAPI( $this->get_api_config() );
		$promotion_data = new PromotionData( $editor_assets_api );

		return $promotion_data->get_promotion_data();
	}

	private function get_api_config(): array {
		return [
			EditorAssetsAPI::ASSETS_DATA_URL => 'https://assets.elementor.com/free-to-pro-upsell/v1/free-to-pro-upsell.json',
			EditorAssetsAPI::ASSETS_DATA_TRANSIENT_KEY => '_elementor_free_to_pro_upsell',
			EditorAssetsAPI::ASSETS_DATA_KEY => 'free-to-pro-upsell',
		];
	}

	public function add_editing_panel_sticky_promotion( array $settings ): array {
		$settings['editingPanelStickyPromotion'] = Filtered_Promotions_Manager::get_editor_panel_sticky_promotion();

		return $settings;
	}
}
