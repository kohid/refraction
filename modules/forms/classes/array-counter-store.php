<?php
namespace Refraction\Modules\Forms\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Array_Counter_Store implements Counter_Store {

	private array $counts = [];

	public function incr( string $key, int $ttl ): int {
		$this->counts[ $key ] = ( $this->counts[ $key ] ?? 0 ) + 1;

		return $this->counts[ $key ];
	}
}
