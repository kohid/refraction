<?php
namespace Refraction\Modules\LoopBuilder\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Search and label lookups behind the autocomplete control of the editor (posts, terms, users).
 *
 * Request: admin-ajax.php?action=refraction_query_lookup, POST fields `_nonce`, `kind` (`post`, `term`,
 * `user`), `subtype` (post type or taxonomy, `any` for every public one) and either `q` (search text) or
 * `ids` (comma separated IDs to turn into labels). Needs a valid nonce and a user who can edit posts. Only
 * published posts and posts the user may read are returned.
 */
class Query_Lookup {

	const ACTION = 'refraction_query_lookup';
	const NONCE = 'refraction_query_lookup';
	const LIMIT = 20;

	public function __construct() {
		add_action( 'wp_ajax_' . self::ACTION, [ $this, 'handle' ] );
	}

	public function handle(): void {
		if ( ! check_ajax_referer( self::NONCE, '_nonce', false ) ) {
			wp_send_json_error( [ 'message' => esc_html__( 'Your session expired. Reload the editor and try again.', 'refraction' ) ], 403 );
		}

		if ( ! current_user_can( 'edit_posts' ) ) {
			wp_send_json_error( [ 'message' => esc_html__( 'You are not allowed to do this.', 'refraction' ) ], 403 );
		}

		$kind = isset( $_POST['kind'] ) ? sanitize_key( wp_unslash( $_POST['kind'] ) ) : '';
		$subtype = isset( $_POST['subtype'] ) ? sanitize_key( wp_unslash( $_POST['subtype'] ) ) : '';
		$query = isset( $_POST['q'] ) ? sanitize_text_field( wp_unslash( $_POST['q'] ) ) : '';
		$ids = isset( $_POST['ids'] ) ? array_slice( Query_Args::ids( sanitize_text_field( wp_unslash( $_POST['ids'] ) ) ), 0, 100 ) : [];

		switch ( $kind ) {
			case 'post':
				$items = $this->lookup_posts( $subtype, $query, $ids );
				break;
			case 'term':
				$items = $this->lookup_terms( $subtype, $query, $ids );
				break;
			case 'user':
				$items = $this->lookup_users( $query, $ids );
				break;
			default:
				wp_send_json_error( [ 'message' => esc_html__( 'Unknown lookup.', 'refraction' ) ], 400 );
				return;
		}

		wp_send_json_success( [ 'items' => $items ] );
	}

	/** Public post types that can be listed by widgets (never attachments). */
	public static function post_types(): array {
		$types = get_post_types( [ 'public' => true ] );
		unset( $types['attachment'] );

		return array_values( (array) apply_filters( 'refraction/query/post_types', $types ) );
	}

	/** Public taxonomies. */
	public static function taxonomies(): array {
		return array_values( get_taxonomies( [ 'public' => true ] ) );
	}

	private function lookup_posts( string $subtype, string $query, array $ids ): array {
		$types = self::post_types();
		$post_type = ( 'any' === $subtype || '' === $subtype ) ? $types : ( in_array( $subtype, $types, true ) ? $subtype : [] );

		if ( ! $post_type ) {
			return [];
		}

		$args = [
			'post_type' => $post_type,
			'post_status' => 'publish',
			'perm' => 'readable',
			'posts_per_page' => $ids ? count( $ids ) : self::LIMIT,
			'no_found_rows' => true,
			'orderby' => $ids ? 'post__in' : 'modified',
			'suppress_filters' => false,
		];

		if ( $ids ) {
			$args['post__in'] = $ids;
		} elseif ( '' !== $query ) {
			$args['s'] = $query;
			$args['orderby'] = 'relevance';
		}

		$items = [];

		foreach ( get_posts( $args ) as $post ) {
			if ( ! current_user_can( 'read_post', $post->ID ) ) {
				continue;
			}

			$items[] = [
				'id' => $post->ID,
				'text' => ( '' !== $post->post_title ? $post->post_title : '#' . $post->ID ),
				'hint' => get_post_type_object( $post->post_type )->labels->singular_name,
			];
		}

		return $items;
	}

	private function lookup_terms( string $taxonomy, string $query, array $ids ): array {
		$taxonomies = self::taxonomies();
		$taxonomy = ( 'any' === $taxonomy || '' === $taxonomy ) ? $taxonomies : ( in_array( $taxonomy, $taxonomies, true ) ? $taxonomy : [] );

		if ( ! $taxonomy ) {
			return [];
		}

		$args = [
			'taxonomy' => $taxonomy,
			'hide_empty' => false,
			'number' => $ids ? count( $ids ) : self::LIMIT,
		];

		if ( $ids ) {
			$args['include'] = $ids;
		} elseif ( '' !== $query ) {
			$args['search'] = $query;
		}

		$terms = get_terms( $args );

		if ( is_wp_error( $terms ) ) {
			return [];
		}

		$items = [];

		foreach ( $terms as $term ) {
			$tax = get_taxonomy( $term->taxonomy );

			$items[] = [
				'id' => $term->term_id,
				'text' => $term->name,
				'hint' => $tax ? $tax->labels->singular_name : $term->taxonomy,
			];
		}

		return $items;
	}

	private function lookup_users( string $query, array $ids ): array {
		$args = [
			'number' => $ids ? count( $ids ) : self::LIMIT,
			'fields' => [ 'ID', 'display_name' ],
			'has_published_posts' => true,
		];

		if ( $ids ) {
			$args['include'] = $ids;
		} elseif ( '' !== $query ) {
			$args['search'] = '*' . $query . '*';
			$args['search_columns'] = [ 'user_login', 'user_nicename', 'display_name' ];
		}

		$items = [];

		foreach ( get_users( $args ) as $user ) {
			$items[] = [
				'id' => (int) $user->ID,
				'text' => $user->display_name,
				'hint' => esc_html__( 'Author', 'refraction' ),
			];
		}

		return $items;
	}
}
