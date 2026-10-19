<?php
namespace Refraction\Modules\LoopBuilder\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Page number arithmetic for the loop widgets (pure).
 */
class Pagination {

	/** Pages left after the query offset is skipped. `found` is the total the query matched. */
	public static function total_pages( int $found, int $per_page, int $offset ): int {
		if ( $per_page < 1 ) {
			return 0;
		}

		return (int) ceil( max( 0, $found - max( 0, $offset ) ) / $per_page );
	}

	public static function clamp( int $page, int $total ): int {
		return max( 1, min( $page, max( 1, $total ) ) );
	}

	/**
	 * Numbered page list: first and last page, the current page with `$mid` neighbours, "…" for each gap.
	 *
	 * @return array<int,int|string>
	 */
	public static function pages( int $current, int $total, int $mid = 2 ): array {
		if ( $total < 2 ) {
			return [];
		}

		$from = max( 1, $current - $mid );
		$to = min( $total, $current + $mid );
		$list = [];

		if ( $from > 1 ) {
			$list[] = 1;
		}

		if ( $from > 3 ) {
			$list[] = '…';
		} elseif ( 3 === $from ) {
			$list[] = 2;
		}

		for ( $i = $from; $i <= $to; $i++ ) {
			$list[] = $i;
		}

		if ( $to < $total - 2 ) {
			$list[] = '…';
		} elseif ( $to === $total - 2 ) {
			$list[] = $total - 1;
		}

		if ( $to < $total ) {
			$list[] = $total;
		}

		return $list;
	}
}
