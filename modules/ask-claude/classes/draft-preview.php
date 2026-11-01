<?php
namespace Refraction\Modules\AskClaude\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Draft pages built through the MCP server can be looked at without logging in, through a secret preview link
 * (?page_id=ID&rf_preview=KEY), so Claude can open them in a browser and compare them with a reference. The key is
 * renewed on every save, the page stays a draft (never listed, searched or published), and the preview is noindex.
 */
class Draft_Preview {

	const FLAG = '_refraction_mcp_draft';
	const KEY = '_refraction_preview_key';

	public static function register(): void {
		add_filter( 'posts_results', [ self::class, 'show_draft' ], 10, 2 );
		// With pretty permalinks WordPress would redirect ?page_id= away (to the home page, dropping the id).
		add_filter( 'redirect_canonical', [ self::class, 'keep_preview_url' ] );
	}

	/** @param string|false $redirect */
	public static function keep_preview_url( $redirect ) {
		return isset( $_GET['rf_preview'] ) ? false : $redirect; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Only stops a redirect.
	}

	/** A new key for a draft; returns its preview link. */
	public static function renew( int $post_id ): string {
		$key = wp_generate_password( 24, false );
		update_post_meta( $post_id, self::KEY, $key );

		return add_query_arg( [ 'page_id' => $post_id, 'rf_preview' => $key ], home_url( '/' ) );
	}

	/**
	 * @param \WP_Post[] $posts
	 * @param \WP_Query  $query
	 */
	public static function show_draft( $posts, $query ) {
		$key = isset( $_GET['rf_preview'] ) ? sanitize_text_field( wp_unslash( $_GET['rf_preview'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- The key is the permission.

		if ( '' === $key || ! $query->is_main_query() || 1 !== count( $posts ) || 'draft' !== $posts[0]->post_status ) {
			return $posts;
		}

		$id = (int) $posts[0]->ID;

		if ( ! get_post_meta( $id, self::FLAG, true ) || ! hash_equals( (string) get_post_meta( $id, self::KEY, true ), $key ) ) {
			return $posts;
		}

		$posts[0]->post_status = 'publish';
		add_filter( 'wp_robots', 'wp_robots_no_robots' );

		// Headers were prepared before the query ran, so they are sent here directly.
		if ( ! headers_sent() ) {
			header( 'X-Robots-Tag: noindex, nofollow' );
			header( 'Cache-Control: no-store' );
		}

		return $posts;
	}
}
