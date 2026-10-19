<?php
namespace Refraction;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use Refraction\Core\Kits\Documents\Tabs\Global_Colors;
use Refraction\Core\Kits\Documents\Tabs\Global_Typography;

/**
 * Refraction icon box widget.
 *
 * Refraction widget that displays an icon, a headline and a text.
 *
 * @since 1.0.0
 */
class Widget_Icon_Box extends Widget_Base {

	/**
	 * Get widget name.
	 *
	 * Retrieve icon box widget name.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @return string Widget name.
	 */
	public function get_name() {
		return 'icon-box';
	}

	/**
	 * Get widget title.
	 *
	 * Retrieve icon box widget title.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @return string Widget title.
	 */
	public function get_title() {
		return esc_html__( 'Icon Box', 'refraction' );
	}

	/**
	 * Get widget icon.
	 *
	 * Retrieve icon box widget icon.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @return string Widget icon.
	 */
	public function get_icon() {
		return 'rficon-icon-box';
	}

	/**
	 * Get widget keywords.
	 *
	 * Retrieve the list of keywords the widget belongs to.
	 *
	 * @since 2.1.0
	 * @access public
	 *
	 * @return array Widget keywords.
	 */
	public function get_keywords() {
		return [ 'icon box', 'icon' ];
	}

	protected function is_dynamic_content(): bool {
		return false;
	}

	public function has_widget_inner_wrapper(): bool {
		return ! Plugin::$instance->experiments->is_feature_active( 'e_optimized_markup' );
	}

	/**
	 * Get style dependencies.
	 *
	 * Retrieve the list of style dependencies the widget requires.
	 *
	 * @since 3.24.0
	 * @access public
	 *
	 * @return array Widget style dependencies.
	 */
	public function get_style_depends(): array {
		return [ 'widget-icon-box' ];
	}

	/**
	 * Register icon box widget controls.
	 *
	 * Adds different input fields to allow the user to change and customize the widget settings.
	 *
	 * @since 3.1.0
	 * @access protected
	 */
	protected function register_controls() {
		$this->start_controls_section(
			'section_icon',
			[
				'label' => esc_html__( 'Icon Box', 'refraction' ),
			]
		);

		$this->add_control(
			'selected_icon',
			[
				'label' => esc_html__( 'Icon', 'refraction' ),
				'type' => Controls_Manager::ICONS,
				'fa4compatibility' => 'icon',
				'default' => [
					'value' => 'fas fa-star',
					'library' => 'fa-solid',
				],
			]
		);

		$this->add_control(
			'view',
			[
				'label' => esc_html__( 'View', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => [
					'default' => esc_html__( 'Default', 'refraction' ),
					'stacked' => esc_html__( 'Stacked', 'refraction' ),
					'framed' => esc_html__( 'Framed', 'refraction' ),
				],
				'default' => 'default',
				'prefix_class' => 'refraction-view-',
				'condition' => [
					'selected_icon[value]!' => '',
				],
			]
		);

		$this->add_control(
			'shape',
			[
				'label' => esc_html__( 'Shape', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => [
					'square' => esc_html__( 'Square', 'refraction' ),
					'rounded' => esc_html__( 'Rounded', 'refraction' ),
					'circle' => esc_html__( 'Circle', 'refraction' ),
				],
				'default' => 'circle',
				'condition' => [
					'view!' => 'default',
					'selected_icon[value]!' => '',
				],
				'prefix_class' => 'refraction-shape-',
			]
		);

		$this->add_control(
			'title_text',
			[
				'label' => esc_html__( 'Title', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'dynamic' => [
					'active' => true,
				],
				'default' => esc_html__( 'This is the heading', 'refraction' ),
				'placeholder' => esc_html__( 'Enter your title', 'refraction' ),
				'label_block' => true,
			]
		);

		$this->add_control(
			'description_text',
			[
				'label' => esc_html__( 'Description', 'refraction' ),
				'type' => Controls_Manager::TEXTAREA,
				'dynamic' => [
					'active' => true,
				],
				'default' => esc_html__( 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut elit tellus, luctus nec ullamcorper mattis, pulvinar dapibus leo.', 'refraction' ),
				'placeholder' => esc_html__( 'Enter your description', 'refraction' ),
				'rows' => 10,
			]
		);

		$this->add_control(
			'link',
			[
				'label' => esc_html__( 'Link', 'refraction' ),
				'type' => Controls_Manager::URL,
				'dynamic' => [
					'active' => true,
				],
				'separator' => 'before',
			]
		);

		$this->add_control(
			'title_size',
			[
				'label' => esc_html__( 'Title HTML Tag', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => [
					'h1' => 'H1',
					'h2' => 'H2',
					'h3' => 'H3',
					'h4' => 'H4',
					'h5' => 'H5',
					'h6' => 'H6',
					'div' => 'div',
					'span' => 'span',
					'p' => 'p',
				],
				'default' => 'h3',
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'section_style_box',
			[
				'label' => esc_html__( 'Box', 'refraction' ),
				'tab'   => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_responsive_control(
			'position',
			[
				'label' => esc_html__( 'Icon Position', 'refraction' ),
				'type' => Controls_Manager::CHOOSE,
				'default' => 'block-start',
				'mobile_default' => 'block-start',
				'options' => [
					'inline-start' => [
						'title' => esc_html__( 'Start', 'refraction' ),
						'icon' => 'rficon-h-align-left',
					],
					'inline-end' => [
						'title' => esc_html__( 'End', 'refraction' ),
						'icon' => 'rficon-h-align-right',
					],
					'block-start' => [
						'title' => esc_html__( 'Top', 'refraction' ),
						'icon' => 'rficon-v-align-top',
					],
					'block-end' => [
						'title' => esc_html__( 'Bottom', 'refraction' ),
						'icon' => 'rficon-v-align-bottom',
					],
				],
				'classes' => 'refraction-control-start-end',
				'classes_dictionary' => [
					'left' => is_rtl() ? 'inline-end' : 'inline-start',
					'right' => is_rtl() ? 'inline-start' : 'inline-end',
					'top' => 'block-start',
					'bottom' => 'block-end',
				],
				'prefix_class' => 'refraction%s-position-',
				'condition' => [
					'selected_icon[value]!' => '',
				],
			]
		);

		$this->add_responsive_control(
			'content_vertical_alignment',
			[
				'label' => esc_html__( 'Vertical Alignment', 'refraction' ),
				'type' => Controls_Manager::CHOOSE,
				'options' => [
					'top' => [
						'title' => esc_html__( 'Top', 'refraction' ),
						'icon' => 'rficon-v-align-top',
					],
					'middle' => [
						'title' => esc_html__( 'Middle', 'refraction' ),
						'icon' => 'rficon-v-align-middle',
					],
					'bottom' => [
						'title' => esc_html__( 'Bottom', 'refraction' ),
						'icon' => 'rficon-v-align-bottom',
					],
				],
				'default' => 'top',
				'selectors_dictionary' => [
					'top' => 'start',
					'middle' => 'center',
					'bottom' => 'end',
				],
				'selectors' => [
					'{{WRAPPER}} .refraction-icon-box-wrapper' => 'align-items: {{VALUE}};',
				],
				'condition' => [
					'selected_icon[value]!' => '',
					'position' => [ 'left', 'right', 'inline-start', 'inline-end' ],
				],
			]
		);

		$this->add_responsive_control(
			'text_align',
			[
				'label' => esc_html__( 'Alignment', 'refraction' ),
				'type' => Controls_Manager::CHOOSE,
				'options' => [
					'start' => [
						'title' => esc_html__( 'Start', 'refraction' ),
						'icon' => 'rficon-text-align-left',
					],
					'center' => [
						'title' => esc_html__( 'Center', 'refraction' ),
						'icon' => 'rficon-text-align-center',
					],
					'end' => [
						'title' => esc_html__( 'End', 'refraction' ),
						'icon' => 'rficon-text-align-right',
					],
					'justify' => [
						'title' => esc_html__( 'Justified', 'refraction' ),
						'icon' => 'rficon-text-align-justify',
					],
				],
				'classes' => 'refraction-control-start-end',
				'selectors_dictionary' => [
					'left' => is_rtl() ? 'end' : 'start',
					'right' => is_rtl() ? 'start' : 'end',
				],
				'selectors' => [
					'{{WRAPPER}} .refraction-icon-box-wrapper' => 'text-align: {{VALUE}};',
				],
				'separator' => 'after',
			]
		);

		$this->add_responsive_control(
			'icon_space',
			[
				'label' => esc_html__( 'Icon Spacing', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', '%', 'em', 'rem', 'vw', 'custom' ],
				'default' => [
					'size' => 15,
				],
				'range' => [
					'px' => [
						'max' => 100,
					],
					'em' => [
						'max' => 10,
					],
					'rem' => [
						'max' => 10,
					],
				],
				'selectors' => [
					'{{WRAPPER}} .refraction-icon-box-wrapper' => 'gap: {{SIZE}}{{UNIT}};',
				],
				'condition' => [
					'selected_icon[value]!' => '',
				],
			]
		);

		$this->add_responsive_control(
			'title_bottom_space',
			[
				'label' => esc_html__( 'Content Spacing', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'em', 'rem', 'custom' ],
				'range' => [
					'px' => [
						'max' => 100,
					],
					'em' => [
						'min' => 0,
						'max' => 10,
					],
					'rem' => [
						'min' => 0,
						'max' => 10,
					],
				],
				'selectors' => [
					'{{WRAPPER}} .refraction-icon-box-title' => 'margin-block-end: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'section_style_icon',
			[
				'label' => esc_html__( 'Icon', 'refraction' ),
				'tab'   => Controls_Manager::TAB_STYLE,
				'condition' => [
					'selected_icon[value]!' => '',
				],
			]
		);

		$this->start_controls_tabs( 'icon_colors' );

		$this->start_controls_tab(
			'icon_colors_normal',
			[
				'label' => esc_html__( 'Normal', 'refraction' ),
			]
		);

		$this->add_control(
			'primary_color',
			[
				'label' => esc_html__( 'Primary Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'global' => [
					'default' => Global_Colors::COLOR_PRIMARY,
				],
				'default' => '',
				'selectors' => [
					'{{WRAPPER}}.refraction-view-stacked .refraction-icon' => 'background-color: {{VALUE}};',
					'{{WRAPPER}}.refraction-view-framed .refraction-icon, {{WRAPPER}}.refraction-view-default .refraction-icon' => 'fill: {{VALUE}}; color: {{VALUE}}; border-color: {{VALUE}};',
				],
			]
		);

		$this->add_control(
			'secondary_color',
			[
				'label' => esc_html__( 'Secondary Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'default' => '',
				'condition' => [
					'view!' => 'default',
				],
				'selectors' => [
					'{{WRAPPER}}.refraction-view-framed .refraction-icon' => 'background-color: {{VALUE}};',
					'{{WRAPPER}}.refraction-view-stacked .refraction-icon' => 'fill: {{VALUE}}; color: {{VALUE}};',
				],
			]
		);

		$this->end_controls_tab();

		$this->start_controls_tab(
			'icon_colors_hover',
			[
				'label' => esc_html__( 'Hover', 'refraction' ),
			]
		);

		$this->add_control(
			'hover_primary_color',
			[
				'label' => esc_html__( 'Primary Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'default' => '',
				'selectors' => [
					'{{WRAPPER}}.refraction-view-stacked:has(:hover) .refraction-icon,
					 {{WRAPPER}}.refraction-view-stacked:has(:focus) .refraction-icon' => 'background-color: {{VALUE}};',
					'{{WRAPPER}}.refraction-view-framed:has(:hover) .refraction-icon,
					 {{WRAPPER}}.refraction-view-default:has(:hover) .refraction-icon,
					 {{WRAPPER}}.refraction-view-framed:has(:focus) .refraction-icon,
					 {{WRAPPER}}.refraction-view-default:has(:focus) .refraction-icon' => 'fill: {{VALUE}}; color: {{VALUE}}; border-color: {{VALUE}};',
				],
			]
		);

		$this->add_control(
			'hover_secondary_color',
			[
				'label' => esc_html__( 'Secondary Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'default' => '',
				'condition' => [
					'view!' => 'default',
				],
				'selectors' => [
					'{{WRAPPER}}.refraction-view-framed:has(:hover) .refraction-icon,
					 {{WRAPPER}}.refraction-view-framed:has(:focus) .refraction-icon' => 'background-color: {{VALUE}};',
					'{{WRAPPER}}.refraction-view-stacked:has(:hover) .refraction-icon,
					 {{WRAPPER}}.refraction-view-stacked:has(:focus) .refraction-icon' => 'fill: {{VALUE}}; color: {{VALUE}};',
				],
			]
		);

		$this->add_control(
			'hover_icon_colors_transition_duration',
			[
				'label' => esc_html__( 'Transition Duration', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 's', 'ms', 'custom' ],
				'default' => [
					'unit' => 's',
				],
				'selectors' => [
					'{{WRAPPER}} .refraction-icon' => 'transition-duration: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$this->add_control(
			'hover_animation',
			[
				'label' => esc_html__( 'Hover Animation', 'refraction' ),
				'type' => Controls_Manager::HOVER_ANIMATION,
			]
		);

		$this->end_controls_tab();

		$this->end_controls_tabs();

		$this->add_responsive_control(
			'icon_size',
			[
				'label' => esc_html__( 'Size', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', '%', 'em', 'rem', 'vw', 'custom' ],
				'range' => [
					'px' => [
						'min' => 6,
						'max' => 300,
					],
				],
				'selectors' => [
					'{{WRAPPER}} .refraction-icon' => 'font-size: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$this->add_responsive_control(
			'icon_padding',
			[
				'label' => esc_html__( 'Padding', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', '%', 'em', 'rem', 'vw', 'custom' ],
				'selectors' => [
					'{{WRAPPER}} .refraction-icon' => 'padding: {{SIZE}}{{UNIT}};',
				],
				'range' => [
					'px' => [
						'max' => 50,
					],
					'em' => [
						'min' => 0,
						'max' => 5,
					],
					'rem' => [
						'min' => 0,
						'max' => 5,
					],
				],
				'condition' => [
					'view!' => 'default',
				],
			]
		);

		$active_breakpoints = Plugin::$instance->breakpoints->get_active_breakpoints();

		$rotate_device_args = [];

		$rotate_device_settings = [
			'default' => [
				'unit' => 'deg',
			],
		];

		foreach ( $active_breakpoints as $breakpoint_name => $breakpoint ) {
			$rotate_device_args[ $breakpoint_name ] = $rotate_device_settings;
		}

		$this->add_responsive_control(
			'rotate',
			[
				'label' => esc_html__( 'Rotate', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'deg', 'grad', 'rad', 'turn', 'custom' ],
				'default' => [
					'unit' => 'deg',
				],
				'tablet_default' => [
					'unit' => 'deg',
				],
				'mobile_default' => [
					'unit' => 'deg',
				],
				'device_args' => $rotate_device_args,
				'selectors' => [
					'{{WRAPPER}} .refraction-icon i' => 'transform: rotate({{SIZE}}{{UNIT}});',
				],
			]
		);

		$this->add_responsive_control(
			'border_width',
			[
				'label' => esc_html__( 'Border Width', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%', 'em', 'rem', 'vw', 'custom' ],
				'selectors' => [
					'{{WRAPPER}} .refraction-icon' => 'border-width: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
				'condition' => [
					'view' => 'framed',
				],
			]
		);

		$this->add_responsive_control(
			'border_radius',
			[
				'label' => esc_html__( 'Border Radius', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%', 'em', 'rem', 'custom' ],
				'selectors' => [
					'{{WRAPPER}} .refraction-icon' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
				'condition' => [
					'view!' => 'default',
				],
				'separator' => 'before',
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'section_style_content',
			[
				'label' => esc_html__( 'Content', 'refraction' ),
				'tab'   => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_control(
			'heading_title',
			[
				'label' => esc_html__( 'Title', 'refraction' ),
				'type' => Controls_Manager::HEADING,
				'separator' => 'before',
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'title_typography',
				'selector' => '{{WRAPPER}} .refraction-icon-box-title, {{WRAPPER}} .refraction-icon-box-title a',
				'global' => [
					'default' => Global_Typography::TYPOGRAPHY_PRIMARY,
				],
			]
		);

		$this->add_group_control(
			Group_Control_Text_Stroke::get_type(),
			[
				'name' => 'text_stroke',
				'selector' => '{{WRAPPER}} .refraction-icon-box-title',
			]
		);

		$this->add_group_control(
			Group_Control_Text_Shadow::get_type(),
			[
				'name' => 'title_shadow',
				'selector' => '{{WRAPPER}} .refraction-icon-box-title',
			]
		);

		$this->start_controls_tabs( 'icon_box_title_colors' );

		$this->start_controls_tab(
			'icon_box_title_colors_normal',
			[
				'label' => esc_html__( 'Normal', 'refraction' ),
			]
		);

		$this->add_control(
			'title_color',
			[
				'label' => esc_html__( 'Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'default' => '',
				'selectors' => [
					'{{WRAPPER}} .refraction-icon-box-title' => 'color: {{VALUE}};',
				],
				'global' => [
					'default' => Global_Colors::COLOR_PRIMARY,
				],
			]
		);

		$this->end_controls_tab();

		$this->start_controls_tab(
			'icon_box_title_colors_hover',
			[
				'label' => esc_html__( 'Hover', 'refraction' ),
			]
		);

		$this->add_control(
			'hover_title_color',
			[
				'label' => esc_html__( 'Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'default' => '',
				'selectors' => [
					'{{WRAPPER}}:has(:hover) .refraction-icon-box-title,
					 {{WRAPPER}}:has(:focus) .refraction-icon-box-title' => 'color: {{VALUE}};',
				],
				'global' => [
					'default' => Global_Colors::COLOR_PRIMARY,
				],
			]
		);

		$this->add_control(
			'hover_title_color_transition_duration',
			[
				'label' => esc_html__( 'Transition Duration', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 's', 'ms', 'custom' ],
				'default' => [
					'unit' => 's',
				],
				'selectors' => [
					'{{WRAPPER}} .refraction-icon-box-title' => 'transition-duration: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$this->end_controls_tab();

		$this->end_controls_tabs();

		$this->add_control(
			'heading_description',
			[
				'label' => esc_html__( 'Description', 'refraction' ),
				'type' => Controls_Manager::HEADING,
				'separator' => 'before',
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'description_typography',
				'selector' => '{{WRAPPER}} .refraction-icon-box-description',
				'global' => [
					'default' => Global_Typography::TYPOGRAPHY_TEXT,
				],
			]
		);

		$this->add_group_control(
			Group_Control_Text_Shadow::get_type(),
			[
				'name' => 'description_shadow',
				'selector' => '{{WRAPPER}} .refraction-icon-box-description',
			]
		);

		$this->add_control(
			'description_color',
			[
				'label' => esc_html__( 'Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'default' => '',
				'selectors' => [
					'{{WRAPPER}} .refraction-icon-box-description' => 'color: {{VALUE}};',
				],
				'global' => [
					'default' => Global_Colors::COLOR_TEXT,
				],
			]
		);

		$this->end_controls_section();
	}

	/**
	 * Render icon box widget output on the frontend.
	 *
	 * Written in PHP and used to generate the final HTML.
	 *
	 * @since 1.0.0
	 * @access protected
	 */
	protected function render() {
		$settings = $this->get_settings_for_display();
		$has_link = ! empty( $settings['link']['url'] );
		$html_tag = $has_link ? 'a' : 'span';

		$this->add_render_attribute( 'icon', 'class', 'refraction-icon' );

		if ( ! empty( $settings['hover_animation'] ) ) {
			$this->add_render_attribute( 'icon', 'class', 'refraction-animation-' . $settings['hover_animation'] );
		}

		$has_icon = ! empty( $settings['selected_icon']['value'] );
		$has_content = ! Utils::is_empty( $settings['title_text'] ) || ! Utils::is_empty( $settings['description_text'] );

		if ( ! $has_icon && ! $has_content ) {
			return;
		}

		if ( $has_link ) {
			$this->add_link_attributes( 'link', $settings['link'] );
			$this->add_render_attribute( 'icon', 'tabindex', '-1' );
			if ( ! empty( $settings['title_text'] ) ) {
				$this->add_render_attribute( 'icon', 'aria-label', $settings['title_text'] );
			}
		}

		if ( ! isset( $settings['icon'] ) && ! Icons_Manager::is_migration_allowed() ) {
			// add old default
			$settings['icon'] = 'fa fa-star';
		}

		if ( ! empty( $settings['icon'] ) ) {
			$this->add_render_attribute( 'i', 'class', $settings['icon'] );
			$this->add_render_attribute( 'i', 'aria-hidden', 'true' );
		}

		$this->add_render_attribute( 'description_text', 'class', 'refraction-icon-box-description' );

		$this->add_inline_editing_attributes( 'title_text', 'none' );
		$this->add_inline_editing_attributes( 'description_text' );

		$migrated = isset( $settings['__fa4_migrated']['selected_icon'] );
		$is_new = ! isset( $settings['icon'] ) && Icons_Manager::is_migration_allowed();
		?>
		<div class="refraction-icon-box-wrapper">

			<?php if ( $has_icon ) : ?>
			<div class="refraction-icon-box-icon">
				<<?php Utils::print_validated_html_tag( $html_tag ); ?> <?php $this->print_render_attribute_string( 'link' ); ?> <?php $this->print_render_attribute_string( 'icon' ); ?>>
				<?php
				if ( $is_new || $migrated ) {
					Icons_Manager::render_icon( $settings['selected_icon'], [ 'aria-hidden' => 'true' ] );
				} elseif ( ! empty( $settings['icon'] ) ) {
					?><i <?php $this->print_render_attribute_string( 'i' ); ?>></i><?php
				}
				?>
				</<?php Utils::print_validated_html_tag( $html_tag ); ?>>
			</div>
			<?php endif; ?>

			<?php if ( $has_content ) : ?>
			<div class="refraction-icon-box-content">

				<?php if ( ! Utils::is_empty( $settings['title_text'] ) ) : ?>
					<<?php Utils::print_validated_html_tag( $settings['title_size'] ); ?> class="refraction-icon-box-title">
						<<?php Utils::print_validated_html_tag( $html_tag ); ?> <?php $this->print_render_attribute_string( 'link' ); ?> <?php $this->print_render_attribute_string( 'title_text' ); ?>>
							<?php echo wp_kses_post( $settings['title_text'] ); ?>
						</<?php Utils::print_validated_html_tag( $html_tag ); ?>>
					</<?php Utils::print_validated_html_tag( $settings['title_size'] ); ?>>
				<?php endif; ?>

				<?php if ( ! Utils::is_empty( $settings['description_text'] ) ) : ?>
					<p <?php $this->print_render_attribute_string( 'description_text' ); ?>>
						<?php echo wp_kses_post( $settings['description_text'] ); ?>
					</p>
				<?php endif; ?>

			</div>
			<?php endif; ?>

		</div>
		<?php
	}

	/**
	 * Render icon box widget output in the editor.
	 *
	 * Written as a Backbone JavaScript template and used to generate the live preview.
	 *
	 * @since 2.9.0
	 * @access protected
	 */
	protected function content_template() {
		?>
		<#
		// For older version `settings.icon` is needed.
		var hasIcon = settings.icon || settings.selected_icon.value;
		var hasContent = settings.title_text || settings.description_text;

		if ( ! hasIcon && ! hasContent ) {
			return;
		}

		var hasLink = settings.link?.url,
			htmlTag = hasLink ? 'a' : 'span',
			iconHTML = refraction.helpers.renderIcon( view, settings.selected_icon, { 'aria-hidden': true }, 'i' , 'object' ),
			migrated = refraction.helpers.isIconMigrated( settings, 'selected_icon' ),
			titleSizeTag = refraction.helpers.validateHTMLTag( settings.title_size );

		view.addRenderAttribute( 'icon', 'class', 'refraction-icon' );

		if ( '' !== settings.hover_animation ) {
			view.addRenderAttribute( 'icon', 'class', 'refraction-animation-' + settings.hover_animation );
		}

		if ( hasLink ) {
			view.addRenderAttribute( 'link', 'href', refraction.helpers.sanitizeUrl( settings.link?.url ) );
			view.addRenderAttribute( 'icon', 'tabindex', '-1' );
			if ( '' !== settings.title_text ) {
				view.addRenderAttribute( 'icon', 'aria-label', settings.title_text );
			}
		}

		view.addRenderAttribute( 'description_text', 'class', 'refraction-icon-box-description' );

		view.addInlineEditingAttributes( 'title_text', 'none' );
		view.addInlineEditingAttributes( 'description_text' );
		#>
		<div class="refraction-icon-box-wrapper">

			<# if ( hasIcon ) { #>
			<div class="refraction-icon-box-icon">
				<{{{ htmlTag }}} {{{ view.getRenderAttributeString( 'link' ) }}} {{{ view.getRenderAttributeString( 'icon' ) }}}>
					<# if ( iconHTML && iconHTML.rendered && ( ! settings.icon || migrated ) ) { #>
						{{{ refraction.helpers.sanitize( iconHTML.value ) }}}
					<# } else { #>
						<i class="{{ _.escape( settings.icon ) }}" aria-hidden="true"></i>
					<# } #>
				</{{{ htmlTag }}}>
			</div>
			<# } #>

			<# if ( hasContent ) { #>
			<div class="refraction-icon-box-content">

				<# if ( settings.title_text ) { #>
				<{{{ titleSizeTag }}} class="refraction-icon-box-title">
					<{{{ htmlTag }}} {{{ view.getRenderAttributeString( 'link' ) }}} {{{ view.getRenderAttributeString( 'title_text' ) }}}>
						{{{ refraction.helpers.sanitize( settings.title_text ) }}}
					</{{{ htmlTag }}}>
				</{{{ titleSizeTag }}}>
				<# } #>

				<# if ( settings.description_text ) { #>
				<p {{{ view.getRenderAttributeString( 'description_text' ) }}}>{{{ refraction.helpers.sanitize( settings.description_text ) }}}</p>
				<# } #>

			</div>
			<# } #>

		</div>
		<?php
	}

	public function on_import( $element ) {
		return Icons_Manager::on_import_migration( $element, 'icon', 'selected_icon', true );
	}

	public function render_markdown(): string {
		$settings = $this->get_settings_for_display();
		$title = Utils::html_to_plain_text( $settings['title_text'] ?? '' );
		$description = Utils::html_to_plain_text( $settings['description_text'] ?? '' );
		if ( empty( $title ) && empty( $description ) ) {
			return '';
		}
		$parts = [];
		if ( ! empty( $title ) ) {
			if ( ! empty( $settings['link']['url'] ) ) {
				$parts[] = '### [' . $title . '](' . esc_url( $settings['link']['url'] ) . ')';
			} else {
				$parts[] = '### ' . $title;
			}
		}
		if ( ! empty( $description ) ) {
			$parts[] = $description;
		}
		return implode( "\n\n", $parts );
	}
}
