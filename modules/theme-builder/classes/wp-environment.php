<?php
namespace Refraction\Modules\ThemeBuilder\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * The real request, read from the main WordPress query.
 */
class Wp_Environment implements Environment {

	public function is_front_page(): bool {
		return is_front_page();
	}

	public function is_404(): bool {
		return is_404();
	}

	public function is_search(): bool {
		return is_search();
	}

	public function is_date(): bool {
		return is_date();
	}

	public function is_archive(): bool {
		return is_archive();
	}

	public function is_blog_index(): bool {
		return is_home() && ! is_front_page();
	}

	public function is_singular(): bool {
		return is_singular();
	}

	public function queried_post_type(): string {
		if ( ! is_singular() ) {
			return '';
		}

		return (string) get_post_type( get_queried_object_id() );
	}

	public function queried_post_id(): int {
		return (int) get_queried_object_id();
	}

	public function post_author_id( int $post_id ): int {
		return (int) get_post_field( 'post_author', $post_id );
	}

	public function post_parent_id( int $post_id ): int {
		return (int) wp_get_post_parent_id( $post_id );
	}

	public function post_ancestors( int $post_id ): array {
		return array_map( 'intval', get_post_ancestors( $post_id ) );
	}

	public function post_has_term( int $post_id, string $taxonomy, int $term_id ): bool {
		return taxonomy_exists( $taxonomy ) && has_term( $term_id, $taxonomy, $post_id );
	}

	public function is_post_type_archive( string $post_type ): bool {
		return is_post_type_archive( $post_type );
	}

	public function is_tax_archive( string $taxonomy, int $term_id = 0 ): bool {
		if ( ! ( is_category() || is_tag() || is_tax() ) ) {
			return false;
		}

		$term = get_queried_object();

		if ( ! $term instanceof \WP_Term || $term->taxonomy !== $taxonomy ) {
			return false;
		}

		return ! $term_id || (int) $term->term_id === $term_id;
	}

	public function archive_author_id(): int {
		return is_author() ? (int) get_queried_object_id() : 0;
	}

	public function is_user_logged_in(): bool {
		return is_user_logged_in();
	}

	public function current_user_roles(): array {
		$user = wp_get_current_user();

		return $user && $user->exists() ? array_values( (array) $user->roles ) : [];
	}

	public function label_post( int $post_id ): string {
		$title = get_the_title( $post_id );

		return '' !== $title ? $title : '#' . $post_id;
	}

	public function label_term( string $taxonomy, int $term_id ): string {
		$term = get_term( $term_id, $taxonomy );

		return $term instanceof \WP_Term ? $term->name : '#' . $term_id;
	}

	public function label_user( int $user_id ): string {
		$user = get_userdata( $user_id );

		return $user ? $user->display_name : '#' . $user_id;
	}

	public function label_post_type( string $post_type ): string {
		$object = get_post_type_object( $post_type );

		return $object ? $object->labels->singular_name : $post_type;
	}

	public function label_post_type_plural( string $post_type ): string {
		$object = get_post_type_object( $post_type );

		return $object ? $object->labels->name : $post_type;
	}

	public function label_taxonomy( string $taxonomy ): string {
		$object = get_taxonomy( $taxonomy );

		return $object ? $object->labels->singular_name : $taxonomy;
	}

	public function label_role( string $role ): string {
		$names = wp_roles()->get_names();

		return isset( $names[ $role ] ) ? translate_user_role( $names[ $role ] ) : $role;
	}
}
