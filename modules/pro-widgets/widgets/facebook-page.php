<?php
namespace Refraction\Modules\ProWidgets\Widgets;

use Refraction\Controls_Manager;
use Refraction\Modules\ProWidgets\Base\Facebook_Widget;
use Refraction\Modules\ProWidgets\Classes\Facebook_Url;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Facebook Page plugin: the timeline, events or messages tab of a public page (plain iframe).
 */
class Facebook_Page extends Facebook_Widget {

	public function get_name() {
		return 'refraction-facebook-page';
	}

	public function get_title() {
		return esc_html__( 'Facebook Page', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-facebook';
	}

	public function get_keywords() {
		return [ 'facebook', 'page', 'timeline', 'feed', 'social' ];
	}

	protected function register_controls() {
		$this->content_section( 'section_fb_page', esc_html__( 'Page', 'refraction' ) );

		$this->privacy_note_control();

		$this->add_control(
			'url',
			[
				'label' => esc_html__( 'Facebook Page URL', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'placeholder' => 'https://www.facebook.com/YourPage',
				'label_block' => true,
				'dynamic' => [ 'active' => true ],
			]
		);

		$this->add_control(
			'tabs',
			[
				'label' => esc_html__( 'Tabs', 'refraction' ),
				'type' => Controls_Manager::SELECT2,
				'multiple' => true,
				'default' => [ 'timeline' ],
				'options' => [
					'timeline' => esc_html__( 'Timeline', 'refraction' ),
					'events' => esc_html__( 'Events', 'refraction' ),
					'messages' => esc_html__( 'Messages', 'refraction' ),
				],
			]
		);

		$this->add_control(
			'frame_width',
			[
				'label' => esc_html__( 'Width (px, 180-500)', 'refraction' ),
				'type' => Controls_Manager::NUMBER,
				'min' => 180,
				'max' => 500,
				'default' => 340,
			]
		);

		$this->add_control(
			'frame_height',
			[
				'label' => esc_html__( 'Height (px)', 'refraction' ),
				'type' => Controls_Manager::NUMBER,
				'min' => 70,
				'max' => 1500,
				'default' => 500,
			]
		);

		$this->add_control(
			'small_header',
			[
				'label' => esc_html__( 'Small Header', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'return_value' => 'yes',
			]
		);

		$this->add_control(
			'hide_cover',
			[
				'label' => esc_html__( 'Hide Cover Photo', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'return_value' => 'yes',
			]
		);

		$this->add_control(
			'show_facepile',
			[
				'label' => esc_html__( 'Show Friends’ Faces', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => 'yes',
				'return_value' => 'yes',
			]
		);

		$this->end_section();

		$this->style_section( 'section_fb_page_style', esc_html__( 'Frame', 'refraction' ) );
		$this->align_control( 'fb_align', '{{WRAPPER}} .refraction-facebook', [] );
		$this->end_section();
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		$tabs = is_array( $settings['tabs'] ) ? implode( ',', $settings['tabs'] ) : (string) $settings['tabs'];
		$src = Facebook_Url::page_src( trim( (string) $settings['url'] ), [
			'tabs' => $tabs,
			'width' => $settings['frame_width'],
			'height' => $settings['frame_height'],
			'small_header' => 'yes' === $settings['small_header'],
			'hide_cover' => 'yes' === $settings['hide_cover'],
			'show_facepile' => 'yes' === $settings['show_facepile'],
		] );

		if ( '' === $src ) {
			$this->render_editor_hint( esc_html__( 'Enter the address of a Facebook page (facebook.com/…).', 'refraction' ) );
			return;
		}

		$this->render_frame( $src, __( 'Facebook page', 'refraction' ), (int) max( 180, min( 500, (int) $settings['frame_width'] ) ), (int) $settings['frame_height'] );
	}
}
