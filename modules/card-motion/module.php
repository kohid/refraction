<?php
namespace Refraction\Modules\CardMotion;

use Refraction\Controls_Manager;
use Refraction\Core\Base\Module as BaseModule;
use Refraction\Modules\CardMotion\Classes\Pure_Stack_Settings;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Card motion: the Card stack of the Image and Image Box widgets (the widget's image plus up to four more, as a fan,
 * a deck, a carousel or a shuffling stack, with hover and click to bring a card forward), and the script and styles
 * of the Slides widget's "Timed cards" layout (modules/pro-widgets/widgets/slides.php renders its markup).
 */
class Module extends BaseModule {

	const STACK_WIDGETS = [ 'image', 'image-box' ];

	public function get_name() {
		return 'card-motion';
	}

	public function __construct() {
		parent::__construct();

		foreach ( self::STACK_WIDGETS as $widget ) {
			add_action( "refraction/element/{$widget}/section_image/after_section_end", [ $this, 'register_stack_controls' ] );
		}

		add_action( 'refraction/frontend/after_register_scripts', [ $this, 'register_assets' ] );
		add_action( 'refraction/frontend/after_register_styles', [ $this, 'register_assets' ] );
		add_action( 'refraction/preview/enqueue_scripts', [ $this, 'enqueue_for_preview' ] );
		add_action( 'refraction/frontend/before_render', [ $this, 'maybe_enqueue' ] );
		add_action( 'refraction/element/after_add_attributes', [ $this, 'add_attributes' ] );
	}

	public function register_assets() {
		if ( wp_script_is( 'refraction-card-stack', 'registered' ) ) {
			return;
		}

		$min = Utils::is_script_debug() ? '' : '.min';
		wp_register_script( 'refraction-card-stack', REFRACTION_ASSETS_URL . 'js/card-stack-frontend' . $min . '.js', [], REFRACTION_VERSION, true );
		wp_register_script( 'refraction-slides-cards', REFRACTION_ASSETS_URL . 'js/slides-cards-frontend' . $min . '.js', [], REFRACTION_VERSION, true );
		wp_register_style( 'refraction-card-motion', REFRACTION_ASSETS_URL . 'css/modules/card-motion/frontend' . $min . '.css', [], REFRACTION_VERSION );
	}

	public function enqueue_for_preview() {
		$this->register_assets();
		wp_enqueue_script( 'refraction-card-stack' );
		wp_enqueue_script( 'refraction-slides-cards' );
		wp_enqueue_style( 'refraction-card-motion' );
	}

	/** @param \Refraction\Widget_Base $element */
	public function register_stack_controls( $element ) {
		$on = [ 'rf_stack!' => '' ];
		$moving = [ 'rf_stack' => [ 'deck', 'carousel', 'shuffle' ] ];

		$element->start_controls_section( 'section_rf_stack', [ 'label' => esc_html__( 'Card stack', 'refraction' ) ] );

		$element->add_control( 'rf_stack', [
			'label' => esc_html__( 'Card stack', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '',
			'options' => [
				'' => esc_html__( 'Off (one image)', 'refraction' ),
				'fan' => esc_html__( 'Fan', 'refraction' ),
				'deck' => esc_html__( 'Deck (the top card flies off)', 'refraction' ),
				'carousel' => esc_html__( 'Carousel (cards wait at the sides)', 'refraction' ),
				'shuffle' => esc_html__( 'Shuffle (the front card goes to the back)', 'refraction' ),
			],
			'description' => esc_html__( 'Shows the image above with up to four more as a stack of cards.', 'refraction' ),
			'render_type' => 'template',
		] );

		$element->add_control( 'rf_stack_images', [
			'label' => esc_html__( 'More images (up to 4)', 'refraction' ),
			'type' => Controls_Manager::GALLERY,
			'condition' => $on,
			'render_type' => 'template',
		] );

		$element->add_control( 'rf_stack_ratio', [
			'label' => esc_html__( 'Card shape', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '3/4',
			'options' => array_combine( Pure_Stack_Settings::RATIOS, Pure_Stack_Settings::RATIOS ),
			'condition' => $on,
			'render_type' => 'template',
		] );

		$element->add_responsive_control( 'rf_stack_width', [
			'label' => esc_html__( 'Card width', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ '%', 'px' ],
			'range' => [ '%' => [ 'min' => 20, 'max' => 100 ], 'px' => [ 'min' => 120, 'max' => 800 ] ],
			'default' => [ 'unit' => 'px', 'size' => 320 ],
			'tablet_default' => [ 'unit' => 'px', 'size' => 280 ],
			'mobile_default' => [ 'unit' => '%', 'size' => 56 ],
			'selectors' => [ '{{WRAPPER}} .rf-stack' => '--rf-stack-w: {{SIZE}}{{UNIT}};' ],
			'condition' => $on,
		] );

		$element->add_control( 'rf_stack_spread', [
			'label' => esc_html__( 'Tilt (degrees)', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 30 ] ],
			'default' => [ 'size' => 8 ],
			'condition' => $on,
			'render_type' => 'template',
		] );

		$element->add_control( 'rf_stack_offset', [
			'label' => esc_html__( 'Spacing between cards', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 80 ] ],
			'default' => [ 'size' => 30 ],
			'description' => esc_html__( 'How far the cards behind stick out, as a share of the card width.', 'refraction' ),
			'condition' => $on,
			'render_type' => 'template',
		] );

		$element->add_control( 'rf_stack_autoplay', [
			'label' => esc_html__( 'Play by itself', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'condition' => $moving,
			'render_type' => 'template',
		] );

		$element->add_control( 'rf_stack_interval', [
			'label' => esc_html__( 'Time per card (ms)', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'min' => 1200,
			'max' => 10000,
			'placeholder' => '2800',
			'condition' => $moving + [ 'rf_stack_autoplay' => 'yes' ],
			'render_type' => 'template',
		] );

		$element->add_control( 'rf_stack_hover', [
			'label' => esc_html__( 'Hovering a card behind', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'front',
			'options' => [
				'front' => esc_html__( 'Brings it to the front', 'refraction' ),
				'lift' => esc_html__( 'Lifts it', 'refraction' ),
				'none' => esc_html__( 'Nothing', 'refraction' ),
			],
			'condition' => $on,
			'render_type' => 'template',
		] );

		$element->add_control( 'rf_stack_click', [
			'label' => esc_html__( 'Click for the next card', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'description' => esc_html__( 'Not when the image has a link: then a click opens the link.', 'refraction' ),
			'condition' => $on,
			'render_type' => 'template',
		] );

		$element->add_control( 'rf_stack_dots', [
			'label' => esc_html__( 'Dots', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'condition' => [ 'rf_stack' => 'carousel' ],
			'render_type' => 'template',
		] );

		$element->add_control( 'rf_stack_glow', [
			'label' => esc_html__( 'Glow in the front card\'s color', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'condition' => $on,
			'render_type' => 'template',
		] );

		$element->add_control( 'rf_stack_reflection', [
			'label' => esc_html__( 'Reflection', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'condition' => $on,
			'render_type' => 'template',
		] );

		$element->add_control( 'rf_stack_radius', [
			'label' => esc_html__( 'Card corners', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 60 ] ],
			'default' => [ 'size' => 18 ],
			'selectors' => [ '{{WRAPPER}} .rf-stack' => '--rf-stack-radius: {{SIZE}}px;' ],
			'condition' => $on,
			'separator' => 'before',
		] );

		$element->add_control( 'rf_stack_shadow', [
			'label' => esc_html__( 'Card shadow', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 80 ] ],
			'default' => [ 'size' => 30 ],
			'selectors' => [ '{{WRAPPER}} .rf-stack' => '--rf-stack-shadow: {{SIZE}}px;' ],
			'condition' => $on,
		] );

		$element->end_controls_section();
	}

	/** @param \Refraction\Element_Base $element */
	private static function config( $element ): array {
		if ( ! in_array( $element->get_name(), self::STACK_WIDGETS, true ) ) {
			return [];
		}

		$settings = $element->get_settings();

		if ( empty( $settings['rf_stack'] ) ) {
			return [];
		}

		$extra = [];

		foreach ( array_slice( (array) ( $settings['rf_stack_images'] ?? [] ), 0, Pure_Stack_Settings::MAX_EXTRA ) as $image ) {
			$id = (int) ( $image['id'] ?? 0 );
			$url = $id ? (string) wp_get_attachment_image_url( $id, 'large' ) : (string) ( $image['url'] ?? '' );
			$extra[] = [ 'url' => $url, 'alt' => $id ? (string) get_post_meta( $id, '_wp_attachment_image_alt', true ) : '' ];
		}

		return Pure_Stack_Settings::normalize( $settings, $extra );
	}

	/** @param \Refraction\Element_Base $element */
	public function maybe_enqueue( $element ) {
		if ( self::config( $element ) ) {
			$this->register_assets();
			wp_enqueue_script( 'refraction-card-stack' );
			wp_enqueue_style( 'refraction-card-motion' );
		}
	}

	/** The clamped config on the wrapper (in the editor the script reads the live settings instead). */
	public function add_attributes( $element ) {
		$config = self::config( $element );

		if ( $config ) {
			$element->add_render_attribute( '_wrapper', 'data-rf-stack', wp_json_encode( $config ) );
		}
	}
}
