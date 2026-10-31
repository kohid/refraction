<?php
namespace Refraction\Modules\FormBuilder\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Where records live: custom post type `refraction_fb_record`. The title and a searchable text go in the post, the
 * collection slug and status in meta, the field values as JSON plus one meta key per field so the table can sort and
 * filter on a column.
 */
class Records {

	const POST_TYPE = 'refraction_fb_record';
	const META_TYPE = '_rfb_type';
	const META_STATUS = '_rfb_status';
	const META_DATA = '_rfb_data';
	const META_FIELD = '_rfb_f_';

	public function register_post_type(): void {
		register_post_type(
			self::POST_TYPE,
			[
				'label' => esc_html__( 'Builder records', 'refraction' ),
				'public' => false,
				'show_ui' => false,
				'show_in_rest' => false,
				'rewrite' => false,
				'query_var' => false,
				'supports' => [ 'title' ],
				'map_meta_cap' => true,
				// Map only the plural (primitive) capabilities. Mapping edit_post, read_post or delete_post to
				// manage_options would make WordPress treat manage_options itself as a per-post capability and
				// break every menu and check that uses it.
				'capability_type' => [ 'rfb_record', 'rfb_records' ],
				'capabilities' => [
					'edit_posts' => 'manage_options',
					'edit_others_posts' => 'manage_options',
					'publish_posts' => 'manage_options',
					'read_private_posts' => 'manage_options',
					'delete_posts' => 'manage_options',
					'delete_private_posts' => 'manage_options',
					'delete_published_posts' => 'manage_options',
					'delete_others_posts' => 'manage_options',
					'edit_private_posts' => 'manage_options',
					'edit_published_posts' => 'manage_options',
					'create_posts' => 'manage_options',
				],
			]
		);
	}

	/** @return int The new record id, or 0. */
	public function insert( array $definition, array $values, string $status ): int {
		$status = Schema::status( $definition, $status ) ? $status : $definition['default_status'];
		$id = wp_insert_post(
			[
				'post_type' => self::POST_TYPE,
				'post_status' => 'publish',
				'post_title' => Schema::title( $definition, $values ),
				'post_content' => Schema::search_text( $definition, $values ),
			],
			true
		);

		if ( is_wp_error( $id ) || ! $id ) {
			return 0;
		}

		$this->write_meta( (int) $id, $definition, $values, $status );
		wp_update_post( [ 'ID' => $id, 'post_title' => Schema::title( $definition, $values, (int) $id ) ] );

		return (int) $id;
	}

	public function update( int $id, array $definition, array $values, string $status ): bool {
		if ( ! $this->owned( $id, $definition['slug'] ) ) {
			return false;
		}

		$status = Schema::status( $definition, $status ) ? $status : $definition['default_status'];
		$updated = wp_update_post(
			[
				'ID' => $id,
				'post_title' => Schema::title( $definition, $values, $id ),
				'post_content' => Schema::search_text( $definition, $values ),
			],
			true
		);

		if ( is_wp_error( $updated ) ) {
			return false;
		}

		$this->write_meta( $id, $definition, $values, $status );

		return true;
	}

	public function set_status( int $id, array $definition, string $status ): bool {
		if ( ! $this->owned( $id, $definition['slug'] ) || ! Schema::status( $definition, $status ) ) {
			return false;
		}

		update_post_meta( $id, self::META_STATUS, $status );
		wp_update_post( [ 'ID' => $id ] ); // Moves the modified date.

		return true;
	}

	public function delete( int $id, string $slug ): bool {
		if ( ! $this->owned( $id, $slug ) ) {
			return false;
		}

		$record = $this->describe( get_post( $id ) );

		if ( ! wp_delete_post( $id, true ) ) {
			return false;
		}

		Uploads::delete( $slug, Uploads::descriptors( $record['values'] ) );

		return true;
	}

	public function delete_all( string $slug ): int {
		$ids = get_posts( $this->base_args( $slug ) + [ 'posts_per_page' => -1, 'fields' => 'ids', 'no_found_rows' => true ] );

		foreach ( $ids as $id ) {
			$this->delete( (int) $id, $slug );
		}

		return count( $ids );
	}

	public function get( int $id, string $slug ): ?array {
		return $this->owned( $id, $slug ) ? $this->describe( get_post( $id ) ) : null;
	}

	/** True when the post is a record of that collection. */
	public function owned( int $id, string $slug ): bool {
		$post = $id ? get_post( $id ) : null;

		return $post && self::POST_TYPE === $post->post_type && $slug === get_post_meta( $id, self::META_TYPE, true );
	}

	/**
	 * @param array $args search, status, filters (field key => value), orderby (a field key, "created" or "status"),
	 *                    order (asc|desc), page, per_page.
	 *
	 * @return array{items:array[],total:int,pages:int}
	 */
	public function query( array $definition, array $args = [] ): array {
		$per_page = max( 1, min( 200, (int) ( $args['per_page'] ?? 20 ) ) );
		$page = max( 1, (int) ( $args['page'] ?? 1 ) );
		$query_args = $this->base_args( $definition['slug'] ) + [
			'posts_per_page' => $per_page,
			'paged' => $page,
			'order' => 'asc' === strtolower( (string) ( $args['order'] ?? '' ) ) ? 'ASC' : 'DESC',
		];

		if ( ! empty( $args['search'] ) ) {
			$query_args['s'] = (string) $args['search'];
		}

		$meta = $query_args['meta_query'];

		if ( ! empty( $args['status'] ) && Schema::status( $definition, (string) $args['status'] ) ) {
			$meta[] = [ 'key' => self::META_STATUS, 'value' => (string) $args['status'] ];
		}

		foreach ( (array) ( $args['filters'] ?? [] ) as $key => $value ) {
			$field = Schema::field( $definition, (string) $key );

			if ( $field && $field['filter'] && in_array( $key, array_column( Schema::value_fields( $definition ), 'key' ), true ) && '' !== (string) $value ) {
				$meta[] = [ 'key' => self::META_FIELD . $key, 'value' => (string) $value ];
			}
		}

		$query_args['meta_query'] = array_merge( [ 'relation' => 'AND' ], $meta );

		$orderby = (string) ( $args['orderby'] ?? '' );
		$sort_field = Schema::field( $definition, $orderby );
		$sort_field = $sort_field && in_array( $orderby, array_column( Schema::value_fields( $definition ), 'key' ), true ) && Schema::is_scalar_type( $sort_field['type'] ) ? $sort_field : null;

		if ( $sort_field ) {
			$query_args['meta_key'] = self::META_FIELD . $orderby;
			$query_args['orderby'] = Schema::is_numeric_type( $sort_field['type'] ) ? 'meta_value_num' : 'meta_value';
		} elseif ( 'status' === $orderby ) {
			$query_args['meta_key'] = self::META_STATUS;
			$query_args['orderby'] = 'meta_value';
		} else {
			$query_args['orderby'] = 'date' === $orderby || '' === $orderby ? 'date' : 'ID';
		}

		$query = new \WP_Query( $query_args );

		return [
			'items' => array_map( [ $this, 'describe' ], $query->posts ),
			'total' => (int) $query->found_posts,
			'pages' => (int) $query->max_num_pages,
		];
	}

	/** Every record of a collection matching the same filters as the table, for the CSV export (capped). */
	public function export( array $definition, array $args = [], int $cap = 5000 ): array {
		$args['per_page'] = 200;
		$items = [];

		for ( $page = 1; count( $items ) < $cap; $page++ ) {
			$result = $this->query( $definition, [ 'page' => $page ] + $args );
			$items = array_merge( $items, $result['items'] );

			if ( $page >= $result['pages'] ) {
				break;
			}
		}

		return array_slice( $items, 0, $cap );
	}

	/** @return array<string,int> status key => count, plus "all". */
	public function counts( array $definition ): array {
		$counts = [ 'all' => 0 ];

		foreach ( $definition['statuses'] as $status ) {
			$base = $this->base_args( $definition['slug'] );
			$base['meta_query'][] = [ 'key' => self::META_STATUS, 'value' => $status['key'] ];
			$result = new \WP_Query( $base + [ 'posts_per_page' => 1, 'fields' => 'ids' ] );
			$counts[ $status['key'] ] = (int) $result->found_posts;
			$counts['all'] += $counts[ $status['key'] ];
		}

		return $counts;
	}

	public function count( string $slug ): int {
		$result = new \WP_Query( $this->base_args( $slug ) + [ 'posts_per_page' => 1, 'fields' => 'ids' ] );

		return (int) $result->found_posts;
	}

	private function base_args( string $slug ): array {
		return [
			'post_type' => self::POST_TYPE,
			'post_status' => 'publish',
			'meta_query' => [ [ 'key' => self::META_TYPE, 'value' => $slug ] ],
		];
	}

	private function write_meta( int $id, array $definition, array $values, string $status ): void {
		update_post_meta( $id, self::META_TYPE, $definition['slug'] );
		update_post_meta( $id, self::META_STATUS, $status );
		update_post_meta( $id, self::META_DATA, wp_slash( wp_json_encode( $values ) ) );

		// One meta key per plain top-level field, so the table can sort and filter on it.
		foreach ( Schema::value_fields( $definition ) as $field ) {
			if ( ! Schema::is_scalar_type( $field['type'] ) && 'checkbox' !== $field['type'] ) {
				continue;
			}

			$value = $values[ $field['key'] ] ?? '';
			update_post_meta( $id, self::META_FIELD . $field['key'], is_array( $value ) ? implode( ',', $value ) : (string) $value );
		}
	}

	private function describe( \WP_Post $post ): array {
		$values = json_decode( (string) get_post_meta( $post->ID, self::META_DATA, true ), true );

		return [
			'id' => $post->ID,
			'title' => $post->post_title,
			'status' => (string) get_post_meta( $post->ID, self::META_STATUS, true ),
			'values' => is_array( $values ) ? $values : [],
			'created' => $post->post_date,
			'modified' => $post->post_modified,
		];
	}
}
