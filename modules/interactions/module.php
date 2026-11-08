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
		add_action( 'refraction/documents/register_controls', [ $this, 'register_page_controls' ] );
		add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_pages' ], 30 );
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
		wp_register_script( 'refraction-pages', REFRACTION_ASSETS_URL . 'js/pages-frontend' . $min . '.js', [], REFRACTION_VERSION, true );
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

		$depth = Pure_Interaction_Settings::page_depth( $settings );

		if ( null !== $depth ) {
			$element->add_render_attribute( '_wrapper', 'data-rf-hp-depth', (string) $depth );
		}
	}

	/** The current page's "pages side by side" config, or [] (not a Refraction page, the editor, or off). */
	public static function pages_config(): array {
		if ( ! is_singular() || ! self::on_site() ) {
			return [];
		}

		$document = Plugin::$instance->documents->get( get_queried_object_id() );

		if ( ! $document || ! $document->is_built_with_refraction() ) {
			return [];
		}

		$config = Pure_Interaction_Settings::pages( (array) $document->get_settings() );

		if ( $config ) {
			$config['id'] = (int) $document->get_main_id();
			$config['labels'] = [
				'prev' => __( 'Previous page', 'refraction' ),
				'next' => __( 'Next page', 'refraction' ),
				'first' => __( 'Back to the first page', 'refraction' ),
				'of' => __( 'Page %1$s of %2$s', 'refraction' ),
				'turn' => __( 'Turn your phone sideways to see this page.', 'refraction' ),
			];
		}

		return $config;
	}

	public function enqueue_pages() {
		$config = self::pages_config();

		if ( ! $config ) {
			return;
		}

		$this->register_assets();
		wp_enqueue_style( 'refraction-interactions' );
		wp_enqueue_script( 'refraction-pages' );
		wp_add_inline_script( 'refraction-pages', 'window.refractionPages=' . wp_json_encode( $config ) . ';', 'before' );
	}

	/** Page Settings > Pages Side By Side, on pages, posts and landing pages. */
	public function register_page_controls( $document ) {
		if ( ! in_array( $document->get_name(), [ 'wp-page', 'wp-post', 'landing-page' ], true ) ) {
			return;
		}

		$on = [ 'rf_hp!' => '' ];

		$document->start_controls_section( 'section_rf_hp', [
			'label' => esc_html__( 'Pages Side By Side', 'refraction' ),
			'tab' => Controls_Manager::TAB_SETTINGS,
		] );

		$document->add_control( 'rf_hp', [
			'label' => esc_html__( 'Show The Page As', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '',
			'options' => [
				'' => esc_html__( 'One long page (scrolls down)', 'refraction' ),
				'slide' => esc_html__( 'Pages that slide to the left', 'refraction' ),
				'book' => esc_html__( 'Pages turned like a book', 'refraction' ),
			],
			'description' => esc_html__( 'Each top-level container becomes a page that fills the screen; the page no longer scrolls down. The wheel, the arrow keys, a swipe, the arrows and links to a part of the page turn the pages. On the site only: the editor keeps the containers one under another. Replaces Scrolling > One section per scroll on this page.', 'refraction' ),
		] );

		$document->add_control( 'rf_hp_speed', [
			'label' => esc_html__( 'Time To Turn A Page', 'refraction' ) . ' (ms)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 200, 'max' => 2500, 'step' => 50 ] ],
			'condition' => $on,
		] );

		$document->add_control( 'rf_hp_depth', [
			'label' => esc_html__( 'Parallax Depth', 'refraction' ) . ' (%)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 100 ] ],
			'default' => [ 'size' => 30 ],
			'description' => esc_html__( 'While a page slides, the things on it move at different speeds, as layers. 0: the page moves as one. Set an element\'s own depth in Advanced > Interactions.', 'refraction' ),
			'condition' => [ 'rf_hp' => 'slide' ],
		] );

		$document->add_control( 'rf_hp_header', [
			'label' => esc_html__( 'Keep The Site\'s Header Above The Pages', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'description' => esc_html__( 'Off: the pages fill the whole screen (put your menu on the pages, as in a magazine). On: they start below the header (hide the page title in Page Settings, or use the Canvas template without one).', 'refraction' ),
			'condition' => $on,
		] );

		$document->add_control( 'rf_hp_arrows', [
			'label' => esc_html__( 'Arrows', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'return_value' => 'yes',
			'separator' => 'before',
			'condition' => $on,
		] );

		$document->add_control( 'rf_hp_counter', [
			'label' => esc_html__( 'Page Number', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'number',
			'options' => [
				'number' => esc_html__( 'Large number (01)', 'refraction' ),
				'of' => esc_html__( 'Number of pages (1 / 6)', 'refraction' ),
				'' => esc_html__( 'None', 'refraction' ),
			],
			'condition' => $on,
		] );

		$document->add_control( 'rf_hp_counter_prefix', [
			'label' => esc_html__( 'Before The Number', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'placeholder' => '*',
			'condition' => $on + [ 'rf_hp_counter' => 'number' ],
		] );

		$document->add_control( 'rf_hp_progress', [
			'label' => esc_html__( 'Progress Line', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'return_value' => 'yes',
			'condition' => $on,
		] );

		$document->add_control( 'rf_hp_loop', [
			'label' => esc_html__( 'After The Last Page, Back To The First', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'condition' => $on,
		] );

		$document->add_control( 'rf_hp_phone', [
			'label' => esc_html__( 'Phones Held Upright', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'rotate',
			'options' => [
				'rotate' => esc_html__( 'Show the pages in landscape (turn the phone to read)', 'refraction' ),
				'ask' => esc_html__( 'Ask to turn the phone sideways', 'refraction' ),
				'stack' => esc_html__( 'One long page, as usual', 'refraction' ),
			],
			'description' => esc_html__( 'Held sideways, a phone shows the pages like a computer.', 'refraction' ),
			'separator' => 'before',
			'condition' => $on,
		] );

		$document->add_control( 'rf_hp_page_bg', [
			'label' => esc_html__( 'Page Background', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'default' => '',
			'description' => esc_html__( 'Behind containers without a background of their own. A book\'s pages need one so the page underneath does not show through.', 'refraction' ),
			'selectors' => [ '{{WRAPPER}}' => '--rf-hp-page-bg: {{VALUE}};' ],
			'separator' => 'before',
			'condition' => $on,
		] );

		$document->add_control( 'rf_hp_nav_color', [
			'label' => esc_html__( 'Arrows And Number Color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}}' => '--rf-hp-nav: {{VALUE}};' ],
			'condition' => $on,
		] );

		$document->add_control( 'rf_hp_accent', [
			'label' => esc_html__( 'Progress Line Color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}}' => '--rf-hp-accent: {{VALUE}};' ],
			'condition' => $on + [ 'rf_hp_progress' => 'yes' ],
		] );

		$document->end_controls_section();
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

		$element->add_control( 'rf_hp_depth_own', [
			'label' => esc_html__( 'Depth When Pages Slide', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => -2, 'max' => 2, 'step' => 0.25 ] ],
			'description' => esc_html__( 'With Page Settings > Pages Side By Side > slide: how much faster (more than 0) or slower (less than 0) this element moves than its page while the page slides. Empty: automatic layers.', 'refraction' ),
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
