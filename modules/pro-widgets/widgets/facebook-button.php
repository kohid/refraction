<?php
namespace Refraction\Modules\ProWidgets\Widgets;

use Refraction\Controls_Manager;
use Refraction\Modules\ProWidgets\Base\Facebook_Widget;
use Refraction\Modules\ProWidgets\Classes\Facebook_Url;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Facebook Like / Recommend button (plain iframe).
 */
class Facebook_Button extends Facebook_Widget {

	public function get_name() {
		return 'refraction-facebook-button';
	}

	public function get_title() {
		return esc_html__( 'Facebook Button', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-facebook-like-box';
	}

	public function get_keywords() {
		return [ 'facebook', 'like', 'recommend', 'button', 'social', 'share' ];
	}

	protected function register_controls() {
		$this->content_section( 'section_fb_button', esc_html__( 'Button', 'refraction' ) );

		$this->privacy_note_control();

		$this->add_control(
			'url_source',
			[
				'label' => esc_html__( 'Link to Like', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'current',
				'options' => [
					'current' => esc_html__( 'Current page', 'refraction' ),
					'custom' => esc_html__( 'Custom URL', 'refraction' ),
				],
			]
		);

		$this->add_control(
			'url',
			[
				'label' => esc_html__( 'URL', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'placeholder' => 'https://example.com/page',
				'label_block' => true,
				'dynamic' => [ 'active' => true ],
				'condition' => [ 'url_source' => 'custom' ],
			]
		);

		$this->add_control(
			'action',
			[
				'label' => esc_html__( 'Button', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'like',
				'options' => [
					'like' => esc_html__( 'Like', 'refraction' ),
					'recommend' => esc_html__( 'Recommend', 'refraction' ),
				],
			]
		);

		$this->add_control(
			'layout',
			[
				'label' => esc_html__( 'Layout', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'button_count',
				'options' => [
					'button' => esc_html__( 'Button', 'refraction' ),
					'button_count' => esc_html__( 'Button with count', 'refraction' ),
					'box_count' => esc_html__( 'Box with count', 'refraction' ),
					'standard' => esc_html__( 'Standard', 'refraction' ),
				],
			]
		);

		$this->add_control(
			'size',
			[
				'label' => esc_html__( 'Size', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'small',
				'options' => [
					'small' => esc_html__( 'Small', 'refraction' ),
					'large' => esc_html__( 'Large', 'refraction' ),
				],
			]
		);

		$this->add_control(
			'share',
			[
				'label' => esc_html__( 'Add a Share Button', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'return_value' => 'yes',
			]
		);

		$this->add_control(
			'frame_width',
			[
				'label' => esc_html__( 'Frame Width (px)', 'refraction' ),
				'type' => Controls_Manager::NUMBER,
				'min' => 50,
				'max' => 500,
				'default' => 180,
			]
		);

		$this->add_control(
			'frame_height',
			[
				'label' => esc_html__( 'Frame Height (px)', 'refraction' ),
				'type' => Controls_Manager::NUMBER,
				'min' => 20,
				'max' => 200,
				'default' => 30,
			]
		);

		$this->end_section();

		$this->style_section( 'section_fb_button_style', esc_html__( 'Frame', 'refraction' ) );
		$this->align_control( 'fb_align', '{{WRAPPER}} .refraction-facebook', [] );
		$this->end_section();
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		$url = 'custom' === $settings['url_source'] ? trim( (string) $settings['url'] ) : $this->current_url();
		$src = Facebook_Url::like_src( $url, [
			'action' => $settings['action'],
			'layout' => $settings['layout'],
			'size' => $settings['size'],
			'share' => 'yes' === $settings['share'],
		] );

		if ( '' === $src ) {
			$this->render_editor_hint( esc_html__( 'Enter a web address to like.', 'refraction' ) );
			return;
		}

		$this->render_frame( $src, 'recommend' === $settings['action'] ? __( 'Facebook Recommend button', 'refraction' ) : __( 'Facebook Like button', 'refraction' ), (int) $settings['frame_width'], (int) $settings['frame_height'], 'refraction-facebook__frame--button' );
	}
}
