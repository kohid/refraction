<?php
namespace Refraction;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Group_Control_Flex_Container extends Group_Control_Base {

	protected static $fields;

	public static function get_type() {
		return 'flex-container';
	}

	protected function init_fields() {
		$start = is_rtl() ? 'right' : 'left';
		$end = is_rtl() ? 'left' : 'right';

		$fields = [];

		$fields['items'] = [
			'type' => Controls_Manager::HEADING,
			'label' => esc_html__( 'Items', 'refraction' ),
			'separator' => 'before',
		];

		$fields['direction'] = [
			'label' => esc_html__( 'Direction', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'options' => [
				'row' => [
					'title' => esc_html__( 'Row - horizontal', 'refraction' ),
					'icon' => 'rficon-arrow-' . $end,
				],
				'column' => [
					'title' => esc_html__( 'Column - vertical', 'refraction' ),
					'icon' => 'rficon-arrow-down',
				],
				'row-reverse' => [
					'title' => esc_html__( 'Row - reversed', 'refraction' ),
					'icon' => 'rficon-arrow-' . $start,
				],
				'column-reverse' => [
					'title' => esc_html__( 'Column - reversed', 'refraction' ),
					'icon' => 'rficon-arrow-up',
				],
			],
			'default' => '',
			// The `--container-widget-width` CSS variable is used for handling widgets that get an undefined width in column mode.
			// The `--container-widget-flex-grow` CSS variable is used to give certain widgets a default `flex-grow: 1` value for the `flex row` combination.
			'selectors_dictionary' => [
				'row' => '--flex-direction: row; --container-widget-width: initial; --container-widget-height: 100%; --container-widget-flex-grow: 1; --container-widget-align-self: stretch; --flex-wrap-mobile: wrap;',
				'column' => '--flex-direction: column; --container-widget-width: 100%; --container-widget-height: initial; --container-widget-flex-grow: 0; --container-widget-align-self: initial; --flex-wrap-mobile: wrap;',
				'row-reverse' => '--flex-direction: row-reverse; --container-widget-width: initial; --container-widget-height: 100%; --container-widget-flex-grow: 1; --container-widget-align-self: stretch; --flex-wrap-mobile: wrap-reverse;',
				'column-reverse' => '--flex-direction: column-reverse; --container-widget-width: 100%; --container-widget-height: initial; --container-widget-flex-grow: 0; --container-widget-align-self: initial; --flex-wrap-mobile: wrap;',
			],
			'selectors' => [
				'{{SELECTOR}}' => '{{VALUE}};',
			],
			'responsive' => true,
		];

		// Only use the flex direction prefix class inside the editor.
		$flex_direction_prefix_class = Plugin::$instance->editor->is_edit_mode() ? [ 'prefix_class' => 'e-con--' ] : [];

		$fields['_is_row'] = array_merge( $flex_direction_prefix_class, [
			'type' => Controls_Manager::HIDDEN,
			'default' => 'row',
			'condition' => [
				'direction' => [
					'row',
					'row-reverse',
				],
			],
		] );

		$fields['_is_column'] = array_merge( $flex_direction_prefix_class, [
			'type' => Controls_Manager::HIDDEN,
			'default' => 'column',
			'condition' => [
				'direction' => [
					'',
					'column',
					'column-reverse',
				],
			],
		] );

		$fields['justify_content'] = [
			'label' => esc_html__( 'Justify Content', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'label_block' => true,
			'default' => '',
			'options' => [
				'flex-start' => [
					'title' => esc_html__( 'Start', 'refraction' ),
					'icon' => 'rficon-flex rficon-justify-start-h',
				],
				'center' => [
					'title' => esc_html__( 'Center', 'refraction' ),
					'icon' => 'rficon-flex rficon-justify-center-h',
				],
				'flex-end' => [
					'title' => esc_html__( 'End', 'refraction' ),
					'icon' => 'rficon-flex rficon-justify-end-h',
				],
				'space-between' => [
					'title' => esc_html__( 'Space Between', 'refraction' ),
					'icon' => 'rficon-flex rficon-justify-space-between-h',
				],
				'space-around' => [
					'title' => esc_html__( 'Space Around', 'refraction' ),
					'icon' => 'rficon-flex rficon-justify-space-around-h',
				],
				'space-evenly' => [
					'title' => esc_html__( 'Space Evenly', 'refraction' ),
					'icon' => 'rficon-flex rficon-justify-space-evenly-h',
				],
			],
			'selectors' => [
				'{{SELECTOR}}' => '--justify-content: {{VALUE}};',
			],
			'responsive' => true,
		];

		$fields['align_items'] = [
			'label' => esc_html__( 'Align Items', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'default' => '',
			'options' => [
				'flex-start' => [
					'title' => esc_html__( 'Start', 'refraction' ),
					'icon' => 'rficon-flex rficon-align-start-v',
				],
				'center' => [
					'title' => esc_html__( 'Center', 'refraction' ),
					'icon' => 'rficon-flex rficon-align-center-v',
				],
				'flex-end' => [
					'title' => esc_html__( 'End', 'refraction' ),
					'icon' => 'rficon-flex rficon-align-end-v',
				],
				'stretch' => [
					'title' => esc_html__( 'Stretch', 'refraction' ),
					'icon' => 'rficon-flex rficon-align-stretch-v',
				],
			],
			'selectors' => [
				'{{SELECTOR}}' => '--align-items: {{VALUE}}; --container-widget-width: calc( ( 1 - var( --container-widget-flex-grow ) ) * 100% );',
			],
			'responsive' => true,
		];

		$fields['gap'] = [
			'label' => esc_html__( 'Gaps', 'refraction' ),
			'type' => Controls_Manager::GAPS,
			'size_units' => [ 'px', '%', 'em', 'rem', 'vw', 'custom' ],
			'default' => [
				'unit' => 'px',
			],
			'separator' => 'before',
			'selectors' => [
				'{{SELECTOR}}' => '--gap: {{ROW}}{{UNIT}} {{COLUMN}}{{UNIT}};--row-gap: {{ROW}}{{UNIT}};--column-gap: {{COLUMN}}{{UNIT}};',
			],
			'responsive' => true,
			'conversion_map' => [
				'old_key' => 'size',
				'new_key' => 'column',
			],
			'upgrade_conversion_map' => [
				'old_key' => 'size',
				'new_keys' => [ 'column', 'row' ],
			],
			'validators' => [
				'Number' => [
					'min' => 0,
				],
			],
		];

		$fields['wrap'] = [
			'label' => esc_html__( 'Wrap', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'options' => [
				'nowrap' => [
					'title' => esc_html__( 'No Wrap', 'refraction' ),
					'icon' => 'rficon-flex rficon-nowrap',
				],
				'wrap' => [
					'title' => esc_html__( 'Wrap', 'refraction' ),
					'icon' => 'rficon-flex rficon-wrap',
				],
			],
			'description' => esc_html__( 'Items within the container can stay in a single line (No wrap), or break into multiple lines (Wrap).', 'refraction' ),
			'default' => '',
			'selectors' => [
				'{{SELECTOR}}' => '--flex-wrap: {{VALUE}};',
			],
			'responsive' => true,
		];

		$fields['align_content'] = [
			'label' => esc_html__( 'Align Content', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'label_block' => true,
			'default' => '',
			'options' => [
				'flex-start' => [
					'title' => esc_html__( 'Start', 'refraction' ),
					'icon' => 'rficon-justify-start-v',
				],
				'center' => [
					'title' => esc_html__( 'Middle', 'refraction' ),
					'icon' => 'rficon-justify-center-v',
				],
				'flex-end' => [
					'title' => esc_html__( 'End', 'refraction' ),
					'icon' => 'rficon-justify-end-v',
				],
				'space-between' => [
					'title' => esc_html__( 'Space Between', 'refraction' ),
					'icon' => 'rficon-justify-space-between-v',
				],
				'space-around' => [
					'title' => esc_html__( 'Space Around', 'refraction' ),
					'icon' => 'rficon-justify-space-around-v',
				],
				'space-evenly' => [
					'title' => esc_html__( 'Space Evenly', 'refraction' ),
					'icon' => 'rficon-justify-space-evenly-v',
				],
			],
			'selectors' => [
				'{{SELECTOR}}' => '--align-content: {{VALUE}};',
			],
			'condition' => [
				'wrap' => 'wrap',
			],
			'responsive' => true,
		];

		return $fields;
	}

	protected function get_default_options() {
		return [
			'popover' => false,
		];
	}
}
