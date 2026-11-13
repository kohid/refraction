<?php
namespace Refraction\Modules\MotionEffects;

use Refraction\Controls_Manager;
use Refraction\Core\Base\Module as BaseModule;
use Refraction\Element_Base;
use Refraction\Modules\MotionEffects\Classes\Pure_Motion_Settings;
use Refraction\Modules\MotionEffects\Classes\Pure_Page_Scroll_Settings;
use Refraction\Modules\MotionEffects\Classes\Pure_Reveal_Settings;
use Refraction\Modules\MotionEffects\Classes\Pure_Sticky_Settings;
use Refraction\Plugin;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Motion Effects (scrolling and mouse effects, with parallax presets), Reveal (whole element, text pieces and children,
 * once, every time or with the scroll) and Sticky, always on.
 *
 * Controls live in the Advanced tab of containers, sections, columns and widgets. The front end scripts are
 * registered here and enqueued only when an element on the page uses them (always in the editor preview).
 */
class Module extends BaseModule {

	public function get_name() {
		return 'motion-effects';
	}

	public function __construct() {
		parent::__construct();

		foreach ( [ 'common', 'container', 'section', 'column' ] as $stack ) {
			add_action( "refraction/element/{$stack}/section_effects/after_section_end", [ $this, 'register_controls' ] );
		}

		add_action( 'refraction/frontend/after_register_scripts', [ $this, 'register_assets' ] );
		add_action( 'refraction/frontend/after_register_styles', [ $this, 'register_assets' ] );
		add_action( 'refraction/preview/enqueue_scripts', [ $this, 'enqueue_for_preview' ] );
		add_action( 'refraction/frontend/before_render', [ $this, 'maybe_enqueue' ] );
		add_action( 'refraction/element/after_add_attributes', [ $this, 'add_attributes' ] );
		add_action( 'refraction/documents/register_controls', [ $this, 'register_page_scroll_controls' ] );
		add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_page_scroll' ], 30 );
	}

	// ------------------------------------------------------------ page scrolling

	/** Page Settings > Scrolling, on pages, posts and landing pages. */
	public function register_page_scroll_controls( $document ) {
		if ( ! in_array( $document->get_name(), [ 'wp-page', 'wp-post', 'landing-page' ], true ) ) {
			return;
		}

		$document->start_controls_section( 'section_rf_page_scroll', [
			'label' => esc_html__( 'Scrolling', 'refraction' ),
			'tab' => Controls_Manager::TAB_SETTINGS,
		] );

		$document->add_control( 'rf_page_scroll', [
			'label' => esc_html__( 'Scrolling', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '',
			'options' => [
				'' => esc_html__( 'Normal', 'refraction' ),
				'sections' => esc_html__( 'One section per scroll', 'refraction' ),
				'smooth' => esc_html__( 'Smooth (eased)', 'refraction' ),
				'snap' => esc_html__( 'Snap to sections', 'refraction' ),
			],
			'description' => esc_html__( 'Sections are the top-level containers of the page. A section taller than the screen (a 3D Build Scene or Scroll Sequence) scrolls through first. Plays only on the site, not in the editor; off for visitors who ask for reduced motion.', 'refraction' ),
		] );

		$document->add_control( 'rf_page_scroll_speed', [
			'label' => esc_html__( 'Time to the next section (ms)', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'min' => 300,
			'max' => 2500,
			'placeholder' => '900',
			'condition' => [ 'rf_page_scroll' => 'sections' ],
		] );

		$document->add_control( 'rf_page_scroll_easing', [
			'label' => esc_html__( 'Movement', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'inout',
			'options' => [ 'inout' => esc_html__( 'Smooth start and end', 'refraction' ), 'out' => esc_html__( 'Slows down at the end', 'refraction' ), 'linear' => esc_html__( 'Even', 'refraction' ) ],
			'condition' => [ 'rf_page_scroll' => 'sections' ],
		] );

		$document->add_control( 'rf_page_scroll_dots', [
			'label' => esc_html__( 'Section dots', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'description' => esc_html__( 'Dots at the side of the screen, one per section, to jump to it.', 'refraction' ),
			'condition' => [ 'rf_page_scroll' => 'sections' ],
		] );

		$document->add_control( 'rf_page_scroll_smoothness', [
			'label' => esc_html__( 'Smoothness', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 1, 'max' => 10 ] ],
			'default' => [ 'size' => 5 ],
			'condition' => [ 'rf_page_scroll' => 'smooth' ],
		] );

		$document->add_control( 'rf_page_scroll_snap', [
			'label' => esc_html__( 'Snap', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'proximity',
			'options' => [ 'proximity' => esc_html__( 'When near a section', 'refraction' ), 'mandatory' => esc_html__( 'Always to a section', 'refraction' ) ],
			'condition' => [ 'rf_page_scroll' => 'snap' ],
		] );

		$document->add_control( 'rf_page_scroll_offset', [
			'label' => esc_html__( 'Space for a fixed header (px)', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'min' => 0,
			'max' => 400,
			'placeholder' => '0',
			'condition' => [ 'rf_page_scroll!' => '' ],
		] );

		$document->add_control( 'rf_page_scroll_touch', [
			'label' => esc_html__( 'Also on phones and tablets', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'description' => esc_html__( 'Touch screens use the browser\'s own snapping for "One section per scroll" and keep their native scrolling for "Smooth".', 'refraction' ),
			'condition' => [ 'rf_page_scroll!' => '' ],
		] );

		$document->end_controls_section();
	}

	/** The page's scrolling: the script and its config, on the site only (never in the editor or its preview). */
	public function enqueue_page_scroll() {
		if ( ! is_singular() || ( Plugin::$instance->preview && Plugin::$instance->preview->is_preview_mode() ) ) {
			return;
		}

		$document = Plugin::$instance->documents->get( get_queried_object_id() );

		if ( ! $document || ! $document->is_built_with_refraction() ) {
			return;
		}

		$settings = (array) $document->get_settings();
		// Pages side by side (modules/interactions) replaces the page's vertical scrolling.
		$config = in_array( $settings['rf_hp'] ?? '', [ 'slide', 'book' ], true ) ? [] : Pure_Page_Scroll_Settings::normalize( $settings );

		if ( ! $config ) {
			return;
		}

		$config['id'] = (int) $document->get_main_id();

		if ( ! wp_script_is( 'refraction-page-scroll', 'registered' ) ) {
			$this->register_assets();
		}

		wp_enqueue_style( 'refraction-motion-effects' );
		wp_enqueue_script( 'refraction-page-scroll' );
		wp_add_inline_script( 'refraction-page-scroll', 'window.refractionPageScroll = ' . wp_json_encode( $config ) . ';', 'before' );
	}

	/** Device keys that exist on this site, desktop first. */
	public static function device_options(): array {
		$options = [ 'desktop' => esc_html__( 'Desktop', 'refraction' ) ];

		foreach ( Plugin::$instance->breakpoints->get_active_breakpoints() as $key => $breakpoint ) {
			$options[ $key ] = $breakpoint->get_label();
		}

		return $options;
	}

	public function register_controls( Element_Base $element ) {
		$this->register_reveal_controls( $element );
		$this->register_scrolling_controls( $element );
		$this->register_mouse_controls( $element );
		$this->register_sticky_controls( $element );
	}


	/**
	 * Page-assets declaration: Refraction saves which scripts a document needs and re-enables them even when the
	 * rendered HTML comes from the element cache (where our render hooks do not run).
	 */
	private function asset_conditions( string $kind, bool $is_container = false ): array {
		if ( 'sticky' === $kind ) {
			return [ 'terms' => [ [ 'name' => 'rf_sticky', 'operator' => 'in', 'value' => [ 'top', 'bottom' ] ] ] ];
		}

		if ( 'reveal' === $kind ) {
			return [
				'relation' => 'or',
				'terms' => [
					[ 'name' => 'rf_reveal', 'operator' => 'in', 'value' => Pure_Reveal_Settings::EFFECTS ],
					// Only the control this kind of element has: text for widgets, children for containers.
					$is_container
						? [ 'name' => 'rf_reveal_children', 'operator' => 'in', 'value' => Pure_Reveal_Settings::EFFECTS ]
						: [ 'name' => 'rf_reveal_text', 'operator' => 'in', 'value' => Pure_Reveal_Settings::TEXT_SPLITS ],
				],
			];
		}

		$terms = [ [ 'name' => 'rf_scroll_preset', 'operator' => 'in', 'value' => array_keys( Pure_Reveal_Settings::PRESETS ) ] ];

		foreach ( array_merge( array_map( static function ( $k ) {
			return "rf_scroll_{$k}";
		}, array_keys( Pure_Motion_Settings::SCROLL ) ), [ 'rf_mouse_track', 'rf_mouse_tilt' ] ) as $name ) {
			$terms[] = [ 'name' => $name, 'operator' => '===', 'value' => 'yes' ];
		}

		return [ 'relation' => 'or', 'terms' => $terms ];
	}

	// ----------------------------------------------------------------- reveal

	/** The Reveal effects in the groups the panel shows them in. */
	private function effect_groups(): array {
		return [
			esc_html__( 'Fade and move', 'refraction' ) => [
				'fade' => esc_html__( 'Fade', 'refraction' ),
				'fade-up' => esc_html__( 'Fade up', 'refraction' ),
				'fade-down' => esc_html__( 'Fade down', 'refraction' ),
				'fade-left' => esc_html__( 'Fade in from the right', 'refraction' ),
				'fade-right' => esc_html__( 'Fade in from the left', 'refraction' ),
				'blur-up' => esc_html__( 'Soft rise (up and out of blur)', 'refraction' ),
				'drop' => esc_html__( 'Drop in and settle', 'refraction' ),
				'skew-up' => esc_html__( 'Slanted rise', 'refraction' ),
				'rise' => esc_html__( 'Rise and turn', 'refraction' ),
			],
			esc_html__( 'Zoom and turn', 'refraction' ) => [
				'zoom-in' => esc_html__( 'Zoom in', 'refraction' ),
				'zoom-out' => esc_html__( 'Zoom out', 'refraction' ),
				'pop' => esc_html__( 'Pop (grows from small)', 'refraction' ),
				'spin' => esc_html__( 'Spin in', 'refraction' ),
				'blur' => esc_html__( 'Sharpen from blur', 'refraction' ),
			],
			esc_html__( '3D', 'refraction' ) => [
				'flip-up' => esc_html__( 'Flip up', 'refraction' ),
				'flip-left' => esc_html__( 'Flip from the side', 'refraction' ),
				'swing' => esc_html__( 'Swing down (hinged at the top)', 'refraction' ),
			],
			esc_html__( 'Uncover', 'refraction' ) => [
				'wipe-up' => esc_html__( 'Wipe up (uncovered from the bottom)', 'refraction' ),
				'wipe-down' => esc_html__( 'Wipe down (uncovered from the top)', 'refraction' ),
				'wipe-left' => esc_html__( 'Wipe from the right', 'refraction' ),
				'wipe-right' => esc_html__( 'Wipe from the left', 'refraction' ),
				'curtain' => esc_html__( 'Curtain (opens from the middle)', 'refraction' ),
				'split' => esc_html__( 'Split (opens top and bottom)', 'refraction' ),
				'iris' => esc_html__( 'Circle (grows from the centre)', 'refraction' ),
				'diagonal' => esc_html__( 'Diagonal wipe', 'refraction' ),
			],
			esc_html__( 'Light', 'refraction' ) => [
				'dim' => esc_html__( 'Light up from faint (best for text with the scroll)', 'refraction' ),
			],
		];
	}

	/** Flat list (what the setting may hold) with a first "none" choice. */
	private function effect_options( string $none ): array {
		$options = [ '' => $none ];

		foreach ( $this->effect_groups() as $group ) {
			$options += $group;
		}

		return $options;
	}

	/** The same choices as select groups, for the panel. */
	private function effect_select_groups( array $first ): array {
		$groups = $first;

		foreach ( $this->effect_groups() as $label => $options ) {
			$groups[] = [ 'label' => $label, 'options' => $options ];
		}

		return $groups;
	}

	private function register_reveal_controls( Element_Base $element ) {
		$is_container = in_array( $element->get_type(), [ 'container', 'section', 'column' ], true );

		$element->start_controls_section( 'section_rf_reveal', [
			'label' => esc_html__( 'Reveal', 'refraction' ),
			'tab' => Controls_Manager::TAB_ADVANCED,
		] );

		$element->add_control( 'rf_reveal', [
			'label' => $is_container ? esc_html__( 'Whole container', 'refraction' ) : esc_html__( 'Whole element', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '',
			'options' => $this->effect_options( esc_html__( 'None', 'refraction' ) ),
			'groups' => $this->effect_select_groups( [ '' => esc_html__( 'None', 'refraction' ) ] ),
			'frontend_available' => true,
		] );

		// The Entrance Animation (Motion Effects) and the whole-element reveal would both move the element: the
		// entrance wins and the reveal is skipped (reveal.js hasEntrance()). Say so instead of doing nothing silently.
		$entrance = $is_container ? 'animation' : '_animation';
		$element->add_control( 'rf_reveal_entrance_notice', [
			'type' => Controls_Manager::ALERT,
			'alert_type' => 'warning',
			'content' => esc_html__( 'This element also has an Entrance Animation (Motion Effects), so the Whole element reveal is skipped. Set Entrance Animation to None to use it. Text and inner elements still reveal.', 'refraction' ),
			'conditions' => [
				'relation' => 'and',
				'terms' => [
					[ 'name' => 'rf_reveal', 'operator' => '!==', 'value' => '' ],
					[ 'name' => $entrance, 'operator' => '!in', 'value' => [ '', 'none' ] ],
				],
			],
		] );

		if ( $is_container ) {
			$element->add_control( 'rf_reveal_children', [
				'label' => esc_html__( 'Its elements, one after another', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => '',
				'options' => $this->effect_options( esc_html__( 'None', 'refraction' ) ),
				'groups' => $this->effect_select_groups( [ '' => esc_html__( 'None', 'refraction' ) ] ),
				'description' => esc_html__( 'Cards, icons or columns inside this container come in one after another.', 'refraction' ),
				'frontend_available' => true,
			] );
		} else {
			$element->add_control( 'rf_reveal_text', [
				'label' => esc_html__( 'Text', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => '',
				'options' => [
					'' => esc_html__( 'None', 'refraction' ),
					'lines' => esc_html__( 'Line by line', 'refraction' ),
					'words' => esc_html__( 'Word by word', 'refraction' ),
					'chars' => esc_html__( 'Letter by letter', 'refraction' ),
				],
				'description' => esc_html__( 'For headings and text: each piece comes in on its own.', 'refraction' ),
				'frontend_available' => true,
			] );

			$element->add_control( 'rf_reveal_text_effect', [
				'label' => esc_html__( 'Text comes', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'mask',
				'options' => [ 'mask' => esc_html__( 'Up from behind a line', 'refraction' ) ] + array_slice( $this->effect_options( '' ), 1, null, true ),
				'groups' => $this->effect_select_groups( [ 'mask' => esc_html__( 'Up from behind a line', 'refraction' ) ] ),
				'frontend_available' => true,
				'condition' => [ 'rf_reveal_text!' => '' ],
			] );
		}

		$any = [
			'relation' => 'or',
			'terms' => [
				[ 'name' => 'rf_reveal', 'operator' => '!==', 'value' => '' ],
				[ 'name' => $is_container ? 'rf_reveal_children' : 'rf_reveal_text', 'operator' => '!==', 'value' => '' ],
			],
		];

		$element->add_control( 'rf_reveal_trigger', [
			'label' => esc_html__( 'Plays', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'once',
			'options' => [
				'once' => esc_html__( 'Once, when it comes into view', 'refraction' ),
				'always' => esc_html__( 'Every time it comes into view', 'refraction' ),
				'scroll' => esc_html__( 'With the scroll (back when scrolling up)', 'refraction' ),
			],
			'frontend_available' => true,
			'separator' => 'before',
			'conditions' => $any,
		] );

		$number = function ( string $key, string $label, int $min, int $max, int $placeholder, array $extra = [] ) use ( $element, $any ) {
			$element->add_control( $key, array_merge( [
				'label' => $label,
				'type' => Controls_Manager::NUMBER,
				'min' => $min,
				'max' => $max,
				'placeholder' => (string) $placeholder,
				'frontend_available' => true,
				'conditions' => $any,
			], $extra ) );
		};

		$timed = [ 'conditions' => [ 'relation' => 'and', 'terms' => [ $any, [ 'name' => 'rf_reveal_trigger', 'operator' => '!==', 'value' => 'scroll' ] ] ] ];
		$scrolled = [ 'conditions' => [ 'relation' => 'and', 'terms' => [ $any, [ 'name' => 'rf_reveal_trigger', 'operator' => '===', 'value' => 'scroll' ] ] ] ];

		$number( 'rf_reveal_duration', esc_html__( 'Duration (ms)', 'refraction' ), 100, 4000, 700, $timed );
		$number( 'rf_reveal_delay', esc_html__( 'Delay (ms)', 'refraction' ), 0, 4000, 0, $timed );
		$number( 'rf_reveal_stagger', esc_html__( 'Time between pieces (ms)', 'refraction' ), 0, 1000, 80 );
		$number( 'rf_reveal_distance', esc_html__( 'Distance (px)', 'refraction' ), 0, 300, 40 );
		$number( 'rf_reveal_offset', esc_html__( 'Starts when this far into the screen (%)', 'refraction' ), 0, 50, 10, $timed );
		$number( 'rf_reveal_start', esc_html__( 'Viewport start (%)', 'refraction' ), 0, 100, 0, $scrolled + [ 'description' => esc_html__( '0: when the element enters at the bottom of the screen. 100: when it leaves at the top.', 'refraction' ) ] );
		$number( 'rf_reveal_end', esc_html__( 'Viewport end (%)', 'refraction' ), 0, 100, 50, $scrolled );

		$element->add_control( 'rf_reveal_easing', [
			'label' => esc_html__( 'Movement', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'smooth',
			'options' => [
				'smooth' => esc_html__( 'Slows down at the end', 'refraction' ),
				'soft' => esc_html__( 'Gentle', 'refraction' ),
				'snappy' => esc_html__( 'Quick start', 'refraction' ),
				'back' => esc_html__( 'Settles with a small bounce', 'refraction' ),
				'linear' => esc_html__( 'Even', 'refraction' ),
			],
			'frontend_available' => true,
			'conditions' => $any,
		] );

		$element->add_control( 'rf_reveal_devices', [
			'label' => esc_html__( 'Play on', 'refraction' ),
			'type' => Controls_Manager::SELECT2,
			'multiple' => true,
			'label_block' => true,
			'options' => self::device_options(),
			'description' => esc_html__( 'Leave empty to play on every device.', 'refraction' ),
			'frontend_available' => true,
			'conditions' => $any,
		] );

		$element->end_controls_section();
	}

	// -------------------------------------------------------------- scrolling

	private function register_scrolling_controls( Element_Base $element ) {
		$is_container = in_array( $element->get_type(), [ 'container', 'section', 'column' ], true );

		$element->start_controls_section( 'section_rf_scroll', [
			'label' => esc_html__( 'Scrolling Effects', 'refraction' ),
			'tab' => Controls_Manager::TAB_ADVANCED,
		] );

		$element->add_control( 'rf_assets', [
			'type' => Controls_Manager::HIDDEN,
			'assets' => [
				'scripts' => [
					[ 'name' => 'refraction-motion-effects', 'conditions' => $this->asset_conditions( 'motion' ) ],
					[ 'name' => 'refraction-sticky', 'conditions' => $this->asset_conditions( 'sticky' ) ],
					[ 'name' => 'refraction-reveal', 'conditions' => $this->asset_conditions( 'reveal', $is_container ) ],
				],
				'styles' => [
					[ 'name' => 'refraction-motion-effects', 'conditions' => $this->asset_conditions( 'sticky' ) ],
					[ 'name' => 'refraction-motion-effects', 'conditions' => $this->asset_conditions( 'reveal', $is_container ) ],
				],
			],
		] );

		$element->add_control( 'rf_scroll_preset', [
			'label' => esc_html__( 'Preset', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '',
			'options' => [
				'' => esc_html__( 'None: set the effects below', 'refraction' ),
				'far' => esc_html__( 'Far layer (slow)', 'refraction' ),
				'mid' => esc_html__( 'Middle layer', 'refraction' ),
				'near' => esc_html__( 'Near layer (fast)', 'refraction' ),
				'float' => esc_html__( 'Float and turn', 'refraction' ),
				'drift-left' => esc_html__( 'Drift left', 'refraction' ),
				'drift-right' => esc_html__( 'Drift right', 'refraction' ),
				'depth' => esc_html__( 'Come closer', 'refraction' ),
			],
			'description' => esc_html__( 'For layered art: give the pieces of an illustration different layers so they move at different speeds while scrolling.', 'refraction' ),
			'frontend_available' => true,
		] );

		$effects = [
			'ty' => [ esc_html__( 'Vertical Scroll', 'refraction' ), [ '' => esc_html__( 'Up', 'refraction' ), 'down' => esc_html__( 'Down', 'refraction' ) ], 'speed', esc_html__( 'Speed', 'refraction' ), 10 ],
			'tx' => [ esc_html__( 'Horizontal Scroll', 'refraction' ), [ '' => esc_html__( 'Left', 'refraction' ), 'right' => esc_html__( 'Right', 'refraction' ) ], 'speed', esc_html__( 'Speed', 'refraction' ), 10 ],
			'fade' => [ esc_html__( 'Transparency', 'refraction' ), $this->fade_options(), 'level', esc_html__( 'Level', 'refraction' ), 10 ],
			'blur' => [ esc_html__( 'Blur', 'refraction' ), $this->fade_options(), 'level', esc_html__( 'Level (px)', 'refraction' ), 20 ],
			'rotate' => [ esc_html__( 'Rotate', 'refraction' ), [ '' => esc_html__( 'Left', 'refraction' ), 'right' => esc_html__( 'Right', 'refraction' ) ], 'speed', esc_html__( 'Speed', 'refraction' ), 10 ],
			'scale' => [ esc_html__( 'Scale', 'refraction' ), [ '' => esc_html__( 'Scale up', 'refraction' ), 'down' => esc_html__( 'Scale down', 'refraction' ) ], 'speed', esc_html__( 'Speed', 'refraction' ), 10 ],
		];

		foreach ( $effects as $key => list( $label, $directions, $amount_key, $amount_label, $max ) ) {
			$on = "rf_scroll_{$key}";

			$element->add_control( $on, [
				'label' => $label,
				'type' => Controls_Manager::SWITCHER,
				'frontend_available' => true,
				'separator' => 'before',
				'condition' => [ 'rf_scroll_preset' => '' ],
			] );

			$element->add_control( "{$on}_dir", [
				'label' => esc_html__( 'Direction', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => $directions,
				'default' => '',
				'frontend_available' => true,
				'condition' => [ $on => 'yes', 'rf_scroll_preset' => '' ],
			] );

			$element->add_control( "{$on}_{$amount_key}", [
				'label' => $amount_label,
				'type' => Controls_Manager::NUMBER,
				'min' => 0,
				'max' => $max,
				'step' => 0.5,
				'placeholder' => 'level' === $amount_key ? '5' : '4',
				'frontend_available' => true,
				'condition' => [ $on => 'yes', 'rf_scroll_preset' => '' ],
			] );

			$element->add_control( "{$on}_start", [
				'label' => esc_html__( 'Viewport start (%)', 'refraction' ),
				'type' => Controls_Manager::NUMBER,
				'min' => 0,
				'max' => 100,
				'placeholder' => '0',
				'frontend_available' => true,
				'condition' => [ $on => 'yes', 'rf_scroll_preset' => '' ],
			] );

			$element->add_control( "{$on}_end", [
				'label' => esc_html__( 'Viewport end (%)', 'refraction' ),
				'type' => Controls_Manager::NUMBER,
				'min' => 0,
				'max' => 100,
				'placeholder' => '100',
				'frontend_available' => true,
				'condition' => [ $on => 'yes', 'rf_scroll_preset' => '' ],
			] );
		}

		$devices = self::device_options();

		$element->add_control( 'rf_scroll_devices', [
			'label' => esc_html__( 'Apply effects on', 'refraction' ),
			'type' => Controls_Manager::SELECT2,
			'multiple' => true,
			'label_block' => true,
			'options' => $devices,
			'description' => esc_html__( 'Leave empty to apply on every device.', 'refraction' ),
			'frontend_available' => true,
			'separator' => 'before',
		] );

		$element->add_control( 'rf_scroll_relative', [
			'label' => esc_html__( 'Relative to', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'options' => [
				'' => esc_html__( 'Viewport', 'refraction' ),
				'page' => esc_html__( 'Entire page', 'refraction' ),
			],
			'default' => '',
			'frontend_available' => true,
		] );

		$element->end_controls_section();
	}

	private function fade_options(): array {
		return [
			'' => esc_html__( 'Fade in', 'refraction' ),
			'out' => esc_html__( 'Fade out', 'refraction' ),
			'in-out' => esc_html__( 'Fade in, then out', 'refraction' ),
			'out-in' => esc_html__( 'Fade out, then in', 'refraction' ),
		];
	}

	// ------------------------------------------------------------------ mouse

	private function register_mouse_controls( Element_Base $element ) {
		$element->start_controls_section( 'section_rf_mouse', [
			'label' => esc_html__( 'Mouse Effects', 'refraction' ),
			'tab' => Controls_Manager::TAB_ADVANCED,
		] );

		$element->add_control( 'rf_mouse_track', [
			'label' => esc_html__( 'Mouse Track', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'frontend_available' => true,
		] );

		$element->add_control( 'rf_mouse_track_dir', [
			'label' => esc_html__( 'Direction', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'options' => [
				'' => esc_html__( 'Opposite to the cursor', 'refraction' ),
				'direct' => esc_html__( 'Follow the cursor', 'refraction' ),
			],
			'default' => '',
			'frontend_available' => true,
			'condition' => [ 'rf_mouse_track' => 'yes' ],
		] );

		$element->add_control( 'rf_mouse_track_speed', [
			'label' => esc_html__( 'Speed', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'min' => 0,
			'max' => 10,
			'step' => 0.1,
			'placeholder' => '1',
			'frontend_available' => true,
			'condition' => [ 'rf_mouse_track' => 'yes' ],
		] );

		$element->add_control( 'rf_mouse_tilt', [
			'label' => esc_html__( '3D Tilt', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'separator' => 'before',
			'frontend_available' => true,
		] );

		$element->add_control( 'rf_mouse_tilt_intensity', [
			'label' => esc_html__( 'Intensity', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'min' => 0,
			'max' => 10,
			'step' => 0.5,
			'placeholder' => '4',
			'frontend_available' => true,
			'condition' => [ 'rf_mouse_tilt' => 'yes' ],
		] );

		$element->add_control( 'rf_mouse_tilt_keep', [
			'label' => esc_html__( 'Keep the tilt when the mouse leaves', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'description' => esc_html__( 'Off: the element returns to flat.', 'refraction' ),
			'frontend_available' => true,
			'condition' => [ 'rf_mouse_tilt' => 'yes' ],
		] );

		$devices = self::device_options();

		$element->add_control( 'rf_mouse_devices', [
			'label' => esc_html__( 'Apply effects on', 'refraction' ),
			'type' => Controls_Manager::SELECT2,
			'multiple' => true,
			'label_block' => true,
			'options' => $devices,
			'description' => esc_html__( 'Leave empty for desktop only.', 'refraction' ),
			'frontend_available' => true,
			'separator' => 'before',
		] );

		$element->end_controls_section();
	}

	// ----------------------------------------------------------------- sticky

	private function register_sticky_controls( Element_Base $element ) {
		$element->start_controls_section( 'section_rf_sticky', [
			'label' => esc_html__( 'Sticky', 'refraction' ),
			'tab' => Controls_Manager::TAB_ADVANCED,
		] );

		$element->add_control( 'rf_sticky', [
			'label' => esc_html__( 'Sticky', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'options' => [
				'' => esc_html__( 'None', 'refraction' ),
				'top' => esc_html__( 'Top', 'refraction' ),
				'bottom' => esc_html__( 'Bottom', 'refraction' ),
			],
			'default' => '',
			'frontend_available' => true,
		] );

		$condition = [ 'rf_sticky!' => '' ];
		$devices = self::device_options();

		$element->add_control( 'rf_sticky_on', [
			'label' => esc_html__( 'Sticky on', 'refraction' ),
			'type' => Controls_Manager::SELECT2,
			'multiple' => true,
			'label_block' => true,
			'options' => $devices,
			'description' => esc_html__( 'Leave empty for every device.', 'refraction' ),
			'frontend_available' => true,
			'condition' => $condition,
		] );

		$element->add_control( 'rf_sticky_offset', [
			'label' => esc_html__( 'Offset (px)', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'min' => 0,
			'max' => 1000,
			'placeholder' => '0',
			'frontend_available' => true,
			'condition' => $condition,
		] );

		$element->add_control( 'rf_sticky_effects_offset', [
			'label' => esc_html__( 'Effects offset (px)', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'min' => 0,
			'max' => 5000,
			'placeholder' => '0',
			'description' => esc_html__( 'Scroll distance after which the scrolled style below applies.', 'refraction' ),
			'frontend_available' => true,
			'condition' => $condition,
		] );

		$element->add_control( 'rf_sticky_parent', [
			'label' => esc_html__( 'Stay in column', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'description' => esc_html__( 'Stops at the bottom (or top) edge of the parent container or column.', 'refraction' ),
			'frontend_available' => true,
			'condition' => $condition,
		] );

		$element->add_control( 'rf_sticky_shrink', [
			'label' => esc_html__( 'Shrink when scrolled', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'prefix_class' => 'rf-sticky-shrink-',
			'separator' => 'before',
			'condition' => $condition,
		] );

		$element->add_control( 'rf_sticky_shrink_padding', [
			'label' => esc_html__( 'Padding when scrolled (px)', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'min' => 0,
			'max' => 200,
			'placeholder' => '8',
			'selectors' => [
				'{{WRAPPER}}.rf-sticky--effects' => 'padding-top: {{VALUE}}px; padding-bottom: {{VALUE}}px; --padding-top: {{VALUE}}px; --padding-bottom: {{VALUE}}px;',
			],
			'condition' => $condition + [ 'rf_sticky_shrink' => 'yes' ],
		] );

		$element->add_control( 'rf_sticky_solid', [
			'label' => esc_html__( 'Background when scrolled', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'description' => esc_html__( 'For a transparent header that turns solid.', 'refraction' ),
			'selectors' => [
				'{{WRAPPER}}.rf-sticky--effects' => 'background-color: {{VALUE}} !important; --background-color: {{VALUE}};',
			],
			'condition' => $condition,
		] );

		$element->end_controls_section();
	}

	// ----------------------------------------------------------------- output

	public function register_assets() {
		$min = Utils::is_script_debug() ? '' : '.min';

		wp_register_script( 'refraction-motion-effects', REFRACTION_ASSETS_URL . 'js/motion-effects-frontend' . $min . '.js', [], REFRACTION_VERSION, true );
		wp_register_script( 'refraction-sticky', REFRACTION_ASSETS_URL . 'js/sticky-frontend' . $min . '.js', [], REFRACTION_VERSION, true );
		wp_register_script( 'refraction-page-scroll', REFRACTION_ASSETS_URL . 'js/page-scroll-frontend' . $min . '.js', [], REFRACTION_VERSION, true );
		wp_register_script( 'refraction-reveal', REFRACTION_ASSETS_URL . 'js/reveal-frontend' . $min . '.js', [], REFRACTION_VERSION, true );
		wp_register_style( 'refraction-motion-effects', REFRACTION_ASSETS_URL . 'css/modules/motion-effects/frontend' . $min . '.css', [], REFRACTION_VERSION );
	}

	public function enqueue_for_preview() {
		wp_enqueue_script( 'refraction-motion-effects' );
		wp_enqueue_script( 'refraction-sticky' );
		wp_enqueue_script( 'refraction-reveal' );
		wp_enqueue_style( 'refraction-motion-effects' );
	}

	/** @param \Refraction\Element_Base $element */
	public function maybe_enqueue( $element ) {
		$settings = Pure_Reveal_Settings::with_preset( $element->get_settings() );

		if ( Pure_Motion_Settings::uses_motion( $settings ) ) {
			wp_enqueue_script( 'refraction-motion-effects' );
		}

		if ( Pure_Reveal_Settings::uses_reveal( $settings ) ) {
			wp_enqueue_script( 'refraction-reveal' );
			wp_enqueue_style( 'refraction-motion-effects' );
		}

		if ( Pure_Sticky_Settings::uses_sticky( $settings ) ) {
			wp_enqueue_script( 'refraction-sticky' );
			wp_enqueue_style( 'refraction-motion-effects' );
		}
	}

	/** Prints the clamped config on the wrapper, so the front end never reads raw control values. */
	public function add_attributes( $element ) {
		$settings = Pure_Reveal_Settings::with_preset( $element->get_settings() );
		$devices = array_keys( self::device_options() );

		$fx = Pure_Motion_Settings::normalize( $settings, $devices );
		$reveal = Pure_Reveal_Settings::normalize( $settings, $devices );

		if ( $reveal ) {
			// Hidden until the script takes over; a CSS fallback shows it after a few seconds if the script never runs.
			$element->add_render_attribute( '_wrapper', 'data-rf-reveal', wp_json_encode( $reveal ) );
			$element->add_render_attribute( '_wrapper', 'class', 'rf-rv-wait' );
		}

		if ( $fx ) {
			$element->add_render_attribute( '_wrapper', 'data-rf-fx', wp_json_encode( $fx ) );
		}

		$sticky = Pure_Sticky_Settings::normalize( $settings, $devices );

		if ( $sticky ) {
			$element->add_render_attribute( '_wrapper', 'data-rf-sticky', wp_json_encode( $sticky ) );
		}
	}
}
