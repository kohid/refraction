<?php
namespace Refraction\Modules\ThemeBuilder\Widgets;

use Refraction\Controls_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Post Content: the content of the post, page or custom post type item being shown.
 */
class Post_Content extends Theme_Widget_Base {

	/** A Post Content inside the content it prints would call itself forever. */
	private static int $depth = 0;

	public function get_name() {
		return 'theme-post-content';
	}

	public function get_title() {
		return esc_html__( 'Post Content', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-post-content';
	}

	public function get_keywords() {
		return [ 'post', 'content', 'text', 'body' ];
	}

	protected function is_template_only(): bool {
		return true;
	}

	protected function register_controls() {
		$this->start_controls_section(
			'section_content',
			[
				'label' => esc_html__( 'Post Content', 'refraction' ),
			]
		);

		$this->add_control(
			'info',
			[
				'type' => Controls_Manager::RAW_HTML,
				'raw' => esc_html__( 'Shows the content of the page being viewed. In the editor it uses the item chosen in Preview Settings.', 'refraction' ),
				'content_classes' => 'refraction-descriptor',
			]
		);

		$this->end_controls_section();

		$this->add_text_style_section( 'section_style', esc_html__( 'Content', 'refraction' ), '{{WRAPPER}} .refraction-theme-content' );
	}

	protected function render() {
		$post = get_post();

		if ( ! $post || self::$depth > 0 ) {
			$this->print_editor_hint( __( 'There is no post content to show here.', 'refraction' ) );

			return;
		}

		echo '<div class="refraction-theme-content">';

		if ( post_password_required( $post ) ) {
			echo get_the_password_form( $post ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Core form.
		} else {
			++self::$depth;
			setup_postdata( $post );
			the_content();
			--self::$depth;
		}

		echo '</div>';
	}
}
