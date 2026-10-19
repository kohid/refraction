<?php
namespace Refraction\Modules\Forms\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Fixed-window attempt counter. The store is injected: transients in WordPress, an array in tests.
 */
final class Rate_Limiter {

	private Counter_Store $store;

	public function __construct( Counter_Store $store ) {
		$this->store = $store;
	}

	/** Records an attempt and says whether it is within the limit. A limit of 0 means unlimited. */
	public function hit( string $key, int $max, int $window_seconds ): bool {
		if ( $max <= 0 ) {
			return true;
		}

		return $this->store->incr( $key, $window_seconds ) <= $max;
	}
}
