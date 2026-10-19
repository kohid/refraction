<?php
namespace Refraction\Modules\ThemeBuilder\Classes;

use Refraction\Modules\FloatingButtons\Classes\Conditions\Conditions_Cache;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Where rules live: post meta `_refraction_conditions` on the template, mirrored in the
 * `refraction_pro_theme_builder_conditions` option (type => post ID => rules) so the front end can
 * find candidates without querying posts. The option format is shared with Floating Elements.
 */
class Conditions_Store {

	const META_KEY = '_refraction_conditions';

	/** Rule strings for a post, validated again on every read. */
	public function get_rules( int $post_id ): array {
		return Rule::sanitize_list( get_post_meta( $post_id, self::META_KEY, true ) );
	}

	/**
	 * @param string[] $rules Raw rule strings, sanitised here.
	 * @return string[] The rules that were stored.
	 */
	public function save_rules( int $post_id, string $type, array $rules ): array {
		$rules = Rule::sanitize_list( $rules );
		$cache = new Conditions_Cache( $type );

		if ( $rules ) {
			update_post_meta( $post_id, self::META_KEY, $rules );
			$cache->add_to_cache( $post_id, $rules );
		} else {
			delete_post_meta( $post_id, self::META_KEY );
			$cache->remove_from_cache( $post_id );
		}

		return $rules;
	}

	public function remove( int $post_id, array $types ): void {
		foreach ( $types as $type ) {
			( new Conditions_Cache( $type ) )->remove_from_cache( $post_id );
		}
	}

	/**
	 * Published templates of a type with their rules and modification time.
	 *
	 * @return array<int, array{rules: string[], modified: int}>
	 */
	public function get_candidates( string $type, string $post_type ): array {
		$cached = ( new Conditions_Cache( $type ) )->get_all();
		$candidates = [];

		if ( $cached ) {
			_prime_post_caches( array_map( 'intval', array_keys( $cached ) ), false, false );
		}

		foreach ( $cached as $post_id => $rules ) {
			$post = get_post( (int) $post_id );

			if ( ! $post || $post_type !== $post->post_type || 'publish' !== $post->post_status ) {
				continue;
			}

			$candidates[ (int) $post_id ] = [
				'rules' => Rule::sanitize_list( $rules ),
				'modified' => (int) strtotime( $post->post_modified_gmt . ' UTC' ),
			];
		}

		return $candidates;
	}
}
