<?php
namespace Refraction;

use Refraction\Core\Breakpoints\Manager as Breakpoints_Manager;
use Refraction\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Refraction column element.
 *
 * Refraction column handler class is responsible for initializing the column
 * element.
 *
 * @since 1.0.0
 */
class Element_Column extends Element_Base {

	/**
	 * Get column name.
	 *
	 * Retrieve the column name.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @return string Column name.
	 */
	public function get_name() {
		return 'column';
	}

	/**
	 * Get element type.
	 *
	 * Retrieve the element type, in this case `column`.
	 *
	 * @since 2.1.0
	 * @access public
	 * @static
	 *
	 * @return string The type.
	 */
	public static function get_type() {
		return 'column';
	}

	/**
	 * Get column title.
	 *
	 * Retrieve the column title.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @return string Column title.
	 */
	public function get_title() {
		return esc_html__( 'Column', 'refraction' );
	}

	/**
	 * Get column icon.
	 *
	 * Retrieve the column icon.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @return string Column icon.
	 */
	public function get_icon() {
		return 'eicon-column';
	}

	protected function is_dynamic_content(): bool {
		return false;
	}

	/**
	 * Get initial config.
	 *
	 * Retrieve the current section initial configuration.
	 *
	 * Adds more configuration on top of the controls list, the tabs assigned to
	 * the control, element name, type, icon and more. This method also adds
	 * section presets.
	 *
	 * @since 2.9.0
	 * @access protected
	 *
	 * @return array The initial config.
	 */
	protected function get_initial_config() {
		$config = parent::get_initial_config();

		$config['controls'] = $this->get_controls();
		$config['tabs_controls'] = $this->get_tabs_controls();

		return $config;
	}

	/**
	 * Register column controls.
	 *
	 * Used to add new controls to the column element.
	 *
	 * @since 3.1.0
	 * @access protected
	 */
	protected function register_controls() {
		// Section Layout.
		$this->start_controls_section(
			'layout',
			[
				'label' => esc_html__( 'Layout', 'refraction' ),
				'tab' => Controls_Manager::TAB_LAYOUT,
			]
		);

		// Element Name for the Navigator.
		$this->add_control(
			'_title',
			[
				'label' => esc_html__( 'Title', 'refraction' ),
				'type' => Controls_Manager::HIDDEN,
				'render_type' => 'none',
			]
		);

		$active_breakpoint_keys = array_reverse( array_keys( Plugin::$instance->breakpoints->get_active_breakpoints() ) );
		$inline_size_device_args = [
			Breakpoints_Manager::BREAKPOINT_KEY_MOBILE => [ 'placeholder' => 100 ],
		];

		foreach ( $active_breakpoint_keys as $breakpoint_key ) {
			if ( ! isset( $inline_size_device_args[ $breakpoint_key ] ) ) {
				$inline_size_device_args[ $breakpoint_key ] = [];
			}

			$inline_size_device_args[ $breakpoint_key ] = array_merge_recursive(
				$inline_size_device_args[ $breakpoint_key ],
				[
					'max' => 100,
					'required' => false,
				]
			);
		}

		if ( in_array( Breakpoints_Manager::BREAKPOINT_KEY_MOBILE_EXTRA, $active_breakpoint_keys, true ) ) {
			$min_affected_device_value = Breakpoints_Manager::BREAKPOINT_KEY_MOBILE_EXTRA;
		} else {
			$min_affected_device_value = Breakpoints_Manager::BREAKPOINT_KEY_TABLET;
		}

		$this->add_responsive_control(
			'_inline_size',
			[
				'label' => esc_html__( 'Column Width', 'refraction' ) . ' (%)',
				'type' => Controls_Manager::NUMBER,
				'min' => 2,
				'max' => 98,
				'required' => true,
				'device_args' => $inline_size_device_args,
				'min_affected_device' => [
					Breakpoints_Manager::BREAKPOINT_KEY_DESKTOP => $min_affected_device_value,
					Breakpoints_Manager::BREAKPOINT_KEY_LAPTOP => $min_affected_device_value,
					Breakpoints_Manager::BREAKPOINT_KEY_TABLET_EXTRA => $min_affected_device_value,
					Breakpoints_Manager::BREAKPOINT_KEY_TABLET => $min_affected_device_value,
					Breakpoints_Manager::BREAKPOINT_KEY_MOBILE_EXTRA => $min_affected_device_value,
				],
				'selectors' => [
					'{{WRAPPER}}' => 'width: {{VALUE}}%',
				],
			]
		);

		$this->add_responsive_control(
			'content_position',
			[
				'label' => esc_html__( 'Vertical Alignment', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => '',
				'options' => [
					'' => esc_html__( 'Default', 'refraction' ),
					'top' => esc_html__( 'Top', 'refraction' ),
					'center' => esc_html__( 'Middle', 'refraction' ),
					'bottom' => esc_html__( 'Bottom', 'refraction' ),
					'space-between' => esc_html__( 'Space Between', 'refraction' ),
					'space-around' => esc_html__( 'Space Around', 'refraction' ),
					'space-evenly' => esc_html__( 'Space Evenly', 'refraction' ),
				],
				'selectors_dictionary' => [
					'top' => 'flex-start',
					'bottom' => 'flex-end',
				],
				'selectors' => [
					// TODO: The following line is for BC since 2.7.0.
					'.refraction-bc-flex-widget {{WRAPPER}}.refraction-column .refraction-widget-wrap' => 'align-items: {{VALUE}}',
					// This specificity is intended to make sure column css overwrites section css on vertical alignment (content_position).
					'{{WRAPPER}}.refraction-column.refraction-element[data-element_type="column"] > .refraction-widget-wrap.refraction-element-populated' => 'align-content: {{VALUE}}; align-items: {{VALUE}};',
				],
			]
		);

		$this->add_responsive_control(
			'align',
			[
				'label' => esc_html__( 'Horizontal Alignment', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => '',
				'options' => [
					'' => esc_html__( 'Default', 'refraction' ),
					'flex-start' => esc_html__( 'Start', 'refraction' ),
					'center' => esc_html__( 'Center', 'refraction' ),
					'flex-end' => esc_html__( 'End', 'refraction' ),
					'space-between' => esc_html__( 'Space Between', 'refraction' ),
					'space-around' => esc_html__( 'Space Around', 'refraction' ),
					'space-evenly' => esc_html__( 'Space Evenly', 'refraction' ),
				],
				'selectors' => [
					'{{WRAPPER}}.refraction-column > .refraction-widget-wrap' => 'justify-content: {{VALUE}}',
				],
			]
		);

		$optimized_markup = Plugin::$instance->experiments->is_feature_active( 'e_optimized_markup' );
		$space_between_widgets = $optimized_markup
			? '--kit-widget-spacing: {{VALUE}}px'
			: 'margin-block-end: {{VALUE}}px';

		$this->add_responsive_control(
			'space_between_widgets',
			[
				'label' => esc_html__( 'Widgets Space', 'refraction' ) . ' (px)',
				'type' => Controls_Manager::NUMBER,
				'placeholder' => 20,
				'selectors' => [
					'{{WRAPPER}} > .refraction-widget-wrap > .refraction-widget:not(.refraction-widget__width-auto):not(.refraction-widget__width-initial):not(:last-child):not(.refraction-absolute)' => $space_between_widgets, // Need the full path for exclude the inner section.
				],
			]
		);

		$possible_tags = [
			'div',
			'header',
			'footer',
			'main',
			'article',
			'section',
			'aside',
			'nav',
		];

		$options = [
			'' => esc_html__( 'Default', 'refraction' ),
		] + array_combine( $possible_tags, $possible_tags );

		$this->add_control(
			'html_tag',
			[
				'label' => esc_html__( 'HTML Tag', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => $options,
				'render_type' => 'none',
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'section_style',
			[
				'label' => esc_html__( 'Background', 'refraction' ),
				'tab' => Controls_Manager::TAB_STYLE,
			]
		);

		$this->start_controls_tabs( 'tabs_background' );

		$this->start_controls_tab(
			'tab_background_normal',
			[
				'label' => esc_html__( 'Normal', 'refraction' ),
			]
		);

		$this->add_group_control(
			Group_Control_Background::get_type(),
			[
				'name' => 'background',
				'types' => [ 'classic', 'gradient', 'slideshow' ],
				'selector' => '{{WRAPPER}}:not(.refraction-motion-effects-element-type-background) > .refraction-widget-wrap, {{WRAPPER}} > .refraction-widget-wrap > .refraction-motion-effects-container > .refraction-motion-effects-layer',
				'fields_options' => [
					'background' => [
						'frontend_available' => true,
					],
				],
			]
		);

		$this->add_control(
			'handle_slideshow_asset_loading',
			[
				'type' => Controls_Manager::HIDDEN,
				'assets' => [
					'styles' => [
						[
							'name' => 'e-swiper',
							'conditions' => [
								'terms' => [
									[
										'name' => 'background_background',
										'operator' => '===',
										'value' => 'slideshow',
									],
								],
							],
						],
					],
					'scripts' => [
						[
							'name' => 'swiper',
							'conditions' => [
								'terms' => [
									[
										'name' => 'background_background',
										'operator' => '===',
										'value' => 'slideshow',
									],
								],
							],
						],
					],
				],
			]
		);

		$this->end_controls_tab();

		$this->start_controls_tab(
			'tab_background_hover',
			[
				'label' => esc_html__( 'Hover', 'refraction' ),
			]
		);

		$this->add_group_control(
			Group_Control_Background::get_type(),
			[
				'name' => 'background_hover',
				'selector' => '{{WRAPPER}}:hover > .refraction-element-populated',
			]
		);

		$this->add_control(
			'background_hover_transition',
			[
				'label' => esc_html__( 'Transition Duration', 'refraction' ) . ' (s)',
				'type' => Controls_Manager::SLIDER,
				'default' => [
					'size' => 0.3,
				],
				'range' => [
					'px' => [
						'min' => 0,
						'max' => 3,
						'step' => 0.1,
					],
				],
				'render_type' => 'ui',
				'separator' => 'before',
			]
		);

		$this->end_controls_tab();

		$this->end_controls_tabs();

		$this->end_controls_section();

		// Section Column Background Overlay.
		$this->start_controls_section(
			'section_background_overlay',
			[
				'label' => esc_html__( 'Background Overlay', 'refraction' ),
				'tab' => Controls_Manager::TAB_STYLE,
				'condition' => [
					'background_background' => [ 'classic', 'gradient' ],
				],
			]
		);

		$this->start_controls_tabs( 'tabs_background_overlay' );

		$this->start_controls_tab(
			'tab_background_overlay_normal',
			[
				'label' => esc_html__( 'Normal', 'refraction' ),
			]
		);

		$this->add_group_control(
			Group_Control_Background::get_type(),
			[
				'name' => 'background_overlay',
				'selector' => '{{WRAPPER}} > .refraction-element-populated >  .refraction-background-overlay',
			]
		);

		$this->add_responsive_control(
			'background_overlay_opacity',
			[
				'label' => esc_html__( 'Opacity', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'default' => [
					'size' => .5,
				],
				'range' => [
					'px' => [
						'max' => 1,
						'step' => 0.01,
					],
				],
				'selectors' => [
					'{{WRAPPER}} > .refraction-element-populated >  .refraction-background-overlay' => 'opacity: {{SIZE}};',
				],
				'condition' => [
					'background_overlay_background' => [ 'classic', 'gradient' ],
				],
			]
		);

		$this->add_group_control(
			Group_Control_Css_Filter::get_type(),
			[
				'name' => 'css_filters',
				'selector' => '{{WRAPPER}} > .refraction-element-populated >  .refraction-background-overlay',
			]
		);

		$this->add_control(
			'overlay_blend_mode',
			[
				'label' => esc_html__( 'Blend Mode', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => [
					'' => esc_html__( 'Normal', 'refraction' ),
					'multiply' => esc_html__( 'Multiply', 'refraction' ),
					'screen' => esc_html__( 'Screen', 'refraction' ),
					'overlay' => esc_html__( 'Overlay', 'refraction' ),
					'darken' => esc_html__( 'Darken', 'refraction' ),
					'lighten' => esc_html__( 'Lighten', 'refraction' ),
					'color-dodge' => esc_html__( 'Color Dodge', 'refraction' ),
					'saturation' => esc_html__( 'Saturation', 'refraction' ),
					'color' => esc_html__( 'Color', 'refraction' ),
					'difference' => esc_html__( 'Difference', 'refraction' ),
					'exclusion' => esc_html__( 'Exclusion', 'refraction' ),
					'hue' => esc_html__( 'Hue', 'refraction' ),
					'luminosity' => esc_html__( 'Luminosity', 'refraction' ),
				],
				'selectors' => [
					'{{WRAPPER}} > .refraction-element-populated > .refraction-background-overlay' => 'mix-blend-mode: {{VALUE}}',
				],
			]
		);

		$this->end_controls_tab();

		$this->start_controls_tab(
			'tab_background_overlay_hover',
			[
				'label' => esc_html__( 'Hover', 'refraction' ),
			]
		);

		$this->add_group_control(
			Group_Control_Background::get_type(),
			[
				'name' => 'background_overlay_hover',
				'selector' => '{{WRAPPER}}:hover > .refraction-element-populated >  .refraction-background-overlay',
			]
		);

		$this->add_responsive_control(
			'background_overlay_hover_opacity',
			[
				'label' => esc_html__( 'Opacity', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'default' => [
					'size' => .5,
				],
				'range' => [
					'px' => [
						'max' => 1,
						'step' => 0.01,
					],
				],
				'selectors' => [
					'{{WRAPPER}}:hover > .refraction-element-populated >  .refraction-background-overlay' => 'opacity: {{SIZE}};',
				],
				'condition' => [
					'background_overlay_hover_background' => [ 'classic', 'gradient' ],
				],
			]
		);

		$this->add_group_control(
			Group_Control_Css_Filter::get_type(),
			[
				'name' => 'css_filters_hover',
				'selector' => '{{WRAPPER}}:hover > .refraction-element-populated >  .refraction-background-overlay',
			]
		);

		$this->add_control(
			'background_overlay_hover_transition',
			[
				'label' => esc_html__( 'Transition Duration', 'refraction' ) . ' (s)',
				'type' => Controls_Manager::SLIDER,
				'default' => [
					'size' => 0.3,
				],
				'range' => [
					'px' => [
						'min' => 0,
						'max' => 3,
						'step' => 0.1,
					],
				],
				'render_type' => 'ui',
				'separator' => 'before',
			]
		);

		$this->end_controls_tab();

		$this->end_controls_tabs();

		$this->end_controls_section();

		$this->start_controls_section(
			'section_border',
			[
				'label' => esc_html__( 'Border', 'refraction' ),
				'tab' => Controls_Manager::TAB_STYLE,
			]
		);

		$this->start_controls_tabs( 'tabs_border' );

		$this->start_controls_tab(
			'tab_border_normal',
			[
				'label' => esc_html__( 'Normal', 'refraction' ),
			]
		);

		$this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name' => 'border',
				'selector' => '{{WRAPPER}} > .refraction-element-populated',
			]
		);

		$this->add_responsive_control(
			'border_radius',
			[
				'label' => esc_html__( 'Border Radius', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%', 'em', 'rem', 'custom' ],
				'selectors' => [
					'{{WRAPPER}} > .refraction-element-populated, {{WRAPPER}} > .refraction-element-populated > .refraction-background-overlay, {{WRAPPER}} > .refraction-background-slideshow' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Box_Shadow::get_type(),
			[
				'name' => 'box_shadow',
				'selector' => '{{WRAPPER}} > .refraction-element-populated',
			]
		);

		$this->end_controls_tab();

		$this->start_controls_tab(
			'tab_border_hover',
			[
				'label' => esc_html__( 'Hover', 'refraction' ),
			]
		);

		$this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name' => 'border_hover',
				'selector' => '{{WRAPPER}}:hover > .refraction-element-populated',
			]
		);

		$this->add_responsive_control(
			'border_radius_hover',
			[
				'label' => esc_html__( 'Border Radius', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%', 'em', 'rem', 'custom' ],
				'selectors' => [
					'{{WRAPPER}}:hover > .refraction-element-populated, {{WRAPPER}}:hover > .refraction-element-populated > .refraction-background-overlay' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Box_Shadow::get_type(),
			[
				'name' => 'box_shadow_hover',
				'selector' => '{{WRAPPER}}:hover > .refraction-element-populated',
			]
		);

		$this->add_control(
			'border_hover_transition',
			[
				'label' => esc_html__( 'Transition Duration', 'refraction' ) . ' (s)',
				'type' => Controls_Manager::SLIDER,
				'separator' => 'before',
				'default' => [
					'size' => 0.3,
				],
				'range' => [
					'px' => [
						'min' => 0,
						'max' => 3,
						'step' => 0.1,
					],
				],
				'conditions' => [
					'relation' => 'or',
					'terms' => [
						[
							'name' => 'background_background',
							'operator' => '!==',
							'value' => '',
						],
						[
							'name' => 'border_hover_border',
							'operator' => '!==',
							'value' => '',
						],
					],
				],
				'selectors' => [
					'{{WRAPPER}} > .refraction-element-populated' => 'transition: background {{background_hover_transition.SIZE}}s, border {{SIZE}}s, border-radius {{SIZE}}s, box-shadow {{SIZE}}s',
					'{{WRAPPER}} > .refraction-element-populated > .refraction-background-overlay' => 'transition: background {{background_overlay_hover_transition.SIZE}}s, border-radius {{SIZE}}s, opacity {{background_overlay_hover_transition.SIZE}}s',
				],
			]
		);

		$this->end_controls_tab();

		$this->end_controls_tabs();

		$this->end_controls_section();

		// Section Typography.
		$this->start_controls_section(
			'section_typo',
			[
				'label' => esc_html__( 'Typography', 'refraction' ),
				'type' => Controls_Manager::SECTION,
				'tab' => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_control(
			'heading_color',
			[
				'label' => esc_html__( 'Heading Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'default' => '',
				'selectors' => [
					'{{WRAPPER}} .refraction-element-populated .refraction-heading-title' => 'color: {{VALUE}};',
				],
			]
		);

		$this->add_control(
			'color_text',
			[
				'label' => esc_html__( 'Text Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'default' => '',
				'selectors' => [
					'{{WRAPPER}} > .refraction-element-populated' => 'color: {{VALUE}};',
				],
			]
		);

		$this->add_control(
			'color_link',
			[
				'label' => esc_html__( 'Link Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'default' => '',
				'selectors' => [
					'{{WRAPPER}} .refraction-element-populated a' => 'color: {{VALUE}};',
				],
			]
		);

		$this->add_control(
			'color_link_hover',
			[
				'label' => esc_html__( 'Link Hover Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'default' => '',
				'selectors' => [
					'{{WRAPPER}} .refraction-element-populated a:hover' => 'color: {{VALUE}};',
				],
			]
		);

		$this->add_responsive_control(
			'text_align',
			[
				'label' => esc_html__( 'Text Align', 'refraction' ),
				'type' => Controls_Manager::CHOOSE,
				'options' => [
					'start' => [
						'title' => esc_html__( 'Start', 'refraction' ),
						'icon' => 'eicon-text-align-left',
					],
					'center' => [
						'title' => esc_html__( 'Center', 'refraction' ),
						'icon' => 'eicon-text-align-center',
					],
					'end' => [
						'title' => esc_html__( 'End', 'refraction' ),
						'icon' => 'eicon-text-align-right',
					],
					'justify' => [
						'title' => esc_html__( 'Justified', 'refraction' ),
						'icon' => 'eicon-text-align-justify',
					],
				],
				'classes' => 'refraction-control-start-end',
				'selectors_dictionary' => [
					'left' => is_rtl() ? 'end' : 'start',
					'right' => is_rtl() ? 'start' : 'end',
				],
				'selectors' => [
					'{{WRAPPER}} > .refraction-element-populated' => 'text-align: {{VALUE}};',
				],
			]
		);

		$this->end_controls_section();

		// Section Advanced.
		$this->start_controls_section(
			'section_advanced',
			[
				'label' => esc_html__( 'Advanced', 'refraction' ),
				'type' => Controls_Manager::SECTION,
				'tab' => Controls_Manager::TAB_ADVANCED,
			]
		);

		$this->add_responsive_control(
			'margin',
			[
				'label' => esc_html__( 'Margin', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%', 'em', 'rem', 'vw', 'custom' ],
				'selectors' => [
					'{{WRAPPER}} > .refraction-element-populated' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};
					--e-column-margin-right: {{RIGHT}}{{UNIT}}; --e-column-margin-left: {{LEFT}}{{UNIT}};',
				],
			]
		);

		$this->add_responsive_control(
			'padding',
			[
				'label' => esc_html__( 'Padding', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%', 'em', 'rem', 'vw', 'custom' ],
				'selectors' => [
					'{{WRAPPER}} > .refraction-element-populated' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);

		$this->add_responsive_control(
			'z_index',
			[
				'label' => esc_html__( 'Z-Index', 'refraction' ),
				'type' => Controls_Manager::NUMBER,
				'min' => 0,
				'selectors' => [
					'{{WRAPPER}}' => 'z-index: {{VALUE}};',
				],
			]
		);

		$this->add_control(
			'_element_id',
			[
				'label' => esc_html__( 'CSS ID', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => '',
				'ai' => [
					'active' => false,
				],
				'dynamic' => [
					'active' => true,
				],
				'title' => esc_html__( 'Add your custom id WITHOUT the Pound key. e.g: my-id', 'refraction' ),
				'style_transfer' => false,
				'classes' => 'refraction-control-direction-ltr',
			]
		);

		$this->add_control(
			'css_classes',
			[
				'label' => esc_html__( 'CSS Classes', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => '',
				'ai' => [
					'active' => false,
				],
				'dynamic' => [
					'active' => true,
				],
				'prefix_class' => '',
				'title' => esc_html__( 'Add your custom class WITHOUT the dot. e.g: my-class', 'refraction' ),
				'classes' => 'refraction-control-direction-ltr',
			]
		);

		// TODO: Backward comparability for deprecated controls.
		$this->add_control(
			'screen_sm',
			[
				'type' => Controls_Manager::HIDDEN,
			]
		);

		$this->add_control(
			'screen_sm_width',
			[
				'type' => Controls_Manager::HIDDEN,
				'condition' => [
					'screen_sm' => [ 'custom' ],
				],
				'prefix_class' => 'refraction-sm-',
			]
		);
		// END Backward comparability.

		$this->end_controls_section();

		$this->start_controls_section(
			'section_effects',
			[
				'label' => esc_html__( 'Motion Effects', 'refraction' ),
				'tab' => Controls_Manager::TAB_ADVANCED,
			]
		);

		$this->add_responsive_control(
			'animation',
			[
				'label' => esc_html__( 'Entrance Animation', 'refraction' ),
				'type' => Controls_Manager::ANIMATION,
				'frontend_available' => true,
			]
		);

		$this->add_control(
			'animation_duration',
			[
				'label' => esc_html__( 'Animation Duration', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => '',
				'options' => [
					'slow' => esc_html__( 'Slow', 'refraction' ),
					'' => esc_html__( 'Normal', 'refraction' ),
					'fast' => esc_html__( 'Fast', 'refraction' ),
				],
				'prefix_class' => 'animated-',
				'condition' => [
					'animation!' => '',
				],
			]
		);

		$this->add_control(
			'animation_delay',
			[
				'label' => esc_html__( 'Animation Delay', 'refraction' ) . ' (ms)',
				'type' => Controls_Manager::NUMBER,
				'default' => '',
				'min' => 0,
				'step' => 100,
				'condition' => [
					'animation!' => '',
				],
				'render_type' => 'none',
				'frontend_available' => true,
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'_section_responsive',
			[
				'label' => esc_html__( 'Responsive', 'refraction' ),
				'tab' => Controls_Manager::TAB_ADVANCED,
			]
		);

		$this->add_control(
			'responsive_description',
			[
				'raw' => sprintf(
					/* translators: 1: Link open tag, 2: Link close tag. */
					esc_html__( 'Responsive visibility will take effect only on %1$s preview mode %2$s or live page, and not while editing in Refraction.', 'refraction' ),
					'<a href="javascript: $e.run( \'panel/close\' )">',
					'</a>'
				),
				'type' => Controls_Manager::RAW_HTML,
				'content_classes' => 'refraction-descriptor',
			]
		);

		$this->add_hidden_device_controls();

		$this->end_controls_section();

	}

	/**
	 * Render column output in the editor.
	 *
	 * Used to generate the live preview, using a Backbone JavaScript template.
	 *
	 * @since 2.9.0
	 * @access protected
	 */
	protected function content_template() {
		?>
		<div class="refraction-widget-wrap">
			<div class="refraction-background-overlay"></div>
		</div>
		<?php
	}

	/**
	 * Before column rendering.
	 *
	 * Used to add stuff before the column element.
	 *
	 * @since 1.0.0
	 * @access public
	 */
	public function before_render() {
		$settings = $this->get_settings_for_display();

		$overlay_background = $settings['background_overlay_background'] ?? '';
		$overlay_hover_background = $settings['background_overlay_hover_background'] ?? '';

		$has_background_overlay = in_array( $overlay_background, [ 'classic', 'gradient' ], true ) ||
									in_array( $overlay_hover_background, [ 'classic', 'gradient' ], true );

		$column_wrap_classes = [ 'refraction-widget-wrap' ];

		if ( $this->get_children() ) {
			$column_wrap_classes[] = 'refraction-element-populated';
		}

		$this->add_render_attribute( [
			'_widget_wrapper' => [
				'class' => $column_wrap_classes,
			],
			'_background_overlay' => [
				'class' => [ 'refraction-background-overlay' ],
			],
		] );
		?>
		<<?php
		// PHPCS - the method get_html_tag is safe.
		echo $this->get_html_tag(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		?> <?php $this->print_render_attribute_string( '_wrapper' ); ?>>
			<div <?php $this->print_render_attribute_string( '_widget_wrapper' ); ?>>
		<?php if ( $has_background_overlay ) : ?>
			<div <?php $this->print_render_attribute_string( '_background_overlay' ); ?>></div>
		<?php endif; ?>
		<?php
	}

	/**
	 * After column rendering.
	 *
	 * Used to add stuff after the column element.
	 *
	 * @since 1.0.0
	 * @access public
	 */
	public function after_render() {
		?>
			</div>
		</<?php
		// PHPCS - the method get_html_tag is safe.
		echo $this->get_html_tag(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
		<?php
	}

	/**
	 * Add column render attributes.
	 *
	 * Used to add attributes to the current column wrapper HTML tag.
	 *
	 * @since 1.3.0
	 * @access protected
	 */
	protected function add_render_attributes() {

		$is_inner = $this->get_data( 'isInner' );

		$column_type = ! empty( $is_inner ) ? 'inner' : 'top';

		$settings = $this->get_settings();

		$this->add_render_attribute(
			'_wrapper', 'class', [
				'refraction-column',
				'refraction-col-' . $settings['_column_size'],
				'refraction-' . $column_type . '-column',
			]
		);

		parent::add_render_attributes();
	}

	/**
	 * Get default child type.
	 *
	 * Retrieve the column child type based on element data.
	 *
	 * @since 1.0.0
	 * @access protected
	 *
	 * @param array $element_data Element ID.
	 *
	 * @return Element_Base|false Column default child type.
	 */
	protected function _get_default_child_type( array $element_data ) {
		if ( 'section' === $element_data['elType'] ) {
			return Plugin::$instance->elements_manager->get_element_types( 'section' );
		}

		if ( 'container' === $element_data['elType'] ) {
			return Plugin::$instance->elements_manager->get_element_types( 'container' );
		}

		// If the element doesn't exists (disabled element, experiment, etc.), return false to prevent errors.
		if ( empty( $element_data['widgetType'] ) ) {
			return false;
		}

		return Plugin::$instance->widgets_manager->get_widget_types( $element_data['widgetType'] );
	}

	/**
	 * Get HTML tag.
	 *
	 * Retrieve the column element HTML tag.
	 *
	 * @since 1.5.3
	 * @access private
	 *
	 * @return string Column HTML tag.
	 */
	private function get_html_tag() {
		$html_tag = $this->get_settings( 'html_tag' );

		if ( empty( $html_tag ) ) {
			$html_tag = 'div';
		}

		return Utils::validate_html_tag( $html_tag );
	}
}
