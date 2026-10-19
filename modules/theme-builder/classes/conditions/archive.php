<?php
namespace Refraction\Modules\ThemeBuilder\Classes\Conditions;

use Refraction\Modules\ThemeBuilder\Classes\Environment;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Archives and search results.
 *
 * Arguments: none (all), `type/{post_type}`, `tax/{taxonomy}`, `tax/{taxonomy}/{term_id}`,
 * `author`, `author/{id}`, `date`, `search`.
 */
class Archive extends Condition_Base {

	public static function get_name(): string {
		return 'archive';
	}

	public static function is_valid_args( array $args ): bool {
		$count = count( $args );

		if ( 0 === $count ) {
			return true;
		}

		switch ( $args[0] ) {
			case 'type':
				return 2 === $count;
			case 'tax':
				return 2 === $count || ( 3 === $count && self::is_id( $args[2] ) );
			case 'author':
				return 1 === $count || ( 2 === $count && self::is_id( $args[1] ) );
			case 'date':
			case 'search':
				return 1 === $count;
			default:
				return false;
		}
	}

	public function get_label(): string {
		return esc_html__( 'Archive', 'refraction' );
	}

	public function check( array $args, Environment $environment ): bool {
		if ( ! $args ) {
			return $environment->is_archive() || $environment->is_search() || $environment->is_blog_index();
		}

		switch ( $args[0] ) {
			case 'type':
				return $environment->is_post_type_archive( $args[1] ) || ( 'post' === $args[1] && $environment->is_blog_index() );
			case 'tax':
				return $environment->is_tax_archive( $args[1], isset( $args[2] ) ? (int) $args[2] : 0 );
			case 'author':
				$author = $environment->archive_author_id();

				return $author > 0 && ( ! isset( $args[1] ) || $author === (int) $args[1] );
			case 'date':
				return $environment->is_date();
			default:
				return $environment->is_search();
		}
	}

	public function get_specificity( array $args ): float {
		if ( ! $args ) {
			return 20.0;
		}

		return ( 3 === count( $args ) || ( 'author' === $args[0] && 2 === count( $args ) ) ) ? 60.0 : 30.0;
	}

	public function describe( array $args, Environment $environment ): string {
		if ( ! $args ) {
			return esc_html__( 'All archives', 'refraction' );
		}

		switch ( $args[0] ) {
			case 'type':
				/* translators: %s: post type name. */
				return sprintf( esc_html__( '%s archive', 'refraction' ), $environment->label_post_type( $args[1] ) );
			case 'tax':
				if ( isset( $args[2] ) ) {
					/* translators: 1: taxonomy name, 2: term name. */
					return sprintf( esc_html__( '%1$s archive: %2$s', 'refraction' ), $environment->label_taxonomy( $args[1] ), $environment->label_term( $args[1], (int) $args[2] ) );
				}

				/* translators: %s: taxonomy name. */
				return sprintf( esc_html__( '%s archives', 'refraction' ), $environment->label_taxonomy( $args[1] ) );
			case 'author':
				if ( isset( $args[1] ) ) {
					/* translators: %s: author name. */
					return sprintf( esc_html__( 'Author archive: %s', 'refraction' ), $environment->label_user( (int) $args[1] ) );
				}

				return esc_html__( 'Author archives', 'refraction' );
			case 'date':
				return esc_html__( 'Date archives', 'refraction' );
			default:
				return esc_html__( 'Search results', 'refraction' );
		}
	}

	public function get_sub_conditions(): array {
		$subs = [ [ 'value' => '', 'label' => esc_html__( 'All archives', 'refraction' ) ] ];

		foreach ( get_post_types( [ 'public' => true ], 'objects' ) as $type ) {
			if ( 'post' === $type->name || ( $type->has_archive && 'attachment' !== $type->name ) ) {
				/* translators: %s: post type name. */
				$subs[] = [ 'value' => 'type/' . $type->name, 'label' => sprintf( esc_html__( '%s archive', 'refraction' ), $type->labels->name ) ];
			}
		}

		foreach ( get_taxonomies( [ 'public' => true ], 'objects' ) as $taxonomy ) {
			if ( 'post_format' === $taxonomy->name ) {
				continue;
			}

			/* translators: %s: taxonomy name, for example "Categories". */
			$subs[] = [ 'value' => 'tax/' . $taxonomy->name, 'label' => sprintf( esc_html__( '%s archives', 'refraction' ), $taxonomy->labels->name ), 'target' => 'term:' . $taxonomy->name, 'required' => false ];
		}

		$subs[] = [ 'value' => 'author', 'label' => esc_html__( 'Author archives', 'refraction' ), 'target' => 'user', 'required' => false ];
		$subs[] = [ 'value' => 'date', 'label' => esc_html__( 'Date archives', 'refraction' ) ];
		$subs[] = [ 'value' => 'search', 'label' => esc_html__( 'Search results', 'refraction' ) ];

		return $subs;
	}
}
