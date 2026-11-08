<?php
namespace Refraction\Modules\SolarIcons;

use Refraction\Controls_Manager;
use Refraction\Core\Base\Module as BaseModule;
use Refraction\Settings;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Solar icons (480 Design, CC BY 4.0; built into assets/lib/solar by scripts/build-solar-icons.mjs): the icon library's
 * first tabs, one per style. Icons are inline SVG: on the site from the style's PHP file, in the editor from its JSON.
 * The duotone styles' second layer takes a color and an opacity of its own (the "Duotone" controls of the icon
 * widgets). Font Awesome stays for the icons already chosen, but is left out of the icon library unless
 * Settings > Advanced > Font Awesome in the icon library is on.
 */
class Module extends BaseModule {

	const STYLES = [ 'bold-duotone', 'line-duotone', 'bold', 'linear', 'outline', 'broken' ];
	const PREFIX = 'rf-solar-';
	const DISPLAY_PREFIX = 'rf-solar';
	const SHOW_FA_OPTION = 'refraction_icons_font_awesome';

	/** Icon widgets and their icon style section, given the Duotone controls. */
	const DUOTONE_SECTIONS = [
		'icon' => 'section_style_icon',
		'icon-box' => 'section_style_icon',
		'icon-list' => 'section_icon_style',
		'button' => 'section_style',
		'social-icons' => 'section_social_style',
	];

	private array $bodies = [];

	public function get_name() {
		return 'solar-icons';
	}

	public function __construct() {
		parent::__construct();

		// As additional tabs: those are kept on the site when Font Awesome is drawn as inline SVG (the native ones are not).
		add_filter( 'refraction/icons_manager/additional_tabs', [ $this, 'add_tabs' ] );
		add_filter( 'refraction/icons_manager/native', [ $this, 'hide_font_awesome' ] );
		add_action( 'refraction/frontend/after_register_styles', [ $this, 'register_style' ] );
		add_action( 'refraction/frontend/after_enqueue_styles', [ $this, 'enqueue_style' ] );
		add_action( 'refraction/preview/enqueue_styles', [ $this, 'enqueue_style' ] );
		add_action( 'refraction/editor/after_enqueue_styles', [ $this, 'enqueue_style' ] );
		add_action( 'refraction/admin/after_create_settings/' . Settings::PAGE_ID, [ $this, 'register_setting' ], 110 );

		foreach ( self::DUOTONE_SECTIONS as $widget => $section ) {
			add_action( "refraction/element/{$widget}/{$section}/before_section_end", [ $this, 'add_duotone_controls' ] );
		}
	}

	public static function label( string $style ): string {
		$labels = [
			'bold-duotone' => __( 'Solar - Bold Duotone', 'refraction' ),
			'line-duotone' => __( 'Solar - Line Duotone', 'refraction' ),
			'bold' => __( 'Solar - Bold', 'refraction' ),
			'linear' => __( 'Solar - Linear', 'refraction' ),
			'outline' => __( 'Solar - Outline', 'refraction' ),
			'broken' => __( 'Solar - Broken', 'refraction' ),
		];

		return $labels[ $style ] ?? $style;
	}

	/** Font Awesome is kept (icons already chosen still work) but out of the icon library unless asked for. */
	public function hide_font_awesome( $tabs ) {
		if ( get_option( self::SHOW_FA_OPTION ) ) {
			return $tabs;
		}

		foreach ( array_keys( $tabs ) as $key ) {
			if ( 0 === strpos( (string) $key, 'fa-' ) ) {
				$tabs[ $key ]['hidden'] = true;
			}
		}

		return $tabs;
	}

	public function add_tabs( $tabs ) {
		$solar = [];
		$url = REFRACTION_ASSETS_URL . 'lib/solar/';

		foreach ( self::STYLES as $style ) {
			$solar[ 'solar-' . $style ] = [
				'name' => 'solar-' . $style,
				'label' => self::label( $style ),
				'prefix' => self::PREFIX,
				'displayPrefix' => self::DISPLAY_PREFIX,
				'labelIcon' => 'rficon-star-o',
				'ver' => REFRACTION_VERSION,
				'fetchJson' => $url . $style . '.json?ver=' . REFRACTION_VERSION,
				'svgJson' => $url . $style . '-svg.json?ver=' . REFRACTION_VERSION,
				'native' => true,
				'render_callback' => [ $this, 'render_icon' ],
			];
		}

		return $solar + (array) $tabs;
	}

	public function register_style() {
		wp_register_style( 'refraction-solar-icons', REFRACTION_ASSETS_URL . 'lib/solar/solar.css', [], REFRACTION_VERSION );
	}

	public function enqueue_style() {
		if ( ! wp_style_is( 'refraction-solar-icons', 'registered' ) ) {
			$this->register_style();
		}

		wp_enqueue_style( 'refraction-solar-icons' );
	}

	/** The icons manager's renderer for the Solar libraries: inline SVG. */
	public function render_icon( $icon, $attributes = [], $tag = 'i' ) {
		$style = substr( (string) ( $icon['library'] ?? '' ), strlen( 'solar-' ) );
		$name = self::icon_name( (string) ( $icon['value'] ?? '' ) );
		$body = '' !== $name ? $this->body( $style, $name ) : '';

		if ( '' === $body ) {
			return '';
		}

		$this->enqueue_style();

		$classes = isset( $attributes['class'] ) ? (array) $attributes['class'] : [];
		$classes[] = 'rf-solar';
		$attributes['class'] = $classes;
		$attributes['aria-hidden'] = 'true';
		$tag = in_array( $tag, [ 'i', 'span', 'div' ], true ) ? $tag : 'i';

		return '<' . $tag . ' ' . Utils::render_html_attributes( $attributes ) . '><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em">' . $body . '</svg></' . $tag . '>';
	}

	/** "rf-solar rf-solar-home-smile" is "home-smile". */
	public static function icon_name( string $value ): string {
		$parts = preg_split( '/\s+/', trim( $value ) );
		$last = (string) end( $parts );

		return 0 === strpos( $last, self::PREFIX ) ? preg_replace( '/[^a-z0-9-]/', '', substr( $last, strlen( self::PREFIX ) ) ) : '';
	}

	private function body( string $style, string $name ): string {
		if ( ! in_array( $style, self::STYLES, true ) ) {
			return '';
		}

		if ( ! isset( $this->bodies[ $style ] ) ) {
			$file = REFRACTION_ASSETS_PATH . 'lib/solar/' . $style . '.php';
			$this->bodies[ $style ] = is_readable( $file ) ? (array) include $file : [];
		}

		return (string) ( $this->bodies[ $style ][ $name ] ?? '' );
	}

	/** Duotone: the second layer's color and opacity (Solar's duotone styles). */
	public function add_duotone_controls( $element ) {
		$element->add_control( 'rf_icon_duo_heading', [
			'label' => esc_html__( 'Duotone', 'refraction' ),
			'type' => Controls_Manager::HEADING,
			'separator' => 'before',
		] );

		$element->add_control( 'rf_icon_duo_color', [
			'label' => esc_html__( 'Second Color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}}' => '--rf-icon-duo: {{VALUE}};' ],
			'description' => esc_html__( 'For duotone icons (Solar Bold Duotone and Line Duotone, Phosphor Duotone): the color of their second layer. Empty: the icon\'s color.', 'refraction' ),
		] );

		$element->add_control( 'rf_icon_duo_opacity', [
			'label' => esc_html__( 'Second Layer Opacity', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 1, 'step' => 0.05 ] ],
			'selectors' => [ '{{WRAPPER}}' => '--rf-icon-duo-opacity: {{SIZE}};' ],
		] );
	}

	public function register_setting( Settings $settings ) {
		$settings->add_field( Settings::TAB_ADVANCED, Settings::TAB_ADVANCED, 'icons_font_awesome', [
			'label' => esc_html__( 'Font Awesome in the icon library', 'refraction' ),
			'field_args' => [
				'type' => 'select',
				'std' => '',
				'options' => [
					'' => esc_html__( 'Hidden (Solar and Phosphor icons only)', 'refraction' ),
					'yes' => esc_html__( 'Shown', 'refraction' ),
				],
				'desc' => esc_html__( 'The icon library offers the Solar and Phosphor icons. Font Awesome icons already chosen on your pages keep working either way.', 'refraction' ),
			],
		] );
	}
}
