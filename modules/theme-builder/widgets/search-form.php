<?php
namespace Refraction\Modules\ThemeBuilder\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Border;
use Refraction\Group_Control_Typography;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Search Form: a search box that sends visitors to the Search Results page.
 */
class Search_Form extends Theme_Widget_Base {

	public function get_name() {
		return 'theme-search-form';
	}

	public function get_title() {
		return esc_html__( 'Search Form', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-site-search';
	}

	public function get_keywords() {
		return [ 'search', 'form', 'find', 'query' ];
	}

	protected function register_controls() {
		$this->start_controls_section(
			'section_content',
			[
				'label' => esc_html__( 'Search Form', 'refraction' ),
			]
		);

		$this->add_control(
			'skin',
			[
				'label' => esc_html__( 'Skin', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => [
					'classic' => esc_html__( 'Classic', 'refraction' ),
					'minimal' => esc_html__( 'Minimal', 'refraction' ),
				],
				'default' => 'classic',
				'prefix_class' => 'refraction-theme-search--',
			]
		);

		$this->add_control(
			'placeholder',
			[
				'label' => esc_html__( 'Placeholder', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__( 'Search…', 'refraction' ),
			]
		);

		$this->add_control(
			'button_text',
			[
				'label' => esc_html__( 'Button Text', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__( 'Search', 'refraction' ),
				'condition' => [ 'skin' => 'classic' ],
			]
		);

		$types = [ '' => esc_html__( 'Everything', 'refraction' ) ];

		foreach ( get_post_types( [ 'public' => true, 'exclude_from_search' => false ], 'objects' ) as $type ) {
			if ( 'attachment' !== $type->name ) {
				$types[ $type->name ] = $type->labels->name;
			}
		}

		$this->add_control(
			'post_type',
			[
				'label' => esc_html__( 'Search In', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => $types,
				'default' => '',
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'section_style_input',
			[
				'label' => esc_html__( 'Input', 'refraction' ),
				'tab' => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_responsive_control(
			'height',
			[
				'label' => esc_html__( 'Height', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'em', 'custom' ],
				'range' => [ 'px' => [ 'min' => 20, 'max' => 120 ] ],
				'selectors' => [
					'{{WRAPPER}} .refraction-theme-search__input, {{WRAPPER}} .refraction-theme-search__button' => 'min-height: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'input_typography',
				'selector' => '{{WRAPPER}} .refraction-theme-search__input',
			]
		);

		$this->add_control(
			'input_color',
			[
				'label' => esc_html__( 'Text Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .refraction-theme-search__input' => 'color: {{VALUE}};',
				],
			]
		);

		$this->add_control(
			'input_background',
			[
				'label' => esc_html__( 'Background', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .refraction-theme-search__input' => 'background-color: {{VALUE}};',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name' => 'input_border',
				'selector' => '{{WRAPPER}} .refraction-theme-search__input',
			]
		);

		$this->add_control(
			'input_radius',
			[
				'label' => esc_html__( 'Border Radius', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%', 'custom' ],
				'selectors' => [
					'{{WRAPPER}} .refraction-theme-search__input' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'section_style_button',
			[
				'label' => esc_html__( 'Button', 'refraction' ),
				'tab' => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_control(
			'button_color',
			[
				'label' => esc_html__( 'Text Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .refraction-theme-search__button' => 'color: {{VALUE}}; fill: {{VALUE}};',
				],
			]
		);

		$this->add_control(
			'button_background',
			[
				'label' => esc_html__( 'Background', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .refraction-theme-search__button' => 'background-color: {{VALUE}};',
				],
			]
		);

		$this->add_control(
			'button_hover_background',
			[
				'label' => esc_html__( 'Hover Background', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .refraction-theme-search__button:hover, {{WRAPPER}} .refraction-theme-search__button:focus' => 'background-color: {{VALUE}};',
				],
			]
		);

		$this->end_controls_section();
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		$id = 'refraction-search-' . $this->get_id();
		$minimal = 'minimal' === $settings['skin'];
		$label = '' !== trim( (string) $settings['button_text'] ) ? (string) $settings['button_text'] : __( 'Search', 'refraction' );

		echo '<form role="search" method="get" class="refraction-theme-search" action="' . esc_url( home_url( '/' ) ) . '">';
		echo '<label class="refraction-theme-search__label" for="' . esc_attr( $id ) . '">' . esc_html__( 'Search for:', 'refraction' ) . '</label>';
		echo '<input type="search" class="refraction-theme-search__input" id="' . esc_attr( $id ) . '" name="s" value="' . esc_attr( get_search_query( false ) ) . '" placeholder="' . esc_attr( (string) $settings['placeholder'] ) . '">';

		if ( '' !== (string) $settings['post_type'] && post_type_exists( (string) $settings['post_type'] ) ) {
			echo '<input type="hidden" name="post_type" value="' . esc_attr( (string) $settings['post_type'] ) . '">';
		}

		echo '<button type="submit" class="refraction-theme-search__button"' . ( $minimal ? ' aria-label="' . esc_attr( $label ) . '"' : '' ) . '>';

		if ( $minimal ) {
			echo '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15.5 15.5L21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
		} else {
			echo esc_html( $label );
		}

		echo '</button></form>';
	}
}
