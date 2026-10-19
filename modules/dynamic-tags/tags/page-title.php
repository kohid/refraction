<?php
namespace Refraction\Modules\DynamicTags\Tags;

use Refraction\Core\DynamicTags\Tag;
use Refraction\Modules\DynamicTags\Module;
use Refraction\Modules\DynamicTags\Classes\Context;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Page_Title extends Tag {

	public function get_name() {
		return 'page-title';
	}

	public function get_title() {
		return esc_html__( 'Page Title', 'refraction' );
	}

	public function get_group() {
		return Module::SITE_GROUP;
	}

	public function get_categories() {
		return [ Module::TEXT_CATEGORY ];
	}


	public function render() {
		if ( is_singular() || is_home() && ! is_front_page() ) {
			$post = Context::get_post();
			$title = $post && Context::can_read( $post ) ? get_the_title( $post ) : single_post_title( '', false );
		} elseif ( is_search() ) {
			/* translators: %s: search query. */
			$title = sprintf( __( 'Search results for: %s', 'refraction' ), get_search_query() );
		} elseif ( is_404() ) {
			$title = __( 'Page not found', 'refraction' );
		} elseif ( is_archive() ) {
			$title = get_the_archive_title();
		} else {
			$title = get_bloginfo( 'name' );
		}

		echo wp_kses_post( (string) $title );
	}
}
