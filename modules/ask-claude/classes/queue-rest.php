<?php
namespace Refraction\Modules\AskClaude\Classes;

use Refraction\Modules\AskClaude\Module;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * The Claude Code queue over REST (refraction/v1/ask-claude/jobs). The site never calls Claude here: people queue
 * requests from the editor, and a Claude Code session (on the person's own Claude plan) watches the queue with
 * scripts/claude/ask-claude-queue.mjs, reads each brief, builds the elements and sends them back. Every result is
 * checked by Layout_Sanitizer before it is stored; the person inserts it in the editor.
 *
 * Editor routes: anyone who may edit the page (own requests). Builder routes: the refraction_claude_build capability
 * (role refraction_claude_builder, for an Application Password that can do nothing else) or administrators.
 */
class Queue_Rest {

	const NS = 'refraction/v1';
	const BASE = '/ask-claude/jobs';
	const HOURLY_LIMIT = 20;
	const MAX_OPEN = 5;

	private static function error( string $message, int $status ): \WP_Error {
		return new \WP_Error( 'refraction_ask_claude', $message, [ 'status' => $status ] );
	}

	public function register(): void {
		$editor = static function ( \WP_REST_Request $request ) {
			return Module::can_use() && current_user_can( 'edit_post', (int) $request->get_param( 'post_id' ) );
		};
		$owner = static function ( \WP_REST_Request $request ) {
			$job = Job_Queue::get( (int) $request['id'] );

			return $job && Module::can_use() && ( get_current_user_id() === $job['author'] || current_user_can( 'manage_options' ) || ( ! empty( $job['proposal'] ) && current_user_can( 'edit_post', $job['post_id'] ) ) );
		};
		$builder = [ Job_Queue::class, 'can_build' ];
		$routes = [
			[ self::BASE, 'POST', 'create', $editor ],
			[ self::BASE, 'GET', 'mine', $editor ],
			[ self::BASE . '/(?P<id>\d+)', 'DELETE', 'remove', $owner ],
			[ self::BASE . '/watch', 'POST', 'watch', $builder ],
			[ self::BASE . '/(?P<id>\d+)/brief', 'GET', 'brief', $builder ],
			[ self::BASE . '/(?P<id>\d+)/start', 'POST', 'start', $builder ],
			[ self::BASE . '/(?P<id>\d+)/result', 'POST', 'result', $builder ],
			[ self::BASE . '/(?P<id>\d+)/decline', 'POST', 'decline', $builder ],
		];

		foreach ( $routes as [ $route, $method, $callback, $permission ] ) {
			register_rest_route( self::NS, $route, [ 'methods' => $method, 'callback' => [ $this, $callback ], 'permission_callback' => $permission ] );
		}
	}

	/** What the editor shows of a request (the result only when it is ready). */
	private static function public_view( array $job ): array {
		$out = [
			'id' => $job['id'],
			'state' => $job['state'],
			'mode' => $job['mode'],
			'title' => get_the_title( $job['id'] ),
			'target' => $job['target'] ?? '',
			'note' => $job['note'] ?? '',
		];

		if ( 'ready' === $job['state'] ) {
			$out += [ 'elements' => $job['elements'] ?? [], 'summary' => $job['summary'] ?? '', 'dropped' => $job['dropped'] ?? [] ];
		}

		return $out;
	}

	public function create( \WP_REST_Request $request ) {
		$prompt = trim( sanitize_textarea_field( (string) $request->get_param( 'prompt' ) ) );
		$mode = (string) $request->get_param( 'mode' );
		$post_id = (int) $request->get_param( 'post_id' );

		if ( '' === $prompt ) {
			return self::error( __( 'Describe what Claude should build.', 'refraction' ), 400 );
		}

		if ( mb_strlen( $prompt ) > Rest::MAX_PROMPT ) {
			/* translators: %s: Maximum number of characters. */
			return self::error( sprintf( __( 'The description is longer than %s characters. Shorten it, or build the page in two parts with "Add a section".', 'refraction' ), number_format_i18n( Rest::MAX_PROMPT ) ), 400 );
		}

		if ( ! in_array( $mode, [ 'page', 'section', 'selected' ], true ) ) {
			return self::error( __( 'Unknown mode.', 'refraction' ), 400 );
		}

		if ( count( Job_Queue::find( [ 'author' => get_current_user_id(), 'states' => [ 'queued', 'building' ] ] ) ) >= self::MAX_OPEN ) {
			return self::error( __( 'You already have 5 requests waiting. Wait for one to finish, or cancel one.', 'refraction' ), 429 );
		}

		$count_key = 'rf_ask_claude_jobs_' . get_current_user_id();
		$count = (int) get_transient( $count_key );

		if ( $count >= self::HOURLY_LIMIT ) {
			return self::error( __( 'You reached the limit of requests for this hour. Try again later.', 'refraction' ), 429 );
		}

		set_transient( $count_key, $count + 1, HOUR_IN_SECONDS );
		$id = Job_Queue::create( $post_id, [
			'prompt' => $prompt,
			'mode' => $mode,
			'context' => 'page' === $mode ? '' : substr( (string) $request->get_param( 'context' ), 0, Rest::MAX_CONTEXT ),
			'use_styles' => (bool) $request->get_param( 'use_styles' ),
			'target' => preg_replace( '/[^a-z0-9]/i', '', (string) $request->get_param( 'target' ) ),
		] );

		if ( is_wp_error( $id ) ) {
			return self::error( $id->get_error_message(), 500 );
		}

		return [ 'job' => self::public_view( Job_Queue::get( $id ) ), 'watching' => Job_Queue::watching() ];
	}

	public function mine( \WP_REST_Request $request ) {
		// Own requests, and proposals made over MCP, which are for whoever edits the page.
		$jobs = array_values( array_filter( Job_Queue::find( [ 'post_id' => (int) $request->get_param( 'post_id' ) ] ), static function ( $job ) {
			return get_current_user_id() === $job['author'] || ! empty( $job['proposal'] );
		} ) );

		return [ 'jobs' => array_map( [ self::class, 'public_view' ], $jobs ), 'watching' => Job_Queue::watching() ];
	}

	/** Cancel a request, remove a declined one, or clear one after its result was inserted. */
	public function remove( \WP_REST_Request $request ) {
		Job_Queue::delete( (int) $request['id'] );

		return [ 'removed' => true ];
	}

	/** The watcher's beat: also puts stalled requests back in the queue, and lists what waits. */
	public function watch() {
		Job_Queue::beat();
		$now = time();
		$waiting = [];

		foreach ( Job_Queue::find( [ 'states' => [ 'queued', 'building' ] ] ) as $job ) {
			if ( Job_Rules::is_stale( $job['state'], (int) $job['started'], $now ) ) {
				$job = Job_Queue::move( $job, 'requeue' );
			}

			if ( $job && 'queued' === $job['state'] ) {
				$waiting[] = [ 'id' => $job['id'], 'mode' => $job['mode'], 'title' => get_the_title( $job['id'] ), 'post_id' => $job['post_id'], 'queued' => (int) $job['queued'] ];
			}
		}

		return [ 'waiting' => $waiting ];
	}

	private static function job_or_error( int $id ) {
		$job = Job_Queue::get( $id );

		return $job ?: self::error( __( 'No such request.', 'refraction' ), 404 );
	}

	/** Everything Claude Code needs for one request: the same self-contained prompt as the Claude.ai chat mode. */
	public function brief( \WP_REST_Request $request ) {
		$job = self::job_or_error( (int) $request['id'] );

		if ( is_wp_error( $job ) ) {
			return $job;
		}

		return [
			'id' => $job['id'],
			'state' => $job['state'],
			'mode' => $job['mode'],
			'prompt' => Prompt_Builder::chat( new Widget_Specs( $job['post_id'] ), $job ),
		];
	}

	private function step( \WP_REST_Request $request, string $move, array $changes = [] ) {
		$job = self::job_or_error( (int) $request['id'] );

		if ( is_wp_error( $job ) ) {
			return $job;
		}

		$moved = Job_Queue::move( $job, $move, $changes );

		/* translators: %s: The request's state. */
		return $moved ? [ 'id' => $moved['id'], 'state' => $moved['state'] ] : self::error( sprintf( __( 'Not possible while the request is %s.', 'refraction' ), $job['state'] ), 409 );
	}

	public function start( \WP_REST_Request $request ) {
		return $this->step( $request, 'start' );
	}

	public function decline( \WP_REST_Request $request ) {
		return $this->step( $request, 'decline', [ 'note' => mb_substr( sanitize_textarea_field( (string) $request->get_param( 'note' ) ), 0, 500 ) ] );
	}

	/** The answer is checked like any other; when nothing usable is left the request stays open, so it can be resent. */
	public function result( \WP_REST_Request $request ) {
		$job = self::job_or_error( (int) $request['id'] );

		if ( is_wp_error( $job ) ) {
			return $job;
		}

		$answer = (string) $request->get_param( 'answer' );
		$parsed = strlen( $answer ) <= Prompt_Builder::MAX_ANSWER ? Prompt_Builder::parse_answer( $answer ) : null;

		if ( ! $parsed ) {
			return self::error( 'No complete JSON object {"elements": [...], "summary": "..."} was found in the answer.', 422 );
		}

		[ $elements, $dropped, $ok ] = Prompt_Builder::clean( new Widget_Specs( $job['post_id'] ), $parsed['elements'], $job['mode'] );

		if ( ! $ok ) {
			return new \WP_Error( 'refraction_ask_claude', 'selected' === $job['mode'] ? 'Send exactly one valid element.' : 'No valid element was left after checking. Use only catalog widgets and the listed settings.', [ 'status' => 422, 'dropped' => $dropped ] );
		}

		$moved = $this->step( $request, 'result', [ 'elements' => $elements, 'summary' => sanitize_textarea_field( $parsed['summary'] ), 'dropped' => $dropped ] );

		return is_wp_error( $moved ) ? $moved : $moved + [ 'dropped' => $dropped ];
	}
}
