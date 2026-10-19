<?php
namespace Refraction\Modules\DynamicTags\Tags;

use Refraction\Core\DynamicTags\Tag;
use Refraction\Modules\DynamicTags\Module;
use Refraction\Modules\DynamicTags\Classes\Context;
use Refraction\Controls_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Post_Excerpt extends Tag {

	public function get_name() {
		return 'post-excerpt';
	}

	public function get_title() {
		return esc_html__( 'Post Excerpt', 'refraction' );
	}

	public function get_group() {
		return Module::POST_GROUP;
	}

	public function get_categories() {
		return [ Module::TEXT_CATEGORY ];
	}

	protected function register_controls() {
		$this->add_control(
			'length',
			[
				'label' => esc_html__( 'Words when there is no excerpt', 'refraction' ),
				'type' => Controls_Manager::NUMBER,
				'default' => 30,
				'min' => 1,
				'max' => 300,
			]
		);
	}


	public function render() {
		$post = Context::get_post();

		if ( ! Context::can_read( $post ) || post_password_required( $post ) ) {
			return;
		}

		$excerpt = '' !== trim( $post->post_excerpt ) ? $post->post_excerpt : wp_trim_words( strip_shortcodes( wp_strip_all_tags( $post->post_content ) ), (int) $this->get_settings( 'length' ), '&hellip;' );

		echo wp_kses_post( $excerpt );
	}
}
