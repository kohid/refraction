<?php
namespace Refraction\Modules\ElementManager;

use Refraction\Core\Base\Module as BaseModule;
use Refraction\Core\Admin\Menu\Admin_Menu_Manager;
use Refraction\Modules\EditorOne\Classes\Menu_Data_Provider;
use Refraction\Modules\ElementManager\AdminMenuItems\Editor_One_Elements_Manager_Menu;
use Refraction\Widget_Base;
use Refraction\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Module extends BaseModule {

	const PAGE_ID = 'refraction-element-manager';

	public function get_name() {
		return 'element-manager';
	}

	public function __construct() {
		parent::__construct();

		$ajax = new Ajax();
		$ajax->register_endpoints();

		add_action( 'refraction/editor-one/menu/register', function ( Menu_Data_Provider $menu_data_provider ) {
			$this->register_editor_one_menu( $menu_data_provider );
		} );

		add_action( 'refraction/editor-one/menu/after_register_hidden_submenus', function ( array $hooks ) {
			$this->enqueue_assets_for_editor_one_menu( $hooks );
		} );

		add_filter( 'refraction/widgets/is_widget_enabled', function( $should_register, Widget_Base $widget_instance ) {
			return ! Options::is_element_disabled( $widget_instance->get_name() );
		}, 10, 2 );

		add_filter( 'refraction/system-info/usage/settings', function( $usage ) {
			$disabled_elements = Options::get_disabled_elements();

			if ( ! empty( $disabled_elements ) ) {
				$usage['disabled_elements'] = implode( ', ', $disabled_elements );
			}

			return $usage;
		} );
	}

	public function enqueue_assets_for_editor_one_menu( array $hooks ): void {
		if ( ! empty( $hooks[ static::PAGE_ID ] ) ) {
			add_action( "admin_print_scripts-{$hooks[ static::PAGE_ID ]}", [ $this, 'enqueue_assets' ] );
			add_action( "admin_footer-{$hooks[ static::PAGE_ID ]}", [ $this, 'print_styles' ], 1000 );
		}
	}

	private function register_editor_one_menu( Menu_Data_Provider $menu_data_provider ): void {
		$menu_data_provider->register_menu( new Editor_One_Elements_Manager_Menu() );
	}

	public function enqueue_assets() {
		wp_enqueue_script(
			'e-element-manager-app',
			$this->get_js_assets_url( 'element-manager-admin' ),
			[
				'wp-element',
				'wp-components',
				'wp-dom-ready',
				'wp-i18n',
				'refraction-v2-ui',
				'refraction-v2-icons',
			],
			REFRACTION_VERSION
		);

		wp_localize_script( 'e-element-manager-app', 'eElementManagerConfig', [
			'nonce' => wp_create_nonce( 'e-element-manager-app' ),
			'ajaxurl' => admin_url( 'admin-ajax.php' ),
		] );

		wp_set_script_translations( 'e-element-manager-app', 'refraction' );

		wp_enqueue_style( 'wp-components' );
		wp_enqueue_style( 'wp-format-library' );
	}

	public function print_styles() {
		?>
		<style>
			.components-button.is-secondary:disabled {
				box-shadow: inset 0 0 0 1px #949494;
			}
		</style>
		<?php
	}
}
