<?php

namespace Refraction\Core\Admin\EditorOneMenu;

use Refraction\Core\Admin\EditorOneMenu\Menu\Editor_One_Custom_Elements_Menu;
use Refraction\Core\Admin\EditorOneMenu\Interfaces\Menu_Item_Interface;
use Refraction\Modules\EditorOne\Classes\Legacy_Submenu_Interceptor;
use Refraction\Modules\EditorOne\Classes\Menu_Config;
use Refraction\Modules\EditorOne\Classes\Menu_Data_Provider;
use Refraction\Modules\EditorOne\Classes\Slug_Normalizer;
use Refraction\Plugin;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Refraction_One_Menu_Manager {

	private Menu_Data_Provider $menu_data_provider;

	private bool $is_pro_module_enabled = false;

	private Legacy_Submenu_Interceptor $legacy_submenu_interceptor;

	public function __construct() {
		$this->menu_data_provider = Menu_Data_Provider::instance();
		$this->legacy_submenu_interceptor = new Legacy_Submenu_Interceptor(
			$this->menu_data_provider,
			new Slug_Normalizer()
		);
		$this->register_actions();
	}

	private function register_actions(): void {
		add_action( 'init', [ $this, 'check_if_pro_module_is_enabled' ] );
		add_action( 'admin_menu', [ $this, 'register_top_level_menu' ], 8 );
		add_action( 'admin_menu', [ $this, 'register_refraction_home_submenus' ], 9 );

		add_action( 'admin_menu', function () {
			do_action( 'refraction/editor-one/menu/register', $this->menu_data_provider );
		} );

		add_action( 'admin_menu', [ $this, 'intercept_legacy_submenus' ], 10003 );
		add_action( 'admin_menu', [ $this, 'register_flyout_items_as_hidden_submenus' ], 10004 );
		add_action( 'admin_menu', [ $this, 'build_visible_submenu' ], 10005 );
		add_filter( 'parent_file', [ $this, 'filter_parent_file' ] );
		add_filter( 'submenu_file', [ $this, 'filter_submenu_file' ], 10, 2 );
		add_action( 'admin_menu', [ $this, 'remove_legacy_templates_menu' ], 10006 );
		add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_admin_menu_assets' ] );
	}

	public function check_if_pro_module_is_enabled(): void {
		$this->is_pro_module_enabled = apply_filters( 'refraction/modules/editor-one/is_pro_module_enabled', false );

		if ( ! $this->is_pro_module_enabled && Utils::has_pro() ) {
			$this->menu_data_provider->register_menu( new Editor_One_Custom_Elements_Menu() );
		}
	}

	/**
	 * The visible top-level "Refraction" item in the WordPress admin sidebar.
	 * Its children are assembled by build_visible_submenu(). Visible to everyone who can edit posts;
	 * each child keeps its own capability (manage_options for settings, tools, system pages).
	 */
	public function register_top_level_menu(): void {
		add_menu_page(
			esc_html__( 'Refraction', 'refraction' ),
			esc_html__( 'Refraction', 'refraction' ),
			Menu_Config::CAPABILITY_EDIT_POSTS,
			Menu_Config::REFRACTION_HOME_MENU_SLUG,
			[ $this, 'render_editor_page' ],
			$this->get_menu_icon(),
			Menu_Config::MENU_POSITION
		);
	}

	private function get_menu_icon(): string {
		// A prism: a triangle with a split beam leaving its right side. WordPress recolors `fill="black"`.
		$svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="black" fill-rule="evenodd" d="M7.5 2.5 14 15.5H1L7.5 2.5Zm0 3.6L4.2 12.8h6.6L7.5 6.1Z"/><path fill="black" d="m13.1 8.1 6.4-2v1.6l-5.6 1.8-.8-1.4Zm1.6 2.2 4.8.4v1.5l-4.4.2-.4-2.1Z"/></svg>';

		return 'data:image/svg+xml;base64,' . base64_encode( $svg ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode
	}

	public function register_refraction_home_submenus(): void {
		add_submenu_page(
			Menu_Config::REFRACTION_HOME_MENU_SLUG,
			esc_html__( 'Refraction', 'refraction' ),
			esc_html__( 'Home', 'refraction' ),
			Menu_Config::CAPABILITY_EDIT_POSTS,
			Menu_Config::REFRACTION_MENU_SLUG,
			[ $this, 'render_editor_page' ],
			0
		);

		do_action( 'refraction/editor-one/menu/register_submenus' );
	}

	/**
	 * Replace the submenu of the top-level item with the registered menu items the current user can
	 * open, in priority order. Group parents (Templates, System) are replaced by their children, the
	 * duplicate "Quick start" entry and non-page entries are dropped.
	 */
	public function build_visible_submenu(): void {
		global $submenu;

		$parent = Menu_Config::REFRACTION_HOME_MENU_SLUG;
		$registered = $submenu[ $parent ] ?? [];

		$by_slug = [];
		foreach ( $registered as $entry ) {
			$by_slug[ $entry[2] ] ??= $entry;
		}

		$home = $by_slug[ Menu_Config::REFRACTION_MENU_SLUG ] ?? null;

		if ( ! $home ) {
			return;
		}

		$visible = [ $home ];

		foreach ( $this->menu_data_provider->get_visible_submenu_items() as $item ) {
			if ( ! isset( $by_slug[ $item['slug'] ] ) ) {
				continue;
			}

			$entry = $by_slug[ $item['slug'] ];
			$entry[0] = $item['label'];
			$visible[] = $entry;
		}

		$submenu[ $parent ] = $visible; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
	}

	/**
	 * Keep "Refraction" highlighted while viewing the template library or other Refraction post type lists.
	 */
	public function filter_parent_file( $parent_file ) {
		return $this->get_current_refraction_post_type() ? Menu_Config::REFRACTION_HOME_MENU_SLUG : $parent_file;
	}

	public function filter_submenu_file( $submenu_file, $parent_file ) {
		$post_type = $this->get_current_refraction_post_type();

		return $post_type ? 'edit.php?post_type=' . $post_type : $submenu_file;
	}

	private function get_current_refraction_post_type(): string {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;

		if ( ! $screen || empty( $screen->post_type ) || ! in_array( $screen->base, [ 'edit', 'post', 'edit-tags' ], true ) ) {
			return '';
		}

		global $submenu;

		$slug = 'edit.php?post_type=' . $screen->post_type;

		foreach ( $submenu[ Menu_Config::REFRACTION_HOME_MENU_SLUG ] ?? [] as $entry ) {
			if ( $slug === $entry[2] ) {
				return $screen->post_type;
			}
		}

		return '';
	}

	public function render_editor_page(): void {
		Plugin::instance()->settings->display_home_screen();
	}

	/**
	 * The template library post type adds its own top-level "Templates" menu; its pages live under
	 * Refraction > Saved Templates now, so the duplicate is removed from the sidebar.
	 */
	public function remove_legacy_templates_menu(): void {
		global $submenu;

		remove_menu_page( Menu_Config::LEGACY_TEMPLATES_SLUG );

		// Also drop its submenu, otherwise WordPress picks it as the parent of the library screens and
		// "Refraction" is not highlighted there. The pages are already registered under Refraction.
		unset( $submenu[ Menu_Config::LEGACY_TEMPLATES_SLUG ] );
	}

	public function register_flyout_items_as_hidden_submenus(): void {
		$hooks = [];

		$this->iterate_all_flyout_items( function( string $item_slug, Menu_Item_Interface $item ) use ( &$hooks ) {
			$hook = $this->register_hidden_submenu( $item_slug, $item );

			if ( $hook ) {
				$hooks[ $item_slug ] = $hook;
			}
		} );

		do_action( 'refraction/editor-one/menu/after_register_hidden_submenus', $hooks );
	}

	private function register_hidden_submenu( string $item_slug, Menu_Item_Interface $item ) {
		// "Quick start" shares its slug with the Home page, which is registered with a lower capability.
		// Registering it again at manage_options would mark the page as inaccessible for editors.
		if ( Menu_Config::REFRACTION_MENU_SLUG === $item_slug ) {
			return false;
		}

		$original_parent = $this->get_original_parent_slug( $item );
		$parent_slug = $this->resolve_hidden_submenu_parent( $original_parent );
		$has_page = method_exists( $item, 'render' );
		$page_title = $has_page ? $item->get_page_title() : '';
		$callback = $has_page ? [ $item, 'render' ] : '';
		$capability = $item->get_capability();
		$position = $item->get_position();

		return add_submenu_page(
			$parent_slug,
			$page_title,
			$item->get_label(),
			$capability,
			$item_slug,
			$callback,
			$position
		);
	}

	private function resolve_hidden_submenu_parent( ?string $parent_slug ): string {
		$default_parent_slug = Menu_Config::REFRACTION_HOME_MENU_SLUG;
		if ( empty( $parent_slug ) ) {
			return $default_parent_slug;
		}

		$refraction_parent_slugs = [
			Menu_Config::REFRACTION_MENU_SLUG => true,
			Menu_Config::EDITOR_GROUP_ID => true,
			Menu_Config::EDITOR_MENU_SLUG => true,
			Menu_Config::TEMPLATES_GROUP_ID => true,
			Menu_Config::LEGACY_TEMPLATES_SLUG => true,
			Menu_Config::SETTINGS_GROUP_ID => true,
			Menu_Config::CUSTOM_ELEMENTS_GROUP_ID => true,
			Menu_Config::SYSTEM_GROUP_ID => true,
		];

		if ( isset( $refraction_parent_slugs[ $parent_slug ] ) ) {
			return $default_parent_slug;
		}

		return $parent_slug;
	}

	private function iterate_all_flyout_items( callable $callback ): void {
		$level3_items = $this->menu_data_provider->get_level3_items();
		$level4_items = $this->menu_data_provider->get_level4_items();

		$all_items = array_merge_recursive( $level3_items, $level4_items );

		foreach ( $all_items as $group_items ) {
			foreach ( $group_items as $item_slug => $item ) {
				$callback( $item_slug, $item );
			}
		}
	}

	private function get_original_parent_slug( $item ): ?string {
		return $item->get_parent_slug();
	}

	public function intercept_legacy_submenus(): void {
		$this->legacy_submenu_interceptor->intercept_all( $this->is_pro_module_enabled );
	}

	public function enqueue_admin_menu_assets(): void {

		$min_suffix = Utils::is_script_debug() ? '' : '.min';

		wp_enqueue_style(
			'refraction-admin-menu',
			REFRACTION_ASSETS_URL . 'css/modules/editor-one/admin-menu' . $min_suffix . '.css',
			[],
			REFRACTION_VERSION
		);

		// The submenu is a flat list (see build_visible_submenu), so no JS flyout is attached to it.
		$config = [
			'editorFlyout' => [],
		];

		wp_enqueue_script(
			'editor-one-menu',
			REFRACTION_ASSETS_URL . 'js/editor-one-menu' . $min_suffix . '.js',
			[],
			REFRACTION_VERSION,
			true
		);

		wp_localize_script(
			'editor-one-menu',
			'editorOneMenuConfig',
			$config
		);
	}
}

