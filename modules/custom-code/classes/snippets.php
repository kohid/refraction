<?php
namespace Refraction\Modules\CustomCode\Classes;

use Refraction\Modules\ThemeBuilder\Classes\Conditions_Store;
use Refraction\Modules\ThemeBuilder\Classes\Rule;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Where snippets live: custom post type `refraction_snippet` (title, code in the content) with post meta for the
 * location, type and priority. Display rules use the Theme Builder store (meta `_refraction_conditions` and the
 * `custom_code` bucket of the conditions option).
 */
class Snippets {

	const POST_TYPE = 'refraction_snippet';
	const RULES_BUCKET = 'custom_code';
	const META_LOCATION = '_refraction_snippet_location';
	const META_TYPE = '_refraction_snippet_type';
	const META_PRIORITY = '_refraction_snippet_priority';

	private ?Conditions_Store $store = null;

	public function get_store(): Conditions_Store {
		return $this->store ??= new Conditions_Store();
	}

	public function register_post_type(): void {
		$cap = 'unfiltered_html';

		register_post_type(
			self::POST_TYPE,
			[
				'label' => esc_html__( 'Custom Code', 'refraction' ),
				'public' => false,
				'show_ui' => false,
				'show_in_rest' => false,
				'rewrite' => false,
				'query_var' => false,
				'supports' => [ 'title' ],
				'map_meta_cap' => true,
				'capabilities' => [
					'edit_post' => $cap,
					'read_post' => $cap,
					'delete_post' => $cap,
					'edit_posts' => $cap,
					'edit_others_posts' => $cap,
					'publish_posts' => $cap,
					'read_private_posts' => $cap,
					'delete_posts' => $cap,
					'delete_private_posts' => $cap,
					'delete_published_posts' => $cap,
					'delete_others_posts' => $cap,
					'edit_private_posts' => $cap,
					'edit_published_posts' => $cap,
					'create_posts' => $cap,
				],
			]
		);
	}

	/** @return \WP_Post[] Every snippet, newest first. */
	public function all(): array {
		return get_posts( [
			'post_type' => self::POST_TYPE,
			'post_status' => [ 'publish', 'draft' ],
			'posts_per_page' => 500,
			'no_found_rows' => true,
			'orderby' => 'modified',
			'order' => 'DESC',
		] );
	}

	public function describe( \WP_Post $post ): array {
		return [
			'id' => $post->ID,
			'title' => $post->post_title,
			'code' => $post->post_content,
			'active' => 'publish' === $post->post_status,
			'location' => Snippet_Format::location( get_post_meta( $post->ID, self::META_LOCATION, true ) ),
			'type' => Snippet_Format::type( get_post_meta( $post->ID, self::META_TYPE, true ) ),
			'priority' => Snippet_Format::priority( get_post_meta( $post->ID, self::META_PRIORITY, true ) ?: 10 ),
			'rules' => $this->get_store()->get_rules( $post->ID ),
		];
	}

	/**
	 * @param array{title: string, code: string, location: string, type: string, priority: mixed, active: bool, rules: array} $data
	 * @return int The snippet ID, 0 on failure.
	 */
	public function save( int $id, array $data ): int {
		$postarr = [
			'post_type' => self::POST_TYPE,
			'post_title' => $data['title'],
			'post_content' => $data['code'],
			'post_status' => $data['active'] ? 'publish' : 'draft',
		];

		if ( $id ) {
			$postarr['ID'] = $id;
		}

		$id = (int) wp_insert_post( wp_slash( $postarr ) );

		if ( ! $id ) {
			return 0;
		}

		update_post_meta( $id, self::META_LOCATION, Snippet_Format::location( $data['location'] ) );
		update_post_meta( $id, self::META_TYPE, Snippet_Format::type( $data['type'] ) );
		update_post_meta( $id, self::META_PRIORITY, Snippet_Format::priority( $data['priority'] ) );
		$this->get_store()->save_rules( $id, self::RULES_BUCKET, Rule::sanitize_list( $data['rules'] ) );

		return $id;
	}

	public function set_active( int $id, bool $active ): void {
		wp_update_post( [ 'ID' => $id, 'post_status' => $active ? 'publish' : 'draft' ] );
	}

	public function delete( int $id ): void {
		$this->get_store()->remove( $id, [ self::RULES_BUCKET ] );
		wp_delete_post( $id, true );
	}

	/**
	 * Published snippets of a location whose rules match this request, in print order.
	 *
	 * @return array<int, array{id: int, priority: int, type: string, code: string}>
	 */
	public function matching( string $location, callable $matcher ): array {
		$out = [];

		foreach ( $this->get_store()->get_candidates( self::RULES_BUCKET, self::POST_TYPE ) as $id => $candidate ) {
			if ( Snippet_Format::location( get_post_meta( $id, self::META_LOCATION, true ) ) !== $location ) {
				continue;
			}

			if ( ! $matcher( $candidate['rules'] ) ) {
				continue;
			}

			$out[] = [
				'id' => $id,
				'priority' => Snippet_Format::priority( get_post_meta( $id, self::META_PRIORITY, true ) ?: 10 ),
				'type' => Snippet_Format::type( get_post_meta( $id, self::META_TYPE, true ) ),
				'code' => (string) get_post_field( 'post_content', $id ),
			];
		}

		return Snippet_Format::sort( $out );
	}
}
