<?php
namespace Refraction\Modules\CustomCss\Classes;

use Refraction\Controls_Manager;
use Refraction\Core\Kits\Documents\Tabs\Tab_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** Site Settings > Custom CSS: CSS for every page of the site. */
class Kit_Tab extends Tab_Base {

	public function get_id() {
		return 'settings-custom-css';
	}

	public function get_title() {
		return esc_html__( 'Custom CSS', 'refraction' );
	}

	public function get_group() {
		return 'settings';
	}

	public function get_icon() {
		return 'rficon-custom-css';
	}

	public function get_help_url() {
		return '';
	}

	protected function register_tab_controls() {
		$this->start_controls_section(
			'section_' . $this->get_id(),
			[
				'label' => $this->get_title(),
				'tab' => $this->get_id(),
			]
		);

		$this->add_control(
			'custom_css',
			[
				'type' => Controls_Manager::CODE,
				'label' => esc_html__( 'Custom CSS', 'refraction' ),
				'language' => 'css',
				'render_type' => 'ui',
				'show_label' => false,
				'separator' => 'none',
				'refraction_css_scope' => 'site',
			]
		);

		$this->add_control(
			'custom_css_description',
			[
				'raw' => esc_html__( 'CSS added here loads on every page of the site. Use "selector" to target the page body.', 'refraction' ),
				'type' => Controls_Manager::RAW_HTML,
				'content_classes' => 'refraction-descriptor',
			]
		);

		$this->end_controls_section();
	}
}
