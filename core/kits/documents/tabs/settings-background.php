<?php
namespace Refraction\Core\Kits\Documents\Tabs;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Background;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Settings_Background extends Tab_Base {

	public function get_id() {
		return 'settings-background';
	}

	public function get_title() {
		return esc_html__( 'Background', 'refraction' );
	}

	public function get_group() {
		return 'settings';
	}

	public function get_icon() {
		return 'eicon-background';
	}

	public function get_help_url() {
		return '';
	}

	protected function register_tab_controls() {
		$this->start_controls_section(
			'section_background',
			[
				'label' => $this->get_title(),
				'tab' => $this->get_id(),
			]
		);

		$this->add_group_control(
			Group_Control_Background::get_type(),
			[
				'name' => 'body_background',
				'types' => [ 'classic', 'gradient' ],
				'selector' => '{{WRAPPER}}',
				'fields_options' => [
					'background' => [
						'frontend_available' => true,
					],
					'color' => [
						'dynamic' => [],
					],
					'color_b' => [
						'dynamic' => [],
					],
				],
			]
		);

		$this->add_control(
			'mobile_browser_background',
			[
				'label' => esc_html__( 'Mobile Browser Background', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'description' => esc_html__( 'The `theme-color` meta tag will only be available in supported browsers and devices.', 'refraction' ),
				'separator' => 'before',
			]
		);

		$this->add_control(
			'body_overscroll_behavior',
			[
				'label' => esc_html__( 'Overscroll Behavior', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => [
					'' => esc_html__( 'Default', 'refraction' ),
					'none' => esc_html__( 'None', 'refraction' ),
					'auto' => esc_html__( 'Auto', 'refraction' ),
					'contain' => esc_html__( 'Contain', 'refraction' ),
				],
				'separator' => 'before',
				'selectors' => [
					'{{WRAPPER}}' => 'overscroll-behavior: {{VALUE}};',
				],
			]
		);

		$this->end_controls_section();
	}
}
