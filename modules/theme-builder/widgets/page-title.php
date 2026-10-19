<?php
namespace Refraction\Modules\ThemeBuilder\Widgets;

use Refraction\Controls_Manager;
use Refraction\Modules\ThemeBuilder\Classes\Page_Context;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Page Title: the title of the page being viewed (post, archive, search or 404).
 */
class Page_Title extends Theme_Widget_Base {

	public function get_name() {
		return 'theme-page-title';
	}

	public function get_title() {
		return esc_html__( 'Page Title', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-heading';
	}

	public function get_keywords() {
		return [ 'page', 'title', 'heading' ];
	}

	protected function register_controls() {
		$this->start_controls_section(
			'section_content',
			[
				'label' => esc_html__( 'Page Title', 'refraction' ),
			]
		);

		$this->add_html_tag_control( 'h1' );

		$this->end_controls_section();

		$this->add_text_style_section( 'section_style', esc_html__( 'Text', 'refraction' ), '{{WRAPPER}} .refraction-theme-text' );
	}

	protected function render() {
		$text = Page_Context::page_title();

		if ( '' === trim( $text ) ) {
			$this->print_editor_hint( __( 'There is no page title to show here.', 'refraction' ) );

			return;
		}

		$tag = $this->tag( 'html_tag', 'h1' );

		$this->add_render_attribute( 'text', 'class', 'refraction-theme-text' );

		printf( '<%1$s %2$s>', tag_escape( $tag ), $this->get_render_attribute_string( 'text' ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Attributes are escaped by the render attribute API.

		echo esc_html( $text );

		printf( '</%s>', tag_escape( $tag ) );
	}
}
