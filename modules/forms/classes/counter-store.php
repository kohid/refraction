<?php
namespace Refraction\Modules\Forms\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

interface Counter_Store {
	/** Adds one to the counter (creating it with the given lifetime) and returns the new count. */
	public function incr( string $key, int $ttl ): int;
}
