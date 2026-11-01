<?php
namespace Refraction\Modules\AskClaude\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * The rules of the Claude Code queue, without WordPress (tested by scripts/test-ask-claude.php). A request is
 * queued in the editor, a Claude Code session (paid by the person's Claude plan, not API credit) starts it, builds
 * the elements and sends them back, and the person inserts them in the editor:
 *
 *   queued -> building -> ready -> (inserted: the request is removed)
 *   queued | building -> declined (with a note)
 *   building for more than STALE seconds -> queued again (the session ended halfway)
 */
class Job_Rules {

	const STATES = [ 'queued', 'building', 'ready', 'declined' ];

	/** Moves: name => states it may start from, and the state it leads to. */
	const MOVES = [
		'start' => [ [ 'queued', 'building' ], 'building' ],
		'result' => [ [ 'queued', 'building' ], 'ready' ],
		'decline' => [ [ 'queued', 'building' ], 'declined' ],
		'requeue' => [ [ 'building' ], 'queued' ],
	];

	/** A request "building" this long without a result goes back to the queue. */
	const STALE = 1800;

	/** The watcher counts as watching while its last beat is younger than this. */
	const WATCHING = 30;

	public static function can( string $move, string $state ): bool {
		return isset( self::MOVES[ $move ] ) && in_array( $state, self::MOVES[ $move ][0], true );
	}

	public static function next( string $move ): string {
		return self::MOVES[ $move ][1];
	}

	public static function is_stale( string $state, int $started, int $now ): bool {
		return 'building' === $state && $started > 0 && $now - $started > self::STALE;
	}

	public static function watching( int $beat, int $now ): bool {
		return $beat > 0 && $now - $beat < self::WATCHING;
	}
}
