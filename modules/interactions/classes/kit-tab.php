<?php
namespace Refraction\Modules\Interactions\Classes;

use Refraction\Controls_Manager;
use Refraction\Core\Kits\Documents\Tabs\Tab_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** Site Settings > Motion & Cursor: the site cursor and the transition between pages, for every page of the site. */
class Kit_Tab extends Tab_Base {

	public function get_id() {
		return 'settings-interactions';
	}

	public function get_title() {
		return esc_html__( 'Motion & Cursor', 'refraction' );
	}

	public function get_group() {
		return 'settings';
	}

	public function get_icon() {
		return 'rficon-animation';
	}

	public function get_help_url() {
		return '';
	}

	protected function register_tab_controls() {
		$this->start_controls_section( 'section_rf_cursor', [
			'label' => esc_html__( 'Cursor', 'refraction' ),
			'tab' => $this->get_id(),
		] );

		$this->add_control( 'rf_cursor', [
			'label' => esc_html__( 'Site Cursor', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '',
			'options' => [
				'' => esc_html__( 'The usual cursor', 'refraction' ),
				'dot-ring' => esc_html__( 'Dot and a ring that follows', 'refraction' ),
				'ring' => esc_html__( 'A ring that follows', 'refraction' ),
				'dot' => esc_html__( 'A dot', 'refraction' ),
				'blend' => esc_html__( 'Inverting disc (shows on any background)', 'refraction' ),
			],
			'description' => esc_html__( 'On the site only, for a mouse or trackpad (touch screens keep theirs). Over links and buttons it grows; over an element with a Cursor Word (Advanced > Interactions) it shows that word.', 'refraction' ),
		] );

		$on = [ 'rf_cursor!' => '' ];

		$this->add_control( 'rf_cursor_color', [
			'label' => esc_html__( 'Color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'condition' => [ 'rf_cursor!' => [ '', 'blend' ] ],
		] );

		$this->add_control( 'rf_cursor_size', [
			'label' => esc_html__( 'Ring Size', 'refraction' ) . ' (px)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 16, 'max' => 80 ] ],
			'default' => [ 'size' => 36 ],
			'condition' => $on,
		] );

		$this->add_control( 'rf_cursor_ease', [
			'label' => esc_html__( 'Follow Speed', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0.05, 'max' => 1, 'step' => 0.05 ] ],
			'default' => [ 'size' => 0.2 ],
			'description' => esc_html__( 'Lower: the ring trails further behind the pointer. 1: no delay.', 'refraction' ),
			'condition' => $on,
		] );

		$this->add_control( 'rf_cursor_links', [
			'label' => esc_html__( 'Grow Over Links And Buttons', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'return_value' => 'yes',
			'condition' => $on,
		] );

		$this->add_control( 'rf_cursor_hide_system', [
			'label' => esc_html__( 'Hide The Usual Cursor', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'description' => esc_html__( 'Text fields keep their own cursor.', 'refraction' ),
			'condition' => $on,
		] );

		$this->end_controls_section();

		$this->start_controls_section( 'section_rf_transition', [
			'label' => esc_html__( 'Page Transitions', 'refraction' ),
			'tab' => $this->get_id(),
		] );

		$this->add_control( 'rf_transition', [
			'label' => esc_html__( 'Between Pages', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '',
			'options' => [
				'' => esc_html__( 'Nothing (the page simply changes)', 'refraction' ),
				'fade' => esc_html__( 'Cross-fade', 'refraction' ),
				'slide' => esc_html__( 'The new page rises in', 'refraction' ),
				'wipe' => esc_html__( 'The new page wipes up over the old', 'refraction' ),
				'zoom' => esc_html__( 'The old page steps back, the new one comes forward', 'refraction' ),
			],
			'description' => esc_html__( 'Plays when a visitor follows a link to another page of this site, in browsers that support page transitions (Chrome, Edge, Safari 18.2+); others change page as usual. Off for visitors who ask for reduced motion.', 'refraction' ),
		] );

		$this->add_control( 'rf_transition_duration', [
			'label' => esc_html__( 'Duration', 'refraction' ) . ' (ms)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 150, 'max' => 1500, 'step' => 50 ] ],
			'default' => [ 'size' => 450 ],
			'condition' => [ 'rf_transition!' => '' ],
		] );

		$this->end_controls_section();
	}
}
