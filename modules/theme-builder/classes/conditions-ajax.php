<?php
namespace Refraction\Modules\ThemeBuilder\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Search and label lookups for the target field of a display rule (posts, terms, users).
 *
 * Request: admin-ajax.php?action=refraction_theme_builder_lookup, POST fields `_nonce`, `kind`
 * (`post`, `term`, `user`), `subtype` (post type or taxonomy, `any` for every public post type),
 * and either `q` (search text) or `ids` (comma separated IDs to turn into labels).
 * Searching needs a user who can manage options (the people who may edit display conditions). Turning
 * saved IDs into labels, which the read-only view for other editors needs, only needs `edit_posts`, and
 * only returns what that user may read.
 */
class Conditions_Ajax {

	const ACTION = 'refraction_theme_builder_lookup';
	const NONCE = 'refraction_theme_builder_lookup';
	const LIMIT = 20;

	public function __construct() {
		add_action( 'wp_ajax_' . self::ACTION, [ $this, 'handle' ] );
	}

	public function handle(): void {
		if ( ! check_ajax_referer( self::NONCE, '_nonce', false ) ) {
			wp_send_json_error( [ 'message' => esc_html__( 'Your session expired. Reload the editor and try again.', 'refraction' ) ], 403 );
		}

		$kind = isset( $_POST['kind'] ) ? sanitize_key( wp_unslash( $_POST['kind'] ) ) : '';
		$subtype = isset( $_POST['subtype'] ) ? sanitize_key( wp_unslash( $_POST['subtype'] ) ) : '';
		$query = isset( $_POST['q'] ) ? sanitize_text_field( wp_unslash( $_POST['q'] ) ) : '';
		$ids = isset( $_POST['ids'] ) ? array_slice( array_filter( array_map( 'absint', explode( ',', sanitize_text_field( wp_unslash( $_POST['ids'] ) ) ) ) ), 0, 100 ) : [];

		$allowed = $ids ? current_user_can( 'edit_posts' ) : current_user_can( 'manage_options' );

		if ( ! $allowed ) {
			wp_send_json_error( [ 'message' => esc_html__( 'You are not allowed to edit display conditions.', 'refraction' ) ], 403 );
		}

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

	private function public_post_types(): array {
		$types = get_post_types( [ 'public' => true ] );
		unset( $types['attachment'] );

		return array_values( $types );
	}

	private function lookup_posts( string $subtype, string $query, array $ids ): array {
		$types = $this->public_post_types();
		$post_type = ( 'any' === $subtype || '' === $subtype ) ? $types : ( in_array( $subtype, $types, true ) ? $subtype : [] );

		if ( ! $post_type ) {
			return [];
		}

		$args = [
			'post_type' => $post_type,
			'post_status' => $ids ? 'any' : [ 'publish', 'private', 'draft', 'future', 'pending' ],
			'posts_per_page' => $ids ? count( $ids ) : self::LIMIT,
			'no_found_rows' => true,
			'orderby' => $ids ? 'post__in' : 'relevance',
			'suppress_filters' => false,
		];

		if ( $ids ) {
			$args['post__in'] = $ids;
		} elseif ( '' !== $query ) {
			$args['s'] = $query;
		} else {
			$args['orderby'] = 'modified';
		}

		$items = [];

		foreach ( get_posts( $args ) as $post ) {
			if ( $ids && ! current_user_can( 'read_post', $post->ID ) ) {
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
		if ( ! taxonomy_exists( $taxonomy ) ) {
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
		$items = [];

		if ( is_wp_error( $terms ) ) {
			return [];
		}

		foreach ( $terms as $term ) {
			$items[] = [
				'id' => $term->term_id,
				'text' => $term->name,
				'hint' => get_taxonomy( $taxonomy )->labels->singular_name,
			];
		}

		return $items;
	}

	private function lookup_users( string $query, array $ids ): array {
		if ( $ids && ! current_user_can( 'list_users' ) ) {
			return [];
		}

		$args = [
			'number' => $ids ? count( $ids ) : self::LIMIT,
			'fields' => [ 'ID', 'display_name' ],
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
				'hint' => esc_html__( 'User', 'refraction' ),
			];
		}

		return $items;
	}
}
