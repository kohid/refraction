<?php
namespace Refraction\Modules\ThemeBuilder\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Image_Size;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Site Logo: the logo of the site (Appearance > Customize > Site Identity) or an image of your choice.
 */
class Site_Logo extends Theme_Widget_Base {

	public function get_name() {
		return 'theme-site-logo';
	}

	public function get_title() {
		return esc_html__( 'Site Logo', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-site-logo';
	}

	public function get_keywords() {
		return [ 'site', 'logo', 'brand', 'identity' ];
	}

	protected function register_controls() {
		$this->start_controls_section(
			'section_content',
			[
				'label' => esc_html__( 'Site Logo', 'refraction' ),
			]
		);

		$this->add_control(
			'source',
			[
				'label' => esc_html__( 'Image', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => [
					'site' => esc_html__( 'Logo of the site', 'refraction' ),
					'custom' => esc_html__( 'Custom image', 'refraction' ),
				],
				'default' => 'site',
			]
		);

		$this->add_control(
			'image',
			[
				'label' => esc_html__( 'Choose Image', 'refraction' ),
				'type' => Controls_Manager::MEDIA,
				'default' => [
					'url' => '',
				],
				'condition' => [ 'source' => 'custom' ],
			]
		);

		$this->add_group_control(
			Group_Control_Image_Size::get_type(),
			[
				'name' => 'image',
				'default' => 'full',
				'exclude' => [ 'custom' ],
			]
		);

		$this->add_link_choice_control( 'link_to', true );

		$this->end_controls_section();

		$this->start_controls_section(
			'section_style',
			[
				'label' => esc_html__( 'Logo', 'refraction' ),
				'tab' => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_responsive_control(
			'align',
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
				],
				'classes' => 'refraction-control-start-end',
				'selectors_dictionary' => [
					'left' => is_rtl() ? 'end' : 'start',
					'right' => is_rtl() ? 'start' : 'end',
				],
				'selectors' => [
					'{{WRAPPER}}' => 'text-align: {{VALUE}};',
				],
			]
		);

		$this->add_responsive_control(
			'width',
			[
				'label' => esc_html__( 'Width', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', '%', 'vw', 'custom' ],
				'range' => [
					'px' => [ 'min' => 10, 'max' => 800 ],
					'%' => [ 'min' => 5, 'max' => 100 ],
					'vw' => [ 'min' => 5, 'max' => 100 ],
				],
				'selectors' => [
					'{{WRAPPER}} .refraction-theme-logo img' => 'width: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$this->add_responsive_control(
			'max_width',
			[
				'label' => esc_html__( 'Max Width', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', '%', 'vw', 'custom' ],
				'range' => [
					'px' => [ 'min' => 10, 'max' => 800 ],
					'%' => [ 'min' => 5, 'max' => 100 ],
					'vw' => [ 'min' => 5, 'max' => 100 ],
				],
				'default' => [ 'unit' => '%', 'size' => 100 ],
				'selectors' => [
					'{{WRAPPER}} .refraction-theme-logo img' => 'max-width: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$this->add_control(
			'radius',
			[
				'label' => esc_html__( 'Border Radius', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%', 'custom' ],
				'selectors' => [
					'{{WRAPPER}} .refraction-theme-logo img' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);

		$this->add_control(
			'opacity',
			[
				'label' => esc_html__( 'Opacity', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => 0.1, 'max' => 1, 'step' => 0.01 ] ],
				'selectors' => [
					'{{WRAPPER}} .refraction-theme-logo img' => 'opacity: {{SIZE}};',
				],
			]
		);

		$this->add_control(
			'opacity_hover',
			[
				'label' => esc_html__( 'Opacity on hover', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => 0.1, 'max' => 1, 'step' => 0.01 ] ],
				'selectors' => [
					'{{WRAPPER}} .refraction-theme-logo a:hover img' => 'opacity: {{SIZE}};',
				],
			]
		);

		$this->end_controls_section();
	}

	/** @return array<string, mixed> Settings in the shape Group_Control_Image_Size expects, or an empty array. */
	private function get_image_settings(): array {
		$settings = $this->get_settings_for_display();

		if ( 'custom' === ( $settings['source'] ?? 'site' ) ) {
			return ! empty( $settings['image']['url'] ) ? $settings : [];
		}

		$logo_id = (int) get_theme_mod( 'custom_logo' );

		if ( ! $logo_id ) {
			return [];
		}

		$settings['image'] = [ 'id' => $logo_id, 'url' => (string) wp_get_attachment_url( $logo_id ) ];

		return $settings;
	}

	protected function render() {
		$settings = $this->get_image_settings();

		if ( ! $settings ) {
			// No logo: show the site name so the header never ends up empty.
			$name = (string) get_bloginfo( 'name' );

			if ( '' === $name ) {
				$this->print_editor_hint( __( 'Add a logo in Appearance > Customize > Site Identity, or pick a custom image.', 'refraction' ) );

				return;
			}

			echo '<div class="refraction-theme-logo refraction-theme-logo--text">';
			$close = $this->open_choice_link();
			echo esc_html( $name );
			echo $close; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Static closing tag.
			echo '</div>';

			return;
		}

		echo '<div class="refraction-theme-logo">';
		$close = $this->open_choice_link();
		Group_Control_Image_Size::print_attachment_image_html( $settings );
		echo $close; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Static closing tag.
		echo '</div>';
	}
}
