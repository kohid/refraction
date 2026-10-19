<?php
namespace Refraction\Modules\ThemeBuilder\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Preview Settings: what a template is designed against in the editor.
 *
 * A source is a string: `post:{post_type}` (one post, page or custom post type item), `term:{taxonomy}` (one term
 * archive), `postype:{post_type}` (a post type archive), `author`, `blog`, `date`, `search` or `404`.
 * Pure logic; the editor resolves the result with WP_Query (see Preview_Context).
 */
final class Preview_Target {

	/** Setting names stored in the document and the meta. */
	const SOURCE = 'refraction_preview_source';
	const ID = 'refraction_preview_id';
	const SEARCH = 'refraction_preview_search';
	const DATE = 'refraction_preview_date';

	/** @return array{kind: string, sub: string}|null */
	public static function parse_source( $source ): ?array {
		if ( ! is_string( $source ) ) {
			return null;
		}

		if ( in_array( $source, [ 'author', 'blog', 'date', 'search', '404' ], true ) ) {
			return [ 'kind' => $source, 'sub' => '' ];
		}

		if ( preg_match( '/^(post|term|postype):([a-z0-9_\-]{1,32})$/', $source, $m ) ) {
			return [ 'kind' => $m[1], 'sub' => $m[2] ];
		}

		return null;
	}

	/** Source kinds a location may preview. */
	private static function allowed_kinds( string $location ): array {
		switch ( $location ) {
			case Location_Scope::SINGLE:
				return [ 'post' ];
			case Location_Scope::ARCHIVE:
				return [ 'blog', 'term', 'author', 'date', 'postype' ];
			case Location_Scope::SEARCH:
				return [ 'search' ];
			case Location_Scope::NOT_FOUND:
				return [ '404' ];
			default:
				return [ 'post', 'term', 'postype', 'author', 'blog', 'date', 'search', '404' ];
		}
	}

	public static function default_source( string $location ): string {
		switch ( $location ) {
			case Location_Scope::SINGLE:
				return 'post:post';
			case Location_Scope::ARCHIVE:
				return 'blog';
			case Location_Scope::SEARCH:
				return 'search';
			case Location_Scope::NOT_FOUND:
				return '404';
			default:
				return 'post:page';
		}
	}

	public static function is_valid_source( string $location, $source ): bool {
		$parsed = self::parse_source( $source );

		return $parsed && in_array( $parsed['kind'], self::allowed_kinds( $location ), true );
	}

	/**
	 * WP_Query variables for the target. `__404` marks a request that should be a 404 page.
	 *
	 * @param array $settings `source`, `id`, `search`, `date` (all optional) and `now_year` for tests.
	 */
	public static function query_vars( string $location, array $settings ): array {
		$source = $settings['source'] ?? '';
		$source = self::is_valid_source( $location, $source ) ? $source : self::default_source( $location );
		$target = self::parse_source( $source );
		$id = max( 0, (int) ( $settings['id'] ?? 0 ) );

		switch ( $target['kind'] ) {
			case 'post':
				if ( $id ) {
					return [ 'p' => $id, 'post_type' => 'any', 'post_status' => 'any' ];
				}

				return [ 'post_type' => $target['sub'], 'posts_per_page' => 1, 'ignore_sticky_posts' => true ];
			case 'term':
				if ( ! $id ) {
					return [];
				}

				return [ 'tax_query' => [ [ 'taxonomy' => $target['sub'], 'field' => 'term_id', 'terms' => [ $id ] ] ] ];
			case 'author':
				return $id ? [ 'author' => $id ] : [];
			case 'postype':
				return [ 'post_type' => $target['sub'] ];
			case 'date':
				if ( preg_match( '/^(\d{4})-(\d{1,2})$/', (string) ( $settings['date'] ?? '' ), $m ) && (int) $m[2] >= 1 && (int) $m[2] <= 12 ) {
					return [ 'year' => (int) $m[1], 'monthnum' => (int) $m[2] ];
				}

				if ( preg_match( '/^\d{4}$/', (string) ( $settings['date'] ?? '' ) ) ) {
					return [ 'year' => (int) $settings['date'] ];
				}

				return [ 'year' => (int) ( $settings['now_year'] ?? gmdate( 'Y' ) ) ];
			case 'search':
				$term = trim( (string) ( $settings['search'] ?? '' ) );

				return [ 's' => '' !== $term ? $term : 'a' ];
			case '404':
				return [ '__404' => true ];
			default:
				return [];
		}
	}
}
