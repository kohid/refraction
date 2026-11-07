<?php
namespace Refraction\Modules\Interactions;

use Refraction\Controls_Manager;
use Refraction\Core\Base\Module as BaseModule;
use Refraction\Modules\Interactions\Classes\Kit_Tab;
use Refraction\Modules\Interactions\Classes\Pure_Interaction_Settings;
use Refraction\Plugin;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Interactions: motion that answers the visitor. The Marquee widget; Site Settings > Motion & Cursor (a site cursor
 * that grows over links and shows a word over chosen elements, and transitions between pages); Advanced >
 * Interactions on every element (magnetic pull towards the pointer, the cursor's word, no site cursor here).
 * Everything is local and switched off for reduced motion. See docs/refraction/interactions.md.
 */
class Module extends BaseModule {

	public function get_name() {
		return 'interactions';
	}

	protected function get_widgets() {
		return [ 'Marquee' ];
	}

	public function __construct() {
		parent::__construct();

		foreach ( [ 'common', 'container', 'section', 'column' ] as $stack ) {
			add_action( "refraction/element/{$stack}/section_effects/after_section_end", [ $this, 'register_element_controls' ] );
		}

		add_action( 'refraction/kit/register_tabs', [ $this, 'register_kit_tab' ] );
		add_action( 'refraction/frontend/after_register_scripts', [ $this, 'register_assets' ] );
		add_action( 'refraction/frontend/after_register_styles', [ $this, 'register_assets' ] );
		add_action( 'refraction/preview/enqueue_scripts', [ $this, 'enqueue_for_preview' ] );
		add_action( 'refraction/frontend/before_render', [ $this, 'maybe_enqueue' ] );
		add_action( 'refraction/element/after_add_attributes', [ $this, 'add_attributes' ] );
		add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_site_wide' ], 30 );
		add_action( 'wp_head', [ $this, 'print_transition' ], 2 );
	}

	public function register_kit_tab( $kit ) {
		$kit->register_tab( 'settings-interactions', Kit_Tab::class );
	}

	public function register_assets() {
		if ( wp_script_is( 'refraction-interactions', 'registered' ) ) {
			return;
		}

		$min = Utils::is_script_debug() ? '' : '.min';
		wp_register_script( 'refraction-interactions', REFRACTION_ASSETS_URL . 'js/interactions-frontend' . $min . '.js', [], REFRACTION_VERSION, true );
		wp_register_script( 'refraction-marquee', REFRACTION_ASSETS_URL . 'js/marquee-frontend' . $min . '.js', [], REFRACTION_VERSION, true );
		wp_register_style( 'refraction-interactions', REFRACTION_ASSETS_URL . 'css/modules/interactions/frontend' . $min . '.css', [], REFRACTION_VERSION );
	}

	/** The editor preview: the Marquee runs; the cursor and the magnetic pull stay on the site (they would fight the editor). */
	public function enqueue_for_preview() {
		$this->register_assets();
		wp_enqueue_script( 'refraction-marquee' );
		wp_enqueue_style( 'refraction-interactions' );
	}

	private static function kit_settings(): array {
		$kit = Plugin::$instance->kits_manager->get_active_kit_for_frontend();

		return $kit ? (array) $kit->get_settings() : [];
	}

	private static function on_site(): bool {
		return ! is_admin() && ! is_customize_preview() && ! ( Plugin::$instance->preview && Plugin::$instance->preview->is_preview_mode() );
	}

	/** The site cursor on every page of the site (also pages not built with Refraction), with its settings. */
	public function enqueue_site_wide() {
		if ( ! self::on_site() ) {
			return;
		}

		$cursor = Pure_Interaction_Settings::cursor( self::kit_settings() );

		if ( ! $cursor ) {
			return;
		}

		$this->register_assets();
		wp_enqueue_script( 'refraction-interactions' );
		wp_enqueue_style( 'refraction-interactions' );
		wp_add_inline_script( 'refraction-interactions', 'window.refractionCursor=' . wp_json_encode( $cursor ) . ';', 'before' );
	}

	public function print_transition() {
		if ( ! self::on_site() ) {
			return;
		}

		$css = Pure_Interaction_Settings::transition_css( Pure_Interaction_Settings::transition( self::kit_settings() ) );

		if ( '' !== $css ) {
			echo '<style id="rf-page-transition">' . $css . '</style>' . "\n"; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from fixed parts and clamped numbers.
		}
	}

	public function maybe_enqueue( $element ) {
		if ( Pure_Interaction_Settings::magnetic( $element->get_settings() ) && self::on_site() ) {
			$this->register_assets();
			wp_enqueue_script( 'refraction-interactions' );
			wp_enqueue_style( 'refraction-interactions' );
		}
	}

	public function add_attributes( $element ) {
		$settings = $element->get_settings();
		$magnetic = Pure_Interaction_Settings::magnetic( $settings );
		$label = Pure_Interaction_Settings::label( $settings );

		if ( $magnetic ) {
			$element->add_render_attribute( '_wrapper', 'data-rf-magnetic', wp_json_encode( $magnetic ) );
		}

		if ( '' !== $label ) {
			$element->add_render_attribute( '_wrapper', 'data-rf-cursor-label', $label );
		}

		if ( 'yes' === ( $settings['rf_cursor_hide'] ?? '' ) ) {
			$element->add_render_attribute( '_wrapper', 'data-rf-cursor-hide', '' );
		}
	}

	/** Advanced > Interactions, after the Motion Effects sections. */
	public function register_element_controls( $element ) {
		$element->start_controls_section( 'section_rf_interactions', [
			'label' => esc_html__( 'Interactions', 'refraction' ),
			'tab' => Controls_Manager::TAB_ADVANCED,
		] );

		$element->add_control( 'rf_magnetic', [
			'label' => esc_html__( 'Magnetic', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'description' => esc_html__( 'Drawn towards the pointer when it comes near, and springs back when it leaves. Made for buttons, icons and small cards. On the site only, for a mouse or trackpad.', 'refraction' ),
		] );

		$element->add_control( 'rf_magnetic_strength', [
			'label' => esc_html__( 'Pull', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0.05, 'max' => 1, 'step' => 0.05 ] ],
			'default' => [ 'size' => 0.35 ],
			'condition' => [ 'rf_magnetic' => 'yes' ],
		] );

		$element->add_control( 'rf_magnetic_area', [
			'label' => esc_html__( 'Reach Beyond Its Edges', 'refraction' ) . ' (px)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 200 ] ],
			'default' => [ 'size' => 40 ],
			'condition' => [ 'rf_magnetic' => 'yes' ],
		] );

		$element->add_control( 'rf_cursor_label', [
			'label' => esc_html__( 'Cursor Word', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'placeholder' => esc_html__( 'View', 'refraction' ),
			'description' => esc_html__( 'With the site cursor on (Site Settings > Motion & Cursor), the cursor becomes a disc with this word while it is over this element: "View", "Play", "Drag", "Read".', 'refraction' ),
			'separator' => 'before',
		] );

		$element->add_control( 'rf_cursor_hide', [
			'label' => esc_html__( 'No Site Cursor Here', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'description' => esc_html__( 'The usual cursor over this element (a map, a video, a form).', 'refraction' ),
		] );

		$element->end_controls_section();
	}
}
