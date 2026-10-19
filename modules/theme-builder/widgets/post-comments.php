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

		if ( file_exists( get_stylesheet_directory() . '/comments.php' ) || file_exists( get_template_directory() . '/comments.php' ) ) {
			comments_template();
		} else {
			// Block themes have no comments.php: print the comments blocks, as their own templates do.
			$this->render_comment_blocks( $post );
		}

		echo '</div>';
	}

	private function render_comment_blocks( \WP_Post $post ): void {
		$markup = '<!-- wp:comments --><div class="wp-block-comments">'
			. '<!-- wp:comments-title /-->'
			. '<!-- wp:comment-template --><!-- wp:group {"layout":{"type":"flex","flexWrap":"nowrap","verticalAlignment":"top"}} --><div class="wp-block-group"><!-- wp:avatar {"size":40} /-->'
			. '<!-- wp:group {"layout":{"type":"constrained"}} --><div class="wp-block-group"><!-- wp:comment-author-name /--><!-- wp:comment-date /--><!-- wp:comment-content /--><!-- wp:comment-reply-link /--></div><!-- /wp:group --></div><!-- /wp:group --><!-- /wp:comment-template -->'
			. '<!-- wp:comments-pagination --><!-- wp:comments-pagination-previous /--><!-- wp:comments-pagination-numbers /--><!-- wp:comments-pagination-next /--><!-- /wp:comments-pagination -->'
			. '<!-- wp:post-comments-form /-->'
			. '</div><!-- /wp:comments -->';
		$context = [ 'postId' => $post->ID, 'postType' => $post->post_type ];

		foreach ( parse_blocks( $markup ) as $parsed ) {
			if ( ! empty( $parsed['blockName'] ) ) {
				echo ( new \WP_Block( $parsed, $context ) )->render(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Core block output.
			}
		}
	}
}
