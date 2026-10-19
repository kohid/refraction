<?php
namespace Refraction\Modules\LoopBuilder\Classes;

use Refraction\Modules\DynamicTags\Classes\Context;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * The WordPress side of the query layer: gathers what `Query_Args` needs to know, runs the query, and keeps
 * the list of posts the page already printed (for "avoid duplicates").
 */
class Query_Runner {

	/** @var int[] */
	private static array $displayed = [];

	public static function register_displayed( array $ids ): void {
		self::$displayed = array_values( array_unique( array_merge( self::$displayed, Query_Args::ids( $ids ) ) ) );
	}

	public static function displayed(): array {
		return self::$displayed;
	}

	public static function reset_displayed(): void {
		self::$displayed = [];
	}

	/**
	 * @param array      $settings Widget settings.
	 * @param string     $prefix   Group control name plus underscore.
	 * @param int        $paged    Page to load.
	 * @param array|null $filter   `[ 'taxonomy' => ..., 'term_id' => ... ]` or null.
	 */
	public static function args_from_settings( array $settings, string $prefix = '', int $paged = 1, ?array $filter = null ): array {
		return Query_Args::build( $settings, self::context( $settings, $prefix, $paged ), $prefix, $filter );
	}

	public static function context( array $settings, string $prefix, int $paged ): array {
		$post = Context::get_post();
		$term_ids = array_merge(
			Query_Args::ids( $settings[ $prefix . 'include_term_ids' ] ?? [] ),
			Query_Args::ids( $settings[ $prefix . 'exclude_term_ids' ] ?? [] )
		);
		$public_taxonomies = Query_Lookup::taxonomies();
		$term_taxonomies = [];

		foreach ( array_slice( $term_ids, 0, 200 ) as $term_id ) {
			$term = get_term( $term_id );

			if ( $term instanceof \WP_Term && in_array( $term->taxonomy, $public_taxonomies, true ) ) {
				$term_taxonomies[ $term_id ] = $term->taxonomy;
			}
		}

		$context = [
			'allowed_post_types' => Query_Lookup::post_types(),
			'term_taxonomies' => $term_taxonomies,
			'displayed_ids' => self::$displayed,
			'paged' => max( 1, $paged ),
		];

		if ( $post && is_singular() || $post && Context::loop_post_id() ) {
			$context['current_post_id'] = $post->ID;
			$context['current_post_type'] = $post->post_type;
			$context['current_post_terms'] = [];

			foreach ( (array) ( $settings[ $prefix . 'related_taxonomies' ] ?? [] ) as $taxonomy ) {
				$taxonomy = sanitize_key( $taxonomy );

				if ( in_array( $taxonomy, $public_taxonomies, true ) ) {
					$ids = wp_get_object_terms( $post->ID, $taxonomy, [ 'fields' => 'ids' ] );
					$context['current_post_terms'][ $taxonomy ] = is_wp_error( $ids ) ? [] : array_map( 'intval', $ids );
				}
			}
		}

		return $context;
	}

	/** Query variables of the main query that a widget may reuse for "current archive". */
	public static function archive_vars( ?\WP_Query $main = null ): array {
		$main = $main ?? $GLOBALS['wp_query'] ?? null;

		if ( ! $main instanceof \WP_Query ) {
			return [];
		}

		$allowed = [ 'post_type', 'cat', 'category_name', 'tag', 'tag_id', 'author', 'author_name', 'year', 'monthnum', 'day', 'w', 'm', 's', 'taxonomy', 'term' ];

		foreach ( get_taxonomies( [ 'public' => true ], 'objects' ) as $taxonomy ) {
			if ( ! empty( $taxonomy->query_var ) ) {
				$allowed[] = $taxonomy->query_var;
			}
		}

		$vars = [];

		foreach ( (array) $main->query as $key => $value ) {
			if ( in_array( $key, $allowed, true ) && ( is_scalar( $value ) || ( is_array( $value ) && ! array_filter( $value, static fn( $item ) => ! is_scalar( $item ) ) ) ) ) {
				$vars[ $key ] = is_array( $value ) ? array_values( $value ) : $value;
			}
		}

		return $vars;
	}

	/**
	 * Arguments for an archive listing: the saved archive variables plus the safety defaults.
	 *
	 * @param array $vars     Output of `archive_vars()` (possibly from a verified token).
	 * @param int   $per_page Posts per page.
	 */
	public static function archive_args( array $vars, int $per_page, int $paged ): array {
		$args = [];
		$allowed_types = Query_Lookup::post_types();

		foreach ( $vars as $key => $value ) {
			if ( 'post_type' === $key ) {
				$types = array_values( array_intersect( (array) $value, $allowed_types ) );

				if ( $types ) {
					$args['post_type'] = $types;
				}

				continue;
			}

			$args[ sanitize_key( $key ) ] = is_array( $value ) ? array_map( 'sanitize_text_field', $value ) : sanitize_text_field( (string) $value );
		}

		if ( empty( $args['post_type'] ) ) {
			$args['post_type'] = ! empty( $args['s'] ) || ! empty( $args['taxonomy'] ) || ! empty( $args['cat'] ) || ! empty( $args['tag'] ) || ! empty( $args['category_name'] ) || ! empty( $args['author'] ) ? $allowed_types : 'post';
		}

		$args['post_status'] = 'publish';
		$args['has_password'] = false;
		$args['posts_per_page'] = max( 1, min( Query_Args::MAX_PER_PAGE, $per_page ) );
		$args['paged'] = max( 1, $paged );
		$args['ignore_sticky_posts'] = false;

		return $args;
	}

	/**
	 * A filter from the browser (`taxonomy`, `term_id`) as a safe `[ 'taxonomy', 'term_id' ]`, or null when
	 * the taxonomy is not public, the term does not exist in it, or the taxonomy is not one the widget offers.
	 *
	 * @param mixed         $raw
	 * @param string[]|null $allowed_taxonomies Taxonomies the widget may filter by, null for any public one.
	 */
	public static function sanitize_filter( $raw, ?array $allowed_taxonomies = null ): ?array {
		if ( ! is_array( $raw ) || empty( $raw['taxonomy'] ) || empty( $raw['term_id'] ) ) {
			return null;
		}

		$taxonomy = sanitize_key( (string) $raw['taxonomy'] );
		$term_id = absint( $raw['term_id'] );
		$allowed = null === $allowed_taxonomies ? Query_Lookup::taxonomies() : array_intersect( $allowed_taxonomies, Query_Lookup::taxonomies() );

		if ( ! $term_id || ! in_array( $taxonomy, $allowed, true ) || ! term_exists( $term_id, $taxonomy ) ) {
			return null;
		}

		return [ 'taxonomy' => $taxonomy, 'term_id' => $term_id ];
	}

	/** Adds a sanitised filter to ready made arguments (used for archive listings). */
	public static function apply_filter( array $args, ?array $filter ): array {
		if ( ! $filter ) {
			return $args;
		}

		$clause = [ 'taxonomy' => $filter['taxonomy'], 'field' => 'term_id', 'terms' => [ $filter['term_id'] ], 'operator' => 'IN' ];
		$existing = isset( $args['tax_query'] ) && is_array( $args['tax_query'] ) ? $args['tax_query'] : [];
		$args['tax_query'] = array_merge( [ 'relation' => 'AND' ], array_filter( $existing, 'is_array' ) ? [ $existing ] : [], [ $clause ] );

		return $args;
	}

	public static function query( array $args ): \WP_Query {
		return new \WP_Query( $args );
	}
}
