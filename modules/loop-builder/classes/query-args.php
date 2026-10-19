<?php
namespace Refraction\Modules\LoopBuilder\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Turns the settings of the Query group control into WP_Query arguments.
 *
 * Pure: it never touches the database. Everything WordPress knows (allowed post types, which taxonomy a term
 * belongs to, the current post and its terms, the posts already shown) comes in through `$context`:
 *
 *  - allowed_post_types: string[]
 *  - term_taxonomies:    array<int,string> term ID => taxonomy
 *  - current_post_id, current_post_type, current_post_terms (array<string,int[]> taxonomy => term IDs)
 *  - displayed_ids:      int[] posts that earlier widgets on the page printed
 *  - paged:              int  page to load, 1 based
 *
 * The result always asks for published posts without a password, so a visitor never gets drafts, private or
 * protected posts from a widget, whatever the settings say.
 */
class Query_Args {

	const DEFAULT_PER_PAGE = 6;
	const MAX_PER_PAGE = 100;

	const ORDERBY = [ 'date', 'modified', 'title', 'rand', 'comment_count', 'menu_order', 'ID', 'author' ];

	const SOURCE_BY_ID = 'by_id';
	const SOURCE_RELATED = 'related';

	/**
	 * @param array       $settings Control values, optionally prefixed by `$prefix`.
	 * @param array       $context  See the class comment.
	 * @param string      $prefix   Group control name plus underscore, for example `query_`.
	 * @param array|null  $filter   Optional `[ 'taxonomy' => string, 'term_id' => int ]`, one extra required term.
	 */
	public static function build( array $settings, array $context, string $prefix = '', ?array $filter = null ): array {
		$get = static fn( string $key, $default = null ) => $settings[ $prefix . $key ] ?? $default;

		$allowed = array_values( array_filter( (array) ( $context['allowed_post_types'] ?? [] ), 'is_string' ) );
		$term_taxonomies = (array) ( $context['term_taxonomies'] ?? [] );
		$source = (string) $get( 'post_type', 'post' );

		$args = [
			'post_status' => 'publish',
			'has_password' => false,
			'ignore_sticky_posts' => 'yes' === $get( 'ignore_sticky_posts' ),
		];

		$per_page = $get( 'posts_per_page', self::DEFAULT_PER_PAGE );
		$per_page = is_numeric( $per_page ) ? (int) $per_page : self::DEFAULT_PER_PAGE;
		$args['posts_per_page'] = max( 1, min( self::MAX_PER_PAGE, $per_page ) );

		$orderby = (string) $get( 'orderby', 'date' );
		$args['orderby'] = in_array( $orderby, self::ORDERBY, true ) ? $orderby : 'date';
		$order = strtoupper( (string) $get( 'order', 'DESC' ) );
		$args['order'] = in_array( $order, [ 'ASC', 'DESC' ], true ) ? $order : 'DESC';

		$not_in = [];
		$tax_clauses = [];
		$nothing = false;

		if ( self::SOURCE_BY_ID === $source ) {
			$args['post_type'] = $allowed ? $allowed : [ 'post' ];
			$ids = self::ids( $get( 'posts_ids', [] ) );

			if ( $ids ) {
				$args['post__in'] = $ids;
			} else {
				$nothing = true;
			}
		} elseif ( self::SOURCE_RELATED === $source ) {
			$current_id = (int) ( $context['current_post_id'] ?? 0 );
			$current_type = (string) ( $context['current_post_type'] ?? '' );
			$args['post_type'] = in_array( $current_type, $allowed, true ) ? $current_type : ( $allowed ? $allowed[0] : 'post' );

			$wanted = array_map( 'sanitize_key', (array) $get( 'related_taxonomies', [] ) );
			$have = (array) ( $context['current_post_terms'] ?? [] );
			$or = [ 'relation' => 'OR' ];

			foreach ( $wanted as $taxonomy ) {
				$term_ids = self::ids( $have[ $taxonomy ] ?? [] );

				if ( $term_ids ) {
					$or[] = self::clause( $taxonomy, $term_ids, 'IN' );
				}
			}

			if ( ! $current_id || count( $or ) < 2 ) {
				$nothing = true;
			} else {
				$tax_clauses[] = $or;
				$not_in[] = $current_id;
			}
		} else {
			$args['post_type'] = in_array( $source, $allowed, true ) ? $source : ( in_array( 'post', $allowed, true ) || ! $allowed ? 'post' : $allowed[0] );
		}

		$tax_clauses = array_merge(
			$tax_clauses,
			self::term_clauses( self::ids( $get( 'include_term_ids', [] ) ), $term_taxonomies, 'IN' ),
			self::term_clauses( self::ids( $get( 'exclude_term_ids', [] ) ), $term_taxonomies, 'NOT IN' )
		);

		if ( $filter && ! empty( $filter['taxonomy'] ) && ! empty( $filter['term_id'] ) ) {
			$tax_clauses[] = self::clause( sanitize_key( $filter['taxonomy'] ), [ (int) $filter['term_id'] ], 'IN' );
		}

		if ( 1 === count( $tax_clauses ) && isset( $tax_clauses[0]['relation'] ) && 'OR' === $tax_clauses[0]['relation'] ) {
			$args['tax_query'] = $tax_clauses[0];
		} elseif ( $tax_clauses ) {
			$args['tax_query'] = array_merge( [ 'relation' => 'AND' ], $tax_clauses );
		}

		$include_authors = self::ids( $get( 'include_authors', [] ) );
		$exclude_authors = self::ids( $get( 'exclude_authors', [] ) );

		if ( $include_authors ) {
			$args['author__in'] = $include_authors;
		}

		if ( $exclude_authors ) {
			$args['author__not_in'] = $exclude_authors;
		}

		$not_in = array_merge( $not_in, self::ids( $get( 'exclude_ids', [] ) ) );

		if ( 'yes' === $get( 'exclude_current' ) && ! empty( $context['current_post_id'] ) ) {
			$not_in[] = (int) $context['current_post_id'];
		}

		if ( 'yes' === $get( 'avoid_duplicates' ) ) {
			$not_in = array_merge( $not_in, self::ids( $context['displayed_ids'] ?? [] ) );
		}

		$not_in = array_values( array_unique( $not_in ) );

		if ( $not_in ) {
			$args['post__not_in'] = $not_in;
		}

		if ( $nothing ) {
			$args['post__in'] = [ 0 ];
		}

		$paged = max( 1, (int) ( $context['paged'] ?? 1 ) );
		$offset = max( 0, (int) $get( 'offset', 0 ) );

		if ( $offset ) {
			// WordPress ignores `paged` when `offset` is set, so the page is folded into the offset.
			$args['offset'] = $offset + ( $paged - 1 ) * $args['posts_per_page'];
		} elseif ( $paged > 1 ) {
			$args['paged'] = $paged;
		}

		return $args;
	}

	/** Unique positive integers from anything array-like or comma separated. */
	public static function ids( $value ): array {
		if ( is_string( $value ) ) {
			$value = explode( ',', $value );
		}

		$ids = [];

		foreach ( (array) $value as $item ) {
			if ( is_numeric( $item ) && (int) $item > 0 ) {
				$ids[ (int) $item ] = (int) $item;
			}
		}

		return array_values( $ids );
	}

	private static function clause( string $taxonomy, array $term_ids, string $operator ): array {
		return [
			'taxonomy' => $taxonomy,
			'field' => 'term_id',
			'terms' => $term_ids,
			'operator' => $operator,
		];
	}

	/** One clause per taxonomy; term IDs whose taxonomy is unknown are dropped. */
	private static function term_clauses( array $term_ids, array $term_taxonomies, string $operator ): array {
		$by_taxonomy = [];

		foreach ( $term_ids as $term_id ) {
			if ( isset( $term_taxonomies[ $term_id ] ) ) {
				$by_taxonomy[ $term_taxonomies[ $term_id ] ][] = $term_id;
			}
		}

		$clauses = [];

		foreach ( $by_taxonomy as $taxonomy => $ids ) {
			$clauses[] = self::clause( (string) $taxonomy, $ids, $operator );
		}

		return $clauses;
	}
}
