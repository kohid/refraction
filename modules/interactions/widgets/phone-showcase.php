<?php
namespace Refraction\Modules\Interactions\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Box_Shadow;
use Refraction\Group_Control_Typography;
use Refraction\Icons_Manager;
use Refraction\Includes\Widgets\Traits\Icon_Box_Style;
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
	const MAX_CARDS = 100;

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

	/**
	 * Highlight Words gives each of these parts its own words box: [ key => [ label, class name ] ]. Text outside them
	 * (the phone's screen, the step numbers) is never highlighted.
	 */
	public static function highlight_parts(): array {
		return [
			'label' => [ esc_html__( 'Label', 'refraction' ), 'rf-showcase__label' ],
			'heading' => [ esc_html__( 'Heading', 'refraction' ), 'rf-showcase__heading' ],
			'description' => [ esc_html__( 'Description', 'refraction' ), 'rf-showcase__description' ],
			'step_title' => [ esc_html__( 'Step Titles', 'refraction' ), 'rf-showcase__title' ],
			'step_text' => [ esc_html__( 'Step Texts', 'refraction' ), 'rf-showcase__text' ],
			'buttons' => [ esc_html__( 'Buttons', 'refraction' ), 'rf-showcase__buttons' ],
			'cards' => [ esc_html__( 'Floating Cards', 'refraction' ), 'rf-showcase__card' ],
		];
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

	/**
	 * device_args for a responsive control that writes another CSS variable on phone screens (breakpoints of 900px
	 * and less: Mobile, Mobile Landscape and the phone sizes), so a value set there wins over the phone layout's rule.
	 *
	 * @param array $selectors The selectors for those screens.
	 */
	private static function phone_device_args( array $selectors ): array {
		$args = [];

		foreach ( \Refraction\Plugin::$instance->breakpoints->get_active_breakpoints() as $name => $breakpoint ) {
			if ( 'max' === $breakpoint->get_direction() && $breakpoint->get_value() <= 900 ) {
				$args[ $name ] = [ 'selectors' => $selectors ];
			}
		}

		return $args;
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

		$this->add_button_look_controls( 'button' );

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

		$this->add_button_look_controls( 'button2' );

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
			$this->add_responsive_control( 'frame_' . $side, [
				'label' => $label . ' (%)',
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => 0, 'max' => 40, 'step' => 0.1 ] ],
				'default' => [ 'size' => in_array( $side, [ 'top', 'bottom' ], true ) ? 2 : 4.5 ],
				'selectors' => [ '{{WRAPPER}} .rf-phone--custom .rf-phone__screen' => $side . ': {{SIZE}}%;' ],
				'condition' => [ 'device' => 'custom' ],
			] );
		}

		$this->add_responsive_control( 'frame_radius', [
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
		$item = '{{WRAPPER}} {{CURRENT_ITEM}}.rf-showcase__card';

		$cards->start_controls_tabs( 'card_tabs' );
		$cards->start_controls_tab( 'card_tab_content', [ 'label' => esc_html__( 'Content', 'refraction' ) ] );

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

		// Where the card is, from the phone's edges, like Advanced > Position: a side across (left or right) and down (top or
		// bottom), each with an offset per screen size (the device icon), in px or % of the phone. In the editor's
		// preview a card can also be dragged into place (phone-showcase.js writes these settings for the screen size
		// shown). Cards placed before 0.84 by their middle (Across and Down, hidden now) stay there until moved.
		$card_item = '{{WRAPPER}} {{CURRENT_ITEM}}.rf-showcase__card';
		$units = [ 'px', '%', 'em', 'vw' ];

		$cards->add_control( 'card_h', [
			'label' => esc_html__( 'Horizontal Orientation', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'default' => 'start',
			'toggle' => false,
			'options' => [
				'start' => [ 'title' => esc_html__( 'From the left', 'refraction' ), 'icon' => 'rficon-h-align-left' ],
				'end' => [ 'title' => esc_html__( 'From the right', 'refraction' ), 'icon' => 'rficon-h-align-right' ],
			],
			'description' => esc_html__( 'Tip: in the editor, drag the card on the phone to place it (for the screen size shown).', 'refraction' ),
		] );

		$cards->add_responsive_control( 'card_offset_x', [
			'label' => esc_html__( 'Offset', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => $units,
			'range' => [ 'px' => [ 'min' => -500, 'max' => 900 ], '%' => [ 'min' => -100, 'max' => 200 ], 'em' => [ 'min' => -30, 'max' => 60 ], 'vw' => [ 'min' => -50, 'max' => 100 ] ],
			'selectors' => [ $card_item => '--rf-card-left: {{SIZE}}{{UNIT}}; --rf-card-right: auto; --rf-card-tx: 0%;' ],
			'condition' => [ 'card_h' => 'start' ],
		] );

		$cards->add_responsive_control( 'card_offset_x_end', [
			'label' => esc_html__( 'Offset', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => $units,
			'range' => [ 'px' => [ 'min' => -500, 'max' => 900 ], '%' => [ 'min' => -100, 'max' => 200 ], 'em' => [ 'min' => -30, 'max' => 60 ], 'vw' => [ 'min' => -50, 'max' => 100 ] ],
			'selectors' => [ $card_item => '--rf-card-left: auto; --rf-card-right: {{SIZE}}{{UNIT}}; --rf-card-tx: 0%;' ],
			'condition' => [ 'card_h' => 'end' ],
		] );

		$cards->add_control( 'card_v', [
			'label' => esc_html__( 'Vertical Orientation', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'default' => 'start',
			'toggle' => false,
			'options' => [
				'start' => [ 'title' => esc_html__( 'From the top', 'refraction' ), 'icon' => 'rficon-v-align-top' ],
				'end' => [ 'title' => esc_html__( 'From the bottom', 'refraction' ), 'icon' => 'rficon-v-align-bottom' ],
			],
		] );

		$cards->add_responsive_control( 'card_offset_y', [
			'label' => esc_html__( 'Offset', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => $units,
			'range' => [ 'px' => [ 'min' => -500, 'max' => 1500 ], '%' => [ 'min' => -50, 'max' => 150 ], 'em' => [ 'min' => -30, 'max' => 90 ], 'vw' => [ 'min' => -50, 'max' => 150 ] ],
			'selectors' => [ $card_item => '--rf-card-top: {{SIZE}}{{UNIT}}; --rf-card-bottom: auto; --rf-card-ty: 0%;' ],
			'condition' => [ 'card_v' => 'start' ],
		] );

		$cards->add_responsive_control( 'card_offset_y_end', [
			'label' => esc_html__( 'Offset', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => $units,
			'range' => [ 'px' => [ 'min' => -500, 'max' => 1500 ], '%' => [ 'min' => -50, 'max' => 150 ], 'em' => [ 'min' => -30, 'max' => 90 ], 'vw' => [ 'min' => -50, 'max' => 150 ] ],
			'selectors' => [ $card_item => '--rf-card-top: auto; --rf-card-bottom: {{SIZE}}{{UNIT}}; --rf-card-ty: 0%;' ],
			'condition' => [ 'card_v' => 'end' ],
		] );

		// Before 0.84: the card's middle in % of the phone. Hidden (rf-legacy-control), still printed, so cards placed
		// this way stay put until an offset above is set; new cards start there too.
		$cards->add_responsive_control( 'x', [
			'label' => esc_html__( 'Across', 'refraction' ) . ' (%)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => -60, 'max' => 160 ] ],
			'default' => [ 'size' => -20 ],
			'classes' => 'rf-legacy-control',
			'selectors' => [ $card_item => '--x: {{SIZE}}%;' ],
			'device_args' => self::phone_device_args( [ $card_item => '--x-phone: {{SIZE}}%;' ] ),
		] );

		$cards->add_responsive_control( 'y', [
			'label' => esc_html__( 'Down', 'refraction' ) . ' (%)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => -20, 'max' => 120 ] ],
			'default' => [ 'size' => 25 ],
			'classes' => 'rf-legacy-control',
			'selectors' => [ $card_item => '--y: {{SIZE}}%;' ],
		] );

		$cards->add_responsive_control( 'card_scale', [
			'label' => esc_html__( 'Size', 'refraction' ) . ' (%)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 40, 'max' => 160 ] ],
			'selectors' => [ $card_item => '--rf-card-scale: calc({{SIZE}} / 100);' ],
		] );

		$cards->add_responsive_control( 'card_show', [
			'label' => esc_html__( 'Show', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'options' => [
				'' => esc_html__( 'Yes', 'refraction' ),
				'none' => esc_html__( 'No, hide it here', 'refraction' ),
				'flex' => esc_html__( 'Yes, even where cards are hidden', 'refraction' ),
			],
			'description' => esc_html__( 'Per screen size: hide this card on phones, for example.', 'refraction' ),
			'selectors' => [ '{{WRAPPER}} .rf-showcase {{CURRENT_ITEM}}.rf-showcase__card' => 'display: {{VALUE}};' ],
		] );

		$cards->add_control( 'step', [
			'label' => esc_html__( 'Shown On Step', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'min' => 0,
			'max' => self::MAX_STEPS,
			'default' => 0,
			'description' => esc_html__( '0: on every step. A number: only while that step is shown (it pops in).', 'refraction' ),
		] );

		$cards->end_controls_tab();

		// This card's own look; empty fields keep Style > Floating Cards.
		$cards->start_controls_tab( 'card_tab_style', [ 'label' => esc_html__( 'Style', 'refraction' ) ] );
		$cards->add_control( 'card_bg', [ 'label' => esc_html__( 'Background', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $item => 'background-color: {{VALUE}};' ] ] );
		$cards->add_control( 'card_title_color', [ 'label' => esc_html__( 'Title Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $item . ' .rf-showcase__card-title' => 'color: {{VALUE}};' ] ] );
		$cards->add_control( 'card_text_color', [ 'label' => esc_html__( 'Text Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $item . ' .rf-showcase__card-text' => 'color: {{VALUE}};' ] ] );
		$cards->add_control( 'card_star_color', [ 'label' => esc_html__( 'Stars Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $item . ' .rf-showcase__stars' => 'color: {{VALUE}};' ] ] );
		$cards->add_control( 'card_icon_color', [ 'label' => esc_html__( 'Icon Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $item . ' .rf-showcase__card-icon' => 'color: {{VALUE}}; fill: {{VALUE}};' ], 'separator' => 'before' ] );
		$cards->add_control( 'card_icon_bg', [ 'label' => esc_html__( 'Icon Background', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $item . ' .rf-showcase__card-icon' => 'background-color: {{VALUE}};' ] ] );
		self::card_icon_controls( $cards, $item );
		$cards->add_control( 'card_radius', [ 'label' => esc_html__( 'Card Corners', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'max' => 40 ] ], 'selectors' => [ $item => 'border-radius: {{SIZE}}{{UNIT}};' ], 'separator' => 'before' ] );
		$cards->add_group_control( Group_Control_Box_Shadow::get_type(), [ 'name' => 'card_shadow', 'selector' => $item ] );
		$cards->end_controls_tab();
		$cards->end_controls_tabs();

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
		// Style tab: one section per part of the widget, in the order they show (Highlighted Text, from Highlight Words,
		// comes first); state tabs where a part changes (Normal / Hover / Active); inside, settings by kind (category()).
		$this->start_controls_section( 'section_style_label', [
			'label' => esc_html__( 'Pill', 'refraction' ),
			'tab' => Controls_Manager::TAB_STYLE,
		] );

		// Pill Label: the text above the steps as a rounded tinted label, its icon in a round badge.
		$label = '{{WRAPPER}}.rf-showcase-label-pill-yes .rf-showcase__label';
		$label_on = [ 'label_pill' => 'yes' ];

		$this->category( 'label_cat_text', esc_html__( 'Text', 'refraction' ), true );
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
		$this->category( 'label_cat_pill', esc_html__( 'Pill', 'refraction' ) );
		$this->add_control( 'label_pill', [
			'label' => esc_html__( 'Text Above The Steps As A Pill', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'prefix_class' => 'rf-showcase-label-pill-',
		] );
		$this->add_control( 'label_pill_caps', [ 'label' => esc_html__( 'Capital Letters, Spaced Out', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'default' => 'yes', 'prefix_class' => 'rf-showcase-label-caps-', 'condition' => $label_on ] );
		$this->add_control( 'label_pill_bg', [ 'label' => esc_html__( 'Pill Background', 'refraction' ), 'type' => Controls_Manager::COLOR, 'default' => '#DDF7EE', 'selectors' => [ $label => 'background-color: {{VALUE}};' ], 'condition' => $label_on ] );
		$this->add_control( 'label_pill_border', [ 'label' => esc_html__( 'Pill Border', 'refraction' ), 'type' => Controls_Manager::COLOR, 'default' => '#B8EBD9', 'selectors' => [ $label => 'border-color: {{VALUE}};' ], 'condition' => $label_on ] );
		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'label_pill_typography', 'label' => esc_html__( 'Pill Typography', 'refraction' ), 'selector' => '{{WRAPPER}}.rf-showcase-label-pill-yes .rf-showcase__label', 'condition' => $label_on ] );
		$this->category( 'label_cat_icon', esc_html__( 'Icon', 'refraction' ), false, $label_on );
		$this->add_control( 'label_pill_badge_bg', [ 'label' => esc_html__( 'Icon Badge Background', 'refraction' ), 'type' => Controls_Manager::COLOR, 'default' => '#1FCB97', 'selectors' => [ $label . ' .rf-showcase__label-badge' => 'background-color: {{VALUE}};' ], 'condition' => $label_on ] );
		$this->add_control( 'label_pill_badge_color', [ 'label' => esc_html__( 'Icon Badge Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'default' => '#06372A', 'selectors' => [ $label . ' .rf-showcase__label-badge' => 'color: {{VALUE}}; fill: {{VALUE}};' ], 'condition' => $label_on ] );
		Icon_Box_Style::controls( $this, 'label_pill_icon', $label . ' .rf-showcase__label-badge', [ 'colors' => false, 'condition' => $label_on ] );
		$this->end_controls_section();

		$this->start_controls_section( 'section_style_heading', [
			'label' => esc_html__( 'Heading', 'refraction' ),
			'tab' => Controls_Manager::TAB_STYLE,
			'condition' => [ 'heading!' => '' ],
		] );

		$this->category( 'heading_cat_text', esc_html__( 'Text', 'refraction' ), true );
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
		$this->end_controls_section();

		$this->start_controls_section( 'section_style_description', [
			'label' => esc_html__( 'Description', 'refraction' ),
			'tab' => Controls_Manager::TAB_STYLE,
		] );

		$this->category( 'description_cat_text', esc_html__( 'Text', 'refraction' ), true, [ 'description!' => '' ] );
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
		$this->category( 'description_cat_box', esc_html__( 'Spacing', 'refraction' ) );
		$this->add_responsive_control( 'intro_gap', [
			'label' => esc_html__( 'Space Under The Heading And Description', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px' ],
			'range' => [ 'px' => [ 'max' => 80 ] ],
			'selectors' => [ '{{WRAPPER}} .rf-showcase__intro' => 'gap: {{SIZE}}{{UNIT}};' ],
			'separator' => 'before',
		] );
		$this->end_controls_section();

		$this->start_controls_section( 'section_style_steps', [
			'label' => esc_html__( 'Steps', 'refraction' ),
			'tab' => Controls_Manager::TAB_STYLE,
		] );

		$this->start_controls_tabs( 'step_tabs' );

		// Normal, Hover (pointing at a step) and Active (the step shown). Typography, box and icon sizes in Normal.
		foreach ( [ 'normal' => esc_html__( 'Normal', 'refraction' ), 'hover' => esc_html__( 'Hover', 'refraction' ), 'active' => esc_html__( 'Active', 'refraction' ) ] as $state => $label ) {
			$sel = '{{WRAPPER}} .rf-showcase__step' . [ 'normal' => '', 'hover' => ':hover', 'active' => '.is-active' ][ $state ];

			$this->start_controls_tab( 'step_tab_' . $state, [ 'label' => $label ] );

			$this->category( 'step_cat_colors_' . $state, esc_html__( 'Colors', 'refraction' ), true );

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

			if ( 'normal' === $state ) {
				$this->category( 'step_cat_text', esc_html__( 'Text', 'refraction' ) );
				$this->add_group_control( Group_Control_Typography::get_type(), [
					'name' => 'step_title_typography',
					'label' => esc_html__( 'Title Typography', 'refraction' ),
					'selector' => '{{WRAPPER}} .rf-showcase__title',
				] );
				$this->add_group_control( Group_Control_Typography::get_type(), [
					'name' => 'step_text_typography',
					'label' => esc_html__( 'Description Typography', 'refraction' ),
					'selector' => '{{WRAPPER}} .rf-showcase__text',
				] );
				$this->category( 'step_cat_box', esc_html__( 'Box', 'refraction' ) );
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
				$this->category( 'step_cat_icon', esc_html__( 'Icon', 'refraction' ) );
				Icon_Box_Style::controls( $this, 'step_icon_box', '{{WRAPPER}} .rf-showcase__badge', [ 'colors' => false ] );
				$this->add_responsive_control( 'step_number_size', [
					'label' => esc_html__( 'Number Size', 'refraction' ),
					'type' => Controls_Manager::SLIDER,
					'size_units' => [ 'px', 'em' ],
					'range' => [ 'px' => [ 'min' => 8, 'max' => 48 ] ],
					'selectors' => [ '{{WRAPPER}} .rf-showcase__number' => 'font-size: {{SIZE}}{{UNIT}};' ],
				] );
			}

			$this->end_controls_tab();
		}

		$this->end_controls_tabs();

		// The progress bar under the current step while the steps play on their own.
		$timer = '{{WRAPPER}} .rf-showcase__timer';
		$playing = [ 'autoplay' => 'yes' ];
		$shown = [ 'autoplay' => 'yes', 'progress_show' => 'yes' ];

		$this->add_control( 'heading_progress', [ 'label' => esc_html__( 'Progress Bar', 'refraction' ), 'type' => Controls_Manager::HEADING, 'separator' => 'before', 'condition' => $playing ] );
		$this->add_control( 'progress_show', [
			'label' => esc_html__( 'Show Progress Bar', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'description' => esc_html__( 'The line that times the current step while the steps play on their own.', 'refraction' ),
			'prefix_class' => 'rf-showcase-progress-',
			'condition' => $playing,
		] );
		$this->add_control( 'progress_color', [ 'label' => esc_html__( 'Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $timer => 'background: {{VALUE}};' ], 'condition' => $shown ] );
		$this->add_responsive_control( 'progress_height', [ 'label' => esc_html__( 'Height', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'size_units' => [ 'px' ], 'range' => [ 'px' => [ 'min' => 1, 'max' => 12 ] ], 'selectors' => [ $timer => 'height: {{SIZE}}{{UNIT}};' ], 'condition' => $shown ] );
		$this->add_control( 'progress_radius', [ 'label' => esc_html__( 'Corners', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'size_units' => [ 'px' ], 'range' => [ 'px' => [ 'max' => 12 ] ], 'selectors' => [ $timer => 'border-radius: {{SIZE}}{{UNIT}};' ], 'condition' => $shown ] );
		$this->add_responsive_control( 'progress_inset', [ 'label' => esc_html__( 'Space At The Sides', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'size_units' => [ 'px', '%' ], 'range' => [ 'px' => [ 'max' => 60 ], '%' => [ 'max' => 20 ] ], 'selectors' => [ $timer => 'left: {{SIZE}}{{UNIT}}; width: calc(100% - 2 * {{SIZE}}{{UNIT}});' ], 'condition' => $shown ] );
		$this->add_responsive_control( 'progress_offset', [ 'label' => esc_html__( 'Space From The Edge', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'size_units' => [ 'px' ], 'range' => [ 'px' => [ 'min' => -10, 'max' => 30 ] ], 'selectors' => [ $timer => '--rf-showcase-timer-gap: {{SIZE}}{{UNIT}};' ], 'condition' => $shown ] );
		$this->add_control( 'progress_position', [
			'label' => esc_html__( 'Position', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'options' => [
				'top' => [ 'title' => esc_html__( 'Top', 'refraction' ), 'icon' => 'rficon-v-align-top' ],
				'bottom' => [ 'title' => esc_html__( 'Bottom', 'refraction' ), 'icon' => 'rficon-v-align-bottom' ],
			],
			'default' => 'bottom',
			'toggle' => false,
			'prefix_class' => 'rf-showcase-progress-at-',
			'condition' => $shown,
		] );
		$this->end_controls_section();

		$this->start_controls_section( 'section_style_phone', [
			'label' => esc_html__( 'Phone', 'refraction' ),
			'tab' => Controls_Manager::TAB_STYLE,
		] );

		$this->category( 'phone_cat_colors', esc_html__( 'Colors', 'refraction' ), true );
		$this->add_control( 'screen_bg', [
			'label' => esc_html__( 'Screen Background', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-phone__screen' => 'background-color: {{VALUE}};' ],
		] );
		$this->add_control( 'glow', [
			'label' => esc_html__( 'Glow Behind The Phone', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-showcase__device' => '--rf-showcase-glow: {{VALUE}};' ],
		] );
		$this->add_responsive_control( 'glow_size', [
			'label' => esc_html__( 'Glow Size', 'refraction' ) . ' (%)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 100 ] ],
			'selectors' => [ '{{WRAPPER}} .rf-showcase__device' => '--rf-showcase-glow-size: {{SIZE}}%;' ],
		] );
		$this->category( 'phone_cat_box', esc_html__( 'Box', 'refraction' ) );
		$this->add_group_control( Group_Control_Box_Shadow::get_type(), [
			'name' => 'phone_shadow',
			'selector' => '{{WRAPPER}} .rf-phone__body',
		] );
		$this->add_responsive_control( 'screen_padding', [
			'label' => esc_html__( 'Screen Content Padding', 'refraction' ),
			'type' => Controls_Manager::DIMENSIONS,
			'size_units' => [ 'px', '%' ],
			'selectors' => [ '{{WRAPPER}} .rf-phone__shot' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}}; box-sizing: border-box;' ],
			'separator' => 'before',
		] );
		// Per screen size (device icon): where the phone sits, its size and tilt, without changing the layout around it.
		$this->category( 'phone_place_heading', esc_html__( 'Place, Size And Tilt (per screen size)', 'refraction' ) );
		$this->add_responsive_control( 'phone_scale', [
			'label' => esc_html__( 'Scale', 'refraction' ) . ' (%)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 30, 'max' => 160 ] ],
			'selectors' => [ '{{WRAPPER}} .rf-showcase__device' => '--rf-phone-scale: calc({{SIZE}} / 100);' ],
		] );
		$this->add_responsive_control( 'phone_offset_x', [
			'label' => esc_html__( 'Move Left Or Right', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px', '%' ],
			'range' => [ 'px' => [ 'min' => -300, 'max' => 300 ], '%' => [ 'min' => -100, 'max' => 100 ] ],
			'selectors' => [ '{{WRAPPER}} .rf-showcase__device' => '--rf-phone-dx: {{SIZE}}{{UNIT}};' ],
		] );
		$this->add_responsive_control( 'phone_offset_y', [
			'label' => esc_html__( 'Move Up Or Down', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px', '%' ],
			'range' => [ 'px' => [ 'min' => -300, 'max' => 300 ], '%' => [ 'min' => -100, 'max' => 100 ] ],
			'selectors' => [ '{{WRAPPER}} .rf-showcase__device' => '--rf-phone-dy: {{SIZE}}{{UNIT}};' ],
		] );
		$this->add_responsive_control( 'phone_rotate', [
			'label' => esc_html__( 'Tilt', 'refraction' ) . ' (deg)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => -45, 'max' => 45 ] ],
			'selectors' => [ '{{WRAPPER}} .rf-showcase__device' => '--rf-phone-rotate: {{SIZE}}deg;' ],
		] );
		$this->add_responsive_control( 'phone_align', [
			'label' => esc_html__( 'Align', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'options' => [
				'start' => [ 'title' => esc_html__( 'Start', 'refraction' ), 'icon' => 'rficon-h-align-left' ],
				'center' => [ 'title' => esc_html__( 'Center', 'refraction' ), 'icon' => 'rficon-h-align-center' ],
				'end' => [ 'title' => esc_html__( 'End', 'refraction' ), 'icon' => 'rficon-h-align-right' ],
			],
			'selectors' => [ '{{WRAPPER}} .rf-showcase__device' => 'justify-self: {{VALUE}};' ],
		] );
		$this->end_controls_section();

		$this->start_controls_section( 'section_style_cards', [
			'label' => esc_html__( 'Floating Cards', 'refraction' ),
			'tab' => Controls_Manager::TAB_STYLE,
		] );

		$card = '{{WRAPPER}} .rf-showcase__card';

		$this->start_controls_tabs( 'card_state_tabs' );
		$this->start_controls_tab( 'card_state_normal', [ 'label' => esc_html__( 'Normal', 'refraction' ) ] );
		$this->category( 'card_cat_colors', esc_html__( 'Colors', 'refraction' ), true );
		$this->add_control( 'card_bg', [ 'label' => esc_html__( 'Background', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $card => 'background-color: {{VALUE}};' ] ] );
		$this->add_control( 'card_title_color', [ 'label' => esc_html__( 'Title Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $card . ' .rf-showcase__card-title' => 'color: {{VALUE}};' ] ] );
		$this->add_control( 'card_text_color', [ 'label' => esc_html__( 'Text Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $card . ' .rf-showcase__card-text' => 'color: {{VALUE}};' ] ] );
		$this->add_control( 'card_icon_color', [ 'label' => esc_html__( 'Icon Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $card . ' .rf-showcase__card-icon' => 'color: {{VALUE}}; fill: {{VALUE}};' ] ] );
		$this->add_control( 'card_icon_bg', [ 'label' => esc_html__( 'Icon Background', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $card . ' .rf-showcase__card-icon' => 'background-color: {{VALUE}};' ] ] );
		$this->add_control( 'card_star_color', [ 'label' => esc_html__( 'Stars Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $card . ' .rf-showcase__stars' => 'color: {{VALUE}};' ] ] );
		$this->category( 'card_cat_text', esc_html__( 'Text', 'refraction' ) );
		$this->add_group_control( Group_Control_Typography::get_type(), [
			'name' => 'card_title_typography',
			'label' => esc_html__( 'Title Typography', 'refraction' ),
			'selector' => $card . ' .rf-showcase__card-title',
		] );
		$this->add_group_control( Group_Control_Typography::get_type(), [
			'name' => 'card_text_typography',
			'label' => esc_html__( 'Text Typography', 'refraction' ),
			'selector' => $card . ' .rf-showcase__card-text',
		] );
		$this->category( 'card_cat_box', esc_html__( 'Box', 'refraction' ) );
		$this->add_responsive_control( 'card_radius', [
			'label' => esc_html__( 'Corners', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'max' => 40 ] ],
			'selectors' => [ $card => 'border-radius: {{SIZE}}{{UNIT}};' ],
		] );
		$this->add_responsive_control( 'card_padding', [
			'label' => esc_html__( 'Padding', 'refraction' ),
			'type' => Controls_Manager::DIMENSIONS,
			'size_units' => [ 'px', 'em' ],
			'selectors' => [ $card => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
		] );
		$this->add_responsive_control( 'card_gap', [
			'label' => esc_html__( 'Space Between Icon And Text', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'max' => 40 ] ],
			'selectors' => [ $card => 'gap: {{SIZE}}{{UNIT}};' ],
		] );
		$this->add_responsive_control( 'card_max_width', [
			'label' => esc_html__( 'Max Width', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px', '%' ],
			'range' => [ 'px' => [ 'min' => 80, 'max' => 500 ], '%' => [ 'min' => 20, 'max' => 150 ] ],
			'description' => esc_html__( '% of the phone\'s width. Longer text wraps.', 'refraction' ),
			'selectors' => [ $card => 'max-width: {{SIZE}}{{UNIT}}; white-space: normal;' ],
		] );
		$this->add_responsive_control( 'cards_scale', [
			'label' => esc_html__( 'Size Of All Cards', 'refraction' ) . ' (%)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 40, 'max' => 160 ] ],
			'selectors' => [ '{{WRAPPER}} .rf-showcase' => '--rf-cards-scale: calc({{SIZE}} / 100);' ],
		] );
		$this->add_group_control( Group_Control_Box_Shadow::get_type(), [
			'name' => 'card_shadow',
			'selector' => $card,
		] );
		$this->category( 'card_cat_icon', esc_html__( 'Icon', 'refraction' ) );
		self::card_icon_controls( $this, $card );
		$this->end_controls_tab();
		$this->start_controls_tab( 'card_state_hover', [ 'label' => esc_html__( 'Hover', 'refraction' ) ] );
		$this->category( 'card_cat_colors_hover', esc_html__( 'Colors', 'refraction' ), true );
		$this->add_control( 'card_bg_hover', [ 'label' => esc_html__( 'Background', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $card . ':hover' => 'background-color: {{VALUE}};' ] ] );
		$this->add_control( 'card_title_color_hover', [ 'label' => esc_html__( 'Title Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $card . ':hover .rf-showcase__card-title' => 'color: {{VALUE}};' ] ] );
		$this->add_control( 'card_icon_bg_hover', [ 'label' => esc_html__( 'Icon Background', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $card . ':hover .rf-showcase__card-icon' => 'background-color: {{VALUE}};' ] ] );
		$this->category( 'card_cat_box_hover', esc_html__( 'Box', 'refraction' ) );
		$this->add_group_control( Group_Control_Box_Shadow::get_type(), [ 'name' => 'card_shadow_hover', 'selector' => $card . ':hover' ] );
		$this->end_controls_tab();
		$this->end_controls_tabs();

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
		$this->start_controls_tabs( 'button_state_tabs' );
		$this->start_controls_tab( 'button_state_normal', [ 'label' => esc_html__( 'Normal', 'refraction' ) ] );
		$this->add_control( 'heading_button1', [
			'label' => esc_html__( 'First Button', 'refraction' ),
			'type' => Controls_Manager::HEADING,
		] );
		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'button_typography', 'selector' => $button ] );
		$this->add_control( 'button_color', [ 'label' => esc_html__( 'Text Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $button => 'color: {{VALUE}}; fill: {{VALUE}};' ] ] );
		$this->add_control( 'button_bg', [ 'label' => esc_html__( 'Background', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $button => 'background-color: {{VALUE}};' ] ] );
		$this->add_control( 'button_border', [
			'label' => esc_html__( 'First Button Border Color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ $button => 'border-color: {{VALUE}};' ],
		] );
		$this->add_control( 'heading_button2', [
			'label' => esc_html__( 'Second Button', 'refraction' ),
			'type' => Controls_Manager::HEADING,
			'separator' => 'before',
		] );
		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'button2_typography', 'selector' => $second ] );
		$this->add_control( 'button2_color', [ 'label' => esc_html__( 'Text Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $second => 'color: {{VALUE}}; fill: {{VALUE}};' ] ] );
		$this->add_control( 'button2_bg', [ 'label' => esc_html__( 'Background', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $second => 'background-color: {{VALUE}};' ] ] );
		$this->add_control( 'button2_border', [ 'label' => esc_html__( 'Border Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $second => 'border-color: {{VALUE}};' ] ] );
		$this->add_control( 'heading_buttons_both', [
			'label' => esc_html__( 'Both Buttons', 'refraction' ),
			'type' => Controls_Manager::HEADING,
			'separator' => 'before',
		] );
		$this->add_control( 'button_border_width', [
			'label' => esc_html__( 'Border Width', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'max' => 6 ] ],
			'selectors' => [ $any => 'border-width: {{SIZE}}{{UNIT}};' ],
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
		$this->add_group_control( Group_Control_Box_Shadow::get_type(), [ 'name' => 'button_shadow', 'selector' => $any ] );
		$this->add_group_control( Group_Control_Typography::get_type(), [
			'name' => 'button_small_typography',
			'label' => esc_html__( 'Small Text Typography', 'refraction' ),
			'selector' => '{{WRAPPER}} .rf-showcase__button-small',
		] );
		$this->category( 'button_cat_icon', esc_html__( 'Icon', 'refraction' ) );
		$this->add_responsive_control( 'button_icon_size', [
			'label' => esc_html__( 'Icon Size', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px', 'em' ],
			'range' => [ 'px' => [ 'min' => 10, 'max' => 60 ] ],
			'selectors' => [ $any => '--rf-showcase-button-icon: {{SIZE}}{{UNIT}};' ],
		] );
		$this->add_responsive_control( 'button_icon_gap', [
			'label' => esc_html__( 'Space Between Icon And Text', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px' ],
			'range' => [ 'px' => [ 'max' => 30 ] ],
			'selectors' => [ $any => 'gap: {{SIZE}}{{UNIT}};' ],
		] );
		Icon_Box_Style::controls( $this, 'button_icon_box', $any . ' .rf-showcase__button-icon', [ 'size' => false ] );
		$this->end_controls_tab();
		$this->start_controls_tab( 'button_state_hover', [ 'label' => esc_html__( 'Hover', 'refraction' ) ] );
		$this->category( 'button_cat_first_hover', esc_html__( 'First Button', 'refraction' ), true );
		$this->add_control( 'button_hover_color', [ 'label' => esc_html__( 'Hover Text Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $button . ':hover, ' . $button . ':focus-visible' => 'color: {{VALUE}}; fill: {{VALUE}};' ] ] );
		$this->add_control( 'button_hover_bg', [ 'label' => esc_html__( 'Hover Background', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $button . ':hover, ' . $button . ':focus-visible' => 'background-color: {{VALUE}};' ] ] );
		$this->add_control( 'button_hover_border', [ 'label' => esc_html__( 'Hover Border Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $button . ':hover, ' . $button . ':focus-visible' => 'border-color: {{VALUE}};' ] ] );
		$this->add_control( 'button_hover_animation', [ 'label' => esc_html__( 'Hover Animation', 'refraction' ), 'type' => Controls_Manager::HOVER_ANIMATION ] );
		$this->category( 'button_cat_second_hover', esc_html__( 'Second Button', 'refraction' ) );
		$this->add_control( 'button2_hover_color', [ 'label' => esc_html__( 'Hover Text Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $second . ':hover, ' . $second . ':focus-visible' => 'color: {{VALUE}}; fill: {{VALUE}};' ] ] );
		$this->add_control( 'button2_hover_bg', [ 'label' => esc_html__( 'Hover Background', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $second . ':hover, ' . $second . ':focus-visible' => 'background-color: {{VALUE}};' ] ] );
		$this->add_control( 'button2_hover_border', [ 'label' => esc_html__( 'Hover Border Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $second . ':hover, ' . $second . ':focus-visible' => 'border-color: {{VALUE}};' ] ] );
		$this->add_control( 'button2_hover_animation', [ 'label' => esc_html__( 'Hover Animation', 'refraction' ), 'type' => Controls_Manager::HOVER_ANIMATION ] );
		$this->category( 'button_cat_both_hover', esc_html__( 'Both Buttons', 'refraction' ) );
		$this->add_control( 'button_hover_lift', [
			'label' => esc_html__( 'Lift On Hover', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'description' => esc_html__( 'The button rises a little with a soft shadow. A button with its own Hover Animation uses that instead.', 'refraction' ),
			'prefix_class' => 'rf-showcase-lift-',
		] );
		$this->add_group_control( Group_Control_Box_Shadow::get_type(), [ 'name' => 'button_hover_shadow', 'label' => esc_html__( 'Hover Shadow', 'refraction' ), 'selector' => $any . ':hover, ' . $any . ':focus-visible' ] );
		$this->add_control( 'button_transition', [
			'label' => esc_html__( 'Hover Transition (s)', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 2, 'step' => 0.05 ] ],
			'selectors' => [ $any => '--rf-showcase-btn-t: {{SIZE}}s;' ],
		] );
		$this->end_controls_tab();
		$this->end_controls_tabs();

		$this->end_controls_section();
	}

	/**
	 * A small heading that names a kind of settings (Colors, Text, Box, Icon...) inside a section or a state tab.
	 *
	 * @param string $id    Control id.
	 * @param string $label Its name.
	 * @param bool   $first The first in its group (no line above).
	 * @param array  $condition When it shows.
	 */
	private function category( string $id, string $label, bool $first = false, array $condition = [] ): void {
		$this->add_control( $id, [ 'label' => $label, 'type' => Controls_Manager::HEADING, 'separator' => $first ? 'none' : 'before', 'classes' => 'rf-panel-category' ] + ( $condition ? [ 'condition' => $condition ] : [] ) );
	}

	/**
	 * A button's look (Content > Steps): text with an icon and a small line above it (a store badge: "GET IT ON" over
	 * "Google Play"), or an image only (the text is then its alt text).
	 */
	/** Icon Size, Icon Padding and Icon Corners of the floating cards (for all of them, or one in the repeater). */
	private static function card_icon_controls( $stack, string $card ): void {
		$stack->add_responsive_control( 'card_icon_size', [ 'label' => esc_html__( 'Icon Size', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'size_units' => [ 'px', 'em' ], 'range' => [ 'px' => [ 'min' => 8, 'max' => 64 ] ], 'selectors' => [ $card . ' .rf-showcase__card-icon' => '--rf-card-icon-size: {{SIZE}}{{UNIT}};' ] ] );
		$stack->add_responsive_control( 'card_icon_padding', [ 'label' => esc_html__( 'Icon Padding', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'size_units' => [ 'px', 'em' ], 'range' => [ 'px' => [ 'max' => 40 ] ], 'selectors' => [ $card . ' .rf-showcase__card-icon' => '--rf-card-icon-pad: {{SIZE}}{{UNIT}};' ] ] );
		$stack->add_control( 'card_icon_radius', [ 'label' => esc_html__( 'Icon Corners', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'size_units' => [ 'px', '%' ], 'range' => [ 'px' => [ 'max' => 40 ], '%' => [ 'max' => 50 ] ], 'selectors' => [ $card . ' .rf-showcase__card-icon' => 'border-radius: {{SIZE}}{{UNIT}};' ] ] );
	}

	private function add_button_look_controls( string $key ): void {
		$on = [ $key . '_text!' => '' ];
		$text_look = array_merge( $on, [ $key . '_look!' => 'image' ] );

		$this->add_control( $key . '_look', [
			'label' => esc_html__( 'Show', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'options' => [
				'text' => [ 'title' => esc_html__( 'Text and icon', 'refraction' ), 'icon' => 'rficon-t-letter' ],
				'image' => [ 'title' => esc_html__( 'Image only', 'refraction' ), 'icon' => 'rficon-image' ],
			],
			'default' => 'text',
			'toggle' => false,
			'condition' => $on,
		] );

		$this->add_control( $key . '_image', [
			'label' => esc_html__( 'Button Image', 'refraction' ),
			'type' => Controls_Manager::MEDIA,
			'description' => esc_html__( 'For example an app store badge. The button text becomes its alt text.', 'refraction' ),
			'condition' => array_merge( $on, [ $key . '_look' => 'image' ] ),
		] );

		$this->add_responsive_control( $key . '_image_height', [
			'label' => esc_html__( 'Image Height', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px' ],
			'range' => [ 'px' => [ 'min' => 20, 'max' => 120 ] ],
			'selectors' => [ '{{WRAPPER}} .rf-showcase__button--' . ( 'button' === $key ? 'primary' : 'secondary' ) . ' .rf-showcase__button-image' => 'height: {{SIZE}}{{UNIT}};' ],
			'condition' => array_merge( $on, [ $key . '_look' => 'image' ] ),
		] );

		$this->add_control( $key . '_small', [
			'label' => esc_html__( 'Small Text Above', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'placeholder' => esc_html__( 'GET IT ON', 'refraction' ),
			'condition' => $text_look,
		] );

		$this->add_control( $key . '_icon', [
			'label' => esc_html__( 'Icon', 'refraction' ),
			'type' => Controls_Manager::ICONS,
			'skin' => 'inline',
			'label_block' => false,
			'description' => esc_html__( 'Empty: an arrow after the text. Brands icons include Google Play and Apple.', 'refraction' ),
			'condition' => $text_look,
		] );

		$this->add_control( $key . '_icon_position', [
			'label' => esc_html__( 'Icon Position', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'options' => [
				'before' => [ 'title' => esc_html__( 'Before', 'refraction' ), 'icon' => 'rficon-h-align-left' ],
				'after' => [ 'title' => esc_html__( 'After', 'refraction' ), 'icon' => 'rficon-h-align-right' ],
			],
			// Empty: a chosen icon goes before the text and the default arrow after it (as before this option existed).
			'default' => '',
			'description' => esc_html__( 'Where the icon sits: before or after the text. Not set: a chosen icon before the text, the default arrow after it.', 'refraction' ),
			'condition' => $text_look,
		] );
	}

	/** One button's markup, '' without text. */
	private function button_html( array $s, string $key, string $kind ): string {
		$text = trim( (string) ( $s[ $key . '_text' ] ?? '' ) );

		if ( '' === $text ) {
			return '';
		}

		$image = 'image' === ( $s[ $key . '_look' ] ?? '' ) ? (string) ( $s[ $key . '_image' ]['url'] ?? '' ) : '';
		$classes = [ 'rf-showcase__button', 'rf-showcase__button--' . $kind ];

		if ( ! empty( $s[ $key . '_hover_animation' ] ) ) {
			$classes[] = 'refraction-animation-' . sanitize_html_class( $s[ $key . '_hover_animation' ] );
		}

		if ( '' !== $image ) {
			$classes[] = 'rf-showcase__button--image';
		}

		$this->add_render_attribute( $key, 'class', $classes );

		if ( ! empty( $s[ $key . '_link' ]['url'] ) ) {
			$this->add_link_attributes( $key, $s[ $key . '_link' ] );
		}

		if ( '' !== $image ) {
			$inner = '<img class="rf-showcase__button-image" src="' . esc_url( $image ) . '" alt="' . esc_attr( $text ) . '" />';
		} else {
			$icon = $this->icon( $s[ $key . '_icon' ] ?? [] );
			$small = trim( (string) ( $s[ $key . '_small' ] ?? '' ) );
			$words = '' !== $small
				? '<span class="rf-showcase__button-words"><span class="rf-showcase__button-small">' . esc_html( $small ) . '</span><span class="rf-showcase__button-text">' . esc_html( $text ) . '</span></span>'
				: '<span>' . esc_html( $text ) . '</span>';

			$position = (string) ( $s[ $key . '_icon_position' ] ?? '' );

			if ( '' === $icon ) {
				$icon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>';
				$after = 'before' !== $position;
			} else {
				$icon = '<span class="rf-showcase__button-icon">' . $icon . '</span>';
				$after = 'after' === $position;
			}

			$inner = $after ? $words . $icon : $icon . $words;
		}

		return '<a ' . $this->get_render_attribute_string( $key ) . '>' . $inner . '</a>';
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
				$label_icon = $this->icon( $s['label_icon'] ?? [] );
				echo '<p class="rf-showcase__label">' . ( '' !== $label_icon ? '<span class="rf-showcase__label-badge">' . $label_icon . '</span>' : '' ) . '<span>' . esc_html( $label ) . '</span></p>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Icon markup from the icons manager.
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

		$buttons = $this->button_html( $s, 'button', 'primary' ) . $this->button_html( $s, 'button2', 'secondary' );

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
