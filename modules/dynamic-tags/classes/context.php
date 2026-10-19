<?php
namespace Refraction\Modules\DynamicTags\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Which post, term or user a dynamic tag speaks about.
 *
 * Order: the innermost loop item (pushed by the loop widgets while they print one item), then the
 * `refraction/dynamic_tags/context_post_id` filter (a Loop Item template in the editor answers with its
 * preview post), then the global post, then the queried object.
 */
class Context {

	/** @var int[] */
	private static array $stack = [];

	public static function push_post( int $post_id ): void {
		self::$stack[] = $post_id;
	}

	public static function pop_post(): void {
		array_pop( self::$stack );
	}

	/** The post of the loop item being printed, 0 outside a loop. */
	public static function loop_post_id(): int {
		return self::$stack ? (int) end( self::$stack ) : 0;
	}

	public static function get_post_id(): int {
		$loop = self::loop_post_id();

		if ( $loop ) {
			return $loop;
		}

		$id = (int) get_the_ID();

		if ( ! $id && is_singular() ) {
			$id = (int) get_queried_object_id();
		}

		return (int) apply_filters( 'refraction/dynamic_tags/context_post_id', $id );
	}

	public static function get_post(): ?\WP_Post {
		$id = self::get_post_id();
		$post = $id ? get_post( $id ) : null;

		return $post instanceof \WP_Post ? $post : null;
	}

	/** The term of a taxonomy archive, null elsewhere (and inside a loop, where the item is the subject). */
	public static function get_term(): ?\WP_Term {
		if ( self::loop_post_id() ) {
			return null;
		}

		$object = get_queried_object();

		return $object instanceof \WP_Term ? $object : null;
	}

	/** The author of the current post, or the author archive's user. */
	public static function get_author_id(): int {
		$post = self::get_post();

		if ( $post ) {
			return (int) $post->post_author;
		}

		$object = get_queried_object();

		return $object instanceof \WP_User ? (int) $object->ID : 0;
	}

	/**
	 * Whether the current user may see content of this post through a tag. Hidden posts show nothing to
	 * visitors who could not open them, so a tag cannot leak private or protected content.
	 */
	public static function can_read( ?\WP_Post $post ): bool {
		if ( ! $post ) {
			return false;
		}

		if ( 'publish' === $post->post_status ) {
			return true;
		}

		return current_user_can( 'read_post', $post->ID );
	}
}
