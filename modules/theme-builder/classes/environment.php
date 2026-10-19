<?php
namespace Refraction\Modules\ThemeBuilder\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Everything the rules engine needs to know about the current request.
 *
 * Production code uses Wp_Environment; tests script the answers with a fake.
 */
interface Environment {

	public function is_front_page(): bool;

	public function is_404(): bool;

	public function is_search(): bool;

	public function is_date(): bool;

	public function is_archive(): bool;

	/** The posts index when it is not the front page. */
	public function is_blog_index(): bool;

	public function is_singular(): bool;

	public function queried_post_type(): string;

	public function queried_post_id(): int;

	public function post_author_id( int $post_id ): int;

	public function post_parent_id( int $post_id ): int;

	/** @return int[] Parent first, then its parent and so on. */
	public function post_ancestors( int $post_id ): array;

	public function post_has_term( int $post_id, string $taxonomy, int $term_id ): bool;

	public function is_post_type_archive( string $post_type ): bool;

	/** True on an archive of the taxonomy; with a term id only when it is that term. */
	public function is_tax_archive( string $taxonomy, int $term_id = 0 ): bool;

	/** The author of an author archive, 0 elsewhere. */
	public function archive_author_id(): int;

	public function is_user_logged_in(): bool;

	/** @return string[] */
	public function current_user_roles(): array;

	public function label_post( int $post_id ): string;

	public function label_term( string $taxonomy, int $term_id ): string;

	public function label_user( int $user_id ): string;

	public function label_post_type( string $post_type ): string;

	public function label_post_type_plural( string $post_type ): string;

	public function label_taxonomy( string $taxonomy ): string;

	public function label_role( string $role ): string;
}
