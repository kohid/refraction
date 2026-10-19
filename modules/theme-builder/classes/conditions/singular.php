<?php
namespace Refraction\Modules\ThemeBuilder\Classes\Conditions;

use Refraction\Modules\ThemeBuilder\Classes\Environment;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Single posts, pages and custom post types.
 *
 * Arguments: none (all), `{post_type}`, `{post_type}/{id}`, `author/{id}`, `in_{taxonomy}/{term_id}`,
 * `child_of/{id}`, `direct_child_of/{id}`, `has_parent`.
 */
class Singular extends Condition_Base {

	public static function get_name(): string {
		return 'singular';
	}

	public static function is_valid_args( array $args ): bool {
		$count = count( $args );

		if ( 0 === $count ) {
			return true;
		}

		if ( 'has_parent' === $args[0] ) {
			return 1 === $count;
		}

		if ( 1 === $count ) {
			return ! in_array( $args[0], [ 'author', 'child_of', 'direct_child_of' ], true ) && 0 !== strpos( $args[0], 'in_' );
		}

		return 2 === $count && self::is_id( $args[1] );
	}

	public function get_label(): string {
		return esc_html__( 'Singular', 'refraction' );
	}

	public function check( array $args, Environment $environment ): bool {
		if ( ! $environment->is_singular() ) {
			return false;
		}

		if ( ! $args ) {
			return true;
		}

		$post_id = $environment->queried_post_id();
		$first = $args[0];
		$id = isset( $args[1] ) ? (int) $args[1] : 0;

		switch ( true ) {
			case 'has_parent' === $first:
				return $environment->post_parent_id( $post_id ) > 0;
			case 'author' === $first:
				return $environment->post_author_id( $post_id ) === $id;
			case 'child_of' === $first:
				return in_array( $id, $environment->post_ancestors( $post_id ), true );
			case 'direct_child_of' === $first:
				return $environment->post_parent_id( $post_id ) === $id;
			case 0 === strpos( $first, 'in_' ):
				return $environment->post_has_term( $post_id, substr( $first, 3 ), $id );
			default:
				if ( $environment->queried_post_type() !== $first ) {
					return false;
				}

				return ! $id || $post_id === $id;
		}
	}

	public function get_specificity( array $args ): float {
		if ( ! $args ) {
			return 20.0;
		}

		if ( isset( $args[1] ) && ! in_array( $args[0], [ 'author', 'child_of', 'direct_child_of' ], true ) && 0 !== strpos( $args[0], 'in_' ) ) {
			return 100.0;
		}

		if ( 1 === count( $args ) && ! in_array( $args[0], [ 'has_parent' ], true ) ) {
			return 30.0;
		}

		return 60.0;
	}

	public function describe( array $args, Environment $environment ): string {
		if ( ! $args ) {
			return esc_html__( 'All singular', 'refraction' );
		}

		$first = $args[0];
		$id = isset( $args[1] ) ? (int) $args[1] : 0;

		switch ( true ) {
			case 'has_parent' === $first:
				return esc_html__( 'Has a parent', 'refraction' );
			case 'author' === $first:
				/* translators: %s: author name. */
				return sprintf( esc_html__( 'Author: %s', 'refraction' ), $environment->label_user( $id ) );
			case 'child_of' === $first:
				/* translators: %s: page title. */
				return sprintf( esc_html__( 'Child of: %s', 'refraction' ), $environment->label_post( $id ) );
			case 'direct_child_of' === $first:
				/* translators: %s: page title. */
				return sprintf( esc_html__( 'Direct child of: %s', 'refraction' ), $environment->label_post( $id ) );
			case 0 === strpos( $first, 'in_' ):
				$taxonomy = substr( $first, 3 );

				return sprintf( '%s: %s', $environment->label_taxonomy( $taxonomy ), $environment->label_term( $taxonomy, $id ) );
			default:
				if ( ! $id ) {
					/* translators: %s: post type plural name. */
					return sprintf( esc_html__( 'All %s', 'refraction' ), $environment->label_post_type_plural( $first ) );
				}

				return sprintf( '%s: %s', $environment->label_post_type( $first ), $environment->label_post( $id ) );
		}
	}

	public function get_sub_conditions(): array {
		$subs = [ [ 'value' => '', 'label' => esc_html__( 'All singular', 'refraction' ) ] ];

		foreach ( get_post_types( [ 'public' => true ], 'objects' ) as $type ) {
			if ( 'attachment' === $type->name ) {
				continue;
			}

			$subs[] = [
				'value' => $type->name,
				'label' => $type->labels->name,
				'target' => 'post:' . $type->name,
				'required' => false,
			];
		}

		$subs[] = [ 'value' => 'author', 'label' => esc_html__( 'By author', 'refraction' ), 'target' => 'user', 'required' => true ];

		foreach ( get_taxonomies( [ 'public' => true ], 'objects' ) as $taxonomy ) {
			if ( 'post_format' === $taxonomy->name ) {
				continue;
			}

			/* translators: %s: taxonomy name, for example "Categories". */
			$subs[] = [ 'value' => 'in_' . $taxonomy->name, 'label' => sprintf( esc_html__( 'In %s', 'refraction' ), $taxonomy->labels->name ), 'target' => 'term:' . $taxonomy->name, 'required' => true ];
		}

		$subs[] = [ 'value' => 'child_of', 'label' => esc_html__( 'Child of', 'refraction' ), 'target' => 'post:any', 'required' => true ];
		$subs[] = [ 'value' => 'direct_child_of', 'label' => esc_html__( 'Direct child of', 'refraction' ), 'target' => 'post:any', 'required' => true ];
		$subs[] = [ 'value' => 'has_parent', 'label' => esc_html__( 'Has a parent', 'refraction' ) ];

		return $subs;
	}
}
