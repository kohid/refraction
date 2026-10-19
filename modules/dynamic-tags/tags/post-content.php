<?php
namespace Refraction\Modules\DynamicTags\Tags;

use Refraction\Core\DynamicTags\Tag;
use Refraction\Modules\DynamicTags\Module;
use Refraction\Modules\DynamicTags\Classes\Context;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Post_Content extends Tag {

	public function get_name() {
		return 'post-content';
	}

	public function get_title() {
		return esc_html__( 'Post Content', 'refraction' );
	}

	public function get_group() {
		return Module::POST_GROUP;
	}

	public function get_categories() {
		return [ Module::TEXT_CATEGORY ];
	}


	private static int $depth = 0;

	public function render() {
		$post = Context::get_post();

		// A password protected or hidden post prints nothing, and a post never includes itself.
		if ( ! Context::can_read( $post ) || post_password_required( $post ) || self::$depth > 1 ) {
			return;
		}

		++self::$depth;
		// The core content filters, so shortcodes, blocks and builder content render as they do in the theme.
		echo apply_filters( 'the_content', $post->post_content ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped, WordPress.NamingConventions.PrefixAllGlobals
		--self::$depth;
	}
}
