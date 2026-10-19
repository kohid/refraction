<?php
namespace Refraction\Modules\DynamicTags\Tags;

use Refraction\Core\DynamicTags\Data_Tag;
use Refraction\Modules\DynamicTags\Module;
use Refraction\Modules\DynamicTags\Classes\Context;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Post_Url extends Data_Tag {

	public function get_name() {
		return 'post-url';
	}

	public function get_title() {
		return esc_html__( 'Post URL', 'refraction' );
	}

	public function get_group() {
		return Module::POST_GROUP;
	}

	public function get_categories() {
		return [ Module::URL_CATEGORY ];
	}


	public function get_value( array $options = [] ) {
		$post = Context::get_post();

		return Context::can_read( $post ) ? (string) get_permalink( $post ) : '';
	}
}
