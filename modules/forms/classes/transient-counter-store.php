<?php
namespace Refraction\Modules\Forms\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Attempt counters in transients. Keeps [count, window end], so the window does not slide.
 */
final class Transient_Counter_Store implements Counter_Store {

	public function incr( string $key, int $ttl ): int {
		$name = 'rf_rl_' . md5( $key . wp_salt( 'nonce' ) );
		$now = time();
		$data = get_transient( $name );

		if ( ! is_array( $data ) || $data[1] <= $now ) {
			$data = [ 0, $now + $ttl ];
		}

		++$data[0];
		set_transient( $name, $data, max( 1, $data[1] - $now ) );

		return $data[0];
	}
}
