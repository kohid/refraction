<?php
namespace Refraction\Modules\ThemeBuilder\Widgets;

use Refraction\Controls_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Post Excerpt: the excerpt of the current post, or its first words.
 */
class Post_Excerpt extends Theme_Widget_Base {

	public function get_name() {
		return 'theme-post-excerpt';
	}

	public function get_title() {
		return esc_html__( 'Post Excerpt', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-post-excerpt';
	}

	public function get_keywords() {
		return [ 'post', 'excerpt', 'summary', 'intro' ];
	}

	protected function is_template_only(): bool {
		return true;
	}

	protected function register_controls() {
		$this->start_controls_section(
			'section_content',
			[
				'label' => esc_html__( 'Post Excerpt', 'refraction' ),
			]
		);

		$this->add_control(
			'length',
			[
				'label' => esc_html__( 'Excerpt Length (words)', 'refraction' ),
				'description' => esc_html__( 'Leave 0 to use the excerpt as written (or the WordPress default length).', 'refraction' ),
				'type' => Controls_Manager::NUMBER,
				'min' => 0,
				'max' => 500,
				'default' => 0,
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

		$this->end_controls_section();

		$this->add_text_style_section( 'section_style', esc_html__( 'Excerpt', 'refraction' ), '{{WRAPPER}} .refraction-theme-excerpt' );
	}

	protected function render() {
		$post = get_post();

		if ( ! $post ) {
			$this->print_editor_hint( __( 'There is no post to take an excerpt from.', 'refraction' ) );

			return;
		}

		$length = max( 0, (int) $this->get_settings( 'length' ) );

		if ( $length ) {
			$source = '' !== trim( $post->post_excerpt ) ? $post->post_excerpt : wp_strip_all_tags( strip_shortcodes( $post->post_content ) );
			$excerpt = wp_trim_words( $source, $length, '…' );
		} else {
			$excerpt = get_the_excerpt( $post );
		}

		if ( '' === trim( (string) $excerpt ) ) {
			$this->print_editor_hint( __( 'This post has no excerpt.', 'refraction' ) );

			return;
		}

		echo '<div class="refraction-theme-excerpt">';

		if ( 'yes' === $this->get_settings( 'link_post' ) ) {
			echo '<a href="' . esc_url( get_permalink( $post ) ) . '">' . esc_html( $excerpt ) . '</a>';
		} else {
			echo wp_kses_post( wpautop( $excerpt ) );
		}

		echo '</div>';
	}
}
