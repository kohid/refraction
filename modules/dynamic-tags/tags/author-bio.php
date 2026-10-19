<?php
namespace Refraction\Modules\DynamicTags\Tags;

use Refraction\Core\DynamicTags\Tag;
use Refraction\Modules\DynamicTags\Module;
use Refraction\Modules\DynamicTags\Classes\Context;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Author_Bio extends Tag {

	public function get_name() {
		return 'author-bio';
	}

	public function get_title() {
		return esc_html__( 'Author Bio', 'refraction' );
	}

	public function get_group() {
		return Module::AUTHOR_GROUP;
	}

	public function get_categories() {
		return [ Module::TEXT_CATEGORY ];
	}


	public function render() {
		$id = Context::get_author_id();

		if ( $id ) {
			echo wp_kses_post( (string) get_the_author_meta( 'description', $id ) );
		}
	}
}
