<?php
namespace Refraction\Modules\HighlightWords;

use Refraction\Controls_Manager;
use Refraction\Core\Base\Module as BaseModule;
use Refraction\Includes\Widgets\Traits\Heading_Dual_Style;
use Refraction\Modules\HighlightWords\Classes\Pure_Highlight;
use Refraction\Utils;
use Refraction\Widget_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Highlight Words (0.67.0, every widget with a title or description since 0.67.1): any number of words or phrases in
 * a widget's text, highlighted like the Dual Heading's part (own color or gradient, a mark behind them that can draw
 * itself in). A Content section with the phrases and (except the Heading, which shares its Dual Heading style) a
 * Style section, added before the widget's first Style section when it has a title or description control. The site gets the spans from the server (render_content); the editor's preview, which draws widgets with
 * their JS templates, gets them from assets/js/highlight-preview.js.
 *
 * Also the Pill Label of the Heading: a small heading shown as a pill with a round badge (a number or an icon).
 */
class Module extends BaseModule {

	/**
	 * Widgets left out: their text is drawn or rewritten by a script, lives in SVG, or is not the visitor's text (forms,
	 * code, maps, media, post lists).
	 */
	const EXCLUDE = '/^(rfb-|refraction-form$|refraction-login$|html$|shortcode$|wp-widget-|text-path$|refraction-animated-headline$|refraction-countdown$|build-scene$|scroll-sequence$|refraction-code-highlight$|google_maps$|video$|audio$|refraction-lottie$|image-gallery$|image-carousel$|refraction-gallery$|refraction-media-carousel$|refraction-video-playlist$|spacer$|divider$|menu-anchor$|sidebar$|social-icons$|refraction-share-buttons$|refraction-nav-menu$|refraction-mega-menu$|refraction-facebook|refraction-template$|loop-|posts$|archive-posts$|portfolio$|taxonomy-filter$|theme-site-logo$|theme-search-form$|theme-sitemap$|refraction-table-of-contents$|refraction-event-calendar$|refraction-off-canvas$)/';

	/** A control that holds a title or a description. */
	const TEXT_NAMES = '/(^|_)(title|heading|headline|description|desc|text|content|editor|caption|subtitle|quote|label|tweet|testimonial)(_|$)/';

	const TEXT_TYPES = [ 'text', 'textarea', 'wysiwyg' ];

	public function get_name() {
		return 'highlight-words';
	}

	public function __construct() {
		parent::__construct();

		add_action( 'refraction/element/before_section_start', [ $this, 'maybe_add_sections' ], 10, 3 );

		add_action( 'refraction/element/heading/section_title_style/after_section_end', [ $this, 'add_pill_controls' ] );
		add_filter( 'refraction/widget/render_content', [ $this, 'render' ], 10, 2 );
		add_action( 'refraction/preview/enqueue_scripts', [ $this, 'enqueue_preview' ] );
	}

	/** Whether a widget has a title or a description: a text control, also inside a repeater, named like one. */
	public static function has_text( array $controls ): bool {
		foreach ( $controls as $name => $control ) {
			$type = (string) ( $control['type'] ?? '' );

			if ( in_array( $type, self::TEXT_TYPES, true ) && preg_match( self::TEXT_NAMES, (string) $name ) ) {
				return true;
			}

			if ( in_array( $type, [ 'repeater', 'nested-elements-repeater' ], true ) && ! empty( $control['fields'] ) && self::has_text( (array) $control['fields'] ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Before a widget's first Style section (its content controls are all there by then): Highlight Words for every
	 * widget with a title or a description.
	 */
	public function maybe_add_sections( $element, $section_id, $args ) {
		if ( ! $element instanceof Widget_Base || Controls_Manager::TAB_STYLE !== ( $args['tab'] ?? '' ) ) {
			return;
		}

		// Once per set of controls: a widget's controls can be built more than once in a request.
		if ( preg_match( self::EXCLUDE, $element->get_name() ) || $element->get_controls( 'section_rf_hl' ) ) {
			return;
		}

		if ( self::has_text( $element->get_controls() ) ) {
			$this->add_sections( $element );
		}
	}

	/** Highlight Words, and its Style section (the Heading has its own, shared with the Dual Heading). */
	public function add_sections( $element ) {
		$heading = 'heading' === $element->get_name();

		$element->start_controls_section( 'section_rf_hl', [
			'label' => esc_html__( 'Highlight Words', 'refraction' ),
			'tab' => Controls_Manager::TAB_CONTENT,
		] );

		$element->add_control( 'rf_hl_words', [
			'label' => esc_html__( 'Words To Highlight', 'refraction' ),
			'type' => Controls_Manager::TEXTAREA,
			'rows' => 4,
			'placeholder' => esc_html__( "your bank\nfree first call", 'refraction' ),
			'description' => $heading
				? esc_html__( 'One word or phrase per line; each is highlighted wherever it appears in the title. Style them in Style > Highlighted Text (shared with the Dual Heading).', 'refraction' )
				: esc_html__( 'One word or phrase per line; each is highlighted wherever it appears in this widget\'s text. Style them in Style > Highlighted Text.', 'refraction' ),
			'render_type' => 'template',
		] );

		$element->add_control( 'rf_hl_case', [
			'label' => esc_html__( 'Match Upper And Lower Case', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'render_type' => 'template',
			'condition' => [ 'rf_hl_words!' => '' ],
		] );

		$element->end_controls_section();

		if ( ! $heading ) {
			Heading_Dual_Style::controls( $element, [ 'condition' => [ 'rf_hl_words!' => '' ] ] );
		}
	}

	/** Heading > Style > Pill Label: a small heading as a pill with a round badge (like "3 HOW IT WORKS"). */
	public function add_pill_controls( $element ): void {
		$title = '{{WRAPPER}}.rf-pill-yes.refraction-widget-heading .refraction-heading-title';
		$badge = '{{WRAPPER}} .rf-pill__badge';

		$element->start_controls_section( 'section_rf_pill', [
			'label' => esc_html__( 'Pill Label', 'refraction' ),
			'tab' => Controls_Manager::TAB_STYLE,
		] );

		$element->add_control( 'rf_pill', [
			'label' => esc_html__( 'Show As A Pill Label', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'description' => esc_html__( 'For small texts above a heading: a rounded tinted label with a round badge.', 'refraction' ),
			'prefix_class' => 'rf-pill-',
			'render_type' => 'template',
		] );

		$on = [ 'rf_pill' => 'yes' ];

		$element->add_control( 'rf_pill_badge', [ 'label' => esc_html__( 'Badge Text', 'refraction' ), 'type' => Controls_Manager::TEXT, 'placeholder' => '3', 'description' => esc_html__( 'A number or a short word in the round badge. Empty: the icon below, or no badge.', 'refraction' ), 'render_type' => 'template', 'condition' => $on ] );
		$element->add_control( 'rf_pill_icon', [ 'label' => esc_html__( 'Badge Icon', 'refraction' ), 'type' => Controls_Manager::ICONS, 'skin' => 'inline', 'label_block' => false, 'render_type' => 'template', 'condition' => array_merge( $on, [ 'rf_pill_badge' => '' ] ) ] );
		$element->add_control( 'rf_pill_caps', [ 'label' => esc_html__( 'Capital Letters, Spaced Out', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'default' => 'yes', 'prefix_class' => 'rf-pill-caps-', 'condition' => $on ] );
		$element->add_control( 'rf_pill_bg', [ 'label' => esc_html__( 'Pill Background', 'refraction' ), 'type' => Controls_Manager::COLOR, 'default' => '#DDF7EE', 'selectors' => [ $title => '--rf-pill-bg: {{VALUE}};' ], 'condition' => $on, 'separator' => 'before' ] );
		$element->add_control( 'rf_pill_border', [ 'label' => esc_html__( 'Pill Border', 'refraction' ), 'type' => Controls_Manager::COLOR, 'default' => '#B8EBD9', 'selectors' => [ $title => '--rf-pill-border: {{VALUE}};' ], 'condition' => $on ] );
		$element->add_responsive_control( 'rf_pill_padding', [ 'label' => esc_html__( 'Pill Padding', 'refraction' ), 'type' => Controls_Manager::DIMENSIONS, 'size_units' => [ 'px', 'em' ], 'selectors' => [ $title => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ], 'condition' => $on ] );
		$element->add_control( 'rf_pill_radius', [ 'label' => esc_html__( 'Pill Corners', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'size_units' => [ 'px' ], 'range' => [ 'px' => [ 'max' => 99 ] ], 'selectors' => [ $title => 'border-radius: {{SIZE}}px;' ], 'condition' => $on ] );
		$element->add_control( 'rf_pill_badge_bg', [ 'label' => esc_html__( 'Badge Background', 'refraction' ), 'type' => Controls_Manager::COLOR, 'default' => '#1FCB97', 'selectors' => [ $badge => 'background-color: {{VALUE}};' ], 'condition' => $on, 'separator' => 'before' ] );
		$element->add_control( 'rf_pill_badge_color', [ 'label' => esc_html__( 'Badge Text Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'default' => '#06372A', 'selectors' => [ $badge => 'color: {{VALUE}};' ], 'condition' => $on ] );
		$element->add_responsive_control( 'rf_pill_badge_size', [ 'label' => esc_html__( 'Badge Size', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'size_units' => [ 'em', 'px' ], 'range' => [ 'em' => [ 'min' => 1, 'max' => 4, 'step' => 0.1 ], 'px' => [ 'min' => 14, 'max' => 64 ] ], 'selectors' => [ $badge => '--rf-pill-badge: {{SIZE}}{{UNIT}};' ], 'condition' => $on ] );
		$element->add_responsive_control( 'rf_pill_gap', [ 'label' => esc_html__( 'Space After The Badge', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'size_units' => [ 'em', 'px' ], 'range' => [ 'em' => [ 'max' => 2, 'step' => 0.05 ], 'px' => [ 'max' => 40 ] ], 'selectors' => [ $title => 'gap: {{SIZE}}{{UNIT}};' ], 'condition' => $on ] );

		$element->end_controls_section();
	}

	/** The pill's badge, '' without one. */
	public static function pill_badge( array $settings ): string {
		if ( 'yes' !== ( $settings['rf_pill'] ?? '' ) ) {
			return '';
		}

		$text = trim( (string) ( $settings['rf_pill_badge'] ?? '' ) );

		if ( '' !== $text ) {
			return '<span class="rf-pill__badge">' . esc_html( $text ) . '</span>';
		}

		if ( ! empty( $settings['rf_pill_icon']['value'] ) ) {
			return '<span class="rf-pill__badge rf-pill__badge--icon">' . \Refraction\Icons_Manager::try_get_icon_html( $settings['rf_pill_icon'], [ 'aria-hidden' => 'true' ] ) . '</span>';
		}

		return '';
	}

	/** On the site: the highlighted words, and the Heading's pill badge. */
	public function render( $content, $widget ) {
		if ( ! $widget instanceof Widget_Base || preg_match( self::EXCLUDE, $widget->get_name() ) ) {
			return $content;
		}

		$settings = $widget->get_settings_for_display();
		$words = (string) ( $settings['rf_hl_words'] ?? '' );

		if ( '' !== trim( $words ) ) {
			$content = Pure_Highlight::wrap( (string) $content, $words, 'yes' === ( $settings['rf_hl_case'] ?? '' ) );
		}

		if ( 'heading' === $widget->get_name() ) {
			$badge = self::pill_badge( $settings );

			if ( '' !== $badge ) {
				$content = preg_replace( '#(<[^>]*\brefraction-heading-title\b[^>]*>)#', '$1' . str_replace( [ '\\', '$' ], [ '\\\\', '\$' ], $badge ), (string) $content, 1 );
			}
		}

		return $content;
	}

	public function enqueue_preview() {
		$min = Utils::is_script_debug() ? '' : '.min';
		wp_enqueue_script( 'refraction-highlight-preview', REFRACTION_ASSETS_URL . 'js/highlight-preview' . $min . '.js', [], REFRACTION_VERSION, true );
	}
}
