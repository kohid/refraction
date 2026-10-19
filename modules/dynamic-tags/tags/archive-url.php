<?php
namespace Refraction\Modules\DynamicTags\Tags;

use Refraction\Core\DynamicTags\Data_Tag;
use Refraction\Modules\DynamicTags\Module;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Archive_Url extends Data_Tag {

	public function get_name() {
		return 'archive-url';
	}

	public function get_title() {
		return esc_html__( 'Archive URL', 'refraction' );
	}

	public function get_group() {
		return Module::ARCHIVE_GROUP;
	}

	public function get_categories() {
		return [ Module::URL_CATEGORY ];
	}


	public function get_value( array $options = [] ) {
		$object = get_queried_object();

		if ( $object instanceof \WP_Term ) {
			$link = get_term_link( $object );

			return is_string( $link ) ? $link : '';
		}

		if ( $object instanceof \WP_User ) {
			return get_author_posts_url( $object->ID );
		}

		if ( $object instanceof \WP_Post_Type ) {
			return (string) get_post_type_archive_link( $object->name );
		}

		if ( is_search() ) {
			return get_search_link();
		}

		return home_url( '/' );
	}
}
