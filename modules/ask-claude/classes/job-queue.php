<?php
namespace Refraction\Modules\AskClaude\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Requests waiting for Claude Code, stored as the private post type refraction_ai_job: the author is the person who
 * asked, the parent is the page, and the meta _refraction_job holds the request and, when ready, the checked result.
 * The watcher's heartbeat is the option refraction_ask_claude_watcher (a timestamp).
 */
class Job_Queue {

	const POST_TYPE = 'refraction_ai_job';
	const META = '_refraction_job';
	const BEAT = 'refraction_ask_claude_watcher';

	/** The capability of the Claude Code account, and the role that holds only it. */
	const CAP = 'refraction_claude_build';
	const ROLE = 'refraction_claude_builder';

	public static function register(): void {
		register_post_type( self::POST_TYPE, [
			'public' => false,
			'show_ui' => false,
			'show_in_rest' => false,
			'rewrite' => false,
			'query_var' => false,
			'supports' => [ 'title', 'author' ],
			'label' => 'Ask Claude requests',
		] );

		// The builder may also make its own draft pages and add media (MCP server), but never publish or touch
		// anyone else's pages.
		$caps = [ 'read' => true, self::CAP => true, 'edit_pages' => true, 'upload_files' => true ];
		$role = get_role( self::ROLE );

		if ( ! $role ) {
			add_role( self::ROLE, 'Claude Code builder (Refraction)', $caps );
		} else {
			foreach ( array_keys( $caps ) as $cap ) {
				if ( ! $role->has_cap( $cap ) ) {
					$role->add_cap( $cap );
				}
			}
		}
	}

	public static function can_build(): bool {
		return current_user_can( self::CAP ) || current_user_can( 'manage_options' );
	}

	/** @return int|\WP_Error */
	public static function create( int $post_id, array $request ) {
		$id = wp_insert_post( [
			'post_type' => self::POST_TYPE,
			'post_status' => 'publish',
			'post_title' => mb_substr( preg_replace( '/\s+/', ' ', $request['prompt'] ), 0, 80 ),
			'post_parent' => $post_id,
			'post_author' => get_current_user_id(),
		], true );

		if ( is_wp_error( $id ) ) {
			return $id;
		}

		update_post_meta( $id, self::META, wp_slash( wp_json_encode( $request + [ 'state' => 'queued', 'queued' => time(), 'started' => 0, 'note' => '' ] ) ) );

		return $id;
	}

	/** @return array|null The request with id, post_id and author, or null when it is not a request. */
	public static function get( int $id ): ?array {
		$post = $id > 0 ? get_post( $id ) : null;

		if ( ! $post || self::POST_TYPE !== $post->post_type ) {
			return null;
		}

		$data = json_decode( (string) get_post_meta( $id, self::META, true ), true );

		return is_array( $data ) ? $data + [ 'id' => $id, 'post_id' => (int) $post->post_parent, 'author' => (int) $post->post_author ] : null;
	}

	private static function save( array $job ): void {
		$data = $job;
		unset( $data['id'], $data['post_id'], $data['author'] );
		update_post_meta( $job['id'], self::META, wp_slash( wp_json_encode( $data ) ) );
	}

	/** Applies a move when the rules allow it. @return array|null The changed request, or null. */
	public static function move( array $job, string $move, array $changes = [] ): ?array {
		if ( ! Job_Rules::can( $move, $job['state'] ) ) {
			return null;
		}

		$job = array_merge( $job, $changes, [ 'state' => Job_Rules::next( $move ) ] );

		if ( 'start' === $move ) {
			$job['started'] = time();
		}

		self::save( $job );

		return $job;
	}

	public static function delete( int $id ): void {
		wp_delete_post( $id, true );
	}

	/** @return array[] Requests, oldest first, optionally only of one page, one person or some states. */
	public static function find( array $args = [] ): array {
		$query = [ 'post_type' => self::POST_TYPE, 'post_status' => 'publish', 'posts_per_page' => 50, 'orderby' => 'ID', 'order' => 'ASC', 'fields' => 'ids', 'no_found_rows' => true ];

		if ( isset( $args['post_id'] ) ) {
			$query['post_parent'] = (int) $args['post_id'];
		}

		if ( isset( $args['author'] ) ) {
			$query['author'] = (int) $args['author'];
		}

		$jobs = array_filter( array_map( [ self::class, 'get' ], get_posts( $query ) ) );

		if ( isset( $args['states'] ) ) {
			$jobs = array_filter( $jobs, static function ( $job ) use ( $args ) {
				return in_array( $job['state'], $args['states'], true );
			} );
		}

		return array_values( $jobs );
	}

	public static function beat(): void {
		update_option( self::BEAT, time(), false );
	}

	public static function watching(): bool {
		return Job_Rules::watching( (int) get_option( self::BEAT, 0 ), time() );
	}
}
