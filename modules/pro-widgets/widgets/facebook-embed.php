<?php
namespace Refraction\Modules\ProWidgets\Widgets;

use Refraction\Controls_Manager;
use Refraction\Modules\ProWidgets\Base\Facebook_Widget;
use Refraction\Modules\ProWidgets\Classes\Facebook_Url;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Embeds one public Facebook post or video (plain iframe).
 */
class Facebook_Embed extends Facebook_Widget {

	public function get_name() {
		return 'refraction-facebook-embed';
	}

	public function get_title() {
		return esc_html__( 'Facebook Embed', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-facebook';
	}

	public function get_keywords() {
		return [ 'facebook', 'embed', 'post', 'video', 'social' ];
	}

	protected function register_controls() {
		$this->content_section( 'section_fb_embed', esc_html__( 'Embed', 'refraction' ) );

		$this->privacy_note_control();

		$this->add_control(
			'type',
			[
				'label' => esc_html__( 'Type', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'post',
				'options' => [
					'post' => esc_html__( 'Post', 'refraction' ),
					'video' => esc_html__( 'Video', 'refraction' ),
				],
			]
		);

		$this->add_control(
			'url',
			[
				'label' => esc_html__( 'Facebook URL', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'placeholder' => 'https://www.facebook.com/…/posts/…',
				'label_block' => true,
				'dynamic' => [ 'active' => true ],
			]
		);

		$this->add_control(
			'show_text',
			[
				'label' => esc_html__( 'Show the Text', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => 'yes',
				'return_value' => 'yes',
			]
		);

		$this->add_control(
			'frame_width',
			[
				'label' => esc_html__( 'Width (px)', 'refraction' ),
				'type' => Controls_Manager::NUMBER,
				'min' => 220,
				'max' => 750,
				'default' => 500,
			]
		);

		$this->add_control(
			'frame_height',
			[
				'label' => esc_html__( 'Height (px)', 'refraction' ),
				'type' => Controls_Manager::NUMBER,
				'min' => 150,
				'max' => 1500,
				'default' => 600,
			]
		);

		$this->end_section();

		$this->style_section( 'section_fb_embed_style', esc_html__( 'Frame', 'refraction' ) );
		$this->align_control( 'fb_align', '{{WRAPPER}} .refraction-facebook', [] );
		$this->end_section();
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		$url = trim( (string) $settings['url'] );
		$options = [ 'width' => $settings['frame_width'], 'show_text' => 'yes' === $settings['show_text'] ];
		$src = 'video' === $settings['type'] ? Facebook_Url::video_src( $url, $options ) : Facebook_Url::post_src( $url, $options );

		if ( '' === $src ) {
			$this->render_editor_hint( esc_html__( 'Enter the address of a Facebook post or video.', 'refraction' ) );
			return;
		}

		$this->render_frame( $src, 'video' === $settings['type'] ? __( 'Facebook video', 'refraction' ) : __( 'Facebook post', 'refraction' ), (int) $settings['frame_width'], (int) $settings['frame_height'] );
	}
}
