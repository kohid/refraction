<?php
namespace Refraction\Modules\ThemeBuilder\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Titles and trails for the page being viewed (or previewed), read from the current query.
 */
class Page_Context {

	/** The title of whatever is being shown: post, posts page, archive, search results or 404. */
	public static function page_title(): string {
		if ( is_singular() ) {
			return (string) get_the_title( (int) get_queried_object_id() );
		}

		if ( is_404() ) {
			return __( 'Page not found', 'refraction' );
		}

		if ( is_search() ) {
			/* translators: %s: search words. */
			return sprintf( __( 'Search results for: %s', 'refraction' ), get_search_query() );
		}

		return self::archive_title( false );
	}

	/** The archive title; the "Category:" style prefix can be left out. */
	public static function archive_title( bool $hide_prefix = false ): string {
		if ( is_home() ) {
			$page_for_posts = (int) get_option( 'page_for_posts' );

			return $page_for_posts && ! is_front_page() ? (string) get_the_title( $page_for_posts ) : __( 'Latest posts', 'refraction' );
		}

		if ( is_search() ) {
			/* translators: %s: search words. */
			return sprintf( __( 'Search results for: %s', 'refraction' ), get_search_query() );
		}

		if ( is_404() ) {
			return __( 'Page not found', 'refraction' );
		}

		if ( ! is_archive() ) {
			return (string) get_bloginfo( 'name' );
		}

		if ( $hide_prefix ) {
			add_filter( 'get_the_archive_title_prefix', '__return_empty_string', 99 );
		}

		$title = get_the_archive_title();

		if ( $hide_prefix ) {
			remove_filter( 'get_the_archive_title_prefix', '__return_empty_string', 99 );
		}

		return wp_strip_all_tags( $title );
	}

	/**
	 * Breadcrumb trail: a list of [ label, url ] where the url of the current page is empty.
	 *
	 * @return array<int, array{0: string, 1: string}>
	 */
	public static function breadcrumb_trail( string $home_label ): array {
		$trail = [ [ $home_label, home_url( '/' ) ] ];

		if ( is_front_page() && ! is_paged() ) {
			return [ [ $home_label, '' ] ];
		}

		if ( is_singular() ) {
			$post = get_queried_object();

			if ( ! $post instanceof \WP_Post ) {
				return $trail;
			}

			$trail = array_merge( $trail, self::singular_parents( $post ) );
			$trail[] = [ get_the_title( $post ), '' ];

			return $trail;
		}

		if ( is_home() ) {
			$trail[] = [ self::archive_title(), '' ];
		} elseif ( is_category() || is_tag() || is_tax() ) {
			$term = get_queried_object();

			if ( $term instanceof \WP_Term ) {
				$trail = array_merge( $trail, self::term_parents( $term ) );
				$trail[] = [ $term->name, '' ];
			}
		} elseif ( is_post_type_archive() ) {
			$trail[] = [ post_type_archive_title( '', false ), '' ];
		} elseif ( is_author() ) {
			/* translators: %s: author name. */
			$trail[] = [ sprintf( __( 'Author: %s', 'refraction' ), get_the_author_meta( 'display_name', (int) get_queried_object_id() ) ), '' ];
		} elseif ( is_date() ) {
			$trail[] = [ self::archive_title( true ), '' ];
		} elseif ( is_search() ) {
			/* translators: %s: search words. */
			$trail[] = [ sprintf( __( 'Search results for: %s', 'refraction' ), get_search_query() ), '' ];
		} elseif ( is_404() ) {
			$trail[] = [ __( 'Page not found', 'refraction' ), '' ];
		}

		return $trail;
	}

	/** @return array<int, array{0: string, 1: string}> */
	private static function singular_parents( \WP_Post $post ): array {
		$parents = [];
		$type = get_post_type_object( $post->post_type );

		if ( 'page' !== $post->post_type && $type && $type->has_archive ) {
			$parents[] = [ $type->labels->name, (string) get_post_type_archive_link( $post->post_type ) ];
		}

		if ( is_post_type_hierarchical( $post->post_type ) ) {
			foreach ( array_reverse( get_post_ancestors( $post ) ) as $ancestor_id ) {
				$parents[] = [ get_the_title( $ancestor_id ), (string) get_permalink( $ancestor_id ) ];
			}

			return $parents;
		}

		if ( 'post' === $post->post_type ) {
			$categories = get_the_category( $post->ID );

			if ( $categories ) {
				$term = $categories[0];
				$parents = array_merge( $parents, self::term_parents( $term ), [ [ $term->name, (string) get_term_link( $term ) ] ] );
			}
		}

		return $parents;
	}

	/** @return array<int, array{0: string, 1: string}> */
	private static function term_parents( \WP_Term $term ): array {
		$parents = [];

		foreach ( array_reverse( get_ancestors( $term->term_id, $term->taxonomy, 'taxonomy' ) ) as $ancestor_id ) {
			$ancestor = get_term( $ancestor_id, $term->taxonomy );

			if ( $ancestor instanceof \WP_Term ) {
				$parents[] = [ $ancestor->name, (string) get_term_link( $ancestor ) ];
			}
		}

		return $parents;
	}
}
