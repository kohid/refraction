<?php
namespace Refraction\Modules\DynamicTags\Tags;

use Refraction\Core\DynamicTags\Data_Tag;
use Refraction\Modules\DynamicTags\Module;
use Refraction\Modules\DynamicTags\Classes\Context;
use Refraction\Controls_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Post_Featured_Image extends Data_Tag {

	public function get_name() {
		return 'post-featured-image';
	}

	public function get_title() {
		return esc_html__( 'Featured Image', 'refraction' );
	}

	public function get_group() {
		return Module::POST_GROUP;
	}

	public function get_categories() {
		return [ Module::IMAGE_CATEGORY, Module::MEDIA_CATEGORY ];
	}

	protected function register_controls() {
		$this->add_control(
			'fallback',
			[
				'label' => esc_html__( 'Fallback', 'refraction' ),
				'type' => Controls_Manager::MEDIA,
			]
		);
	}


	public function get_value( array $options = [] ) {
		$post = Context::get_post();
		$id = Context::can_read( $post ) ? (int) get_post_thumbnail_id( $post ) : 0;

		if ( $id ) {
			return [
				'id' => $id,
				'url' => (string) wp_get_attachment_url( $id ),
			];
		}

		return (array) $this->get_settings( 'fallback' );
	}
}
