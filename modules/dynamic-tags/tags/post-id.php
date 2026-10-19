<?php
namespace Refraction\Modules\DynamicTags\Tags;

use Refraction\Core\DynamicTags\Tag;
use Refraction\Modules\DynamicTags\Module;
use Refraction\Modules\DynamicTags\Classes\Context;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Post_Id extends Tag {

	public function get_name() {
		return 'post-id';
	}

	public function get_title() {
		return esc_html__( 'Post ID', 'refraction' );
	}

	public function get_group() {
		return Module::POST_GROUP;
	}

	public function get_categories() {
		return [ Module::TEXT_CATEGORY, Module::NUMBER_CATEGORY ];
	}


	public function render() {
		$id = Context::get_post_id();

		if ( $id ) {
			echo esc_html( (string) $id );
		}
	}
}
