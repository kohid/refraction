<?php
namespace Refraction\Modules\ThemeBuilder\Widgets;

use Refraction\Controls_Manager;
use Refraction\Modules\ThemeBuilder\Classes\Page_Context;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Post Title: the title of the current post, page or custom post type item.
 */
class Post_Title extends Theme_Widget_Base {

	public function get_name() {
		return 'theme-post-title';
	}

	public function get_title() {
		return esc_html__( 'Post Title', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-post-title';
	}

	public function get_keywords() {
		return [ 'post', 'title', 'heading' ];
	}

	protected function register_controls() {
		$this->start_controls_section(
			'section_content',
			[
				'label' => esc_html__( 'Post Title', 'refraction' ),
			]
		);

		$this->add_control(
			'link_post',
			[
				'label' => esc_html__( 'Link to post', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => '',
			]
		);

		$this->add_html_tag_control( 'h1' );

		$this->end_controls_section();

		$this->add_text_style_section( 'section_style', esc_html__( 'Text', 'refraction' ), '{{WRAPPER}} .refraction-theme-text' );
	}

	protected function render() {
		$text = (string) get_the_title();

		if ( '' === trim( $text ) ) {
			$this->print_editor_hint( __( 'This page has no post title.', 'refraction' ) );

			return;
		}

		$tag = $this->tag( 'html_tag', 'h1' );

		$this->add_render_attribute( 'text', 'class', 'refraction-theme-text' );

		printf( '<%1$s %2$s>', tag_escape( $tag ), $this->get_render_attribute_string( 'text' ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Attributes are escaped by the render attribute API.

		$link = 'yes' === $this->get_settings( 'link_post' ) ? get_permalink() : '';

		if ( $link ) {
			echo '<a href="' . esc_url( $link ) . '">';
		}

		echo esc_html( $text );

		if ( $link ) {
			echo '</a>';
		}

		printf( '</%s>', tag_escape( $tag ) );
	}
}
