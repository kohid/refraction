<?php
namespace Refraction\Modules\Interactions\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Box_Shadow;
use Refraction\Group_Control_Typography;
use Refraction\Icons_Manager;
use Refraction\Modules\ProWidgets\Module as ProWidgets;
use Refraction\Repeater;
use Refraction\Utils;
use Refraction\Widget_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Phone Showcase: a walk-through of an app. Steps (up to 20) on one side; a phone (or tablet) on the other shows the
 * screen of the chosen step. Click a step, or tap inside the phone for the next one; it can also play by itself.
 * Floating cards (a rating, "Booked!", points) hover around the phone. The device comes from a library of frames
 * drawn in CSS (colored as you like) or from your own frame image. phone-showcase.js runs it.
 */
class Phone_Showcase extends Widget_Base {

	const MAX_STEPS = 20;
	const MAX_CARDS = 8;

	/**
	 * The device library: aspect ratio (width / height), corner radius and bezel (shares of the width), the screen's
	 * cutout, and whether it has side buttons, a home button, or is a tablet. Drawn in phone-showcase styles.
	 */
	public static function devices(): array {
		return [
			'island' => [ __( 'Phone with a camera island', 'refraction' ), 0.488, 0.17, 0.035, 'island' ],
			'notch' => [ __( 'Phone with a notch', 'refraction' ), 0.488, 0.16, 0.035, 'notch' ],
			'hole' => [ __( 'Phone with a centered camera hole', 'refraction' ), 0.46, 0.12, 0.03, 'hole' ],
			'hole-left' => [ __( 'Phone with a corner camera hole', 'refraction' ), 0.46, 0.12, 0.03, 'hole-left' ],
			'edge' => [ __( 'Edge-to-edge phone (no cutout)', 'refraction' ), 0.47, 0.13, 0.022, 'none' ],
			'rounded' => [ __( 'Rounded phone with even bezels', 'refraction' ), 0.47, 0.14, 0.05, 'hole' ],
			'compact' => [ __( 'Compact phone', 'refraction' ), 0.52, 0.16, 0.04, 'island' ],
			'classic' => [ __( 'Classic phone with a home button', 'refraction' ), 0.49, 0.15, 0.055, 'classic' ],
			'fold' => [ __( 'Foldable, open', 'refraction' ), 0.87, 0.07, 0.03, 'hole-right' ],
			'clay' => [ __( 'Clay mockup (soft, no buttons)', 'refraction' ), 0.48, 0.2, 0.06, 'island' ],
			'outline' => [ __( 'Outline (a drawn line)', 'refraction' ), 0.48, 0.16, 0.03, 'island' ],
			'tablet' => [ __( 'Tablet, upright', 'refraction' ), 0.72, 0.06, 0.045, 'dot' ],
			'tablet-wide' => [ __( 'Tablet, sideways', 'refraction' ), 1.39, 0.045, 0.032, 'dot-side' ],
		];
	}

	public static function colors(): array {
		return [
			'black' => [ __( 'Black', 'refraction' ), '#17181b' ],
			'graphite' => [ __( 'Graphite', 'refraction' ), '#3b3d42' ],
			'silver' => [ __( 'Silver', 'refraction' ), '#d9dbdf' ],
			'white' => [ __( 'White', 'refraction' ), '#f4f4f2' ],
			'gold' => [ __( 'Gold', 'refraction' ), '#e8d6b8' ],
			'blue' => [ __( 'Deep blue', 'refraction' ), '#2c3a52' ],
			'green' => [ __( 'Sage green', 'refraction' ), '#7c9a86' ],
			'rose' => [ __( 'Rose', 'refraction' ), '#e8c4c0' ],
			'purple' => [ __( 'Purple', 'refraction' ), '#5b4a7a' ],
			'custom' => [ __( 'My own color', 'refraction' ), '' ],
		];
	}

	public function get_name() {
		return 'refraction-phone-showcase';
	}

	public function get_title() {
		return esc_html__( 'Phone Showcase', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-device-mobile';
	}

	public function get_categories() {
		return [ ProWidgets::CATEGORY ];
	}

	public function get_keywords() {
		return [ 'phone', 'mockup', 'device', 'app', 'demo', 'steps', 'walkthrough', 'screens', 'tablet', 'showcase', 'interactive' ];
	}

	public function get_script_depends(): array {
		return [ 'refraction-phone-showcase' ];
	}

	public function get_style_depends(): array {
		return [ 'refraction-interactions' ];
	}

	protected function register_controls() {
		$this->start_controls_section( 'section_steps', [ 'label' => esc_html__( 'Steps', 'refraction' ) ] );

		$steps = new Repeater();

		$steps->add_control( 'icon', [
			'label' => esc_html__( 'Icon', 'refraction' ),
			'type' => Controls_Manager::ICONS,
			'default' => [ 'value' => 'fas fa-mobile-alt', 'library' => 'fa-solid' ],
		] );

		$steps->add_control( 'title', [
			'label' => esc_html__( 'Title', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'dynamic' => [ 'active' => true ],
			'label_block' => true,
			'default' => esc_html__( 'A step', 'refraction' ),
		] );

		$steps->add_control( 'text', [
			'label' => esc_html__( 'Description', 'refraction' ),
			'type' => Controls_Manager::TEXTAREA,
			'dynamic' => [ 'active' => true ],
			'rows' => 2,
		] );

		$steps->add_control( 'screen', [
			'label' => esc_html__( 'Screen', 'refraction' ),
			'type' => Controls_Manager::MEDIA,
			'dynamic' => [ 'active' => true ],
			'description' => esc_html__( 'A screenshot of the app at this step, as tall as the phone\'s screen or taller (a long screen can scroll inside the phone).', 'refraction' ),
		] );

		$steps->add_control( 'screen_bg', [
			'label' => esc_html__( 'Screen Background', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-phone__shot{{CURRENT_ITEM}}' => 'background-color: {{VALUE}};' ],
		] );

		$this->add_control( 'steps', [
			'label' => esc_html__( 'Steps', 'refraction' ) . ' (' . sprintf( /* translators: %d: maximum. */ esc_html__( 'up to %d', 'refraction' ), self::MAX_STEPS ) . ')',
			'type' => Controls_Manager::REPEATER,
			'fields' => $steps->get_controls(),
			'max_items' => self::MAX_STEPS,
			'default' => [
				[ 'title' => esc_html__( 'Browse the branded page', 'refraction' ), 'text' => esc_html__( 'Services, reviews, hours and contact, all in one place.', 'refraction' ), 'icon' => [ 'value' => 'fas fa-store', 'library' => 'fa-solid' ] ],
				[ 'title' => esc_html__( 'Pick a service', 'refraction' ), 'text' => esc_html__( 'Grooming or boarding with live pricing and durations.', 'refraction' ), 'icon' => [ 'value' => 'fas fa-cut', 'library' => 'fa-solid' ] ],
				[ 'title' => esc_html__( 'Choose the pet', 'refraction' ), 'text' => esc_html__( 'Multiple pets, profiles and vaccination records on file.', 'refraction' ), 'icon' => [ 'value' => 'far fa-calendar', 'library' => 'fa-regular' ] ],
				[ 'title' => esc_html__( 'Confirm and earn points', 'refraction' ), 'text' => esc_html__( 'Instant confirmation, loyalty rewards credited.', 'refraction' ), 'icon' => [ 'value' => 'fas fa-gift', 'library' => 'fa-solid' ] ],
			],
			'title_field' => '{{{ title }}}',
		] );

		$this->add_control( 'label', [
			'label' => esc_html__( 'Text Above The Steps', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => esc_html__( 'Click a step, or tap inside the phone', 'refraction' ),
			'label_block' => true,
			'separator' => 'before',
		] );

		$this->add_control( 'label_icon', [
			'label' => esc_html__( 'Its Icon', 'refraction' ),
			'type' => Controls_Manager::ICONS,
			'skin' => 'inline',
			'label_block' => false,
			'default' => [ 'value' => 'fas fa-hand-pointer', 'library' => 'fa-solid' ],
			'condition' => [ 'label!' => '' ],
		] );

		$this->add_control( 'heading', [
			'label' => esc_html__( 'Heading', 'refraction' ),
			'type' => Controls_Manager::TEXTAREA,
			'rows' => 2,
			'dynamic' => [ 'active' => true ],
			'placeholder' => esc_html__( 'Book your ride in four taps', 'refraction' ),
			'description' => esc_html__( 'Under the text above the steps. Empty: no heading.', 'refraction' ),
		] );

		$this->add_control( 'heading_tag', [
			'label' => esc_html__( 'Heading HTML Tag', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'h2',
			'options' => [ 'h1' => 'H1', 'h2' => 'H2', 'h3' => 'H3', 'h4' => 'H4', 'h5' => 'H5', 'h6' => 'H6', 'p' => 'p', 'div' => 'div' ],
			'condition' => [ 'heading!' => '' ],
		] );

		$this->add_control( 'description', [
			'label' => esc_html__( 'Description', 'refraction' ),
			'type' => Controls_Manager::TEXTAREA,
			'rows' => 3,
			'dynamic' => [ 'active' => true ],
			'description' => esc_html__( 'Under the heading. Empty: no description.', 'refraction' ),
		] );

		$this->add_control( 'number_shows', [
			'label' => esc_html__( 'Step Number', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'active',
			'options' => [
				'active' => esc_html__( 'On the current step, in place of its icon', 'refraction' ),
				'all' => esc_html__( 'On every step, in place of the icon', 'refraction' ),
				'none' => esc_html__( 'Never (icons only)', 'refraction' ),
			],
		] );

		$this->add_control( 'button_text', [
			'label' => esc_html__( 'Button Under The Steps', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'dynamic' => [ 'active' => true ],
			'placeholder' => esc_html__( 'Open full demo', 'refraction' ),
			'description' => esc_html__( 'Empty: no button.', 'refraction' ),
			'separator' => 'before',
		] );

		$this->add_control( 'button_link', [
			'label' => esc_html__( 'Button Link', 'refraction' ),
			'type' => Controls_Manager::URL,
			'dynamic' => [ 'active' => true ],
			'condition' => [ 'button_text!' => '' ],
		] );

		$this->add_control( 'button2_text', [
			'label' => esc_html__( 'Second Button', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'dynamic' => [ 'active' => true ],
			'placeholder' => esc_html__( 'Call us', 'refraction' ),
			'description' => esc_html__( 'Beside the first one, as an outline button. Empty: no second button.', 'refraction' ),
		] );

		$this->add_control( 'button2_link', [
			'label' => esc_html__( 'Second Button Link', 'refraction' ),
			'type' => Controls_Manager::URL,
			'dynamic' => [ 'active' => true ],
			'condition' => [ 'button2_text!' => '' ],
		] );

		$this->end_controls_section();

		// ---------------------------------------------------------------- device
		$this->start_controls_section( 'section_device', [ 'label' => esc_html__( 'Phone', 'refraction' ) ] );

		$devices = [];

		foreach ( self::devices() as $key => $device ) {
			$devices[ $key ] = $device[0];
		}

		$devices['custom'] = esc_html__( 'My own frame image', 'refraction' );

		$this->add_control( 'device', [
			'label' => esc_html__( 'Device', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'island',
			'options' => $devices,
		] );

		$colors = [];

		foreach ( self::colors() as $key => $color ) {
			$colors[ $key ] = $color[0];
		}

		$this->add_control( 'color', [
			'label' => esc_html__( 'Color', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'black',
			'options' => $colors,
			'condition' => [ 'device!' => [ 'custom', 'outline' ] ],
		] );

		$this->add_control( 'color_custom', [
			'label' => esc_html__( 'Frame Color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-phone' => '--rf-phone-color: {{VALUE}};' ],
			'conditions' => [
				'relation' => 'or',
				'terms' => [
					[ 'name' => 'color', 'value' => 'custom' ],
					[ 'name' => 'device', 'value' => 'outline' ],
				],
			],
		] );

		$this->add_control( 'frame_image', [
			'label' => esc_html__( 'Frame Image', 'refraction' ),
			'type' => Controls_Manager::MEDIA,
			'description' => esc_html__( 'A picture of a device whose screen is see-through (a PNG with a transparent screen). Then set where the screen is, in % of the picture.', 'refraction' ),
			'condition' => [ 'device' => 'custom' ],
		] );

		foreach ( [ 'top' => esc_html__( 'Screen From The Top', 'refraction' ), 'right' => esc_html__( 'Screen From The Right', 'refraction' ), 'bottom' => esc_html__( 'Screen From The Bottom', 'refraction' ), 'left' => esc_html__( 'Screen From The Left', 'refraction' ) ] as $side => $label ) {
			$this->add_control( 'frame_' . $side, [
				'label' => $label . ' (%)',
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => 0, 'max' => 40, 'step' => 0.1 ] ],
				'default' => [ 'size' => in_array( $side, [ 'top', 'bottom' ], true ) ? 2 : 4.5 ],
				'selectors' => [ '{{WRAPPER}} .rf-phone--custom .rf-phone__screen' => $side . ': {{SIZE}}%;' ],
				'condition' => [ 'device' => 'custom' ],
			] );
		}

		$this->add_control( 'frame_radius', [
			'label' => esc_html__( 'Screen Corners', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px', '%' ],
			'range' => [ 'px' => [ 'max' => 80 ] ],
			'selectors' => [ '{{WRAPPER}} .rf-phone--custom .rf-phone__screen' => 'border-radius: {{SIZE}}{{UNIT}};' ],
			'condition' => [ 'device' => 'custom' ],
		] );

		$this->add_control( 'status_bar', [
			'label' => esc_html__( 'Status Bar (time, signal, battery)', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'dark',
			'options' => [
				'dark' => esc_html__( 'Dark, for light screens', 'refraction' ),
				'light' => esc_html__( 'Light, for dark screens', 'refraction' ),
				'' => esc_html__( 'None (the screenshots have their own)', 'refraction' ),
			],
			'separator' => 'before',
		] );

		$this->add_control( 'status_time', [
			'label' => esc_html__( 'Time Shown', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => '9:41',
			'condition' => [ 'status_bar!' => '' ],
		] );

		$this->add_control( 'fit', [
			'label' => esc_html__( 'Screenshots', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'cover',
			'options' => [
				'cover' => esc_html__( 'Fill the screen (from the top)', 'refraction' ),
				'scroll' => esc_html__( 'Full width, a long one scrolls inside the phone', 'refraction' ),
				'contain' => esc_html__( 'Whole screenshot visible', 'refraction' ),
			],
		] );

		$this->add_control( 'change', [
			'label' => esc_html__( 'Screen Change', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'slide',
			'options' => [
				'slide' => esc_html__( 'Slide in, like an app', 'refraction' ),
				'fade' => esc_html__( 'Fade', 'refraction' ),
				'zoom' => esc_html__( 'Zoom', 'refraction' ),
				'none' => esc_html__( 'At once', 'refraction' ),
			],
		] );

		$this->add_control( 'tap', [
			'label' => esc_html__( 'Tap The Phone For The Next Step', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'return_value' => 'yes',
		] );

		$this->add_control( 'autoplay', [
			'label' => esc_html__( 'Play By Itself', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'description' => esc_html__( 'Moves to the next step on its own (pauses while hovered or used, and when off screen; not for visitors who ask for reduced motion). The current step shows a line timing it.', 'refraction' ),
		] );

		$this->add_control( 'interval', [
			'label' => esc_html__( 'Time Per Step', 'refraction' ) . ' (s)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 2, 'max' => 20, 'step' => 0.5 ] ],
			'default' => [ 'size' => 5 ],
			'condition' => [ 'autoplay' => 'yes' ],
		] );

		$this->add_control( 'float', [
			'label' => esc_html__( 'Phone Floats Gently', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'prefix_class' => 'rf-showcase-float-',
		] );

		$this->end_controls_section();

		// ---------------------------------------------------------------- floating cards
		$this->start_controls_section( 'section_cards', [ 'label' => esc_html__( 'Floating Cards', 'refraction' ) ] );

		$cards = new Repeater();

		$cards->add_control( 'icon', [
			'label' => esc_html__( 'Icon', 'refraction' ),
			'type' => Controls_Manager::ICONS,
			'default' => [ 'value' => 'fas fa-check', 'library' => 'fa-solid' ],
		] );

		$cards->add_control( 'title', [
			'label' => esc_html__( 'Title', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => esc_html__( 'Booked!', 'refraction' ),
		] );

		$cards->add_control( 'text', [
			'label' => esc_html__( 'Text', 'refraction' ),
			'type' => Controls_Manager::TEXT,
		] );

		$cards->add_control( 'stars', [
			'label' => esc_html__( 'Stars Before The Title', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'min' => 0,
			'max' => 5,
			'description' => esc_html__( 'For a rating card: 5 stars then the title, such as 4.9. 0: none.', 'refraction' ),
		] );

		$cards->add_control( 'x', [
			'label' => esc_html__( 'Across', 'refraction' ) . ' (%)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => -60, 'max' => 160 ] ],
			'default' => [ 'size' => -20 ],
			'description' => esc_html__( 'Where its middle is, in % of the phone\'s width (0 = its left edge, 100 = its right edge; less or more is outside).', 'refraction' ),
			'selectors' => [ '{{WRAPPER}} {{CURRENT_ITEM}}.rf-showcase__card' => '--x: {{SIZE}}%;' ],
		] );

		$cards->add_control( 'y', [
			'label' => esc_html__( 'Down', 'refraction' ) . ' (%)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => -20, 'max' => 120 ] ],
			'default' => [ 'size' => 25 ],
			'selectors' => [ '{{WRAPPER}} {{CURRENT_ITEM}}.rf-showcase__card' => '--y: {{SIZE}}%;' ],
		] );

		$cards->add_control( 'step', [
			'label' => esc_html__( 'Shown On Step', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'min' => 0,
			'max' => self::MAX_STEPS,
			'default' => 0,
			'description' => esc_html__( '0: on every step. A number: only while that step is shown (it pops in).', 'refraction' ),
		] );

		$this->add_control( 'cards', [
			'label' => esc_html__( 'Cards', 'refraction' ) . ' (' . sprintf( /* translators: %d: maximum. */ esc_html__( 'up to %d', 'refraction' ), self::MAX_CARDS ) . ')',
			'type' => Controls_Manager::REPEATER,
			'fields' => $cards->get_controls(),
			'max_items' => self::MAX_CARDS,
			'prevent_empty' => false,
			'default' => [
				[ 'title' => '4.9', 'stars' => 5, 'icon' => [ 'value' => '', 'library' => '' ], 'x' => [ 'size' => 100 ], 'y' => [ 'size' => 8 ] ],
				[ 'title' => esc_html__( 'Booked!', 'refraction' ), 'text' => esc_html__( 'Full grooming, 10:00 AM', 'refraction' ), 'x' => [ 'size' => -12 ], 'y' => [ 'size' => 24 ] ],
				[ 'title' => esc_html__( '+250 pts', 'refraction' ), 'text' => esc_html__( 'Loyalty rewards', 'refraction' ), 'icon' => [ 'value' => 'fas fa-gift', 'library' => 'fa-solid' ], 'x' => [ 'size' => 108 ], 'y' => [ 'size' => 72 ] ],
			],
			'title_field' => '{{{ title }}}',
		] );

		$this->add_control( 'cards_float', [
			'label' => esc_html__( 'Cards Float', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'prefix_class' => 'rf-showcase-cards-float-',
		] );

		$this->add_control( 'cards_phone', [
			'label' => esc_html__( 'Cards On Phones', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'prefix_class' => 'rf-showcase-cards-phone-',
			'description' => esc_html__( 'Off: hidden on small screens, where they would cover the phone.', 'refraction' ),
		] );

		$this->end_controls_section();

		// ---------------------------------------------------------------- layout
		$this->start_controls_section( 'section_layout', [ 'label' => esc_html__( 'Layout', 'refraction' ) ] );

		$this->add_control( 'phone_side', [
			'label' => esc_html__( 'Phone On The', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'default' => 'right',
			'toggle' => false,
			'options' => [
				'left' => [ 'title' => esc_html__( 'Left', 'refraction' ), 'icon' => 'rficon-h-align-left' ],
				'right' => [ 'title' => esc_html__( 'Right', 'refraction' ), 'icon' => 'rficon-h-align-right' ],
			],
			'prefix_class' => 'rf-showcase-phone-',
		] );

		$this->add_control( 'stack_order', [
			'label' => esc_html__( 'On Small Screens', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'steps',
			'options' => [
				'steps' => esc_html__( 'Steps, then the phone', 'refraction' ),
				'phone' => esc_html__( 'The phone, then the steps', 'refraction' ),
			],
			'prefix_class' => 'rf-showcase-stack-',
		] );

		$this->add_responsive_control( 'phone_width', [
			'label' => esc_html__( 'Phone Width', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px', '%', 'vw' ],
			'range' => [ 'px' => [ 'min' => 160, 'max' => 900 ] ],
			'selectors' => [ '{{WRAPPER}} .rf-showcase' => '--rf-phone-w: {{SIZE}}{{UNIT}};' ],
		] );

		$this->add_responsive_control( 'steps_width', [
			'label' => esc_html__( 'Steps Width', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ '%', 'px' ],
			'range' => [ '%' => [ 'min' => 25, 'max' => 75 ] ],
			'selectors' => [ '{{WRAPPER}} .rf-showcase' => '--rf-steps-w: {{SIZE}}{{UNIT}};' ],
		] );

		$this->add_responsive_control( 'gap', [
			'label' => esc_html__( 'Space Between', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px', 'em' ],
			'range' => [ 'px' => [ 'max' => 200 ] ],
			'selectors' => [ '{{WRAPPER}} .rf-showcase' => 'column-gap: {{SIZE}}{{UNIT}};' ],
		] );

		$this->add_responsive_control( 'steps_gap', [
			'label' => esc_html__( 'Space Between Steps', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'max' => 40 ] ],
			'selectors' => [ '{{WRAPPER}} .rf-showcase__steps' => 'gap: {{SIZE}}{{UNIT}};' ],
		] );

		$this->end_controls_section();

		$this->register_style_controls();
	}

	private function register_style_controls() {
		$this->start_controls_section( 'section_style_steps', [
			'label' => esc_html__( 'Steps', 'refraction' ),
			'tab' => Controls_Manager::TAB_STYLE,
		] );

		$this->start_controls_tabs( 'step_tabs' );

		foreach ( [ 'normal' => esc_html__( 'Normal', 'refraction' ), 'active' => esc_html__( 'Current', 'refraction' ) ] as $state => $label ) {
			$sel = '{{WRAPPER}} .rf-showcase__step' . ( 'active' === $state ? '.is-active' : '' );

			$this->start_controls_tab( 'step_tab_' . $state, [ 'label' => $label ] );

			$this->add_control( 'step_bg_' . $state, [
				'label' => esc_html__( 'Background', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ $sel => 'background-color: {{VALUE}};' ],
			] );

			$this->add_control( 'step_border_' . $state, [
				'label' => esc_html__( 'Border Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ $sel => 'border-color: {{VALUE}};' ],
			] );

			$this->add_control( 'step_title_color_' . $state, [
				'label' => esc_html__( 'Title Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ $sel . ' .rf-showcase__title' => 'color: {{VALUE}};' ],
			] );

			$this->add_control( 'step_text_color_' . $state, [
				'label' => esc_html__( 'Description Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ $sel . ' .rf-showcase__text' => 'color: {{VALUE}};' ],
			] );

			$this->add_control( 'step_icon_color_' . $state, [
				'label' => esc_html__( 'Icon / Number Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ $sel . ' .rf-showcase__badge' => 'color: {{VALUE}}; fill: {{VALUE}};' ],
			] );

			$this->add_control( 'step_icon_bg_' . $state, [
				'label' => esc_html__( 'Icon / Number Background', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ $sel . ' .rf-showcase__badge' => 'background-color: {{VALUE}};' ],
			] );

			$this->end_controls_tab();
		}

		$this->end_controls_tabs();

		$this->add_group_control( Group_Control_Typography::get_type(), [
			'name' => 'step_title_typography',
			'label' => esc_html__( 'Title Typography', 'refraction' ),
			'selector' => '{{WRAPPER}} .rf-showcase__title',
			'separator' => 'before',
		] );

		$this->add_group_control( Group_Control_Typography::get_type(), [
			'name' => 'step_text_typography',
			'label' => esc_html__( 'Description Typography', 'refraction' ),
			'selector' => '{{WRAPPER}} .rf-showcase__text',
		] );

		$this->add_responsive_control( 'step_padding', [
			'label' => esc_html__( 'Padding', 'refraction' ),
			'type' => Controls_Manager::DIMENSIONS,
			'size_units' => [ 'px', 'em' ],
			'selectors' => [ '{{WRAPPER}} .rf-showcase__step' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
		] );

		$this->add_responsive_control( 'step_radius', [
			'label' => esc_html__( 'Corners', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'max' => 40 ] ],
			'selectors' => [ '{{WRAPPER}} .rf-showcase__step' => 'border-radius: {{SIZE}}{{UNIT}};' ],
		] );

		$this->add_control( 'progress_color', [
			'label' => esc_html__( 'Timing Line Color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-showcase' => '--rf-showcase-accent: {{VALUE}};' ],
			'condition' => [ 'autoplay' => 'yes' ],
		] );

		$this->add_control( 'label_color', [
			'label' => esc_html__( 'Text Above The Steps Color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-showcase__label' => 'color: {{VALUE}}; fill: {{VALUE}};' ],
			'separator' => 'before',
		] );

		$this->add_group_control( Group_Control_Typography::get_type(), [
			'name' => 'label_typography',
			'selector' => '{{WRAPPER}} .rf-showcase__label',
		] );

		$this->add_control( 'heading_color', [
			'label' => esc_html__( 'Heading Color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-showcase__heading' => 'color: {{VALUE}};' ],
			'separator' => 'before',
			'condition' => [ 'heading!' => '' ],
		] );

		$this->add_group_control( Group_Control_Typography::get_type(), [
			'name' => 'heading_typography',
			'selector' => '{{WRAPPER}} .rf-showcase__heading',
			'condition' => [ 'heading!' => '' ],
		] );

		$this->add_control( 'description_color', [
			'label' => esc_html__( 'Description Color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-showcase__description' => 'color: {{VALUE}};' ],
			'separator' => 'before',
			'condition' => [ 'description!' => '' ],
		] );

		$this->add_group_control( Group_Control_Typography::get_type(), [
			'name' => 'description_typography',
			'selector' => '{{WRAPPER}} .rf-showcase__description',
			'condition' => [ 'description!' => '' ],
		] );

		$this->add_responsive_control( 'intro_gap', [
			'label' => esc_html__( 'Space Under The Heading And Description', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px' ],
			'range' => [ 'px' => [ 'max' => 80 ] ],
			'selectors' => [ '{{WRAPPER}} .rf-showcase__intro' => 'gap: {{SIZE}}{{UNIT}};' ],
			'separator' => 'before',
		] );

		$this->end_controls_section();

		$this->start_controls_section( 'section_style_phone', [
			'label' => esc_html__( 'Phone', 'refraction' ),
			'tab' => Controls_Manager::TAB_STYLE,
		] );

		$this->add_control( 'screen_bg', [
			'label' => esc_html__( 'Screen Background', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-phone__screen' => 'background-color: {{VALUE}};' ],
		] );

		$this->add_group_control( Group_Control_Box_Shadow::get_type(), [
			'name' => 'phone_shadow',
			'selector' => '{{WRAPPER}} .rf-phone__body',
		] );

		$this->add_control( 'glow', [
			'label' => esc_html__( 'Glow Behind The Phone', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-showcase__device' => '--rf-showcase-glow: {{VALUE}};' ],
		] );

		$this->end_controls_section();

		$this->start_controls_section( 'section_style_cards', [
			'label' => esc_html__( 'Floating Cards', 'refraction' ),
			'tab' => Controls_Manager::TAB_STYLE,
		] );

		$card = '{{WRAPPER}} .rf-showcase__card';

		$this->add_control( 'card_bg', [ 'label' => esc_html__( 'Background', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $card => 'background-color: {{VALUE}};' ] ] );
		$this->add_control( 'card_title_color', [ 'label' => esc_html__( 'Title Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $card . ' .rf-showcase__card-title' => 'color: {{VALUE}};' ] ] );
		$this->add_control( 'card_text_color', [ 'label' => esc_html__( 'Text Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $card . ' .rf-showcase__card-text' => 'color: {{VALUE}};' ] ] );
		$this->add_control( 'card_icon_color', [ 'label' => esc_html__( 'Icon Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $card . ' .rf-showcase__card-icon' => 'color: {{VALUE}}; fill: {{VALUE}};' ] ] );
		$this->add_control( 'card_icon_bg', [ 'label' => esc_html__( 'Icon Background', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $card . ' .rf-showcase__card-icon' => 'background-color: {{VALUE}};' ] ] );
		$this->add_control( 'card_star_color', [ 'label' => esc_html__( 'Stars Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $card . ' .rf-showcase__stars' => 'color: {{VALUE}};' ] ] );

		$this->add_group_control( Group_Control_Typography::get_type(), [
			'name' => 'card_title_typography',
			'label' => esc_html__( 'Title Typography', 'refraction' ),
			'selector' => $card . ' .rf-showcase__card-title',
		] );

		$this->add_control( 'card_radius', [
			'label' => esc_html__( 'Corners', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'max' => 40 ] ],
			'selectors' => [ $card => 'border-radius: {{SIZE}}{{UNIT}};' ],
		] );

		$this->add_group_control( Group_Control_Box_Shadow::get_type(), [
			'name' => 'card_shadow',
			'selector' => $card,
		] );

		$this->end_controls_section();

		$this->start_controls_section( 'section_style_button', [
			'label' => esc_html__( 'Buttons', 'refraction' ),
			'tab' => Controls_Manager::TAB_STYLE,
			'conditions' => [
				'relation' => 'or',
				'terms' => [
					[ 'name' => 'button_text', 'operator' => '!==', 'value' => '' ],
					[ 'name' => 'button2_text', 'operator' => '!==', 'value' => '' ],
				],
			],
		] );

		$any = '{{WRAPPER}} .rf-showcase__button';
		$button = '{{WRAPPER}} .rf-showcase__button--primary';
		$second = '{{WRAPPER}} .rf-showcase__button--secondary';

		$this->add_responsive_control( 'buttons_gap', [
			'label' => esc_html__( 'Space Between The Buttons', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px' ],
			'range' => [ 'px' => [ 'max' => 60 ] ],
			'selectors' => [ '{{WRAPPER}} .rf-showcase__buttons' => 'gap: {{SIZE}}{{UNIT}};' ],
		] );

		$this->add_control( 'heading_button1', [
			'label' => esc_html__( 'First Button', 'refraction' ),
			'type' => Controls_Manager::HEADING,
			'separator' => 'before',
		] );

		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'button_typography', 'selector' => $button ] );
		$this->add_control( 'button_color', [ 'label' => esc_html__( 'Text Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $button => 'color: {{VALUE}}; fill: {{VALUE}};' ] ] );
		$this->add_control( 'button_bg', [ 'label' => esc_html__( 'Background', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $button => 'background-color: {{VALUE}};' ] ] );
		$this->add_control( 'button_hover_bg', [ 'label' => esc_html__( 'Hover Background', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $button . ':hover, ' . $button . ':focus-visible' => 'background-color: {{VALUE}};' ] ] );

		$this->add_control( 'heading_button2', [
			'label' => esc_html__( 'Second Button', 'refraction' ),
			'type' => Controls_Manager::HEADING,
			'separator' => 'before',
		] );

		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'button2_typography', 'selector' => $second ] );
		$this->add_control( 'button2_color', [ 'label' => esc_html__( 'Text Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $second => 'color: {{VALUE}}; fill: {{VALUE}};' ] ] );
		$this->add_control( 'button2_bg', [ 'label' => esc_html__( 'Background', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $second => 'background-color: {{VALUE}};' ] ] );
		$this->add_control( 'button2_border', [ 'label' => esc_html__( 'Border Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $second => 'border-color: {{VALUE}};' ] ] );
		$this->add_control( 'button2_hover_bg', [ 'label' => esc_html__( 'Hover Background', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $second . ':hover, ' . $second . ':focus-visible' => 'background-color: {{VALUE}};' ] ] );
		$this->add_control( 'button2_hover_color', [ 'label' => esc_html__( 'Hover Text Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $second . ':hover, ' . $second . ':focus-visible' => 'color: {{VALUE}}; fill: {{VALUE}};' ] ] );

		$this->add_control( 'heading_buttons_both', [
			'label' => esc_html__( 'Both Buttons', 'refraction' ),
			'type' => Controls_Manager::HEADING,
			'separator' => 'before',
		] );

		$this->add_responsive_control( 'button_padding', [
			'label' => esc_html__( 'Padding', 'refraction' ),
			'type' => Controls_Manager::DIMENSIONS,
			'size_units' => [ 'px', 'em' ],
			'selectors' => [ $any => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
		] );

		$this->add_control( 'button_radius', [
			'label' => esc_html__( 'Corners', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'max' => 40 ] ],
			'selectors' => [ $any => 'border-radius: {{SIZE}}{{UNIT}};' ],
		] );

		$this->end_controls_section();
	}

	// ---------------------------------------------------------------- render

	private function icon( $icon ): string {
		return ! empty( $icon['value'] ) ? (string) Icons_Manager::try_get_icon_html( $icon, [ 'aria-hidden' => 'true' ] ) : '';
	}

	private function status_bar( array $s ): string {
		if ( ! in_array( $s['status_bar'] ?? '', [ 'dark', 'light' ], true ) ) {
			return '';
		}

		return '<div class="rf-phone__status rf-phone__status--' . esc_attr( $s['status_bar'] ) . '" aria-hidden="true">'
			. '<span class="rf-phone__time">' . esc_html( (string) ( $s['status_time'] ?? '9:41' ) ) . '</span>'
			. '<span class="rf-phone__icons"><svg viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>'
			. '<svg viewBox="0 0 16 12"><path d="M8 11.5 5.6 9a3.4 3.4 0 0 1 4.8 0zM2.9 6.3a7.2 7.2 0 0 1 10.2 0l-1.4 1.4a5.2 5.2 0 0 0-7.4 0zM.2 3.6a11 11 0 0 1 15.6 0l-1.4 1.4a9 9 0 0 0-12.8 0z"/></svg>'
			. '<svg viewBox="0 0 27 12"><rect x=".5" y=".5" width="23" height="11" rx="3" fill="none" stroke="currentColor"/><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="24.5" y="4" width="2" height="4" rx="1"/></svg></span></div>';
	}

	protected function render() {
		$s = $this->get_settings_for_display();
		$steps = array_slice( array_values( array_filter( (array) ( $s['steps'] ?? [] ), 'is_array' ) ), 0, self::MAX_STEPS );

		if ( ! $steps ) {
			return;
		}

		$devices = self::devices();
		$device = isset( $devices[ $s['device'] ?? '' ] ) || 'custom' === ( $s['device'] ?? '' ) ? $s['device'] : 'island';
		$colors = self::colors();
		$color = $colors[ $s['color'] ?? 'black' ][1] ?? '#17181b';
		$id = 'rf-showcase-' . $this->get_id();
		$fit = in_array( $s['fit'] ?? '', [ 'cover', 'scroll', 'contain' ], true ) ? $s['fit'] : 'cover';
		$change = in_array( $s['change'] ?? '', [ 'slide', 'fade', 'zoom', 'none' ], true ) ? $s['change'] : 'slide';
		$numbers = in_array( $s['number_shows'] ?? '', [ 'active', 'all', 'none' ], true ) ? $s['number_shows'] : 'active';
		$config = [
			'tap' => 'yes' === ( $s['tap'] ?? '' ),
			'autoplay' => 'yes' === ( $s['autoplay'] ?? '' ),
			'interval' => max( 2, min( 20, (float) ( $s['interval']['size'] ?? 5 ) ) ),
		];

		$phone_style = '';

		if ( 'custom' !== $device ) {
			[ , $ratio, $radius, $bezel ] = $devices[ $device ];
			$phone_style = sprintf( '--rf-phone-ar:%s;--rf-phone-r:%s;--rf-phone-b:%s;', $ratio, $radius, $bezel ) . ( '' !== $color && 'custom' !== ( $s['color'] ?? '' ) && 'outline' !== $device ? '--rf-phone-color:' . $color . ';' : '' );
		}

		echo '<div class="rf-showcase rf-showcase--numbers-' . esc_attr( $numbers ) . '" id="' . esc_attr( $id ) . '" data-rf-showcase="' . esc_attr( wp_json_encode( $config ) ) . '" style="--rf-showcase-interval:' . esc_attr( $config['interval'] ) . 's">';

		// The steps.
		echo '<div class="rf-showcase__side">';

		$heading = trim( (string) ( $s['heading'] ?? '' ) );
		$description = trim( (string) ( $s['description'] ?? '' ) );
		$label = trim( (string) ( $s['label'] ?? '' ) );

		if ( '' !== $label || '' !== $heading || '' !== $description ) {
			echo '<div class="rf-showcase__intro">';

			if ( '' !== $label ) {
				echo '<p class="rf-showcase__label">' . $this->icon( $s['label_icon'] ?? [] ) . '<span>' . esc_html( $label ) . '</span></p>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Icon markup from the icons manager.
			}

			if ( '' !== $heading ) {
				$tag = Utils::validate_html_tag( $s['heading_tag'] ?? 'h2' );
				printf( '<%1$s class="rf-showcase__heading">%2$s</%1$s>', $tag, nl2br( esc_html( $heading ) ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Validated tag, escaped text.
			}

			if ( '' !== $description ) {
				echo '<p class="rf-showcase__description">' . nl2br( esc_html( $description ) ) . '</p>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped text.
			}

			echo '</div>';
		}

		echo '<div class="rf-showcase__steps" role="tablist" aria-orientation="vertical" aria-label="' . esc_attr__( 'Steps', 'refraction' ) . '">';

		foreach ( $steps as $i => $step ) {
			$active = 0 === $i;

			printf(
				'<button type="button" class="rf-showcase__step refraction-repeater-item-%1$s%2$s" role="tab" id="%3$s-tab-%4$d" aria-selected="%5$s" aria-controls="%3$s-screen" tabindex="%6$s" data-step="%4$d"><span class="rf-showcase__badge"><span class="rf-showcase__icon">%7$s</span><span class="rf-showcase__number">%8$d</span></span><span class="rf-showcase__words"><span class="rf-showcase__title">%9$s</span>%10$s</span><svg class="rf-showcase__chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg><span class="rf-showcase__timer" aria-hidden="true"></span></button>',
				esc_attr( $step['_id'] ?? '' ),
				$active ? ' is-active' : '',
				esc_attr( $id ),
				(int) $i,
				$active ? 'true' : 'false',
				$active ? '0' : '-1',
				$this->icon( $step['icon'] ?? [] ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Icon markup from the icons manager.
				(int) $i + 1,
				esc_html( (string) ( $step['title'] ?? '' ) ),
				'' !== trim( (string) ( $step['text'] ?? '' ) ) ? '<span class="rf-showcase__text">' . esc_html( $step['text'] ) . '</span>' : ''
			);
		}

		echo '</div>';

		$buttons = '';

		foreach ( [ [ 'button', 'primary' ], [ 'button2', 'secondary' ] ] as [ $key, $kind ] ) {
			if ( '' === trim( (string) ( $s[ $key . '_text' ] ?? '' ) ) ) {
				continue;
			}

			$this->add_render_attribute( $key, 'class', [ 'rf-showcase__button', 'rf-showcase__button--' . $kind ] );

			if ( ! empty( $s[ $key . '_link' ]['url'] ) ) {
				$this->add_link_attributes( $key, $s[ $key . '_link' ] );
			}

			$buttons .= '<a ' . $this->get_render_attribute_string( $key ) . '><span>' . esc_html( $s[ $key . '_text' ] ) . '</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></a>';
		}

		if ( '' !== $buttons ) {
			echo '<div class="rf-showcase__buttons">' . $buttons . '</div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Render attributes are escaped.
		}

		echo '</div>';

		// The device and its screens.
		echo '<div class="rf-showcase__device">';
		$cutout = 'custom' === $device ? 'none' : $devices[ $device ][4];

		echo '<div class="rf-phone rf-phone--' . esc_attr( $device ) . ' rf-phone--cut-' . esc_attr( $cutout ) . ' rf-phone--fit-' . esc_attr( $fit ) . ' rf-phone--change-' . esc_attr( $change ) . '" style="' . esc_attr( $phone_style ) . '">';
		echo '<div class="rf-phone__body">';

		if ( 'custom' === $device && ! empty( $s['frame_image']['url'] ) ) {
			echo '<img class="rf-phone__frame" src="' . esc_url( $s['frame_image']['url'] ) . '" alt="" aria-hidden="true" />';
		}

		echo '<span class="rf-phone__btn rf-phone__btn--a" aria-hidden="true"></span><span class="rf-phone__btn rf-phone__btn--b" aria-hidden="true"></span><span class="rf-phone__btn rf-phone__btn--c" aria-hidden="true"></span>';
		echo '<div class="rf-phone__screen" id="' . esc_attr( $id ) . '-screen" role="tabpanel" aria-labelledby="' . esc_attr( $id ) . '-tab-0" aria-live="polite">';
		echo '<div class="rf-phone__shots">';

		foreach ( $steps as $i => $step ) {
			$url = $step['screen']['url'] ?? '';
			$alt = (string) ( $step['title'] ?? '' );

			printf(
				'<div class="rf-phone__shot refraction-repeater-item-%1$s%2$s" data-step="%3$d"%4$s>%5$s</div>',
				esc_attr( $step['_id'] ?? '' ),
				0 === $i ? ' is-active' : '',
				(int) $i,
				0 === $i ? '' : ' aria-hidden="true"',
				'' !== $url
					? '<img src="' . esc_url( $url ) . '" alt="' . esc_attr( $alt ) . '"' . ( 0 === $i ? '' : ' loading="lazy"' ) . ' decoding="async" />'
					: '<span class="rf-phone__placeholder"><span class="rf-phone__placeholder-n">' . ( (int) $i + 1 ) . '</span><span>' . esc_html( $alt ) . '</span></span>'
			);
		}

		echo '</div>';
		echo $this->status_bar( $s ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts.
		echo '<span class="rf-phone__cutout" aria-hidden="true"></span><span class="rf-phone__bar" aria-hidden="true"></span>';
		echo '</div>';
		echo '<span class="rf-phone__home" aria-hidden="true"></span>';
		echo '</div>';

		// Floating cards.
		foreach ( array_slice( array_values( array_filter( (array) ( $s['cards'] ?? [] ), 'is_array' ) ), 0, self::MAX_CARDS ) as $card ) {
			$step = max( 0, min( self::MAX_STEPS, (int) ( $card['step'] ?? 0 ) ) );
			$stars = max( 0, min( 5, (int) ( $card['stars'] ?? 0 ) ) );
			$icon = $this->icon( $card['icon'] ?? [] );

			printf(
				'<div class="rf-showcase__card refraction-repeater-item-%1$s%2$s"%3$s>%4$s<span class="rf-showcase__card-words"><span class="rf-showcase__card-title">%5$s%6$s</span>%7$s</span></div>',
				esc_attr( $card['_id'] ?? '' ),
				$step && 1 !== $step ? ' is-hidden' : '',
				$step ? ' data-step="' . ( $step - 1 ) . '"' : '',
				'' !== $icon ? '<span class="rf-showcase__card-icon">' . $icon . '</span>' : '', // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				$stars ? '<span class="rf-showcase__stars" role="img" aria-label="' . esc_attr( sprintf( /* translators: %d: stars. */ _n( '%d star', '%d stars', $stars, 'refraction' ), $stars ) ) . '">' . str_repeat( '★', $stars ) . '</span>' : '',
				esc_html( (string) ( $card['title'] ?? '' ) ),
				'' !== trim( (string) ( $card['text'] ?? '' ) ) ? '<span class="rf-showcase__card-text">' . esc_html( $card['text'] ) . '</span>' : ''
			);
		}

		echo '</div></div></div>';
	}

	public function render_plain_content() {
		$s = $this->get_settings_for_display();

		foreach ( [ 'heading', 'description' ] as $key ) {
			if ( '' !== trim( (string) ( $s[ $key ] ?? '' ) ) ) {
				echo esc_html( $s[ $key ] ) . "\n";
			}
		}

		foreach ( array_slice( (array) ( $s['steps'] ?? [] ), 0, self::MAX_STEPS ) as $i => $step ) {
			echo esc_html( ( $i + 1 ) . '. ' . ( $step['title'] ?? '' ) . ( empty( $step['text'] ) ? '' : ': ' . $step['text'] ) ) . "\n";
		}
	}
}
