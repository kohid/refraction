<?php
namespace Refraction\Modules\PhosphorIcons;

use Refraction\Core\Base\Module as BaseModule;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Phosphor icons (Phosphor Icons, MIT; built into assets/lib/phosphor by scripts/build-phosphor-icons.mjs from
 * @phosphor-icons/core): six more tabs of the icon library, one per weight, after the Solar ones. Like Solar, the
 * icons are inline SVG: on the site from the weight's PHP file, in the editor from its JSON. The Duotone weight's
 * faint layer takes the widgets' Duotone controls (solar-icons module).
 */
class Module extends BaseModule {

	const WEIGHTS = [ 'regular', 'bold', 'fill', 'duotone', 'light', 'thin' ];
	const PREFIX = 'rf-ph-';
	const DISPLAY_PREFIX = 'rf-ph';

	private array $bodies = [];

	public function get_name() {
		return 'phosphor-icons';
	}

	public function __construct() {
		parent::__construct();

		add_filter( 'refraction/icons_manager/additional_tabs', [ $this, 'add_tabs' ], 20 );
		add_action( 'refraction/frontend/after_register_styles', [ $this, 'register_style' ] );
		add_action( 'refraction/preview/enqueue_styles', [ $this, 'enqueue_style' ] );
		add_action( 'refraction/editor/after_enqueue_styles', [ $this, 'enqueue_style' ] );
	}

	public static function label( string $weight ): string {
		$labels = [
			'regular' => __( 'Phosphor - Regular', 'refraction' ),
			'bold' => __( 'Phosphor - Bold', 'refraction' ),
			'fill' => __( 'Phosphor - Fill', 'refraction' ),
			'duotone' => __( 'Phosphor - Duotone', 'refraction' ),
			'light' => __( 'Phosphor - Light', 'refraction' ),
			'thin' => __( 'Phosphor - Thin', 'refraction' ),
		];

		return $labels[ $weight ] ?? $weight;
	}

	/** After the tabs already there (Solar first), before nothing else: added at the end. */
	public function add_tabs( $tabs ) {
		$url = REFRACTION_ASSETS_URL . 'lib/phosphor/';
		$tabs = (array) $tabs;

		foreach ( self::WEIGHTS as $weight ) {
			$tabs[ 'phosphor-' . $weight ] = [
				'name' => 'phosphor-' . $weight,
				'label' => self::label( $weight ),
				'prefix' => self::PREFIX,
				'displayPrefix' => self::DISPLAY_PREFIX,
				'labelIcon' => 'rficon-star-o',
				'ver' => REFRACTION_VERSION,
				'fetchJson' => $url . $weight . '.json?ver=' . REFRACTION_VERSION,
				'svgJson' => $url . $weight . '-svg.json?ver=' . REFRACTION_VERSION,
				'viewBox' => '0 0 256 256',
				'native' => true,
				'render_callback' => [ $this, 'render_icon' ],
			];
		}

		return $tabs;
	}

	public function register_style() {
		wp_register_style( 'refraction-phosphor-icons', REFRACTION_ASSETS_URL . 'lib/phosphor/phosphor.css', [], REFRACTION_VERSION );
	}

	public function enqueue_style() {
		if ( ! wp_style_is( 'refraction-phosphor-icons', 'registered' ) ) {
			$this->register_style();
		}

		wp_enqueue_style( 'refraction-phosphor-icons' );
	}

	/** The icons manager's renderer for the Phosphor libraries: inline SVG (its style is enqueued on first use). */
	public function render_icon( $icon, $attributes = [], $tag = 'i' ) {
		$weight = substr( (string) ( $icon['library'] ?? '' ), strlen( 'phosphor-' ) );
		$name = self::icon_name( (string) ( $icon['value'] ?? '' ) );
		$body = '' !== $name ? $this->body( $weight, $name ) : '';

		if ( '' === $body ) {
			return '';
		}

		$this->enqueue_style();

		$classes = isset( $attributes['class'] ) ? (array) $attributes['class'] : [];
		$classes[] = self::DISPLAY_PREFIX;
		$attributes['class'] = $classes;
		$attributes['aria-hidden'] = 'true';
		$tag = in_array( $tag, [ 'i', 'span', 'div' ], true ) ? $tag : 'i';

		return '<' . $tag . ' ' . Utils::render_html_attributes( $attributes ) . '><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="1em" height="1em">' . $body . '</svg></' . $tag . '>';
	}

	/** "rf-ph rf-ph-car" is "car". */
	public static function icon_name( string $value ): string {
		$parts = preg_split( '/\s+/', trim( $value ) );
		$last = (string) end( $parts );

		return 0 === strpos( $last, self::PREFIX ) ? preg_replace( '/[^a-z0-9-]/', '', substr( $last, strlen( self::PREFIX ) ) ) : '';
	}

	private function body( string $weight, string $name ): string {
		if ( ! in_array( $weight, self::WEIGHTS, true ) ) {
			return '';
		}

		if ( ! isset( $this->bodies[ $weight ] ) ) {
			$file = REFRACTION_ASSETS_PATH . 'lib/phosphor/' . $weight . '.php';
			$this->bodies[ $weight ] = is_readable( $file ) ? (array) include $file : [];
		}

		return (string) ( $this->bodies[ $weight ][ $name ] ?? '' );
	}
}
