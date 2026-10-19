<?php
namespace Refraction\Modules\ProWidgets\Widgets;

use Refraction\Controls_Manager;
use Refraction\Modules\ProWidgets\Base\Facebook_Widget;
use Refraction\Modules\ProWidgets\Classes\Facebook_Url;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Facebook Comments box for the current page or another address (plain iframe).
 */
class Facebook_Comments extends Facebook_Widget {

	public function get_name() {
		return 'refraction-facebook-comments';
	}

	public function get_title() {
		return esc_html__( 'Facebook Comments', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-facebook-comments';
	}

	public function get_keywords() {
		return [ 'facebook', 'comments', 'social', 'discussion' ];
	}

	protected function register_controls() {
		$this->content_section( 'section_fb_comments', esc_html__( 'Comments', 'refraction' ) );

		$this->privacy_note_control();

		$this->add_control(
			'url_source',
			[
				'label' => esc_html__( 'Comments For', 'refraction' ),
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
			'numposts',
			[
				'label' => esc_html__( 'Comments to Show', 'refraction' ),
				'type' => Controls_Manager::NUMBER,
				'min' => 1,
				'max' => 50,
				'default' => 10,
			]
		);

		$this->add_control(
			'frame_height',
			[
				'label' => esc_html__( 'Frame Height (px)', 'refraction' ),
				'type' => Controls_Manager::NUMBER,
				'min' => 200,
				'max' => 3000,
				'default' => 600,
			]
		);

		$this->end_section();
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		$url = 'custom' === $settings['url_source'] ? trim( (string) $settings['url'] ) : $this->current_url();
		$src = Facebook_Url::comments_src( $url, [ 'numposts' => $settings['numposts'], 'width' => 1000 ] );

		if ( '' === $src ) {
			$this->render_editor_hint( esc_html__( 'Enter a web address.', 'refraction' ) );
			return;
		}

		$this->render_frame( $src, __( 'Facebook comments', 'refraction' ), '', (int) $settings['frame_height'], 'refraction-facebook__frame--fluid' );
	}
}
