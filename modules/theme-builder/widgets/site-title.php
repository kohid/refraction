<?php
namespace Refraction\Modules\ThemeBuilder\Widgets;

use Refraction\Controls_Manager;
use Refraction\Modules\ThemeBuilder\Classes\Page_Context;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Site Title: the name of the site, optionally linked.
 */
class Site_Title extends Theme_Widget_Base {

	public function get_name() {
		return 'theme-site-title';
	}

	public function get_title() {
		return esc_html__( 'Site Title', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-site-title';
	}

	public function get_keywords() {
		return [ 'site', 'title', 'name' ];
	}

	protected function register_controls() {
		$this->start_controls_section(
			'section_content',
			[
				'label' => esc_html__( 'Site Title', 'refraction' ),
			]
		);

		$this->add_link_choice_control( 'link_to', true );

		$this->add_html_tag_control( 'h1' );

		$this->end_controls_section();

		$this->add_text_style_section( 'section_style', esc_html__( 'Text', 'refraction' ), '{{WRAPPER}} .refraction-theme-text' );
	}

	protected function render() {
		$text = (string) get_bloginfo( 'name' );

		if ( '' === trim( $text ) ) {
			$this->print_editor_hint( __( 'Set a Site Title in Settings > General.', 'refraction' ) );

			return;
		}

		$tag = $this->tag( 'html_tag', 'h1' );

		$this->add_render_attribute( 'text', 'class', 'refraction-theme-text' );

		printf( '<%1$s %2$s>', tag_escape( $tag ), $this->get_render_attribute_string( 'text' ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Attributes are escaped by the render attribute API.

		$close = $this->open_choice_link();
		echo esc_html( $text );
		echo $close; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Static closing tag.

		printf( '</%s>', tag_escape( $tag ) );
	}
}
