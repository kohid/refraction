<?php
namespace Refraction\Modules\ThemeBuilder\Widgets;

use Refraction\Controls_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Post Comments: the comments and the comment form of the current post, as the theme prints them.
 */
class Post_Comments extends Theme_Widget_Base {

	public function get_name() {
		return 'theme-post-comments';
	}

	public function get_title() {
		return esc_html__( 'Post Comments', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-comments';
	}

	public function get_keywords() {
		return [ 'comments', 'discussion', 'reply', 'form' ];
	}

	protected function is_template_only(): bool {
		return true;
	}

	protected function register_controls() {
		$this->start_controls_section(
			'section_content',
			[
				'label' => esc_html__( 'Post Comments', 'refraction' ),
			]
		);

		$this->add_control(
			'info',
			[
				'type' => Controls_Manager::RAW_HTML,
				'raw' => esc_html__( 'Uses the comments template of your theme. Nothing is shown when comments are closed and there are none.', 'refraction' ),
				'content_classes' => 'refraction-descriptor',
			]
		);

		$this->end_controls_section();

		$this->add_text_style_section( 'section_style', esc_html__( 'Comments', 'refraction' ), '{{WRAPPER}} .refraction-theme-comments' );
	}

	protected function render() {
		$post = get_post();

		if ( ! $post || post_password_required( $post ) ) {
			$this->print_editor_hint( __( 'There are no comments to show for this page.', 'refraction' ) );

			return;
		}

		if ( ! comments_open( $post ) && ! get_comments_number( $post ) ) {
			$this->print_editor_hint( __( 'Comments are closed and there are none, so nothing shows on the site.', 'refraction' ) );

			return;
		}

		if ( comments_open( $post ) && get_option( 'thread_comments' ) ) {
			wp_enqueue_script( 'comment-reply' );
		}

		echo '<div class="refraction-theme-comments">';
		comments_template();
		echo '</div>';
	}
}
