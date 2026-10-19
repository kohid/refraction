<?php
namespace Refraction\Modules\ThemeBuilder\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Border;
use Refraction\Group_Control_Box_Shadow;
use Refraction\Group_Control_Image_Size;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Featured Image: the featured image of the current post.
 */
class Featured_Image extends Theme_Widget_Base {

	public function get_name() {
		return 'theme-featured-image';
	}

	public function get_title() {
		return esc_html__( 'Featured Image', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-featured-image';
	}

	public function get_keywords() {
		return [ 'image', 'featured', 'thumbnail', 'post' ];
	}

	protected function register_controls() {
		$this->start_controls_section(
			'section_content',
			[
				'label' => esc_html__( 'Featured Image', 'refraction' ),
			]
		);

		$this->add_group_control(
			Group_Control_Image_Size::get_type(),
			[
				'name' => 'image',
				'default' => 'large',
				'exclude' => [ 'custom' ],
			]
		);

		$this->add_control(
			'link_to',
			[
				'label' => esc_html__( 'Link', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => [
					'none' => esc_html__( 'None', 'refraction' ),
					'post' => esc_html__( 'Post', 'refraction' ),
					'file' => esc_html__( 'Image file', 'refraction' ),
					'custom' => esc_html__( 'Custom URL', 'refraction' ),
				],
				'default' => 'none',
			]
		);

		$this->add_control(
			'link_custom',
			[
				'label' => esc_html__( 'Link', 'refraction' ),
				'type' => Controls_Manager::URL,
				'placeholder' => esc_html__( 'https://your-link.com', 'refraction' ),
				'condition' => [ 'link_to' => 'custom' ],
			]
		);

		$this->add_control(
			'placeholder',
			[
				'label' => esc_html__( 'Placeholder when there is no image', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => '',
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'section_style',
			[
				'label' => esc_html__( 'Image', 'refraction' ),
				'tab' => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_responsive_control(
			'align',
			[
				'label' => esc_html__( 'Alignment', 'refraction' ),
				'type' => Controls_Manager::CHOOSE,
				'options' => [
					'start' => [ 'title' => esc_html__( 'Start', 'refraction' ), 'icon' => 'rficon-text-align-left' ],
					'center' => [ 'title' => esc_html__( 'Center', 'refraction' ), 'icon' => 'rficon-text-align-center' ],
					'end' => [ 'title' => esc_html__( 'End', 'refraction' ), 'icon' => 'rficon-text-align-right' ],
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
					'px' => [ 'min' => 10, 'max' => 1600 ],
					'%' => [ 'min' => 5, 'max' => 100 ],
					'vw' => [ 'min' => 5, 'max' => 100 ],
				],
				'selectors' => [
					'{{WRAPPER}} .refraction-theme-image img' => 'width: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$this->add_responsive_control(
			'height',
			[
				'label' => esc_html__( 'Height', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'vh', 'custom' ],
				'range' => [
					'px' => [ 'min' => 10, 'max' => 1200 ],
					'vh' => [ 'min' => 5, 'max' => 100 ],
				],
				'selectors' => [
					'{{WRAPPER}} .refraction-theme-image img' => 'height: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$this->add_control(
			'object_fit',
			[
				'label' => esc_html__( 'Object Fit', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => [
					'' => esc_html__( 'Default', 'refraction' ),
					'cover' => esc_html__( 'Cover', 'refraction' ),
					'contain' => esc_html__( 'Contain', 'refraction' ),
					'fill' => esc_html__( 'Fill', 'refraction' ),
				],
				'selectors' => [
					'{{WRAPPER}} .refraction-theme-image img' => 'object-fit: {{VALUE}};',
				],
				'condition' => [ 'height[size]!' => '' ],
			]
		);

		$this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name' => 'image_border',
				'selector' => '{{WRAPPER}} .refraction-theme-image img',
			]
		);

		$this->add_control(
			'radius',
			[
				'label' => esc_html__( 'Border Radius', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%', 'custom' ],
				'selectors' => [
					'{{WRAPPER}} .refraction-theme-image img' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Box_Shadow::get_type(),
			[
				'name' => 'image_shadow',
				'selector' => '{{WRAPPER}} .refraction-theme-image img',
			]
		);

		$this->end_controls_section();
	}

	protected function render() {
		$post = get_post();
		$thumbnail_id = $post ? (int) get_post_thumbnail_id( $post ) : 0;
		$settings = $this->get_settings_for_display();

		if ( $thumbnail_id ) {
			$settings['image'] = [ 'id' => $thumbnail_id, 'url' => (string) wp_get_attachment_url( $thumbnail_id ) ];
		} elseif ( 'yes' === $settings['placeholder'] ) {
			$settings['image'] = [ 'id' => '', 'url' => Utils::get_placeholder_image_src() ];
		} else {
			$this->print_editor_hint( __( 'This post has no featured image.', 'refraction' ) );

			return;
		}

		$href = '';

		switch ( $settings['link_to'] ) {
			case 'post':
				$href = $post ? (string) get_permalink( $post ) : '';
				break;
			case 'file':
				$href = $thumbnail_id ? (string) wp_get_attachment_url( $thumbnail_id ) : '';
				break;
			case 'custom':
				$href = (string) ( $settings['link_custom']['url'] ?? '' );
				break;
		}

		echo '<div class="refraction-theme-image">';

		if ( $href ) {
			echo '<a href="' . esc_url( $href ) . '">';
		}

		Group_Control_Image_Size::print_attachment_image_html( $settings );

		if ( $href ) {
			echo '</a>';
		}

		echo '</div>';
	}
}
