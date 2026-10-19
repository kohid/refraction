<?php
namespace Refraction\Modules\ThemeBuilder\Classes;

use Refraction\Modules\ThemeBuilder\Documents\Theme_Document;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Makes the editor render a Theme Builder template against the content chosen in Preview Settings.
 *
 * The editor asks the server to render each widget (admin-ajax). Before it does, the global query is replaced by a
 * query for the chosen post, archive, search or 404 page, so the Theme Elements widgets and every template tag
 * (the_title(), is_category(), have_posts()...) behave as they will on the site.
 */
class Preview_Context {

	public function __construct() {
		add_action( 'refraction/widgets/ajax_render/query', [ $this, 'switch_for_document' ], 10, 1 );
	}

	public function switch_for_document( $document ): void {
		if ( $document instanceof Theme_Document ) {
			self::enter( $document );
		}
	}

	/** @return array{source: string, id: int, search: string, date: string} */
	public static function get_target( Theme_Document $document ): array {
		return Preview_Target::sanitize( $document->get_location(), $document->get_settings( Preview_Target::SETTING ) );
	}

	/** Run a callback with the preview target as the global query, then put the real query back. */
	public static function run_with( Theme_Document $document, callable $callback ) {
		$saved = [
			'wp_query' => $GLOBALS['wp_query'] ?? null,
			'post' => $GLOBALS['post'] ?? null,
			'authordata' => $GLOBALS['authordata'] ?? null,
		];

		self::enter( $document );

		try {
			return $callback();
		} finally {
			foreach ( $saved as $name => $value ) {
				if ( null === $value ) {
					unset( $GLOBALS[ $name ] );
				} else {
					$GLOBALS[ $name ] = $value; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
				}
			}

			if ( ! empty( $GLOBALS['post'] ) ) {
				setup_postdata( $GLOBALS['post'] );
			}
		}
	}

	/** Replace the global query. Returns false (and changes nothing) when the target has no content to show. */
	public static function enter( Theme_Document $document ): bool {
		$location = $document->get_location();
		$target = self::get_target( $document );
		$parsed = Preview_Target::parse_source( $target['source'] );

		if ( $parsed && 'post' === $parsed['kind'] && $target['id'] && ! current_user_can( 'read_post', $target['id'] ) ) {
			$target['id'] = 0;
		}

		// "The latest" needs a real post so the query is a single post query (is_singular(), page title, breadcrumbs...).
		if ( $parsed && 'post' === $parsed['kind'] && ! $target['id'] ) {
			$latest = get_posts( [ 'post_type' => $parsed['sub'], 'post_status' => 'publish', 'numberposts' => 1, 'fields' => 'ids', 'suppress_filters' => true ] );
			$target['id'] = $latest ? (int) $latest[0] : 0;
		}

		$vars = Preview_Target::query_vars( $location, $target );

		if ( ! empty( $vars['__404'] ) ) {
			$query = new \WP_Query();
			$query->set_404();
		} else {
			// An empty variable list would not run a query at all; this one asks for the blog home.
			$query = new \WP_Query( $vars ? $vars : [ 'posts_per_page' => (int) get_option( 'posts_per_page', 10 ) ] );

			if ( $parsed && 'post' === $parsed['kind'] && ! $query->have_posts() ) {
				return false;
			}
		}

		// In wp-admin and admin-ajax WP_Query marks itself as an admin query, which keeps it from being the blog home.
		if ( $query->is_admin ) {
			$query->is_admin = false;

			if ( ! ( $query->is_singular || $query->is_archive || $query->is_search || $query->is_404 ) ) {
				$query->is_home = true;
			}
		}

		$GLOBALS['wp_query'] = $query; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited

		unset( $GLOBALS['post'], $GLOBALS['authordata'] );

		// As on the front end, the global post is the first post of the query (the date and other archive titles read it).
		if ( $query->have_posts() ) {
			$GLOBALS['post'] = $query->posts[0]; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
			setup_postdata( $GLOBALS['post'] );
		}

		if ( $query->is_author() ) {
			$GLOBALS['authordata'] = get_userdata( (int) $query->get( 'author' ) ); // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
		}

		return true;
	}
}
