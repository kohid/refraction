<?php
namespace Refraction\Core\Kits\Documents\Tabs;

use Refraction\Controls_Manager;
use Refraction\Core\Kits\Controls\Repeater as Global_Style_Repeater;
use Refraction\Repeater;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Global_Colors extends Tab_Base {

	const COLOR_PRIMARY = 'globals/colors?id=primary';
	const COLOR_SECONDARY = 'globals/colors?id=secondary';
	const COLOR_TEXT = 'globals/colors?id=text';
	const COLOR_ACCENT = 'globals/colors?id=accent';

	public function get_id() {
		return 'global-colors';
	}

	public function get_title() {
		return esc_html__( 'Global Colors', 'refraction' );
	}

	public function get_group() {
		return 'global';
	}

	public function get_icon() {
		return 'rficon-global-colors';
	}

	public function get_help_url() {
		return '';
	}

	protected function register_tab_controls() {
		$this->start_controls_section(
			'section_global_colors',
			[
				'label' => esc_html__( 'Global Colors', 'refraction' ),
				'tab' => $this->get_id(),
			]
		);

		$repeater = new Repeater();

		$repeater->add_control(
			'title',
			[
				'type' => Controls_Manager::TEXT,
				'label_block' => true,
				'required' => true,
			]
		);

		// Color Value
		$repeater->add_control(
			'color',
			[
				'type' => Controls_Manager::COLOR,
				'label_block' => true,
				'selectors' => [
					'{{WRAPPER}}' => '--e-global-color-{{_id.VALUE}}: {{VALUE}}',
				],
				'global' => [
					'active' => false,
				],
			]
		);

		$default_colors = [
			[
				'_id' => 'primary',
				'title' => esc_html__( 'Primary', 'refraction' ),
				'color' => '#6EC1E4',
			],
			[
				'_id' => 'secondary',
				'title' => esc_html__( 'Secondary', 'refraction' ),
				'color' => '#54595F',
			],
			[
				'_id' => 'text',
				'title' => esc_html__( 'Text', 'refraction' ),
				'color' => '#7A7A7A',
			],
			[
				'_id' => 'accent',
				'title' => esc_html__( 'Accent', 'refraction' ),
				'color' => '#61CE70',
			],
		];

		$this->add_control(
			'heading_system_colors',
			[
				'type' => Controls_Manager::HEADING,
				'label' => esc_html__( 'System Colors', 'refraction' ),
			]
		);

		$this->add_control(
			'system_colors',
			[
				'type' => Global_Style_Repeater::CONTROL_TYPE,
				'fields' => $repeater->get_controls(),
				'default' => $default_colors,
				'item_actions' => [
					'add' => false,
					'remove' => false,
				],
				'separator' => 'after',
			]
		);

		$this->add_control(
			'heading_custom_colors',
			[
				'type' => Controls_Manager::HEADING,
				'label' => esc_html__( 'Custom Colors', 'refraction' ),
			]
		);

		$this->add_control(
			'custom_colors',
			[
				'type' => Global_Style_Repeater::CONTROL_TYPE,
				'fields' => $repeater->get_controls(),
			]
		);

		do_action( 'refraction/kit/global-colors/register_controls', $this );

		$this->end_controls_section();
	}
}
