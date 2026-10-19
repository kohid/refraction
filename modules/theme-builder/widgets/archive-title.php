<?php
namespace Refraction\Modules\ThemeBuilder\Widgets;

use Refraction\Controls_Manager;
use Refraction\Modules\ThemeBuilder\Classes\Page_Context;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Archive Title: the title of an archive (category, tag, author, date, post type, blog).
 */
class Archive_Title extends Theme_Widget_Base {

	public function get_name() {
		return 'theme-archive-title';
	}

	public function get_title() {
		return esc_html__( 'Archive Title', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-archive-title';
	}

	public function get_keywords() {
		return [ 'archive', 'title', 'category', 'tag', 'author' ];
	}

	protected function is_template_only(): bool {
		return true;
	}

	protected function register_controls() {
		$this->start_controls_section(
			'section_content',
			[
				'label' => esc_html__( 'Archive Title', 'refraction' ),
			]
		);

		$this->add_control(
			'hide_prefix',
			[
				'label' => esc_html__( 'Hide prefix (Category:, Tag:...)', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => '',
			]
		);

		$this->add_html_tag_control( 'h1' );

		$this->end_controls_section();

		$this->add_text_style_section( 'section_style', esc_html__( 'Text', 'refraction' ), '{{WRAPPER}} .refraction-theme-text' );
	}

	protected function render() {
		$text = Page_Context::archive_title( 'yes' === $this->get_settings( 'hide_prefix' ) );

		if ( '' === trim( $text ) ) {
			$this->print_editor_hint( __( 'There is no archive title here.', 'refraction' ) );

			return;
		}

		$tag = $this->tag( 'html_tag', 'h1' );

		$this->add_render_attribute( 'text', 'class', 'refraction-theme-text' );

		printf( '<%1$s %2$s>', tag_escape( $tag ), $this->get_render_attribute_string( 'text' ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Attributes are escaped by the render attribute API.

		echo esc_html( $text );

		printf( '</%s>', tag_escape( $tag ) );
	}
}
