<?php
namespace Refraction\Modules\ThemeBuilder\Widgets;

use Refraction\Controls_Manager;
use Refraction\Modules\ThemeBuilder\Classes\Page_Context;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Site Tagline: the tagline of the site.
 */
class Site_Tagline extends Theme_Widget_Base {

	public function get_name() {
		return 'theme-site-tagline';
	}

	public function get_title() {
		return esc_html__( 'Site Tagline', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-site-identity';
	}

	public function get_keywords() {
		return [ 'site', 'tagline', 'description', 'slogan' ];
	}

	protected function register_controls() {
		$this->start_controls_section(
			'section_content',
			[
				'label' => esc_html__( 'Site Tagline', 'refraction' ),
			]
		);

		$this->add_html_tag_control( 'p' );

		$this->end_controls_section();

		$this->add_text_style_section( 'section_style', esc_html__( 'Text', 'refraction' ), '{{WRAPPER}} .refraction-theme-text' );
	}

	protected function render() {
		$text = (string) get_bloginfo( 'description' );

		if ( '' === trim( $text ) ) {
			$this->print_editor_hint( __( 'Set a Tagline in Settings > General.', 'refraction' ) );

			return;
		}

		$tag = $this->tag( 'html_tag', 'p' );

		$this->add_render_attribute( 'text', 'class', 'refraction-theme-text' );

		printf( '<%1$s %2$s>', tag_escape( $tag ), $this->get_render_attribute_string( 'text' ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Attributes are escaped by the render attribute API.

		echo esc_html( $text );

		printf( '</%s>', tag_escape( $tag ) );
	}
}
