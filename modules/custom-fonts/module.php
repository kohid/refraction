<?php
namespace Refraction\Modules\CustomFonts;

use Refraction\Core\Base\Module as BaseModule;
use Refraction\Modules\CustomFonts\AdminMenuItems\Editor_One_Custom_Fonts_Menu;
use Refraction\Modules\CustomFonts\Classes\Admin_Page;
use Refraction\Modules\CustomFonts\Classes\Custom_Fonts_File;
use Refraction\Modules\CustomFonts\Classes\Fonts_Repository;
use Refraction\Modules\CustomFonts\Classes\Pure_Font_Face_Css;
use Refraction\Modules\EditorOne\Classes\Menu_Data_Provider;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Custom Fonts: uploaded font families with their @font-face CSS, offered in every typography font list.
 */
class Module extends BaseModule {

	const GROUP = 'refraction-custom';

	private $repository;
	private $admin_page;

	public function get_name() {
		return 'custom-fonts';
	}

	public static function capability(): string {
		return (string) apply_filters( 'refraction/custom-fonts/capability', 'manage_options' );
	}

	public function get_repository(): Fonts_Repository {
		if ( ! $this->repository ) {
			$this->repository = new Fonts_Repository();
		}

		return $this->repository;
	}

	public function get_admin_page(): Admin_Page {
		if ( ! $this->admin_page ) {
			$this->admin_page = new Admin_Page( $this->get_repository() );
		}

		return $this->admin_page;
	}

	public function __construct() {
		parent::__construct();

		add_filter( 'refraction/fonts/groups', [ $this, 'add_group' ] );
		add_filter( 'refraction/fonts/additional_fonts', [ $this, 'add_fonts' ] );
		add_action( 'refraction/fonts/print_font_links/' . self::GROUP, [ $this, 'enqueue_css' ] );
		add_action( 'refraction/preview/enqueue_styles', [ $this, 'enqueue_css' ] );
		add_action( 'refraction/editor/after_enqueue_styles', [ $this, 'enqueue_css' ] );
		add_action( 'wp_head', [ $this, 'print_preloads' ], 2 );
		add_action( 'refraction/editor-one/menu/register', [ $this, 'register_menu' ] );
		add_action( 'refraction/custom_fonts/changed', [ $this, 'reset_caches' ] );

		$this->get_admin_page();
	}

	public function add_group( $groups ) {
		if ( ! $this->get_repository()->names() ) {
			return $groups;
		}

		return [ self::GROUP => esc_html__( 'Custom Fonts', 'refraction' ) ] + (array) $groups;
	}

	public function add_fonts( $fonts ) {
		foreach ( $this->get_repository()->names() as $name ) {
			$fonts[ $name ] = self::GROUP;
		}

		return $fonts;
	}

	public function enqueue_css() {
		$url = Custom_Fonts_File::url();

		if ( $url ) {
			wp_enqueue_style( 'refraction-custom-fonts', $url, [], null );
		}
	}

	/** Preload hints for the families that ask for it. */
	public function print_preloads() {
		foreach ( Pure_Font_Face_Css::preload_urls( $this->get_repository()->all(), Fonts_Repository::base_url() ) as $url ) {
			printf( '<link rel="preload" href="%s" as="font" type="font/woff2" crossorigin>' . "\n", esc_url( $url ) ); // phpcs:ignore WordPress.WP.EnqueuedResources.NonEnqueuedStylesheet
		}
	}

	public function reset_caches() {
		\Refraction\Fonts::reset_local_cache();
	}

	public function register_menu( Menu_Data_Provider $menu_data_provider ): void {
		$menu_data_provider->register_menu( new Editor_One_Custom_Fonts_Menu() );
	}
}
