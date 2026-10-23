<?php
namespace Refraction\Modules\CustomIcons;

use Refraction\Core\Base\Module as BaseModule;
use Refraction\Modules\CustomIcons\AdminMenuItems\Editor_One_Custom_Icons_Menu;
use Refraction\Modules\CustomIcons\Classes\Admin_Page;
use Refraction\Modules\CustomIcons\Classes\Pure_Icon_Set;
use Refraction\Modules\CustomIcons\Classes\Pure_Svg_Sanitizer;
use Refraction\Modules\CustomIcons\Classes\Sets_Repository;
use Refraction\Modules\EditorOne\Classes\Menu_Data_Provider;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Custom Icons: uploaded SVG sets and icon fonts, registered with the icons manager so every icon picker shows
 * them as extra tabs. SVG sets render inline on the front end; font sets render as classes with their own CSS.
 */
class Module extends BaseModule {

	const SVG_PREFIX = 'rfci-';
	const FONT_PREFIX = 'rfcf-';

	private $repository;
	private $admin_page;
	private $style_printed = false;

	public function get_name() {
		return 'custom-icons';
	}

	public static function capability(): string {
		return (string) apply_filters( 'refraction/custom-icons/capability', 'manage_options' );
	}

	public function get_repository(): Sets_Repository {
		if ( ! $this->repository ) {
			$this->repository = new Sets_Repository();
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

		add_filter( 'refraction/icons_manager/additional_tabs', [ $this, 'add_tabs' ] );
		add_action( 'refraction/preview/enqueue_styles', [ $this, 'enqueue_all_styles' ] );
		add_action( 'refraction/editor-one/menu/register', [ $this, 'register_menu' ] );

		$this->get_admin_page();
	}

	public static function style_url( string $slug, array $set ): string {
		return add_query_arg( 'ver', (int) $set['time'], Sets_Repository::base_url() . '/' . $slug . '/style.css' );
	}

	public function add_tabs( $tabs ) {
		foreach ( $this->get_repository()->all() as $slug => $set ) {
			$is_svg = 'svg' === $set['type'];
			$key = ( $is_svg ? self::SVG_PREFIX : self::FONT_PREFIX ) . $slug;

			$tabs[ $key ] = [
				'name' => $key,
				'label' => $set['name'],
				'url' => self::style_url( $slug, $set ),
				'prefix' => ( $is_svg ? 'rf-ci-' : 'rf-cf-' ) . $slug . '-',
				'displayPrefix' => $is_svg ? 'rf-ci' : 'rf-cf-' . $slug,
				'labelIcon' => 'rficon-apps',
				'ver' => (int) $set['time'],
				'fetchJson' => Sets_Repository::base_url() . '/' . $slug . '/icons.json',
				'native' => false,
				'render_callback' => [ $this, 'render_icon' ],
			];
		}

		return $tabs;
	}

	public function enqueue_all_styles() {
		foreach ( $this->get_repository()->all() as $slug => $set ) {
			wp_enqueue_style( 'refraction-custom-icons-' . $slug, self::style_url( $slug, $set ), [], null );
		}
	}

	/** Used by the icons manager for icons of our libraries. */
	public function render_icon( $icon, $attributes = [], $tag = 'i' ) {
		$library = (string) ( $icon['library'] ?? '' );
		$is_svg = 0 === strpos( $library, self::SVG_PREFIX );
		$slug = Pure_Icon_Set::set_slug( substr( $library, strlen( $is_svg ? self::SVG_PREFIX : self::FONT_PREFIX ) ) );
		$sets = $this->get_repository()->all();

		if ( ! isset( $sets[ $slug ] ) ) {
			return '';
		}

		$prefix = ( $is_svg ? 'rf-ci-' : 'rf-cf-' ) . $slug . '-';
		$value = (string) ( $icon['value'] ?? '' );
		$pos = strrpos( $value, $prefix );
		$name = false === $pos ? '' : substr( $value, $pos + strlen( $prefix ) );

		if ( ! isset( $sets[ $slug ]['icons'][ $name ] ) ) {
			return '';
		}

		if ( ! $is_svg ) {
			wp_enqueue_style( 'refraction-custom-icons-' . $slug, self::style_url( $slug, $sets[ $slug ] ), [], null );
		}

		return $this->render_icon_html( $slug, $sets[ $slug ], $name, (array) $attributes, (string) $tag );
	}

	public function render_icon_html( string $slug, array $set, string $name, array $attributes = [], string $tag = 'i' ): string {
		if ( ! isset( $set['icons'][ $name ] ) ) {
			return '';
		}

		$classes = isset( $attributes['class'] ) ? (array) $attributes['class'] : [];
		$tag = in_array( $tag, [ 'i', 'span', 'div' ], true ) ? $tag : 'i';

		if ( 'font' === $set['type'] ) {
			$classes[] = 'rf-cf-' . $slug;
			$classes[] = 'rf-cf-' . $slug . '-' . $name;
			$attributes['class'] = $classes;
			$attributes['aria-hidden'] = 'true';

			return '<' . $tag . ' ' . Utils::render_html_attributes( $attributes ) . '></' . $tag . '>';
		}

		$file = Sets_Repository::base_dir() . '/' . $slug . '/' . $set['icons'][ $name ];
		$svg = is_readable( $file ) ? Pure_Svg_Sanitizer::sanitize( (string) file_get_contents( $file ) ) : ''; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents

		if ( '' === $svg ) {
			return '';
		}

		$classes[] = 'rf-ci-inline';
		$attributes['class'] = $classes;
		$attributes['aria-hidden'] = 'true';

		$style = '';

		if ( ! $this->style_printed ) {
			$this->style_printed = true;
			$style = '<style>.rf-ci-inline{display:inline-flex;line-height:1}.rf-ci-inline svg{width:1em;height:1em;fill:currentColor}</style>';
		}

		return $style . '<' . $tag . ' ' . Utils::render_html_attributes( $attributes ) . '>' . $svg . '</' . $tag . '>';
	}

	public function register_menu( Menu_Data_Provider $menu_data_provider ): void {
		$menu_data_provider->register_menu( new Editor_One_Custom_Icons_Menu() );
	}
}
